# Atlas

Atlas is a web application that allows you to visualize your memories on a map. You can upload photos, and the application will extract the location and date from the photo's metadata (EXIF) to place it on an interactive map.

## Project Structure

The repository is split into two main parts:

-   `frontend/`: A React application built with Vite and TypeScript.
-   `backend/`: A Go application handling the API and database interactions.

## Tech Stack

### Frontend
-   **Framework**: React 19
-   **Build Tool**: Vite
-   **Map Library**: Maplibre GL with `react-map-gl`
-   **Authentication**: Google OAuth (`@react-oauth/google`)
-   **Metadata Extraction**: `exifr`

### Backend
-   **Language**: Go 1.22
-   **Database**: PostgreSQL (via Supabase) using `pgx`
-   **Storage**: Cloudflare R2 (S3 compatible) for image hosting
-   **Authentication**: Google ID Token validation

## Deployment

-   **Frontend**: Deployed on **Vercel**.
-   **Backend**: Deployed on **Render**.

## Local Development

To run the project locally, you will need to set up environment variables for both the frontend and backend.

### Backend
1. Navigate to the `backend` directory.
2. Create a `.env` file (ignored by git) and add the following environment variables:
   ```env
   PORT=8080 # Optional, defaults to 8080
   DATABASE_URL=your_postgresql_connection_string
   GOOGLE_CLIENT_ID=your_google_oauth_client_id
   ALLOWED_EMAIL=user@example.com # Email authorized to upload/delete
   CLIENT_ADDRESS=http://localhost:5173 # Frontend URL for CORS
   R2_ACCOUNT_ID=your_cloudflare_account_id
   R2_ACCESS_KEY_ID=your_r2_access_key_id
   R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
   R2_BUCKET_NAME=your_r2_bucket_name
   R2_PUBLIC_DOMAIN=your_r2_public_domain_without_https
   ```
3. Run the server:
   ```bash
   go run cmd/atlas/main.go
   ```

### Frontend
1. Navigate to the `frontend` directory.
2. Create a `.env.local` file and add:
   ```env
   VITE_SERVER_URL=http://localhost:8080
   VITE_OAUTH_CLIENT_ID=your-google-client-id
   ```
3. Install dependencies and start the dev server:
   ```bash
   npm install
   npm run dev
   ```
