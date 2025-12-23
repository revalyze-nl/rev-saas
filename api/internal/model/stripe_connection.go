package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// StripeConnectionStatus represents the status of a Stripe connection.
type StripeConnectionStatus string

const (
	StripeStatusConnected    StripeConnectionStatus = "connected"
	StripeStatusDisconnected StripeConnectionStatus = "disconnected"
)

// StripeConnection stores the Stripe Connect OAuth connection for a user.
type StripeConnection struct {
	ID                    primitive.ObjectID     `bson:"_id,omitempty" json:"id"`
	UserID                primitive.ObjectID     `bson:"user_id" json:"user_id"`
	StripeAccountID       string                 `bson:"stripe_account_id" json:"stripe_account_id"`
	AccessTokenEncrypted  string                 `bson:"access_token_encrypted" json:"-"` // Never expose in JSON
	RefreshTokenEncrypted string                 `bson:"refresh_token_encrypted,omitempty" json:"-"`
	TokenType             string                 `bson:"token_type,omitempty" json:"token_type,omitempty"`
	Scope                 string                 `bson:"scope,omitempty" json:"scope,omitempty"`
	Livemode              bool                   `bson:"livemode" json:"livemode"`
	Status                StripeConnectionStatus `bson:"status" json:"status"`
	ConnectedAt           time.Time              `bson:"connected_at" json:"connected_at"`
	UpdatedAt             time.Time              `bson:"updated_at" json:"updated_at"`
	LastSyncAt            *time.Time             `bson:"last_sync_at,omitempty" json:"last_sync_at,omitempty"`
}

// StripeConnectionStatusResponse is the API response for connection status.
type StripeConnectionStatusResponse struct {
	Connected       bool       `json:"connected"`
	StripeAccountID string     `json:"stripe_account_id,omitempty"`
	Livemode        bool       `json:"livemode,omitempty"`
	LastSyncAt      *time.Time `json:"last_sync_at,omitempty"`
}

// StripeSyncResult represents the result of a metrics sync operation.
type StripeSyncResult struct {
	OK       bool              `json:"ok"`
	Updated  StripeSyncUpdated `json:"updated,omitempty"`
	Mapping  *StripeMappingInfo `json:"mapping,omitempty"`
	Warnings []string          `json:"warnings,omitempty"`
}

// StripeSyncUpdated contains the updated metrics from Stripe sync.
type StripeSyncUpdated struct {
	Currency             string   `json:"currency,omitempty"`
	MRR                  int64    `json:"mrr,omitempty"` // in cents
	TotalActiveCustomers int      `json:"total_active_customers,omitempty"`
	UpdatedPrices        []string `json:"updated_prices,omitempty"` // List of updated plan prices
}

// StripeMappingInfo contains info about auto-mapped plans.
type StripeMappingInfo struct {
	MappedCount   int `json:"mapped_count"`
	UnmappedCount int `json:"unmapped_count"`
}

