package handler

import (
	"encoding/json"
	"log"
	"net/http"
)

func respond(w http.ResponseWriter, status int, body interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if body != nil {
		if err := json.NewEncoder(w).Encode(body); err != nil {
			log.Printf("respond encode: %v", err)
		}
	}
}

func respondErr(w http.ResponseWriter, status int, msg string) {
	respond(w, status, map[string]string{"error": msg})
}

func internalErr(w http.ResponseWriter, err error) {
	log.Printf("internal error: %v", err)
	respondErr(w, http.StatusInternalServerError, "internal server error")
}
