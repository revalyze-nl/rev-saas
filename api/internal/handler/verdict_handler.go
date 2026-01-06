package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"rev-saas-api/internal/model"
	"rev-saas-api/internal/service"
)

// VerdictHandler handles verdict-related HTTP requests
type VerdictHandler struct {
	verdictService *service.VerdictService
}

// NewVerdictHandler creates a new VerdictHandler
func NewVerdictHandler(verdictService *service.VerdictService) *VerdictHandler {
	return &VerdictHandler{
		verdictService: verdictService,
	}
}

// GenerateVerdict handles POST /api/verdict
func (h *VerdictHandler) GenerateVerdict(w http.ResponseWriter, r *http.Request) {
	// Parse request body
	var req model.VerdictRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[verdict-handler] Invalid request body: %v", err)
		http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Validate website URL
	if req.WebsiteURL == "" {
		http.Error(w, `{"error": "websiteUrl is required"}`, http.StatusBadRequest)
		return
	}

	log.Printf("[verdict-handler] Generating verdict for: %s", req.WebsiteURL)

	// Generate verdict
	verdict, err := h.verdictService.GenerateVerdict(r.Context(), req.WebsiteURL)
	if err != nil {
		log.Printf("[verdict-handler] Failed to generate verdict: %v", err)
		http.Error(w, `{"error": "Failed to generate verdict"}`, http.StatusInternalServerError)
		return
	}

	// Return response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(verdict); err != nil {
		log.Printf("[verdict-handler] Failed to encode response: %v", err)
		http.Error(w, `{"error": "Failed to encode response"}`, http.StatusInternalServerError)
		return
	}
}
