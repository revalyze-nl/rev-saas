package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DiscoveredCompetitor represents a competitor discovered by AI analysis
type DiscoveredCompetitor struct {
	Name       string  `json:"name" bson:"name"`
	Domain     string  `json:"domain" bson:"domain"`
	Why        string  `json:"why" bson:"why"`
	Confidence float64 `json:"confidence" bson:"confidence"`
}

// SavedCompetitor represents a competitor saved by the user
type SavedCompetitor struct {
	ID         primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	UserID     primitive.ObjectID  `json:"user_id" bson:"user_id"`
	Name       string              `json:"name" bson:"name"`
	Domain     string              `json:"domain" bson:"domain"`
	Why        string              `json:"why" bson:"why"`
	Confidence float64             `json:"confidence" bson:"confidence"`
	Pricing    *CompetitorPricing  `json:"pricing,omitempty" bson:"pricing,omitempty"`
	CreatedAt  time.Time           `json:"created_at" bson:"created_at"`
	UpdatedAt  time.Time           `json:"updated_at" bson:"updated_at"`
}

// CompetitorPricing represents extracted pricing data for a competitor
type CompetitorPricing struct {
	Plans            []CompetitorV2Plan `json:"plans" bson:"plans"`
	ExtractedAt      time.Time          `json:"extracted_at" bson:"extracted_at"`
	ExtractionMethod string             `json:"extraction_method" bson:"extraction_method"`
	Verified         bool               `json:"verified" bson:"verified"`
}

// CompetitorV2Plan represents a pricing plan from a competitor (V2 with detailed info)
type CompetitorV2Plan struct {
	Name           string   `json:"name" bson:"name"`
	PriceMonthly   float64  `json:"price_monthly" bson:"price_monthly"`
	PriceYearly    float64  `json:"price_yearly" bson:"price_yearly"`
	Currency       string   `json:"currency" bson:"currency"`
	BillingPeriods []string `json:"billing_periods,omitempty" bson:"billing_periods,omitempty"`
	Features       []string `json:"features,omitempty" bson:"features,omitempty"`
}

// CompetitorDiscoveryRequest represents the request to discover competitors
type CompetitorDiscoveryRequest struct {
	WebsiteURL string `json:"website_url"`
}

// CompetitorDiscoveryResponse represents the response from competitor discovery
type CompetitorDiscoveryResponse struct {
	Competitors []DiscoveredCompetitor `json:"competitors"`
	Source      string                 `json:"source"` // "ai" or "cache"
}

// SaveCompetitorsRequest represents the request to save competitors
type SaveCompetitorsRequest struct {
	Competitors []DiscoveredCompetitor `json:"competitors"`
}

// SavedCompetitorsResponse represents the list of saved competitors
type SavedCompetitorsResponse struct {
	Competitors []SavedCompetitor `json:"competitors"`
	Count       int               `json:"count"`
	Limit       int               `json:"limit"`
}
