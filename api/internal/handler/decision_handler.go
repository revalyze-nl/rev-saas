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
)

// DecisionHandler handles pricing decision HTTP requests.
type DecisionHandler struct {
	repo *mongorepo.DecisionRepository
}

// NewDecisionHandler creates a new DecisionHandler.
func NewDecisionHandler(repo *mongorepo.DecisionRepository) *DecisionHandler {
	return &DecisionHandler{repo: repo}
}

// Create handles POST /api/decisions
// Request: CreateDecisionRequest
// Response: PricingDecision
func (h *DecisionHandler) Create(w http.ResponseWriter, r *http.Request) {
	userIDStr := middleware.UserIDFromContext(r.Context())
	if userIDStr == "" {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		jsonError(w, "invalid user ID", http.StatusUnauthorized)
		return
	}

	var req model.CreateDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[decision-handler] Invalid request body: %v", err)
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.CompanyName == "" {
		jsonError(w, "companyName is required", http.StatusBadRequest)
		return
	}
	if req.VerdictHeadline == "" {
		jsonError(w, "verdictHeadline is required", http.StatusBadRequest)
		return
	}

	// Validate enums
	if req.DecisionType != "" && !isValidDecisionType(req.DecisionType) {
		jsonError(w, "invalid decisionType", http.StatusBadRequest)
		return
	}
	if req.ConfidenceLevel != "" && !isValidConfidenceLevel(req.ConfidenceLevel) {
		jsonError(w, "invalid confidenceLevel", http.StatusBadRequest)
		return
	}
	if req.RiskLevel != "" && !isValidRiskLevel(req.RiskLevel) {
		jsonError(w, "invalid riskLevel", http.StatusBadRequest)
		return
	}

	decision := &model.PricingDecision{
		UserID:          userID,
		CompanyName:     req.CompanyName,
		WebsiteURL:      req.WebsiteURL,
		VerdictHeadline: req.VerdictHeadline,
		VerdictSummary:  req.VerdictSummary,
		DecisionType:    req.DecisionType,
		ConfidenceLevel: req.ConfidenceLevel,
		RiskLevel:       req.RiskLevel,
		ExpectedImpact:  req.ExpectedImpact,
		Context:         req.Context,
		Tags:            req.Tags,
		VerdictJSON:     req.VerdictJSON,
		ModelMeta:       req.ModelMeta,
		Status:          model.StatusProposed,
	}

	if err := h.repo.Create(r.Context(), decision); err != nil {
		log.Printf("[decision-handler] Failed to create decision: %v", err)
		jsonError(w, "failed to create decision", http.StatusInternalServerError)
		return
	}

	log.Printf("[decision-handler] Created decision %s for user %s", decision.ID.Hex(), userID.Hex())
	jsonResponse(w, decision, http.StatusCreated)
}

// List handles GET /api/decisions
// Query params: q, status, decisionType, confidence, risk, from, to, page, pageSize, sort
// Response: DecisionListResponse
func (h *DecisionHandler) List(w http.ResponseWriter, r *http.Request) {
	userIDStr := middleware.UserIDFromContext(r.Context())
	if userIDStr == "" {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		jsonError(w, "invalid user ID", http.StatusUnauthorized)
		return
	}

	q := r.URL.Query()
	filters := model.DecisionListFilters{
		Query:        q.Get("q"),
		Status:       model.DecisionStatus(q.Get("status")),
		DecisionType: model.DecisionType(q.Get("decisionType")),
		Confidence:   model.ConfidenceLevel(q.Get("confidence")),
		Risk:         model.RiskLevel(q.Get("risk")),
	}

	// Parse dates
	if from := q.Get("from"); from != "" {
		if t, err := time.Parse("2006-01-02", from); err == nil {
			filters.FromDate = &t
		}
	}
	if to := q.Get("to"); to != "" {
		if t, err := time.Parse("2006-01-02", to); err == nil {
			endOfDay := t.Add(24*time.Hour - time.Second)
			filters.ToDate = &endOfDay
		}
	}

	// Parse pagination
	if page, err := strconv.Atoi(q.Get("page")); err == nil {
		filters.Page = page
	}
	if pageSize, err := strconv.Atoi(q.Get("pageSize")); err == nil {
		filters.PageSize = pageSize
	}

	// Parse sort
	if sort := q.Get("sort"); sort != "" {
		filters.SortBy = sort
		if q.Get("order") == "asc" {
			filters.SortOrder = 1
		} else {
			filters.SortOrder = -1
		}
	}

	result, err := h.repo.List(r.Context(), userID, filters)
	if err != nil {
		log.Printf("[decision-handler] Failed to list decisions: %v", err)
		jsonError(w, "failed to list decisions", http.StatusInternalServerError)
		return
	}

	if result.Decisions == nil {
		result.Decisions = []*model.DecisionListItem{}
	}

	jsonResponse(w, result, http.StatusOK)
}

// Get handles GET /api/decisions/{id}
// Response: DecisionDetailResponse (decision with outcomes and status events)
func (h *DecisionHandler) Get(w http.ResponseWriter, r *http.Request) {
	userIDStr := middleware.UserIDFromContext(r.Context())
	if userIDStr == "" {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		jsonError(w, "invalid user ID", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	id, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		jsonError(w, "invalid decision ID", http.StatusBadRequest)
		return
	}

	decision, err := h.repo.GetByIDAndUser(r.Context(), id, userID)
	if err != nil {
		log.Printf("[decision-handler] Failed to get decision: %v", err)
		jsonError(w, "failed to get decision", http.StatusInternalServerError)
		return
	}
	if decision == nil {
		jsonError(w, "decision not found", http.StatusNotFound)
		return
	}

	// Fetch outcomes for this decision
	outcomes, err := h.repo.ListOutcomes(r.Context(), id)
	if err != nil {
		log.Printf("[decision-handler] Failed to list outcomes: %v", err)
		outcomes = []*model.DecisionOutcome{}
	}
	if outcomes == nil {
		outcomes = []*model.DecisionOutcome{}
	}

	response := &model.DecisionDetailResponse{
		PricingDecision: decision,
		Outcomes:        outcomes,
	}

	jsonResponse(w, response, http.StatusOK)
}

// UpdateStatus handles PATCH /api/decisions/{id}/status
// Request: { "status": "implemented", "reason": "...", "implementedAt": "...", "rollbackAt": "..." }
// Response: DecisionDetailResponse
func (h *DecisionHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	userIDStr := middleware.UserIDFromContext(r.Context())
	if userIDStr == "" {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		jsonError(w, "invalid user ID", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	id, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		jsonError(w, "invalid decision ID", http.StatusBadRequest)
		return
	}

	var req model.UpdateStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if !isValidStatus(req.Status) {
		jsonError(w, "invalid status value", http.StatusBadRequest)
		return
	}

	// Validate reason is required for rejected and rolled_back
	if req.Status == model.StatusRejected && req.Reason == "" {
		jsonError(w, "reason is required when rejecting a decision", http.StatusBadRequest)
		return
	}
	if req.Status == model.StatusRolledBack && req.Reason == "" {
		jsonError(w, "reason is required when rolling back a decision", http.StatusBadRequest)
		return
	}

	if err := h.repo.UpdateStatusWithEvent(r.Context(), id, userID, req); err != nil {
		log.Printf("[decision-handler] Failed to update status: %v", err)
		jsonError(w, "failed to update status", http.StatusInternalServerError)
		return
	}

	// Return updated decision with outcomes
	decision, _ := h.repo.GetByIDAndUser(r.Context(), id, userID)
	outcomes, _ := h.repo.ListOutcomes(r.Context(), id)
	if outcomes == nil {
		outcomes = []*model.DecisionOutcome{}
	}

	response := &model.DecisionDetailResponse{
		PricingDecision: decision,
		Outcomes:        outcomes,
	}
	jsonResponse(w, response, http.StatusOK)
}

// CreateOutcome handles POST /api/decisions/{id}/outcomes
// Request: CreateOutcomeRequest
// Response: DecisionOutcome
func (h *DecisionHandler) CreateOutcome(w http.ResponseWriter, r *http.Request) {
	userIDStr := middleware.UserIDFromContext(r.Context())
	if userIDStr == "" {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		jsonError(w, "invalid user ID", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	decisionID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		jsonError(w, "invalid decision ID", http.StatusBadRequest)
		return
	}

	// Verify decision belongs to user
	decision, err := h.repo.GetByIDAndUser(r.Context(), decisionID, userID)
	if err != nil || decision == nil {
		jsonError(w, "decision not found", http.StatusNotFound)
		return
	}

	var req model.CreateOutcomeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.TimeframeDays <= 0 {
		jsonError(w, "timeframeDays must be positive", http.StatusBadRequest)
		return
	}
	if req.MetricName == "" {
		jsonError(w, "metricName is required", http.StatusBadRequest)
		return
	}
	if !isValidOutcomeType(req.OutcomeType) {
		jsonError(w, "invalid outcomeType", http.StatusBadRequest)
		return
	}

	outcome := &model.DecisionOutcome{
		DecisionID:    decisionID,
		OutcomeType:   req.OutcomeType,
		TimeframeDays: req.TimeframeDays,
		MetricName:    req.MetricName,
		MetricBefore:  req.MetricBefore,
		MetricAfter:   req.MetricAfter,
		Notes:         req.Notes,
		EvidenceURL:   req.EvidenceURL,
		CreatedBy:     userID,
	}

	if err := h.repo.CreateOutcome(r.Context(), outcome); err != nil {
		log.Printf("[decision-handler] Failed to create outcome: %v", err)
		jsonError(w, "failed to create outcome", http.StatusInternalServerError)
		return
	}

	log.Printf("[decision-handler] Created outcome %s for decision %s", outcome.ID.Hex(), decisionID.Hex())
	jsonResponse(w, outcome, http.StatusCreated)
}

// ListOutcomes handles GET /api/decisions/{id}/outcomes
// Response: []DecisionOutcome
func (h *DecisionHandler) ListOutcomes(w http.ResponseWriter, r *http.Request) {
	userIDStr := middleware.UserIDFromContext(r.Context())
	if userIDStr == "" {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		jsonError(w, "invalid user ID", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	decisionID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		jsonError(w, "invalid decision ID", http.StatusBadRequest)
		return
	}

	// Verify decision belongs to user
	decision, err := h.repo.GetByIDAndUser(r.Context(), decisionID, userID)
	if err != nil || decision == nil {
		jsonError(w, "decision not found", http.StatusNotFound)
		return
	}

	outcomes, err := h.repo.ListOutcomes(r.Context(), decisionID)
	if err != nil {
		log.Printf("[decision-handler] Failed to list outcomes: %v", err)
		jsonError(w, "failed to list outcomes", http.StatusInternalServerError)
		return
	}

	if outcomes == nil {
		outcomes = []*model.DecisionOutcome{}
	}

	jsonResponse(w, outcomes, http.StatusOK)
}

// Compare handles GET /api/decisions/compare?ids=id1,id2,id3 (up to 3)
// Response: DecisionCompareResponse
func (h *DecisionHandler) Compare(w http.ResponseWriter, r *http.Request) {
	userIDStr := middleware.UserIDFromContext(r.Context())
	if userIDStr == "" {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		jsonError(w, "invalid user ID", http.StatusUnauthorized)
		return
	}

	// Parse comma-separated IDs from query param
	idsStr := r.URL.Query().Get("ids")
	if idsStr == "" {
		jsonError(w, "ids parameter is required (comma-separated, up to 3)", http.StatusBadRequest)
		return
	}

	idStrings := splitAndTrim(idsStr, ",")
	if len(idStrings) < 2 || len(idStrings) > 3 {
		jsonError(w, "provide 2-3 decision IDs for comparison", http.StatusBadRequest)
		return
	}

	var ids []primitive.ObjectID
	for _, idStr := range idStrings {
		id, err := primitive.ObjectIDFromHex(idStr)
		if err != nil {
			jsonError(w, "invalid decision ID: "+idStr, http.StatusBadRequest)
			return
		}
		ids = append(ids, id)
	}

	// Get decisions with their latest outcomes
	decisions, err := h.repo.GetMultipleByIDsAndUser(r.Context(), ids, userID)
	if err != nil {
		log.Printf("[decision-handler] Failed to get decisions for compare: %v", err)
		jsonError(w, "failed to get decisions", http.StatusInternalServerError)
		return
	}

	if len(decisions) != len(ids) {
		jsonError(w, "one or more decisions not found", http.StatusNotFound)
		return
	}

	jsonResponse(w, model.DecisionCompareResponse{
		Decisions: decisions,
	}, http.StatusOK)
}

// splitAndTrim splits a string by separator and trims whitespace
func splitAndTrim(s, sep string) []string {
	var result []string
	for _, part := range strings.Split(s, sep) {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

// Delete handles DELETE /api/decisions/{id}
func (h *DecisionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userIDStr := middleware.UserIDFromContext(r.Context())
	if userIDStr == "" {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		jsonError(w, "invalid user ID", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	id, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		jsonError(w, "invalid decision ID", http.StatusBadRequest)
		return
	}

	if err := h.repo.Delete(r.Context(), id, userID); err != nil {
		log.Printf("[decision-handler] Failed to delete decision: %v", err)
		jsonError(w, "decision not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Helper functions

func jsonResponse(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func jsonError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func isValidDecisionType(dt model.DecisionType) bool {
	switch dt {
	case model.DecisionTypePriceIncrease, model.DecisionTypeTieredPricing,
		model.DecisionTypePackaging, model.DecisionTypeDiscounting,
		model.DecisionTypeUsageBased, model.DecisionTypePositioning:
		return true
	}
	return false
}

func isValidConfidenceLevel(cl model.ConfidenceLevel) bool {
	switch cl {
	case model.ConfidenceLow, model.ConfidenceMedium, model.ConfidenceHigh:
		return true
	}
	return false
}

func isValidRiskLevel(rl model.RiskLevel) bool {
	switch rl {
	case model.RiskLow, model.RiskMedium, model.RiskHigh:
		return true
	}
	return false
}

func isValidStatus(s model.DecisionStatus) bool {
	switch s {
	case model.StatusProposed, model.StatusInReview, model.StatusApproved,
		model.StatusRejected, model.StatusImplemented, model.StatusRolledBack:
		return true
	}
	return false
}

func isValidOutcomeType(ot model.OutcomeType) bool {
	switch ot {
	case model.OutcomeRevenue, model.OutcomeChurn, model.OutcomeActivation,
		model.OutcomeRetention, model.OutcomePricing, model.OutcomeOther:
		return true
	}
	return false
}
