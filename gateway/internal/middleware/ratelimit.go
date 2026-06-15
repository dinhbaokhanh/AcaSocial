package middleware

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/time/rate"
)

// ─── In-memory fallback ────────────────────────────────────────────────────────

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
	mu       sync.Mutex
}

var (
	visitors    sync.Map
	stopCleanup = make(chan struct{})
)

// InitRateLimiter khởi động goroutine dọn dẹp nền. Gọi hàm trả về để dừng khi shutdown.
func InitRateLimiter() func() {
	go cleanupVisitors()
	return func() { close(stopCleanup) }
}

// cleanupVisitors xóa IP không hoạt động quá 10 phút khỏi bộ nhớ.
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

// getVisitorLimiter trả về token bucket rate limiter của một IP (fallback khi Redis không có).
func getVisitorLimiter(ip string, maxReqPerMin int) *rate.Limiter {
	if maxReqPerMin <= 0 {
		maxReqPerMin = 100
	}
	rps := rate.Limit(float64(maxReqPerMin) / 60.0)
	burst := maxReqPerMin / 5
	if burst < 5 {
		burst = 5
	}

	v := &visitor{limiter: rate.NewLimiter(rps, burst), lastSeen: time.Now()}
	actual, _ := visitors.LoadOrStore(ip, v)
	existing := actual.(*visitor)
	existing.mu.Lock()
	existing.lastSeen = time.Now()
	existing.mu.Unlock()
	return existing.limiter
}

// ─── Redis Sliding Window Rate Limiter ────────────────────────────────────────
//
// Mỗi IP có một Sorted Set trong Redis: key = "ratelimit:{ip}", score = timestamp (ms).
// Lua script chạy atomic: xóa entry cũ → đếm → thêm mới hoặc từ chối.
//
// Ưu điểm so với Fixed Window:
//   - Không bị "burst gấp đôi" ở điểm chuyển cửa sổ (boundary burst)
//   - Đồng bộ khi chạy nhiều Gateway instance

var slidingWindowScript = redis.NewScript(`
local key        = KEYS[1]
local window_ms  = tonumber(ARGV[1])
local now_ms     = tonumber(ARGV[2])
local member     = ARGV[3]
local max_req    = tonumber(ARGV[4])

-- Xóa các entry cũ hơn 1 phút
redis.call('ZREMRANGEBYSCORE', key, '0', tostring(now_ms - window_ms))

-- Đếm request trong cửa sổ hiện tại (trước khi thêm request này)
local count = redis.call('ZCARD', key)

if count >= max_req then
    redis.call('EXPIRE', key, math.ceil(window_ms / 1000) + 1)
    return 1  -- bị chặn
end

redis.call('ZADD', key, tostring(now_ms), member)
redis.call('EXPIRE', key, math.ceil(window_ms / 1000) + 1)
return 0  -- được phép
`)

// memberCounter đảm bảo mỗi request có member unique trong sorted set,
// tránh trùng khi nhiều request đến cùng thời điểm.
var memberCounter uint64

// isRateLimitedRedis trả về true nếu IP đã vượt giới hạn trong 1 phút gần nhất.
func isRateLimitedRedis(ctx context.Context, ip string, maxReqPerMin int) bool {
	now := time.Now()
	key := fmt.Sprintf("ratelimit:%s", ip)
	member := strconv.FormatUint(atomic.AddUint64(&memberCounter, 1), 10)

	result, err := slidingWindowScript.Run(
		ctx, RedisClient, []string{key},
		int64(60*1000), now.UnixMilli(), member, maxReqPerMin,
	).Int()

	if err != nil {
		log.Printf("[WARN] Rate limiter Redis error for ip=%s: %v. Fail open.", ip, err)
		return false // cho qua nếu Redis lỗi
	}

	return result == 1
}

// ─── Entry point ──────────────────────────────────────────────────────────────

// RateLimitMiddlewareProvider giới hạn số request theo IP.
// Dùng Redis Sliding Window nếu có; fallback về in-memory token bucket nếu không.
func RateLimitMiddlewareProvider(maxReqPerMin int) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := RealIP(r)
			var limited bool

			if RedisClient != nil {
				limited = isRateLimitedRedis(r.Context(), ip, maxReqPerMin)
			} else {
				limited = !getVisitorLimiter(ip, maxReqPerMin).Allow()
			}

			if limited {
				http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
