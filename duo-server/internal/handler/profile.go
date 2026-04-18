package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"duo-server/internal/middleware"
)

type profileRequest struct {
	Name         *string    `json:"name"`
	DateOfBirth  *time.Time `json:"date_of_birth"`
	HeightCm     *float64   `json:"height_cm"`
	Sex          *string    `json:"sex"`
	TrainingGoal *string    `json:"training_goal"`
}

type profileResponse struct {
	UserID       string     `json:"user_id"`
	Name         *string    `json:"name"`
	DateOfBirth  *time.Time `json:"date_of_birth"`
	HeightCm     *float64   `json:"height_cm"`
	Sex          *string    `json:"sex"`
	TrainingGoal *string    `json:"training_goal"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())

	var p profileResponse
	err := h.db.QueryRow(r.Context(),
		`SELECT user_id, name, date_of_birth, height_cm, sex, training_goal, updated_at
		 FROM user_profiles WHERE user_id = $1`,
		userID,
	).Scan(&p.UserID, &p.Name, &p.DateOfBirth, &p.HeightCm, &p.Sex, &p.TrainingGoal, &p.UpdatedAt)
	if err != nil {
		// Return an empty profile rather than 404 — profile is always expected to exist
		respond(w, http.StatusOK, profileResponse{UserID: userID})
		return
	}
	respond(w, http.StatusOK, p)
}

func (h *Handler) UpsertProfile(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())

	var req profileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondErr(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	var p profileResponse
	err := h.db.QueryRow(r.Context(),
		`INSERT INTO user_profiles (user_id, name, date_of_birth, height_cm, sex, training_goal, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, now())
		 ON CONFLICT (user_id) DO UPDATE SET
		   name = EXCLUDED.name,
		   date_of_birth = EXCLUDED.date_of_birth,
		   height_cm = EXCLUDED.height_cm,
		   sex = EXCLUDED.sex,
		   training_goal = EXCLUDED.training_goal,
		   updated_at = now()
		 RETURNING user_id, name, date_of_birth, height_cm, sex, training_goal, updated_at`,
		userID, req.Name, req.DateOfBirth, req.HeightCm, req.Sex, req.TrainingGoal,
	).Scan(&p.UserID, &p.Name, &p.DateOfBirth, &p.HeightCm, &p.Sex, &p.TrainingGoal, &p.UpdatedAt)
	if err != nil {
		internalErr(w, err)
		return
	}
	respond(w, http.StatusOK, p)
}
