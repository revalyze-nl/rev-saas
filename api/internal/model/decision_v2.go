package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ContextSource indicates where a context value came from
type ContextSource string

const (
	ContextSourceUser      ContextSource = "user"
	ContextSourceWorkspace ContextSource = "workspace"
	ContextSourceInferred  ContextSource = "inferred"
)

// Decision status constants
const (
	DecisionStatusPending   = "pending"
	DecisionStatusApproved  = "approved"
	DecisionStatusRejected  = "rejected"
	DecisionStatusDeferred  = "deferred"
	DecisionStatusCompleted = "completed"
)

// ContextField represents a single context value with attribution
type ContextField struct {
	Value           *string       `json:"value" bson:"value"`
	Source          ContextSource `json:"source" bson:"source"`
	ConfidenceScore *float64      `json:"confidenceScore,omitempty" bson:"confidence_score,omitempty"`
	InferredSignal  *string       `json:"inferredSignal,omitempty" bson:"inferred_signal,omitempty"`
}

// MarketContext represents market type and segment with attribution
type MarketContext struct {
	Type    ContextField `json:"type" bson:"type"`
	Segment ContextField `json:"segment" bson:"segment"`
}

// DecisionContextV2 represents the full context for a decision
type DecisionContextV2 struct {
	CompanyStage  ContextField  `json:"companyStage" bson:"company_stage"`
	BusinessModel ContextField  `json:"businessModel" bson:"business_model"`
	PrimaryKPI    ContextField  `json:"primaryKpi" bson:"primary_kpi"`
	Market        MarketContext `json:"market" bson:"market"`
}

// ContextVersion represents a versioned snapshot of context
type ContextVersion struct {
	Version   int                `json:"version" bson:"version"`
	Context   DecisionContextV2  `json:"context" bson:"context"`
	Reason    string             `json:"reason,omitempty" bson:"reason,omitempty"`
	CreatedAt time.Time          `json:"createdAt" bson:"created_at"`
	CreatedBy primitive.ObjectID `json:"createdBy,omitempty" bson:"created_by,omitempty"`
}

// WhatToExpectV2 with numeric scores
type WhatToExpectV2 struct {
	RiskScore   float64 `json:"riskScore" bson:"risk_score"`
	RiskLabel   string  `json:"riskLabel" bson:"risk_label"`
	Description string  `json:"description" bson:"description"`
}

// SupportingDetailsV2 for verdict
type SupportingDetailsV2 struct {
	ExpectedRevenueImpact string `json:"expectedRevenueImpact" bson:"expected_revenue_impact"`
	ChurnOutlook          string `json:"churnOutlook" bson:"churn_outlook"`
	MarketPositioning     string `json:"marketPositioning" bson:"market_positioning"`
}

// DecisionSnapshotV2 provides a 30-second overview at the top
type DecisionSnapshotV2 struct {
	RevenueImpactRange string `json:"revenueImpactRange" bson:"revenue_impact_range"`
	PrimaryRiskLevel   string `json:"primaryRiskLevel" bson:"primary_risk_level"`
	PrimaryRiskExplain string `json:"primaryRiskExplain" bson:"primary_risk_explain"`
	TimeToImpact       string `json:"timeToImpact" bson:"time_to_impact"`
	ExecutionEffort    string `json:"executionEffort" bson:"execution_effort"`
	Reversibility      string `json:"reversibility" bson:"reversibility"`
}

// PersonalizationSignalsV2 contains explicit personalization cues
type PersonalizationSignalsV2 struct {
	PricingPageInsight    string `json:"pricingPageInsight" bson:"pricing_page_insight"`
	CompanyStageInsight   string `json:"companyStageInsight" bson:"company_stage_insight"`
	CompetitorInsight     string `json:"competitorInsight" bson:"competitor_insight"`
	KPIInsight            string `json:"kpiInsight" bson:"kpi_insight"`
	MarketPositionInsight string `json:"marketPositionInsight" bson:"market_position_insight"`
}

// ExecutionChecklistV2 provides operational next steps
type ExecutionChecklistV2 struct {
	Next14Days     []string `json:"next14Days" bson:"next_14_days"`
	Next30To60Days []string `json:"next30To60Days" bson:"next_30_to_60_days"`
	SuccessMetrics []string `json:"successMetrics" bson:"success_metrics"`
}

// ExecutiveVerdictV2 contains the board-level decision summary
type ExecutiveVerdictV2 struct {
	Recommendation string `json:"recommendation" bson:"recommendation"`
	DecisionType   string `json:"decisionType" bson:"decision_type"`
	TimeHorizon    string `json:"timeHorizon" bson:"time_horizon"`
	ScopeOfImpact  string `json:"scopeOfImpact" bson:"scope_of_impact"`
}

// IfYouProceedV2 describes expected outcomes if decision is taken
type IfYouProceedV2 struct {
	ExpectedUpside   []string `json:"expectedUpside" bson:"expected_upside"`
	SecondaryEffects []string `json:"secondaryEffects" bson:"secondary_effects"`
}

// IfYouDoNotActV2 describes opportunity cost and inaction risks
type IfYouDoNotActV2 struct {
	WhatStagnates       string `json:"whatStagnates" bson:"what_stagnates"`
	CompetitorAdvantage string `json:"competitorAdvantage" bson:"competitor_advantage"`
	FutureDifficulty    string `json:"futureDifficulty" bson:"future_difficulty"`
}

// AlternativeConsideredV2 represents a rejected alternative
type AlternativeConsideredV2 struct {
	Name           string `json:"name" bson:"name"`
	WhyNotSelected string `json:"whyNotSelected" bson:"why_not_selected"`
}

// RiskAnalysisV2 contains detailed risk assessment
type RiskAnalysisV2 struct {
	RiskLevel      string `json:"riskLevel" bson:"risk_level"`
	WhoIsAffected  string `json:"whoIsAffected" bson:"who_is_affected"`
	HowItManifests string `json:"howItManifests" bson:"how_it_manifests"`
	WhyAcceptable  string `json:"whyAcceptable" bson:"why_acceptable"`
}

// WhyThisFitsV2 explains personalization anchors
type WhyThisFitsV2 struct {
	CompanyStageReason  string `json:"companyStageReason" bson:"company_stage_reason"`
	BusinessModelReason string `json:"businessModelReason" bson:"business_model_reason"`
	MarketSegmentReason string `json:"marketSegmentReason" bson:"market_segment_reason"`
	PrimaryKPIReason    string `json:"primaryKpiReason" bson:"primary_kpi_reason"`
}

// VerdictV2 represents the AI-generated verdict with numeric confidence
type VerdictV2 struct {
	Headline          string              `json:"headline" bson:"headline"`
	Summary           string              `json:"summary" bson:"summary"`
	ConfidenceScore   float64             `json:"confidenceScore" bson:"confidence_score"`
	ConfidenceLabel   string              `json:"confidenceLabel" bson:"confidence_label"`
	CTA               string              `json:"cta" bson:"cta"`
	WhyThisDecision   []string            `json:"whyThisDecision" bson:"why_this_decision"`
	WhatToExpect      WhatToExpectV2      `json:"whatToExpect" bson:"what_to_expect"`
	SupportingDetails SupportingDetailsV2 `json:"supportingDetails" bson:"supporting_details"`
	// Premium V2 fields - Decision Snapshot (30-second overview)
	DecisionSnapshot       *DecisionSnapshotV2       `json:"decisionSnapshot,omitempty" bson:"decision_snapshot,omitempty"`
	PersonalizationSignals *PersonalizationSignalsV2 `json:"personalizationSignals,omitempty" bson:"personalization_signals,omitempty"`
	ExecutiveVerdict       *ExecutiveVerdictV2       `json:"executiveVerdict,omitempty" bson:"executive_verdict,omitempty"`
	IfYouProceed           *IfYouProceedV2           `json:"ifYouProceed,omitempty" bson:"if_you_proceed,omitempty"`
	IfYouDoNotAct          *IfYouDoNotActV2          `json:"ifYouDoNotAct,omitempty" bson:"if_you_do_not_act,omitempty"`
	AlternativesConsidered []AlternativeConsideredV2 `json:"alternativesConsidered,omitempty" bson:"alternatives_considered,omitempty"`
	RiskAnalysis           *RiskAnalysisV2          `json:"riskAnalysis,omitempty" bson:"risk_analysis,omitempty"`
	WhyThisFits            *WhyThisFitsV2           `json:"whyThisFits,omitempty" bson:"why_this_fits,omitempty"`
	ExecutionChecklist     *ExecutionChecklistV2    `json:"executionChecklist,omitempty" bson:"execution_checklist,omitempty"`
	ExecutionNote          string                   `json:"executionNote,omitempty" bson:"execution_note,omitempty"`
}

// VerdictVersion represents a versioned snapshot of verdict
type VerdictVersion struct {
	Version   int                `json:"version" bson:"version"`
	Verdict   VerdictV2          `json:"verdict" bson:"verdict"`
	Reason    string             `json:"reason,omitempty" bson:"reason,omitempty"`
	CreatedAt time.Time          `json:"createdAt" bson:"created_at"`
	CreatedBy primitive.ObjectID `json:"createdBy" bson:"created_by"`
}

// ExpectedImpactV2 for decision
type ExpectedImpactV2 struct {
	RevenueRange        string `json:"revenueRange" bson:"revenue_range"`
	ChurnNote           string `json:"churnNote" bson:"churn_note"`
	ConfidenceRationale string `json:"confidenceRationale" bson:"confidence_rationale"`
}

// StatusEventV2 represents a status change event
type StatusEventV2 struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Status        string             `json:"status" bson:"status"`
	Reason        string             `json:"reason,omitempty" bson:"reason,omitempty"`
	ImplementedAt *time.Time         `json:"implementedAt,omitempty" bson:"implemented_at,omitempty"`
	RollbackAt    *time.Time         `json:"rollbackAt,omitempty" bson:"rollback_at,omitempty"`
	CreatedBy     primitive.ObjectID `json:"createdBy" bson:"created_by"`
	CreatedAt     time.Time          `json:"createdAt" bson:"created_at"`
}

// OutcomeV2 represents a measured outcome with correction support
type OutcomeV2 struct {
	ID                primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	OutcomeType       string              `json:"outcomeType" bson:"outcome_type"`
	TimeframeDays     int                 `json:"timeframeDays" bson:"timeframe_days"`
	MetricName        string              `json:"metricName" bson:"metric_name"`
	MetricBefore      *float64            `json:"metricBefore" bson:"metric_before"`
	MetricAfter       *float64            `json:"metricAfter" bson:"metric_after"`
	DeltaPercent      *float64            `json:"deltaPercent" bson:"delta_percent"`
	Notes             string              `json:"notes" bson:"notes"`
	EvidenceURL       string              `json:"evidenceUrl,omitempty" bson:"evidence_url,omitempty"`
	IsCorrection      bool                `json:"isCorrection" bson:"is_correction"`
	CorrectsOutcomeID *primitive.ObjectID `json:"correctsOutcomeId,omitempty" bson:"corrects_outcome_id,omitempty"`
	CorrectionReason  string              `json:"correctionReason,omitempty" bson:"correction_reason,omitempty"`
	CreatedBy         primitive.ObjectID  `json:"createdBy" bson:"created_by"`
	CreatedAt         time.Time           `json:"createdAt" bson:"created_at"`
}

// InferenceSignal represents a detected signal from website
type InferenceSignal struct {
	Signal     string  `json:"signal" bson:"signal"`
	Confidence float64 `json:"confidence" bson:"confidence"`
}

// InferenceArtifacts stores debugging info about AI inference
type InferenceArtifacts struct {
	ScrapedAt        *time.Time        `json:"scrapedAt,omitempty" bson:"scraped_at,omitempty"`
	PricingPageFound bool              `json:"pricingPageFound" bson:"pricing_page_found"`
	SignalsDetected  []InferenceSignal `json:"signalsDetected" bson:"signals_detected"`
}

// ModelMetaV2 stores AI model metadata
type ModelMetaV2 struct {
	ModelName           string `json:"modelName" bson:"model_name"`
	PromptVersion       string `json:"promptVersion" bson:"prompt_version"`
	InferenceDurationMs int64  `json:"inferenceDurationMs" bson:"inference_duration_ms"`
	WebsiteContentHash  string `json:"websiteContentHash,omitempty" bson:"website_content_hash,omitempty"`
}

// DecisionV2 is the main decision document with versioning support
type DecisionV2 struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID      primitive.ObjectID `json:"userId" bson:"user_id"`
	WorkspaceID primitive.ObjectID `json:"workspaceId,omitempty" bson:"workspace_id,omitempty"`

	// Target company
	CompanyName string `json:"companyName" bson:"company_name"`
	WebsiteURL  string `json:"websiteUrl" bson:"website_url"`

	// Current verdict
	VerdictVersion  int              `json:"verdictVersion" bson:"verdict_version"`
	Verdict         VerdictV2        `json:"verdict" bson:"verdict"`
	VerdictVersions []VerdictVersion `json:"verdictVersions" bson:"verdict_versions"`

	// Current context
	ContextVersion  int               `json:"contextVersion" bson:"context_version"`
	Context         DecisionContextV2 `json:"context" bson:"context"`
	ContextVersions []ContextVersion  `json:"contextVersions" bson:"context_versions"`

	// Status
	Status       string          `json:"status" bson:"status"`
	StatusEvents []StatusEventV2 `json:"statusEvents" bson:"status_events"`

	// Impact
	ExpectedImpact ExpectedImpactV2 `json:"expectedImpact" bson:"expected_impact"`

	// Outcomes
	Outcomes []OutcomeV2 `json:"outcomes" bson:"outcomes"`

	// Metadata
	ModelMeta          ModelMetaV2         `json:"modelMeta" bson:"model_meta"`
	InferenceArtifacts *InferenceArtifacts `json:"inferenceArtifacts,omitempty" bson:"inference_artifacts,omitempty"`
	InferenceSignals   []InferenceSignal   `json:"inferenceSignals,omitempty" bson:"inference_signals,omitempty"`

	// Scenarios
	ScenariosID      *primitive.ObjectID `json:"scenariosId,omitempty" bson:"scenarios_id,omitempty"`
	ChosenScenarioID *string             `json:"chosenScenarioId,omitempty" bson:"chosen_scenario_id,omitempty"`
	ChosenScenarioAt *time.Time          `json:"chosenScenarioAt,omitempty" bson:"chosen_scenario_at,omitempty"`

	// Measurable Outcome
	OutcomeID     *primitive.ObjectID `json:"outcomeId,omitempty" bson:"outcome_id,omitempty"`
	EpisodeStatus string              `json:"episodeStatus" bson:"episode_status"` // draft, explored, path_chosen, outcome_saved

	// Soft delete
	IsDeleted bool       `json:"isDeleted" bson:"is_deleted"`
	DeletedAt *time.Time `json:"deletedAt,omitempty" bson:"deleted_at,omitempty"`

	CreatedAt time.Time `json:"createdAt" bson:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" bson:"updated_at"`
}

// DecisionListItemV2 is a lightweight version for list responses
type DecisionListItemV2 struct {
	ID              primitive.ObjectID `json:"id" bson:"_id"`
	CompanyName     string             `json:"companyName" bson:"company_name"`
	WebsiteURL      string             `json:"websiteUrl" bson:"website_url"`
	VerdictHeadline string             `json:"verdictHeadline" bson:"verdict_headline"`
	VerdictSummary  string             `json:"verdictSummary" bson:"verdict_summary"`
	ConfidenceScore float64            `json:"confidenceScore" bson:"confidence_score"`
	ConfidenceLabel string             `json:"confidenceLabel" bson:"confidence_label"`
	RiskScore       float64            `json:"riskScore" bson:"risk_score"`
	RiskLabel       string             `json:"riskLabel" bson:"risk_label"`
	Status          string             `json:"status" bson:"status"`
	EpisodeStatus   string             `json:"episodeStatus" bson:"episode_status"`
	Context         DecisionContextV2  `json:"context" bson:"context"`
	OutcomeSummary  string             `json:"outcomeSummary,omitempty" bson:"outcome_summary,omitempty"`
	// Scenario info
	HasScenarios     bool    `json:"hasScenarios" bson:"-"`
	ScenariosCount   int     `json:"scenariosCount" bson:"-"`
	ChosenScenarioID *string `json:"chosenScenarioId,omitempty" bson:"chosen_scenario_id,omitempty"`
	ChosenScenarioName string `json:"chosenScenarioName,omitempty" bson:"-"`
	// Outcome info
	HasOutcome     bool   `json:"hasOutcome" bson:"-"`
	OutcomeStatus  string `json:"outcomeStatus,omitempty" bson:"-"`
	CreatedAt      time.Time `json:"createdAt" bson:"created_at"`
	UpdatedAt      time.Time `json:"updatedAt" bson:"updated_at"`
}

// Request/Response types

// CreateDecisionRequestV2 for creating decisions
type CreateDecisionRequestV2 struct {
	WebsiteURL string                       `json:"websiteUrl"`
	Context    *CreateDecisionContextReqV2  `json:"context,omitempty"`
}

// CreateDecisionContextReqV2 for context in create request
type CreateDecisionContextReqV2 struct {
	CompanyStage  *string                     `json:"companyStage,omitempty"`
	BusinessModel *string                     `json:"businessModel,omitempty"`
	PrimaryKPI    *string                     `json:"primaryKpi,omitempty"`
	Market        *CreateDecisionMarketReqV2  `json:"market,omitempty"`
}

// CreateDecisionMarketReqV2 for market in create request
type CreateDecisionMarketReqV2 struct {
	Type    *string `json:"type,omitempty"`
	Segment *string `json:"segment,omitempty"`
}

// UpdateContextRequestV2 for updating context
type UpdateContextRequestV2 struct {
	Context    UpdateDecisionContextReqV2 `json:"context"`
	EditReason string                     `json:"editReason"`
}

// UpdateDecisionContextReqV2 for context fields in update request
type UpdateDecisionContextReqV2 struct {
	CompanyStage  *string                    `json:"companyStage,omitempty"`
	BusinessModel *string                    `json:"businessModel,omitempty"`
	PrimaryKPI    *string                    `json:"primaryKpi,omitempty"`
	Market        *CreateDecisionMarketReqV2 `json:"market,omitempty"`
}

// RegenerateVerdictRequestV2 for regenerating verdict
type RegenerateVerdictRequestV2 struct {
	Reason string `json:"reason"`
}

// UpdateStatusRequestV2 for status update
type UpdateStatusRequestV2 struct {
	Status        string     `json:"status"`
	Reason        string     `json:"reason,omitempty"`
	ImplementedAt *time.Time `json:"implementedAt,omitempty"`
	RollbackAt    *time.Time `json:"rollbackAt,omitempty"`
}

// AddOutcomeRequestV2 for adding outcomes
type AddOutcomeRequestV2 struct {
	OutcomeType       string   `json:"outcomeType"`
	TimeframeDays     int      `json:"timeframeDays"`
	MetricName        string   `json:"metricName"`
	MetricBefore      *float64 `json:"metricBefore"`
	MetricAfter       *float64 `json:"metricAfter"`
	Notes             string   `json:"notes"`
	EvidenceURL       string   `json:"evidenceUrl,omitempty"`
	IsCorrection      bool     `json:"isCorrection"`
	CorrectsOutcomeID string   `json:"correctsOutcomeId,omitempty"`
	CorrectionReason  string   `json:"correctionReason,omitempty"`
}

// DecisionListResponseV2 for list endpoint
type DecisionListResponseV2 struct {
	Decisions  []DecisionListItemV2 `json:"decisions"`
	Page       int                  `json:"page"`
	PageSize   int                  `json:"pageSize"`
	Total      int64                `json:"total"`
	TotalPages int                  `json:"totalPages"`
}

// CompareDecisionsResponseV2 for compare endpoint
type CompareDecisionsResponseV2 struct {
	Decisions []DecisionCompareItemV2 `json:"decisions"`
}

// DecisionCompareItemV2 for compare response
type DecisionCompareItemV2 struct {
	ID              primitive.ObjectID `json:"id"`
	CompanyName     string             `json:"companyName"`
	WebsiteURL      string             `json:"websiteUrl"`
	VerdictHeadline string             `json:"verdictHeadline"`
	VerdictSummary  string             `json:"verdictSummary"`
	ConfidenceScore float64            `json:"confidenceScore"`
	ConfidenceLabel string             `json:"confidenceLabel"`
	RiskScore       float64            `json:"riskScore"`
	RiskLabel       string             `json:"riskLabel"`
	Status          string             `json:"status"`
	Context         DecisionContextV2  `json:"context"`
	ExpectedImpact  ExpectedImpactV2   `json:"expectedImpact"`
	LatestOutcome   *OutcomeV2         `json:"latestOutcome,omitempty"`
	VerdictJSON     VerdictV2          `json:"verdictJson"`
	CreatedAt       time.Time          `json:"createdAt"`
}

// Helper functions

// ConfidenceLabelFromScore returns label based on score
func ConfidenceLabelFromScore(score float64) string {
	if score >= 0.8 {
		return "high"
	}
	if score >= 0.6 {
		return "medium"
	}
	return "low"
}

// RiskLabelFromScore returns label based on score
func RiskLabelFromScore(score float64) string {
	if score >= 0.7 {
		return "high"
	}
	if score >= 0.4 {
		return "medium"
	}
	return "low"
}

// Valid status values
var ValidStatusesV2 = []string{"proposed", "in_review", "approved", "rejected", "implemented", "rolled_back"}

// Valid outcome types
var ValidOutcomeTypesV2 = []string{"revenue", "churn", "conversion", "arpu", "nps", "other"}

// IsValidStatusV2 checks if status is valid
func IsValidStatusV2(s string) bool {
	for _, v := range ValidStatusesV2 {
		if v == s {
			return true
		}
	}
	return false
}

// IsValidOutcomeTypeV2 checks if outcome type is valid
func IsValidOutcomeTypeV2(t string) bool {
	for _, v := range ValidOutcomeTypesV2 {
		if v == t {
			return true
		}
	}
	return false
}
