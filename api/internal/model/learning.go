package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// LearningInsight represents aggregated learning from past decisions
type LearningInsight struct {
	ID primitive.ObjectID `json:"id" bson:"_id,omitempty"`

	// Aggregation keys
	CompanyStage  string `json:"companyStage" bson:"company_stage"`   // "pre_seed", "seed", "series_a", etc.
	PrimaryKPI    string `json:"primaryKpi" bson:"primary_kpi"`       // "mrr_growth", "churn_reduction", etc.
	DecisionType  string `json:"decisionType" bson:"decision_type"`   // Derived from verdict recommendation type
	ScenarioType  string `json:"scenarioType" bson:"scenario_type"`   // "aggressive", "balanced", "conservative", "do_nothing"

	// Aggregated metrics
	SampleSize    int     `json:"sampleSize" bson:"sample_size"`       // Number of decisions in this cohort
	SuccessRate   float64 `json:"successRate" bson:"success_rate"`     // % of outcomes with status "achieved"
	AverageDelta  float64 `json:"averageDelta" bson:"average_delta"`   // Average delta% across KPIs
	MissRate      float64 `json:"missRate" bson:"miss_rate"`           // % of outcomes with status "missed"

	// Confidence based on sample size
	Confidence string `json:"confidence" bson:"confidence"` // "low" (<5), "medium" (5-15), "high" (>15)

	// Time bounds
	OldestOutcomeAt time.Time `json:"oldestOutcomeAt" bson:"oldest_outcome_at"`
	NewestOutcomeAt time.Time `json:"newestOutcomeAt" bson:"newest_outcome_at"`

	// Timestamps
	CreatedAt time.Time `json:"createdAt" bson:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" bson:"updated_at"`
}

// VerdictLearningContext stores learning metadata attached to a verdict
type VerdictLearningContext struct {
	// Historical signals used when generating this verdict
	HistoricalSignals []HistoricalSignal `json:"historicalSignals,omitempty" bson:"historical_signals,omitempty"`

	// Confidence boost from historical data
	ConfidenceBoost float64 `json:"confidenceBoost" bson:"confidence_boost"` // Additional confidence from learning

	// Summary for display
	LearningSummary string `json:"learningSummary,omitempty" bson:"learning_summary,omitempty"`
}

// HistoricalSignal represents a single learning signal
type HistoricalSignal struct {
	Description    string  `json:"description" bson:"description"`         // "In similar decisions, aggressive path succeeded 72% of the time"
	SampleSize     int     `json:"sampleSize" bson:"sample_size"`          // How many past decisions
	SuccessRate    float64 `json:"successRate" bson:"success_rate"`        // 0.0 - 1.0
	AverageDelta   float64 `json:"averageDelta" bson:"average_delta"`      // Average outcome delta
	Relevance      string  `json:"relevance" bson:"relevance"`             // "high", "medium", "low"
	MatchingFields []string `json:"matchingFields" bson:"matching_fields"` // ["company_stage", "primary_kpi"]
}

// LearningAggregationKey represents the grouping for learning aggregation
type LearningAggregationKey struct {
	CompanyStage string `json:"companyStage" bson:"company_stage"`
	PrimaryKPI   string `json:"primaryKpi" bson:"primary_kpi"`
	ScenarioType string `json:"scenarioType" bson:"scenario_type"`
}

// OutcomeAggregate represents aggregated outcome data for learning
type OutcomeAggregate struct {
	Key           LearningAggregationKey `json:"key" bson:"_id"`
	Count         int                    `json:"count" bson:"count"`
	AchievedCount int                    `json:"achievedCount" bson:"achieved_count"`
	MissedCount   int                    `json:"missedCount" bson:"missed_count"`
	TotalDelta    float64                `json:"totalDelta" bson:"total_delta"`
}

// LearningIndicator for frontend display
type LearningIndicator struct {
	Type        string `json:"type"`        // "confidence_boost", "historical_success", "similar_cases"
	Title       string `json:"title"`       // "Confidence boosted by past outcomes"
	Description string `json:"description"` // "72% success rate in similar decisions"
	SampleSize  int    `json:"sampleSize"`  // 15
	Relevance   string `json:"relevance"`   // "high", "medium", "low"
}

// LearningResponse for API
type LearningResponse struct {
	Indicators      []LearningIndicator `json:"indicators"`
	ConfidenceBoost float64             `json:"confidenceBoost"`
	Summary         string              `json:"summary,omitempty"`
}

