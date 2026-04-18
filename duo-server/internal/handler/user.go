package handler

import (
	"net/http"
	"time"

	"duo-server/internal/middleware"
)

type userResponse struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())

	var u userResponse
	err := h.db.QueryRow(r.Context(),
		`SELECT id, email, created_at FROM users WHERE id = $1`,
		userID,
	).Scan(&u.ID, &u.Email, &u.CreatedAt)
	if err != nil {
		internalErr(w, err)
		return
	}
	respond(w, http.StatusOK, u)
}
