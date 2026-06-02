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

// cacheRes dùng để lưu trữ dữ liệu trả về vào trong Redis
type cacheRes struct {
	Status int         `json:"status"`
	Header http.Header `json:"header"`
	Body   []byte      `json:"body"`
}

// responseRecorder chặn việc ghi thẳng ra client, lưu lại để cache trước
// KHÔNG embed ResponseWriter trực tiếp để tránh double-write body ra client
type responseRecorder struct {
	http.ResponseWriter
	status int
	body   *bytes.Buffer
	wrote  bool
}

func (rw *responseRecorder) WriteHeader(status int) {
	if !rw.wrote {
		rw.status = status
		// Không gọi rw.ResponseWriter.WriteHeader ở đây —
		// sẽ flush cùng lúc với Write() bên dưới
	}
}

func (rw *responseRecorder) Write(b []byte) (int, error) {
	rw.body.Write(b) // Chỉ lưu vào buffer, KHÔNG ghi ra client
	return len(b), nil
}

// CacheMiddleware bọc Request GET và lưu trả về vào Redis theo X-User-ID
func CacheMiddleware(ttlSeconds int) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Chỉ Cache GET request và khi cấu hình Redis đã sẵn sàng
			if r.Method != http.MethodGet || RedisClient == nil {
				next.ServeHTTP(w, r)
				return
			}

			// Nhận diện dữ liệu động phụ thuộc User (Private Cache)
			userID := r.Header.Get("X-User-ID")
			
			// Xây dựng Cache Key băm MD5 để giảm kích thước key trên Redis
			rawKey := fmt.Sprintf("%s:%s", r.URL.RequestURI(), userID)
			hash := md5.Sum([]byte(rawKey))
			cacheKey := "cache:GET:" + hex.EncodeToString(hash[:])

			ctx := context.Background()
			
			// 1. Thử đọc Cache
			cachedData, err := RedisClient.Get(ctx, cacheKey).Result()
			if err == nil && cachedData != "" {
				var res cacheRes
				if err := json.Unmarshal([]byte(cachedData), &res); err == nil {
					// Đổ Header gốc đã lưu
					for k, v := range res.Header {
						w.Header().Del(k) // Clear default
						for _, vv := range v {
							w.Header().Add(k, vv)
						}
					}
					
					// CACHE HIT - Set sau cùng để không bị đè
					w.Header().Set("X-Cache", "HIT")
					
					w.WriteHeader(res.Status)
					_, _ = w.Write(res.Body)
					return
				}
			}

			// 2. CACHE MISS - Thực thi Handler tiếp theo (gọi vào Backend)
			// rec chặn response, không cho ghi thẳng ra client
			rec := &responseRecorder{
				ResponseWriter: w,
				status:         http.StatusOK,
				body:           bytes.NewBuffer(nil),
			}

			next.ServeHTTP(rec, r)

			// 3. Flush response thực sự ra client
			// Copy header từ backend (rec không ghi header ra w)
			for k, v := range rec.Header() {
				w.Header()[k] = v
			}
			w.Header().Set("X-Cache", "MISS")
			w.WriteHeader(rec.status)
			_, _ = w.Write(rec.body.Bytes())

			// 4. Lưu vào Redis nếu backend trả về 2xx
			if rec.status >= 200 && rec.status < 300 {
				res := cacheRes{
					Status: rec.status,
					Header: rec.Header(),
					Body:   rec.body.Bytes(),
				}
				resBytes, err := json.Marshal(res)
				if err == nil {
					RedisClient.Set(ctx, cacheKey, string(resBytes), time.Duration(ttlSeconds)*time.Second)
				}
			}
		})
	}
}
