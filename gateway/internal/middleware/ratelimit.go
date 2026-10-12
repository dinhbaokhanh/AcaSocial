package middleware

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/redis/go-redis/v9"
)

const rateWindow = time.Minute

type visitor struct {
	requests []time.Time
	lastSeen time.Time
	mu       sync.Mutex
}

var visitors sync.Map
var memberCounter atomic.Uint64
var limiterInstance = func() string {
	var id [16]byte
	if _, err := rand.Read(id[:]); err != nil {
		panic(err)
	}
	return hex.EncodeToString(id[:])
}()

// InitRateLimiter starts cleanup and returns an idempotent shutdown callback.
func InitRateLimiter() func() {
	stop := make(chan struct{})
	var once sync.Once
	go cleanupVisitors(stop)
	return func() { once.Do(func() { close(stop) }) }
}

func cleanupVisitors(stop <-chan struct{}) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			visitors.Range(func(key, value any) bool {
				v := value.(*visitor)
				v.mu.Lock()
				if time.Since(v.lastSeen) > 10*time.Minute {
					visitors.CompareAndDelete(key, v)
				}
				v.mu.Unlock()
				return true
			})
		case <-stop:
			return
		}
	}
}

// Use the same one-minute sliding window as Redis, including for low-limit
// authentication routes. A rejected request does not extend the window.
func localRateLimitWait(key string, limit int) time.Duration {
	actual, _ := visitors.LoadOrStore(key, &visitor{})
	v := actual.(*visitor)
	v.mu.Lock()
	defer v.mu.Unlock()
	now := time.Now()
	v.lastSeen = now
	expired := 0
	for expired < len(v.requests) && !v.requests[expired].After(now.Add(-rateWindow)) {
		expired++
	}
	if expired > 0 {
		copy(v.requests, v.requests[expired:])
		v.requests = v.requests[:len(v.requests)-expired]
	}
	if len(v.requests) >= limit {
		return v.requests[0].Add(rateWindow).Sub(now)
	}
	v.requests = append(v.requests, now)
	return 0
}

// Redis supplies the clock so gateway replicas share a consistent window.
// The return value is the wait in milliseconds, or zero when admitted.
var slidingWindowScript = redis.NewScript(`
local key = KEYS[1]
local window_ms = tonumber(ARGV[1])
local member = ARGV[2]
local max_req = tonumber(ARGV[3])
local clock = redis.call('TIME')
local now_ms = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
redis.call('ZREMRANGEBYSCORE', key, '-inf', now_ms - window_ms)
local count = redis.call('ZCARD', key)
if count >= max_req then
 local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
 return math.max(1, tonumber(oldest[2]) + window_ms - now_ms)
end
redis.call('ZADD', key, now_ms, member)
redis.call('PEXPIRE', key, window_ms + 1000)
return 0
`)

func redisRateLimitWait(ctx context.Context, key string, limit int) (time.Duration, error) {
	member := limiterInstance + ":" + strconv.FormatUint(memberCounter.Add(1), 10)
	milliseconds, err := slidingWindowScript.Run(ctx, RedisClient, []string{key}, rateWindow.Milliseconds(), member, limit).Int64()
	return time.Duration(milliseconds) * time.Millisecond, err
}

// RateLimitMiddlewareProvider scopes limits by the configured method/route
// template and client IP. Never use the concrete URL: changing an {id} must not
// bypass the limit. The v2 prefix also isolates obsolete shared-IP counters.
func RateLimitMiddlewareProvider(maxReqPerMin int, routeScope string) func(http.Handler) http.Handler {
	if maxReqPerMin <= 0 {
		maxReqPerMin = 100
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodOptions {
				next.ServeHTTP(w, r)
				return
			}
			digest := sha256.Sum256([]byte(routeScope + "\x00" + RealIP(r)))
			key := fmt.Sprintf("ratelimit:v2:%x", digest)
			var wait time.Duration
			if RedisClient != nil {
				ctx, cancel := context.WithTimeout(r.Context(), 500*time.Millisecond)
				var err error
				wait, err = redisRateLimitWait(ctx, key, maxReqPerMin)
				cancel()
				if err != nil {
					log.Printf("[WARN] Rate limiter Redis unavailable; using local window: %v", err)
					wait = localRateLimitWait(key, maxReqPerMin)
				}
			} else {
				wait = localRateLimitWait(key, maxReqPerMin)
			}
			if wait > 0 {
				seconds := int64((wait + time.Second - 1) / time.Second)
				w.Header().Set("Retry-After", strconv.FormatInt(seconds, 10))
				w.Header().Set("Cache-Control", "no-store")
				w.Header().Set("Content-Type", "application/json; charset=utf-8")
				w.WriteHeader(http.StatusTooManyRequests)
				_ = json.NewEncoder(w).Encode(map[string]any{
					"statusCode": http.StatusTooManyRequests,
					"error":      "Too Many Requests",
					"message":    fmt.Sprintf("Bạn gửi yêu cầu quá nhanh. Vui lòng thử lại sau %d giây.", seconds),
					"retryAfter": seconds,
				})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
