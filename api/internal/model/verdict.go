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
type VerdictResponse struct {
	ID                primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	UserID            primitive.ObjectID `json:"userId,omitempty" bson:"user_id,omitempty"`
	WebsiteURL        string                `json:"websiteUrl" bson:"website_url"`
	Recommendation    VerdictRecommendation `json:"recommendation" bson:"recommendation"`
	Why               []string           `json:"why" bson:"why"`
	Expectations      Expectations       `json:"expectations" bson:"expectations"`
	SupportingDetails SupportingDetails  `json:"supportingDetails" bson:"supporting_details"`
	CreatedAt         time.Time          `json:"createdAt" bson:"created_at"`
}

// VerdictRecommendation contains the main pricing decision
type VerdictRecommendation struct {
	Title      string `json:"title" bson:"title"`
	Summary    string `json:"summary" bson:"summary"`
	Confidence string `json:"confidence" bson:"confidence"` // High, Medium, Low
}

// Expectations contains what to expect after implementation
type Expectations struct {
	RiskLevel string `json:"riskLevel" bson:"risk_level"` // Low, Medium, High
	Summary   string `json:"summary" bson:"summary"`
}

// SupportingDetails contains directional impact details
type SupportingDetails struct {
	ExpectedRevenueImpact string `json:"expectedRevenueImpact" bson:"expected_revenue_impact"`
	ChurnOutlook          string `json:"churnOutlook" bson:"churn_outlook"`
	MarketPosition        string `json:"marketPosition" bson:"market_position"`
}

// OpenAIVerdictResponse is the expected JSON structure from OpenAI
type OpenAIVerdictResponse struct {
	Recommendation struct {
		Title      string `json:"title"`
		Summary    string `json:"summary"`
		Confidence string `json:"confidence"`
	} `json:"recommendation"`
	Why          []string `json:"why"`
	Expectations struct {
		RiskLevel string `json:"risk_level"`
		Summary   string `json:"summary"`
	} `json:"expectations"`
	SupportingDetails struct {
		ExpectedRevenueImpact string `json:"expected_revenue_impact"`
		ChurnOutlook          string `json:"churn_outlook"`
		MarketPosition        string `json:"market_position"`
	} `json:"supporting_details"`
}
