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

const verdictSystemPrompt = `You are a SaaS pricing advisor. Your job is to deliver ONE confident pricing recommendation based ONLY on the website content provided.

## CRITICAL GROUNDING RULES (MUST FOLLOW)

1. ONLY use information explicitly present in the provided website text
2. NEVER invent:
   - Competitor names (unless explicitly mentioned on the website)
   - Product names (unless explicitly mentioned on the website)
   - Customer metrics (usage, NPS, churn, conversion rates)
   - Internal business data (revenue, customer count, growth rates)
   - Market statistics or trends not mentioned in the text
3. If you cannot find enough signals, set confidenceLevel to "low" and be honest about limited data
4. Every claim in "why" must be traceable to something in the website text
5. Use phrases like "Based on your public positioning..." or "Your website indicates..." to stay grounded

## WHAT YOU CAN OBSERVE FROM WEBSITE TEXT
- Target audience / customer segments mentioned
- Value propositions and messaging
- Pricing tiers if visible (names, features, positioning)
- Product positioning (enterprise vs SMB, premium vs budget)
- Industry/vertical focus
- Feature emphasis and differentiation claims
- Social proof mentioned (customer logos, testimonials text)
- Call-to-action language and urgency signals

## OUTPUT RULES
- Be confident but grounded - confidence comes from observable signals, not invented data
- No hedging language ("might", "could", "consider") - but stay factual
- No numeric precision unless the website explicitly states numbers
- If evidence is weak, lower confidence and say so honestly

## OUTPUT FORMAT (strict JSON, no markdown)
{
  "verdictTitle": "<imperative pricing action based on observed positioning>",
  "outcomeSummary": "<one sentence outcome, no invented numbers>",
  "confidenceLevel": "<low|medium|high - based on evidence quality>",
  "why": [
    "<reason citing specific website signal, e.g. 'Your enterprise positioning suggests room for premium pricing'>",
    "<reason citing specific website signal>",
    "<reason citing specific website signal>"
  ],
  "riskConsiderations": [
    {"level": "low|medium|high", "description": "<risk based on observed factors + mitigation suggestion>"}
  ],
  "supportingDetails": {
    "expectedRevenue": "<directional only, e.g. 'Likely increase based on value-focused messaging'>",
    "churnOutlook": "<directional only, e.g. 'Low risk given enterprise focus'>",
    "marketPosition": "<based on observed positioning from website, e.g. 'Premium positioning based on feature emphasis'>"
  },
  "evidence": {
    "websiteSignalsUsed": [
      "<exact signal observed, e.g. 'Enterprise-focused messaging on homepage'>",
      "<exact signal observed, e.g. 'Premium feature set emphasis'>",
      "<exact signal observed, e.g. 'Target audience: mid-market companies'>"
    ]
  }
}

Return ONLY valid JSON. No markdown code blocks. No invented data.`

const userPromptTemplate = `Analyze this company's website and provide a grounded pricing recommendation.

## Website URL
%s

## Extracted Website Text
%s

## Instructions
1. Read the website text carefully
2. Identify observable signals about pricing, positioning, and target customers
3. Base your recommendation ONLY on what you can observe
4. If the text is limited or unclear, set confidence to "low" and be honest
5. List the specific signals you used in the "evidence" field

Return your analysis as JSON following the exact format specified.`

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
		"temperature": 0.4, // Lower temperature for more consistent, grounded outputs
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
		VerdictTitle:    openAIResp.VerdictTitle,
		OutcomeSummary:  openAIResp.OutcomeSummary,
		ConfidenceLevel: openAIResp.ConfidenceLevel,
		Why:             openAIResp.Why,
		SupportingDetails: model.SupportingDetails{
			ExpectedRevenue: openAIResp.SupportingDetails.ExpectedRevenue,
			ChurnOutlook:    openAIResp.SupportingDetails.ChurnOutlook,
			MarketPosition:  openAIResp.SupportingDetails.MarketPosition,
		},
		Evidence: model.VerdictEvidence{
			WebsiteSignalsUsed: openAIResp.Evidence.WebsiteSignalsUsed,
		},
		CreatedAt: time.Now(),
	}

	// Convert risk considerations
	for _, r := range openAIResp.RiskConsiderations {
		verdict.RiskConsiderations = append(verdict.RiskConsiderations, model.RiskConsideration{
			Level:       r.Level,
			Description: r.Description,
		})
	}

	return verdict, nil
}

// getFallbackVerdict returns a safe fallback when OpenAI fails
func (s *VerdictService) getFallbackVerdict(websiteURL string) *model.VerdictResponse {
	return &model.VerdictResponse{
		WebsiteURL:      websiteURL,
		VerdictTitle:    "Review your current pricing structure",
		OutcomeSummary:  "Insufficient data to provide a specific recommendation.",
		ConfidenceLevel: "low",
		Why: []string{
			"Website content could not be fully analyzed",
			"Limited observable signals available",
			"Manual review of your pricing page recommended",
		},
		RiskConsiderations: []model.RiskConsideration{
			{
				Level:       "low",
				Description: "No immediate action required - gather more data before making changes",
			},
		},
		SupportingDetails: model.SupportingDetails{
			ExpectedRevenue: "Unable to assess without website data",
			ChurnOutlook:    "Unable to assess without website data",
			MarketPosition:  "Unable to assess without website data",
		},
		Evidence: model.VerdictEvidence{
			WebsiteSignalsUsed: []string{"Website content unavailable for analysis"},
		},
		CreatedAt: time.Now(),
	}
}
