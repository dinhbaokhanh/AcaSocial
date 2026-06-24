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

	// RequestID -> RequestValidation -> AuditLogger -> Recoverer -> RequestLogger -> CORS -> Router
	handler := middleware.Chain(
		router,
		middleware.CORSProvider(cfg.CORS),
		middleware.RequestLogger,
		middleware.Recoverer,
		middleware.AuditLoggerMiddleware,
		middleware.RequestValidationMiddleware,
		middleware.RequestIDMiddleware,
	)

	return &App{
		server: &http.Server{
			Addr:              fmt.Sprintf(":%d", cfg.Port),
			Handler:           handler,
			ReadHeaderTimeout: 5 * time.Second,  
			ReadTimeout:       15 * time.Second, 
			WriteTimeout:      30 * time.Second, 
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
