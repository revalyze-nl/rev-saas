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
	ID             primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	UserID         primitive.ObjectID `json:"userId,omitempty" bson:"user_id,omitempty"`
	WebsiteURL     string             `json:"websiteUrl" bson:"website_url"`
	Recommendation string             `json:"recommendation" bson:"recommendation"`
	Outcome        string             `json:"outcome" bson:"outcome"`
	Confidence     string             `json:"confidence" bson:"confidence"` // low, medium, high
	ConfidenceReason string           `json:"confidenceReason" bson:"confidence_reason"`
	Reasoning      []VerdictReasoning `json:"reasoning" bson:"reasoning"`
	Risks          []VerdictRisk      `json:"risks" bson:"risks"`
	Details        VerdictDetails     `json:"details" bson:"details"`
	Timing         VerdictTiming      `json:"timing" bson:"timing"`
	CreatedAt      time.Time          `json:"createdAt" bson:"created_at"`
}

// VerdictReasoning represents a reasoning block
type VerdictReasoning struct {
	Title   string `json:"title" bson:"title"`
	Content string `json:"content" bson:"content"`
}

// VerdictRisk represents a risk consideration
type VerdictRisk struct {
	Level string `json:"level" bson:"level"` // low, medium, high
	Text  string `json:"text" bson:"text"`
}

// VerdictDetails contains supporting details (directional, not precise)
type VerdictDetails struct {
	RevenueImpact  string `json:"revenueImpact" bson:"revenue_impact"`
	ChurnRisk      string `json:"churnRisk" bson:"churn_risk"`
	MarketPosition string `json:"marketPosition" bson:"market_position"`
}

// VerdictTiming contains timing recommendation
type VerdictTiming struct {
	Recommendation string `json:"recommendation" bson:"recommendation"`
	Reasoning      string `json:"reasoning" bson:"reasoning"`
}

// OpenAIVerdictResponse is the expected JSON structure from OpenAI
type OpenAIVerdictResponse struct {
	Recommendation   string `json:"recommendation"`
	Outcome          string `json:"outcome"`
	Confidence       string `json:"confidence"`
	ConfidenceReason string `json:"confidenceReason"`
	Reasoning        []struct {
		Title   string `json:"title"`
		Content string `json:"content"`
	} `json:"reasoning"`
	Risks []struct {
		Level string `json:"level"`
		Text  string `json:"text"`
	} `json:"risks"`
	Details struct {
		RevenueImpact  string `json:"revenueImpact"`
		ChurnRisk      string `json:"churnRisk"`
		MarketPosition string `json:"marketPosition"`
	} `json:"details"`
	Timing struct {
		Recommendation string `json:"recommendation"`
		Reasoning      string `json:"reasoning"`
	} `json:"timing"`
}
