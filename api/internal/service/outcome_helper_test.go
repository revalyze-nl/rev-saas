package service

import (
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"rev-saas-api/internal/model"
)

func TestGetEffectiveOutcomes_NoCorractions(t *testing.T) {
	outcomes := []model.OutcomeV2{
		{
			ID:          primitive.NewObjectID(),
			OutcomeType: "revenue",
			CreatedAt:   time.Now().Add(-2 * time.Hour),
		},
		{
			ID:          primitive.NewObjectID(),
			OutcomeType: "churn",
			CreatedAt:   time.Now().Add(-1 * time.Hour),
		},
	}

	effective := GetEffectiveOutcomes(outcomes)

	if len(effective) != 2 {
		t.Errorf("expected 2 effective outcomes, got %d", len(effective))
	}
}

func TestGetEffectiveOutcomes_WithCorrection(t *testing.T) {
	originalID := primitive.NewObjectID()

	outcomes := []model.OutcomeV2{
		{
			ID:           originalID,
			OutcomeType:  "revenue",
			IsCorrection: false,
			CreatedAt:    time.Now().Add(-2 * time.Hour),
		},
		{
			ID:                primitive.NewObjectID(),
			OutcomeType:       "revenue",
			IsCorrection:      true,
			CorrectsOutcomeID: &originalID, // This corrects the original
			CreatedAt:         time.Now().Add(-1 * time.Hour),
		},
		{
			ID:           primitive.NewObjectID(),
			OutcomeType:  "churn",
			IsCorrection: false,
			CreatedAt:    time.Now(),
		},
	}

	effective := GetEffectiveOutcomes(outcomes)

	// Should have 2: the correction (which supersedes original) and the churn outcome
	if len(effective) != 2 {
		t.Errorf("expected 2 effective outcomes, got %d", len(effective))
	}

	// The original revenue outcome should not be in effective list
	for _, o := range effective {
		if o.ID == originalID {
			t.Error("original outcome should have been superseded by correction")
		}
	}
}

func TestGetEffectiveOutcomes_Empty(t *testing.T) {
	var outcomes []model.OutcomeV2
	effective := GetEffectiveOutcomes(outcomes)

	if len(effective) != 0 {
		t.Errorf("expected 0 effective outcomes for empty input, got %d", len(effective))
	}
}

func TestGetLatestEffectiveOutcome(t *testing.T) {
	now := time.Now()
	oldID := primitive.NewObjectID()

	outcomes := []model.OutcomeV2{
		{
			ID:          oldID,
			OutcomeType: "revenue",
			CreatedAt:   now.Add(-3 * time.Hour),
		},
		{
			ID:          primitive.NewObjectID(),
			OutcomeType: "churn",
			CreatedAt:   now.Add(-1 * time.Hour), // Most recent
		},
		{
			ID:          primitive.NewObjectID(),
			OutcomeType: "retention",
			CreatedAt:   now.Add(-2 * time.Hour),
		},
	}

	latest := GetLatestEffectiveOutcome(outcomes)

	if latest == nil {
		t.Fatal("expected a latest outcome, got nil")
	}
	if latest.OutcomeType != "churn" {
		t.Errorf("expected latest outcome type=churn, got %s", latest.OutcomeType)
	}
}

func TestGetLatestEffectiveOutcome_WithCorrection(t *testing.T) {
	now := time.Now()
	originalID := primitive.NewObjectID()

	outcomes := []model.OutcomeV2{
		{
			ID:          originalID,
			OutcomeType: "revenue",
			CreatedAt:   now.Add(-3 * time.Hour),
		},
		{
			ID:                primitive.NewObjectID(),
			OutcomeType:       "revenue",
			IsCorrection:      true,
			CorrectsOutcomeID: &originalID,
			CreatedAt:         now.Add(-1 * time.Hour), // Most recent, and it's a correction
		},
	}

	latest := GetLatestEffectiveOutcome(outcomes)

	if latest == nil {
		t.Fatal("expected a latest outcome, got nil")
	}
	if !latest.IsCorrection {
		t.Error("expected latest to be the correction")
	}
}

func TestGetLatestEffectiveOutcome_Empty(t *testing.T) {
	var outcomes []model.OutcomeV2
	latest := GetLatestEffectiveOutcome(outcomes)

	if latest != nil {
		t.Errorf("expected nil for empty outcomes, got %v", latest)
	}
}

func TestCalculateDeltaPercent(t *testing.T) {
	tests := []struct {
		name     string
		before   *float64
		after    *float64
		expected *float64
	}{
		{
			name:     "positive change",
			before:   floatPtr(100),
			after:    floatPtr(120),
			expected: floatPtr(20.0),
		},
		{
			name:     "negative change",
			before:   floatPtr(100),
			after:    floatPtr(80),
			expected: floatPtr(-20.0),
		},
		{
			name:     "no change",
			before:   floatPtr(100),
			after:    floatPtr(100),
			expected: floatPtr(0.0),
		},
		{
			name:     "nil before",
			before:   nil,
			after:    floatPtr(100),
			expected: nil,
		},
		{
			name:     "nil after",
			before:   floatPtr(100),
			after:    nil,
			expected: nil,
		},
		{
			name:     "zero before",
			before:   floatPtr(0),
			after:    floatPtr(100),
			expected: nil, // Division by zero protection
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CalculateDeltaPercent(tt.before, tt.after)

			if tt.expected == nil {
				if result != nil {
					t.Errorf("expected nil, got %v", *result)
				}
				return
			}

			if result == nil {
				t.Errorf("expected %v, got nil", *tt.expected)
				return
			}

			if *result != *tt.expected {
				t.Errorf("expected %v, got %v", *tt.expected, *result)
			}
		})
	}
}

func TestGetOutcomeSummary(t *testing.T) {
	delta := 15.5
	outcomes := []model.OutcomeV2{
		{
			ID:            primitive.NewObjectID(),
			OutcomeType:   "revenue",
			TimeframeDays: 30,
			DeltaPercent:  &delta,
			CreatedAt:     time.Now(),
		},
	}

	summary := GetOutcomeSummary(outcomes)

	if summary == "" {
		t.Error("expected non-empty summary")
	}
	if summary != "+15.5% revenue (30d)" {
		t.Errorf("unexpected summary format: %s", summary)
	}
}

func TestGetOutcomeSummary_NegativeDelta(t *testing.T) {
	delta := -8.3
	outcomes := []model.OutcomeV2{
		{
			ID:            primitive.NewObjectID(),
			OutcomeType:   "churn",
			TimeframeDays: 60,
			DeltaPercent:  &delta,
			CreatedAt:     time.Now(),
		},
	}

	summary := GetOutcomeSummary(outcomes)

	// Negative should not have + prefix
	if summary != "-8.3% churn (60d)" {
		t.Errorf("unexpected summary format: %s", summary)
	}
}

func TestGetOutcomeSummary_NoDelta(t *testing.T) {
	outcomes := []model.OutcomeV2{
		{
			ID:            primitive.NewObjectID(),
			OutcomeType:   "revenue",
			TimeframeDays: 30,
			DeltaPercent:  nil, // No delta
			CreatedAt:     time.Now(),
		},
	}

	summary := GetOutcomeSummary(outcomes)

	if summary != "Outcome recorded" {
		t.Errorf("expected 'Outcome recorded' for nil delta, got: %s", summary)
	}
}

func TestGetOutcomeSummary_Empty(t *testing.T) {
	var outcomes []model.OutcomeV2
	summary := GetOutcomeSummary(outcomes)

	if summary != "" {
		t.Errorf("expected empty summary for no outcomes, got: %s", summary)
	}
}

// Helper function
func floatPtr(f float64) *float64 {
	return &f
}
