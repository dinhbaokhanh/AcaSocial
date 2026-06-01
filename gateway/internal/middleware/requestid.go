package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
)

// generateRequestID tạo ID ngẫu nhiên 16 byte dạng hex (32 ký tự)
func generateRequestID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// RequestIDMiddleware gắn X-Request-ID vào mỗi request để truy vết xuyên suốt qua các service.
// Nếu client tự gửi lên thì dùng lại (để hỗ trợ distributed tracing từ frontend),
// ngược lại sẽ tự sinh mới.
func RequestIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := r.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
			r.Header.Set("X-Request-ID", requestID)
		}

		// Luôn echo lại X-Request-ID trong response để client/frontend có thể đối chiếu
		w.Header().Set("X-Request-ID", requestID)

		next.ServeHTTP(w, r)
	})
}
