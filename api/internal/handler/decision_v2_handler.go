package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"rev-saas-api/internal/middleware"
	"rev-saas-api/internal/model"
	mongorepo "rev-saas-api/internal/repository/mongo"
	"rev-saas-api/internal/service"
)

// writeJSONDV2 writes a JSON response - local helper for decision v2
func writeJSONDV2(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// DecisionV2Handler handles decision v2 API requests
type DecisionV2Handler struct {
	service *service.DecisionV2Service
}

// NewDecisionV2Handler creates a new handler
func NewDecisionV2Handler(svc *service.DecisionV2Service) *DecisionV2Handler {
	return &DecisionV2Handler{service: svc}
}

// Create handles POST /api/v2/decisions
func (h *DecisionV2Handler) Create(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req service.CreateDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.WebsiteURL == "" {
		writeJSONError(w, "websiteUrl is required", http.StatusBadRequest)
		return
	}

	decision, err := h.service.CreateDecision(r.Context(), user.ID, req)
	if err != nil {
		log.Printf("[decision-v2-handler] create error: %v", err)
		writeJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSONDV2(w, decision, http.StatusCreated)
}

// Get handles GET /api/v2/decisions/{id}
func (h *DecisionV2Handler) Get(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	id, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		writeJSONError(w, "invalid decision ID", http.StatusBadRequest)
		return
	}

	decision, err := h.service.GetDecision(r.Context(), id, user.ID)
	if err != nil {
		log.Printf("[decision-v2-handler] get error: %v", err)
		writeJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if decision == nil {
		writeJSONError(w, "decision not found", http.StatusNotFound)
		return
	}

	writeJSONDV2(w, decision, http.StatusOK)
}

// List handles GET /api/v2/decisions
func (h *DecisionV2Handler) List(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse query parameters
	params := mongorepo.DecisionV2ListParams{
		Status:  r.URL.Query().Get("status"),
		Segment: r.URL.Query().Get("segment"),
		KPI:     r.URL.Query().Get("kpi"),
		Search:  r.URL.Query().Get("search"),
	}

	if minConf := r.URL.Query().Get("minConfidence"); minConf != "" {
		if val, err := strconv.ParseFloat(minConf, 64); err == nil {
			params.MinConfidence = val
		}
	}

	if page := r.URL.Query().Get("page"); page != "" {
		if val, err := strconv.Atoi(page); err == nil {
			params.Page = val
		}
	}

	if pageSize := r.URL.Query().Get("pageSize"); pageSize != "" {
		if val, err := strconv.Atoi(pageSize); err == nil {
			params.PageSize = val
		}
	}

	if from := r.URL.Query().Get("from"); from != "" {
		if t, err := time.Parse(time.RFC3339, from); err == nil {
			params.From = &t
		}
	}

	if to := r.URL.Query().Get("to"); to != "" {
		if t, err := time.Parse(time.RFC3339, to); err == nil {
			params.To = &t
		}
	}

	result, err := h.service.ListDecisions(r.Context(), user.ID, params)
	if err != nil {
		log.Printf("[decision-v2-handler] list error: %v", err)
		writeJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSONDV2(w, result, http.StatusOK)
}

// UpdateContext handles PUT /api/v2/decisions/{id}/context
func (h *DecisionV2Handler) UpdateContext(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	id, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		writeJSONError(w, "invalid decision ID", http.StatusBadRequest)
		return
	}

	var req service.UpdateContextRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	decision, err := h.service.UpdateContext(r.Context(), id, user.ID, req)
	if err != nil {
		log.Printf("[decision-v2-handler] update context error: %v", err)
		if strings.Contains(err.Error(), "not found") {
			writeJSONError(w, err.Error(), http.StatusNotFound)
			return
		}
		writeJSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	writeJSONDV2(w, decision, http.StatusOK)
}

// RegenerateVerdict handles POST /api/v2/decisions/{id}/regenerate
func (h *DecisionV2Handler) RegenerateVerdict(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	id, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		writeJSONError(w, "invalid decision ID", http.StatusBadRequest)
		return
	}

	var req model.RegenerateVerdictRequestV2
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	decision, err := h.service.RegenerateVerdict(r.Context(), id, user.ID, req.Reason)
	if err != nil {
		log.Printf("[decision-v2-handler] regenerate verdict error: %v", err)
		if strings.Contains(err.Error(), "not found") {
			writeJSONError(w, err.Error(), http.StatusNotFound)
			return
		}
		writeJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSONDV2(w, decision, http.StatusOK)
}

// UpdateStatus handles PUT /api/v2/decisions/{id}/status
func (h *DecisionV2Handler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	id, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		writeJSONError(w, "invalid decision ID", http.StatusBadRequest)
		return
	}

	var req service.UpdateStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Status == "" {
		writeJSONError(w, "status is required", http.StatusBadRequest)
		return
	}

	decision, err := h.service.UpdateStatus(r.Context(), id, user.ID, req)
	if err != nil {
		log.Printf("[decision-v2-handler] update status error: %v", err)
		if strings.Contains(err.Error(), "not found") {
			writeJSONError(w, err.Error(), http.StatusNotFound)
			return
		}
		if strings.Contains(err.Error(), "invalid status transition") {
			writeJSONError(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSONDV2(w, decision, http.StatusOK)
}

// AddOutcome handles POST /api/v2/decisions/{id}/outcomes
func (h *DecisionV2Handler) AddOutcome(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	id, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		writeJSONError(w, "invalid decision ID", http.StatusBadRequest)
		return
	}

	var req service.AddOutcomeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.OutcomeType == "" {
		writeJSONError(w, "outcomeType is required", http.StatusBadRequest)
		return
	}

	if req.TimeframeDays <= 0 {
		writeJSONError(w, "timeframeDays must be positive", http.StatusBadRequest)
		return
	}

	decision, err := h.service.AddOutcome(r.Context(), id, user.ID, req)
	if err != nil {
		log.Printf("[decision-v2-handler] add outcome error: %v", err)
		if strings.Contains(err.Error(), "not found") {
			writeJSONError(w, err.Error(), http.StatusNotFound)
			return
		}
		writeJSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	writeJSONDV2(w, decision, http.StatusOK)
}

// GetEffectiveOutcomes handles GET /api/v2/decisions/{id}/outcomes/effective
func (h *DecisionV2Handler) GetEffectiveOutcomes(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	id, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		writeJSONError(w, "invalid decision ID", http.StatusBadRequest)
		return
	}

	outcomes, err := h.service.GetEffectiveOutcomes(r.Context(), id, user.ID)
	if err != nil {
		log.Printf("[decision-v2-handler] get effective outcomes error: %v", err)
		if strings.Contains(err.Error(), "not found") {
			writeJSONError(w, err.Error(), http.StatusNotFound)
			return
		}
		writeJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSONDV2(w, map[string]interface{}{
		"outcomes": outcomes,
		"count":    len(outcomes),
	}, http.StatusOK)
}

// Delete handles DELETE /api/v2/decisions/{id}
func (h *DecisionV2Handler) Delete(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	id, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		writeJSONError(w, "invalid decision ID", http.StatusBadRequest)
		return
	}

	err = h.service.DeleteDecision(r.Context(), id, user.ID)
	if err != nil {
		log.Printf("[decision-v2-handler] delete error: %v", err)
		if strings.Contains(err.Error(), "not found") {
			writeJSONError(w, err.Error(), http.StatusNotFound)
			return
		}
		writeJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSONDV2(w, map[string]string{"status": "deleted"}, http.StatusOK)
}

// Compare handles POST /api/v2/decisions/compare
func (h *DecisionV2Handler) Compare(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if len(req.IDs) < 2 || len(req.IDs) > 3 {
		writeJSONError(w, "must provide 2-3 decision IDs", http.StatusBadRequest)
		return
	}

	// Parse IDs
	ids := make([]primitive.ObjectID, len(req.IDs))
	for i, idStr := range req.IDs {
		id, err := primitive.ObjectIDFromHex(idStr)
		if err != nil {
			writeJSONError(w, "invalid decision ID: "+idStr, http.StatusBadRequest)
			return
		}
		ids[i] = id
	}

	decisions, err := h.service.GetMultipleDecisions(r.Context(), user.ID, ids)
	if err != nil {
		log.Printf("[decision-v2-handler] compare error: %v", err)
		writeJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Transform to compare response
	items := make([]model.DecisionCompareItemV2, len(decisions))
	for i, d := range decisions {
		var latestOutcome *model.OutcomeV2
		if len(d.Outcomes) > 0 {
			latestOutcome = service.GetLatestEffectiveOutcome(d.Outcomes)
		}

		items[i] = model.DecisionCompareItemV2{
			ID:              d.ID,
			CompanyName:     d.CompanyName,
			WebsiteURL:      d.WebsiteURL,
			VerdictHeadline: d.Verdict.Headline,
			VerdictSummary:  d.Verdict.Summary,
			ConfidenceScore: d.Verdict.ConfidenceScore,
			ConfidenceLabel: d.Verdict.ConfidenceLabel,
			RiskScore:       d.Verdict.WhatToExpect.RiskScore,
			RiskLabel:       d.Verdict.WhatToExpect.RiskLabel,
			Status:          d.Status,
			Context:         d.Context,
			ExpectedImpact:  d.ExpectedImpact,
			LatestOutcome:   latestOutcome,
			VerdictJSON:     d.Verdict,
			CreatedAt:       d.CreatedAt,
		}
	}

	writeJSONDV2(w, model.CompareDecisionsResponseV2{Decisions: items}, http.StatusOK)
}
