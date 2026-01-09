package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ScenarioID represents the type of scenario
type ScenarioID string

const (
	ScenarioAggressive   ScenarioID = "aggressive"
	ScenarioBalanced     ScenarioID = "balanced"
	ScenarioConservative ScenarioID = "conservative"
	ScenarioDoNothing    ScenarioID = "do_nothing"
)

// ValidScenarioIDs lists all valid scenario identifiers
var ValidScenarioIDs = []ScenarioID{
	ScenarioAggressive,
	ScenarioBalanced,
	ScenarioConservative,
	ScenarioDoNothing,
}

// IsValidScenarioID checks if a scenario ID is valid
func IsValidScenarioID(id string) bool {
	for _, v := range ValidScenarioIDs {
		if string(v) == id {
			return true
		}
	}
	return false
}

// ScenarioMetrics contains bounded metric ranges
type ScenarioMetrics struct {
	RevenueImpactRange string `json:"revenueImpactRange" bson:"revenue_impact_range"`
	ChurnImpactRange   string `json:"churnImpactRange" bson:"churn_impact_range"`
	RiskLabel          string `json:"riskLabel" bson:"risk_label"`       // "low", "medium", "high"
	TimeToImpact       string `json:"timeToImpact" bson:"time_to_impact"` // "30-60 days", "N/A"
	ExecutionEffort    string `json:"executionEffort" bson:"execution_effort"` // "low", "medium", "high"
}

// ScenarioDeltas contains metric deltas compared to baseline (balanced) scenario
type ScenarioDeltas struct {
	RevenueDelta string `json:"revenueDelta" bson:"revenue_delta"` // e.g., "+10-15% more" or "-5-10% less"
	ChurnDelta   string `json:"churnDelta" bson:"churn_delta"`
	RiskDelta    string `json:"riskDelta" bson:"risk_delta"`       // e.g., "Higher" or "Lower"
	TimeDelta    string `json:"timeDelta" bson:"time_delta"`       // e.g., "2-4 weeks faster" or "N/A"
	EffortDelta  string `json:"effortDelta" bson:"effort_delta"`   // e.g., "Higher" or "Lower"
}

// ScenarioDetails contains detailed narrative content
type ScenarioDetails struct {
	WhatItLooksLike          []string `json:"whatItLooksLike" bson:"what_it_looks_like"`                     // 3-5 phased steps
	OperationalImplications  []string `json:"operationalImplications" bson:"operational_implications"`      // 3 bullets: team, engineering, support
	FailureModes             []string `json:"failureModes" bson:"failure_modes"`                             // 2-3 specific risks
	WhenItMakesSense         string   `json:"whenItMakesSense" bson:"when_it_makes_sense"`                   // paragraph
	SuccessMetrics           []string `json:"successMetrics" bson:"success_metrics"`                         // 3 bullets: what to monitor
	AffectedPersonas         []string `json:"affectedPersonas" bson:"affected_personas"`                     // who is impacted
	WhatChangesVsBaseline    string   `json:"whatChangesVsBaseline" bson:"what_changes_vs_baseline"`         // explicit comparison paragraph
}

// ScenarioItem represents a single scenario
type ScenarioItem struct {
	ScenarioID            ScenarioID      `json:"scenarioId" bson:"scenario_id"`
	Title                 string          `json:"title" bson:"title"`
	Summary               string          `json:"summary" bson:"summary"`
	Positioning           string          `json:"positioning" bson:"positioning"`     // e.g., "Max upside, highest volatility"
	BestWhen              string          `json:"bestWhen" bson:"best_when"`           // e.g., "Best when you have runway to experiment"
	Metrics               ScenarioMetrics `json:"metrics" bson:"metrics"`
	Deltas                ScenarioDeltas  `json:"deltas" bson:"deltas"`               // delta vs baseline
	Tradeoffs             []string        `json:"tradeoffs" bson:"tradeoffs"`         // exactly 3 bullet points
	Details               ScenarioDetails `json:"details" bson:"details"`
	ComparedToRecommended string          `json:"comparedToRecommended" bson:"compared_to_recommended"`
	IsBaseline            bool            `json:"isBaseline" bson:"is_baseline"`       // true for balanced
}

// ScenarioModelMeta stores AI model metadata for scenario generation
type ScenarioModelMeta struct {
	ModelName           string `json:"modelName" bson:"model_name"`
	PromptVersion       string `json:"promptVersion" bson:"prompt_version"`
	InferenceDurationMs int64  `json:"inferenceDurationMs" bson:"inference_duration_ms"`
}

// ScenarioSet represents a complete set of scenarios for a decision
type ScenarioSet struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID      primitive.ObjectID `json:"userId" bson:"user_id"`
	WorkspaceID primitive.ObjectID `json:"workspaceId,omitempty" bson:"workspace_id,omitempty"`
	DecisionID  primitive.ObjectID `json:"decisionId" bson:"decision_id"`
	Version     int                `json:"version" bson:"version"`

	// Scenario payload
	Scenarios []ScenarioItem `json:"scenarios" bson:"scenarios"`

	// Metadata
	ModelMeta ScenarioModelMeta `json:"modelMeta" bson:"model_meta"`

	// Soft delete
	IsDeleted bool       `json:"isDeleted" bson:"is_deleted"`
	DeletedAt *time.Time `json:"deletedAt,omitempty" bson:"deleted_at,omitempty"`

	CreatedAt time.Time `json:"createdAt" bson:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" bson:"updated_at"`
}

// Request/Response types

// GenerateScenariosRequest for generating scenarios
type GenerateScenariosRequest struct {
	Force bool `json:"force"`
}

// ChooseScenarioRequest for selecting a scenario
type ChooseScenarioRequest struct {
	ChosenScenarioID string `json:"chosenScenarioId"`
}

// ScenarioSetResponse for API responses
type ScenarioSetResponse struct {
	ID         primitive.ObjectID `json:"id"`
	DecisionID primitive.ObjectID `json:"decisionId"`
	Version    int                `json:"version"`
	Scenarios  []ScenarioItem     `json:"scenarios"`
	ModelMeta  ScenarioModelMeta  `json:"modelMeta"`
	CreatedAt  time.Time          `json:"createdAt"`
}

// OpenAI response types for structured JSON parsing

// OpenAIScenarioMetrics matches expected OpenAI output
type OpenAIScenarioMetrics struct {
	RevenueImpactRange string `json:"revenue_impact_range"`
	ChurnImpactRange   string `json:"churn_impact_range"`
	RiskLabel          string `json:"risk_label"`
	TimeToImpact       string `json:"time_to_impact"`
	ExecutionEffort    string `json:"execution_effort"`
}

// OpenAIScenarioDeltas matches expected OpenAI output for deltas
type OpenAIScenarioDeltas struct {
	RevenueDelta string `json:"revenue_delta"`
	ChurnDelta   string `json:"churn_delta"`
	RiskDelta    string `json:"risk_delta"`
	TimeDelta    string `json:"time_delta"`
	EffortDelta  string `json:"effort_delta"`
}

// OpenAIScenarioDetails matches expected OpenAI output
type OpenAIScenarioDetails struct {
	WhatItLooksLike         []string `json:"what_it_looks_like"`
	OperationalImplications []string `json:"operational_implications"`
	FailureModes            []string `json:"failure_modes"`
	WhenItMakesSense        string   `json:"when_it_makes_sense"`
	SuccessMetrics          []string `json:"success_metrics"`
	AffectedPersonas        []string `json:"affected_personas"`
	WhatChangesVsBaseline   string   `json:"what_changes_vs_baseline"`
}

// OpenAIScenarioItem matches expected OpenAI output
type OpenAIScenarioItem struct {
	ScenarioID            string                `json:"scenario_id"`
	Title                 string                `json:"title"`
	Summary               string                `json:"summary"`
	Positioning           string                `json:"positioning"`
	BestWhen              string                `json:"best_when"`
	Metrics               OpenAIScenarioMetrics `json:"metrics"`
	Deltas                OpenAIScenarioDeltas  `json:"deltas"`
	Tradeoffs             []string              `json:"tradeoffs"`
	Details               OpenAIScenarioDetails `json:"details"`
	ComparedToRecommended string                `json:"compared_to_recommended"`
}

// OpenAIScenariosResponse is the expected root response from OpenAI
type OpenAIScenariosResponse struct {
	Scenarios []OpenAIScenarioItem `json:"scenarios"`
}

