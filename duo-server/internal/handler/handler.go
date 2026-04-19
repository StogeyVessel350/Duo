package handler

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"duo-server/internal/email"
)

type Handler struct {
	db        *pgxpool.Pool
	jwtSecret string
	email     *email.Client
}

func New(db *pgxpool.Pool, jwtSecret, resendKey string) *Handler {
	return &Handler{db: db, jwtSecret: jwtSecret, email: email.New(resendKey)}
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	respond(w, http.StatusOK, map[string]string{"status": "ok"})
}
