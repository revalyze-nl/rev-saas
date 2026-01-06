package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// VerdictRequest represents the input for generating a verdict
type VerdictRequest struct {
	WebsiteURL string `json:"websiteUrl"`
}

// VerdictResponse represents the AI-generated pricing verdict
// All claims must be grounded in the provided website content
type VerdictResponse struct {
	ID                 primitive.ObjectID  `json:"id,omitempty" bson:"_id,omitempty"`
	UserID             primitive.ObjectID  `json:"userId,omitempty" bson:"user_id,omitempty"`
	WebsiteURL         string              `json:"websiteUrl" bson:"website_url"`
	VerdictTitle       string              `json:"verdictTitle" bson:"verdict_title"`
	OutcomeSummary     string              `json:"outcomeSummary" bson:"outcome_summary"`
	ConfidenceLevel    string              `json:"confidenceLevel" bson:"confidence_level"` // low, medium, high
	Why                []string            `json:"why" bson:"why"`
	RiskConsiderations []RiskConsideration `json:"riskConsiderations" bson:"risk_considerations"`
	SupportingDetails  SupportingDetails   `json:"supportingDetails" bson:"supporting_details"`
	Evidence           VerdictEvidence     `json:"evidence" bson:"evidence"`
	CreatedAt          time.Time           `json:"createdAt" bson:"created_at"`
}

// RiskConsideration represents a risk with level and description
type RiskConsideration struct {
	Level       string `json:"level" bson:"level"`             // low, medium, high
	Description string `json:"description" bson:"description"` // risk + mitigation suggestion
}

// SupportingDetails contains directional/range-based supporting info
type SupportingDetails struct {
	ExpectedRevenue string `json:"expectedRevenue" bson:"expected_revenue"`
	ChurnOutlook    string `json:"churnOutlook" bson:"churn_outlook"`
	MarketPosition  string `json:"marketPosition" bson:"market_position"`
}

// VerdictEvidence contains the signals used to generate the verdict
type VerdictEvidence struct {
	WebsiteSignalsUsed []string `json:"websiteSignalsUsed" bson:"website_signals_used"`
}

// OpenAIVerdictResponse is the expected JSON structure from OpenAI
type OpenAIVerdictResponse struct {
	VerdictTitle       string   `json:"verdictTitle"`
	OutcomeSummary     string   `json:"outcomeSummary"`
	ConfidenceLevel    string   `json:"confidenceLevel"`
	Why                []string `json:"why"`
	RiskConsiderations []struct {
		Level       string `json:"level"`
		Description string `json:"description"`
	} `json:"riskConsiderations"`
	SupportingDetails struct {
		ExpectedRevenue string `json:"expectedRevenue"`
		ChurnOutlook    string `json:"churnOutlook"`
		MarketPosition  string `json:"marketPosition"`
	} `json:"supportingDetails"`
	Evidence struct {
		WebsiteSignalsUsed []string `json:"websiteSignalsUsed"`
	} `json:"evidence"`
}
