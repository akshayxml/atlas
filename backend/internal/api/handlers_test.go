package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"atlas/internal/db"
)

func TestExtractYear(t *testing.T) {
	currentYear := time.Now().Format("2006")

	tests := []struct {
		name       string
		capturedAt string
		want       string
	}{
		{
			name:       "valid full date",
			capturedAt: "2023-05-01",
			want:       "2023",
		},
		{
			name:       "valid year only",
			capturedAt: "2023",
			want:       "2023",
		},
		{
			name:       "invalid date format",
			capturedAt: "01-05-2023",
			want:       currentYear,
		},
		{
			name:       "empty string",
			capturedAt: "",
			want:       currentYear,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := extractYear(tt.capturedAt)
			if got != tt.want {
				t.Errorf("extractYear() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestHealthCheckHandler_Uninitialized(t *testing.T) {
	// Ensure db.Pool is nil
	db.Pool = nil

	req, err := http.NewRequest("GET", "/api/health", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(HealthCheckHandler)

	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusServiceUnavailable {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusServiceUnavailable)
	}

	expected := `{"database":"not_initialized","status":"unhealthy"}`
	body := strings.TrimSpace(rr.Body.String())
	if body != expected {
		t.Errorf("handler returned unexpected body: got %v want %v",
			body, expected)
	}
}
