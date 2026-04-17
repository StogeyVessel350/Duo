// DUO API service — modular monolith.
// See docs/phase_3_backend_architecture.md for module boundaries.
package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	// TODO: mount module routes
	//   auth.Mount(r, deps)
	//   device.Mount(r, deps)
	//   workout.Mount(r, deps)
	//   occupancy.Mount(r, deps)
	//   queue.Mount(r, deps)
	//   facility.Mount(r, deps)
	//   ota.Mount(r, deps)
	//   telemetry.Mount(r, deps)

	addr := ":8080"
	if v := os.Getenv("PORT"); v != "" {
		addr = ":" + v
	}
	slog.Info("starting api", "addr", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		slog.Error("server crashed", "err", err)
		os.Exit(1)
	}
}
