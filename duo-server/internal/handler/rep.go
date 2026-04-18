package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"duo-server/internal/middleware"
)

type repRequest struct {
	RepNumber    int      `json:"rep_number"`
	PeakG        *float64 `json:"peak_g"`
	ConcentricMs *int     `json:"concentric_ms"`
	EccentricMs  *int     `json:"eccentric_ms"`
}

type repResponse struct {
	ID           string    `json:"id"`
	SetID        string    `json:"set_id"`
	RepNumber    int       `json:"rep_number"`
	PeakG        *float64  `json:"peak_g"`
	ConcentricMs *int      `json:"concentric_ms"`
	EccentricMs  *int      `json:"eccentric_ms"`
	CreatedAt    time.Time `json:"created_at"`
}

// ownsSet returns true if the set belongs to workoutID which belongs to userID.
func (h *Handler) ownsSet(w http.ResponseWriter, r *http.Request, setID, workoutID, userID string) bool {
	var id string
	err := h.db.QueryRow(r.Context(),
		`SELECT s.id FROM sets s JOIN workouts w ON s.workout_id = w.id
		 WHERE s.id = $1 AND s.workout_id = $2 AND w.user_id = $3`,
		setID, workoutID, userID,
	).Scan(&id)
	if err == pgx.ErrNoRows {
		respondErr(w, http.StatusNotFound, "set not found")
		return false
	}
	if err != nil {
		internalErr(w, err)
		return false
	}
	return true
}

// CreateRep accepts an array of reps and inserts them all for the given set.
func (h *Handler) CreateRep(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())
	workoutID := chi.URLParam(r, "workoutID")
	setID := chi.URLParam(r, "setID")

	if !h.ownsSet(w, r, setID, workoutID, userID) {
		return
	}

	var reps []repRequest
	if err := json.NewDecoder(r.Body).Decode(&reps); err != nil {
		respondErr(w, http.StatusBadRequest, "invalid JSON — expected array of reps")
		return
	}
	if len(reps) == 0 {
		respondErr(w, http.StatusBadRequest, "at least one rep required")
		return
	}

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		internalErr(w, err)
		return
	}
	defer tx.Rollback(r.Context())

	result := make([]repResponse, 0, len(reps))
	for _, req := range reps {
		var rep repResponse
		err := tx.QueryRow(r.Context(),
			`INSERT INTO reps (set_id, rep_number, peak_g, concentric_ms, eccentric_ms)
			 VALUES ($1, $2, $3, $4, $5)
			 RETURNING id, set_id, rep_number, peak_g, concentric_ms, eccentric_ms, created_at`,
			setID, req.RepNumber, req.PeakG, req.ConcentricMs, req.EccentricMs,
		).Scan(&rep.ID, &rep.SetID, &rep.RepNumber, &rep.PeakG, &rep.ConcentricMs, &rep.EccentricMs, &rep.CreatedAt)
		if err != nil {
			internalErr(w, err)
			return
		}
		result = append(result, rep)
	}

	if err := tx.Commit(r.Context()); err != nil {
		internalErr(w, err)
		return
	}
	respond(w, http.StatusCreated, result)
}

func (h *Handler) ListReps(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())
	workoutID := chi.URLParam(r, "workoutID")
	setID := chi.URLParam(r, "setID")

	if !h.ownsSet(w, r, setID, workoutID, userID) {
		return
	}

	rows, err := h.db.Query(r.Context(),
		`SELECT id, set_id, rep_number, peak_g, concentric_ms, eccentric_ms, created_at
		 FROM reps WHERE set_id = $1 ORDER BY rep_number`,
		setID,
	)
	if err != nil {
		internalErr(w, err)
		return
	}
	defer rows.Close()

	reps := make([]repResponse, 0)
	for rows.Next() {
		var rep repResponse
		if err := rows.Scan(&rep.ID, &rep.SetID, &rep.RepNumber, &rep.PeakG, &rep.ConcentricMs, &rep.EccentricMs, &rep.CreatedAt); err != nil {
			internalErr(w, err)
			return
		}
		reps = append(reps, rep)
	}
	if err := rows.Err(); err != nil {
		internalErr(w, err)
		return
	}
	respond(w, http.StatusOK, reps)
}

func (h *Handler) DeleteRep(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())
	workoutID := chi.URLParam(r, "workoutID")
	setID := chi.URLParam(r, "setID")
	repID := chi.URLParam(r, "repID")

	if !h.ownsSet(w, r, setID, workoutID, userID) {
		return
	}

	result, err := h.db.Exec(r.Context(),
		`DELETE FROM reps WHERE id = $1 AND set_id = $2`,
		repID, setID,
	)
	if err != nil {
		internalErr(w, err)
		return
	}
	if result.RowsAffected() == 0 {
		respondErr(w, http.StatusNotFound, "rep not found")
		return
	}
	respond(w, http.StatusNoContent, nil)
}
