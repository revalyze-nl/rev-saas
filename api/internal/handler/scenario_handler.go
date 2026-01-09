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

// writeJSONScenario writes a JSON response - local helper for scenarios
func writeJSONScenario(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// ScenarioHandler handles scenario-related endpoints
type ScenarioHandler struct {
	scenarioService *service.ScenarioService
	limitsService   *service.LimitsService
}

// NewScenarioHandler creates a new scenario handler
func NewScenarioHandler(scenarioService *service.ScenarioService, limitsService *service.LimitsService) *ScenarioHandler {
	return &ScenarioHandler{
		scenarioService: scenarioService,
		limitsService:   limitsService,
	}
}

// GetScenarios handles GET /api/decisions/:id/scenarios
func (h *ScenarioHandler) GetScenarios(w http.ResponseWriter, r *http.Request) {
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

	scenarios, err := h.scenarioService.GetScenarios(r.Context(), decisionID, user.ID)
	if err != nil {
		log.Printf("[scenario-handler] get error: %v", err)
		writeJSONError(w, "failed to get scenarios", http.StatusInternalServerError)
		return
	}

	if scenarios == nil {
		writeJSONError(w, "no scenarios found for this decision. Generate scenarios first.", http.StatusNotFound)
		return
	}

	// Get decision to determine baseline and chosen scenario
	baselineID := "balanced"
	baselineName := "Balanced (Recommended)"
	chosenID := ""
	
	decision, err := h.scenarioService.GetDecision(r.Context(), decisionID, user.ID)
	if err == nil && decision != nil && decision.ChosenScenarioID != nil && *decision.ChosenScenarioID != "" {
		chosenID = *decision.ChosenScenarioID
		baselineID = chosenID
		// Find chosen scenario name
		for _, sc := range scenarios.Scenarios {
			if string(sc.ScenarioID) == chosenID {
				baselineName = sc.Title
				break
			}
		}
	}

	response := model.ScenarioSetResponse{
		ID:                   scenarios.ID,
		DecisionID:           scenarios.DecisionID,
		Version:              scenarios.Version,
		Scenarios:            scenarios.Scenarios,
		ModelMeta:            scenarios.ModelMeta,
		CreatedAt:            scenarios.CreatedAt,
		BaselineScenarioID:   baselineID,
		BaselineScenarioName: baselineName,
		ChosenScenarioID:     chosenID,
	}

	writeJSONScenario(w, response, http.StatusOK)
}

// GenerateScenarios handles POST /api/decisions/:id/scenarios/generate
func (h *ScenarioHandler) GenerateScenarios(w http.ResponseWriter, r *http.Request) {
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

	var req model.GenerateScenariosRequest
	if r.Body != nil && r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSONError(w, "invalid request body", http.StatusBadRequest)
			return
		}
	}

	// Check if scenarios already exist for this decision (idempotent behavior)
	// Only check limit if force=true or no existing scenarios
	existingScenarios, _ := h.scenarioService.GetScenarios(r.Context(), decisionID, user.ID)
	needsGeneration := existingScenarios == nil || req.Force

	// Check plan limit for scenarios only when actually generating new ones
	if needsGeneration && h.limitsService != nil {
		limitResult := h.limitsService.CanGenerateScenarios(r.Context(), user)
		if !limitResult.Allowed {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusPaymentRequired) // 402
			json.NewEncoder(w).Encode(map[string]interface{}{
				"code":    limitResult.ErrorCode,
				"message": limitResult.Reason,
				"limit":   limitResult.Limit,
				"used":    limitResult.Current,
				"plan":    limitResult.Plan,
			})
			return
		}
	}

	log.Printf("[scenario-handler] Generating scenarios for decision %s, force=%v", decisionID.Hex(), req.Force)

	scenarios, err := h.scenarioService.GenerateScenarios(r.Context(), decisionID, user.ID, req.Force)
	if err != nil {
		log.Printf("[scenario-handler] generate error: %v", err)
		writeJSONError(w, "failed to generate scenarios: "+err.Error(), http.StatusInternalServerError)
		return
	}

	response := model.ScenarioSetResponse{
		ID:         scenarios.ID,
		DecisionID: scenarios.DecisionID,
		Version:    scenarios.Version,
		Scenarios:  scenarios.Scenarios,
		ModelMeta:  scenarios.ModelMeta,
		CreatedAt:  scenarios.CreatedAt,
	}

	writeJSONScenario(w, response, http.StatusOK)
}

// SetChosenScenario handles PATCH /api/decisions/:id/chosen-scenario
func (h *ScenarioHandler) SetChosenScenario(w http.ResponseWriter, r *http.Request) {
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

	var req model.ChooseScenarioRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.ChosenScenarioID == "" {
		writeJSONError(w, "chosenScenarioId is required", http.StatusBadRequest)
		return
	}

	log.Printf("[scenario-handler] Setting chosen scenario %s for decision %s", req.ChosenScenarioID, decisionID.Hex())

	if err := h.scenarioService.SetChosenScenario(r.Context(), decisionID, user.ID, req.ChosenScenarioID); err != nil {
		log.Printf("[scenario-handler] set chosen error: %v", err)
		writeJSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	writeJSONScenario(w, map[string]interface{}{
		"success":          true,
		"chosenScenarioId": req.ChosenScenarioID,
	}, http.StatusOK)
}

