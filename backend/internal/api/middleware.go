package api

import (
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

const (
	RATE_LIMIT_PER_SECOND = 2
	RATE_LIMIT_BURST      = 5
)

// EnableCORS handles CORS headers
func EnableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", os.Getenv("CLIENT_ADDRESS"))
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE, PATCH")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

var (
	visitors = make(map[string]*visitor)
	mu       sync.Mutex
)

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

func init() {
	go func() {
		for {
			time.Sleep(5 * time.Minute)
			cleanupVisitors()
		}
	}()
}

func cleanupVisitors() {
	mu.Lock()
	defer mu.Unlock()
	now := time.Now()
	for ip, v := range visitors {
		if now.Sub(v.lastSeen) > 10*time.Minute {
			delete(visitors, ip)
		}
	}
}

// getVisitor returns the limiter for the given IP, creating it if needed.
func getVisitor(ip string) *rate.Limiter {
	mu.Lock()
	defer mu.Unlock()

	v, exists := visitors[ip]
	if !exists {
		limiter := rate.NewLimiter(rate.Limit(RATE_LIMIT_PER_SECOND), RATE_LIMIT_BURST)
		visitors[ip] = &visitor{limiter: limiter, lastSeen: time.Now()}
		return limiter
	}

	v.lastSeen = time.Now()
	return v.limiter
}

// RateLimit limits requests per IP using token bucket
func RateLimit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip := r.Header.Get("X-Forwarded-For")
		if ip != "" {
			// X-Forwarded-For can contain multiple IPs, the first one is the client
			ips := strings.Split(ip, ",")
			ip = strings.TrimSpace(ips[0])
		} else {
			ip = r.RemoteAddr
			if idx := strings.LastIndex(ip, ":"); idx != -1 {
				ip = ip[:idx]
			}
		}

		limiter := getVisitor(ip)
		if !limiter.Allow() {
			log.Printf("Rate limit exceeded for IP: %s", ip)
			http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
			return
		}

		next(w, r)
	}
}
