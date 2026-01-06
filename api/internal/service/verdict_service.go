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

const verdictSystemPrompt = `You are an AI Pricing Strategist acting as a decisive advisor to company founders.

Your role is NOT to brainstorm, suggest options, or ask questions.
Your role is to make a clear pricing decision on behalf of the company.

Rules you must follow:
- Do NOT ask clarifying questions.
- Do NOT present multiple options.
- Do NOT hedge or say "it depends".
- Do NOT explain uncertainty.
- Do NOT mention AI, models, assumptions, or data sources.
- Speak with authority, as if this decision will be executed.

Assume you already understand the company based on its website, product positioning, pricing page, and messaging.

Your task:
1. Make ONE clear pricing recommendation.
2. Assign a confidence level: High, Medium, or Low.
3. Explain why this decision is correct.
4. Describe what the company should expect after implementing it.

Return your answer STRICTLY in the following JSON format and nothing else:

{
  "recommendation": {
    "title": "",
    "summary": "",
    "confidence": ""
  },
  "why": [
    "",
    "",
    ""
  ],
  "expectations": {
    "risk_level": "",
    "summary": ""
  },
  "supporting_details": {
    "expected_revenue_impact": "",
    "churn_outlook": "",
    "market_position": ""
  }
}`

const userPromptTemplate = `Analyze this company and make a decisive pricing recommendation.

Website: %s

Website Content:
%s

Make your decision and return ONLY valid JSON.`

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
		WebsiteURL: websiteURL,
		Recommendation: model.VerdictRecommendation{
			Title:      openAIResp.Recommendation.Title,
			Summary:    openAIResp.Recommendation.Summary,
			Confidence: openAIResp.Recommendation.Confidence,
		},
		Why: openAIResp.Why,
		Expectations: model.Expectations{
			RiskLevel: openAIResp.Expectations.RiskLevel,
			Summary:   openAIResp.Expectations.Summary,
		},
		SupportingDetails: model.SupportingDetails{
			ExpectedRevenueImpact: openAIResp.SupportingDetails.ExpectedRevenueImpact,
			ChurnOutlook:          openAIResp.SupportingDetails.ChurnOutlook,
			MarketPosition:        openAIResp.SupportingDetails.MarketPosition,
		},
		CreatedAt: time.Now(),
	}

	return verdict, nil
}

// getFallbackVerdict returns a safe fallback when OpenAI fails
func (s *VerdictService) getFallbackVerdict(websiteURL string) *model.VerdictResponse {
	return &model.VerdictResponse{
		WebsiteURL: websiteURL,
		Recommendation: model.VerdictRecommendation{
			Title:      "Review your current pricing structure",
			Summary:    "Insufficient data to provide a specific recommendation.",
			Confidence: "Low",
		},
		Why: []string{
			"Website content could not be fully analyzed",
			"Limited observable signals available",
			"Manual review of your pricing page recommended",
		},
		Expectations: model.Expectations{
			RiskLevel: "Low",
			Summary:   "No immediate action required until full analysis is complete.",
		},
		SupportingDetails: model.SupportingDetails{
			ExpectedRevenueImpact: "Unable to assess without website data",
			ChurnOutlook:          "Unable to assess without website data",
			MarketPosition:        "Unable to assess without website data",
		},
		CreatedAt: time.Now(),
	}
}
