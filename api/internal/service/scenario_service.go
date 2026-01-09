package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"rev-saas-api/internal/model"
	mongorepo "rev-saas-api/internal/repository/mongo"
)

const scenarioSystemPrompt = `You are a Premium Strategic Scenario Planning Engine for SaaS founders and executives.

You generate 4 distinct strategic scenarios based on a decision/verdict context.
Each scenario represents a different strategic path with realistic trade-offs.
This is PAID, EXECUTIVE-GRADE output that justifies a subscription.

CRITICAL RULES:
1. Generate EXACTLY 4 scenarios: aggressive, balanced, conservative, do_nothing
2. ALL content must be company-specific based on the provided context - NO generic advice
3. Metrics must be bounded and realistic (not random or extreme)
4. Each scenario must feel distinct with clear trade-offs
5. "balanced" is the BASELINE (recommended) path based on the original verdict
6. All other scenarios express DELTAS vs the balanced baseline
7. Include "positioning" (one-line value prop) and "best_when" sentence for each

SCENARIO TYPES:

1. AGGRESSIVE (scenario_id: "aggressive")
- Positioning: "Max upside, highest volatility"
- Higher upside but higher risk
- Revenue impact ~1.3x of baseline
- Faster timeline but more execution demands
- Risk level typically one step higher than balanced
- Deltas: Show "+X% more revenue" vs baseline

2. BALANCED (scenario_id: "balanced") [BASELINE/RECOMMENDED]
- Positioning: "Optimal risk-reward, recommended path"
- Uses the original verdict as baseline
- Moderate risk-reward profile
- Practical timeline and execution effort
- Deltas: All "Baseline" for this scenario

3. CONSERVATIVE (scenario_id: "conservative")
- Positioning: "Safety-first, capital-preserving"
- Lower risk, lower reward
- Revenue impact ~0.6x of baseline
- Longer timeline, easier execution
- Risk level typically one step lower than balanced
- Deltas: Show "-X% less revenue" vs baseline

4. DO NOTHING (scenario_id: "do_nothing")
- Positioning: "Status quo, deferred cost"
- Status quo path
- Revenue: "Stagnates" or "0%"
- No upfront effort but opportunity cost
- Risk: "Low (short-term)" with long-term strategic erosion
- Deltas: Show opportunity cost vs baseline

---

OUTPUT FORMAT (STRICT JSON, NO EXTRA TEXT):

{
  "scenarios": [
    {
      "scenario_id": "aggressive",
      "title": "Aggressive Growth",
      "summary": "One sentence describing this strategic path specific to the company",
      "positioning": "Max upside, highest volatility",
      "best_when": "Best when you have runway to experiment and can absorb short-term churn",
      "metrics": {
        "revenue_impact_range": "+25–40%",
        "churn_impact_range": "+0.5–1.5%",
        "risk_label": "high",
        "time_to_impact": "14–45 days",
        "execution_effort": "high"
      },
      "deltas": {
        "revenue_delta": "+10-15% more than baseline",
        "churn_delta": "+0.5-1% higher than baseline",
        "risk_delta": "Higher",
        "time_delta": "2-4 weeks faster",
        "effort_delta": "Higher"
      },
      "tradeoffs": [
        "First trade-off point specific to company",
        "Second trade-off point",
        "Third trade-off point"
      ],
      "details": {
        "what_it_looks_like": [
          "Phase 1: Concrete action with timeframe",
          "Phase 2: Next step with clear deliverable",
          "Phase 3: Follow-up action",
          "Phase 4: Measurement and iteration"
        ],
        "operational_implications": [
          "Team load: Specific impact on team resources",
          "Engineering: Required technical effort",
          "Sales/Support: Customer-facing impact"
        ],
        "failure_modes": [
          "Specific risk 1 that could derail this path",
          "Specific risk 2 with mitigation note"
        ],
        "success_metrics": [
          "Monitor: KPI 1 to track progress",
          "Watch: KPI 2 for early warning",
          "Target: KPI 3 for success validation"
        ],
        "affected_personas": [
          "Power users: How they are impacted",
          "New signups: How acquisition changes"
        ],
        "what_changes_vs_baseline": "Paragraph explaining exactly what is different from the recommended baseline path and why someone would choose this",
        "when_it_makes_sense": "Paragraph explaining when this is the right choice for this specific company"
      },
      "compared_to_recommended": "Higher upside, higher risk"
    },
    {
      "scenario_id": "balanced",
      "title": "Balanced (Recommended)",
      "summary": "Company-specific one sentence",
      "positioning": "Optimal risk-reward, recommended path",
      "best_when": "Best when you want steady growth with controlled downside",
      "metrics": {
        "revenue_impact_range": "+15–25%",
        "churn_impact_range": "-0.5–+0.5%",
        "risk_label": "medium",
        "time_to_impact": "30–60 days",
        "execution_effort": "medium"
      },
      "deltas": {
        "revenue_delta": "Baseline",
        "churn_delta": "Baseline",
        "risk_delta": "Baseline",
        "time_delta": "Baseline",
        "effort_delta": "Baseline"
      },
      "tradeoffs": ["...", "...", "..."],
      "details": {
        "what_it_looks_like": ["...", "...", "...", "..."],
        "operational_implications": ["...", "...", "..."],
        "failure_modes": ["...", "..."],
        "success_metrics": ["...", "...", "..."],
        "affected_personas": ["...", "..."],
        "what_changes_vs_baseline": "This IS the baseline. The original verdict recommendation optimized for sustainable growth.",
        "when_it_makes_sense": "..."
      },
      "compared_to_recommended": "Baseline — this is the recommended path"
    },
    {
      "scenario_id": "conservative",
      "title": "Conservative",
      "summary": "...",
      "positioning": "Safety-first, capital-preserving",
      "best_when": "Best when runway is limited or market uncertainty is high",
      "metrics": { ... },
      "deltas": {
        "revenue_delta": "-5-10% less than baseline",
        "churn_delta": "-0.3-0.5% better than baseline",
        "risk_delta": "Lower",
        "time_delta": "2-4 weeks slower",
        "effort_delta": "Lower"
      },
      "tradeoffs": ["...", "...", "..."],
      "details": { ... },
      "compared_to_recommended": "Safer, slower growth"
    },
    {
      "scenario_id": "do_nothing",
      "title": "Do Nothing",
      "summary": "...",
      "positioning": "Status quo, deferred cost",
      "best_when": "Best when waiting for more data or external conditions to change",
      "metrics": {
        "revenue_impact_range": "Stagnates",
        "churn_impact_range": "Neutral → slight increase",
        "risk_label": "low",
        "time_to_impact": "N/A",
        "execution_effort": "low"
      },
      "deltas": {
        "revenue_delta": "Forgoes +15-25% baseline gain",
        "churn_delta": "No immediate change, gradual erosion",
        "risk_delta": "Lower short-term, higher long-term",
        "time_delta": "N/A",
        "effort_delta": "Minimal"
      },
      "tradeoffs": ["...", "...", "..."],
      "details": { ... },
      "compared_to_recommended": "Avoids change, cost compounds over time"
    }
  ]
}

IMPORTANT:
- Return ONLY valid JSON, no markdown code blocks
- All 4 scenarios must be present
- tradeoffs must have exactly 3 items
- failure_modes should have 2-3 items
- what_it_looks_like should have 3-5 phased items
- success_metrics must have exactly 3 items
- affected_personas should have 2-3 items
- All deltas must be relative to the balanced baseline
- positioning and best_when are REQUIRED for all scenarios
`

// ScenarioService handles scenario generation and management
type ScenarioService struct {
	openAIAPIKey   string
	scenarioRepo   *mongorepo.ScenarioRepository
	decisionRepo   *mongorepo.DecisionV2Repository
}

// NewScenarioService creates a new scenario service
func NewScenarioService(
	openAIAPIKey string,
	scenarioRepo *mongorepo.ScenarioRepository,
	decisionRepo *mongorepo.DecisionV2Repository,
) *ScenarioService {
	return &ScenarioService{
		openAIAPIKey: openAIAPIKey,
		scenarioRepo: scenarioRepo,
		decisionRepo: decisionRepo,
	}
}

// GetScenarios retrieves scenarios for a decision
func (s *ScenarioService) GetScenarios(ctx context.Context, decisionID, userID primitive.ObjectID) (*model.ScenarioSet, error) {
	return s.scenarioRepo.GetByDecisionID(ctx, decisionID, userID)
}

// GenerateScenarios generates or retrieves scenarios for a decision
func (s *ScenarioService) GenerateScenarios(ctx context.Context, decisionID, userID primitive.ObjectID, force bool) (*model.ScenarioSet, error) {
	// Check if scenarios already exist
	existing, err := s.scenarioRepo.GetByDecisionID(ctx, decisionID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing scenarios: %w", err)
	}

	// If not forcing and scenarios exist, return existing
	if !force && existing != nil {
		return existing, nil
	}

	// Get the decision to use as context
	decision, err := s.decisionRepo.GetByIDAndUser(ctx, decisionID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get decision: %w", err)
	}
	if decision == nil {
		return nil, fmt.Errorf("decision not found")
	}

	// Generate scenarios via OpenAI
	startTime := time.Now()
	scenarios, err := s.generateScenariosViaOpenAI(ctx, decision)
	if err != nil {
		return nil, fmt.Errorf("failed to generate scenarios: %w", err)
	}
	duration := time.Since(startTime).Milliseconds()

	// Determine version
	version := 1
	if existing != nil {
		version = existing.Version + 1
	}

	// Create scenario set
	scenarioSet := &model.ScenarioSet{
		UserID:      userID,
		WorkspaceID: decision.WorkspaceID,
		DecisionID:  decisionID,
		Version:     version,
		Scenarios:   scenarios,
		ModelMeta: model.ScenarioModelMeta{
			ModelName:           "gpt-4o-mini",
			PromptVersion:       "1.0-scenarios",
			InferenceDurationMs: duration,
		},
		IsDeleted: false,
	}

	// Save to database
	if err := s.scenarioRepo.Create(ctx, scenarioSet); err != nil {
		return nil, fmt.Errorf("failed to save scenarios: %w", err)
	}

	// Link scenarios to decision
	if err := s.decisionRepo.LinkScenarios(ctx, decisionID, userID, scenarioSet.ID); err != nil {
		log.Printf("[scenario] Warning: failed to link scenarios to decision: %v", err)
	}

	return scenarioSet, nil
}

// SetChosenScenario sets the chosen scenario for a decision
func (s *ScenarioService) SetChosenScenario(ctx context.Context, decisionID, userID primitive.ObjectID, scenarioID string) error {
	// Validate scenario ID
	if !model.IsValidScenarioID(scenarioID) {
		return fmt.Errorf("invalid scenario ID: %s", scenarioID)
	}

	// Verify scenarios exist for this decision
	existing, err := s.scenarioRepo.GetByDecisionID(ctx, decisionID, userID)
	if err != nil {
		return fmt.Errorf("failed to check scenarios: %w", err)
	}
	if existing == nil {
		return fmt.Errorf("no scenarios found for this decision")
	}

	// Set chosen scenario on decision
	if err := s.decisionRepo.SetChosenScenario(ctx, decisionID, userID, scenarioID); err != nil {
		return fmt.Errorf("failed to set chosen scenario: %w", err)
	}

	return nil
}

// generateScenariosViaOpenAI calls OpenAI to generate scenarios
func (s *ScenarioService) generateScenariosViaOpenAI(ctx context.Context, decision *model.DecisionV2) ([]model.ScenarioItem, error) {
	log.Printf("[scenario] Generating scenarios for decision: %s", decision.CompanyName)

	// Build context prompt
	userPrompt := s.buildScenarioPrompt(decision)

	// Call OpenAI
	requestBody := map[string]interface{}{
		"model": "gpt-4o-mini",
		"messages": []map[string]string{
			{"role": "system", "content": scenarioSystemPrompt},
			{"role": "user", "content": userPrompt},
		},
		"max_tokens":   3500,
		"temperature":  0.5,
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.openAIAPIKey)

	client := &http.Client{Timeout: 90 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("OpenAI request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("OpenAI error: %s", string(body))
	}

	// Parse response
	var openAIResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(body, &openAIResp); err != nil {
		return nil, fmt.Errorf("failed to parse OpenAI response: %w", err)
	}

	if len(openAIResp.Choices) == 0 {
		return nil, fmt.Errorf("no response from OpenAI")
	}

	content := openAIResp.Choices[0].Message.Content
	log.Printf("[scenario] OpenAI response received, parsing...")
	log.Printf("[scenario] Raw content length: %d chars", len(content))
	if len(content) < 2000 {
		log.Printf("[scenario] Full content: %s", content)
	} else {
		log.Printf("[scenario] Content preview (first 2000): %s", content[:2000])
	}

	return s.parseScenarioResponse(content)
}

// buildScenarioPrompt builds the user prompt with decision context
func (s *ScenarioService) buildScenarioPrompt(decision *model.DecisionV2) string {
	var sb strings.Builder

	sb.WriteString("Generate 4 strategic scenarios for this decision context:\n\n")

	// Company info
	sb.WriteString(fmt.Sprintf("COMPANY: %s\n", decision.CompanyName))
	sb.WriteString(fmt.Sprintf("WEBSITE: %s\n\n", decision.WebsiteURL))

	// Verdict context
	sb.WriteString("ORIGINAL VERDICT:\n")
	sb.WriteString(fmt.Sprintf("- Headline: %s\n", decision.Verdict.Headline))
	sb.WriteString(fmt.Sprintf("- Summary: %s\n", decision.Verdict.Summary))
	
	if decision.Verdict.ExecutiveVerdict != nil {
		sb.WriteString(fmt.Sprintf("- Recommendation: %s\n", decision.Verdict.ExecutiveVerdict.Recommendation))
		sb.WriteString(fmt.Sprintf("- Time Horizon: %s\n", decision.Verdict.ExecutiveVerdict.TimeHorizon))
	}

	// Decision snapshot (baseline metrics)
	if decision.Verdict.DecisionSnapshot != nil {
		ds := decision.Verdict.DecisionSnapshot
		sb.WriteString("\nBASELINE METRICS (use these as anchor for scenarios):\n")
		sb.WriteString(fmt.Sprintf("- Revenue Impact Range: %s\n", ds.RevenueImpactRange))
		sb.WriteString(fmt.Sprintf("- Primary Risk Level: %s\n", ds.PrimaryRiskLevel))
		sb.WriteString(fmt.Sprintf("- Time to Impact: %s\n", ds.TimeToImpact))
		sb.WriteString(fmt.Sprintf("- Execution Effort: %s\n", ds.ExecutionEffort))
	} else if decision.ExpectedImpact.RevenueRange != "" {
		sb.WriteString("\nBASELINE METRICS:\n")
		sb.WriteString(fmt.Sprintf("- Revenue Range: %s\n", decision.ExpectedImpact.RevenueRange))
	}

	// Supporting details
	if decision.Verdict.SupportingDetails.ExpectedRevenueImpact != "" {
		sb.WriteString(fmt.Sprintf("- Expected Revenue Impact: %s\n", decision.Verdict.SupportingDetails.ExpectedRevenueImpact))
	}
	if decision.Verdict.SupportingDetails.ChurnOutlook != "" {
		sb.WriteString(fmt.Sprintf("- Churn Outlook: %s\n", decision.Verdict.SupportingDetails.ChurnOutlook))
	}

	// Context fields
	sb.WriteString("\nCOMPANY CONTEXT:\n")
	if decision.Context.CompanyStage.Value != nil {
		sb.WriteString(fmt.Sprintf("- Company Stage: %s\n", *decision.Context.CompanyStage.Value))
	}
	if decision.Context.BusinessModel.Value != nil {
		sb.WriteString(fmt.Sprintf("- Business Model: %s\n", *decision.Context.BusinessModel.Value))
	}
	if decision.Context.PrimaryKPI.Value != nil {
		sb.WriteString(fmt.Sprintf("- Primary KPI: %s\n", *decision.Context.PrimaryKPI.Value))
	}
	if decision.Context.Market.Segment.Value != nil {
		sb.WriteString(fmt.Sprintf("- Market Segment: %s\n", *decision.Context.Market.Segment.Value))
	}

	sb.WriteString("\nGenerate scenarios that are specific to this company and decision context.")
	sb.WriteString("\nThe 'balanced' scenario should match the original verdict recommendation.")
	sb.WriteString("\nEnsure all metrics are realistic and bounded based on the baseline.")

	return sb.String()
}

// parseScenarioResponse parses the OpenAI JSON response into scenario items
func (s *ScenarioService) parseScenarioResponse(jsonStr string) ([]model.ScenarioItem, error) {
	// Clean up response
	jsonStr = strings.TrimSpace(jsonStr)
	jsonStr = strings.TrimPrefix(jsonStr, "```json")
	jsonStr = strings.TrimPrefix(jsonStr, "```")
	jsonStr = strings.TrimSuffix(jsonStr, "```")
	jsonStr = strings.TrimSpace(jsonStr)

	// Clean trailing commas
	jsonStr = cleanJSONTrailingCommas(jsonStr)

	var openAIResp model.OpenAIScenariosResponse
	if err := json.Unmarshal([]byte(jsonStr), &openAIResp); err != nil {
		log.Printf("[scenario] Failed to parse JSON: %v, raw: %s", err, jsonStr[:minInt(500, len(jsonStr))])
		return nil, fmt.Errorf("failed to parse scenarios JSON: %w", err)
	}

	if len(openAIResp.Scenarios) != 4 {
		return nil, fmt.Errorf("expected 4 scenarios, got %d", len(openAIResp.Scenarios))
	}

	// Convert to internal model
	scenarios := make([]model.ScenarioItem, len(openAIResp.Scenarios))
	for i, sc := range openAIResp.Scenarios {
		// Validate scenario ID
		if !model.IsValidScenarioID(sc.ScenarioID) {
			return nil, fmt.Errorf("invalid scenario_id: %s", sc.ScenarioID)
		}

		// Ensure tradeoffs has exactly 3 items
		tradeoffs := sc.Tradeoffs
		for len(tradeoffs) < 3 {
			tradeoffs = append(tradeoffs, "Trade-off to be determined")
		}
		if len(tradeoffs) > 3 {
			tradeoffs = tradeoffs[:3]
		}

		// Ensure success_metrics has 3 items
		successMetrics := sc.Details.SuccessMetrics
		for len(successMetrics) < 3 {
			successMetrics = append(successMetrics, "Metric to be defined")
		}
		if len(successMetrics) > 3 {
			successMetrics = successMetrics[:3]
		}

		// Determine if this is the baseline scenario
		isBaseline := sc.ScenarioID == "balanced"

		scenarios[i] = model.ScenarioItem{
			ScenarioID:  model.ScenarioID(sc.ScenarioID),
			Title:       sc.Title,
			Summary:     sc.Summary,
			Positioning: sc.Positioning,
			BestWhen:    sc.BestWhen,
			Metrics: model.ScenarioMetrics{
				RevenueImpactRange: sc.Metrics.RevenueImpactRange,
				ChurnImpactRange:   sc.Metrics.ChurnImpactRange,
				RiskLabel:          strings.ToLower(sc.Metrics.RiskLabel),
				TimeToImpact:       sc.Metrics.TimeToImpact,
				ExecutionEffort:    strings.ToLower(sc.Metrics.ExecutionEffort),
			},
			Deltas: model.ScenarioDeltas{
				RevenueDelta: sc.Deltas.RevenueDelta,
				ChurnDelta:   sc.Deltas.ChurnDelta,
				RiskDelta:    sc.Deltas.RiskDelta,
				TimeDelta:    sc.Deltas.TimeDelta,
				EffortDelta:  sc.Deltas.EffortDelta,
			},
			Tradeoffs: tradeoffs,
			Details: model.ScenarioDetails{
				WhatItLooksLike:         sc.Details.WhatItLooksLike,
				OperationalImplications: sc.Details.OperationalImplications,
				FailureModes:            sc.Details.FailureModes,
				WhenItMakesSense:        sc.Details.WhenItMakesSense,
				SuccessMetrics:          successMetrics,
				AffectedPersonas:        sc.Details.AffectedPersonas,
				WhatChangesVsBaseline:   sc.Details.WhatChangesVsBaseline,
			},
			ComparedToRecommended: sc.ComparedToRecommended,
			IsBaseline:            isBaseline,
		}
	}

	log.Printf("[scenario] Successfully parsed %d scenarios", len(scenarios))
	
	// Debug: log first scenario details
	if len(scenarios) > 0 {
		sc := scenarios[0]
		log.Printf("[scenario] First scenario: ID=%s, Title=%s, Positioning=%s, Summary=%s...",
			sc.ScenarioID, sc.Title, sc.Positioning, truncate(sc.Summary, 50))
		log.Printf("[scenario] First scenario deltas: Revenue=%s, Churn=%s, Risk=%s",
			sc.Deltas.RevenueDelta, sc.Deltas.ChurnDelta, sc.Deltas.RiskDelta)
	}
	
	return scenarios, nil
}

func truncate(s string, maxLen int) string {
	if len(s) > maxLen {
		return s[:maxLen] + "..."
	}
	return s
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

