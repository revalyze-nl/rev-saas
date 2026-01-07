package service

import (
	"fmt"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"rev-saas-api/internal/model"
)

// GetEffectiveOutcomes returns outcomes that haven't been superseded by corrections
func GetEffectiveOutcomes(outcomes []model.OutcomeV2) []model.OutcomeV2 {
	if len(outcomes) == 0 {
		return outcomes
	}

	// Build map of original -> correction
	correctionMap := make(map[primitive.ObjectID]primitive.ObjectID)
	for _, o := range outcomes {
		if o.IsCorrection && o.CorrectsOutcomeID != nil {
			correctionMap[*o.CorrectsOutcomeID] = o.ID
		}
	}

	// Filter outcomes
	var effective []model.OutcomeV2
	for _, o := range outcomes {
		// Include if:
		// - It's a correction, OR
		// - It's an original that has no correction superseding it
		if o.IsCorrection || correctionMap[o.ID] == primitive.NilObjectID {
			effective = append(effective, o)
		}
	}

	return effective
}

// GetLatestEffectiveOutcome returns the most recent effective outcome
func GetLatestEffectiveOutcome(outcomes []model.OutcomeV2) *model.OutcomeV2 {
	effective := GetEffectiveOutcomes(outcomes)
	if len(effective) == 0 {
		return nil
	}

	// Find most recent by CreatedAt
	latest := &effective[0]
	for i := 1; i < len(effective); i++ {
		if effective[i].CreatedAt.After(latest.CreatedAt) {
			latest = &effective[i]
		}
	}

	return latest
}

// CalculateDeltaPercent calculates percentage change between before and after
func CalculateDeltaPercent(before, after *float64) *float64 {
	if before == nil || after == nil || *before == 0 {
		return nil
	}
	delta := ((*after - *before) / *before) * 100
	return &delta
}

// GetOutcomeSummary generates a human-readable summary of the latest outcome
func GetOutcomeSummary(outcomes []model.OutcomeV2) string {
	latest := GetLatestEffectiveOutcome(outcomes)
	if latest == nil {
		return ""
	}

	if latest.DeltaPercent != nil {
		sign := "+"
		if *latest.DeltaPercent < 0 {
			sign = ""
		}
		return fmt.Sprintf("%s%.1f%% %s (%dd)", sign, *latest.DeltaPercent, latest.OutcomeType, latest.TimeframeDays)
	}

	return "Outcome recorded"
}

// GetOutcomeSummaryFromDecision generates summary from a full decision's outcomes
func GetOutcomeSummaryFromDecision(outcomes []model.OutcomeV2) string {
	if len(outcomes) == 0 {
		return ""
	}

	// Find latest effective outcome
	correctionMap := make(map[primitive.ObjectID]bool)
	for _, o := range outcomes {
		if o.IsCorrection && o.CorrectsOutcomeID != nil {
			correctionMap[*o.CorrectsOutcomeID] = true
		}
	}

	var latest *model.OutcomeV2
	for i := range outcomes {
		o := &outcomes[i]
		// Skip if superseded
		if correctionMap[o.ID] {
			continue
		}
		if latest == nil || o.CreatedAt.After(latest.CreatedAt) {
			latest = o
		}
	}

	if latest == nil || latest.DeltaPercent == nil {
		return ""
	}

	sign := "+"
	if *latest.DeltaPercent < 0 {
		sign = ""
	}

	return fmt.Sprintf("%s%.1f%% (%dd)", sign, *latest.DeltaPercent, latest.TimeframeDays)
}
