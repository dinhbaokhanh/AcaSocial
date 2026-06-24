package config

import (
	"encoding/json"
	"fmt"
	"os"
)

// JWTConfig chứa thông tin cơ bản để xác minh token (không chứa secret)
type JWTConfig struct {
	Issuer   string `json:"issuer"`
	Audience string `json:"audience"`
}

// CORSConfig chứa danh sách nguồn cho phép (Origins), Method và Header
type CORSConfig struct {
	AllowedOrigins []string `json:"allowed_origins"`
	AllowedMethods []string `json:"allowed_methods"`
	AllowedHeaders []string `json:"allowed_headers"`
}

// GatewayConfig là cấu trúc gốc chứa toàn bộ cài đặt của Gateway (đọc từ file JSON)
type GatewayConfig struct {
	Port                 int              `json:"port"`
	TimeoutSeconds       int              `json:"timeout_seconds"`
	MaxRequestsPerMinute int              `json:"max_requests_per_minute"`
	JWT                  JWTConfig        `json:"jwt"`
	CORS                 CORSConfig       `json:"cors"`
	Endpoints            []EndpointConfig `json:"endpoints"`
}

// EndpointConfig định nghĩa một API Route mà Gateway sẽ mở ra để Frontend gọi
type EndpointConfig struct {
	Endpoint        string          `json:"endpoint"`
	Method          string          `json:"method"`
	AuthRequired    bool            `json:"auth_required"`
	RequiredRoles   []string        `json:"required_roles"`
	CacheTTLSeconds int             `json:"cache_ttl_seconds"`
	Backend         []BackendConfig `json:"backend"`
}

// BackendConfig chứa thông tin về các Service phía sau tương ứng với Endpoint phía trên
type BackendConfig struct {
	Host       []string `json:"host"`
	URLPattern string   `json:"url_pattern"`
}

// Load đọc và giải mã file cấu hình JSON của Gateway.
func Load(configPath string) (*GatewayConfig, error) {
	raw, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("không thể mở file cấu hình: %w", err)
	}

	expanded := os.Expand(string(raw), func(key string) string {
		if val, ok := os.LookupEnv(key); ok {
			return val
		}
		return "${" + key + "}"
	})

	var cfg GatewayConfig
	if err := json.Unmarshal([]byte(expanded), &cfg); err != nil {
		return nil, fmt.Errorf("gặp lỗi cú pháp khi parse cấu hình JSON: %w", err)
	}

	return &cfg, nil
}
