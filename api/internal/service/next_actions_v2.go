package service

import (
	"sort"

	"rev-saas-api/internal/model"
)

// ═══════════════════════════════════════════════════════════════════════════════
// SUGGESTED NEXT ACTIONS V2 - DETERMINISTIC ACTION SELECTION
// Actions are selected based on rule engine insights, not invented by LLM.
// LLM only provides polished wording for pre-selected action templates.
// ═══════════════════════════════════════════════════════════════════════════════

// Action codes (canonical identifiers)
// Note: "ENTRY" refers to the lowest-priced paid tier, regardless of its actual name.
const (
	ActionCodeTestEntryPriceIncrease    = "TEST_ENTRY_PRICE_INCREASE"
	ActionCodeTestEntryPriceDecrease    = "TEST_ENTRY_PRICE_DECREASE"
	ActionCodeSimulateIntermediateTier  = "SIMULATE_INTERMEDIATE_TIER"
	ActionCodeValidateValuePositioning  = "VALIDATE_VALUE_POSITIONING"
	ActionCodeReviewPlanNamingClarity   = "REVIEW_PLAN_NAMING_CLARITY"
	ActionCodeAddressRetentionFirst     = "ADDRESS_RETENTION_BEFORE_PRICING"
	ActionCodeExpandPriceRange          = "EXPAND_PRICE_RANGE"
	ActionCodeAddCompetitorData         = "ADD_COMPETITOR_DATA"
)

// NextActionTemplate is a predefined action with baseline text and LLM hint.
type NextActionTemplate struct {
	Code     string `json:"code"`
	Title    string `json:"title"`    // baseline safe title
	Hint     string `json:"hint"`     // short guidance for LLM to rephrase
	Priority int    `json:"-"`        // internal priority (lower = higher priority)
}

// nextActionTemplates is the catalog of all predefined actions.
var nextActionTemplates = map[string]NextActionTemplate{
	ActionCodeAddressRetentionFirst: {
		Code:     ActionCodeAddressRetentionFirst,
		Title:    "Address Retention Before Pricing Changes",
		Hint:     "Focus on understanding why customers leave before adjusting prices",
		Priority: 1, // Critical priority
	},
	ActionCodeTestEntryPriceIncrease: {
		Code:     ActionCodeTestEntryPriceIncrease,
		Title:    "Consider Testing Entry Price Increase",
		Hint:     "Your entry tier may be underpriced relative to the value delivered",
		Priority: 2,
	},
	ActionCodeTestEntryPriceDecrease: {
		Code:     ActionCodeTestEntryPriceDecrease,
		Title:    "Consider Testing Entry Price Decrease",
		Hint:     "Your entry tier may be creating friction for price-sensitive customers",
		Priority: 2,
	},
	ActionCodeSimulateIntermediateTier: {
		Code:     ActionCodeSimulateIntermediateTier,
		Title:    "Simulate an Intermediate Tier",
		Hint:     "A middle tier could capture customers falling between your current options",
		Priority: 3,
	},
	ActionCodeValidateValuePositioning: {
		Code:     ActionCodeValidateValuePositioning,
		Title:    "Validate Value Positioning",
		Hint:     "Ensure your pricing reflects the value customers perceive",
		Priority: 4,
	},
	ActionCodeReviewPlanNamingClarity: {
		Code:     ActionCodeReviewPlanNamingClarity,
		Title:    "Review Plan Naming for Clarity",
		Hint:     "Align tier names with pricing hierarchy to reduce customer confusion",
		Priority: 4,
	},
	ActionCodeExpandPriceRange: {
		Code:     ActionCodeExpandPriceRange,
		Title:    "Consider Expanding Price Range",
		Hint:     "Wider price spread could capture more customer segments",
		Priority: 5,
	},
	ActionCodeAddCompetitorData: {
		Code:     ActionCodeAddCompetitorData,
		Title:    "Add Competitor Pricing Data",
		Hint:     "Competitive context enables market-relative insights",
		Priority: 6,
	},
}

// insightToActionsMapping maps rule engine insight codes to action codes.
// Multiple actions can be triggered by a single insight.
var insightToActionsMapping = map[string][]string{
	InsightCodeCriticalChurn:      {ActionCodeAddressRetentionFirst},
	InsightCodeHighChurn:          {ActionCodeAddressRetentionFirst},
	InsightCodeEntryPriceHigh:     {ActionCodeTestEntryPriceDecrease, ActionCodeValidateValuePositioning},
	InsightCodeEntryPriceLow:      {ActionCodeTestEntryPriceIncrease, ActionCodeValidateValuePositioning},
	InsightCodeTierNamingMismatch: {ActionCodeReviewPlanNamingClarity},
	InsightCodeSingleTier:         {ActionCodeSimulateIntermediateTier},
	InsightCodeSteepPriceCliff:    {ActionCodeSimulateIntermediateTier},
	InsightCodeAboveMarket:        {ActionCodeValidateValuePositioning},
	InsightCodeBelowMarket:        {ActionCodeTestEntryPriceIncrease, ActionCodeValidateValuePositioning},
	InsightCodeCompressedPricing:  {ActionCodeExpandPriceRange},
	InsightCodeNoCompetitors:      {ActionCodeAddCompetitorData},
	InsightCodeFreeToPaidGap:      {ActionCodeValidateValuePositioning},
}

// SelectNextActions deterministically selects 2-3 action templates based on rule engine results.
// Selection is based on existing insight codes and computed conditions.
// Returns templates sorted by priority (most important first), with no duplicates.
func SelectNextActions(ruleResult model.RuleEngineResult, input model.AnalysisInputV2) []NextActionTemplate {
	selectedCodes := make(map[string]bool)
	var candidates []NextActionTemplate

	// Map insights to actions
	for _, insight := range ruleResult.Insights {
		if actionCodes, ok := insightToActionsMapping[insight.Code]; ok {
			for _, code := range actionCodes {
				if !selectedCodes[code] {
					if template, exists := nextActionTemplates[code]; exists {
						selectedCodes[code] = true
						candidates = append(candidates, template)
					}
				}
			}
		}
	}

	// If we have very few actions, add some sensible defaults based on conditions
	if len(candidates) < 2 {
		// If no competitors and not already added
		if !ruleResult.HasCompetitors && !selectedCodes[ActionCodeAddCompetitorData] {
			if template, exists := nextActionTemplates[ActionCodeAddCompetitorData]; exists {
				selectedCodes[ActionCodeAddCompetitorData] = true
				candidates = append(candidates, template)
			}
		}

		// If has multiple plans but still few actions, suggest value positioning
		if len(input.UserPlans) > 1 && !selectedCodes[ActionCodeValidateValuePositioning] {
			if template, exists := nextActionTemplates[ActionCodeValidateValuePositioning]; exists {
				selectedCodes[ActionCodeValidateValuePositioning] = true
				candidates = append(candidates, template)
			}
		}
	}

	// Sort by priority (lower priority number = higher importance)
	sort.Slice(candidates, func(i, j int) bool {
		if candidates[i].Priority != candidates[j].Priority {
			return candidates[i].Priority < candidates[j].Priority
		}
		// Alphabetical by code as tiebreaker for determinism
		return candidates[i].Code < candidates[j].Code
	})

	// Return max 3 actions, min 2 if possible
	maxActions := 3
	if len(candidates) > maxActions {
		candidates = candidates[:maxActions]
	}

	return candidates
}

// CreateFallbackActions creates SuggestedNextActions from templates without LLM wording.
// Used when LLM fails or is unavailable.
func CreateFallbackActions(templates []NextActionTemplate) []model.SuggestedNextAction {
	actions := make([]model.SuggestedNextAction, 0, len(templates))
	for _, t := range templates {
		actions = append(actions, model.SuggestedNextAction{
			Code:        t.Code,
			Title:       t.Title,
			Description: t.Hint, // Use hint as fallback description
		})
	}
	return actions
}

// GetTemplatesForLLM returns the templates in a format suitable for LLM input.
func GetTemplatesForLLM(templates []NextActionTemplate) []map[string]string {
	result := make([]map[string]string, 0, len(templates))
	for _, t := range templates {
		result = append(result, map[string]string{
			"code":  t.Code,
			"title": t.Title,
			"hint":  t.Hint,
		})
	}
	return result
}

