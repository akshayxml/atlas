package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRateLimit(t *testing.T) {
	// Reset visitors map for test isolation
	mu.Lock()
	visitors = make(map[string]*visitor)
	mu.Unlock()

	handler := RateLimit(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest("GET", "/api/test", nil)
	req.RemoteAddr = "127.0.0.1:1234"

	// 1. Burst of 5 requests should be allowed
	for i := 1; i <= RATE_LIMIT_BURST; i++ {
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Errorf("Request %d: expected status OK, got %v", i, rr.Code)
		}
	}

	// 2. 6th request should be rate limited
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusTooManyRequests {
		t.Errorf("Expected status TooManyRequests, got %v", rr.Code)
	}

	// 3. Wait for 1 second for tokens to refill (rate is 2/sec)
	time.Sleep(1 * time.Second)

	// 4. Should be allowed 2 more requests
	for i := 1; i <= RATE_LIMIT_PER_SECOND; i++ {
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Errorf("Request after refill %d: expected status OK, got %v", i, rr.Code)
		}
	}

	// 5. 3rd request after refill should be rate limited
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusTooManyRequests {
		t.Errorf("Expected status TooManyRequests after refill, got %v", rr.Code)
	}
}
