package middleware

import (
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
	mu       sync.Mutex // bảo vệ lastSeen khỏi data race khi nhiều goroutine cập nhật đồng thời
}

var (
	visitors    sync.Map
	stopCleanup = make(chan struct{}) // dùng để dừng goroutine cleanup khi shutdown
)

// InitRateLimiter khởi động goroutine dọn dẹp visitor stale.
// Gọi hàm trả về để dừng goroutine khi shutdown.
func InitRateLimiter() func() {
	go cleanupVisitors()
	return func() { close(stopCleanup) }
}

// cleanupVisitors xóa các IP không còn gửi request trong vòng 10 phút.
// Dừng lại khi nhận tín hiệu từ channel stopCleanup.
func cleanupVisitors() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			visitors.Range(func(key, value any) bool {
				v := value.(*visitor)
				v.mu.Lock()
				idle := time.Since(v.lastSeen) > 10*time.Minute
				v.mu.Unlock()
				if idle {
					visitors.Delete(key)
				}
				return true
			})
		case <-stopCleanup:
			return
		}
	}
}

// getVisitor trả về rate limiter của một IP, tạo mới nếu chưa có.
func getVisitor(ip string, maxReqPerMin int) *rate.Limiter {
	if maxReqPerMin <= 0 {
		maxReqPerMin = 100
	}
	rps := rate.Limit(float64(maxReqPerMin) / 60.0)
	burst := maxReqPerMin / 5
	if burst < 5 {
		burst = 5
	}

	v := &visitor{
		limiter:  rate.NewLimiter(rps, burst),
		lastSeen: time.Now(),
	}

	// LoadOrStore: nếu đã tồn tại trả về cái cũ, nếu chưa lưu cái mới
	actual, _ := visitors.LoadOrStore(ip, v)
	existing := actual.(*visitor)

	// Cập nhật lastSeen an toàn với lock
	existing.mu.Lock()
	existing.lastSeen = time.Now()
	existing.mu.Unlock()

	return existing.limiter
}

// RateLimitMiddlewareProvider tạo middleware giới hạn request theo IP.
func RateLimitMiddlewareProvider(maxReqPerMin int) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := RealIP(r)
			if !getVisitor(ip, maxReqPerMin).Allow() {
				http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
