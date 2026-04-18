package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"duo-server/internal/middleware"
)



type workoutRequest struct {
	StartedAt       time.Time  `json:"started_at"`
	EndedAt         *time.Time `json:"ended_at"`
	DurationSeconds *int       `json:"duration_seconds"`
	LocationLat     *float64   `json:"location_lat"`
	LocationLng     *float64   `json:"location_lng"`
	LocationName    *string    `json:"location_name"`
	Notes           *string    `json:"notes"`
}

type workoutResponse struct {
	ID              string     `json:"id"`
	UserID          string     `json:"user_id"`
	StartedAt       time.Time  `json:"started_at"`
	EndedAt         *time.Time `json:"ended_at"`
	DurationSeconds *int       `json:"duration_seconds"`
	LocationLat     *float64   `json:"location_lat"`
	LocationLng     *float64   `json:"location_lng"`
	LocationName    *string    `json:"location_name"`
	Notes           *string    `json:"notes"`
	CreatedAt       time.Time  `json:"created_at"`
}

type scanner interface{ Scan(dest ...any) error }

func scanWorkout(row scanner) (workoutResponse, error) {
	var wo workoutResponse
	err := row.Scan(
		&wo.ID, &wo.UserID, &wo.StartedAt, &wo.EndedAt,
		&wo.DurationSeconds, &wo.LocationLat, &wo.LocationLng,
		&wo.LocationName, &wo.Notes, &wo.CreatedAt,
	)
	return wo, err
}

const workoutCols = `id, user_id, started_at, ended_at, duration_seconds, location_lat, location_lng, location_name, notes, created_at`

func (h *Handler) CreateWorkout(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())
	var req workoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondErr(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.StartedAt.IsZero() {
		req.StartedAt = time.Now()
	}

	wo, err := scanWorkout(h.db.QueryRow(r.Context(),
		`INSERT INTO workouts (user_id, started_at, ended_at, duration_seconds, location_lat, location_lng, location_name, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING `+workoutCols,
		userID, req.StartedAt, req.EndedAt, req.DurationSeconds,
		req.LocationLat, req.LocationLng, req.LocationName, req.Notes,
	))
	if err != nil {
		internalErr(w, err)
		return
	}
	respond(w, http.StatusCreated, wo)
}

func (h *Handler) ListWorkouts(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())
	rows, err := h.db.Query(r.Context(),
		`SELECT `+workoutCols+` FROM workouts WHERE user_id = $1 ORDER BY started_at DESC`,
		userID,
	)
	if err != nil {
		internalErr(w, err)
		return
	}
	defer rows.Close()

	workouts := make([]workoutResponse, 0)
	for rows.Next() {
		wo, err := scanWorkout(rows)
		if err != nil {
			internalErr(w, err)
			return
		}
		workouts = append(workouts, wo)
	}
	if err := rows.Err(); err != nil {
		internalErr(w, err)
		return
	}
	respond(w, http.StatusOK, workouts)
}

func (h *Handler) GetWorkout(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())
	workoutID := chi.URLParam(r, "workoutID")

	wo, err := scanWorkout(h.db.QueryRow(r.Context(),
		`SELECT `+workoutCols+` FROM workouts WHERE id = $1 AND user_id = $2`,
		workoutID, userID,
	))
	if err == pgx.ErrNoRows {
		respondErr(w, http.StatusNotFound, "workout not found")
		return
	}
	if err != nil {
		internalErr(w, err)
		return
	}
	respond(w, http.StatusOK, wo)
}

func (h *Handler) UpdateWorkout(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())
	workoutID := chi.URLParam(r, "workoutID")

	var req workoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondErr(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	wo, err := scanWorkout(h.db.QueryRow(r.Context(),
		`UPDATE workouts SET
			ended_at = $3,
			duration_seconds = $4,
			location_lat = $5,
			location_lng = $6,
			location_name = $7,
			notes = $8
		 WHERE id = $1 AND user_id = $2
		 RETURNING `+workoutCols,
		workoutID, userID, req.EndedAt, req.DurationSeconds,
		req.LocationLat, req.LocationLng, req.LocationName, req.Notes,
	))
	if err == pgx.ErrNoRows {
		respondErr(w, http.StatusNotFound, "workout not found")
		return
	}
	if err != nil {
		internalErr(w, err)
		return
	}
	respond(w, http.StatusOK, wo)
}

func (h *Handler) DeleteWorkout(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())
	workoutID := chi.URLParam(r, "workoutID")

	result, err := h.db.Exec(r.Context(),
		`DELETE FROM workouts WHERE id = $1 AND user_id = $2`,
		workoutID, userID,
	)
	if err != nil {
		internalErr(w, err)
		return
	}
	if result.RowsAffected() == 0 {
		respondErr(w, http.StatusNotFound, "workout not found")
		return
	}
	respond(w, http.StatusNoContent, nil)
}
