package service

import (
	"testing"

	"rev-saas-api/internal/model"
)

func TestValidStatusTransitions(t *testing.T) {
	tests := []struct {
		name      string
		from      string
		to        string
		shouldErr bool
	}{
		// Valid transitions from pending
		{"pending to approved", model.DecisionStatusPending, model.DecisionStatusApproved, false},
		{"pending to rejected", model.DecisionStatusPending, model.DecisionStatusRejected, false},
		{"pending to deferred", model.DecisionStatusPending, model.DecisionStatusDeferred, false},

		// Valid transitions from approved
		{"approved to completed", model.DecisionStatusApproved, model.DecisionStatusCompleted, false},
		{"approved to pending", model.DecisionStatusApproved, model.DecisionStatusPending, false},

		// Valid transitions from rejected
		{"rejected to pending", model.DecisionStatusRejected, model.DecisionStatusPending, false},

		// Valid transitions from deferred
		{"deferred to pending", model.DecisionStatusDeferred, model.DecisionStatusPending, false},
		{"deferred to approved", model.DecisionStatusDeferred, model.DecisionStatusApproved, false},
		{"deferred to rejected", model.DecisionStatusDeferred, model.DecisionStatusRejected, false},

		// Invalid transitions
		{"pending to completed", model.DecisionStatusPending, model.DecisionStatusCompleted, true},
		{"completed to anything", model.DecisionStatusCompleted, model.DecisionStatusPending, true},
		{"rejected to approved", model.DecisionStatusRejected, model.DecisionStatusApproved, true},
		{"approved to rejected", model.DecisionStatusApproved, model.DecisionStatusRejected, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			allowedTransitions := validStatusTransitions[tt.from]
			valid := false
			for _, allowed := range allowedTransitions {
				if allowed == tt.to {
					valid = true
					break
				}
			}

			if valid && tt.shouldErr {
				t.Errorf("expected transition %s->%s to be invalid, but it was valid", tt.from, tt.to)
			}
			if !valid && !tt.shouldErr {
				t.Errorf("expected transition %s->%s to be valid, but it was invalid", tt.from, tt.to)
			}
		})
	}
}

func TestIsValidOutcomeType(t *testing.T) {
	tests := []struct {
		outcomeType string
		expected    bool
	}{
		{"revenue", true},
		{"churn", true},
		{"retention", true},
		{"growth", true},
		{"cost", true},
		{"other", true},
		{"invalid", false},
		{"", false},
		{"Revenue", false}, // Case sensitive
	}

	for _, tt := range tests {
		t.Run(tt.outcomeType, func(t *testing.T) {
			result := isValidOutcomeType(tt.outcomeType)
			if result != tt.expected {
				t.Errorf("isValidOutcomeType(%q) = %v, expected %v", tt.outcomeType, result, tt.expected)
			}
		})
	}
}

func TestConfidenceLabelFromScore(t *testing.T) {
	tests := []struct {
		score    float64
		expected string
	}{
		{0.9, "high"},
		{0.8, "high"},
		{0.79, "medium"},
		{0.6, "medium"},
		{0.59, "low"},
		{0.0, "low"},
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			result := model.ConfidenceLabelFromScore(tt.score)
			if result != tt.expected {
				t.Errorf("ConfidenceLabelFromScore(%v) = %q, expected %q", tt.score, result, tt.expected)
			}
		})
	}
}

func TestRiskLabelFromScore(t *testing.T) {
	tests := []struct {
		score    float64
		expected string
	}{
		{0.9, "high"},
		{0.7, "high"},
		{0.69, "medium"},
		{0.4, "medium"},
		{0.39, "low"},
		{0.0, "low"},
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			result := model.RiskLabelFromScore(tt.score)
			if result != tt.expected {
				t.Errorf("RiskLabelFromScore(%v) = %q, expected %q", tt.score, result, tt.expected)
			}
		})
	}
}
