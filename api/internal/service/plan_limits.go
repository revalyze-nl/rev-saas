package service

import "rev-saas-api/internal/model"

// PlanLimits defines the limits for a subscription plan.
type PlanLimits struct {
	MaxCompetitors       int  // Maximum number of competitors allowed
	MaxPlans             int  // Maximum number of pricing plans allowed
	MaxAnalysesPerMonth  int  // Maximum analyses per month (0 = unlimited) - DEPRECATED, use MonthlyAICredits
	MaxAnalysesTotal     int  // Maximum total analyses lifetime (0 = unlimited, used for free plan) - DEPRECATED
	TrialDays            int  // Trial period in days (0 = no trial)
	IsUnlimited          bool // If true, skip all checks

	// AI Insight Credits system
	MonthlyAICredits   int  // AI Insight Credits per month (each AI action = 1 credit)
	SimulationsEnabled bool // Whether pricing simulations are available on this plan

	// Decision Intelligence limits (new system)
	DecisionsPerMonth int // Maximum decisions per month
	ScenariosPerMonth int // Maximum scenarios per month

	// Feature flags
	Features PlanFeatures
}

// PlanFeatures defines feature access for a plan
type PlanFeatures struct {
	OutcomeKPIs      bool // Can track measurable KPIs in outcomes (Growth+)
	DecisionTimeline bool // Can see full decision timeline/episodes (Growth+)
	Learning         bool // Cross-decision learning and patterns (Enterprise)
	Exports          bool // PDF/report exports (Enterprise)
}

// Plan limits configuration (hardcoded) - SINGLE SOURCE OF TRUTH
var planLimitsConfig = map[string]PlanLimits{
	model.PlanFree: {
		MaxCompetitors:      1,
		MaxPlans:            3,
		MaxAnalysesPerMonth: 0, // Not used for free plan
		MaxAnalysesTotal:    2, // Lifetime limit
		TrialDays:           14,
		IsUnlimited:         false,
		// AI Insight Credits
		MonthlyAICredits:   3,
		SimulationsEnabled: false,
		// Decision Intelligence limits
		DecisionsPerMonth: 3,
		ScenariosPerMonth: 3,
		Features: PlanFeatures{
			OutcomeKPIs:      false, // Notes-only outcomes
			DecisionTimeline: false,
			Learning:         false,
			Exports:          false,
		},
	},
	model.PlanStarter: {
		MaxCompetitors:      3,
		MaxPlans:            3,
		MaxAnalysesPerMonth: 5,
		MaxAnalysesTotal:    0, // Unlimited lifetime
		TrialDays:           0, // No trial for paid plans
		IsUnlimited:         false,
		// AI Insight Credits
		MonthlyAICredits:   5,
		SimulationsEnabled: false,
		// Decision Intelligence limits
		DecisionsPerMonth: 3,
		ScenariosPerMonth: 3,
		Features: PlanFeatures{
			OutcomeKPIs:      false, // Notes-only outcomes
			DecisionTimeline: false,
			Learning:         false,
			Exports:          false,
		},
	},
	model.PlanGrowth: {
		MaxCompetitors:      5,
		MaxPlans:            5,
		MaxAnalysesPerMonth: 10,
		MaxAnalysesTotal:    0,
		TrialDays:           0,
		IsUnlimited:         false,
		// AI Insight Credits
		MonthlyAICredits:   20,
		SimulationsEnabled: true,
		// Decision Intelligence limits
		DecisionsPerMonth: 10,
		ScenariosPerMonth: 10,
		Features: PlanFeatures{
			OutcomeKPIs:      true, // Can track measurable KPIs
			DecisionTimeline: true, // Decision timeline/episodes
			Learning:         false,
			Exports:          false,
		},
	},
	model.PlanEnterprise: {
		MaxCompetitors:      10,
		MaxPlans:            7,
		MaxAnalysesPerMonth: 20,
		MaxAnalysesTotal:    0,
		TrialDays:           0,
		IsUnlimited:         false,
		// AI Insight Credits
		MonthlyAICredits:   100,
		SimulationsEnabled: true,
		// Decision Intelligence limits
		DecisionsPerMonth: 50,
		ScenariosPerMonth: 50,
		Features: PlanFeatures{
			OutcomeKPIs:      true,
			DecisionTimeline: true,
			Learning:         true, // Cross-decision learning
			Exports:          true, // PDF/reports
		},
	},
	model.PlanAdmin: {
		MaxCompetitors:      0,
		MaxPlans:            0,
		MaxAnalysesPerMonth: 0,
		MaxAnalysesTotal:    0,
		TrialDays:           0,
		IsUnlimited:         true,
		// AI Insight Credits - unlimited for admin
		MonthlyAICredits:   9999,
		SimulationsEnabled: true,
		// Decision Intelligence limits - unlimited
		DecisionsPerMonth: 0, // 0 = unlimited when IsUnlimited=true
		ScenariosPerMonth: 0,
		Features: PlanFeatures{
			OutcomeKPIs:      true,
			DecisionTimeline: true,
			Learning:         true,
			Exports:          true,
		},
	},
	model.PlanInvestor: {
		MaxCompetitors:      0,
		MaxPlans:            0,
		MaxAnalysesPerMonth: 0,
		MaxAnalysesTotal:    0,
		TrialDays:           0,
		IsUnlimited:         true,
		// AI Insight Credits - unlimited for investor (same as admin)
		MonthlyAICredits:   9999,
		SimulationsEnabled: true,
		// Decision Intelligence limits - unlimited
		DecisionsPerMonth: 0,
		ScenariosPerMonth: 0,
		Features: PlanFeatures{
			OutcomeKPIs:      true,
			DecisionTimeline: true,
			Learning:         true,
			Exports:          true,
		},
	},
}

// GetPlanLimits returns the limits for a given plan.
// If the plan is not found, returns free plan limits.
func GetPlanLimits(plan string) PlanLimits {
	if plan == "" {
		plan = model.PlanFree
	}

	limits, exists := planLimitsConfig[plan]
	if !exists {
		return planLimitsConfig[model.PlanFree]
	}

	return limits
}

// GetAllPlanLimits returns all plan limits (useful for API responses).
func GetAllPlanLimits() map[string]PlanLimits {
	return planLimitsConfig
}



