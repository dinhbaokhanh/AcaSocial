package middleware

import (
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/dinhbaokhanh/AcaSocial/gateway/internal/config"
)

// Middleware là kiểu hàm nhận handler và trả về handler đã được bọc thêm logic.
type Middleware func(http.Handler) http.Handler

// Chain nối nhiều middleware thành chuỗi. Middleware đầu tiên trong danh sách là lớp ngoài cùng.
func Chain(handler http.Handler, middlewares ...Middleware) http.Handler {
	wrapped := handler
	for i := len(middlewares) - 1; i >= 0; i-- {
		wrapped = middlewares[i](wrapped)
	}
	return wrapped
}

// RequestLogger ghi log mỗi request theo định dạng: [status] METHOD path latency | ip=... req=...
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := newResponseWriter(w)
		next.ServeHTTP(rw, r)
		log.Printf("[%d] %s %s %v | ip=%s req=%s",
			rw.statusCode,
			r.Method,
			r.URL.Path,
			time.Since(start),
			RealIP(r),
			r.Header.Get("X-Request-ID"),
		)
	})
}

// Recoverer bắt panic trong các handler phía trong, ghi log và trả về 500 thay vì để Gateway sập.
func Recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("[PANIC] Phục hồi từ lỗi nghiêm trọng: %v", rec)
				http.Error(w, "Lỗi máy chủ nội bộ", http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// CORSProvider xử lý CORS theo whitelist domain cấu hình trong gateway.json.
// Chỉ set Allow-Credentials khi origin được chỉ định rõ (không dùng *).
func CORSProvider(cfg config.CORSConfig) Middleware {
	allowedOrigins := cfg.AllowedOrigins

	allowedMethods := "GET,POST,PUT,PATCH,DELETE,OPTIONS"
	if len(cfg.AllowedMethods) > 0 {
		allowedMethods = strings.Join(cfg.AllowedMethods, ",")
	}

	allowedHeaders := "Content-Type,Authorization"
	if len(cfg.AllowedHeaders) > 0 {
		allowedHeaders = strings.Join(cfg.AllowedHeaders, ",")
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			allowOrigin := ""

			if len(allowedOrigins) == 0 {
				allowOrigin = "*" // fallback nếu chưa cấu hình
			} else {
				for _, o := range allowedOrigins {
					if o == "*" || o == origin {
						allowOrigin = origin
						break
					}
				}
			}

			if allowOrigin != "" {
				w.Header().Set("Access-Control-Allow-Origin", allowOrigin)
			}
			w.Header().Set("Access-Control-Allow-Methods", allowedMethods)
			w.Header().Set("Access-Control-Allow-Headers", allowedHeaders)

			// Bật cookie/credential chỉ khi origin được xác định rõ (không phải *).
			if allowOrigin != "" && allowOrigin != "*" {
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			}

			// Trả về 204 cho preflight OPTIONS — trình duyệt gửi trước khi request thật.
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
