package migrations

import (
	"context"
	_ "embed"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed 001_init.up.sql
var migration001 string

//go:embed 002_email_verification.up.sql
var migration002 string

func Run(ctx context.Context, pool *pgxpool.Pool) error {
	for i, sql := range []string{migration001, migration002} {
		if _, err := pool.Exec(ctx, sql); err != nil {
			return fmt.Errorf("migration %d: %w", i+1, err)
		}
	}
	return nil
}
