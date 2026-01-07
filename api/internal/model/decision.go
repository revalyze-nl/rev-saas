package model

import (
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DecisionType represents the type of pricing decision
type DecisionType string

const (
	DecisionTypePriceIncrease DecisionType = "price_increase"
	DecisionTypeTieredPricing DecisionType = "tiered_pricing"
	DecisionTypePackaging     DecisionType = "packaging"
	DecisionTypeDiscounting   DecisionType = "discounting"
	DecisionTypeUsageBased    DecisionType = "usage_based"
	DecisionTypePositioning   DecisionType = "positioning"
)

// ConfidenceLevel represents confidence in the decision
type ConfidenceLevel string

const (
	ConfidenceLow    ConfidenceLevel = "low"
	ConfidenceMedium ConfidenceLevel = "medium"
	ConfidenceHigh   ConfidenceLevel = "high"
)

// RiskLevel represents the risk level of the decision
type RiskLevel string

const (
	RiskLow    RiskLevel = "low"
	RiskMedium RiskLevel = "medium"
	RiskHigh   RiskLevel = "high"
)

// DecisionStatus represents the status of a decision
type DecisionStatus string

const (
	StatusProposed    DecisionStatus = "proposed"
	StatusInReview    DecisionStatus = "in_review"
	StatusApproved    DecisionStatus = "approved"
	StatusRejected    DecisionStatus = "rejected"
	StatusImplemented DecisionStatus = "implemented"
	StatusRolledBack  DecisionStatus = "rolled_back"
)

// CompanyStage represents the funding stage of the company
type CompanyStage string

const (
	StagePreSeed     CompanyStage = "pre_seed"
	StageSeed        CompanyStage = "seed"
	StageSeriesA     CompanyStage = "series_a"
	StageSeriesBPlus CompanyStage = "series_b_plus"
	StagePublic      CompanyStage = "public"
	StageUnknown     CompanyStage = "unknown"
)

// BusinessModel represents the business model type
type BusinessModel string

const (
	ModelSaaS              BusinessModel = "saas"
	ModelEcommerce         BusinessModel = "ecommerce"
	ModelMarketplace       BusinessModel = "marketplace"
	ModelAgency            BusinessModel = "agency"
	ModelEnterpriseLicense BusinessModel = "enterprise_license"
	ModelUsageBased        BusinessModel = "usage_based"
	ModelUnknown           BusinessModel = "unknown"
)

// PrimaryKPI represents the primary KPI focus
type PrimaryKPI string

const (
	KPIMRRGrowth       PrimaryKPI = "mrr_growth"
	KPIChurnReduction  PrimaryKPI = "churn_reduction"
	KPIActivation      PrimaryKPI = "activation"
	KPIARPU            PrimaryKPI = "arpu"
	KPINRR             PrimaryKPI = "nrr"
	KPICVR             PrimaryKPI = "cvr"
	KPIRetention       PrimaryKPI = "retention"
	KPIUnknown         PrimaryKPI = "unknown"
)

// Market represents the target market
type Market string

const (
	MarketB2B         Market = "b2b"
	MarketB2C         Market = "b2c"
	MarketB2B2C       Market = "b2b2c"
	MarketDevTools    Market = "devtools"
	MarketProductivity Market = "productivity"
	MarketFintech     Market = "fintech"
	MarketEcommerce   Market = "ecommerce"
	MarketOther       Market = "other"
	MarketUnknown     Market = "unknown"
)

// OutcomeType represents the type of outcome being tracked
type OutcomeType string

const (
	OutcomeRevenue    OutcomeType = "revenue"
	OutcomeChurn      OutcomeType = "churn"
	OutcomeActivation OutcomeType = "activation"
	OutcomeRetention  OutcomeType = "retention"
	OutcomePricing    OutcomeType = "pricing"
	OutcomeOther      OutcomeType = "other"
)

// DecisionContext contains business context for the decision
type DecisionContext struct {
	CompanyStage  CompanyStage  `json:"companyStage" bson:"company_stage"`
	BusinessModel BusinessModel `json:"businessModel" bson:"business_model"`
	PrimaryKPI    PrimaryKPI    `json:"primaryKpi" bson:"primary_kpi"`
	Market        Market        `json:"market" bson:"market"`
}

// StatusEvent represents an immutable status change event
type StatusEvent struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Status        DecisionStatus     `json:"status" bson:"status"`
	Reason        string             `json:"reason,omitempty" bson:"reason,omitempty"`
	ImplementedAt *time.Time         `json:"implementedAt,omitempty" bson:"implemented_at,omitempty"`
	RollbackAt    *time.Time         `json:"rollbackAt,omitempty" bson:"rollback_at,omitempty"`
	CreatedBy     primitive.ObjectID `json:"createdBy" bson:"created_by"`
	CreatedAt     time.Time          `json:"createdAt" bson:"created_at"`
}

// ExpectedImpact contains expected outcomes
type ExpectedImpact struct {
	RevenueRange string `json:"revenueRange" bson:"revenue_range"`
	ChurnNote    string `json:"churnNote" bson:"churn_note"`
}

// ModelMeta contains AI model metadata
type ModelMeta struct {
	ModelName     string  `json:"modelName" bson:"model_name"`
	PromptVersion string  `json:"promptVersion" bson:"prompt_version"`
	Temperature   float64 `json:"temperature" bson:"temperature"`
	TokenCount    int     `json:"tokenCount" bson:"token_count"`
}

// PricingDecision represents a pricing decision record
type PricingDecision struct {
	ID              primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID          primitive.ObjectID `json:"userId" bson:"user_id"`
	CompanyName     string             `json:"companyName" bson:"company_name"`
	WebsiteURL      string             `json:"websiteUrl" bson:"website_url"`
	VerdictHeadline string             `json:"verdictHeadline" bson:"verdict_headline"`
	VerdictSummary  string             `json:"verdictSummary" bson:"verdict_summary"`
	DecisionType    DecisionType       `json:"decisionType" bson:"decision_type"`
	ConfidenceLevel ConfidenceLevel    `json:"confidenceLevel" bson:"confidence_level"`
	RiskLevel       RiskLevel          `json:"riskLevel" bson:"risk_level"`
	ExpectedImpact  ExpectedImpact     `json:"expectedImpact" bson:"expected_impact"`
	Context         DecisionContext    `json:"context" bson:"context"`
	Status          DecisionStatus     `json:"status" bson:"status"`
	StatusEvents    []StatusEvent      `json:"statusEvents" bson:"status_events"`
	ImplementedAt   *time.Time         `json:"implementedAt,omitempty" bson:"implemented_at,omitempty"`
	RejectionReason string             `json:"rejectionReason,omitempty" bson:"rejection_reason,omitempty"`
	RollbackReason  string             `json:"rollbackReason,omitempty" bson:"rollback_reason,omitempty"`
	RollbackAt      *time.Time         `json:"rollbackAt,omitempty" bson:"rollback_at,omitempty"`
	Tags            []string           `json:"tags" bson:"tags"`
	VerdictJSON     interface{}        `json:"verdictJson" bson:"verdict_json"`
	ModelMeta       ModelMeta          `json:"modelMeta" bson:"model_meta"`
	IsDeleted       bool               `json:"isDeleted" bson:"is_deleted"`
	DeletedAt       *time.Time         `json:"deletedAt,omitempty" bson:"deleted_at,omitempty"`
	CreatedAt       time.Time          `json:"createdAt" bson:"created_at"`
	UpdatedAt       time.Time          `json:"updatedAt" bson:"updated_at"`
}

// DecisionOutcome represents outcome tracking for a decision
type DecisionOutcome struct {
	ID              primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	DecisionID      primitive.ObjectID `json:"decisionId" bson:"decision_id"`
	OutcomeType     OutcomeType        `json:"outcomeType" bson:"outcome_type"`
	TimeframeDays   int                `json:"timeframeDays" bson:"timeframe_days"`
	MetricName      string             `json:"metricName" bson:"metric_name"`
	MetricBefore    *float64           `json:"metricBefore" bson:"metric_before"`
	MetricAfter     *float64           `json:"metricAfter" bson:"metric_after"`
	DeltaPercent    *float64           `json:"deltaPercent" bson:"delta_percent"`
	Notes           string             `json:"notes" bson:"notes"`
	EvidenceURL     string             `json:"evidenceUrl,omitempty" bson:"evidence_url,omitempty"`
	CreatedBy       primitive.ObjectID `json:"createdBy" bson:"created_by"`
	CreatedAt       time.Time          `json:"createdAt" bson:"created_at"`
	UpdatedAt       time.Time          `json:"updatedAt" bson:"updated_at"`
}

// CreateDecisionRequest represents the request to create a decision
type CreateDecisionRequest struct {
	CompanyName     string          `json:"companyName"`
	WebsiteURL      string          `json:"websiteUrl"`
	VerdictHeadline string          `json:"verdictHeadline"`
	VerdictSummary  string          `json:"verdictSummary"`
	DecisionType    DecisionType    `json:"decisionType"`
	ConfidenceLevel ConfidenceLevel `json:"confidenceLevel"`
	RiskLevel       RiskLevel       `json:"riskLevel"`
	ExpectedImpact  ExpectedImpact  `json:"expectedImpact"`
	Context         DecisionContext `json:"context"`
	Tags            []string        `json:"tags"`
	VerdictJSON     interface{}     `json:"verdictJson"`
	ModelMeta       ModelMeta       `json:"modelMeta"`
}

// UpdateStatusRequest represents the request to update decision status
type UpdateStatusRequest struct {
	Status        DecisionStatus `json:"status"`
	Reason        string         `json:"reason,omitempty"`
	ImplementedAt *time.Time     `json:"implementedAt,omitempty"`
	RollbackAt    *time.Time     `json:"rollbackAt,omitempty"`
}

// CreateOutcomeRequest represents the request to create an outcome
type CreateOutcomeRequest struct {
	OutcomeType   OutcomeType `json:"outcomeType"`
	TimeframeDays int         `json:"timeframeDays"`
	MetricName    string      `json:"metricName"`
	MetricBefore  *float64    `json:"metricBefore"`
	MetricAfter   *float64    `json:"metricAfter"`
	Notes         string      `json:"notes"`
	EvidenceURL   string      `json:"evidenceUrl,omitempty"`
}

// DecisionListFilters contains filter options for listing decisions
type DecisionListFilters struct {
	Query        string
	Status       DecisionStatus
	DecisionType DecisionType
	Confidence   ConfidenceLevel
	Risk         RiskLevel
	FromDate     *time.Time
	ToDate       *time.Time
	Page         int
	PageSize     int
	SortBy       string
	SortOrder    int // 1 for asc, -1 for desc
}

// DecisionListItem represents a decision in the list view with outcome summary
type DecisionListItem struct {
	*PricingDecision
	OutcomeSummary   string             `json:"outcomeSummary,omitempty"`
	LatestOutcome    *DecisionOutcome   `json:"latestOutcome,omitempty"`
	DaysSinceStatus  int                `json:"daysSinceStatus"`
}

// DecisionListResponse represents paginated decision list
type DecisionListResponse struct {
	Decisions  []*DecisionListItem `json:"decisions"`
	Total      int64               `json:"total"`
	Page       int                 `json:"page"`
	PageSize   int                 `json:"pageSize"`
	TotalPages int                 `json:"totalPages"`
}

// DecisionDetailResponse represents full decision detail with outcomes
type DecisionDetailResponse struct {
	*PricingDecision
	Outcomes []*DecisionOutcome `json:"outcomes"`
}

// DecisionCompareItem represents a single decision in comparison
type DecisionCompareItem struct {
	*PricingDecision
	LatestOutcome *DecisionOutcome `json:"latestOutcome,omitempty"`
}

// DecisionCompareResponse represents side-by-side comparison (up to 3)
type DecisionCompareResponse struct {
	Decisions []*DecisionCompareItem `json:"decisions"`
}

// DecisionWithOutcomes represents a decision with its outcomes (legacy)
type DecisionWithOutcomes struct {
	Decision *PricingDecision   `json:"decision"`
	Outcomes []*DecisionOutcome `json:"outcomes"`
}

// GetOutcomeSummary generates a human-readable outcome summary
func (d *PricingDecision) GetOutcomeSummary(latestOutcome *DecisionOutcome) string {
	switch d.Status {
	case StatusRejected:
		if d.RejectionReason != "" {
			return "Rejected: " + d.RejectionReason
		}
		return "Rejected by team"
	case StatusRolledBack:
		if d.RollbackAt != nil {
			days := int(time.Since(*d.RollbackAt).Hours() / 24)
			return fmt.Sprintf("Rolled back after %dd", days)
		}
		return "Rolled back"
	case StatusImplemented:
		if latestOutcome != nil && latestOutcome.DeltaPercent != nil {
			sign := "+"
			if *latestOutcome.DeltaPercent < 0 {
				sign = ""
			}
			return fmt.Sprintf("Outcome: %s%.1f%% %s (%dd)", sign, *latestOutcome.DeltaPercent, latestOutcome.MetricName, latestOutcome.TimeframeDays)
		}
		if d.ImplementedAt != nil {
			days := int(time.Since(*d.ImplementedAt).Hours() / 24)
			if days > 30 {
				return fmt.Sprintf("Outcome pending (%dd)", days)
			}
		}
		return "Recently implemented"
	default:
		return ""
	}
}
