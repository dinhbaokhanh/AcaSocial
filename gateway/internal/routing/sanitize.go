package routing

import "net/http"

// sensitiveBackendHeaders là danh sách header mà backend service trả về nhưng không nên lộ ra client.
// Ẩn thông tin này giúp giảm attack surface và ngăn fingerprinting server.
var sensitiveBackendHeaders = []string{
	"Server",           // Lộ tên/phiên bản web server (VD: "Express", "nginx/1.18")
	"X-Powered-By",    // Lộ framework (VD: "Express", "PHP/8.1")
	"X-AspNet-Version", // Lộ phiên bản ASP.NET
	"X-AspNetMvc-Version",
}

// sanitizeBackendResponseHeaders bọc handler và xóa các response header nhạy cảm
// mà backend service trả về trước khi gửi về phía client.
func sanitizeBackendResponseHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Dùng wrapper để xóa header SAU KHI backend ghi xong, trước khi flush về client
		wrapped := &headerSanitizerWriter{ResponseWriter: w}
		next.ServeHTTP(wrapped, r)
	})
}

// headerSanitizerWriter ghi đè WriteHeader để xóa header nhạy cảm trước khi flush
type headerSanitizerWriter struct {
	http.ResponseWriter
	sanitized bool
}

func (w *headerSanitizerWriter) WriteHeader(statusCode int) {
	w.doSanitize()
	w.ResponseWriter.WriteHeader(statusCode)
}

func (w *headerSanitizerWriter) Write(b []byte) (int, error) {
	// Nếu backend không gọi WriteHeader trước Write, tự sanitize ở đây
	if !w.sanitized {
		w.doSanitize()
	}
	return w.ResponseWriter.Write(b)
}

func (w *headerSanitizerWriter) doSanitize() {
	if w.sanitized {
		return
	}
	w.sanitized = true
	for _, h := range sensitiveBackendHeaders {
		w.ResponseWriter.Header().Del(h)
	}
}
