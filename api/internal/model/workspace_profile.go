package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// MarketDefaults represents market configuration in workspace
type MarketDefaults struct {
	Type    *string `json:"type,omitempty" bson:"type,omitempty"`       // b2b | b2c | b2b2c
	Segment *string `json:"segment,omitempty" bson:"segment,omitempty"` // DevTools, CRM, etc.
}

// WorkspaceDefaults represents default context values for a workspace
type WorkspaceDefaults struct {
	CompanyStage  *string         `json:"companyStage,omitempty" bson:"company_stage,omitempty"`
	BusinessModel *string         `json:"businessModel,omitempty" bson:"business_model,omitempty"`
	PrimaryKPI    *string         `json:"primaryKpi,omitempty" bson:"primary_kpi,omitempty"`
	Market        *MarketDefaults `json:"market,omitempty" bson:"market,omitempty"`
}

// WorkspaceProfile represents a user's workspace configuration
type WorkspaceProfile struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID         primitive.ObjectID `json:"userId" bson:"user_id"`
	CompanyName    string             `json:"companyName" bson:"company_name"`
	CompanyWebsite string             `json:"companyWebsite" bson:"company_website"`
	Defaults       WorkspaceDefaults  `json:"defaults" bson:"defaults"`
	CreatedAt      time.Time          `json:"createdAt" bson:"created_at"`
	UpdatedAt      time.Time          `json:"updatedAt" bson:"updated_at"`
}

// WorkspaceProfileRequest represents the API request to update workspace profile
type WorkspaceProfileRequest struct {
	CompanyName    string            `json:"companyName"`
	CompanyWebsite string            `json:"companyWebsite"`
	Defaults       WorkspaceDefaults `json:"defaults"`
}

// MarketDefaultsPatch represents partial market updates
type MarketDefaultsPatch struct {
	Type    *string `json:"type,omitempty"`
	Segment *string `json:"segment,omitempty"`
}

// WorkspaceDefaultsPatch represents partial updates to workspace defaults
type WorkspaceDefaultsPatch struct {
	CompanyStage  *string              `json:"companyStage,omitempty"`
	BusinessModel *string              `json:"businessModel,omitempty"`
	PrimaryKPI    *string              `json:"primaryKpi,omitempty"`
	Market        *MarketDefaultsPatch `json:"market,omitempty"`
}
