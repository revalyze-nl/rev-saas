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
// Matches the strict JSON contract for frontend consumption
type VerdictResponse struct {
	ID                  primitive.ObjectID   `json:"id,omitempty" bson:"_id,omitempty"`
	UserID              primitive.ObjectID   `json:"userId,omitempty" bson:"user_id,omitempty"`
	WebsiteURL          string               `json:"websiteUrl" bson:"website_url"`
	VerdictTitle        string               `json:"verdictTitle" bson:"verdict_title"`
	OutcomeSummary      string               `json:"outcomeSummary" bson:"outcome_summary"`
	ConfidenceLevel     string               `json:"confidenceLevel" bson:"confidence_level"` // low, medium, high
	Why                 []string             `json:"why" bson:"why"`
	RiskConsiderations  []RiskConsideration  `json:"riskConsiderations" bson:"risk_considerations"`
	SupportingDetails   SupportingDetails    `json:"supportingDetails" bson:"supporting_details"`
	CreatedAt           time.Time            `json:"createdAt" bson:"created_at"`
}

// RiskConsideration represents a risk with level and description
type RiskConsideration struct {
	Level       string `json:"level" bson:"level"`             // low, medium, high
	Description string `json:"description" bson:"description"`
}

// SupportingDetails contains directional/range-based supporting info
type SupportingDetails struct {
	RevenueDirection string `json:"revenueDirection" bson:"revenue_direction"`
	ChurnDirection   string `json:"churnDirection" bson:"churn_direction"`
	MarketPosition   string `json:"marketPosition" bson:"market_position"`
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
		RevenueDirection string `json:"revenueDirection"`
		ChurnDirection   string `json:"churnDirection"`
		MarketPosition   string `json:"marketPosition"`
	} `json:"supportingDetails"`
}
