package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"atlas/internal/auth"
	"atlas/internal/db"
	"atlas/internal/storage"
)

// GetAtlasEntries handles fetching all photo entries
func GetAtlasEntries(w http.ResponseWriter, r *http.Request) {
	start := time.Now()

	log.Printf("ID=[%s] METHOD=%s PATH=%s REMOTE=%s",
		r.Header.Get("X-Request-ID"), r.Method, r.URL.Path, r.RemoteAddr)

	entries, err := db.GetEntries(r.Context())
	if err != nil {
		log.Printf("Database query failed: %v", err)
		http.Error(w, "Database query failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(entries)

	log.Printf("SUCCESS: Returned %d entries in %v", len(entries), time.Since(start))
}

// UploadHandler handles uploading a new photo and saving metadata
func UploadHandler(w http.ResponseWriter, r *http.Request) {
	// 1. AUTHENTICATION (Google OAuth)
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "Missing Authorization header", http.StatusUnauthorized)
		return
	}

	token := strings.TrimPrefix(authHeader, "Bearer ")
	email, err := auth.GetGoogleEmail(token)

	allowedEmail := os.Getenv("ALLOWED_EMAIL")
	if allowedEmail == "" {
		log.Printf("ERROR: ALLOWED_EMAIL environment variable is not set")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if err != nil || email != allowedEmail {
		log.Printf("Auth failed for email: %s, error: %v", email, err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// 2. PARSE MULTIPART FORM (10MB limit)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "File too large or invalid form", http.StatusBadRequest)
		return
	}

	file, handler, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "Missing image file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Simple file type validation
	buff := make([]byte, 512)
	if _, err := file.Read(buff); err != nil {
		http.Error(w, "Failed to read file", http.StatusInternalServerError)
		return
	}
	if _, err := file.Seek(0, 0); err != nil {
		http.Error(w, "Failed to reset file pointer", http.StatusInternalServerError)
		return
	}
	contentType := http.DetectContentType(buff)
	if !strings.HasPrefix(contentType, "image/") {
		http.Error(w, "Uploaded file is not an image", http.StatusBadRequest)
		return
	}

	// 3. UPLOAD TO R2
	capturedAt := r.FormValue("captured_at")
	if capturedAt == "" {
		capturedAt = time.Now().Format("2006-01-02")
	}

	year := extractYear(capturedAt)

	ext := filepath.Ext(handler.Filename)
	objectKey := fmt.Sprintf("%s/%d%s", year, time.Now().UnixNano(), ext)

	imageURL, err := storage.UploadToR2(file, objectKey, contentType)
	if err != nil {
		log.Printf("R2 Upload failed: %v", err)
		http.Error(w, "Storage failed", http.StatusInternalServerError)
		return
	}

	// 4. SAVE TO DATABASE
	title := r.FormValue("title")
	description := r.FormValue("description")
	latStr := r.FormValue("lat")
	lngStr := r.FormValue("lng")

	// Validate coordinates
	lat, errLat := strconv.ParseFloat(latStr, 64)
	lng, errLng := strconv.ParseFloat(lngStr, 64)
	if errLat != nil || errLng != nil || lat < -90 || lat > 90 || lng < -180 || lng > 180 {
		log.Printf("Invalid coordinates: lat=%s, lng=%s", latStr, lngStr)
		http.Error(w, "Invalid coordinates", http.StatusBadRequest)
		return
	}

	err = db.InsertEntry(r.Context(), title, description, imageURL, lngStr, latStr, capturedAt)
	if err != nil {
		log.Printf("DB Insert failed: %v", err)
		http.Error(w, "Database save failed", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprint(w, "Uploaded successfully")
}

// extractYear extracts the year from a date string, or returns the current year if invalid
func extractYear(capturedAt string) string {
	t, err := time.Parse("2006-01-02", capturedAt)
	if err == nil {
		return t.Format("2006")
	}

	t2, err2 := time.Parse("2006", capturedAt)
	if err2 == nil {
		return t2.Format("2006")
	}

	log.Printf("Warning: failed to parse captured_at '%s'. Defaulting to current year.", capturedAt)
	return time.Now().Format("2006")
}

// DeleteHandler handles deleting a photo entry
func DeleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Auth
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "Missing Authorization header", http.StatusUnauthorized)
		return
	}

	token := strings.TrimPrefix(authHeader, "Bearer ")
	email, err := auth.GetGoogleEmail(token)

	allowedEmail := os.Getenv("ALLOWED_EMAIL")
	if allowedEmail == "" {
		log.Printf("ERROR: ALLOWED_EMAIL environment variable is not set")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if err != nil || email != allowedEmail {
		log.Printf("Auth failed for email: %s, error: %v", email, err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	id := r.PathValue("id")
	if id == "" {
		http.Error(w, "Missing photo ID", http.StatusBadRequest)
		return
	}

	// 1. Get record from DB
	entry, err := db.GetEntry(r.Context(), id)
	if err != nil {
		log.Printf("Failed to get entry: %v", err)
		http.Error(w, "Photo not found", http.StatusNotFound)
		return
	}

	// 2. Extract object key from image URL
	publicDomain := os.Getenv("R2_PUBLIC_DOMAIN")
	prefix := fmt.Sprintf("https://%s/", publicDomain)
	objectKey := strings.TrimPrefix(entry.ImageURL, prefix)

	// 3. Delete from R2
	err = storage.DeleteFromR2(objectKey)
	if err != nil {
		log.Printf("Failed to delete from R2: %v", err)
		http.Error(w, "Failed to delete storage file", http.StatusInternalServerError)
		return
	}

	// 4. Delete from DB
	err = db.DeleteEntry(r.Context(), id)
	if err != nil {
		log.Printf("Failed to delete from DB: %v", err)
		http.Error(w, "Failed to delete database record", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "Deleted successfully")
}

// HealthCheckHandler handles health checks
func HealthCheckHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Check DB
	if db.Pool == nil {
		log.Printf("Health check failed: DB pool is nil")
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]string{"status": "unhealthy", "database": "not_initialized"})
		return
	}

	err := db.Pool.Ping(r.Context())
	if err != nil {
		log.Printf("Health check failed: DB ping error: %v", err)
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]string{"status": "unhealthy", "database": "disconnected"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy", "database": "connected"})
}

