package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"atlas/internal/api"
	"atlas/internal/db"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	db.Connect()
	defer db.Pool.Close()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Routes
	http.HandleFunc("/api/photos", api.EnableCORS(api.RateLimit(api.GetAtlasEntries)))
	http.HandleFunc("/api/upload", api.EnableCORS(api.RateLimit(api.UploadHandler)))
	http.HandleFunc("/api/photos/{id}", api.EnableCORS(api.RateLimit(api.DeleteHandler)))
	http.HandleFunc("PATCH /api/photos/{id}", api.EnableCORS(api.RateLimit(api.UpdateHandler)))
	http.HandleFunc("/api/health", api.EnableCORS(api.HealthCheckHandler))


	fmt.Println("Backend listening on port ", port)

	server := &http.Server{
		Addr:              "0.0.0.0:" + port,
		Handler:           nil, // Uses http.DefaultServeMux
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	log.Fatal(server.ListenAndServe())
}
