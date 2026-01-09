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
}

// NewScenarioHandler creates a new scenario handler
func NewScenarioHandler(scenarioService *service.ScenarioService) *ScenarioHandler {
	return &ScenarioHandler{
		scenarioService: scenarioService,
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

