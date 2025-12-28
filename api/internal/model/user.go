package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// User role constants
const (
	RoleUser  = "user"
	RoleAdmin = "admin"
)

// User plan constants
const (
	PlanFree       = "free"
	PlanStarter    = "starter"
	PlanGrowth     = "growth"
	PlanEnterprise = "enterprise"
	PlanAdmin      = "admin" // Special unlimited plan for admins
)

// User represents a user in the system.
type User struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Email     string             `bson:"email" json:"email"`
	Password  string             `bson:"password,omitempty" json:"-"` // never expose hash in JSON
	FullName  string             `bson:"full_name,omitempty" json:"full_name,omitempty"`
	Role      string             `bson:"role,omitempty" json:"role,omitempty"` // "user" or "admin"
	Plan      string             `bson:"plan,omitempty" json:"plan,omitempty"` // "free", "starter", "growth", "enterprise", "admin"
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`

	// Usage tracking fields
	AnalysisTotalUsed  int       `bson:"analysis_total_used,omitempty" json:"analysis_total_used,omitempty"`   // Lifetime count (for free plan)
	AnalysisMonthCount int       `bson:"analysis_month_count,omitempty" json:"analysis_month_count,omitempty"` // Monthly count
	AnalysisMonthStart time.Time `bson:"analysis_month_start,omitempty" json:"analysis_month_start,omitempty"` // When current month started
	TrialExpiresAt     time.Time `bson:"trial_expires_at,omitempty" json:"trial_expires_at,omitempty"`         // Trial expiry for free plan

	// Email verification fields
	EmailVerified        bool       `bson:"email_verified" json:"email_verified"`
	EmailVerifyTokenHash string     `bson:"email_verify_token_hash,omitempty" json:"-"`
	EmailVerifyExpiresAt *time.Time `bson:"email_verify_expires_at,omitempty" json:"-"`
	EmailVerifySentAt    *time.Time `bson:"email_verify_sent_at,omitempty" json:"email_verify_sent_at,omitempty"`

	// Terms acceptance fields
	AcceptedTerms   bool       `bson:"accepted_terms" json:"accepted_terms"`
	AcceptedTermsAt *time.Time `bson:"accepted_terms_at,omitempty" json:"accepted_terms_at,omitempty"`
}

// IsAdmin returns true if the user has admin role
func (u *User) IsAdmin() bool {
	return u.Role == RoleAdmin
}

// HasUnlimitedAccess returns true if the user should skip all limit checks
func (u *User) HasUnlimitedAccess() bool {
	return u.Role == RoleAdmin || u.Plan == PlanAdmin
}

// IsTrialExpired returns true if the free trial has expired
func (u *User) IsTrialExpired() bool {
	if u.Plan != PlanFree {
		return false
	}
	if u.TrialExpiresAt.IsZero() {
		return false
	}
	return time.Now().After(u.TrialExpiresAt)
}

// GetEffectivePlan returns the user's plan, defaulting to "free" if empty
func (u *User) GetEffectivePlan() string {
	if u.Plan == "" {
		return PlanFree
	}
	return u.Plan
}

