package service

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"rev-saas-api/internal/model"
	mongorepo "rev-saas-api/internal/repository/mongo"
)

// DecisionV2Service handles decision operations with versioning
type DecisionV2Service struct {
	repo             *mongorepo.DecisionV2Repository
	workspaceRepo    *mongorepo.WorkspaceProfileRepository
	inferenceService *InferenceService
}

// NewDecisionV2Service creates a new decision service
func NewDecisionV2Service(
	repo *mongorepo.DecisionV2Repository,
	workspaceRepo *mongorepo.WorkspaceProfileRepository,
	inferenceService *InferenceService,
) *DecisionV2Service {
	return &DecisionV2Service{
		repo:             repo,
		workspaceRepo:    workspaceRepo,
		inferenceService: inferenceService,
	}
}

// CreateDecisionRequest represents the request to create a new decision
type CreateDecisionRequest struct {
	WebsiteURL string                           `json:"websiteUrl"`
	Context    *model.CreateDecisionContextReqV2 `json:"context,omitempty"`
}

// CreateDecision creates a new decision with context resolution
func (s *DecisionV2Service) CreateDecision(ctx context.Context, userID primitive.ObjectID, req CreateDecisionRequest) (*model.DecisionV2, error) {
	if req.WebsiteURL == "" {
		return nil, fmt.Errorf("website URL is required")
	}

	// Get workspace defaults
	var workspaceDefaults *model.WorkspaceDefaults
	workspaceProfile, err := s.workspaceRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace profile: %w", err)
	}
	if workspaceProfile != nil {
		workspaceDefaults = &workspaceProfile.Defaults
	}

	// Run AI inference on the website
	inference, artifacts, err := s.inferenceService.InferContextFromWebsite(ctx, req.WebsiteURL)
	if err != nil {
		// Log error but continue - inference is optional
		inference = &InferenceResult{}
	}

	// Resolve context with priority: user > workspace > inferred
	resolvedContext := ResolveFullContext(req.Context, workspaceDefaults, inference)

	// Extract company name from URL
	companyName := s.inferenceService.ExtractCompanyName(req.WebsiteURL)

	// Generate verdict
	verdict, modelMeta, err := s.inferenceService.GenerateVerdict(ctx, req.WebsiteURL, resolvedContext)
	if err != nil {
		return nil, fmt.Errorf("failed to generate verdict: %w", err)
	}

	now := time.Now()

	// Create initial context version
	contextVersion := model.ContextVersion{
		Version:   1,
		Context:   resolvedContext,
		Reason:    "Initial context from creation",
		CreatedAt: now,
	}

	// Create initial verdict version
	verdictVersion := model.VerdictVersion{
		Version:   1,
		Verdict:   *verdict,
		Reason:    "Initial verdict from AI analysis",
		CreatedAt: now,
	}

	decision := &model.DecisionV2{
		UserID:           userID,
		WebsiteURL:       req.WebsiteURL,
		CompanyName:      companyName,
		Status:           model.DecisionStatusPending,
		Context:          resolvedContext,
		ContextVersion:   1,
		ContextVersions:  []model.ContextVersion{contextVersion},
		Verdict:          *verdict,
		VerdictVersion:   1,
		VerdictVersions:  []model.VerdictVersion{verdictVersion},
		ModelMeta:        *modelMeta,
		InferenceSignals: inference.Signals,
		ExpectedImpact: model.ExpectedImpactV2{
			RevenueRange: verdict.SupportingDetails.ExpectedRevenueImpact,
			ChurnNote:    verdict.SupportingDetails.ChurnOutlook,
		},
		StatusEvents: []model.StatusEventV2{
			{
				Status:    model.DecisionStatusPending,
				Reason:    "Decision created",
				CreatedAt: now,
			},
		},
		Outcomes: []model.OutcomeV2{},
	}

	// Set inference artifacts if available
	if artifacts != nil {
		decision.InferenceArtifacts = artifacts
	}

	if err := s.repo.Create(ctx, decision); err != nil {
		return nil, fmt.Errorf("failed to create decision: %w", err)
	}

	return decision, nil
}

// GetDecision retrieves a decision by ID
func (s *DecisionV2Service) GetDecision(ctx context.Context, id, userID primitive.ObjectID) (*model.DecisionV2, error) {
	return s.repo.GetByIDAndUser(ctx, id, userID)
}

// ListDecisions retrieves decisions with filters
func (s *DecisionV2Service) ListDecisions(ctx context.Context, userID primitive.ObjectID, params mongorepo.DecisionV2ListParams) (*model.DecisionListResponseV2, error) {
	return s.repo.List(ctx, userID, params)
}

// UpdateContextRequest represents a context update request
type UpdateContextRequest struct {
	Context model.UpdateDecisionContextReqV2 `json:"context"`
	Reason  string                            `json:"reason"`
}

// UpdateContext updates decision context and creates a new version
func (s *DecisionV2Service) UpdateContext(ctx context.Context, id, userID primitive.ObjectID, req UpdateContextRequest) (*model.DecisionV2, error) {
	// Get existing decision
	decision, err := s.repo.GetByIDAndUser(ctx, id, userID)
	if err != nil {
		return nil, err
	}
	if decision == nil {
		return nil, fmt.Errorf("decision not found")
	}

	// Build new context by applying updates to existing
	newContext := decision.Context

	if req.Context.CompanyStage != nil {
		newContext.CompanyStage = model.ContextField{
			Value:  req.Context.CompanyStage,
			Source: model.ContextSourceUser,
		}
	}
	if req.Context.BusinessModel != nil {
		newContext.BusinessModel = model.ContextField{
			Value:  req.Context.BusinessModel,
			Source: model.ContextSourceUser,
		}
	}
	if req.Context.PrimaryKPI != nil {
		newContext.PrimaryKPI = model.ContextField{
			Value:  req.Context.PrimaryKPI,
			Source: model.ContextSourceUser,
		}
	}
	if req.Context.Market != nil {
		if req.Context.Market.Type != nil {
			newContext.Market.Type = model.ContextField{
				Value:  req.Context.Market.Type,
				Source: model.ContextSourceUser,
			}
		}
		if req.Context.Market.Segment != nil {
			newContext.Market.Segment = model.ContextField{
				Value:  req.Context.Market.Segment,
				Source: model.ContextSourceUser,
			}
		}
	}

	// Create new version
	newVersion := model.ContextVersion{
		Version:   decision.ContextVersion + 1,
		Context:   newContext,
		Reason:    req.Reason,
		CreatedAt: time.Now(),
	}

	return s.repo.UpdateContext(ctx, id, userID, newContext, newVersion)
}

// RegenerateVerdict triggers AI re-analysis and creates new verdict version
func (s *DecisionV2Service) RegenerateVerdict(ctx context.Context, id, userID primitive.ObjectID, reason string) (*model.DecisionV2, error) {
	// Get existing decision
	decision, err := s.repo.GetByIDAndUser(ctx, id, userID)
	if err != nil {
		return nil, err
	}
	if decision == nil {
		return nil, fmt.Errorf("decision not found")
	}

	// Generate new verdict
	verdict, modelMeta, err := s.inferenceService.GenerateVerdict(ctx, decision.WebsiteURL, decision.Context)
	if err != nil {
		return nil, fmt.Errorf("failed to regenerate verdict: %w", err)
	}

	// Create new version
	newVersion := model.VerdictVersion{
		Version:   decision.VerdictVersion + 1,
		Verdict:   *verdict,
		Reason:    reason,
		CreatedAt: time.Now(),
	}

	return s.repo.UpdateVerdict(ctx, id, userID, *verdict, newVersion, *modelMeta)
}

// UpdateStatusRequest represents a status update request
type UpdateStatusRequest struct {
	Status string `json:"status"`
	Reason string `json:"reason"`
}

// Valid status transitions
var validStatusTransitions = map[string][]string{
	model.DecisionStatusPending:  {model.DecisionStatusApproved, model.DecisionStatusRejected, model.DecisionStatusDeferred},
	model.DecisionStatusApproved: {model.DecisionStatusCompleted, model.DecisionStatusPending},
	model.DecisionStatusRejected: {model.DecisionStatusPending},
	model.DecisionStatusDeferred: {model.DecisionStatusPending, model.DecisionStatusApproved, model.DecisionStatusRejected},
	model.DecisionStatusCompleted: {}, // Terminal state
}

// UpdateStatus updates decision status with validation
func (s *DecisionV2Service) UpdateStatus(ctx context.Context, id, userID primitive.ObjectID, req UpdateStatusRequest) (*model.DecisionV2, error) {
	// Get existing decision
	decision, err := s.repo.GetByIDAndUser(ctx, id, userID)
	if err != nil {
		return nil, err
	}
	if decision == nil {
		return nil, fmt.Errorf("decision not found")
	}

	// Validate transition
	allowedTransitions := validStatusTransitions[decision.Status]
	valid := false
	for _, allowed := range allowedTransitions {
		if allowed == req.Status {
			valid = true
			break
		}
	}

	if !valid {
		return nil, fmt.Errorf("invalid status transition from %s to %s", decision.Status, req.Status)
	}

	// Create status event
	event := model.StatusEventV2{
		Status:    req.Status,
		Reason:    req.Reason,
		CreatedAt: time.Now(),
	}

	return s.repo.UpdateStatus(ctx, id, userID, req.Status, event)
}

// AddOutcomeRequest represents an outcome addition request
type AddOutcomeRequest struct {
	OutcomeType       string   `json:"outcomeType"`
	TimeframeDays     int      `json:"timeframeDays"`
	MetricBefore      *float64 `json:"metricBefore,omitempty"`
	MetricAfter       *float64 `json:"metricAfter,omitempty"`
	Notes             string   `json:"notes,omitempty"`
	IsCorrection      bool     `json:"isCorrection,omitempty"`
	CorrectsOutcomeID string   `json:"correctsOutcomeId,omitempty"`
}

// AddOutcome adds an outcome to a decision
func (s *DecisionV2Service) AddOutcome(ctx context.Context, id, userID primitive.ObjectID, req AddOutcomeRequest) (*model.DecisionV2, error) {
	// Get existing decision
	decision, err := s.repo.GetByIDAndUser(ctx, id, userID)
	if err != nil {
		return nil, err
	}
	if decision == nil {
		return nil, fmt.Errorf("decision not found")
	}

	// Validate outcome type
	if !isValidOutcomeType(req.OutcomeType) {
		return nil, fmt.Errorf("invalid outcome type: %s", req.OutcomeType)
	}

	// Calculate delta percent if both metrics provided
	deltaPercent := CalculateDeltaPercent(req.MetricBefore, req.MetricAfter)

	outcome := model.OutcomeV2{
		ID:            primitive.NewObjectID(),
		OutcomeType:   req.OutcomeType,
		TimeframeDays: req.TimeframeDays,
		MetricBefore:  req.MetricBefore,
		MetricAfter:   req.MetricAfter,
		DeltaPercent:  deltaPercent,
		Notes:         req.Notes,
		IsCorrection:  req.IsCorrection,
		CreatedAt:     time.Now(),
	}

	// Handle correction
	if req.IsCorrection && req.CorrectsOutcomeID != "" {
		correctsID, err := primitive.ObjectIDFromHex(req.CorrectsOutcomeID)
		if err != nil {
			return nil, fmt.Errorf("invalid correctsOutcomeId: %w", err)
		}
		outcome.CorrectsOutcomeID = &correctsID

		// Verify the outcome being corrected exists
		found := false
		for _, o := range decision.Outcomes {
			if o.ID == correctsID {
				found = true
				break
			}
		}
		if !found {
			return nil, fmt.Errorf("outcome to correct not found: %s", req.CorrectsOutcomeID)
		}
	}

	return s.repo.AddOutcome(ctx, id, userID, outcome)
}

// GetEffectiveOutcomes returns non-superseded outcomes for a decision
func (s *DecisionV2Service) GetEffectiveOutcomes(ctx context.Context, id, userID primitive.ObjectID) ([]model.OutcomeV2, error) {
	decision, err := s.repo.GetByIDAndUser(ctx, id, userID)
	if err != nil {
		return nil, err
	}
	if decision == nil {
		return nil, fmt.Errorf("decision not found")
	}

	return GetEffectiveOutcomes(decision.Outcomes), nil
}

// DeleteDecision soft-deletes a decision
func (s *DecisionV2Service) DeleteDecision(ctx context.Context, id, userID primitive.ObjectID) error {
	decision, err := s.repo.GetByIDAndUser(ctx, id, userID)
	if err != nil {
		return err
	}
	if decision == nil {
		return fmt.Errorf("decision not found")
	}

	return s.repo.SoftDelete(ctx, id, userID)
}

// GetMultipleDecisions retrieves multiple decisions by IDs for comparison
func (s *DecisionV2Service) GetMultipleDecisions(ctx context.Context, userID primitive.ObjectID, ids []primitive.ObjectID) ([]*model.DecisionV2, error) {
	return s.repo.GetMultipleByIDs(ctx, userID, ids)
}

// DeleteUserDecisions deletes all decisions for a user (for account cleanup)
func (s *DecisionV2Service) DeleteUserDecisions(ctx context.Context, userID primitive.ObjectID) error {
	// Get all user decisions
	result, err := s.repo.List(ctx, userID, mongorepo.DecisionV2ListParams{PageSize: 1000})
	if err != nil {
		return err
	}

	// Soft delete each
	for _, d := range result.Decisions {
		if err := s.repo.SoftDelete(ctx, d.ID, userID); err != nil {
			return err
		}
	}

	return nil
}

// Validation helper
func isValidOutcomeType(s string) bool {
	valid := map[string]bool{
		"revenue":   true,
		"churn":     true,
		"retention": true,
		"growth":    true,
		"cost":      true,
		"other":     true,
	}
	return valid[s]
}
