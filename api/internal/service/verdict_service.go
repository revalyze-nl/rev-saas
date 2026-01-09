package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"rev-saas-api/internal/model"
)

const verdictSystemPrompt = `You are a Premium Decision Intelligence Engine for founders and executives.

You generate PAID, EXECUTIVE-GRADE strategic verdicts that justify a subscription.
This is NOT a free ChatGPT answer. This is a board-level decision document.

CRITICAL PRINCIPLES:
- Do NOT simplify or shorten
- Do NOT generate generic strategy text
- Every insight must feel company-specific
- Reduce cognitive load while maximizing perceived value
- Each section must add NEW information (no repetition)

---

## PERSONALIZATION REQUIREMENT

You MUST explicitly surface WHY this decision is specific to THIS company.
Inject visible personalization cues such as:
- "Based on your pricing page structure..."
- "Given your current company stage..."
- "Compared to competitors with similar positioning..."
- "Because your primary KPI appears to be..."
- "Your market positioning suggests..."

Infer company context from:
- Website content and messaging
- Pricing structure (if visible)
- Market positioning signals
- Product maturity indicators

---

## OUTPUT FORMAT (STRICT JSON, NO EXTRA TEXT):

{
  "decision_snapshot": {
    "revenue_impact_range": "Concrete range like +15–25% or +$50K–120K ARR",
    "primary_risk_level": "Low | Medium | High",
    "primary_risk_explain": "One sentence explaining the primary risk",
    "time_to_impact": "Specific timeframe like 30–90 days",
    "execution_effort": "Low | Medium | High",
    "reversibility": "High | Medium | Low"
  },
  "personalization_signals": {
    "pricing_page_insight": "Based on your pricing page structure... (specific observation)",
    "company_stage_insight": "Given your current company stage... (inferred stage + implication)",
    "competitor_insight": "Compared to competitors with similar positioning... (competitive context)",
    "kpi_insight": "Because your primary KPI appears to be... (inferred KPI + why it matters)",
    "market_position_insight": "Your market positioning suggests... (positioning observation)"
  },
  "executive_verdict": {
    "recommendation": "A clear, decisive command. Board-level. Imperative tone. Max 15 words.",
    "decision_type": "Specific type: Pricing Strategy / Tier Restructure / Value Communication / Market Repositioning",
    "time_horizon": "30–90 days / 60–120 days / etc.",
    "scope_of_impact": "Which parts of the business: Revenue, Positioning, Customer Segmentation, etc."
  },
  "decision_confidence": {
    "level": "High | Medium | Low",
    "explanation": "WHY this confidence level - reference specific signals from the website"
  },
  "if_you_proceed": {
    "expected_upside": [
      "Specific revenue upside with numbers or ranges",
      "Positioning advantage gained",
      "Strategic leverage created",
      "Customer segment clarity achieved"
    ],
    "secondary_effects": [
      "Upsell path unlocked",
      "Better qualification of leads",
      "Future pricing flexibility",
      "Competitive moat strengthened"
    ]
  },
  "if_you_do_not_act": {
    "what_stagnates": "What specifically stagnates - revenue ceiling, conversion rates, etc.",
    "competitor_advantage": "What competitors gain if you delay - be specific",
    "future_difficulty": "What becomes harder later - switching costs, market perception, etc."
  },
  "alternatives_considered": [
    {
      "name": "Alternative strategy name",
      "why_not_selected": "Specific reason why rejected for THIS company"
    },
    {
      "name": "Second alternative",
      "why_not_selected": "Company-specific rejection reason"
    },
    {
      "name": "Third alternative",
      "why_not_selected": "Context-aware rejection"
    }
  ],
  "risk_analysis": {
    "risk_level": "Low | Medium | High",
    "who_is_affected": "Specific stakeholders: existing customers on plan X, enterprise prospects, etc.",
    "how_it_manifests": "Concrete manifestation: support tickets, churn in segment Y, etc.",
    "why_acceptable": "Why manageable: mitigation strategy, reversibility, limited blast radius"
  },
  "expected_impact": {
    "revenue_impact": "Percentage range with confidence: +12–18% MRR within 90 days",
    "short_term_churn": "Honest assessment: <2% churn risk in first 60 days",
    "long_term_positioning": "Strategic outcome: Premium market positioning, reduced price sensitivity"
  },
  "why_this_fits": {
    "company_stage_reason": "Start with 'At your stage...' - specific to inferred stage",
    "business_model_reason": "Start with 'Your business model...' - specific to SaaS/usage/etc.",
    "market_segment_reason": "Start with 'In your market...' - specific to B2B/SMB/Enterprise",
    "primary_kpi_reason": "Start with 'Given your focus on...' - tied to inferred KPI"
  },
  "execution_checklist": {
    "next_14_days": [
      "Specific action 1 with deliverable",
      "Specific action 2 with owner suggestion",
      "Specific action 3 with milestone"
    ],
    "next_30_to_60_days": [
      "Medium-term action 1",
      "Medium-term action 2",
      "Iteration based on early data"
    ],
    "success_metrics": [
      "KPI 1 to track with target",
      "KPI 2 with measurement frequency",
      "Leading indicator to monitor"
    ]
  }
}

---

## DECISION DENSITY RULES

- No section should repeat information from another section
- Every bullet point must add NEW insight
- Use structured bullets, not paragraphs
- Be specific: numbers, percentages, timeframes
- Avoid hedge words: "might", "could", "potentially"

---

## STYLE RULES

- No emojis
- No marketing fluff
- No "AI language" or disclaimers
- Write like a $500/hour strategy consultant
- Confident but not arrogant
- Company-specific, not generic

---

## QUALITY CHECK

Before responding, verify:
1. Would a founder forward this to their board?
2. Is every section company-specific?
3. Does the execution checklist have concrete next steps?
4. Is the decision snapshot scannable in 30 seconds?

If any answer is NO, improve the output.`

const userPromptTemplate = `Generate a Premium Decision Intelligence verdict for this company.

Website: %s

Website Content:
%s

IMPORTANT: Every insight must be specific to THIS company based on the website content above.
Return ONLY valid JSON. No markdown, no code blocks, no explanation.`

// VerdictService handles AI-powered pricing verdicts
type VerdictService struct {
	openAIKey  string
	httpClient *http.Client
}

// NewVerdictService creates a new VerdictService
func NewVerdictService(openAIKey string) *VerdictService {
	return &VerdictService{
		openAIKey: openAIKey,
		httpClient: &http.Client{
			Timeout: 150 * time.Second, // Increased for premium analysis
		},
	}
}

// GenerateVerdict analyzes a website and returns a pricing verdict
func (s *VerdictService) GenerateVerdict(ctx context.Context, websiteURL string) (*model.VerdictResponse, error) {
	if s.openAIKey == "" {
		return nil, fmt.Errorf("OpenAI API key not configured")
	}

	// Clean and validate URL
	websiteURL = strings.TrimSpace(websiteURL)
	if websiteURL == "" {
		return nil, fmt.Errorf("website URL is required")
	}

	// Ensure URL has protocol
	if !strings.HasPrefix(websiteURL, "http://") && !strings.HasPrefix(websiteURL, "https://") {
		websiteURL = "https://" + websiteURL
	}

	log.Printf("[verdict] Generating premium verdict for: %s", websiteURL)

	// Fetch website content
	websiteText, err := s.fetchWebsiteContent(ctx, websiteURL)
	if err != nil {
		log.Printf("[verdict] Failed to fetch website: %v, using URL only", err)
		websiteText = fmt.Sprintf("[Website content could not be fetched. URL: %s]", websiteURL)
	}

	// Log extracted text length for debugging
	log.Printf("[verdict] Extracted %d characters of website text", len(websiteText))

	// Call OpenAI for verdict
	verdictJSON, err := s.callOpenAI(ctx, websiteURL, websiteText)
	if err != nil {
		log.Printf("[verdict] OpenAI call failed: %v", err)
		return s.getFallbackVerdict(websiteURL), nil
	}

	log.Printf("[verdict] OpenAI response received, parsing...")

	// Parse response
	verdict, err := s.parseVerdictResponse(verdictJSON, websiteURL)
	if err != nil {
		log.Printf("[verdict] Failed to parse response: %v, raw response: %s", err, verdictJSON)
		return s.getFallbackVerdict(websiteURL), nil
	}

	log.Printf("[verdict] Premium verdict generated successfully")
	return verdict, nil
}

// fetchWebsiteContent fetches and extracts text from a website
func (s *VerdictService) fetchWebsiteContent(ctx context.Context, url string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; RevalyzeBot/1.0)")
	req.Header.Set("Accept", "text/html,application/xhtml+xml")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 500000)) // Limit to 500KB
	if err != nil {
		return "", err
	}

	// Extract text from HTML
	text := s.extractTextFromHTML(string(body))

	// Truncate if too long (keep ~12k chars for better context)
	if len(text) > 12000 {
		text = text[:12000] + "\n[Content truncated...]"
	}

	return text, nil
}

// extractTextFromHTML removes HTML tags and extracts readable text
func (s *VerdictService) extractTextFromHTML(html string) string {
	// Remove script and style tags with content
	scriptRe := regexp.MustCompile(`(?is)<script[^>]*>.*?</script>`)
	html = scriptRe.ReplaceAllString(html, " ")

	styleRe := regexp.MustCompile(`(?is)<style[^>]*>.*?</style>`)
	html = styleRe.ReplaceAllString(html, " ")

	// Remove nav, footer, header (often boilerplate)
	navRe := regexp.MustCompile(`(?is)<nav[^>]*>.*?</nav>`)
	html = navRe.ReplaceAllString(html, " ")

	footerRe := regexp.MustCompile(`(?is)<footer[^>]*>.*?</footer>`)
	html = footerRe.ReplaceAllString(html, " ")

	// Remove all HTML tags
	tagRe := regexp.MustCompile(`<[^>]+>`)
	text := tagRe.ReplaceAllString(html, " ")

	// Decode common HTML entities
	text = strings.ReplaceAll(text, "&nbsp;", " ")
	text = strings.ReplaceAll(text, "&amp;", "&")
	text = strings.ReplaceAll(text, "&lt;", "<")
	text = strings.ReplaceAll(text, "&gt;", ">")
	text = strings.ReplaceAll(text, "&quot;", "\"")
	text = strings.ReplaceAll(text, "&#39;", "'")
	text = strings.ReplaceAll(text, "&mdash;", "—")
	text = strings.ReplaceAll(text, "&ndash;", "–")

	// Clean up whitespace
	spaceRe := regexp.MustCompile(`\s+`)
	text = spaceRe.ReplaceAllString(text, " ")
	text = strings.TrimSpace(text)

	return text
}

// callOpenAI makes the API call to generate the verdict
func (s *VerdictService) callOpenAI(ctx context.Context, websiteURL, websiteText string) (string, error) {
	userPrompt := fmt.Sprintf(userPromptTemplate, websiteURL, websiteText)

	reqBody := map[string]interface{}{
		"model": "gpt-4o-mini",
		"messages": []map[string]string{
			{"role": "system", "content": verdictSystemPrompt},
			{"role": "user", "content": userPrompt},
		},
		"temperature": 0.7,  // Higher for more creative, company-specific insights
		"max_tokens":  4500, // Increased for premium verbose output
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
	req.Header.Set("Authorization", "Bearer "+s.openAIKey)

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

// cleanJSONTrailingCommas removes trailing commas before } or ] which are invalid in JSON
// OpenAI sometimes generates JSON with trailing commas
func cleanJSONTrailingCommas(jsonStr string) string {
	// Remove trailing commas before }
	re1 := regexp.MustCompile(`,\s*}`)
	jsonStr = re1.ReplaceAllString(jsonStr, "}")

	// Remove trailing commas before ]
	re2 := regexp.MustCompile(`,\s*]`)
	jsonStr = re2.ReplaceAllString(jsonStr, "]")

	return jsonStr
}

// parseVerdictResponse parses the OpenAI JSON response into a VerdictResponse
func (s *VerdictService) parseVerdictResponse(jsonStr, websiteURL string) (*model.VerdictResponse, error) {
	// Clean up response (remove markdown code blocks if present)
	jsonStr = strings.TrimSpace(jsonStr)
	jsonStr = strings.TrimPrefix(jsonStr, "```json")
	jsonStr = strings.TrimPrefix(jsonStr, "```")
	jsonStr = strings.TrimSuffix(jsonStr, "```")
	jsonStr = strings.TrimSpace(jsonStr)

	// Clean trailing commas (OpenAI sometimes generates invalid JSON)
	jsonStr = cleanJSONTrailingCommas(jsonStr)

	var openAIResp model.OpenAIVerdictResponse
	if err := json.Unmarshal([]byte(jsonStr), &openAIResp); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	// Map alternatives
	alternatives := make([]model.AlternativeConsidered, 0, len(openAIResp.AlternativesConsidered))
	for _, alt := range openAIResp.AlternativesConsidered {
		alternatives = append(alternatives, model.AlternativeConsidered{
			Name:           alt.Name,
			WhyNotSelected: alt.WhyNotSelected,
		})
	}

	// Convert to VerdictResponse with premium fields
	verdict := &model.VerdictResponse{
		WebsiteURL: websiteURL,
		// Legacy fields for V1 compatibility
		Headline:   openAIResp.ExecutiveVerdict.Recommendation,
		Summary:    fmt.Sprintf("%s decision with %s time horizon. %s", openAIResp.ExecutiveVerdict.DecisionType, openAIResp.ExecutiveVerdict.TimeHorizon, openAIResp.ExecutiveVerdict.ScopeOfImpact),
		Confidence: openAIResp.DecisionConfidence.Level,
		CTA:        "Proceed with this decision",
		WhyThisDecision: []string{
			openAIResp.DecisionConfidence.Explanation,
			openAIResp.WhyThisFits.CompanyStageReason,
			openAIResp.WhyThisFits.BusinessModelReason,
		},
		WhatToExpect: model.VerdictExpectations{
			RiskLevel:   openAIResp.RiskAnalysis.RiskLevel,
			Description: openAIResp.RiskAnalysis.HowItManifests,
		},
		SupportingDetails: model.VerdictSupportDetails{
			ExpectedRevenueImpact: openAIResp.ExpectedImpact.RevenueImpact,
			ChurnOutlook:          openAIResp.ExpectedImpact.ShortTermChurn,
			MarketPositioning:     openAIResp.ExpectedImpact.LongTermPositioning,
		},
		// Premium V2 fields
		DecisionSnapshot: &model.DecisionSnapshot{
			RevenueImpactRange: openAIResp.DecisionSnapshot.RevenueImpactRange,
			PrimaryRiskLevel:   openAIResp.DecisionSnapshot.PrimaryRiskLevel,
			PrimaryRiskExplain: openAIResp.DecisionSnapshot.PrimaryRiskExplain,
			TimeToImpact:       openAIResp.DecisionSnapshot.TimeToImpact,
			ExecutionEffort:    openAIResp.DecisionSnapshot.ExecutionEffort,
			Reversibility:      openAIResp.DecisionSnapshot.Reversibility,
		},
		PersonalizationSignals: &model.PersonalizationSignals{
			PricingPageInsight:    openAIResp.PersonalizationSignals.PricingPageInsight,
			CompanyStageInsight:   openAIResp.PersonalizationSignals.CompanyStageInsight,
			CompetitorInsight:     openAIResp.PersonalizationSignals.CompetitorInsight,
			KPIInsight:            openAIResp.PersonalizationSignals.KPIInsight,
			MarketPositionInsight: openAIResp.PersonalizationSignals.MarketPositionInsight,
		},
		ExecutiveVerdict: &model.ExecutiveVerdict{
			Recommendation: openAIResp.ExecutiveVerdict.Recommendation,
			DecisionType:   openAIResp.ExecutiveVerdict.DecisionType,
			TimeHorizon:    openAIResp.ExecutiveVerdict.TimeHorizon,
			ScopeOfImpact:  openAIResp.ExecutiveVerdict.ScopeOfImpact,
		},
		IfYouProceed: &model.IfYouProceed{
			ExpectedUpside:   openAIResp.IfYouProceed.ExpectedUpside,
			SecondaryEffects: openAIResp.IfYouProceed.SecondaryEffects,
		},
		IfYouDoNotAct: &model.IfYouDoNotAct{
			WhatStagnates:       openAIResp.IfYouDoNotAct.WhatStagnates,
			CompetitorAdvantage: openAIResp.IfYouDoNotAct.CompetitorAdvantage,
			FutureDifficulty:    openAIResp.IfYouDoNotAct.FutureDifficulty,
		},
		AlternativesConsidered: alternatives,
		RiskAnalysis: &model.RiskAnalysis{
			RiskLevel:      openAIResp.RiskAnalysis.RiskLevel,
			WhoIsAffected:  openAIResp.RiskAnalysis.WhoIsAffected,
			HowItManifests: openAIResp.RiskAnalysis.HowItManifests,
			WhyAcceptable:  openAIResp.RiskAnalysis.WhyAcceptable,
		},
		WhyThisFits: &model.WhyThisFits{
			CompanyStageReason:  openAIResp.WhyThisFits.CompanyStageReason,
			BusinessModelReason: openAIResp.WhyThisFits.BusinessModelReason,
			MarketSegmentReason: openAIResp.WhyThisFits.MarketSegmentReason,
			PrimaryKPIReason:    openAIResp.WhyThisFits.PrimaryKPIReason,
		},
		ExecutionChecklist: &model.ExecutionChecklist{
			Next14Days:     openAIResp.ExecutionChecklist.Next14Days,
			Next30To60Days: openAIResp.ExecutionChecklist.Next30To60Days,
			SuccessMetrics: openAIResp.ExecutionChecklist.SuccessMetrics,
		},
		CreatedAt: time.Now(),
	}

	return verdict, nil
}

// getFallbackVerdict returns a safe fallback when OpenAI fails
func (s *VerdictService) getFallbackVerdict(websiteURL string) *model.VerdictResponse {
	return &model.VerdictResponse{
		WebsiteURL: websiteURL,
		Headline:   "Manual Strategic Review Required",
		Summary:    "Insufficient data to generate an automated verdict. A strategic consultant should review the company's positioning manually.",
		Confidence: "Low",
		CTA:        "Request manual analysis",
		WhyThisDecision: []string{
			"Website content could not be fully analyzed",
			"Limited observable signals available for strategic assessment",
			"Manual review of positioning and pricing is recommended",
		},
		WhatToExpect: model.VerdictExpectations{
			RiskLevel:   "Low",
			Description: "No immediate action required until a full analysis can be completed.",
		},
		SupportingDetails: model.VerdictSupportDetails{
			ExpectedRevenueImpact: "Unable to assess without sufficient data",
			ChurnOutlook:          "Unable to assess without sufficient data",
			MarketPositioning:     "Unable to assess without sufficient data",
		},
		DecisionSnapshot: &model.DecisionSnapshot{
			RevenueImpactRange: "Unable to assess",
			PrimaryRiskLevel:   "Low",
			PrimaryRiskExplain: "No risk from waiting for manual analysis",
			TimeToImpact:       "1-2 weeks for manual review",
			ExecutionEffort:    "Low",
			Reversibility:      "High",
		},
		PersonalizationSignals: &model.PersonalizationSignals{
			PricingPageInsight:    "Pricing page could not be analyzed",
			CompanyStageInsight:   "Company stage could not be determined",
			CompetitorInsight:     "Competitive positioning requires manual review",
			KPIInsight:            "Primary KPI could not be inferred",
			MarketPositionInsight: "Market position requires manual analysis",
		},
		ExecutiveVerdict: &model.ExecutiveVerdict{
			Recommendation: "Conduct a manual strategic review before making pricing decisions",
			DecisionType:   "Strategic Assessment",
			TimeHorizon:    "1-2 weeks",
			ScopeOfImpact:  "Initial discovery phase only",
		},
		IfYouProceed: &model.IfYouProceed{
			ExpectedUpside:   []string{"Clear understanding of current market position", "Identified optimization opportunities"},
			SecondaryEffects: []string{"Foundation for data-driven decisions"},
		},
		IfYouDoNotAct: &model.IfYouDoNotAct{
			WhatStagnates:       "Strategic clarity remains limited",
			CompetitorAdvantage: "Competitors with better data may outmaneuver you",
			FutureDifficulty:    "Decisions made without data may be harder to reverse",
		},
		AlternativesConsidered: []model.AlternativeConsidered{
			{Name: "Proceed with automated analysis", WhyNotSelected: "Insufficient data quality for confident recommendation"},
		},
		RiskAnalysis: &model.RiskAnalysis{
			RiskLevel:      "Low",
			WhoIsAffected:  "Decision-makers waiting for strategic guidance",
			HowItManifests: "Delayed strategic action",
			WhyAcceptable:  "Better to delay than to act on incomplete information",
		},
		WhyThisFits: &model.WhyThisFits{
			CompanyStageReason:  "Manual review appropriate for all stages when data is limited",
			BusinessModelReason: "Applicable across business models",
			MarketSegmentReason: "Market-agnostic recommendation",
			PrimaryKPIReason:    "Foundational step before KPI optimization",
		},
		ExecutionChecklist: &model.ExecutionChecklist{
			Next14Days:     []string{"Schedule manual strategy review", "Gather internal metrics not visible on website"},
			Next30To60Days: []string{"Complete manual analysis", "Return for AI-powered verdict with better data"},
			SuccessMetrics: []string{"Manual review completed", "Data gaps identified and filled"},
		},
		CreatedAt: time.Now(),
	}
}
