package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"rev-saas-api/internal/model"
)

// ═══════════════════════════════════════════════════════════════════════════════
// LLM ANALYSIS SERVICE V2
// Handles structured LLM calls for the V2 analysis engine.
// ═══════════════════════════════════════════════════════════════════════════════

// LLMAnalysisServiceV2 handles LLM-powered analysis with structured I/O.
type LLMAnalysisServiceV2 struct {
	apiKey     string
	httpClient *http.Client
}

// NewLLMAnalysisServiceV2 creates a new V2 LLM analysis service.
func NewLLMAnalysisServiceV2(apiKey string) *LLMAnalysisServiceV2 {
	return &LLMAnalysisServiceV2{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 90 * time.Second, // Longer timeout for complex analysis
		},
	}
}

// IsEnabled returns true if the LLM service is configured.
func (s *LLMAnalysisServiceV2) IsEnabled() bool {
	return s.apiKey != ""
}

// LLMInputPayload is the structured input sent to the LLM.
type LLMInputPayload struct {
	UserPlans       []llmPlanInput       `json:"user_plans"`
	Competitors     []llmCompetitorInput `json:"competitors,omitempty"`
	BusinessMetrics llmMetricsInput      `json:"business_metrics"`
	RuleEngineInsights []llmInsightInput `json:"rule_engine_insights"`
	Summary         llmSummaryInput      `json:"context_summary"`
}

type llmPlanInput struct {
	Name     string  `json:"name"`
	Price    float64 `json:"price"`
	Currency string  `json:"currency,omitempty"`
	Billing  string  `json:"billing,omitempty"`
}

type llmCompetitorInput struct {
	Name  string         `json:"name"`
	Plans []llmPlanInput `json:"plans"`
}

type llmMetricsInput struct {
	MRR         float64 `json:"mrr,omitempty"`
	ARR         float64 `json:"arr,omitempty"`
	ChurnRate   float64 `json:"churn_rate,omitempty"`
	Customers   int     `json:"customers,omitempty"`
	PricingGoal string  `json:"pricing_goal,omitempty"`
}

type llmInsightInput struct {
	Code        string `json:"code"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Severity    string `json:"severity"`
}

type llmSummaryInput struct {
	NumPlans       int    `json:"num_plans"`
	NumCompetitors int    `json:"num_competitors"`
	ChurnCategory  string `json:"churn_category"`
	PriceSpread    string `json:"price_spread"`
	HasCompetitors bool   `json:"has_competitor_data"`
	HasMetrics     bool   `json:"has_business_metrics"`
}

// LLMInputPayloadWithActions extends the payload with action templates.
type LLMInputPayloadWithActions struct {
	LLMInputPayload
	NextActionTemplates []map[string]string `json:"next_action_templates,omitempty"`
}

// GenerateLLMAnalysis generates the LLM-powered analysis using structured I/O.
// This is the original function - kept unchanged for backward compatibility.
func (s *LLMAnalysisServiceV2) GenerateLLMAnalysis(
	ctx context.Context,
	input model.AnalysisInputV2,
	ruleResult model.RuleEngineResult,
) (*model.LLMAnalysisOutput, error) {
	// Delegate to the new function with no action templates
	return s.GenerateLLMAnalysisWithActions(ctx, input, ruleResult, nil)
}

// GenerateLLMAnalysisWithActions generates LLM analysis including suggested next actions.
// actionTemplates are pre-selected by the rule engine; LLM only provides polished wording.
func (s *LLMAnalysisServiceV2) GenerateLLMAnalysisWithActions(
	ctx context.Context,
	input model.AnalysisInputV2,
	ruleResult model.RuleEngineResult,
	actionTemplates []NextActionTemplate,
) (*model.LLMAnalysisOutput, error) {
	if !s.IsEnabled() {
		output := s.GenerateFallbackOutput(ruleResult)
		// Add fallback actions if templates provided
		if len(actionTemplates) > 0 {
			output.SuggestedNextActions = CreateFallbackActions(actionTemplates)
		}
		return output, nil
	}

	// Build the structured input payload
	basePayload := s.buildLLMPayload(input, ruleResult)

	var payloadJSON []byte
	var userPrompt string
	var systemPrompt string
	var err error

	// Determine if we need to include action templates
	if len(actionTemplates) > 0 {
		// Extended payload with action templates
		extendedPayload := LLMInputPayloadWithActions{
			LLMInputPayload:     basePayload,
			NextActionTemplates: GetTemplatesForLLM(actionTemplates),
		}
		payloadJSON, err = json.MarshalIndent(extendedPayload, "", "  ")
		if err != nil {
			return nil, fmt.Errorf("failed to marshal LLM payload: %w", err)
		}

		// Use extended prompts
		systemPrompt = AnalysisV2SystemPrompt + NextActionsSystemPromptAddendum
		templatesJSON, _ := json.MarshalIndent(GetTemplatesForLLM(actionTemplates), "", "  ")
		userPrompt = fmt.Sprintf(AnalysisV2UserPromptWithActionsTemplate, string(payloadJSON), string(templatesJSON))
	} else {
		// Standard payload without action templates
		payloadJSON, err = json.MarshalIndent(basePayload, "", "  ")
		if err != nil {
			return nil, fmt.Errorf("failed to marshal LLM payload: %w", err)
		}
		systemPrompt = AnalysisV2SystemPrompt
		userPrompt = fmt.Sprintf(AnalysisV2UserPromptTemplate, string(payloadJSON))
	}

	// Call OpenAI with structured output
	response, err := s.callOpenAI(ctx, systemPrompt, userPrompt)
	if err != nil {
		// Return fallback on error
		output := s.GenerateFallbackOutput(ruleResult)
		if len(actionTemplates) > 0 {
			output.SuggestedNextActions = CreateFallbackActions(actionTemplates)
		}
		return output, nil
	}

	// Parse the structured JSON response
	output, err := s.parseResponse(response)
	if err != nil {
		// Return fallback on parse error
		output := s.GenerateFallbackOutput(ruleResult)
		if len(actionTemplates) > 0 {
			output.SuggestedNextActions = CreateFallbackActions(actionTemplates)
		}
		return output, nil
	}

	// If LLM didn't return actions but we expected them, use fallback
	if len(actionTemplates) > 0 && len(output.SuggestedNextActions) == 0 {
		output.SuggestedNextActions = CreateFallbackActions(actionTemplates)
	}

	// Validate that LLM returned only the codes we provided
	if len(actionTemplates) > 0 && len(output.SuggestedNextActions) > 0 {
		output.SuggestedNextActions = s.validateAndFilterActions(output.SuggestedNextActions, actionTemplates)
	}

	return output, nil
}

// validateAndFilterActions ensures LLM only returned actions from our templates.
func (s *LLMAnalysisServiceV2) validateAndFilterActions(
	llmActions []model.SuggestedNextAction,
	templates []NextActionTemplate,
) []model.SuggestedNextAction {
	validCodes := make(map[string]NextActionTemplate)
	for _, t := range templates {
		validCodes[t.Code] = t
	}

	validated := make([]model.SuggestedNextAction, 0)
	for _, action := range llmActions {
		if template, ok := validCodes[action.Code]; ok {
			// Valid code - keep it but ensure it has content
			if action.Title == "" {
				action.Title = template.Title
			}
			if action.Description == "" {
				action.Description = template.Hint
			}
			validated = append(validated, action)
		}
		// Skip actions with codes we didn't provide
	}

	// If all actions were filtered out, use fallback
	if len(validated) == 0 && len(templates) > 0 {
		return CreateFallbackActions(templates)
	}

	return validated
}

// buildLLMPayload creates the structured input for the LLM.
func (s *LLMAnalysisServiceV2) buildLLMPayload(
	input model.AnalysisInputV2,
	ruleResult model.RuleEngineResult,
) LLMInputPayload {
	payload := LLMInputPayload{
		UserPlans:          make([]llmPlanInput, 0),
		Competitors:        make([]llmCompetitorInput, 0),
		RuleEngineInsights: make([]llmInsightInput, 0),
	}

	// User plans
	for _, p := range input.UserPlans {
		payload.UserPlans = append(payload.UserPlans, llmPlanInput{
			Name:     p.Name,
			Price:    p.Price,
			Currency: p.Currency,
			Billing:  p.Billing,
		})
	}

	// Competitors (only include those with valid prices)
	for _, c := range input.Competitors {
		comp := llmCompetitorInput{
			Name:  c.Name,
			Plans: make([]llmPlanInput, 0),
		}
		for _, p := range c.Plans {
			if p.Price > 0 {
				comp.Plans = append(comp.Plans, llmPlanInput{
					Name:     p.Name,
					Price:    p.Price,
					Currency: p.Currency,
					Billing:  p.Billing,
				})
			}
		}
		if len(comp.Plans) > 0 {
			payload.Competitors = append(payload.Competitors, comp)
		}
	}

	// Business metrics
	payload.BusinessMetrics = llmMetricsInput{
		MRR:         input.BusinessMetrics.MRR,
		ARR:         input.BusinessMetrics.ARR,
		ChurnRate:   input.BusinessMetrics.ChurnRate,
		Customers:   input.BusinessMetrics.Customers,
		PricingGoal: input.BusinessMetrics.PricingGoal,
	}

	// Rule engine insights
	for _, insight := range ruleResult.Insights {
		payload.RuleEngineInsights = append(payload.RuleEngineInsights, llmInsightInput{
			Code:        insight.Code,
			Title:       insight.Title,
			Description: insight.Description,
			Severity:    insight.Severity,
		})
	}

	// Context summary
	payload.Summary = llmSummaryInput{
		NumPlans:       ruleResult.NumPlans,
		NumCompetitors: ruleResult.NumCompetitors,
		ChurnCategory:  ruleResult.ChurnCategory,
		PriceSpread:    ruleResult.PriceSpread,
		HasCompetitors: ruleResult.HasCompetitors,
		HasMetrics:     ruleResult.HasMetrics,
	}

	return payload
}

// GenerateFallbackOutput creates a fallback output when LLM is unavailable.
// Exported for use by AnalysisServiceV2.
func (s *LLMAnalysisServiceV2) GenerateFallbackOutput(ruleResult model.RuleEngineResult) *model.LLMAnalysisOutput {
	output := &model.LLMAnalysisOutput{
		ExecutiveSummary: "Analysis generated using rule-based insights. Add an AI API key for enhanced commentary.",
		PricingInsights:  make([]model.LLMPricingInsight, 0),
		Recommendations:  make([]model.LLMRecommendation, 0),
		RiskAnalysis:     make([]string, 0),
	}

	// Convert rule insights to pricing insights
	for _, insight := range ruleResult.Insights {
		output.PricingInsights = append(output.PricingInsights, model.LLMPricingInsight{
			Title: insight.Title,
			Body:  insight.Description,
		})
	}

	// Generate basic recommendations from rule insights
	for _, insight := range ruleResult.Insights {
		if insight.Severity == SeverityWarning || insight.Severity == SeverityCritical {
			output.Recommendations = append(output.Recommendations, model.LLMRecommendation{
				Action: "Address: " + insight.Title,
				Reason: insight.Description,
			})
		}
	}

	// Add basic risk analysis
	if ruleResult.ChurnCategory == "high" || ruleResult.ChurnCategory == "critical" {
		output.RiskAnalysis = append(output.RiskAnalysis, "Retention challenges may amplify the impact of pricing changes.")
	}
	if !ruleResult.HasCompetitors {
		output.RiskAnalysis = append(output.RiskAnalysis, "Limited competitive context reduces confidence in market positioning recommendations.")
	}
	if !ruleResult.HasMetrics {
		output.RiskAnalysis = append(output.RiskAnalysis, "Lack of business metrics limits the ability to provide retention-aware insights.")
	}

	return output
}

// OpenAI API call with deterministic settings
func (s *LLMAnalysisServiceV2) callOpenAI(ctx context.Context, systemPrompt, userPrompt string) (string, error) {
	reqBody := struct {
		Model       string `json:"model"`
		Messages    []struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"messages"`
		Temperature float64 `json:"temperature"`
		TopP        float64 `json:"top_p"`
		MaxTokens   int     `json:"max_tokens"`
	}{
		Model: "gpt-4o-mini",
		Messages: []struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		}{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		Temperature: 0,   // Deterministic output
		TopP:        1,   // No sampling randomness
		MaxTokens:   1500,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(jsonBody))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.apiKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
	}

	var apiResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}

	if err := json.Unmarshal(body, &apiResp); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	if apiResp.Error != nil {
		return "", fmt.Errorf("OpenAI error: %s", apiResp.Error.Message)
	}

	if len(apiResp.Choices) == 0 {
		return "", fmt.Errorf("no response from OpenAI")
	}

	return apiResp.Choices[0].Message.Content, nil
}

// parseResponse parses the structured JSON response from the LLM.
func (s *LLMAnalysisServiceV2) parseResponse(response string) (*model.LLMAnalysisOutput, error) {
	// Clean up the response (remove markdown code blocks if present)
	response = strings.TrimSpace(response)
	response = strings.TrimPrefix(response, "```json")
	response = strings.TrimPrefix(response, "```")
	response = strings.TrimSuffix(response, "```")
	response = strings.TrimSpace(response)

	var output model.LLMAnalysisOutput
	if err := json.Unmarshal([]byte(response), &output); err != nil {
		return nil, fmt.Errorf("failed to parse LLM response: %w", err)
	}

	return &output, nil
}

