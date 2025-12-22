package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"rev-saas-api/internal/model"
	mongorepo "rev-saas-api/internal/repository/mongo"
)

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYSIS SERVICE V2
// Orchestrates the rule engine and LLM for the V2 analysis pipeline.
// ═══════════════════════════════════════════════════════════════════════════════

// AnalysisServiceV2 handles the V2 analysis pipeline.
type AnalysisServiceV2 struct {
	ruleEngine          *PricingRuleEngine
	llmService          *LLMAnalysisServiceV2
	analysisV2Repo      *mongorepo.AnalysisV2Repository
	planRepo            *mongorepo.PlanRepository
	competitorRepo      *mongorepo.CompetitorRepository
	businessMetricsRepo *mongorepo.BusinessMetricsRepository
}

// NewAnalysisServiceV2 creates a new V2 analysis service.
func NewAnalysisServiceV2(
	ruleEngine *PricingRuleEngine,
	llmService *LLMAnalysisServiceV2,
	analysisV2Repo *mongorepo.AnalysisV2Repository,
	planRepo *mongorepo.PlanRepository,
	competitorRepo *mongorepo.CompetitorRepository,
	businessMetricsRepo *mongorepo.BusinessMetricsRepository,
) *AnalysisServiceV2 {
	return &AnalysisServiceV2{
		ruleEngine:          ruleEngine,
		llmService:          llmService,
		analysisV2Repo:      analysisV2Repo,
		planRepo:            planRepo,
		competitorRepo:      competitorRepo,
		businessMetricsRepo: businessMetricsRepo,
	}
}

// RunAnalysisV2 executes the full V2 analysis pipeline for a user.
func (s *AnalysisServiceV2) RunAnalysisV2(ctx context.Context, userID string) (*model.AnalysisResultV2, error) {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	// Step 1: Gather all input data
	input, err := s.gatherInputData(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("failed to gather input data: %w", err)
	}

	// Step 2: Run the deterministic rule engine
	ruleResult := s.ruleEngine.RunRuleEngine(*input)

	// Step 3: Select suggested next actions based on rule engine results (deterministic)
	actionTemplates := SelectNextActions(ruleResult, *input)

	// Step 4: Run the LLM analysis with action templates for wording
	llmOutput, err := s.llmService.GenerateLLMAnalysisWithActions(ctx, *input, ruleResult, actionTemplates)
	if err != nil {
		// Continue with fallback output if LLM fails
		llmOutput = s.llmService.GenerateFallbackOutput(ruleResult)
		// Add fallback actions
		if len(actionTemplates) > 0 {
			llmOutput.SuggestedNextActions = CreateFallbackActions(actionTemplates)
		}
	}

	// Step 5: Build the final result
	result := &model.AnalysisResultV2{
		UserID:     uid,
		CreatedAt:  time.Now(),
		Input:      *input,
		RuleResult: ruleResult,
		LLMOutput:  *llmOutput,
		Version:    "2.1", // Updated version to indicate suggested actions feature
	}

	// Step 6: Persist to database
	if err := s.analysisV2Repo.Create(ctx, result); err != nil {
		return nil, fmt.Errorf("failed to save analysis: %w", err)
	}

	return result, nil
}

// gatherInputData collects all necessary data from the database.
func (s *AnalysisServiceV2) gatherInputData(ctx context.Context, userID primitive.ObjectID) (*model.AnalysisInputV2, error) {
	input := &model.AnalysisInputV2{
		UserPlans:   make([]model.PricingPlanInput, 0),
		Competitors: make([]model.CompetitorInput, 0),
	}

	// Fetch user's plans
	plans, err := s.planRepo.ListByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch plans: %w", err)
	}

	for _, p := range plans {
		input.UserPlans = append(input.UserPlans, model.PricingPlanInput{
			ID:       p.ID.Hex(),
			Name:     p.Name,
			Price:    p.Price,
			Currency: p.Currency,
			Billing:  p.BillingCycle,
		})
	}

	// Fetch user's competitors
	competitors, err := s.competitorRepo.ListByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch competitors: %w", err)
	}

	for _, c := range competitors {
		comp := model.CompetitorInput{
			Name:  c.Name,
			Plans: make([]model.CompetitorPlanInput, 0),
		}
		for _, p := range c.Plans {
			comp.Plans = append(comp.Plans, model.CompetitorPlanInput{
				Name:     p.Name,
				Price:    p.Price,
				Currency: p.Currency,
				Billing:  p.BillingCycle,
			})
		}
		input.Competitors = append(input.Competitors, comp)
	}

	// Fetch business metrics
	metrics, err := s.businessMetricsRepo.GetByUserID(ctx, userID)
	if err == nil && metrics != nil {
		input.BusinessMetrics = model.BusinessMetricsInput{
			MRR:             metrics.MRR,
			ARR:             metrics.MRR * 12,
			ChurnRate:       metrics.MonthlyChurnRate,
			Customers:       metrics.Customers,
			Currency:        metrics.Currency,
			TargetARRGrowth: metrics.TargetArrGrowth,
			PricingGoal:     metrics.PricingGoal,
		}
	}

	return input, nil
}

// GetAnalysisV2 retrieves a specific V2 analysis by ID.
func (s *AnalysisServiceV2) GetAnalysisV2(ctx context.Context, userID string, analysisID string) (*model.AnalysisResultV2, error) {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	aid, err := primitive.ObjectIDFromHex(analysisID)
	if err != nil {
		return nil, errors.New("invalid analysis id")
	}

	return s.analysisV2Repo.GetByIDAndUser(ctx, aid, uid)
}

// ListAnalysesV2 retrieves all V2 analyses for a user.
func (s *AnalysisServiceV2) ListAnalysesV2(ctx context.Context, userID string, limit int) ([]*model.AnalysisResultV2, error) {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	return s.analysisV2Repo.ListByUser(ctx, uid, limit)
}

