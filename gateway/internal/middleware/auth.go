package middleware

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"slices"
	"strings"

	"github.com/dinhbaokhanh/Final-Project-API-Gateway/internal/config"
	"github.com/golang-jwt/jwt/v5"
)

// jwtSecretCache lưu JWT_SECRET một lần khi khởi động, tránh gọi os.Getenv mỗi request.
var jwtSecretCache []byte

// InitJWT đọc JWT_SECRET từ env và cache lại. Crash ngay nếu thiếu.
func InitJWT() {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		panic("CRITICAL: Thiếu biến môi trường JWT_SECRET — Gateway từ chối khởi động!")
	}
	jwtSecretCache = []byte(secret)
}

// AuthMiddlewareProvider xác thực JWT và kiểm tra RBAC cho từng route.
// Sau khi xác thực thành công, inject X-User-ID và X-User-Role vào request header
// để các service phía sau đọc mà không cần tự xác thực lại.
func AuthMiddlewareProvider(jwtCfg config.JWTConfig, requiredRoles []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			// Kiểm tra header Authorization có đúng định dạng "Bearer <token>" không.
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				if info := GetAuthInfo(r); info != nil {
					info.Reason = ReasonInvalidJWT
				}
				http.Error(w, "Unauthorized - Thiếu hoặc sai định dạng Authorization header", http.StatusUnauthorized)
				return
			}
			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

			// Dùng secret đã cache, chỉ verify chữ ký HS256 và expiry.
			// Không check issuer/audience vì identity-service không set các claim đó.
			jwtSecret := jwtSecretCache
			parser := jwt.NewParser(
				jwt.WithValidMethods([]string{"HS256"}),
				jwt.WithExpirationRequired(),
				jwt.WithJSONNumber(),
			)

			token, err := parser.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("thuật toán ký không hợp lệ: %v", token.Header["alg"])
				}
				return jwtSecret, nil
			})

			if err != nil || !token.Valid {
				if info := GetAuthInfo(r); info != nil {
					info.Reason = ReasonInvalidJWT
				}
				http.Error(w, "Unauthorized - Token không hợp lệ hoặc đã hết hạn", http.StatusUnauthorized)
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				http.Error(w, "Unauthorized - Không đọc được thông tin token", http.StatusUnauthorized)
				return
			}

			// jti bắt buộc phải có — dùng để kiểm tra token có bị thu hồi không.
			jti, hasJti := claims["jti"].(string)
			if !hasJti || jti == "" {
				if info := GetAuthInfo(r); info != nil {
					info.Reason = ReasonInvalidJWT
				}
				http.Error(w, "Unauthorized - Token thiếu claim jti", http.StatusUnauthorized)
				return
			}

			// Từ chối token đã bị thu hồi (logout, đổi mật khẩu, xóa tài khoản).
			if isBlacklisted(jti) {
				if info := GetAuthInfo(r); info != nil {
					info.JTI = jti
					info.Reason = ReasonBlacklistedToken
				}
				http.Error(w, "Unauthorized - Token đã bị thu hồi", http.StatusUnauthorized)
				return
			}

			// Lấy UserID từ claim "id" hoặc "sub". Hỗ trợ cả string và số nguyên lớn.
			var userIDStr string
			if userID, ok := claims["id"].(string); ok {
				userIDStr = userID
			} else if subID, ok := claims["sub"].(string); ok {
				userIDStr = subID
			} else if numID, ok := claims["id"].(json.Number); ok {
				userIDStr = numID.String()
			}

			if strings.TrimSpace(userIDStr) == "" {
				http.Error(w, "Unauthorized - Invalid or Empty User ID in Token", http.StatusUnauthorized)
				return
			}
			r.Header.Set("X-User-ID", userIDStr)

			// Kiểm tra RBAC nếu route yêu cầu role cụ thể.
			role, hasRole := claims["role"].(string)
			if len(requiredRoles) > 0 {
				if !hasRole || role == "" {
					if info := GetAuthInfo(r); info != nil {
						info.JTI = jti
						info.Reason = ReasonForbidden
					}
					http.Error(w, "Forbidden - Missing Role Claim", http.StatusForbidden)
					return
				}

				if !slices.Contains(requiredRoles, role) {
					if info := GetAuthInfo(r); info != nil {
						info.JTI = jti
						info.Reason = ReasonForbidden
					}
					http.Error(w, "Forbidden - Insufficient Permissions", http.StatusForbidden)
					return
				}
			}

			if hasRole && role != "" {
				r.Header.Set("X-User-Role", role)
			}

			// Xác thực thành công — điền đầy đủ AuthInfo để AuditLogger ghi log chính xác.
			if info := GetAuthInfo(r); info != nil {
				info.UserID = userIDStr
				info.Role = role
				info.JTI = jti
				info.Reason = ReasonAuthOK
			}

			next.ServeHTTP(w, r)
		})
	}
}
