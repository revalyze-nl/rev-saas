package service

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"rev-saas-api/internal/model"
	mongorepo "rev-saas-api/internal/repository/mongo"
)

// LimitError codes for frontend to handle
const (
	LimitCodeCompetitors   = "LIMIT_COMPETITORS"
	LimitCodePlans         = "LIMIT_PLANS"
	LimitCodeAnalyses      = "LIMIT_ANALYSES"
	LimitCodeTrialExpired  = "LIMIT_TRIAL_EXPIRED"
	
	// Decision Intelligence limit codes
	LimitCodeDecisions     = "PLAN_LIMIT_DECISIONS"
	LimitCodeScenarios     = "PLAN_LIMIT_SCENARIOS"
	
	// Feature gating codes
	FeatureLockedOutcomeKPIs      = "FEATURE_LOCKED_OUTCOME_KPIS"
	FeatureLockedDecisionTimeline = "FEATURE_LOCKED_DECISION_TIMELINE"
	FeatureLockedLearning         = "FEATURE_LOCKED_LEARNING"
	FeatureLockedExports          = "FEATURE_LOCKED_EXPORTS"
)

// LimitCheckResult represents the result of a limit check.
type LimitCheckResult struct {
	Allowed   bool   `json:"allowed"`
	ErrorCode string `json:"error_code,omitempty"`
	Reason    string `json:"reason,omitempty"`
	Plan      string `json:"plan,omitempty"`
	Limit     int    `json:"limit,omitempty"`
	Current   int    `json:"current,omitempty"`
}

// LimitsService handles plan-based limit checking.
type LimitsService struct {
	userRepo       *mongorepo.UserRepository
	planRepo       *mongorepo.PlanRepository
	competitorRepo *mongorepo.CompetitorRepository
	analysisRepo   *mongorepo.AnalysisRepository
	decisionRepo   *mongorepo.DecisionV2Repository
	scenarioRepo   *mongorepo.ScenarioRepository
}

// NewLimitsService creates a new LimitsService.
func NewLimitsService(
	userRepo *mongorepo.UserRepository,
	planRepo *mongorepo.PlanRepository,
	competitorRepo *mongorepo.CompetitorRepository,
	analysisRepo *mongorepo.AnalysisRepository,
) *LimitsService {
	return &LimitsService{
		userRepo:       userRepo,
		planRepo:       planRepo,
		competitorRepo: competitorRepo,
		analysisRepo:   analysisRepo,
	}
}

// SetDecisionRepo sets the decision repository (for dependency injection)
func (s *LimitsService) SetDecisionRepo(repo *mongorepo.DecisionV2Repository) {
	s.decisionRepo = repo
}

// SetScenarioRepo sets the scenario repository (for dependency injection)
func (s *LimitsService) SetScenarioRepo(repo *mongorepo.ScenarioRepository) {
	s.scenarioRepo = repo
}

// CanAddCompetitor checks if the user can add another competitor.
func (s *LimitsService) CanAddCompetitor(ctx context.Context, user *model.User) LimitCheckResult {
	// Admin users have unlimited access
	if user.HasUnlimitedAccess() {
		return LimitCheckResult{Allowed: true}
	}

	plan := user.GetEffectivePlan()
	limits := GetPlanLimits(plan)

	if limits.IsUnlimited {
		return LimitCheckResult{Allowed: true}
	}

	// Count current competitors
	uid, _ := primitive.ObjectIDFromHex(user.ID.Hex())
	competitors, err := s.competitorRepo.ListByUser(ctx, uid)
	if err != nil {
		// On error, allow the operation (fail open for better UX)
		return LimitCheckResult{Allowed: true}
	}

	currentCount := len(competitors)

	if currentCount >= limits.MaxCompetitors {
		return LimitCheckResult{
			Allowed:   false,
			ErrorCode: LimitCodeCompetitors,
			Reason:    "Maximum competitors limit reached for your plan",
			Plan:      plan,
			Limit:     limits.MaxCompetitors,
			Current:   currentCount,
		}
	}

	return LimitCheckResult{Allowed: true}
}

// CanAddPlan checks if the user can add another pricing plan.
func (s *LimitsService) CanAddPlan(ctx context.Context, user *model.User) LimitCheckResult {
	// Admin users have unlimited access
	if user.HasUnlimitedAccess() {
		return LimitCheckResult{Allowed: true}
	}

	plan := user.GetEffectivePlan()
	limits := GetPlanLimits(plan)

	if limits.IsUnlimited {
		return LimitCheckResult{Allowed: true}
	}

	// Count current plans
	uid, _ := primitive.ObjectIDFromHex(user.ID.Hex())
	plans, err := s.planRepo.ListByUser(ctx, uid)
	if err != nil {
		return LimitCheckResult{Allowed: true}
	}

	currentCount := len(plans)

	if currentCount >= limits.MaxPlans {
		return LimitCheckResult{
			Allowed:   false,
			ErrorCode: LimitCodePlans,
			Reason:    "Maximum pricing plans limit reached for your plan",
			Plan:      plan,
			Limit:     limits.MaxPlans,
			Current:   currentCount,
		}
	}

	return LimitCheckResult{Allowed: true}
}

// CanRunAnalysis checks if the user can run another analysis.
func (s *LimitsService) CanRunAnalysis(ctx context.Context, user *model.User) LimitCheckResult {
	// Admin users have unlimited access
	if user.HasUnlimitedAccess() {
		return LimitCheckResult{Allowed: true}
	}

	plan := user.GetEffectivePlan()
	limits := GetPlanLimits(plan)

	if limits.IsUnlimited {
		return LimitCheckResult{Allowed: true}
	}

	// For free plan, check trial expiry and lifetime limit
	if plan == model.PlanFree {
		// Check trial expiry
		if user.IsTrialExpired() {
			return LimitCheckResult{
				Allowed:   false,
				ErrorCode: LimitCodeTrialExpired,
				Reason:    "Your free trial has expired. Please upgrade to continue.",
				Plan:      plan,
			}
		}

		// Check lifetime analysis limit
		if limits.MaxAnalysesTotal > 0 && user.AnalysisTotalUsed >= limits.MaxAnalysesTotal {
			return LimitCheckResult{
				Allowed:   false,
				ErrorCode: LimitCodeAnalyses,
				Reason:    "You have used all your free analyses. Please upgrade to continue.",
				Plan:      plan,
				Limit:     limits.MaxAnalysesTotal,
				Current:   user.AnalysisTotalUsed,
			}
		}

		return LimitCheckResult{Allowed: true}
	}

	// For paid plans, check monthly limit
	if limits.MaxAnalysesPerMonth > 0 {
		monthCount := s.getMonthlyAnalysisCount(user)

		if monthCount >= limits.MaxAnalysesPerMonth {
			return LimitCheckResult{
				Allowed:   false,
				ErrorCode: LimitCodeAnalyses,
				Reason:    "You have reached your monthly analysis limit. Please upgrade or wait until next month.",
				Plan:      plan,
				Limit:     limits.MaxAnalysesPerMonth,
				Current:   monthCount,
			}
		}
	}

	return LimitCheckResult{Allowed: true}
}

// getMonthlyAnalysisCount returns the current month's analysis count, resetting if needed.
func (s *LimitsService) getMonthlyAnalysisCount(user *model.User) int {
	now := time.Now()

	// Check if we need to reset the monthly counter
	if user.AnalysisMonthStart.IsZero() || !isSameMonth(user.AnalysisMonthStart, now) {
		// Month has changed or never set - count should be reset
		// This will be done when IncrementAnalysisCount is called
		return 0
	}

	return user.AnalysisMonthCount
}

// IncrementAnalysisCount increments the analysis counter for the user.
// Call this AFTER a successful analysis run.
func (s *LimitsService) IncrementAnalysisCount(ctx context.Context, user *model.User) error {
	plan := user.GetEffectivePlan()
	now := time.Now()

	// For free plan, increment lifetime counter
	if plan == model.PlanFree {
		user.AnalysisTotalUsed++
	} else {
		// For paid plans, handle monthly counter
		if user.AnalysisMonthStart.IsZero() || !isSameMonth(user.AnalysisMonthStart, now) {
			// Reset monthly counter
			user.AnalysisMonthStart = now
			user.AnalysisMonthCount = 1
		} else {
			user.AnalysisMonthCount++
		}
	}

	// Update user in database
	return s.userRepo.Update(ctx, user)
}

// GetUserUsageStats returns usage statistics for a user.
func (s *LimitsService) GetUserUsageStats(ctx context.Context, user *model.User) map[string]interface{} {
	plan := user.GetEffectivePlan()
	limits := GetPlanLimits(plan)
	isUnlimited := limits.IsUnlimited || user.HasUnlimitedAccess()

	uid, _ := primitive.ObjectIDFromHex(user.ID.Hex())

	// Count current resources
	competitors, _ := s.competitorRepo.ListByUser(ctx, uid)
	plans, _ := s.planRepo.ListByUser(ctx, uid)

	competitorCount := 0
	if competitors != nil {
		competitorCount = len(competitors)
	}

	planCount := 0
	if plans != nil {
		planCount = len(plans)
	}

	// Get decision/scenario usage this month
	decisionsUsed := s.GetDecisionUsageThisMonth(ctx, user)
	scenariosUsed := s.GetScenarioUsageThisMonth(ctx, user)

	stats := map[string]interface{}{
		"plan":              plan,
		"role":              user.Role,
		"competitors_used":  competitorCount,
		"competitors_limit": limits.MaxCompetitors,
		"plans_used":        planCount,
		"plans_limit":       limits.MaxPlans,
		"is_unlimited":      isUnlimited,
	}

	// Decision Intelligence limits
	if isUnlimited {
		stats["limits"] = map[string]interface{}{
			"decisions_per_month": nil, // unlimited
			"scenarios_per_month": nil, // unlimited
		}
	} else {
		stats["limits"] = map[string]interface{}{
			"decisions_per_month": limits.DecisionsPerMonth,
			"scenarios_per_month": limits.ScenariosPerMonth,
		}
	}

	stats["used"] = map[string]interface{}{
		"decisions_this_month": decisionsUsed,
		"scenarios_this_month": scenariosUsed,
	}

	// Feature flags
	stats["features"] = map[string]interface{}{
		"outcome_kpis":      isUnlimited || limits.Features.OutcomeKPIs,
		"decision_timeline": isUnlimited || limits.Features.DecisionTimeline,
		"learning":          isUnlimited || limits.Features.Learning,
		"exports":           isUnlimited || limits.Features.Exports,
	}

	if plan == model.PlanFree {
		stats["analyses_used"] = user.AnalysisTotalUsed
		stats["analyses_limit"] = limits.MaxAnalysesTotal
		stats["trial_expires_at"] = user.TrialExpiresAt
		stats["trial_expired"] = user.IsTrialExpired()
	} else if !isUnlimited {
		monthCount := s.getMonthlyAnalysisCount(user)
		stats["analyses_used_this_month"] = monthCount
		stats["analyses_limit_per_month"] = limits.MaxAnalysesPerMonth
	}

	return stats
}

// isSameMonth checks if two times are in the same month and year.
func isSameMonth(t1, t2 time.Time) bool {
	return t1.Year() == t2.Year() && t1.Month() == t2.Month()
}

// getStartOfMonth returns the start of the current month
func getStartOfMonth() time.Time {
	now := time.Now()
	return time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
}

// CanCreateDecision checks if the user can create another decision this month.
func (s *LimitsService) CanCreateDecision(ctx context.Context, user *model.User) LimitCheckResult {
	// Admin users have unlimited access
	if user.HasUnlimitedAccess() {
		return LimitCheckResult{Allowed: true}
	}

	plan := user.GetEffectivePlan()
	limits := GetPlanLimits(plan)

	if limits.IsUnlimited {
		return LimitCheckResult{Allowed: true}
	}

	// Skip check if no limit set
	if limits.DecisionsPerMonth <= 0 {
		return LimitCheckResult{Allowed: true}
	}

	// Count decisions created this month
	if s.decisionRepo == nil {
		// Repository not set - fail open for better UX
		return LimitCheckResult{Allowed: true}
	}

	startOfMonth := getStartOfMonth()
	count, err := s.decisionRepo.CountByUserSince(ctx, user.ID, startOfMonth)
	if err != nil {
		// On error, allow the operation (fail open for better UX)
		return LimitCheckResult{Allowed: true}
	}

	if int(count) >= limits.DecisionsPerMonth {
		return LimitCheckResult{
			Allowed:   false,
			ErrorCode: LimitCodeDecisions,
			Reason:    "You've reached your monthly decision limit. Upgrade to continue.",
			Plan:      plan,
			Limit:     limits.DecisionsPerMonth,
			Current:   int(count),
		}
	}

	return LimitCheckResult{Allowed: true}
}

// CanGenerateScenarios checks if the user can generate another scenario set this month.
func (s *LimitsService) CanGenerateScenarios(ctx context.Context, user *model.User) LimitCheckResult {
	// Admin users have unlimited access
	if user.HasUnlimitedAccess() {
		return LimitCheckResult{Allowed: true}
	}

	plan := user.GetEffectivePlan()
	limits := GetPlanLimits(plan)

	if limits.IsUnlimited {
		return LimitCheckResult{Allowed: true}
	}

	// Skip check if no limit set
	if limits.ScenariosPerMonth <= 0 {
		return LimitCheckResult{Allowed: true}
	}

	// Count scenarios created this month
	if s.scenarioRepo == nil {
		// Repository not set - fail open for better UX
		return LimitCheckResult{Allowed: true}
	}

	startOfMonth := getStartOfMonth()
	count, err := s.scenarioRepo.CountByUserSince(ctx, user.ID, startOfMonth)
	if err != nil {
		// On error, allow the operation (fail open for better UX)
		return LimitCheckResult{Allowed: true}
	}

	if int(count) >= limits.ScenariosPerMonth {
		return LimitCheckResult{
			Allowed:   false,
			ErrorCode: LimitCodeScenarios,
			Reason:    "You've reached your monthly scenario limit. Upgrade to continue.",
			Plan:      plan,
			Limit:     limits.ScenariosPerMonth,
			Current:   int(count),
		}
	}

	return LimitCheckResult{Allowed: true}
}

// CanUseOutcomeKPIs checks if the user can track measurable KPIs in outcomes.
func (s *LimitsService) CanUseOutcomeKPIs(user *model.User) LimitCheckResult {
	if user.HasUnlimitedAccess() {
		return LimitCheckResult{Allowed: true}
	}

	plan := user.GetEffectivePlan()
	limits := GetPlanLimits(plan)

	if limits.IsUnlimited || limits.Features.OutcomeKPIs {
		return LimitCheckResult{Allowed: true}
	}

	return LimitCheckResult{
		Allowed:   false,
		ErrorCode: FeatureLockedOutcomeKPIs,
		Reason:    "Upgrade to Growth to track measurable outcomes.",
		Plan:      plan,
	}
}

// CanUseLearning checks if the user can access learning/pattern features.
func (s *LimitsService) CanUseLearning(user *model.User) LimitCheckResult {
	if user.HasUnlimitedAccess() {
		return LimitCheckResult{Allowed: true}
	}

	plan := user.GetEffectivePlan()
	limits := GetPlanLimits(plan)

	if limits.IsUnlimited || limits.Features.Learning {
		return LimitCheckResult{Allowed: true}
	}

	return LimitCheckResult{
		Allowed:   false,
		ErrorCode: FeatureLockedLearning,
		Reason:    "Upgrade to Enterprise to access learning across decisions.",
		Plan:      plan,
	}
}

// CanUseExports checks if the user can export decisions/reports.
func (s *LimitsService) CanUseExports(user *model.User) LimitCheckResult {
	if user.HasUnlimitedAccess() {
		return LimitCheckResult{Allowed: true}
	}

	plan := user.GetEffectivePlan()
	limits := GetPlanLimits(plan)

	if limits.IsUnlimited || limits.Features.Exports {
		return LimitCheckResult{Allowed: true}
	}

	return LimitCheckResult{
		Allowed:   false,
		ErrorCode: FeatureLockedExports,
		Reason:    "Upgrade to Enterprise to export decisions and reports.",
		Plan:      plan,
	}
}

// GetDecisionUsageThisMonth returns decisions used this month by the user.
func (s *LimitsService) GetDecisionUsageThisMonth(ctx context.Context, user *model.User) int {
	if s.decisionRepo == nil {
		return 0
	}
	startOfMonth := getStartOfMonth()
	count, err := s.decisionRepo.CountByUserSince(ctx, user.ID, startOfMonth)
	if err != nil {
		return 0
	}
	return int(count)
}

// GetScenarioUsageThisMonth returns scenarios used this month by the user.
func (s *LimitsService) GetScenarioUsageThisMonth(ctx context.Context, user *model.User) int {
	if s.scenarioRepo == nil {
		return 0
	}
	startOfMonth := getStartOfMonth()
	count, err := s.scenarioRepo.CountByUserSince(ctx, user.ID, startOfMonth)
	if err != nil {
		return 0
	}
	return int(count)
}








