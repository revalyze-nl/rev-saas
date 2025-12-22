package handler

import (
	"encoding/json"
	"net/http"

	"rev-saas-api/internal/middleware"
	"rev-saas-api/internal/model"
	"rev-saas-api/internal/service"
)

// AnalysisHandler handles HTTP requests for pricing analysis.
type AnalysisHandler struct {
	service          *service.AnalysisService
	limitsService    *service.LimitsService
	aiPricingService *service.AIPricingService
	aiCreditsService *service.AICreditsService
}

// NewAnalysisHandler creates a new AnalysisHandler.
func NewAnalysisHandler(service *service.AnalysisService, limitsService *service.LimitsService, aiPricingService *service.AIPricingService, aiCreditsService *service.AICreditsService) *AnalysisHandler {
	return &AnalysisHandler{
		service:          service,
		limitsService:    limitsService,
		aiPricingService: aiPricingService,
		aiCreditsService: aiCreditsService,
	}
}

// RunAnalysis handles POST /api/analysis/run - runs a new pricing analysis.
func (h *AnalysisHandler) RunAnalysis(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	if userID == "" {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Get user for limit checking
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	planType := user.GetEffectivePlan()

	// Check AI credits before running analysis
	if h.aiCreditsService != nil {
		err := h.aiCreditsService.ConsumeCredit(r.Context(), userID, planType)
		if err != nil {
			if err == service.ErrAIQuotaExceeded {
				WriteAIQuotaExceededError(w)
				return
			}
			writeJSONError(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// Run the rule-based analysis
	analysis, aiInput, err := h.service.RunAnalysisWithInput(r.Context(), userID)
	if err != nil {
		writeJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Run AI analysis for paid plans (non-blocking, graceful fallback)
	if h.aiPricingService != nil && h.aiPricingService.ShouldRunAI(planType) {
		aiInput.RuleBasedResult = analysis
		aiReport, err := h.aiPricingService.GenerateAIPricingReport(r.Context(), user, *aiInput)
		if err == nil && aiReport != nil {
			// Update analysis with AI insights
			analysis.AISummary = aiReport.Summary
			analysis.AIScenarios = aiReport.Scenarios

			// Persist updated analysis
			_ = h.service.UpdateAnalysis(r.Context(), analysis)
		}
		// If AI fails, we just skip it - no error returned
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(analysis)
}

// List handles GET /api/analysis - lists all analyses for the current user.
func (h *AnalysisHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	if userID == "" {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	analyses, err := h.service.ListAnalyses(r.Context(), userID)
	if err != nil {
		writeJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Ensure an empty array is returned instead of null
	if analyses == nil {
		analyses = []*model.Analysis{}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(analyses)
}

