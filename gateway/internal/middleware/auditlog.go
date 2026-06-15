package middleware

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

// authInfoContextKey là kiểu riêng để key trong context không bị trùng với package khác.
type authInfoContextKey struct{}

var authInfoKey = authInfoContextKey{}

// AuthInfo chứa kết quả xác thực của một request.
// AuditLoggerMiddleware tạo ra, AuthMiddleware điền vào qua con trỏ.
type AuthInfo struct {
	UserID string // ID user đã đăng nhập
	Role   string // Role của user
	JTI    string // JWT ID — dùng để trace token bị thu hồi
	Reason string // Lý do: auth_ok / invalid_jwt / blacklisted_token / forbidden
}

// GetAuthInfo lấy *AuthInfo từ context. Trả về nil nếu chưa được inject.
func GetAuthInfo(r *http.Request) *AuthInfo {
	info, _ := r.Context().Value(authInfoKey).(*AuthInfo)
	return info
}

// SecurityEvent là một bản ghi bảo mật, xuất ra stdout dạng JSON mỗi dòng.
type SecurityEvent struct {
	Timestamp  time.Time `json:"ts"`
	IP         string    `json:"ip"`
	Method     string    `json:"method"`
	Path       string    `json:"path"`
	StatusCode int       `json:"status_code"`
	Reason     string    `json:"reason"`
	JTI        string    `json:"jti,omitempty"`
	UserID     string    `json:"user_id,omitempty"`
	UserRole   string    `json:"user_role,omitempty"`
}

// Các lý do bảo mật dùng chung trong toàn hệ thống.
const (
	ReasonRateLimited          = "rate_limited"
	ReasonInvalidJWT           = "invalid_jwt"
	ReasonBlacklistedToken     = "blacklisted_token"
	ReasonForbidden            = "forbidden"
	ReasonPayloadTooLarge      = "payload_too_large"
	ReasonUnsupportedMediaType = "unsupported_media_type"
	ReasonAuthOK               = "auth_ok"
)

var auditLogger *log.Logger

// InitAuditLogger ghi log bảo mật ra stdout (dùng khi chạy thực tế).
func InitAuditLogger() {
	auditLogger = log.New(os.Stdout, "", 0)
}

// InitAuditLoggerWithWriter cho phép truyền writer tùy chỉnh — tiện cho unit test.
func InitAuditLoggerWithWriter(w io.Writer) {
	auditLogger = log.New(w, "", 0)
}

// LogSecurityEvent ghi một sự kiện bảo mật ra logger dưới dạng JSON.
func LogSecurityEvent(event SecurityEvent) {
	if auditLogger == nil {
		return
	}
	data, err := json.Marshal(event)
	if err != nil {
		return
	}
	auditLogger.Println(string(data))
}

// responseWriter bọc http.ResponseWriter để lưu lại status code thực sự được ghi ra.
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func newResponseWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{w, http.StatusOK}
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// AuditLoggerMiddleware ghi log bảo mật sau khi toàn bộ chuỗi middleware chạy xong.
// Inject *AuthInfo vào context trước để AuthMiddleware điền thông tin xác thực vào đó.
func AuditLoggerMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := RealIP(r)

		// Tạo AuthInfo và đưa vào context — AuthMiddleware sẽ điền vào qua con trỏ này.
		authInfo := &AuthInfo{}
		ctx := context.WithValue(r.Context(), authInfoKey, authInfo)
		r = r.WithContext(ctx)

		wrapped := newResponseWriter(w)
		next.ServeHTTP(wrapped, r)

		statusCode := wrapped.statusCode

		// Đọc thông tin xác thực từ AuthInfo; fallback về header nếu route không có auth.
		userID := authInfo.UserID
		if userID == "" {
			userID = r.Header.Get("X-User-ID")
		}
		reason := authInfo.Reason
		jti := authInfo.JTI

		isSecurityError := statusCode == http.StatusUnauthorized ||
			statusCode == http.StatusForbidden ||
			statusCode == http.StatusTooManyRequests ||
			statusCode == http.StatusRequestEntityTooLarge ||
			statusCode == http.StatusUnsupportedMediaType

		isAuthSuccess := statusCode < 400 && userID != ""

		// Nếu AuthMiddleware không điền reason (route public, bị rate limit...) thì suy từ status.
		if reason == "" {
			reason = inferReason(statusCode, isAuthSuccess)
		}

		if isSecurityError || isAuthSuccess {
			LogSecurityEvent(SecurityEvent{
				Timestamp:  time.Now().UTC(),
				IP:         ip,
				Method:     r.Method,
				Path:       r.URL.Path,
				StatusCode: statusCode,
				Reason:     reason,
				JTI:        jti,
				UserID:     userID,
				UserRole:   authInfo.Role,
			})
		}
	})
}

// inferReason suy ra lý do từ status code khi AuthMiddleware không điền sẵn.
func inferReason(statusCode int, isAuthSuccess bool) string {
	if isAuthSuccess {
		return ReasonAuthOK
	}
	switch statusCode {
	case http.StatusTooManyRequests:
		return ReasonRateLimited
	case http.StatusUnauthorized:
		return ReasonInvalidJWT
	case http.StatusForbidden:
		return ReasonForbidden
	case http.StatusRequestEntityTooLarge:
		return ReasonPayloadTooLarge
	case http.StatusUnsupportedMediaType:
		return ReasonUnsupportedMediaType
	default:
		return "unknown"
	}
}
