package routing

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/dinhbaokhanh/AcaSocial/gateway/internal/config"
	"github.com/dinhbaokhanh/AcaSocial/gateway/internal/middleware"
	"github.com/dinhbaokhanh/AcaSocial/gateway/internal/proxy"
)

// NewRouter xây dựng HTTP handler với đầy đủ middleware per-route từ cấu hình JSON
func NewRouter(cfg *config.GatewayConfig) (http.Handler, error) {
	mux := http.NewServeMux()

	// Catch-all OPTIONS handler để xử lý CORS preflight.
	// Go 1.22 ServeMux sẽ trả 405 cho OPTIONS nếu không có route khớp —
	// điều đó xảy ra trước khi CORSProvider (tầng global) có cơ hội set header.
	// Handler này chỉ cần tồn tại; CORSProvider ở app.go sẽ set đúng header và trả 204.
	mux.HandleFunc("OPTIONS /", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	// Thu thập danh sách unique host từ tất cả endpoint để dùng trong health check.
	// Dùng map để dedup — nhiều route có thể trỏ về cùng một service.
	backendHosts := collectBackendHosts(cfg)

	// Route kiểm tra trạng thái Gateway + Redis + các downstream service
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		overallStatus := "ok"
		httpStatus := http.StatusOK
		checks := map[string]string{}

		// 1. Kiểm tra Redis
		if middleware.RedisClient != nil {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			if err := middleware.RedisClient.Ping(ctx).Err(); err != nil {
				checks["redis"] = "unreachable"
				overallStatus = "degraded"
				httpStatus = http.StatusServiceUnavailable
			} else {
				checks["redis"] = "ok"
			}
		} else {
			checks["redis"] = "not_configured"
		}

		// 2. Kiểm tra từng downstream service bằng cách gọi /health của chúng
		// Dùng HTTP client với timeout ngắn để không block lâu
		httpClient := &http.Client{Timeout: 2 * time.Second}
		for name, host := range backendHosts {
			url := host + "/health"
			resp, err := httpClient.Get(url)
			if err != nil || resp.StatusCode >= 500 {
				checks[name] = "unreachable"
				overallStatus = "degraded"
				httpStatus = http.StatusServiceUnavailable
			} else {
				checks[name] = "ok"
				resp.Body.Close()
			}
		}

		checks["status"] = overallStatus
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(httpStatus)
		_ = json.NewEncoder(w).Encode(checks)
	})

	// Các route khác sẽ được load từ file config
	for _, endpoint := range cfg.Endpoints {
		targets := make([]proxy.BackendTarget, 0)
		for _, backend := range endpoint.Backend {
			for _, host := range backend.Host {
				targets = append(targets, proxy.BackendTarget{
					Host:       host,
					URLPattern: backend.URLPattern,
				})
			}
		}

		if len(targets) == 0 {
			continue
		}

		reverseProxy, err := proxy.NewLoadBalancedProxy(targets, endpoint.Endpoint, cfg.TimeoutSeconds)
		if err != nil {
			return nil, fmt.Errorf("URL backend không hợp lệ cho endpoint %s: %w", endpoint.Endpoint, err)
		}

		// Tạo pattern routing
		pattern := endpoint.Endpoint
		if endpoint.Method != "" && endpoint.Method != "ANY" {
			pattern = fmt.Sprintf("%s %s", strings.ToUpper(endpoint.Method), endpoint.Endpoint)
		}

		targetHosts := make([]string, 0, len(targets))
		for _, t := range targets {
			targetHosts = append(targetHosts, t.Host)
		}
		fmt.Printf("[Router] %-35s -> %s\n", pattern, strings.Join(targetHosts, ", "))

		// Middleware chain per-route (ngoài vào trong):
		// RateLimit → Auth → Cache → sanitize → proxy
		var handler http.Handler = reverseProxy
		if endpoint.Endpoint == "/api/notifications/stream" {
			handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				// A stream lives beyond the server's normal 30-second write deadline.
				if err := http.NewResponseController(w).SetWriteDeadline(time.Time{}); err != nil {
					http.Error(w, "Streaming unavailable", http.StatusInternalServerError)
					return
				}
				reverseProxy.ServeHTTP(w, r)
			})
		}

		// 1. Xóa header nhạy cảm từ backend trước khi trả về cho client
		handler = sanitizeBackendResponseHeaders(handler)

		// 2. Caching Redis (wrap sớm — chạy sau Auth để cache key có X-User-ID)
		if endpoint.CacheTTLSeconds > 0 {
			handler = middleware.CacheMiddleware(endpoint.CacheTTLSeconds)(handler)
		}

		// 3. Xác thực JWT + RBAC (wrap sau Cache — chạy trước Cache)
		if endpoint.AuthRequired {
			handler = middleware.AuthMiddlewareProvider(endpoint.RequiredRoles)(handler)
		}

		// 4. Rate limiting — dùng giới hạn riêng của route nếu có, fallback về global
		// Endpoint nhạy cảm (login, otp) nên có giới hạn thấp hơn global
		routeLimit := cfg.MaxRequestsPerMinute
		if endpoint.MaxRequestsPerMinute > 0 {
			routeLimit = endpoint.MaxRequestsPerMinute
		}
		handler = middleware.RateLimitMiddlewareProvider(routeLimit)(handler)

		mux.Handle(pattern, handler)
	}

	return mux, nil
}

// collectBackendHosts thu thập danh sách unique host từ tất cả endpoint trong config.
// Key là tên dịch vụ (phần hostname), value là base URL để gọi /health.
// Dùng map để dedup — nhiều route có thể trỏ về cùng một service.
func collectBackendHosts(cfg *config.GatewayConfig) map[string]string {
	seen := make(map[string]struct{})
	result := make(map[string]string)
	for _, endpoint := range cfg.Endpoints {
		for _, backend := range endpoint.Backend {
			for _, host := range backend.Host {
				if _, exists := seen[host]; exists {
					continue
				}
				seen[host] = struct{}{}
				// Dùng host làm cả key lẫn value — key chỉ để hiển thị trong response
				result[host] = host
			}
		}
	}
	return result
}
