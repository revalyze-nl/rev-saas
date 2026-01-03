package service

import (
	"testing"

	"rev-saas-api/internal/model"
)

// TestSelectNextActions_HighChurnAndTierNaming verifies deterministic action selection
// for a result with HIGH_CHURN and TIER_NAMING_MISMATCH insights.
func TestSelectNextActions_HighChurnAndTierNaming(t *testing.T) {
	ruleResult := model.RuleEngineResult{
		Insights: []model.RuleEngineInsight{
			{
				Code:     InsightCodeHighChurn,
				Title:    "Elevated Churn Detected",
				Severity: SeverityWarning,
			},
			{
				Code:     InsightCodeTierNamingMismatch,
				Title:    "Tier Naming Inconsistency",
				Severity: SeverityWarning,
			},
		},
		ChurnCategory:  "high",
		HasCompetitors: true,
		HasMetrics:     true,
	}

	input := model.AnalysisInputV2{
		UserPlans: []model.PricingPlanInput{
			{Name: "Starter", Price: 29},
			{Name: "Pro", Price: 99},
		},
	}

	actions := SelectNextActions(ruleResult, input)

	// Should return at least 2 actions
	if len(actions) < 2 {
		t.Errorf("Expected at least 2 actions, got %d", len(actions))
	}

	// Should include ADDRESS_RETENTION_BEFORE_PRICING (from HIGH_CHURN)
	foundRetention := false
	foundNaming := false

	for _, action := range actions {
		if action.Code == ActionCodeAddressRetentionFirst {
			foundRetention = true
		}
		if action.Code == ActionCodeReviewPlanNamingClarity {
			foundNaming = true
		}
	}

	if !foundRetention {
		t.Error("Expected ADDRESS_RETENTION_BEFORE_PRICING action from HIGH_CHURN insight")
	}

	if !foundNaming {
		t.Error("Expected REVIEW_PLAN_NAMING_CLARITY action from TIER_NAMING_MISMATCH insight")
	}
}

// TestSelectNextActions_DeterministicOrder verifies that the same input always produces
// the same output in the same order.
func TestSelectNextActions_DeterministicOrder(t *testing.T) {
	ruleResult := model.RuleEngineResult{
		Insights: []model.RuleEngineInsight{
			{Code: InsightCodeTierNamingMismatch, Severity: SeverityWarning},
			{Code: InsightCodeEntryPriceLow, Severity: SeverityInfo},
			{Code: InsightCodeHighChurn, Severity: SeverityWarning},
		},
		ChurnCategory:  "high",
		HasCompetitors: true,
		HasMetrics:     true,
	}

	input := model.AnalysisInputV2{
		UserPlans: []model.PricingPlanInput{
			{Name: "Free", Price: 0},
			{Name: "Pro", Price: 99},
		},
	}

	// Run multiple times
	var firstResult []NextActionTemplate
	for i := 0; i < 5; i++ {
		actions := SelectNextActions(ruleResult, input)
		if firstResult == nil {
			firstResult = actions
		} else {
			// Compare with first result
			if len(actions) != len(firstResult) {
				t.Errorf("Iteration %d: length mismatch, expected %d, got %d", i, len(firstResult), len(actions))
				continue
			}
			for j := range actions {
				if actions[j].Code != firstResult[j].Code {
					t.Errorf("Iteration %d, position %d: expected code %s, got %s", i, j, firstResult[j].Code, actions[j].Code)
				}
			}
		}
	}
}

// TestSelectNextActions_CriticalChurn verifies that critical churn produces the retention action.
func TestSelectNextActions_CriticalChurn(t *testing.T) {
	ruleResult := model.RuleEngineResult{
		Insights: []model.RuleEngineInsight{
			{
				Code:     InsightCodeCriticalChurn,
				Title:    "Critical Retention Challenge",
				Severity: SeverityCritical,
			},
		},
		ChurnCategory:  "critical",
		HasCompetitors: false,
		HasMetrics:     true,
	}

	input := model.AnalysisInputV2{
		UserPlans: []model.PricingPlanInput{
			{Name: "Basic", Price: 19},
		},
	}

	actions := SelectNextActions(ruleResult, input)

	// First action should be retention (highest priority)
	if len(actions) == 0 {
		t.Fatal("Expected at least one action")
	}

	if actions[0].Code != ActionCodeAddressRetentionFirst {
		t.Errorf("Expected first action to be ADDRESS_RETENTION_BEFORE_PRICING, got %s", actions[0].Code)
	}
}

// TestSelectNextActions_NoCompetitors verifies fallback action when no competitor data.
func TestSelectNextActions_NoCompetitors(t *testing.T) {
	ruleResult := model.RuleEngineResult{
		Insights: []model.RuleEngineInsight{
			{
				Code:     InsightCodeNoCompetitors,
				Title:    "No Competitor Data",
				Severity: SeverityInfo,
			},
		},
		ChurnCategory:  "low",
		HasCompetitors: false,
		HasMetrics:     true,
	}

	input := model.AnalysisInputV2{
		UserPlans: []model.PricingPlanInput{
			{Name: "Starter", Price: 29},
		},
	}

	actions := SelectNextActions(ruleResult, input)

	// Should include ADD_COMPETITOR_DATA
	found := false
	for _, action := range actions {
		if action.Code == ActionCodeAddCompetitorData {
			found = true
			break
		}
	}

	if !found {
		t.Error("Expected ADD_COMPETITOR_DATA action when no competitor data available")
	}
}

// TestSelectNextActions_SteepPriceCliff verifies intermediate tier suggestion.
func TestSelectNextActions_SteepPriceCliff(t *testing.T) {
	ruleResult := model.RuleEngineResult{
		Insights: []model.RuleEngineInsight{
			{
				Code:     InsightCodeSteepPriceCliff,
				Title:    "Steep Price Jump",
				Severity: SeverityWarning,
			},
		},
		ChurnCategory:  "low",
		HasCompetitors: true,
		HasMetrics:     true,
	}

	input := model.AnalysisInputV2{
		UserPlans: []model.PricingPlanInput{
			{Name: "Starter", Price: 19},
			{Name: "Enterprise", Price: 199},
		},
	}

	actions := SelectNextActions(ruleResult, input)

	// Should include SIMULATE_INTERMEDIATE_TIER
	found := false
	for _, action := range actions {
		if action.Code == ActionCodeSimulateIntermediateTier {
			found = true
			break
		}
	}

	if !found {
		t.Error("Expected SIMULATE_INTERMEDIATE_TIER action for steep price cliff")
	}
}

// TestSelectNextActions_MaxThreeActions verifies we never return more than 3 actions.
func TestSelectNextActions_MaxThreeActions(t *testing.T) {
	ruleResult := model.RuleEngineResult{
		Insights: []model.RuleEngineInsight{
			{Code: InsightCodeHighChurn, Severity: SeverityWarning},
			{Code: InsightCodeTierNamingMismatch, Severity: SeverityWarning},
			{Code: InsightCodeEntryPriceHigh, Severity: SeverityWarning},
			{Code: InsightCodeCompressedPricing, Severity: SeverityWarning},
			{Code: InsightCodeNoCompetitors, Severity: SeverityInfo},
		},
		ChurnCategory:  "high",
		HasCompetitors: false,
		HasMetrics:     true,
	}

	input := model.AnalysisInputV2{
		UserPlans: []model.PricingPlanInput{
			{Name: "Basic", Price: 19},
			{Name: "Pro", Price: 29},
		},
	}

	actions := SelectNextActions(ruleResult, input)

	if len(actions) > 3 {
		t.Errorf("Expected max 3 actions, got %d", len(actions))
	}
}

// TestSelectNextActions_PriorityOrder verifies actions are sorted by priority.
func TestSelectNextActions_PriorityOrder(t *testing.T) {
	// Create a result with multiple insights that trigger different priority actions
	ruleResult := model.RuleEngineResult{
		Insights: []model.RuleEngineInsight{
			{Code: InsightCodeNoCompetitors, Severity: SeverityInfo},       // Priority 6
			{Code: InsightCodeHighChurn, Severity: SeverityWarning},        // Priority 1 (retention)
			{Code: InsightCodeTierNamingMismatch, Severity: SeverityWarning}, // Priority 4
		},
		ChurnCategory:  "high",
		HasCompetitors: false,
		HasMetrics:     true,
	}

	input := model.AnalysisInputV2{
		UserPlans: []model.PricingPlanInput{
			{Name: "Starter", Price: 29},
		},
	}

	actions := SelectNextActions(ruleResult, input)

	if len(actions) < 2 {
		t.Fatal("Expected at least 2 actions")
	}

	// First action should be highest priority (retention)
	if actions[0].Code != ActionCodeAddressRetentionFirst {
		t.Errorf("Expected first action to have highest priority (ADDRESS_RETENTION_BEFORE_PRICING), got %s", actions[0].Code)
	}
}

// TestCreateFallbackActions verifies fallback action creation from templates.
func TestCreateFallbackActions(t *testing.T) {
	templates := []NextActionTemplate{
		{
			Code:  ActionCodeTestEntryPriceIncrease,
			Title: "Consider Testing Entry Price Increase",
			Hint:  "Your entry tier may be underpriced",
		},
		{
			Code:  ActionCodeValidateValuePositioning,
			Title: "Validate Value Positioning",
			Hint:  "Ensure your pricing reflects value",
		},
	}

	actions := CreateFallbackActions(templates)

	if len(actions) != len(templates) {
		t.Errorf("Expected %d actions, got %d", len(templates), len(actions))
	}

	for i, action := range actions {
		if action.Code != templates[i].Code {
			t.Errorf("Action %d: expected code %s, got %s", i, templates[i].Code, action.Code)
		}
		if action.Title != templates[i].Title {
			t.Errorf("Action %d: expected title %s, got %s", i, templates[i].Title, action.Title)
		}
		if action.Description != templates[i].Hint {
			t.Errorf("Action %d: expected description %s, got %s", i, templates[i].Hint, action.Description)
		}
	}
}

