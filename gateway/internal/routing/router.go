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

	// Route kiểm tra trạng thái Gateway + Redis
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		status := "ok"
		redisStatus := "ok"
		httpStatus := http.StatusOK

		// Kiểm tra kết nối Redis thực sự bằng Ping với timeout ngắn
		if middleware.RedisClient != nil {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			if err := middleware.RedisClient.Ping(ctx).Err(); err != nil {
				redisStatus = "unreachable"
				status = "degraded"
				httpStatus = http.StatusServiceUnavailable
			}
		} else {
			redisStatus = "not_configured"
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(httpStatus)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"status": status,
			"redis":  redisStatus,
		})
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

		// reverseProxy -> sanitize -> Cache -> Auth -> Strip -> RateLimit
		// Thực thi (ngoài vào trong): RateLimit -> Strip -> Auth -> Cache -> sanitize -> proxy
		var handler http.Handler = reverseProxy

		// 1. Xóa header nhạy cảm từ backend trước khi trả về cho client
		handler = sanitizeBackendResponseHeaders(handler)

		// 2. Caching Redis (wrap sớm — chạy sau Auth để cache key có X-User-ID)
		if endpoint.CacheTTLSeconds > 0 {
			handler = middleware.CacheMiddleware(endpoint.CacheTTLSeconds)(handler)
		}

		// 3. Xác thực JWT + RBAC (wrap sau Cache — chạy trước Cache)
		if endpoint.AuthRequired {
			handler = middleware.AuthMiddlewareProvider(cfg.JWT, endpoint.RequiredRoles)(handler)
		}

		// 4. Xóa header định danh người dùng do client tự chèn vào
		inner := handler
		handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Header.Del("X-User-ID")
			r.Header.Del("X-User-Role")
			inner.ServeHTTP(w, r)
		})

		// 5. Rate limiting theo IP từ cấu hình gateway.json
		handler = middleware.RateLimitMiddlewareProvider(cfg.MaxRequestsPerMinute)(handler)

		mux.Handle(pattern, handler)
	}

	return mux, nil
}
