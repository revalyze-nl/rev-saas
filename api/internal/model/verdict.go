package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// VerdictRequest represents the input for generating a verdict
type VerdictRequest struct {
	WebsiteURL string          `json:"websiteUrl"`
	Context    DecisionContext `json:"context"`
}

// DecisionSnapshot provides a 30-second overview at the top
type DecisionSnapshot struct {
	RevenueImpactRange   string `json:"revenueImpactRange" bson:"revenue_impact_range"`     // e.g. "+15–25%"
	PrimaryRiskLevel     string `json:"primaryRiskLevel" bson:"primary_risk_level"`         // Low / Medium / High
	PrimaryRiskExplain   string `json:"primaryRiskExplain" bson:"primary_risk_explain"`     // 1-line explanation
	TimeToImpact         string `json:"timeToImpact" bson:"time_to_impact"`                 // e.g. "30–90 days"
	ExecutionEffort      string `json:"executionEffort" bson:"execution_effort"`            // Low / Medium / High
	Reversibility        string `json:"reversibility" bson:"reversibility"`                 // High / Medium / Low
}

// ExecutionChecklist provides operational next steps
type ExecutionChecklist struct {
	Next14Days      []string `json:"next14Days" bson:"next_14_days"`
	Next30To60Days  []string `json:"next30To60Days" bson:"next_30_to_60_days"`
	SuccessMetrics  []string `json:"successMetrics" bson:"success_metrics"`
}

// PersonalizationSignals contains explicit personalization cues
type PersonalizationSignals struct {
	PricingPageInsight    string `json:"pricingPageInsight" bson:"pricing_page_insight"`       // "Based on your pricing page structure..."
	CompanyStageInsight   string `json:"companyStageInsight" bson:"company_stage_insight"`     // "Given your current company stage..."
	CompetitorInsight     string `json:"competitorInsight" bson:"competitor_insight"`          // "Compared to competitors..."
	KPIInsight            string `json:"kpiInsight" bson:"kpi_insight"`                        // "Because your primary KPI is..."
	MarketPositionInsight string `json:"marketPositionInsight" bson:"market_position_insight"` // "Your market positioning suggests..."
}

// VerdictResponse represents the AI-generated pricing verdict (V1 - kept for compatibility)
type VerdictResponse struct {
	ID                primitive.ObjectID    `json:"id,omitempty" bson:"_id,omitempty"`
	UserID            primitive.ObjectID    `json:"userId,omitempty" bson:"user_id,omitempty"`
	WebsiteURL        string                `json:"websiteUrl" bson:"website_url"`
	Headline          string                `json:"headline" bson:"headline"`
	Summary           string                `json:"summary" bson:"summary"`
	Confidence        string                `json:"confidence" bson:"confidence"` // High, Medium, Low
	CTA               string                `json:"cta" bson:"cta"`
	WhyThisDecision   []string              `json:"whyThisDecision" bson:"why_this_decision"`
	WhatToExpect      VerdictExpectations   `json:"whatToExpect" bson:"what_to_expect"`
	SupportingDetails VerdictSupportDetails `json:"supportingDetails" bson:"supporting_details"`
	// Premium fields (V2)
	DecisionSnapshot       *DecisionSnapshot       `json:"decisionSnapshot,omitempty" bson:"decision_snapshot,omitempty"`
	PersonalizationSignals *PersonalizationSignals `json:"personalizationSignals,omitempty" bson:"personalization_signals,omitempty"`
	ExecutiveVerdict       *ExecutiveVerdict       `json:"executiveVerdict,omitempty" bson:"executive_verdict,omitempty"`
	IfYouProceed           *IfYouProceed           `json:"ifYouProceed,omitempty" bson:"if_you_proceed,omitempty"`
	IfYouDoNotAct          *IfYouDoNotAct          `json:"ifYouDoNotAct,omitempty" bson:"if_you_do_not_act,omitempty"`
	AlternativesConsidered []AlternativeConsidered `json:"alternativesConsidered,omitempty" bson:"alternatives_considered,omitempty"`
	RiskAnalysis           *RiskAnalysis           `json:"riskAnalysis,omitempty" bson:"risk_analysis,omitempty"`
	WhyThisFits            *WhyThisFits            `json:"whyThisFits,omitempty" bson:"why_this_fits,omitempty"`
	ExecutionChecklist     *ExecutionChecklist     `json:"executionChecklist,omitempty" bson:"execution_checklist,omitempty"`
	ExecutionNote          string                  `json:"executionNote,omitempty" bson:"execution_note,omitempty"`
	CreatedAt              time.Time               `json:"createdAt" bson:"created_at"`
}

// ExecutiveVerdict contains the board-level decision summary
type ExecutiveVerdict struct {
	Recommendation string `json:"recommendation" bson:"recommendation"`
	DecisionType   string `json:"decisionType" bson:"decision_type"`
	TimeHorizon    string `json:"timeHorizon" bson:"time_horizon"`
	ScopeOfImpact  string `json:"scopeOfImpact" bson:"scope_of_impact"`
}

// IfYouProceed describes expected outcomes if decision is taken
type IfYouProceed struct {
	ExpectedUpside   []string `json:"expectedUpside" bson:"expected_upside"`
	SecondaryEffects []string `json:"secondaryEffects" bson:"secondary_effects"`
}

// IfYouDoNotAct describes opportunity cost and inaction risks
type IfYouDoNotAct struct {
	WhatStagnates       string `json:"whatStagnates" bson:"what_stagnates"`
	CompetitorAdvantage string `json:"competitorAdvantage" bson:"competitor_advantage"`
	FutureDifficulty    string `json:"futureDifficulty" bson:"future_difficulty"`
}

// AlternativeConsidered represents a rejected alternative
type AlternativeConsidered struct {
	Name           string `json:"name" bson:"name"`
	WhyNotSelected string `json:"whyNotSelected" bson:"why_not_selected"`
}

// RiskAnalysis contains detailed risk assessment
type RiskAnalysis struct {
	RiskLevel      string `json:"riskLevel" bson:"risk_level"`
	WhoIsAffected  string `json:"whoIsAffected" bson:"who_is_affected"`
	HowItManifests string `json:"howItManifests" bson:"how_it_manifests"`
	WhyAcceptable  string `json:"whyAcceptable" bson:"why_acceptable"`
}

// WhyThisFits explains personalization anchors
type WhyThisFits struct {
	CompanyStageReason  string `json:"companyStageReason" bson:"company_stage_reason"`
	BusinessModelReason string `json:"businessModelReason" bson:"business_model_reason"`
	MarketSegmentReason string `json:"marketSegmentReason" bson:"market_segment_reason"`
	PrimaryKPIReason    string `json:"primaryKpiReason" bson:"primary_kpi_reason"`
}

// VerdictExpectations contains risk assessment and trade-offs
type VerdictExpectations struct {
	RiskLevel   string `json:"riskLevel" bson:"risk_level"` // Low, Medium, High
	Description string `json:"description" bson:"description"`
}

// VerdictSupportDetails contains directional impact details
type VerdictSupportDetails struct {
	ExpectedRevenueImpact string `json:"expectedRevenueImpact" bson:"expected_revenue_impact"`
	ChurnOutlook          string `json:"churnOutlook" bson:"churn_outlook"`
	MarketPositioning     string `json:"marketPositioning" bson:"market_positioning"`
}

// OpenAIVerdictResponse is the expected JSON structure from OpenAI (Premium V2)
type OpenAIVerdictResponse struct {
	DecisionSnapshot struct {
		RevenueImpactRange string `json:"revenue_impact_range"`
		PrimaryRiskLevel   string `json:"primary_risk_level"`
		PrimaryRiskExplain string `json:"primary_risk_explain"`
		TimeToImpact       string `json:"time_to_impact"`
		ExecutionEffort    string `json:"execution_effort"`
		Reversibility      string `json:"reversibility"`
	} `json:"decision_snapshot"`
	PersonalizationSignals struct {
		PricingPageInsight    string `json:"pricing_page_insight"`
		CompanyStageInsight   string `json:"company_stage_insight"`
		CompetitorInsight     string `json:"competitor_insight"`
		KPIInsight            string `json:"kpi_insight"`
		MarketPositionInsight string `json:"market_position_insight"`
	} `json:"personalization_signals"`
	ExecutiveVerdict struct {
		Recommendation string `json:"recommendation"`
		DecisionType   string `json:"decision_type"`
		TimeHorizon    string `json:"time_horizon"`
		ScopeOfImpact  string `json:"scope_of_impact"`
	} `json:"executive_verdict"`
	DecisionConfidence struct {
		Level       string `json:"level"`
		Explanation string `json:"explanation"`
	} `json:"decision_confidence"`
	IfYouProceed struct {
		ExpectedUpside   []string `json:"expected_upside"`
		SecondaryEffects []string `json:"secondary_effects"`
	} `json:"if_you_proceed"`
	IfYouDoNotAct struct {
		WhatStagnates       string `json:"what_stagnates"`
		CompetitorAdvantage string `json:"competitor_advantage"`
		FutureDifficulty    string `json:"future_difficulty"`
	} `json:"if_you_do_not_act"`
	AlternativesConsidered []struct {
		Name           string `json:"name"`
		WhyNotSelected string `json:"why_not_selected"`
	} `json:"alternatives_considered"`
	RiskAnalysis struct {
		RiskLevel      string `json:"risk_level"`
		WhoIsAffected  string `json:"who_is_affected"`
		HowItManifests string `json:"how_it_manifests"`
		WhyAcceptable  string `json:"why_acceptable"`
	} `json:"risk_analysis"`
	ExpectedImpact struct {
		RevenueImpact       string `json:"revenue_impact"`
		ShortTermChurn      string `json:"short_term_churn"`
		LongTermPositioning string `json:"long_term_positioning"`
	} `json:"expected_impact"`
	WhyThisFits struct {
		CompanyStageReason  string `json:"company_stage_reason"`
		BusinessModelReason string `json:"business_model_reason"`
		MarketSegmentReason string `json:"market_segment_reason"`
		PrimaryKPIReason    string `json:"primary_kpi_reason"`
	} `json:"why_this_fits"`
	ExecutionChecklist struct {
		Next14Days     []string `json:"next_14_days"`
		Next30To60Days []string `json:"next_30_to_60_days"`
		SuccessMetrics []string `json:"success_metrics"`
	} `json:"execution_checklist"`
}
