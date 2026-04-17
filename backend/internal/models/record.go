package models

import "time"

// Location represents the coordinates for the frontend
type Location struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// AtlasRecord matches your Supabase table
type AtlasRecord struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	ImageURL    string    `json:"image_url"`
	ThumbURL    string    `json:"thumb_url"`
	Location    Location  `json:"location"`
	CapturedAt  time.Time `json:"captured_at"`
	CreatedAt   time.Time `json:"created_at"`
}
