package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYSIS ENGINE V2 - CANONICAL INPUT MODELS
// ═══════════════════════════════════════════════════════════════════════════════

// PricingPlanInput represents a user's pricing plan for analysis.
type PricingPlanInput struct {
	ID       string  `json:"id,omitempty" bson:"id,omitempty"`
	Name     string  `json:"name" bson:"name"`
	Price    float64 `json:"price" bson:"price"`
	Currency string  `json:"currency" bson:"currency"`
	Billing  string  `json:"billing" bson:"billing"` // "monthly", "yearly", "one-time"
}

// CompetitorPlanInput represents a competitor's pricing plan.
type CompetitorPlanInput struct {
	Name     string  `json:"name" bson:"name"`
	Price    float64 `json:"price" bson:"price"`
	Currency string  `json:"currency,omitempty" bson:"currency,omitempty"`
	Billing  string  `json:"billing,omitempty" bson:"billing,omitempty"`
}

// CompetitorInput represents a competitor with their plans.
type CompetitorInput struct {
	Name  string                `json:"name" bson:"name"`
	Plans []CompetitorPlanInput `json:"plans" bson:"plans"`
}

// BusinessMetricsInput represents the user's business metrics.
type BusinessMetricsInput struct {
	MRR             float64  `json:"mrr" bson:"mrr"`
	ARR             float64  `json:"arr" bson:"arr"`
	ChurnRate       float64  `json:"churn_rate" bson:"churn_rate"`
	Customers       int      `json:"customers,omitempty" bson:"customers,omitempty"`
	Currency        string   `json:"currency,omitempty" bson:"currency,omitempty"`
	TargetARRGrowth *float64 `json:"target_arr_growth,omitempty" bson:"target_arr_growth,omitempty"`
	PricingGoal     string   `json:"pricing_goal,omitempty" bson:"pricing_goal,omitempty"`
}

// AnalysisInputV2 is the canonical input for the V2 analysis engine.
type AnalysisInputV2 struct {
	UserPlans       []PricingPlanInput   `json:"user_plans" bson:"user_plans"`
	Competitors     []CompetitorInput    `json:"competitors" bson:"competitors"`
	BusinessMetrics BusinessMetricsInput `json:"business_metrics" bson:"business_metrics"`
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE ENGINE OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

// RuleEngineInsight represents a single deterministic insight from the rule engine.
type RuleEngineInsight struct {
	Code        string `json:"code" bson:"code"`               // e.g., "HIGH_CHURN", "TIER_NAMING_MISMATCH"
	Title       string `json:"title" bson:"title"`             // Human-readable title
	Description string `json:"description" bson:"description"` // Detailed explanation
	Severity    string `json:"severity" bson:"severity"`       // "info", "warning", "critical"
	Category    string `json:"category" bson:"category"`       // "retention", "pricing", "structure", "competitive"
}

// RuleEngineResult contains all deterministic insights from the rule engine.
type RuleEngineResult struct {
	Insights        []RuleEngineInsight `json:"insights" bson:"insights"`
	NumPlans        int                 `json:"num_plans" bson:"num_plans"`
	NumCompetitors  int                 `json:"num_competitors" bson:"num_competitors"`
	ChurnCategory   string              `json:"churn_category" bson:"churn_category"`     // "low", "moderate", "high", "critical"
	PriceSpread     string              `json:"price_spread" bson:"price_spread"`         // "compressed", "healthy", "polarized"
	HasCompetitors  bool                `json:"has_competitors" bson:"has_competitors"`
	HasMetrics      bool                `json:"has_metrics" bson:"has_metrics"`
}

// ═══════════════════════════════════════════════════════════════════════════════
// LLM STRUCTURED OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

// LLMPricingInsight represents a single pricing insight from the LLM.
type LLMPricingInsight struct {
	Title string `json:"title" bson:"title"`
	Body  string `json:"body" bson:"body"`
}

// LLMRecommendation represents a single recommendation from the LLM.
type LLMRecommendation struct {
	Action string `json:"action" bson:"action"`
	Reason string `json:"reason" bson:"reason"`
}

// LLMAnalysisOutput is the structured output from the LLM.
type LLMAnalysisOutput struct {
	ExecutiveSummary string              `json:"executive_summary" bson:"executive_summary"`
	PricingInsights  []LLMPricingInsight `json:"pricing_insights" bson:"pricing_insights"`
	Recommendations  []LLMRecommendation `json:"recommendations" bson:"recommendations"`
	RiskAnalysis     []string            `json:"risk_analysis" bson:"risk_analysis"`

	// SuggestedNextActions contains LLM-worded action items (added in V2.1)
	// These are based on pre-selected templates, not invented by LLM
	SuggestedNextActions []SuggestedNextAction `json:"suggested_next_actions,omitempty" bson:"suggested_next_actions,omitempty"`
}

// SuggestedNextAction represents a single actionable next step.
// The action code is deterministic; LLM only provides polished wording.
type SuggestedNextAction struct {
	Code        string `json:"code" bson:"code"`               // Canonical action code (e.g., "TEST_STARTER_PRICE_INCREASE")
	Title       string `json:"title" bson:"title"`             // Human-readable action title
	Description string `json:"description" bson:"description"` // Brief explanation of why this action matters
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINED ANALYSIS RESULT V2
// ═══════════════════════════════════════════════════════════════════════════════

// AnalysisResultV2 is the complete output of the V2 analysis engine.
type AnalysisResultV2 struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID     primitive.ObjectID `bson:"user_id" json:"user_id"`
	CreatedAt  time.Time          `bson:"created_at" json:"created_at"`

	// Input data (stored for reference/reproducibility)
	Input AnalysisInputV2 `bson:"input" json:"input"`

	// Deterministic rule engine results
	RuleResult RuleEngineResult `bson:"rule_result" json:"rule_result"`

	// LLM-generated commentary (structured)
	LLMOutput LLMAnalysisOutput `bson:"llm_output" json:"llm_output"`

	// Version marker for future compatibility
	Version string `bson:"version" json:"version"` // "2.0"
}

