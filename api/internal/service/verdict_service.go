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

const verdictSystemPrompt = `You are an AI Pricing Verdict Engine for SaaS founders.

Your job is NOT to analyze endlessly.
Your job is to deliver ONE confident pricing verdict.

The user has already provided a company website.
You must infer everything else yourself:
- Product positioning
- Target customer sophistication
- Competitive landscape
- Monetization maturity
- Willingness to pay

Do NOT ask questions.
Do NOT provide multiple options.
Do NOT explain your reasoning process.
Do NOT hedge.

Think like a senior pricing partner who says:
"This is the move. Here's why. Here's what happens next."

---

CONTEXT:
- Company type: SaaS
- Market: Competitive B2B SaaS
- Goal: Increase revenue without destroying long-term retention
- Output will be shown directly to founders and investors
- Tone must feel expensive, confident, and decisive

---

OUTPUT FORMAT (STRICT JSON, NO EXTRA TEXT):

{
  "headline": "Imperative, strategic pricing decision (max 12 words)",
  "summary": "1–2 sentences describing the strategic move and its outcome",
  "confidence": "High | Medium | Low",
  "cta": "Short decisive CTA text (e.g. 'Proceed with this decision')",

  "why_this_decision": [
    "Reason 1 grounded in market or competition",
    "Reason 2 grounded in customer value perception",
    "Reason 3 grounded in revenue or positioning leverage"
  ],

  "what_to_expect": {
    "risk_level": "Low | Medium | High",
    "description": "1 sentence describing realistic downside or resistance"
  },

  "supporting_details": {
    "expected_revenue_impact": "Concrete percentage range",
    "churn_outlook": "Short, honest expectation",
    "market_positioning": "1 sentence describing how this repositions the company"
  }
}

---

RULES:
- Be bold, not safe
- Avoid generic SaaS advice
- Avoid phrases like 'it depends'
- Sound like you've seen this work many times before
- The verdict should feel worth paying for`

const userPromptTemplate = `Analyze this SaaS company and produce your pricing verdict.

Website: %s

Website Content:
%s

Return ONLY valid JSON with your verdict.`

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
			Timeout: 90 * time.Second,
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

	log.Printf("[verdict] Generating verdict for: %s", websiteURL)

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

	// Parse response
	verdict, err := s.parseVerdictResponse(verdictJSON, websiteURL)
	if err != nil {
		log.Printf("[verdict] Failed to parse response: %v", err)
		return s.getFallbackVerdict(websiteURL), nil
	}

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

	// Truncate if too long (keep ~8k chars for context window)
	if len(text) > 8000 {
		text = text[:8000] + "\n[Content truncated...]"
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
		"temperature": 0.5,
		"max_tokens":  2000,
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

// parseVerdictResponse parses the OpenAI JSON response into a VerdictResponse
func (s *VerdictService) parseVerdictResponse(jsonStr, websiteURL string) (*model.VerdictResponse, error) {
	// Clean up response (remove markdown code blocks if present)
	jsonStr = strings.TrimSpace(jsonStr)
	jsonStr = strings.TrimPrefix(jsonStr, "```json")
	jsonStr = strings.TrimPrefix(jsonStr, "```")
	jsonStr = strings.TrimSuffix(jsonStr, "```")
	jsonStr = strings.TrimSpace(jsonStr)

	var openAIResp model.OpenAIVerdictResponse
	if err := json.Unmarshal([]byte(jsonStr), &openAIResp); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	// Convert to VerdictResponse
	verdict := &model.VerdictResponse{
		WebsiteURL:      websiteURL,
		Headline:        openAIResp.Headline,
		Summary:         openAIResp.Summary,
		Confidence:      openAIResp.Confidence,
		CTA:             openAIResp.CTA,
		WhyThisDecision: openAIResp.WhyThisDecision,
		WhatToExpect: model.VerdictExpectations{
			RiskLevel:   openAIResp.WhatToExpect.RiskLevel,
			Description: openAIResp.WhatToExpect.Description,
		},
		SupportingDetails: model.VerdictSupportDetails{
			ExpectedRevenueImpact: openAIResp.SupportingDetails.ExpectedRevenueImpact,
			ChurnOutlook:          openAIResp.SupportingDetails.ChurnOutlook,
			MarketPositioning:     openAIResp.SupportingDetails.MarketPositioning,
		},
		CreatedAt: time.Now(),
	}

	return verdict, nil
}

// getFallbackVerdict returns a safe fallback when OpenAI fails
func (s *VerdictService) getFallbackVerdict(websiteURL string) *model.VerdictResponse {
	return &model.VerdictResponse{
		WebsiteURL: websiteURL,
		Headline:   "Review Your Current Pricing Structure",
		Summary:    "We need more data to provide a specific recommendation. Consider a manual pricing audit.",
		Confidence: "Low",
		CTA:        "Request manual analysis",
		WhyThisDecision: []string{
			"Website content could not be fully analyzed",
			"Limited observable signals available for pricing assessment",
			"Manual review of your pricing page is recommended",
		},
		WhatToExpect: model.VerdictExpectations{
			RiskLevel:   "Low",
			Description: "No immediate action required until a full analysis can be completed.",
		},
		SupportingDetails: model.VerdictSupportDetails{
			ExpectedRevenueImpact: "Unable to assess without website data",
			ChurnOutlook:          "Unable to assess without website data",
			MarketPositioning:     "Unable to assess without website data",
		},
		CreatedAt: time.Now(),
	}
}
