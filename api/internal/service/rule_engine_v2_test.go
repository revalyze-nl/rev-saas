package service

import (
	"testing"

	"rev-saas-api/internal/model"
)

// TestHighChurnInsight verifies that high churn rates produce retention-related insights.
func TestHighChurnInsight(t *testing.T) {
	engine := NewPricingRuleEngine()

	tests := []struct {
		name          string
		churnRate     float64
		wantInsight   bool
		wantCode      string
		wantSeverity  string
		wantCategory  string
	}{
		{
			name:         "Critical churn >10%",
			churnRate:    12.5,
			wantInsight:  true,
			wantCode:     InsightCodeCriticalChurn,
			wantSeverity: SeverityCritical,
			wantCategory: CategoryRetention,
		},
		{
			name:         "High churn 8-10%",
			churnRate:    9.0,
			wantInsight:  true,
			wantCode:     InsightCodeHighChurn,
			wantSeverity: SeverityWarning,
			wantCategory: CategoryRetention,
		},
		{
			name:         "Moderate churn 5-8%",
			churnRate:    6.5,
			wantInsight:  false,
			wantCode:     "",
		},
		{
			name:         "Healthy churn <5%",
			churnRate:    3.0,
			wantInsight:  true,
			wantCode:     InsightCodeHealthyChurn,
			wantSeverity: SeverityInfo,
			wantCategory: CategoryRetention,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			input := model.AnalysisInputV2{
				UserPlans: []model.PricingPlanInput{
					{Name: "Starter", Price: 29, Currency: "USD", Billing: "monthly"},
				},
				BusinessMetrics: model.BusinessMetricsInput{
					MRR:       10000,
					ChurnRate: tc.churnRate,
					Customers: 100,
				},
			}

			result := engine.RunRuleEngine(input)

			// Check churn category
			expectedCategory := "moderate"
			if tc.churnRate > 10 {
				expectedCategory = "critical"
			} else if tc.churnRate > 8 {
				expectedCategory = "high"
			} else if tc.churnRate <= 5 && tc.churnRate > 0 {
				expectedCategory = "low"
			}
			if result.ChurnCategory != expectedCategory {
				t.Errorf("Expected churn category %q, got %q", expectedCategory, result.ChurnCategory)
			}

			// Find the retention insight
			var foundInsight *model.RuleEngineInsight
			for _, insight := range result.Insights {
				if insight.Code == tc.wantCode {
					foundInsight = &insight
					break
				}
			}

			if tc.wantInsight {
				if foundInsight == nil {
					t.Errorf("Expected insight with code %q, but not found", tc.wantCode)
					return
				}
				if foundInsight.Severity != tc.wantSeverity {
					t.Errorf("Expected severity %q, got %q", tc.wantSeverity, foundInsight.Severity)
				}
				if foundInsight.Category != tc.wantCategory {
					t.Errorf("Expected category %q, got %q", tc.wantCategory, foundInsight.Category)
				}
			} else {
				if foundInsight != nil {
					t.Errorf("Did not expect insight with code %q, but found one", tc.wantCode)
				}
			}
		})
	}
}

// TestTierNamingMismatch verifies that pricing/naming inconsistencies are detected.
func TestTierNamingMismatch(t *testing.T) {
	engine := NewPricingRuleEngine()

	tests := []struct {
		name        string
		plans       []model.PricingPlanInput
		wantInsight bool
	}{
		{
			name: "Consistent naming - Starter < Pro",
			plans: []model.PricingPlanInput{
				{Name: "Starter", Price: 29, Currency: "USD", Billing: "monthly"},
				{Name: "Pro", Price: 99, Currency: "USD", Billing: "monthly"},
			},
			wantInsight: false,
		},
		{
			name: "Mismatched naming - Pro < Starter",
			plans: []model.PricingPlanInput{
				{Name: "Pro", Price: 29, Currency: "USD", Billing: "monthly"},
				{Name: "Starter", Price: 99, Currency: "USD", Billing: "monthly"},
			},
			wantInsight: true,
		},
		{
			name: "Mismatched naming - Enterprise < Growth",
			plans: []model.PricingPlanInput{
				{Name: "Enterprise", Price: 49, Currency: "USD", Billing: "monthly"},
				{Name: "Growth", Price: 149, Currency: "USD", Billing: "monthly"},
			},
			wantInsight: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			input := model.AnalysisInputV2{
				UserPlans: tc.plans,
				BusinessMetrics: model.BusinessMetricsInput{
					MRR:       5000,
					ChurnRate: 5.0,
				},
			}

			result := engine.RunRuleEngine(input)

			var foundInsight bool
			for _, insight := range result.Insights {
				if insight.Code == InsightCodeTierNamingMismatch {
					foundInsight = true
					break
				}
			}

			if tc.wantInsight && !foundInsight {
				t.Errorf("Expected tier naming mismatch insight, but not found")
			}
			if !tc.wantInsight && foundInsight {
				t.Errorf("Did not expect tier naming mismatch insight, but found one")
			}
		})
	}
}

// TestNoCompetitorsInsight verifies that missing competitor data produces an insight.
func TestNoCompetitorsInsight(t *testing.T) {
	engine := NewPricingRuleEngine()

	input := model.AnalysisInputV2{
		UserPlans: []model.PricingPlanInput{
			{Name: "Starter", Price: 29, Currency: "USD", Billing: "monthly"},
		},
		Competitors: []model.CompetitorInput{},
		BusinessMetrics: model.BusinessMetricsInput{
			MRR:       5000,
			ChurnRate: 5.0,
		},
	}

	result := engine.RunRuleEngine(input)

	var foundInsight bool
	for _, insight := range result.Insights {
		if insight.Code == InsightCodeNoCompetitors {
			foundInsight = true
			if insight.Category != CategoryCompetitive {
				t.Errorf("Expected category %q, got %q", CategoryCompetitive, insight.Category)
			}
			break
		}
	}

	if !foundInsight {
		t.Errorf("Expected no competitors insight, but not found")
	}

	if result.HasCompetitors {
		t.Errorf("Expected HasCompetitors to be false")
	}
}

// TestPriceSpreadAnalysis verifies that price spread is correctly categorized.
func TestPriceSpreadAnalysis(t *testing.T) {
	engine := NewPricingRuleEngine()

	tests := []struct {
		name        string
		plans       []model.PricingPlanInput
		wantSpread  string
		wantInsight string
	}{
		{
			name: "Compressed pricing (ratio <= 1.5)",
			plans: []model.PricingPlanInput{
				{Name: "Starter", Price: 29, Currency: "USD", Billing: "monthly"},
				{Name: "Pro", Price: 39, Currency: "USD", Billing: "monthly"},
			},
			wantSpread:  "compressed",
			wantInsight: InsightCodeCompressedPricing,
		},
		{
			name: "Healthy pricing",
			plans: []model.PricingPlanInput{
				{Name: "Starter", Price: 29, Currency: "USD", Billing: "monthly"},
				{Name: "Pro", Price: 99, Currency: "USD", Billing: "monthly"},
			},
			wantSpread:  "healthy",
			wantInsight: "",
		},
		{
			name: "Polarized pricing (ratio >= 5)",
			plans: []model.PricingPlanInput{
				{Name: "Starter", Price: 19, Currency: "USD", Billing: "monthly"},
				{Name: "Enterprise", Price: 199, Currency: "USD", Billing: "monthly"},
			},
			wantSpread:  "polarized",
			wantInsight: InsightCodePolarizedPricing,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			input := model.AnalysisInputV2{
				UserPlans: tc.plans,
				BusinessMetrics: model.BusinessMetricsInput{
					MRR:       10000,
					ChurnRate: 5.0,
				},
			}

			result := engine.RunRuleEngine(input)

			if result.PriceSpread != tc.wantSpread {
				t.Errorf("Expected price spread %q, got %q", tc.wantSpread, result.PriceSpread)
			}

			if tc.wantInsight != "" {
				var foundInsight bool
				for _, insight := range result.Insights {
					if insight.Code == tc.wantInsight {
						foundInsight = true
						break
					}
				}
				if !foundInsight {
					t.Errorf("Expected insight %q, but not found", tc.wantInsight)
				}
			}
		})
	}
}

// TestRuleEngineDeterminism verifies that the same input always produces the same output.
func TestRuleEngineDeterminism(t *testing.T) {
	engine := NewPricingRuleEngine()

	input := model.AnalysisInputV2{
		UserPlans: []model.PricingPlanInput{
			{Name: "Starter", Price: 29, Currency: "USD", Billing: "monthly"},
			{Name: "Pro", Price: 99, Currency: "USD", Billing: "monthly"},
			{Name: "Enterprise", Price: 299, Currency: "USD", Billing: "monthly"},
		},
		Competitors: []model.CompetitorInput{
			{
				Name: "Competitor A",
				Plans: []model.CompetitorPlanInput{
					{Name: "Basic", Price: 25, Currency: "USD", Billing: "monthly"},
					{Name: "Pro", Price: 75, Currency: "USD", Billing: "monthly"},
				},
			},
		},
		BusinessMetrics: model.BusinessMetricsInput{
			MRR:       15000,
			ARR:       180000,
			ChurnRate: 4.5,
			Customers: 150,
		},
	}

	// Run the engine multiple times
	results := make([]model.RuleEngineResult, 5)
	for i := 0; i < 5; i++ {
		results[i] = engine.RunRuleEngine(input)
	}

	// Compare all results
	first := results[0]
	for i := 1; i < 5; i++ {
		result := results[i]

		if result.NumPlans != first.NumPlans {
			t.Errorf("Run %d: NumPlans mismatch: got %d, want %d", i, result.NumPlans, first.NumPlans)
		}
		if result.NumCompetitors != first.NumCompetitors {
			t.Errorf("Run %d: NumCompetitors mismatch: got %d, want %d", i, result.NumCompetitors, first.NumCompetitors)
		}
		if result.ChurnCategory != first.ChurnCategory {
			t.Errorf("Run %d: ChurnCategory mismatch: got %q, want %q", i, result.ChurnCategory, first.ChurnCategory)
		}
		if result.PriceSpread != first.PriceSpread {
			t.Errorf("Run %d: PriceSpread mismatch: got %q, want %q", i, result.PriceSpread, first.PriceSpread)
		}
		if len(result.Insights) != len(first.Insights) {
			t.Errorf("Run %d: Insights count mismatch: got %d, want %d", i, len(result.Insights), len(first.Insights))
		}

		for j, insight := range result.Insights {
			if j >= len(first.Insights) {
				break
			}
			if insight.Code != first.Insights[j].Code {
				t.Errorf("Run %d, Insight %d: Code mismatch: got %q, want %q", i, j, insight.Code, first.Insights[j].Code)
			}
		}
	}
}

// TestEarlyStageInsight verifies early stage detection.
func TestEarlyStageInsight(t *testing.T) {
	engine := NewPricingRuleEngine()

	tests := []struct {
		name        string
		mrr         float64
		customers   int
		wantInsight bool
	}{
		{
			name:        "Early stage - low MRR",
			mrr:         3000,
			customers:   100,
			wantInsight: true,
		},
		{
			name:        "Early stage - few customers",
			mrr:         10000,
			customers:   30,
			wantInsight: true,
		},
		{
			name:        "Established - high MRR and customers",
			mrr:         50000,
			customers:   500,
			wantInsight: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			input := model.AnalysisInputV2{
				UserPlans: []model.PricingPlanInput{
					{Name: "Starter", Price: 29, Currency: "USD", Billing: "monthly"},
				},
				BusinessMetrics: model.BusinessMetricsInput{
					MRR:       tc.mrr,
					ChurnRate: 5.0,
					Customers: tc.customers,
				},
			}

			result := engine.RunRuleEngine(input)

			var foundInsight bool
			for _, insight := range result.Insights {
				if insight.Code == InsightCodeEarlyStage {
					foundInsight = true
					break
				}
			}

			if tc.wantInsight && !foundInsight {
				t.Errorf("Expected early stage insight, but not found")
			}
			if !tc.wantInsight && foundInsight {
				t.Errorf("Did not expect early stage insight, but found one")
			}
		})
	}
}

