package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"rev-saas-api/internal/middleware"
	"rev-saas-api/internal/model"
	"rev-saas-api/internal/service"
)

// OutcomeHandler handles outcome-related endpoints
type OutcomeHandler struct {
	outcomeService *service.OutcomeService
}

// NewOutcomeHandler creates a new outcome handler
func NewOutcomeHandler(outcomeService *service.OutcomeService) *OutcomeHandler {
	return &OutcomeHandler{
		outcomeService: outcomeService,
	}
}

// ApplyScenario handles POST /api/v2/decisions/:id/scenarios/:scenarioId/apply
func (h *OutcomeHandler) ApplyScenario(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	decisionID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		writeJSONError(w, "invalid decision ID", http.StatusBadRequest)
		return
	}

	scenarioID := vars["scenarioId"]
	if scenarioID == "" {
		writeJSONError(w, "scenario ID is required", http.StatusBadRequest)
		return
	}

	log.Printf("[outcome-handler] Applying scenario %s to decision %s", scenarioID, decisionID.Hex())

	response, err := h.outcomeService.ApplyScenario(r.Context(), decisionID, user.ID, scenarioID)
	if err != nil {
		log.Printf("[outcome-handler] apply error: %v", err)
		writeJSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	writeJSONOutcome(w, response, http.StatusOK)
}

// GetOutcome handles GET /api/v2/decisions/:id/outcome
func (h *OutcomeHandler) GetOutcome(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	decisionID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		writeJSONError(w, "invalid decision ID", http.StatusBadRequest)
		return
	}

	outcome, err := h.outcomeService.GetOutcome(r.Context(), decisionID, user.ID)
	if err != nil {
		log.Printf("[outcome-handler] get error: %v", err)
		writeJSONError(w, "failed to get outcome", http.StatusInternalServerError)
		return
	}

	if outcome == nil {
		writeJSONError(w, "no outcome found - apply a scenario first", http.StatusNotFound)
		return
	}

	response := model.MeasurableOutcomeResponse{
		ID:               outcome.ID,
		VerdictID:        outcome.VerdictID,
		ChosenScenarioID: outcome.ChosenScenarioID,
		Status:           outcome.Status,
		HorizonDays:      outcome.HorizonDays,
		KPIs:             outcome.KPIs,
		EvidenceLinks:    outcome.EvidenceLinks,
		Summary:          outcome.Summary,
		Notes:            outcome.Notes,
		CreatedAt:        outcome.CreatedAt,
		UpdatedAt:        outcome.UpdatedAt,
	}

	writeJSONOutcome(w, response, http.StatusOK)
}

// UpdateOutcome handles PATCH /api/v2/decisions/:id/outcome
func (h *OutcomeHandler) UpdateOutcome(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	decisionID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		writeJSONError(w, "invalid decision ID", http.StatusBadRequest)
		return
	}

	var req model.UpdateMeasurableOutcomeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("[outcome-handler] Updating outcome for decision %s", decisionID.Hex())

	outcome, err := h.outcomeService.UpdateOutcome(r.Context(), decisionID, user.ID, &req)
	if err != nil {
		log.Printf("[outcome-handler] update error: %v", err)
		writeJSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	response := model.MeasurableOutcomeResponse{
		ID:               outcome.ID,
		VerdictID:        outcome.VerdictID,
		ChosenScenarioID: outcome.ChosenScenarioID,
		Status:           outcome.Status,
		HorizonDays:      outcome.HorizonDays,
		KPIs:             outcome.KPIs,
		EvidenceLinks:    outcome.EvidenceLinks,
		Summary:          outcome.Summary,
		Notes:            outcome.Notes,
		CreatedAt:        outcome.CreatedAt,
		UpdatedAt:        outcome.UpdatedAt,
	}

	writeJSONOutcome(w, response, http.StatusOK)
}

// UpdateKPIActual handles PATCH /api/v2/decisions/:id/outcome/kpi/:kpiKey
func (h *OutcomeHandler) UpdateKPIActual(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	decisionID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		writeJSONError(w, "invalid decision ID", http.StatusBadRequest)
		return
	}

	kpiKey := vars["kpiKey"]
	if kpiKey == "" {
		writeJSONError(w, "KPI key is required", http.StatusBadRequest)
		return
	}

	var req struct {
		Actual float64 `json:"actual"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("[outcome-handler] Updating KPI %s actual to %.2f for decision %s", kpiKey, req.Actual, decisionID.Hex())

	outcome, err := h.outcomeService.UpdateKPIActual(r.Context(), decisionID, user.ID, kpiKey, req.Actual)
	if err != nil {
		log.Printf("[outcome-handler] update KPI error: %v", err)
		writeJSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	response := model.MeasurableOutcomeResponse{
		ID:               outcome.ID,
		VerdictID:        outcome.VerdictID,
		ChosenScenarioID: outcome.ChosenScenarioID,
		Status:           outcome.Status,
		HorizonDays:      outcome.HorizonDays,
		KPIs:             outcome.KPIs,
		EvidenceLinks:    outcome.EvidenceLinks,
		Summary:          outcome.Summary,
		Notes:            outcome.Notes,
		CreatedAt:        outcome.CreatedAt,
		UpdatedAt:        outcome.UpdatedAt,
	}

	writeJSONOutcome(w, response, http.StatusOK)
}

// UpdateOutcomeStatus handles PATCH /api/v2/decisions/:id/outcome/status
func (h *OutcomeHandler) UpdateOutcomeStatus(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	decisionID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		writeJSONError(w, "invalid decision ID", http.StatusBadRequest)
		return
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Status == "" {
		writeJSONError(w, "status is required", http.StatusBadRequest)
		return
	}

	log.Printf("[outcome-handler] Updating outcome status to %s for decision %s", req.Status, decisionID.Hex())

	outcome, err := h.outcomeService.UpdateOutcomeStatus(r.Context(), decisionID, user.ID, req.Status)
	if err != nil {
		log.Printf("[outcome-handler] update status error: %v", err)
		writeJSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	response := model.MeasurableOutcomeResponse{
		ID:               outcome.ID,
		VerdictID:        outcome.VerdictID,
		ChosenScenarioID: outcome.ChosenScenarioID,
		Status:           outcome.Status,
		HorizonDays:      outcome.HorizonDays,
		KPIs:             outcome.KPIs,
		EvidenceLinks:    outcome.EvidenceLinks,
		Summary:          outcome.Summary,
		Notes:            outcome.Notes,
		CreatedAt:        outcome.CreatedAt,
		UpdatedAt:        outcome.UpdatedAt,
	}

	writeJSONOutcome(w, response, http.StatusOK)
}

// GetDelta handles GET /api/v2/decisions/:id/deltas
func (h *OutcomeHandler) GetDelta(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	decisionID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		writeJSONError(w, "invalid decision ID", http.StatusBadRequest)
		return
	}

	baselineID := r.URL.Query().Get("baselineScenarioId")
	candidateID := r.URL.Query().Get("candidateScenarioId")

	// If only candidate is provided, compute delta vs chosen/balanced
	if candidateID != "" && baselineID == "" {
		delta, err := h.outcomeService.GetDeltaForInspect(r.Context(), decisionID, user.ID, candidateID)
		if err != nil {
			log.Printf("[outcome-handler] delta error: %v", err)
			writeJSONError(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSONOutcome(w, delta, http.StatusOK)
		return
	}

	if baselineID == "" || candidateID == "" {
		writeJSONError(w, "baselineScenarioId and candidateScenarioId are required", http.StatusBadRequest)
		return
	}

	delta, err := h.outcomeService.ComputeDelta(r.Context(), decisionID, user.ID, baselineID, candidateID)
	if err != nil {
		log.Printf("[outcome-handler] delta error: %v", err)
		writeJSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	writeJSONOutcome(w, delta, http.StatusOK)
}

// writeJSONOutcome writes a JSON response
func writeJSONOutcome(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

