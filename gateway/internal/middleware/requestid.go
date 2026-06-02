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

		// Validate: chỉ cho phép ký tự an toàn, chặn CRLF injection
		// Nếu không hợp lệ thì tự sinh mới thay vì reject request
		if requestID == "" || !isValidRequestID(requestID) {
			requestID = generateRequestID()
			r.Header.Set("X-Request-ID", requestID)
		}

		w.Header().Set("X-Request-ID", requestID)
		next.ServeHTTP(w, r)
	})
}

// isValidRequestID kiểm tra ID chỉ chứa ký tự hex, dash, underscore (tối đa 64 ký tự)
func isValidRequestID(id string) bool {
	if len(id) > 64 {
		return false
	}
	for _, c := range id {
		if !((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
			(c >= '0' && c <= '9') || c == '-' || c == '_') {
			return false
		}
	}
	return true
}
