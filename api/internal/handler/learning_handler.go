package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"rev-saas-api/internal/middleware"
	"rev-saas-api/internal/service"
)

// LearningHandler handles learning-related endpoints
type LearningHandler struct {
	learningService *service.LearningService
}

// NewLearningHandler creates a new learning handler
func NewLearningHandler(learningService *service.LearningService) *LearningHandler {
	return &LearningHandler{
		learningService: learningService,
	}
}

// GetLearningIndicators handles GET /api/v2/learning/indicators
func (h *LearningHandler) GetLearningIndicators(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	companyStage := r.URL.Query().Get("companyStage")
	primaryKPI := r.URL.Query().Get("primaryKpi")

	if companyStage == "" && primaryKPI == "" {
		writeJSONError(w, "at least one of companyStage or primaryKpi is required", http.StatusBadRequest)
		return
	}

	indicators, err := h.learningService.GetLearningIndicators(r.Context(), companyStage, primaryKPI)
	if err != nil {
		log.Printf("[learning-handler] get indicators error: %v", err)
		writeJSONError(w, "failed to get learning indicators", http.StatusInternalServerError)
		return
	}

	writeJSONLearning(w, indicators, http.StatusOK)
}

// RefreshInsights handles POST /api/v2/learning/refresh (admin only)
func (h *LearningHandler) RefreshInsights(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Check if user is admin
	if user.Role != "admin" {
		writeJSONError(w, "admin access required", http.StatusForbidden)
		return
	}

	log.Println("[learning-handler] Refreshing insights (admin request)")

	if err := h.learningService.RefreshInsights(r.Context()); err != nil {
		log.Printf("[learning-handler] refresh error: %v", err)
		writeJSONError(w, "failed to refresh insights", http.StatusInternalServerError)
		return
	}

	writeJSONLearning(w, map[string]string{"status": "ok", "message": "Insights refreshed successfully"}, http.StatusOK)
}

// writeJSONLearning writes a JSON response
func writeJSONLearning(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

