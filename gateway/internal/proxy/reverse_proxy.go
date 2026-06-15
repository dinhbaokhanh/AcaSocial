package proxy

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"sync/atomic"
	"time"

	"github.com/sony/gobreaker/v2"
)

// RoundRobinProxy phân phối request lần lượt qua nhiều backend (round-robin).
type RoundRobinProxy struct {
	proxies []*httputil.ReverseProxy
	current uint32
}

// BackendTarget là một backend cụ thể: địa chỉ host và path nội bộ cần rewrite đến.
type BackendTarget struct {
	Host       string
	URLPattern string
}

func (rr *RoundRobinProxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if len(rr.proxies) == 0 {
		http.Error(w, "No backends available", http.StatusBadGateway)
		return
	}
	// Atomic round-robin: tăng counter và lấy phần dư để chọn backend tiếp theo.
	idx := atomic.AddUint32(&rr.current, 1) % uint32(len(rr.proxies))
	rr.proxies[idx].ServeHTTP(w, r)
}

// NewLoadBalancedProxy tạo reverse proxy có load balancing và circuit breaker cho danh sách backend.
func NewLoadBalancedProxy(targets []BackendTarget, endpointPattern string, timeoutSec int) (http.Handler, error) {
	if len(targets) == 0 {
		return nil, fmt.Errorf("không có backend nào được cấp")
	}

	if timeoutSec <= 0 {
		timeoutSec = 15
	}
	timeout := time.Duration(timeoutSec) * time.Second

	// Dùng chung một Transport để tận dụng connection pool giữa các backend.
	transport := &http.Transport{
		ResponseHeaderTimeout: timeout,
		MaxIdleConns:          5000,
		MaxIdleConnsPerHost:   1000,
		IdleConnTimeout:       120 * time.Second,
	}

	proxies := make([]*httputil.ReverseProxy, 0, len(targets))

	for _, target := range targets {
		target := target // capture đúng giá trị trong closure

		targetURL, err := url.Parse(target.Host)
		if err != nil {
			return nil, err
		}

		p := httputil.NewSingleHostReverseProxy(targetURL)

		// Mỗi backend có Circuit Breaker riêng.
		// Mở CB khi tỉ lệ lỗi >= 50% trên tối thiểu 10 request.
		cb := gobreaker.NewCircuitBreaker[*http.Response](gobreaker.Settings{
			Name:        "CB-" + targetURL.Host,
			MaxRequests: 5,
			Interval:    10 * time.Second,
			Timeout:     15 * time.Second,
			ReadyToTrip: func(counts gobreaker.Counts) bool {
				failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
				return counts.Requests >= 10 && failureRatio >= 0.5
			},
		})

		p.Transport = &breakerTransport{cb: cb, transport: transport}

		backendPattern := target.URLPattern
		if backendPattern == "" {
			backendPattern = endpointPattern
		}

		// Director rewrite Host header và path trước khi gửi đến backend.
		// X-Request-ID được forward tường minh để hỗ trợ tracing xuyên service.
		capturedEndpoint := endpointPattern
		capturedBackend := backendPattern
		capturedHost := targetURL
		originalDirector := p.Director
		p.Director = func(req *http.Request) {
			originalDirector(req)
			req.Host = capturedHost.Host
			req.URL.Path = rewritePath(req.URL.Path, capturedEndpoint, capturedBackend)
			req.URL.RawPath = req.URL.EscapedPath()

			// Forward X-Request-ID để backend service có thể trace cùng request ID.
			if reqID := req.Header.Get("X-Request-ID"); reqID != "" {
				req.Header.Set("X-Request-ID", reqID)
			}
		}

		p.ErrorHandler = func(w http.ResponseWriter, r *http.Request, proxyErr error) {
			http.Error(w, "Dịch vụ backend hiện không khả dụng do lỗi kết nối", http.StatusBadGateway)
		}

		proxies = append(proxies, p)
	}

	// Nếu chỉ có 1 backend, trả thẳng proxy đó — không cần wrapper round-robin.
	if len(proxies) == 1 {
		return proxies[0], nil
	}

	return &RoundRobinProxy{proxies: proxies}, nil
}

// rewritePath dịch path của request từ pattern frontend sang pattern backend.
// Ví dụ: /api/media/{id} → /media/{id} với id được thay bằng giá trị thực.
func rewritePath(requestPath, endpointPattern, backendPattern string) string {
	if backendPattern == "" || backendPattern == endpointPattern {
		return requestPath
	}

	requestSegments := splitPath(requestPath)
	endpointSegments := splitPath(endpointPattern)
	if len(requestSegments) != len(endpointSegments) {
		return backendPattern
	}

	// Trích xuất các tham số động từ path (ví dụ: {id} → "123").
	params := make(map[string]string)
	for i, ep := range endpointSegments {
		rp := requestSegments[i]
		if strings.HasPrefix(ep, "{") && strings.HasSuffix(ep, "}") {
			name := strings.TrimSuffix(strings.TrimPrefix(ep, "{"), "}")
			params[name] = rp
			continue
		}
		if ep != rp {
			return backendPattern
		}
	}

	// Điền giá trị tham số vào backend pattern.
	backendSegments := splitPath(backendPattern)
	for i, seg := range backendSegments {
		if strings.HasPrefix(seg, "{") && strings.HasSuffix(seg, "}") {
			name := strings.TrimSuffix(strings.TrimPrefix(seg, "{"), "}")
			if value, ok := params[name]; ok {
				backendSegments[i] = value
			}
		}
	}

	return "/" + strings.Join(backendSegments, "/")
}

func splitPath(path string) []string {
	trimmed := strings.Trim(path, "/")
	if trimmed == "" {
		return []string{}
	}
	return strings.Split(trimmed, "/")
}

// breakerTransport bọc RoundTripper với Circuit Breaker.
// HTTP 5xx được tính là lỗi để CB có thể đếm và ngắt mạch khi cần.
type breakerTransport struct {
	cb        *gobreaker.CircuitBreaker[*http.Response]
	transport http.RoundTripper
}

func (b *breakerTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	resp, err := b.cb.Execute(func() (*http.Response, error) {
		r, err := b.transport.RoundTrip(req)
		if err != nil {
			return nil, err
		}
		// Coi 5xx là failure: network OK nhưng backend đang có vấn đề.
		if r.StatusCode >= 500 {
			return nil, fmt.Errorf("backend trả về %d", r.StatusCode)
		}
		return r, nil
	})
	if err != nil {
		return nil, err
	}
	return resp, nil
}
