package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Plan represents a pricing plan belonging to a user.
type Plan struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID       primitive.ObjectID `bson:"user_id" json:"user_id"`
	Name         string             `bson:"name" json:"name"`
	Price        float64            `bson:"price" json:"price"`
	Currency     string             `bson:"currency,omitempty" json:"currency,omitempty"`
	BillingCycle string             `bson:"billing_cycle,omitempty" json:"billing_cycle,omitempty"`
	CreatedAt    time.Time          `bson:"created_at" json:"created_at"`

	// Stripe integration (optional)
	StripePriceID     string            `bson:"stripe_price_id,omitempty" json:"stripe_price_id,omitempty"`
	StripeProductID   string            `bson:"stripe_product_id,omitempty" json:"stripe_product_id,omitempty"`
	StripePriceLookup *StripePriceLookup `bson:"stripe_price_lookup,omitempty" json:"stripe_price_lookup,omitempty"`
}

// StripePriceLookup contains debugging info about the mapped Stripe price.
type StripePriceLookup struct {
	Currency    string `bson:"currency,omitempty" json:"currency,omitempty"`
	UnitAmount  int64  `bson:"unit_amount,omitempty" json:"unit_amount,omitempty"`
	Interval    string `bson:"interval,omitempty" json:"interval,omitempty"`
	Nickname    string `bson:"nickname,omitempty" json:"nickname,omitempty"`
	ProductName string `bson:"product_name,omitempty" json:"product_name,omitempty"`
}


