package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// OutcomeStatus represents the status of an outcome
type OutcomeStatus string

const (
	OutcomeStatusPending    OutcomeStatus = "pending"
	OutcomeStatusInProgress OutcomeStatus = "in_progress"
	OutcomeStatusAchieved   OutcomeStatus = "achieved"
	OutcomeStatusMissed     OutcomeStatus = "missed"
)

// ValidOutcomeStatuses lists all valid outcome statuses
var ValidOutcomeStatuses = []OutcomeStatus{
	OutcomeStatusPending,
	OutcomeStatusInProgress,
	OutcomeStatusAchieved,
	OutcomeStatusMissed,
}

// IsValidOutcomeStatus checks if status is valid
func IsValidOutcomeStatus(s string) bool {
	for _, v := range ValidOutcomeStatuses {
		if string(v) == s {
			return true
		}
	}
	return false
}

// KPIKey represents the type of KPI being tracked
type KPIKey string

const (
	KPIKeyMRR        KPIKey = "MRR"
	KPIKeyARR        KPIKey = "ARR"
	KPIKeyRevenue    KPIKey = "Revenue"
	KPIKeyConversion KPIKey = "Conversion"
	KPIKeyChurn      KPIKey = "Churn"
	KPIKeyARPA       KPIKey = "ARPA"
	KPIKeyCAC        KPIKey = "CAC"
	KPIKeyActivation KPIKey = "Activation"
	KPIKeyRetention  KPIKey = "Retention"
	KPIKeyNPS        KPIKey = "NPS"
	KPIKeyLTV        KPIKey = "LTV"
)

// ValidKPIKeys lists all valid KPI keys
var ValidKPIKeys = []KPIKey{
	KPIKeyMRR, KPIKeyARR, KPIKeyRevenue, KPIKeyConversion,
	KPIKeyChurn, KPIKeyARPA, KPIKeyCAC, KPIKeyActivation,
	KPIKeyRetention, KPIKeyNPS, KPIKeyLTV,
}

// KPIUnit represents the unit of measurement
type KPIUnit string

const (
	KPIUnitPercent    KPIUnit = "%"
	KPIUnitPP         KPIUnit = "pp"     // percentage points
	KPIUnitEUR        KPIUnit = "€"
	KPIUnitUSD        KPIUnit = "$"
	KPIUnitCount      KPIUnit = "count"
	KPIUnitDays       KPIUnit = "days"
	KPIUnitMultiplier KPIUnit = "x"
)

// ConfidenceLevel for KPI measurements
type KPIConfidence string

const (
	KPIConfidenceLow    KPIConfidence = "low"
	KPIConfidenceMedium KPIConfidence = "medium"
	KPIConfidenceHigh   KPIConfidence = "high"
)

// OutcomeKPI represents a single KPI measurement with baseline, target, actual
type OutcomeKPI struct {
	Key        KPIKey        `json:"key" bson:"key"`
	Unit       KPIUnit       `json:"unit" bson:"unit"`
	Baseline   float64       `json:"baseline" bson:"baseline"`         // Starting value
	Target     float64       `json:"target" bson:"target"`             // Expected target from scenario
	Actual     *float64      `json:"actual" bson:"actual"`             // Measured actual (nullable until tracked)
	Delta      *float64      `json:"delta" bson:"delta"`               // Computed: actual - baseline
	DeltaPct   *float64      `json:"deltaPct" bson:"delta_pct"`        // Computed: delta as percentage
	Confidence KPIConfidence `json:"confidence" bson:"confidence"`     // User confidence in measurement
	Notes      string        `json:"notes,omitempty" bson:"notes,omitempty"`
}

// EvidenceLink represents a proof/evidence link for outcome
type EvidenceLink struct {
	Label string `json:"label" bson:"label"`
	URL   string `json:"url" bson:"url"`
}

// MeasurableOutcome represents a measurable outcome tied to a verdict and chosen scenario
type MeasurableOutcome struct {
	ID       primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID   primitive.ObjectID `json:"userId" bson:"user_id"`
	VerdictID primitive.ObjectID `json:"verdictId" bson:"verdict_id"` // Link to decision/verdict

	// Scenario link
	ChosenScenarioID string `json:"chosenScenarioId" bson:"chosen_scenario_id"` // e.g., "balanced", "aggressive"

	// Outcome tracking
	Status      OutcomeStatus `json:"status" bson:"status"`
	HorizonDays int           `json:"horizonDays" bson:"horizon_days"` // Tracking time horizon

	// KPI measurements (array of measurable KPIs)
	KPIs []OutcomeKPI `json:"kpis" bson:"kpis"`

	// Evidence
	EvidenceLinks []EvidenceLink `json:"evidenceLinks,omitempty" bson:"evidence_links,omitempty"`

	// Notes
	Summary string `json:"summary,omitempty" bson:"summary,omitempty"`
	Notes   string `json:"notes,omitempty" bson:"notes,omitempty"`

	// Timestamps
	CreatedAt time.Time `json:"createdAt" bson:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" bson:"updated_at"`
}

// ScenarioDelta represents computed deltas between two scenarios
type ScenarioDelta struct {
	ID                  primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	VerdictID           primitive.ObjectID `json:"verdictId" bson:"verdict_id"`
	BaselineScenarioID  string             `json:"baselineScenarioId" bson:"baseline_scenario_id"`
	CandidateScenarioID string             `json:"candidateScenarioId" bson:"candidate_scenario_id"`

	// Computed deltas
	Deltas DeltaValues `json:"deltas" bson:"deltas"`

	CreatedAt time.Time `json:"createdAt" bson:"created_at"`
}

// DeltaValues contains computed delta values between scenarios
type DeltaValues struct {
	RevenueImpactPct DeltaRange `json:"revenueImpactPct" bson:"revenue_impact_pct"`
	ChurnImpactPp    DeltaRange `json:"churnImpactPp" bson:"churn_impact_pp"`
	TimeToImpactDays DeltaRange `json:"timeToImpactDays" bson:"time_to_impact_days"`
	RiskDelta        string     `json:"riskDelta" bson:"risk_delta"`     // "down", "same", "up"
	EffortDelta      string     `json:"effortDelta" bson:"effort_delta"` // "down", "same", "up"
}

// DeltaRange represents a min/max range for deltas
type DeltaRange struct {
	Min float64 `json:"min" bson:"min"`
	Max float64 `json:"max" bson:"max"`
}

// Request/Response types

// CreateOutcomeRequest for creating a new measurable outcome
type CreateMeasurableOutcomeRequest struct {
	ChosenScenarioID string       `json:"chosenScenarioId"`
	HorizonDays      int          `json:"horizonDays,omitempty"`
	KPIs             []OutcomeKPI `json:"kpis,omitempty"`
}

// UpdateOutcomeRequest for updating an outcome
type UpdateMeasurableOutcomeRequest struct {
	Status        *string        `json:"status,omitempty"`
	KPIs          []OutcomeKPI   `json:"kpis,omitempty"`
	EvidenceLinks []EvidenceLink `json:"evidenceLinks,omitempty"`
	Summary       *string        `json:"summary,omitempty"`
	Notes         *string        `json:"notes,omitempty"`
}

// OutcomeResponse for API responses
type MeasurableOutcomeResponse struct {
	ID               primitive.ObjectID `json:"id"`
	VerdictID        primitive.ObjectID `json:"verdictId"`
	ChosenScenarioID string             `json:"chosenScenarioId"`
	Status           OutcomeStatus      `json:"status"`
	HorizonDays      int                `json:"horizonDays"`
	KPIs             []OutcomeKPI       `json:"kpis"`
	EvidenceLinks    []EvidenceLink     `json:"evidenceLinks,omitempty"`
	Summary          string             `json:"summary,omitempty"`
	Notes            string             `json:"notes,omitempty"`
	CreatedAt        time.Time          `json:"createdAt"`
	UpdatedAt        time.Time          `json:"updatedAt"`
}

// ApplyScenarioRequest for applying a scenario to a verdict
type ApplyScenarioRequest struct {
	ScenarioID string `json:"scenarioId"`
}

// ApplyScenarioResponse for API response after applying
type ApplyScenarioResponse struct {
	VerdictID        primitive.ObjectID         `json:"verdictId"`
	ChosenScenarioID string                     `json:"chosenScenarioId"`
	Status           string                     `json:"status"`
	Outcome          *MeasurableOutcomeResponse `json:"outcome,omitempty"`
}

// DeltaViewRequest for getting delta between scenarios
type DeltaViewRequest struct {
	BaselineScenarioID  string `json:"baselineScenarioId"`
	CandidateScenarioID string `json:"candidateScenarioId"`
}

// DeltaViewResponse for delta view API
type DeltaViewResponse struct {
	BaselineScenarioID  string      `json:"baselineScenarioId"`
	CandidateScenarioID string      `json:"candidateScenarioId"`
	Deltas              DeltaValues `json:"deltas"`
}

// VerdictEpisodeStatus represents the episode status for history view
type VerdictEpisodeStatus string

const (
	VerdictStatusDraft       VerdictEpisodeStatus = "draft"
	VerdictStatusExplored    VerdictEpisodeStatus = "explored"
	VerdictStatusPathChosen  VerdictEpisodeStatus = "path_chosen"
	VerdictStatusOutcomeSaved VerdictEpisodeStatus = "outcome_saved"
)

// GetEpisodeStatus computes the episode status based on verdict state
func GetEpisodeStatus(hasScenarios bool, chosenScenarioID *string, hasOutcome bool) VerdictEpisodeStatus {
	if hasOutcome && chosenScenarioID != nil {
		return VerdictStatusOutcomeSaved
	}
	if chosenScenarioID != nil {
		return VerdictStatusPathChosen
	}
	if hasScenarios {
		return VerdictStatusExplored
	}
	return VerdictStatusDraft
}

// HistoryEpisodeItem represents a verdict as an episode in history
type HistoryEpisodeItem struct {
	ID               primitive.ObjectID   `json:"id"`
	CompanyName      string               `json:"companyName"`
	WebsiteURL       string               `json:"websiteUrl"`
	DecisionTitle    string               `json:"decisionTitle"`
	DecisionSummary  string               `json:"decisionSummary"`
	TimeHorizon      string               `json:"timeHorizon,omitempty"`
	PrimaryKPI       string               `json:"primaryKpi,omitempty"`
	ConfidenceScore  float64              `json:"confidenceScore"`
	RiskLevel        string               `json:"riskLevel"`
	EpisodeStatus    VerdictEpisodeStatus `json:"episodeStatus"`
	ScenariosCount   int                  `json:"scenariosCount"`
	ChosenScenarioID *string              `json:"chosenScenarioId,omitempty"`
	ChosenScenarioName string             `json:"chosenScenarioName,omitempty"`
	OutcomeStatus    *OutcomeStatus       `json:"outcomeStatus,omitempty"`
	OutcomeSummary   string               `json:"outcomeSummary,omitempty"`
	CreatedAt        time.Time            `json:"createdAt"`
	UpdatedAt        time.Time            `json:"updatedAt"`
}

// HistoryEpisodeListResponse for history list endpoint
type HistoryEpisodeListResponse struct {
	Episodes   []HistoryEpisodeItem `json:"episodes"`
	Page       int                  `json:"page"`
	PageSize   int                  `json:"pageSize"`
	Total      int64                `json:"total"`
	TotalPages int                  `json:"totalPages"`
}

