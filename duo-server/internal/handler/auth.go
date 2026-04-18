package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"duo-server/internal/auth"
	"duo-server/internal/middleware"
)

type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// sendTokens issues a new access + refresh token pair for userID and writes the response.
// It writes its own error response on failure, so callers should return immediately after.
func (h *Handler) sendTokens(ctx context.Context, w http.ResponseWriter, userID string) {
	accessToken, err := auth.NewAccessToken(userID, h.jwtSecret)
	if err != nil {
		internalErr(w, err)
		return
	}
	refreshToken, refreshHash, err := auth.NewRefreshToken()
	if err != nil {
		internalErr(w, err)
		return
	}
	_, err = h.db.Exec(ctx,
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		userID, refreshHash, time.Now().Add(30*24*time.Hour),
	)
	if err != nil {
		internalErr(w, err)
		return
	}
	respond(w, http.StatusOK, tokenResponse{AccessToken: accessToken, RefreshToken: refreshToken})
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondErr(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Email == "" || len(req.Password) < 8 {
		respondErr(w, http.StatusBadRequest, "email and password (min 8 chars) required")
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		internalErr(w, err)
		return
	}

	var userID string
	err = h.db.QueryRow(r.Context(),
		`INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
		req.Email, hash,
	).Scan(&userID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			respondErr(w, http.StatusConflict, "email already registered")
			return
		}
		internalErr(w, err)
		return
	}

	h.sendTokens(r.Context(), w, userID)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondErr(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	var userID, passwordHash string
	err := h.db.QueryRow(r.Context(),
		`SELECT id, password_hash FROM users WHERE email = $1`,
		req.Email,
	).Scan(&userID, &passwordHash)
	if err == pgx.ErrNoRows {
		respondErr(w, http.StatusUnauthorized, "invalid email or password")
		return
	}
	if err != nil {
		internalErr(w, err)
		return
	}
	if !auth.VerifyPassword(req.Password, passwordHash) {
		respondErr(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	h.sendTokens(r.Context(), w, userID)
}

func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondErr(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.RefreshToken == "" {
		respondErr(w, http.StatusBadRequest, "refresh_token required")
		return
	}

	tokenHash := auth.HashRefreshToken(req.RefreshToken)

	var tokenID, userID string
	var expiresAt time.Time
	err := h.db.QueryRow(r.Context(),
		`SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = $1`,
		tokenHash,
	).Scan(&tokenID, &userID, &expiresAt)
	if err == pgx.ErrNoRows {
		respondErr(w, http.StatusUnauthorized, "invalid refresh token")
		return
	}
	if err != nil {
		internalErr(w, err)
		return
	}
	if time.Now().After(expiresAt) {
		h.db.Exec(r.Context(), `DELETE FROM refresh_tokens WHERE id = $1`, tokenID)
		respondErr(w, http.StatusUnauthorized, "refresh token expired")
		return
	}

	// Rotate: delete old token, issue new pair
	if _, err = h.db.Exec(r.Context(), `DELETE FROM refresh_tokens WHERE id = $1`, tokenID); err != nil {
		internalErr(w, err)
		return
	}
	h.sendTokens(r.Context(), w, userID)
}

// Logout invalidates all refresh tokens for the authenticated user.
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())
	h.db.Exec(r.Context(), `DELETE FROM refresh_tokens WHERE user_id = $1`, userID)
	respond(w, http.StatusNoContent, nil)
}
