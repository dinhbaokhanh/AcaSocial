package middleware

import (
	"bytes"
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// cacheRes lưu trữ response đầy đủ để replay về client khi cache hit
type cacheRes struct {
	Status int         `json:"status"`
	Header http.Header `json:"header"`
	Body   []byte      `json:"body"`
}

// responseRecorder chặn hoàn toàn việc ghi ra client để có thể cache trước.
// Header backend được lưu riêng trong backendHeader, không lẫn với header của w gốc.
type responseRecorder struct {
	http.ResponseWriter
	status        int
	body          *bytes.Buffer
	backendHeader http.Header // header do backend ghi vào — tách biệt với w.Header()
}

func newResponseRecorder(w http.ResponseWriter) *responseRecorder {
	return &responseRecorder{
		ResponseWriter: w,
		status:         http.StatusOK,
		body:           bytes.NewBuffer(nil),
		backendHeader:  make(http.Header),
	}
}

// Header trả về backendHeader để backend ghi vào đây thay vì w.Header() gốc
func (rw *responseRecorder) Header() http.Header {
	return rw.backendHeader
}

func (rw *responseRecorder) WriteHeader(status int) {
	rw.status = status
	// Không flush ra client — chỉ ghi nhớ status
}

func (rw *responseRecorder) Write(b []byte) (int, error) {
	rw.body.Write(b) // Chỉ lưu vào buffer, KHÔNG ghi ra client
	return len(b), nil
}

// CacheMiddleware cache response GET theo (URL + X-User-ID) trong Redis.
// Phải đặt sau AuthMiddleware để X-User-ID đã được inject trước khi tính cache key.
func CacheMiddleware(ttlSeconds int) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Chỉ cache GET request khi Redis sẵn sàng
			if r.Method != http.MethodGet || RedisClient == nil {
				next.ServeHTTP(w, r)
				return
			}

			// Cache key gắn với user — tránh user A đọc cache của user B
			userID := r.Header.Get("X-User-ID")
			rawKey := fmt.Sprintf("%s:%s", r.URL.RequestURI(), userID)
			hash := md5.Sum([]byte(rawKey))
			cacheKey := "cache:GET:" + hex.EncodeToString(hash[:])

			ctx := context.Background()

			// 1. Cache HIT — replay response đã lưu
			if cached, err := RedisClient.Get(ctx, cacheKey).Result(); err == nil {
				var res cacheRes
				if json.Unmarshal([]byte(cached), &res) == nil {
					for k, vals := range res.Header {
						for _, v := range vals {
							w.Header().Add(k, v)
						}
					}
					w.Header().Set("X-Cache", "HIT")
					w.WriteHeader(res.Status)
					_, _ = w.Write(res.Body)
					return
				}
			}

			// 2. Cache MISS — chạy handler thực, thu thập response vào recorder
			rec := newResponseRecorder(w)
			next.ServeHTTP(rec, r)

			// 3. Flush response thực ra client
			for k, vals := range rec.backendHeader {
				for _, v := range vals {
					w.Header().Add(k, v)
				}
			}
			w.Header().Set("X-Cache", "MISS")
			w.WriteHeader(rec.status)
			_, _ = w.Write(rec.body.Bytes())

			// 4. Lưu vào Redis chỉ khi backend trả 2xx
			if rec.status >= 200 && rec.status < 300 {
				res := cacheRes{
					Status: rec.status,
					Header: rec.backendHeader,
					Body:   rec.body.Bytes(),
				}
				if b, err := json.Marshal(res); err == nil {
					RedisClient.Set(ctx, cacheKey, string(b), time.Duration(ttlSeconds)*time.Second)
				}
			}
		})
	}
}
