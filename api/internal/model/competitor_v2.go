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
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID     primitive.ObjectID `json:"user_id" bson:"user_id"`
	Name       string             `json:"name" bson:"name"`
	Domain     string             `json:"domain" bson:"domain"`
	Why        string             `json:"why" bson:"why"`
	Confidence float64            `json:"confidence" bson:"confidence"`
	CreatedAt  time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt  time.Time          `json:"updated_at" bson:"updated_at"`
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
