package handler

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"duo-server/internal/auth"
	"duo-server/internal/middleware"
)

type tokenResponse struct {
	AccessToken   string `json:"access_token"`
	RefreshToken  string `json:"refresh_token"`
	EmailVerified bool   `json:"email_verified"`
}

func (h *Handler) sendTokens(ctx context.Context, w http.ResponseWriter, userID string, emailVerified bool) {
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
	respond(w, http.StatusOK, tokenResponse{
		AccessToken:   accessToken,
		RefreshToken:  refreshToken,
		EmailVerified: emailVerified,
	})
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

	h.sendVerificationEmail(r.Context(), userID, req.Email)
	h.sendTokens(r.Context(), w, userID, false)
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
	var emailVerified bool
	err := h.db.QueryRow(r.Context(),
		`SELECT id, password_hash, email_verified FROM users WHERE email = $1`,
		req.Email,
	).Scan(&userID, &passwordHash, &emailVerified)
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

	if !emailVerified {
		h.sendVerificationEmail(r.Context(), userID, req.Email)
	}
	h.sendTokens(r.Context(), w, userID, emailVerified)
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

	var emailVerified bool
	h.db.QueryRow(r.Context(), `SELECT email_verified FROM users WHERE id = $1`, userID).Scan(&emailVerified)

	if _, err = h.db.Exec(r.Context(), `DELETE FROM refresh_tokens WHERE id = $1`, tokenID); err != nil {
		internalErr(w, err)
		return
	}
	h.sendTokens(r.Context(), w, userID, emailVerified)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())
	h.db.Exec(r.Context(), `DELETE FROM refresh_tokens WHERE user_id = $1`, userID)
	respond(w, http.StatusNoContent, nil)
}

func (h *Handler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())

	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondErr(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.Code == "" {
		respondErr(w, http.StatusBadRequest, "code required")
		return
	}

	codeHash := auth.HashVerificationCode(req.Code)

	var tokenID string
	var expiresAt time.Time
	err := h.db.QueryRow(r.Context(),
		`SELECT id, expires_at FROM email_verification_tokens WHERE user_id = $1 AND code_hash = $2`,
		userID, codeHash,
	).Scan(&tokenID, &expiresAt)
	if err == pgx.ErrNoRows {
		respondErr(w, http.StatusUnauthorized, "invalid or expired code")
		return
	}
	if err != nil {
		internalErr(w, err)
		return
	}
	if time.Now().After(expiresAt) {
		h.db.Exec(r.Context(), `DELETE FROM email_verification_tokens WHERE id = $1`, tokenID)
		respondErr(w, http.StatusUnauthorized, "code expired — request a new one")
		return
	}

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		internalErr(w, err)
		return
	}
	defer tx.Rollback(r.Context())

	tx.Exec(r.Context(), `DELETE FROM email_verification_tokens WHERE user_id = $1`, userID)
	tx.Exec(r.Context(), `UPDATE users SET email_verified = true WHERE id = $1`, userID)

	if err := tx.Commit(r.Context()); err != nil {
		internalErr(w, err)
		return
	}
	respond(w, http.StatusOK, map[string]bool{"email_verified": true})
}

func (h *Handler) ResendVerification(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())

	var userEmail string
	var emailVerified bool
	err := h.db.QueryRow(r.Context(),
		`SELECT email, email_verified FROM users WHERE id = $1`, userID,
	).Scan(&userEmail, &emailVerified)
	if err != nil {
		internalErr(w, err)
		return
	}
	if emailVerified {
		respondErr(w, http.StatusBadRequest, "email already verified")
		return
	}

	h.sendVerificationEmail(r.Context(), userID, userEmail)
	respond(w, http.StatusOK, map[string]string{"message": "code sent"})
}

// sendVerificationEmail generates a code, stores it, and emails it. Errors are logged but not fatal.
func (h *Handler) sendVerificationEmail(ctx context.Context, userID, email string) {
	code, codeHash, err := auth.GenerateVerificationCode()
	if err != nil {
		log.Printf("generate verification code: %v", err)
		return
	}
	h.db.Exec(ctx, `DELETE FROM email_verification_tokens WHERE user_id = $1`, userID)
	_, err = h.db.Exec(ctx,
		`INSERT INTO email_verification_tokens (user_id, code_hash, expires_at) VALUES ($1, $2, $3)`,
		userID, codeHash, time.Now().Add(15*time.Minute),
	)
	if err != nil {
		log.Printf("store verification token: %v", err)
		return
	}
	if err := h.email.SendVerification(email, code); err != nil {
		log.Printf("send verification email: %v", err)
	}
}
