package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type exerciseRequest struct {
	Name               string  `json:"name"`
	PrimaryMuscleGroup *string `json:"primary_muscle_group"`
	MovementPattern    *string `json:"movement_pattern"`
	IsBilateral        bool    `json:"is_bilateral"`
}

type exerciseResponse struct {
	ID                 string    `json:"id"`
	Name               string    `json:"name"`
	PrimaryMuscleGroup *string   `json:"primary_muscle_group"`
	MovementPattern    *string   `json:"movement_pattern"`
	IsBilateral        bool      `json:"is_bilateral"`
	CreatedAt          time.Time `json:"created_at"`
}

func scanExercise(row scanner) (exerciseResponse, error) {
	var e exerciseResponse
	err := row.Scan(&e.ID, &e.Name, &e.PrimaryMuscleGroup, &e.MovementPattern, &e.IsBilateral, &e.CreatedAt)
	return e, err
}

const exerciseCols = `id, name, primary_muscle_group, movement_pattern, is_bilateral, created_at`

func (h *Handler) ListExercises(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(r.Context(),
		`SELECT `+exerciseCols+` FROM exercises ORDER BY name`,
	)
	if err != nil {
		internalErr(w, err)
		return
	}
	defer rows.Close()

	exercises := make([]exerciseResponse, 0)
	for rows.Next() {
		e, err := scanExercise(rows)
		if err != nil {
			internalErr(w, err)
			return
		}
		exercises = append(exercises, e)
	}
	if err := rows.Err(); err != nil {
		internalErr(w, err)
		return
	}
	respond(w, http.StatusOK, exercises)
}

func (h *Handler) CreateExercise(w http.ResponseWriter, r *http.Request) {
	var req exerciseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondErr(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.Name == "" {
		respondErr(w, http.StatusBadRequest, "name required")
		return
	}

	e, err := scanExercise(h.db.QueryRow(r.Context(),
		`INSERT INTO exercises (name, primary_muscle_group, movement_pattern, is_bilateral)
		 VALUES ($1, $2, $3, $4)
		 RETURNING `+exerciseCols,
		req.Name, req.PrimaryMuscleGroup, req.MovementPattern, req.IsBilateral,
	))
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			respondErr(w, http.StatusConflict, "exercise name already exists")
			return
		}
		internalErr(w, err)
		return
	}
	respond(w, http.StatusCreated, e)
}

func (h *Handler) GetExercise(w http.ResponseWriter, r *http.Request) {
	exerciseID := chi.URLParam(r, "exerciseID")

	e, err := scanExercise(h.db.QueryRow(r.Context(),
		`SELECT `+exerciseCols+` FROM exercises WHERE id = $1`,
		exerciseID,
	))
	if err == pgx.ErrNoRows {
		respondErr(w, http.StatusNotFound, "exercise not found")
		return
	}
	if err != nil {
		internalErr(w, err)
		return
	}
	respond(w, http.StatusOK, e)
}

func (h *Handler) UpdateExercise(w http.ResponseWriter, r *http.Request) {
	exerciseID := chi.URLParam(r, "exerciseID")

	var req exerciseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondErr(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	e, err := scanExercise(h.db.QueryRow(r.Context(),
		`UPDATE exercises SET name = $2, primary_muscle_group = $3, movement_pattern = $4, is_bilateral = $5
		 WHERE id = $1
		 RETURNING `+exerciseCols,
		exerciseID, req.Name, req.PrimaryMuscleGroup, req.MovementPattern, req.IsBilateral,
	))
	if err == pgx.ErrNoRows {
		respondErr(w, http.StatusNotFound, "exercise not found")
		return
	}
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			respondErr(w, http.StatusConflict, "exercise name already exists")
			return
		}
		internalErr(w, err)
		return
	}
	respond(w, http.StatusOK, e)
}

func (h *Handler) DeleteExercise(w http.ResponseWriter, r *http.Request) {
	exerciseID := chi.URLParam(r, "exerciseID")

	result, err := h.db.Exec(r.Context(),
		`DELETE FROM exercises WHERE id = $1`,
		exerciseID,
	)
	if err != nil {
		internalErr(w, err)
		return
	}
	if result.RowsAffected() == 0 {
		respondErr(w, http.StatusNotFound, "exercise not found")
		return
	}
	respond(w, http.StatusNoContent, nil)
}
