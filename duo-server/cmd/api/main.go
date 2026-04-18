package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"

	"duo-server/internal/handler"
	"duo-server/internal/middleware"
	"duo-server/migrations"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL not set")
	}
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET not set")
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatalf("pgxpool.New: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("db ping: %v", err)
	}
	log.Println("database connected")

	if err := migrations.Run(ctx, pool); err != nil {
		log.Fatalf("migrations: %v", err)
	}
	log.Println("migrations ok")

	h := handler.New(pool, jwtSecret)
	mw := middleware.New(jwtSecret)

	r := chi.NewRouter()
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.RealIP)

	r.Get("/health", h.Health)

	r.Post("/auth/register", h.Register)
	r.Post("/auth/login", h.Login)
	r.Post("/auth/refresh", h.Refresh)

	r.Group(func(r chi.Router) {
		r.Use(mw.RequireAuth)

		r.Delete("/auth/logout", h.Logout)
		r.Get("/me", h.GetMe)
		r.Get("/me/profile", h.GetProfile)
		r.Put("/me/profile", h.UpsertProfile)

		r.Get("/exercises", h.ListExercises)
		r.Post("/exercises", h.CreateExercise)
		r.Get("/exercises/{exerciseID}", h.GetExercise)
		r.Patch("/exercises/{exerciseID}", h.UpdateExercise)
		r.Delete("/exercises/{exerciseID}", h.DeleteExercise)

		r.Post("/workouts", h.CreateWorkout)
		r.Get("/workouts", h.ListWorkouts)
		r.Get("/workouts/{workoutID}", h.GetWorkout)
		r.Patch("/workouts/{workoutID}", h.UpdateWorkout)
		r.Delete("/workouts/{workoutID}", h.DeleteWorkout)

		r.Post("/workouts/{workoutID}/sets", h.CreateSet)
		r.Get("/workouts/{workoutID}/sets", h.ListSets)
		r.Get("/workouts/{workoutID}/sets/{setID}", h.GetSet)
		r.Patch("/workouts/{workoutID}/sets/{setID}", h.UpdateSet)
		r.Delete("/workouts/{workoutID}/sets/{setID}", h.DeleteSet)

		r.Post("/workouts/{workoutID}/sets/{setID}/reps", h.CreateRep)
		r.Get("/workouts/{workoutID}/sets/{setID}/reps", h.ListReps)
		r.Delete("/workouts/{workoutID}/sets/{setID}/reps/{repID}", h.DeleteRep)
	})

	log.Printf("listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
