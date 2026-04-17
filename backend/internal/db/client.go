package db

import (
	"context"
	"fmt"
	"log"
	"os"

	pgx "github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Pool is the global connection pool for the app to use
var Pool *pgxpool.Pool

// Connect initializes the database connection pool
func Connect() {
	connString := os.Getenv("DATABASE_URL")
	if connString == "" {
		log.Fatal("DATABASE_URL environment variable is not set")
	}

	cfg, err := pgxpool.ParseConfig(connString)
	if err != nil {
		log.Fatalf("Unable to parse config: %v", err)
	}

	cfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
	cfg.MaxConns = 10

	Pool, err = pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		log.Fatalf("Unable to create connection pool: %v", err)
	}

	err = Pool.Ping(context.Background())
	if err != nil {
		log.Fatalf("Could not ping database: %v", err)
	}
	fmt.Println("Connected to Supabase via Pooler!")
}
