package auth

import (
	"context"
	"fmt"
	"os"

	"google.golang.org/api/idtoken"
)

// GetGoogleEmail verifies the Google ID Token locally and returns the user's email
func GetGoogleEmail(token string) (string, error) {
	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	if clientID == "" {
		return "", fmt.Errorf("GOOGLE_CLIENT_ID environment variable is not set")
	}

	// This validates the signature, expiration, and that the token was intended for your app (audience)
	payload, err := idtoken.Validate(context.Background(), token, clientID)
	if err != nil {
		return "", fmt.Errorf("invalid token: %v", err)
	}

	// Extract the email from the claims
	emailObj, ok := payload.Claims["email"]
	if !ok {
		return "", fmt.Errorf("email not found in token claims")
	}

	email, ok := emailObj.(string)
	if !ok {
		return "", fmt.Errorf("email claim is not a string")
	}

	return email, nil
}
