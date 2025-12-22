package service

import (
	"fmt"
	"sort"
	"strings"

	"rev-saas-api/internal/model"
)

// ═══════════════════════════════════════════════════════════════════════════════
// RULE ENGINE V2 - DETERMINISTIC PRICING ANALYSIS
// This engine produces consistent, predictable insights based on rules.
// No randomness, no LLM calls - pure deterministic logic.
// ═══════════════════════════════════════════════════════════════════════════════

// Insight codes for the rule engine
const (
	// Retention insights
	InsightCodeHighChurn       = "HIGH_CHURN"
	InsightCodeCriticalChurn   = "CRITICAL_CHURN"
	InsightCodeHealthyChurn    = "HEALTHY_CHURN"
	InsightCodeNoMetrics       = "NO_METRICS"

	// Pricing structure insights
	InsightCodeTierNamingMismatch = "TIER_NAMING_MISMATCH"
	InsightCodeWeakUpgradePath    = "WEAK_UPGRADE_PATH"
	InsightCodeSteepPriceCliff    = "STEEP_PRICE_CLIFF"
	InsightCodeCompressedPricing  = "COMPRESSED_PRICING"
	InsightCodePolarizedPricing   = "POLARIZED_PRICING"
	InsightCodeSingleTier         = "SINGLE_TIER"

	// Competitive insights
	InsightCodeNoCompetitors        = "NO_COMPETITORS"
	InsightCodeBelowMarket          = "BELOW_MARKET"
	InsightCodeAboveMarket          = "ABOVE_MARKET"
	InsightCodeEntryPriceHigh       = "ENTRY_PRICE_HIGH"
	InsightCodeEntryPriceLow        = "ENTRY_PRICE_LOW"
	InsightCodeFreeToPaidGap = "FREE_TO_PAID_GAP"

	// Business stage insights
	InsightCodeEarlyStage = "EARLY_STAGE"
)

// Severity levels
const (
	SeverityInfo     = "info"
	SeverityWarning  = "warning"
	SeverityCritical = "critical"
)

// Categories
const (
	CategoryRetention   = "retention"
	CategoryPricing     = "pricing"
	CategoryStructure   = "structure"
	CategoryCompetitive = "competitive"
	CategoryBusiness    = "business"
)

// PricingRuleEngine performs deterministic analysis on pricing data.
type PricingRuleEngine struct{}

// NewPricingRuleEngine creates a new rule engine instance.
func NewPricingRuleEngine() *PricingRuleEngine {
	return &PricingRuleEngine{}
}

// RunRuleEngine executes all rules and returns deterministic insights.
func (e *PricingRuleEngine) RunRuleEngine(input model.AnalysisInputV2) model.RuleEngineResult {
	result := model.RuleEngineResult{
		Insights:       make([]model.RuleEngineInsight, 0),
		NumPlans:       len(input.UserPlans),
		NumCompetitors: len(input.Competitors),
		HasCompetitors: e.hasValidCompetitors(input.Competitors),
		HasMetrics:     input.BusinessMetrics.MRR > 0 || input.BusinessMetrics.ChurnRate > 0,
	}

	// Run all rule categories
	e.analyzeRetention(input, &result)
	e.analyzePricingStructure(input, &result)
	e.analyzeCompetitivePosition(input, &result)
	e.analyzeBusinessStage(input, &result)

	return result
}

// ═══════════════════════════════════════════════════════════════════════════════
// RETENTION ANALYSIS RULES
// ═══════════════════════════════════════════════════════════════════════════════

func (e *PricingRuleEngine) analyzeRetention(input model.AnalysisInputV2, result *model.RuleEngineResult) {
	metrics := input.BusinessMetrics

	// No metrics provided
	if metrics.MRR == 0 && metrics.ChurnRate == 0 && metrics.Customers == 0 {
		result.ChurnCategory = "unknown"
		result.Insights = append(result.Insights, model.RuleEngineInsight{
			Code:        InsightCodeNoMetrics,
			Title:       "Business Metrics Not Configured",
			Description: "Add your business metrics (MRR, churn rate, customer count) to receive retention-aware pricing insights.",
			Severity:    SeverityInfo,
			Category:    CategoryBusiness,
		})
		return
	}

	churn := metrics.ChurnRate

	// Critical churn (>10%)
	if churn > 10 {
		result.ChurnCategory = "critical"
		result.Insights = append(result.Insights, model.RuleEngineInsight{
			Code:        InsightCodeCriticalChurn,
			Title:       "Critical Retention Challenge",
			Description: "Your churn rate indicates significant customer attrition. Before any pricing changes, prioritize understanding why customers leave. Pricing adjustments in high-churn environments can have amplified negative effects on retention.",
			Severity:    SeverityCritical,
			Category:    CategoryRetention,
		})
		return
	}

	// High churn (8-10%)
	if churn > 8 {
		result.ChurnCategory = "high"
		result.Insights = append(result.Insights, model.RuleEngineInsight{
			Code:        InsightCodeHighChurn,
			Title:       "Elevated Churn Detected",
			Description: "Your retention metrics suggest room for improvement. Focus on reinforcing your value proposition and customer success initiatives before exploring aggressive pricing changes.",
			Severity:    SeverityWarning,
			Category:    CategoryRetention,
		})
		return
	}

	// Moderate churn (5-8%)
	if churn > 5 {
		result.ChurnCategory = "moderate"
		return // No specific insight for moderate - it's acceptable
	}

	// Healthy churn (<5%)
	if churn > 0 && churn <= 5 {
		result.ChurnCategory = "low"
		result.Insights = append(result.Insights, model.RuleEngineInsight{
			Code:        InsightCodeHealthyChurn,
			Title:       "Strong Customer Retention",
			Description: "Your retention metrics are healthy, indicating customers perceive strong value. This gives you flexibility to explore pricing optimization with lower risk.",
			Severity:    SeverityInfo,
			Category:    CategoryRetention,
		})
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRICING STRUCTURE ANALYSIS RULES
// ═══════════════════════════════════════════════════════════════════════════════

func (e *PricingRuleEngine) analyzePricingStructure(input model.AnalysisInputV2, result *model.RuleEngineResult) {
	plans := input.UserPlans

	// Single tier analysis
	if len(plans) <= 1 {
		result.PriceSpread = "n/a"
		if len(plans) == 1 {
			result.Insights = append(result.Insights, model.RuleEngineInsight{
				Code:        InsightCodeSingleTier,
				Title:       "Single Pricing Tier",
				Description: "Operating with a single tier limits your ability to capture different customer segments. Consider whether a multi-tier structure could help address varying customer needs and willingness-to-pay.",
				Severity:    SeverityInfo,
				Category:    CategoryStructure,
			})
		}
		return
	}

	// Sort plans by price for analysis
	sortedPlans := make([]model.PricingPlanInput, len(plans))
	copy(sortedPlans, plans)
	sort.Slice(sortedPlans, func(i, j int) bool {
		return sortedPlans[i].Price < sortedPlans[j].Price
	})

	// Filter to paid plans
	paidPlans := make([]model.PricingPlanInput, 0)
	var hasFreePlan bool
	for _, p := range sortedPlans {
		if p.Price > 0 {
			paidPlans = append(paidPlans, p)
		} else {
			hasFreePlan = true
		}
	}

	if len(paidPlans) < 2 {
		result.PriceSpread = "n/a"
		return
	}

	// Analyze tier ratios (upgrade paths)
	e.analyzeTierRatios(paidPlans, result)

	// Analyze price spread
	e.analyzePriceSpread(paidPlans, result)

	// Analyze tier naming consistency
	e.analyzeTierNaming(paidPlans, result)

	// Analyze free to paid gap
	if hasFreePlan && len(paidPlans) > 0 {
		e.analyzeFreeToPaidGap(paidPlans[0], input.Competitors, result)
	}
}

func (e *PricingRuleEngine) analyzeTierRatios(paidPlans []model.PricingPlanInput, result *model.RuleEngineResult) {
	for i := 0; i < len(paidPlans)-1; i++ {
		lowerPlan := paidPlans[i]
		higherPlan := paidPlans[i+1]

		if lowerPlan.Price <= 0 {
			continue
		}

		ratio := higherPlan.Price / lowerPlan.Price

		// Weak upgrade path (ratio < 1.2)
		if ratio < 1.2 {
			result.Insights = append(result.Insights, model.RuleEngineInsight{
				Code:        InsightCodeWeakUpgradePath,
				Title:       "Weak Upgrade Incentive",
				Description: fmt.Sprintf("The price difference between %s and %s is very small. Customers may not perceive enough value difference to justify upgrading. Consider widening the gap or strengthening feature differentiation.", lowerPlan.Name, higherPlan.Name),
				Severity:    SeverityWarning,
				Category:    CategoryStructure,
			})
		}

		// Steep price cliff (ratio > 3.0)
		if ratio > 3.0 {
			result.Insights = append(result.Insights, model.RuleEngineInsight{
				Code:        InsightCodeSteepPriceCliff,
				Title:       "Steep Price Jump",
				Description: fmt.Sprintf("The transition from %s to %s involves a significant price increase. Some customers may find this difficult to justify. Consider whether an intermediate tier could capture customers in this gap.", lowerPlan.Name, higherPlan.Name),
				Severity:    SeverityWarning,
				Category:    CategoryStructure,
			})
		}
	}
}

func (e *PricingRuleEngine) analyzePriceSpread(paidPlans []model.PricingPlanInput, result *model.RuleEngineResult) {
	if len(paidPlans) < 2 {
		return
	}

	minPrice := paidPlans[0].Price
	maxPrice := paidPlans[len(paidPlans)-1].Price

	if minPrice <= 0 {
		return
	}

	spreadRatio := maxPrice / minPrice

	if spreadRatio <= 1.5 {
		result.PriceSpread = "compressed"
		result.Insights = append(result.Insights, model.RuleEngineInsight{
			Code:        InsightCodeCompressedPricing,
			Title:       "Compressed Price Range",
			Description: "Your tiers are priced close together, which may limit your ability to capture different customer segments. Consider expanding your price range to better address varying willingness-to-pay.",
			Severity:    SeverityWarning,
			Category:    CategoryStructure,
		})
	} else if spreadRatio >= 5.0 {
		result.PriceSpread = "polarized"
		result.Insights = append(result.Insights, model.RuleEngineInsight{
			Code:        InsightCodePolarizedPricing,
			Title:       "Wide Price Gap",
			Description: "Your pricing spans a very wide range. While this can serve distinct segments, ensure mid-market customers have a clear fit. The gap may result in lost conversions for customers who don't see themselves in either extreme.",
			Severity:    SeverityInfo,
			Category:    CategoryStructure,
		})
	} else {
		result.PriceSpread = "healthy"
	}
}

func (e *PricingRuleEngine) analyzeTierNaming(paidPlans []model.PricingPlanInput, result *model.RuleEngineResult) {
	for i := 0; i < len(paidPlans)-1; i++ {
		lowerPricePlan := paidPlans[i]
		higherPricePlan := paidPlans[i+1]

		lowerTierOrder := getTierOrderV2(lowerPricePlan.Name)
		higherTierOrder := getTierOrderV2(higherPricePlan.Name)

		// If the cheaper plan has a "higher" tier name, there's a mismatch
		if lowerTierOrder > higherTierOrder {
			result.Insights = append(result.Insights, model.RuleEngineInsight{
				Code:        InsightCodeTierNamingMismatch,
				Title:       "Tier Naming Inconsistency",
				Description: fmt.Sprintf("'%s' is priced lower than '%s', but the naming convention suggests the opposite hierarchy. Aligning tier names with their price positioning can reduce customer confusion.", lowerPricePlan.Name, higherPricePlan.Name),
				Severity:    SeverityWarning,
				Category:    CategoryStructure,
			})
		}
	}
}

func (e *PricingRuleEngine) analyzeFreeToPaidGap(entryPlan model.PricingPlanInput, competitors []model.CompetitorInput, result *model.RuleEngineResult) {
	// Get competitor entry prices
	competitorEntryPrices := e.getCompetitorEntryPrices(competitors)

	if len(competitorEntryPrices) == 0 {
		// No competitor data to compare
		if entryPlan.Price > 50 {
			result.Insights = append(result.Insights, model.RuleEngineInsight{
				Code:        InsightCodeFreeToPaidGap,
				Title:       "Significant Free-to-Paid Gap",
				Description: "Your entry-level paid plan has a notable price point. Ensure the value proposition clearly justifies the upgrade from free to maintain conversion rates.",
				Severity:    SeverityInfo,
				Category:    CategoryPricing,
			})
		}
		return
	}

	// Calculate median competitor entry price
	sort.Float64s(competitorEntryPrices)
	medianEntry := computeMedian(competitorEntryPrices)

	// Entry price significantly higher than competitor median
	if entryPlan.Price > medianEntry*1.5 {
		result.Insights = append(result.Insights, model.RuleEngineInsight{
			Code:        InsightCodeFreeToPaidGap,
			Title:       "Entry Price Above Market",
			Description: "Your entry-level paid plan appears priced above competitor entry points. This may create friction for price-sensitive customers upgrading from free tiers.",
			Severity:    SeverityWarning,
			Category:    CategoryCompetitive,
		})
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPETITIVE POSITION ANALYSIS RULES
// ═══════════════════════════════════════════════════════════════════════════════

func (e *PricingRuleEngine) analyzeCompetitivePosition(input model.AnalysisInputV2, result *model.RuleEngineResult) {
	if !e.hasValidCompetitors(input.Competitors) {
		result.Insights = append(result.Insights, model.RuleEngineInsight{
			Code:        InsightCodeNoCompetitors,
			Title:       "No Competitor Data",
			Description: "Add competitor pricing information to receive market positioning insights. Without competitive context, recommendations are based solely on your internal pricing structure.",
			Severity:    SeverityInfo,
			Category:    CategoryCompetitive,
		})
		return
	}

	// Get all competitor prices
	competitorPrices := e.getAllCompetitorPrices(input.Competitors)
	if len(competitorPrices) == 0 {
		return
	}

	sort.Float64s(competitorPrices)
	medianPrice := computeMedian(competitorPrices)

	// Analyze each user plan's position
	for _, plan := range input.UserPlans {
		if plan.Price <= 0 {
			continue
		}

		// Significantly below market
		if plan.Price < medianPrice*0.5 {
			result.Insights = append(result.Insights, model.RuleEngineInsight{
				Code:        InsightCodeBelowMarket,
				Title:       fmt.Sprintf("%s Priced Below Market", plan.Name),
				Description: fmt.Sprintf("'%s' appears positioned significantly below the competitive landscape. While this can drive volume, you may be leaving revenue on the table.", plan.Name),
				Severity:    SeverityInfo,
				Category:    CategoryCompetitive,
			})
		}

		// Significantly above market
		if plan.Price > medianPrice*2.0 {
			result.Insights = append(result.Insights, model.RuleEngineInsight{
				Code:        InsightCodeAboveMarket,
				Title:       fmt.Sprintf("%s Priced Above Market", plan.Name),
				Description: fmt.Sprintf("'%s' appears positioned significantly above competitors. This premium positioning requires strong value differentiation to justify.", plan.Name),
				Severity:    SeverityWarning,
				Category:    CategoryCompetitive,
			})
		}
	}

	// Check entry-level specifically
	if len(input.UserPlans) > 0 {
		// Find entry plan (lowest priced paid plan)
		var entryPlan *model.PricingPlanInput
		for i := range input.UserPlans {
			if input.UserPlans[i].Price > 0 {
				if entryPlan == nil || input.UserPlans[i].Price < entryPlan.Price {
					entryPlan = &input.UserPlans[i]
				}
			}
		}

		if entryPlan != nil {
			competitorEntryPrices := e.getCompetitorEntryPrices(input.Competitors)
			if len(competitorEntryPrices) > 0 {
				sort.Float64s(competitorEntryPrices)
				medianEntry := computeMedian(competitorEntryPrices)

				if entryPlan.Price > medianEntry*1.3 {
					result.Insights = append(result.Insights, model.RuleEngineInsight{
						Code:        InsightCodeEntryPriceHigh,
						Title:       "Entry Plan Above Competitor Entry Points",
						Description: "Your entry-level plan is priced above many competitor entry points. This may reduce conversion from free tiers or price-sensitive prospects.",
						Severity:    SeverityWarning,
						Category:    CategoryCompetitive,
					})
				} else if entryPlan.Price < medianEntry*0.7 {
					result.Insights = append(result.Insights, model.RuleEngineInsight{
						Code:        InsightCodeEntryPriceLow,
						Title:       "Entry Plan Below Competitor Entry Points",
						Description: "Your entry-level plan is priced below most competitor entry points. This may help acquisition but could signal lower perceived value.",
						Severity:    SeverityInfo,
						Category:    CategoryCompetitive,
					})
				}
			}
		}
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUSINESS STAGE ANALYSIS RULES
// ═══════════════════════════════════════════════════════════════════════════════

func (e *PricingRuleEngine) analyzeBusinessStage(input model.AnalysisInputV2, result *model.RuleEngineResult) {
	metrics := input.BusinessMetrics

	// Early stage detection
	isEarlyStage := (metrics.MRR > 0 && metrics.MRR < 5000) || (metrics.Customers > 0 && metrics.Customers < 50)

	if isEarlyStage {
		result.Insights = append(result.Insights, model.RuleEngineInsight{
			Code:        InsightCodeEarlyStage,
			Title:       "Early Growth Stage",
			Description: "At your current stage, prioritize customer acquisition and gathering product feedback over aggressive revenue optimization. Maintaining pricing flexibility supports faster iteration toward product-market fit.",
			Severity:    SeverityInfo,
			Category:    CategoryBusiness,
		})
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

func (e *PricingRuleEngine) hasValidCompetitors(competitors []model.CompetitorInput) bool {
	for _, c := range competitors {
		for _, p := range c.Plans {
			if p.Price > 0 {
				return true
			}
		}
	}
	return false
}

func (e *PricingRuleEngine) getAllCompetitorPrices(competitors []model.CompetitorInput) []float64 {
	prices := make([]float64, 0)
	for _, c := range competitors {
		for _, p := range c.Plans {
			if p.Price > 0 {
				prices = append(prices, p.Price)
			}
		}
	}
	return prices
}

func (e *PricingRuleEngine) getCompetitorEntryPrices(competitors []model.CompetitorInput) []float64 {
	entryPrices := make([]float64, 0)
	for _, c := range competitors {
		// Find lowest priced paid plan for each competitor
		var minPrice float64 = -1
		for _, p := range c.Plans {
			if p.Price > 0 && (minPrice < 0 || p.Price < minPrice) {
				minPrice = p.Price
			}
		}
		if minPrice > 0 {
			entryPrices = append(entryPrices, minPrice)
		}
	}
	return entryPrices
}

// getTierOrderV2 returns the expected order rank for common tier names.
// Lower number = entry tier, higher number = premium tier.
func getTierOrderV2(name string) int {
	nameLower := strings.ToLower(name)

	// Entry-level tiers
	if strings.Contains(nameLower, "free") || strings.Contains(nameLower, "basic") {
		return 1
	}
	if strings.Contains(nameLower, "starter") || strings.Contains(nameLower, "lite") || strings.Contains(nameLower, "personal") {
		return 2
	}

	// Mid-tier
	if strings.Contains(nameLower, "pro") || strings.Contains(nameLower, "professional") || strings.Contains(nameLower, "standard") {
		return 3
	}
	if strings.Contains(nameLower, "plus") || strings.Contains(nameLower, "growth") || strings.Contains(nameLower, "team") {
		return 4
	}

	// Premium tiers
	if strings.Contains(nameLower, "business") || strings.Contains(nameLower, "premium") {
		return 5
	}
	if strings.Contains(nameLower, "enterprise") || strings.Contains(nameLower, "unlimited") || strings.Contains(nameLower, "scale") {
		return 6
	}

	return 3 // Default to mid-tier if unknown
}

