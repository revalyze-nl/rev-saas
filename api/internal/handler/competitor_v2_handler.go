package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"rev-saas-api/internal/middleware"
	"rev-saas-api/internal/model"
	"rev-saas-api/internal/service"
)

// CompetitorV2Handler handles competitor v2 API requests
type CompetitorV2Handler struct {
	service *service.CompetitorV2Service
}

// NewCompetitorV2Handler creates a new CompetitorV2Handler
func NewCompetitorV2Handler(svc *service.CompetitorV2Service) *CompetitorV2Handler {
	return &CompetitorV2Handler{service: svc}
}

// writeJSONV2 writes a JSON response - local helper
func writeJSONV2(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// Discover handles POST /api/v2/competitors/discover
func (h *CompetitorV2Handler) Discover(w http.ResponseWriter, r *http.Request) {
	var req model.CompetitorDiscoveryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WebsiteURL == "" {
		writeJSONError(w, "website_url is required", http.StatusBadRequest)
		return
	}

	result, err := h.service.DiscoverCompetitors(r.Context(), req.WebsiteURL)
	if err != nil {
		log.Printf("[competitor-v2-handler] discover error: %v", err)
		writeJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSONV2(w, result, http.StatusOK)
}

// Save handles POST /api/v2/competitors/save
func (h *CompetitorV2Handler) Save(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req model.SaveCompetitorsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if len(req.Competitors) == 0 {
		writeJSONError(w, "at least one competitor is required", http.StatusBadRequest)
		return
	}

	saved, err := h.service.SaveCompetitors(r.Context(), user.ID.Hex(), req.Competitors)
	if err != nil {
		log.Printf("[competitor-v2-handler] save error: %v", err)
		writeJSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	writeJSONV2(w, map[string]interface{}{
		"saved": saved,
		"count": len(saved),
	}, http.StatusOK)
}

// List handles GET /api/v2/competitors
func (h *CompetitorV2Handler) List(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	result, err := h.service.GetSavedCompetitors(r.Context(), user.ID.Hex())
	if err != nil {
		log.Printf("[competitor-v2-handler] list error: %v", err)
		writeJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSONV2(w, result, http.StatusOK)
}

// Delete handles DELETE /api/v2/competitors/{id}
func (h *CompetitorV2Handler) Delete(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	competitorID := vars["id"]
	if competitorID == "" {
		writeJSONError(w, "competitor ID is required", http.StatusBadRequest)
		return
	}

	if err := h.service.DeleteCompetitor(r.Context(), user.ID.Hex(), competitorID); err != nil {
		log.Printf("[competitor-v2-handler] delete error: %v", err)
		writeJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSONV2(w, map[string]string{"status": "deleted"}, http.StatusOK)
}

// ExtractPricing handles POST /api/v2/competitors/{id}/extract-pricing
func (h *CompetitorV2Handler) ExtractPricing(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	competitorID := vars["id"]
	if competitorID == "" {
		writeJSONError(w, "competitor ID is required", http.StatusBadRequest)
		return
	}

	pricing, err := h.service.ExtractPricing(r.Context(), user.ID.Hex(), competitorID)
	if err != nil {
		log.Printf("[competitor-v2-handler] extract pricing error: %v", err)
		writeJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSONV2(w, pricing, http.StatusOK)
}

// UpdatePricing handles PUT /api/v2/competitors/{id}/pricing
func (h *CompetitorV2Handler) UpdatePricing(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	competitorID := vars["id"]
	if competitorID == "" {
		writeJSONError(w, "competitor ID is required", http.StatusBadRequest)
		return
	}

	var req struct {
		Plans []model.CompetitorV2Plan `json:"plans"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.service.UpdatePricing(r.Context(), user.ID.Hex(), competitorID, req.Plans); err != nil {
		log.Printf("[competitor-v2-handler] update pricing error: %v", err)
		writeJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSONV2(w, map[string]string{"status": "updated"}, http.StatusOK)
}

// VerifyPricing handles POST /api/v2/competitors/{id}/verify-pricing
func (h *CompetitorV2Handler) VerifyPricing(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	competitorID := vars["id"]
	if competitorID == "" {
		writeJSONError(w, "competitor ID is required", http.StatusBadRequest)
		return
	}

	if err := h.service.VerifyPricing(r.Context(), user.ID.Hex(), competitorID); err != nil {
		log.Printf("[competitor-v2-handler] verify pricing error: %v", err)
		writeJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSONV2(w, map[string]string{"status": "verified"}, http.StatusOK)
}
