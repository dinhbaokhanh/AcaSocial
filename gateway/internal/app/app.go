package app

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/dinhbaokhanh/AcaSocial/gateway/internal/config"
	"github.com/dinhbaokhanh/AcaSocial/gateway/internal/middleware"
	"github.com/dinhbaokhanh/AcaSocial/gateway/internal/routing"
)

// App là lõi trung tâm của API Gateway
type App struct {
	server *http.Server
}

// New khởi tạo Gateway từ file cấu hình JSON
func New(cfg *config.GatewayConfig) (*App, error) {
	router, err := routing.NewRouter(cfg)
	if err != nil {
		return nil, err
	}

	// SecurityHeaders -> RequestID -> StripInternalHeaders -> RequestValidation -> AuditLogger -> Recoverer -> RequestLogger -> CORS -> Router
	// SecurityHeadersMiddleware đứng ngoài cùng để inject header vào MỌI response,
	// kể cả 4xx/5xx trả về từ các middleware bên trong (rate limit, auth, validation...).
	// StripInternalHeaders phải ở tầng global để không route nào bị bypass.
	handler := middleware.Chain(
		router,
		middleware.CORSProvider(cfg.CORS),
		middleware.RequestLogger,
		middleware.Recoverer,
		middleware.AuditLoggerMiddleware,
		middleware.RequestValidationMiddleware,
		middleware.StripInternalHeaders,
		middleware.RequestIDMiddleware,
		middleware.SecurityHeadersMiddleware,
	)

	return &App{
		server: &http.Server{
			Addr:              fmt.Sprintf(":%d", cfg.Port),
			Handler:           handler,
			ReadHeaderTimeout: 5 * time.Second,
			ReadTimeout:       15 * time.Second,
			WriteTimeout:      90 * time.Second,
			IdleTimeout:       120 * time.Second,
		},
	}, nil
}

// Run bắt đầu lắng nghe và xử lý request
func (a *App) Run() error {
	return a.server.ListenAndServe()
}

// Shutdown dừng Gateway một cách nhẹ nhàng — cho phép các request hiện tại hoàn thành
func (a *App) Shutdown(ctx context.Context) error {
	return a.server.Shutdown(ctx)
}
