package db

import (
	"context"

	"atlas/internal/models"
)

// GetEntries retrieves all atlas records from the database
func GetEntries(ctx context.Context) ([]models.AtlasRecord, error) {
	query := `
		SELECT 
			id, title, COALESCE(description, ''), image_url, COALESCE(thumb_url, ''), 
			ST_X(location::geometry) as lng, 
			ST_Y(location::geometry) as lat, 
			captured_at, created_at 
		FROM atlas 
		ORDER BY captured_at DESC`

	rows, err := Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []models.AtlasRecord
	for rows.Next() {
		var entry models.AtlasRecord
		err := rows.Scan(
			&entry.ID,
			&entry.Title,
			&entry.Description,
			&entry.ImageURL,
			&entry.ThumbURL,
			&entry.Location.Lng,
			&entry.Location.Lat,
			&entry.CapturedAt,
			&entry.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}
	return entries, nil
}

// InsertEntry inserts a new atlas record into the database
func InsertEntry(ctx context.Context, title, description, imageURL, lng, lat, capturedAt string) error {
	query := `
		INSERT INTO atlas (title, description, image_url, location, captured_at)
		VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6)`

	_, err := Pool.Exec(ctx, query, title, description, imageURL, lng, lat, capturedAt)
	return err
}

// GetEntry retrieves a specific atlas record by ID
func GetEntry(ctx context.Context, id string) (models.AtlasRecord, error) {
	query := `
		SELECT 
			id, title, COALESCE(description, ''), image_url, COALESCE(thumb_url, ''), 
			ST_X(location::geometry) as lng, 
			ST_Y(location::geometry) as lat, 
			captured_at, created_at 
		FROM atlas 
		WHERE id = $1`

	var entry models.AtlasRecord
	err := Pool.QueryRow(ctx, query, id).Scan(
		&entry.ID,
		&entry.Title,
		&entry.Description,
		&entry.ImageURL,
		&entry.ThumbURL,
		&entry.Location.Lng,
		&entry.Location.Lat,
		&entry.CapturedAt,
		&entry.CreatedAt,
	)
	return entry, err
}

// DeleteEntry deletes an atlas record by ID
func DeleteEntry(ctx context.Context, id string) error {
	query := `DELETE FROM atlas WHERE id = $1`
	_, err := Pool.Exec(ctx, query, id)
	return err
}

// UpdateEntry updates a specific atlas record by ID
func UpdateEntry(ctx context.Context, id, title, description, lng, lat, capturedAt string) error {
	query := `
		UPDATE atlas 
		SET title = $2, description = $3, location = ST_SetSRID(ST_MakePoint($4, $5), 4326), captured_at = $6
		WHERE id = $1`

	_, err := Pool.Exec(ctx, query, id, title, description, lng, lat, capturedAt)
	return err
}
