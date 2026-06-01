package routing

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/dinhbaokhanh/Final-Project-API-Gateway/internal/config"
	"github.com/dinhbaokhanh/Final-Project-API-Gateway/internal/middleware"
	"github.com/dinhbaokhanh/Final-Project-API-Gateway/internal/proxy"
)

// NewRouter xây dựng HTTP handler với đầy đủ middleware per-route từ cấu hình JSON
func NewRouter(cfg *config.GatewayConfig) (http.Handler, error) {
	mux := http.NewServeMux()

	// Route kiểm tra trạng thái Gateway
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
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

		// Tạo pattern routing theo chuẩn Go 1.22+: "METHOD /path"
		pattern := endpoint.Endpoint
		if endpoint.Method != "" && endpoint.Method != "ANY" {
			pattern = fmt.Sprintf("%s %s", strings.ToUpper(endpoint.Method), endpoint.Endpoint)
		}

		targetHosts := make([]string, 0, len(targets))
		for _, t := range targets {
			targetHosts = append(targetHosts, t.Host)
		}
		fmt.Printf("[Router] %-35s -> %s\n", pattern, strings.Join(targetHosts, ", "))

		// reverseProxy -> (JWT Auth nếu cần) -> Xóa header giả mạo -> RateLimit
		var handler http.Handler = reverseProxy

		// Xác thực JWT + RBAC Check
		if endpoint.AuthRequired {
			handler = middleware.AuthMiddlewareProvider(cfg.JWT, endpoint.RequiredRoles)(handler)
		}

		// Xóa header định danh người dùng do client tự chèn vào
		inner := handler
		handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Header.Del("X-User-ID")
			r.Header.Del("X-User-Role")
			inner.ServeHTTP(w, r)
		})

		// Caching Redis (Chỉ áp dụng các Endpoint khai báo CacheTTL, sau khi đã chặn Authentication)
		if endpoint.CacheTTLSeconds > 0 {
			handler = middleware.CacheMiddleware(endpoint.CacheTTLSeconds)(handler)
		}

		// Rate limiting theo IP từ cấu hình gateway.json
		handler = middleware.RateLimitMiddlewareProvider(cfg.MaxRequestsPerMinute)(handler)

		mux.Handle(pattern, handler)
	}

	return mux, nil
}
