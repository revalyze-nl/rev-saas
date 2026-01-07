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

// VerdictResponse represents the AI-generated pricing verdict
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
	CreatedAt         time.Time             `json:"createdAt" bson:"created_at"`
}

// VerdictExpectations contains risk assessment and trade-offs
type VerdictExpectations struct {
	RiskLevel   string `json:"riskLevel" bson:"risk_level"`     // Low, Medium, High
	Description string `json:"description" bson:"description"`
}

// VerdictSupportDetails contains directional impact details
type VerdictSupportDetails struct {
	ExpectedRevenueImpact string `json:"expectedRevenueImpact" bson:"expected_revenue_impact"`
	ChurnOutlook          string `json:"churnOutlook" bson:"churn_outlook"`
	MarketPositioning     string `json:"marketPositioning" bson:"market_positioning"`
}

// OpenAIVerdictResponse is the expected JSON structure from OpenAI
type OpenAIVerdictResponse struct {
	Headline        string   `json:"headline"`
	Summary         string   `json:"summary"`
	Confidence      string   `json:"confidence"`
	CTA             string   `json:"cta"`
	WhyThisDecision []string `json:"why_this_decision"`
	WhatToExpect    struct {
		RiskLevel   string `json:"risk_level"`
		Description string `json:"description"`
	} `json:"what_to_expect"`
	SupportingDetails struct {
		ExpectedRevenueImpact string `json:"expected_revenue_impact"`
		ChurnOutlook          string `json:"churn_outlook"`
		MarketPositioning     string `json:"market_positioning"`
	} `json:"supporting_details"`
}
