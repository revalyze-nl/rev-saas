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

const verdictSystemPrompt = `You are a senior SaaS pricing advisor acting as an AI co-founder.
Your job is to deliver ONE clear, confident pricing decision based on analyzing a company's website.

CRITICAL RULES:
1. You MUST give a single, imperative recommendation (e.g., "Increase prices by 15%")
2. You MUST NOT ask questions or present multiple options
3. You MUST NOT use hedging language like "might", "could", "consider"
4. You MUST use confident, advisor language: "This will...", "We recommend...", "Based on companies like yours..."
5. Confidence MUST be qualitative only: "low", "medium", or "high" - NO percentages
6. Numbers in details MUST be directional ranges, not false precision (e.g., "~$20-30K/month", "Low single-digit churn")
7. Your tone should be calm, confident, and opinionated - like a senior consultant delivering a conclusion

OUTPUT FORMAT (strict JSON):
{
  "recommendation": "<imperative pricing action, e.g. 'Increase prices by 15%'>",
  "outcome": "<one sentence verbal outcome, confident tone, e.g. 'This will increase your revenue with minimal churn impact.'>",
  "confidence": "<low|medium|high>",
  "confidenceReason": "<short reason, advisor tone, e.g. 'patterns we see in companies like yours'>",
  "reasoning": [
    {"title": "Market context", "content": "<2-3 sentences about market positioning>"},
    {"title": "What we know about your customers", "content": "<2-3 sentences about customer signals>"},
    {"title": "Why now", "content": "<1-2 sentences about timing>"}
  ],
  "risks": [
    {"level": "low|medium|high", "text": "<definitive statement, not 'may', e.g. 'Some enterprise customers will want to discuss terms'>"}
  ],
  "details": {
    "revenueImpact": "<directional range, e.g. '~$20-30K/month additional revenue'>",
    "churnRisk": "<qualitative, e.g. 'Low single-digit churn expected'>",
    "marketPosition": "<relative statement, e.g. 'Significantly below market average'>"
  },
  "timing": {
    "recommendation": "<when to act, e.g. 'Act within the next 2 weeks'>",
    "reasoning": "<why this timing, e.g. 'To capture the upcoming renewal window'>"
  }
}

Remember: The user must NOT be forced to think. Deliver the decision, not options.`

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
		websiteText = fmt.Sprintf("Website URL: %s (content could not be fetched)", websiteURL)
	}

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

	// Truncate if too long
	if len(text) > 8000 {
		text = text[:8000] + "..."
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

	// Clean up whitespace
	spaceRe := regexp.MustCompile(`\s+`)
	text = spaceRe.ReplaceAllString(text, " ")
	text = strings.TrimSpace(text)

	return text
}

// callOpenAI makes the API call to generate the verdict
func (s *VerdictService) callOpenAI(ctx context.Context, websiteURL, websiteText string) (string, error) {
	userPrompt := fmt.Sprintf(`Analyze this SaaS company and provide a confident pricing recommendation.

Website: %s

Website Content:
%s

Based on this information, deliver your pricing verdict. Remember:
- Give ONE clear recommendation
- Be confident and direct
- No hedging or multiple options
- Use advisor tone throughout`, websiteURL, websiteText)

	reqBody := map[string]interface{}{
		"model": "gpt-4o-mini",
		"messages": []map[string]string{
			{"role": "system", "content": verdictSystemPrompt},
			{"role": "user", "content": userPrompt},
		},
		"temperature": 0.7,
		"max_tokens":  1500,
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
		WebsiteURL:       websiteURL,
		Recommendation:   openAIResp.Recommendation,
		Outcome:          openAIResp.Outcome,
		Confidence:       openAIResp.Confidence,
		ConfidenceReason: openAIResp.ConfidenceReason,
		Details: model.VerdictDetails{
			RevenueImpact:  openAIResp.Details.RevenueImpact,
			ChurnRisk:      openAIResp.Details.ChurnRisk,
			MarketPosition: openAIResp.Details.MarketPosition,
		},
		Timing: model.VerdictTiming{
			Recommendation: openAIResp.Timing.Recommendation,
			Reasoning:      openAIResp.Timing.Reasoning,
		},
		CreatedAt: time.Now(),
	}

	// Convert reasoning
	for _, r := range openAIResp.Reasoning {
		verdict.Reasoning = append(verdict.Reasoning, model.VerdictReasoning{
			Title:   r.Title,
			Content: r.Content,
		})
	}

	// Convert risks
	for _, r := range openAIResp.Risks {
		verdict.Risks = append(verdict.Risks, model.VerdictRisk{
			Level: r.Level,
			Text:  r.Text,
		})
	}

	return verdict, nil
}

// getFallbackVerdict returns a safe fallback when OpenAI fails
func (s *VerdictService) getFallbackVerdict(websiteURL string) *model.VerdictResponse {
	return &model.VerdictResponse{
		WebsiteURL:       websiteURL,
		Recommendation:   "Review your current pricing structure",
		Outcome:          "We need more information to provide a specific recommendation.",
		Confidence:       "low",
		ConfidenceReason: "limited data available from website analysis",
		Reasoning: []model.VerdictReasoning{
			{
				Title:   "Analysis status",
				Content: "We were unable to fully analyze your website content. This may be due to access restrictions or technical limitations.",
			},
		},
		Risks: []model.VerdictRisk{
			{
				Level: "low",
				Text:  "No immediate action required until we can complete a full analysis",
			},
		},
		Details: model.VerdictDetails{
			RevenueImpact:  "To be determined",
			ChurnRisk:      "To be determined",
			MarketPosition: "To be determined",
		},
		Timing: model.VerdictTiming{
			Recommendation: "Try again with a different URL or more accessible page",
			Reasoning:      "Once we can access your content, we will provide a specific recommendation",
		},
		CreatedAt: time.Now(),
	}
}
