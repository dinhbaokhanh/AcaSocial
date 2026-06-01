package middleware

import (
	"net"
	"net/http"
	"strings"
)

// RealIP trả về địa chỉ IP thực của client, ưu tiên X-Forwarded-For và X-Real-IP
// khi Gateway chạy sau reverse proxy (Nginx, Cloudflare, AWS ALB...).
func RealIP(r *http.Request) string {
	// X-Forwarded-For có thể chứa chuỗi IP cách nhau bằng dấu phẩy (VD: "client, proxy1, proxy2")
	// IP đầu tiên là IP thực của client
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.SplitN(xff, ",", 2)
		ip := strings.TrimSpace(parts[0])
		if net.ParseIP(ip) != nil {
			return ip
		}
	}

	// Fallback: X-Real-IP (Nginx thường set header này)
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		ip := strings.TrimSpace(xri)
		if net.ParseIP(ip) != nil {
			return ip
		}
	}

	// Fallback cuối: lấy từ RemoteAddr trực tiếp
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}
