package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"duo-server/internal/middleware"
)

type setRequest struct {
	ExerciseName string   `json:"exercise_name"`
	SetNumber    int      `json:"set_number"`
	WeightKg     *float64 `json:"weight_kg"`
	RPE          *float64 `json:"rpe"`
	RestSeconds  *int     `json:"rest_seconds"`
	RepCount     *int     `json:"rep_count"`
	BarType      *string  `json:"bar_type"`
	Notes        *string  `json:"notes"`
}

type setResponse struct {
	ID           string    `json:"id"`
	WorkoutID    string    `json:"workout_id"`
	ExerciseName string    `json:"exercise_name"`
	SetNumber    int       `json:"set_number"`
	WeightKg     *float64  `json:"weight_kg"`
	RPE          *float64  `json:"rpe"`
	RestSeconds  *int      `json:"rest_seconds"`
	RepCount     *int      `json:"rep_count"`
	BarType      *string   `json:"bar_type"`
	Notes        *string   `json:"notes"`
	CreatedAt    time.Time `json:"created_at"`
}

func scanSet(row scanner) (setResponse, error) {
	var s setResponse
	err := row.Scan(
		&s.ID, &s.WorkoutID, &s.ExerciseName, &s.SetNumber,
		&s.WeightKg, &s.RPE, &s.RestSeconds, &s.RepCount, &s.BarType,
		&s.Notes, &s.CreatedAt,
	)
	return s, err
}

const setCols = `id, workout_id, exercise_name, set_number, weight_kg, rpe, rest_seconds, rep_count, bar_type, notes, created_at`

// ownsWorkout returns true if the workout belongs to userID, writing a 404 response if not.
func (h *Handler) ownsWorkout(w http.ResponseWriter, r *http.Request, workoutID, userID string) bool {
	var id string
	err := h.db.QueryRow(r.Context(),
		`SELECT id FROM workouts WHERE id = $1 AND user_id = $2`,
		workoutID, userID,
	).Scan(&id)
	if err == pgx.ErrNoRows {
		respondErr(w, http.StatusNotFound, "workout not found")
		return false
	}
	if err != nil {
		internalErr(w, err)
		return false
	}
	return true
}

func (h *Handler) CreateSet(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())
	workoutID := chi.URLParam(r, "workoutID")

	if !h.ownsWorkout(w, r, workoutID, userID) {
		return
	}

	var req setRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondErr(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.ExerciseName == "" {
		respondErr(w, http.StatusBadRequest, "exercise_name required")
		return
	}

	s, err := scanSet(h.db.QueryRow(r.Context(),
		`INSERT INTO sets (workout_id, exercise_name, set_number, weight_kg, rpe, rest_seconds, rep_count, bar_type, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING `+setCols,
		workoutID, req.ExerciseName, req.SetNumber, req.WeightKg, req.RPE,
		req.RestSeconds, req.RepCount, req.BarType, req.Notes,
	))
	if err != nil {
		internalErr(w, err)
		return
	}
	respond(w, http.StatusCreated, s)
}

func (h *Handler) ListSets(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())
	workoutID := chi.URLParam(r, "workoutID")

	if !h.ownsWorkout(w, r, workoutID, userID) {
		return
	}

	rows, err := h.db.Query(r.Context(),
		`SELECT `+setCols+` FROM sets WHERE workout_id = $1 ORDER BY set_number`,
		workoutID,
	)
	if err != nil {
		internalErr(w, err)
		return
	}
	defer rows.Close()

	sets := make([]setResponse, 0)
	for rows.Next() {
		s, err := scanSet(rows)
		if err != nil {
			internalErr(w, err)
			return
		}
		sets = append(sets, s)
	}
	if err := rows.Err(); err != nil {
		internalErr(w, err)
		return
	}
	respond(w, http.StatusOK, sets)
}

func (h *Handler) GetSet(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())
	workoutID := chi.URLParam(r, "workoutID")
	setID := chi.URLParam(r, "setID")

	s, err := scanSet(h.db.QueryRow(r.Context(),
		`SELECT s.`+setCols+`
		 FROM sets s JOIN workouts w ON s.workout_id = w.id
		 WHERE s.id = $1 AND s.workout_id = $2 AND w.user_id = $3`,
		setID, workoutID, userID,
	))
	if err == pgx.ErrNoRows {
		respondErr(w, http.StatusNotFound, "set not found")
		return
	}
	if err != nil {
		internalErr(w, err)
		return
	}
	respond(w, http.StatusOK, s)
}

func (h *Handler) UpdateSet(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())
	workoutID := chi.URLParam(r, "workoutID")
	setID := chi.URLParam(r, "setID")

	var req setRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondErr(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	s, err := scanSet(h.db.QueryRow(r.Context(),
		`UPDATE sets SET
			exercise_name = $3, set_number = $4,
			weight_kg = $5, rpe = $6, rest_seconds = $7, rep_count = $8, bar_type = $9, notes = $10
		 FROM workouts w
		 WHERE sets.id = $1 AND sets.workout_id = $2 AND w.id = sets.workout_id AND w.user_id = $11
		 RETURNING sets.`+setCols,
		setID, workoutID,
		req.ExerciseName, req.SetNumber,
		req.WeightKg, req.RPE, req.RestSeconds, req.RepCount, req.BarType, req.Notes,
		userID,
	))
	if err == pgx.ErrNoRows {
		respondErr(w, http.StatusNotFound, "set not found")
		return
	}
	if err != nil {
		internalErr(w, err)
		return
	}
	respond(w, http.StatusOK, s)
}

func (h *Handler) DeleteSet(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())
	workoutID := chi.URLParam(r, "workoutID")
	setID := chi.URLParam(r, "setID")

	result, err := h.db.Exec(r.Context(),
		`DELETE FROM sets USING workouts w
		 WHERE sets.id = $1 AND sets.workout_id = $2 AND w.id = sets.workout_id AND w.user_id = $3`,
		setID, workoutID, userID,
	)
	if err != nil {
		internalErr(w, err)
		return
	}
	if result.RowsAffected() == 0 {
		respondErr(w, http.StatusNotFound, "set not found")
		return
	}
	respond(w, http.StatusNoContent, nil)
}
