package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/net/html"

	"rev-saas-api/internal/model"
	mongorepo "rev-saas-api/internal/repository/mongo"
)

const (
	maxResponseSize = 5 * 1024 * 1024 // 5MB
	httpTimeout     = 30 * time.Second
	defaultWebsite  = "https://www.usemotion.com/"
)

// Common pricing page paths to try
var commonPricingPaths = []string{
	"/pricing",
	"/plans",
	"/billing",
	"/upgrade",
	"/subscribe",
	"/pro",
	"/premium",
}

// Keywords to look for in links
var pricingKeywords = []string{
	"pricing", "price", "plan", "plans", "billing",
	"upgrade", "subscribe", "signup", "membership",
	"pro", "premium", "enterprise",
}

// PricingV2Service handles pricing v2 operations
type PricingV2Service struct {
	repo       *mongorepo.PricingV2Repository
	openAIKey  string
	httpClient *http.Client
}

// NewPricingV2Service creates a new PricingV2Service
func NewPricingV2Service(repo *mongorepo.PricingV2Repository, openAIKey string) *PricingV2Service {
	return &PricingV2Service{
		repo:      repo,
		openAIKey: openAIKey,
		httpClient: &http.Client{
			Timeout: httpTimeout,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				if len(via) >= 10 {
					return fmt.Errorf("too many redirects")
				}
				return nil
			},
		},
	}
}

// DiscoverPricingPage finds potential pricing page URLs for a website
func (s *PricingV2Service) DiscoverPricingPage(ctx context.Context, websiteURL string) (*model.PricingDiscoverResponse, error) {
	// Normalize and validate URL
	websiteURL = s.normalizeURL(websiteURL)
	if websiteURL == "" {
		websiteURL = defaultWebsite
	}

	if err := s.validateURL(websiteURL); err != nil {
		return &model.PricingDiscoverResponse{
			Error: fmt.Sprintf("invalid URL: %v", err),
		}, nil
	}

	baseURL, err := url.Parse(websiteURL)
	if err != nil {
		return &model.PricingDiscoverResponse{
			Error: "failed to parse URL",
		}, nil
	}

	candidates := make([]string, 0)
	candidateScores := make(map[string]int)

	// Try common pricing paths
	for i, path := range commonPricingPaths {
		testURL := fmt.Sprintf("%s://%s%s", baseURL.Scheme, baseURL.Host, path)
		if s.urlExists(ctx, testURL) {
			candidates = append(candidates, testURL)
			candidateScores[testURL] = 100 - i*10 // Higher score for earlier paths
		}
	}

	// Fetch homepage and extract links
	homepageLinks, err := s.extractLinksFromPage(ctx, websiteURL)
	if err == nil {
		for _, link := range homepageLinks {
			// Check if link contains pricing keywords
			linkLower := strings.ToLower(link)
			for _, keyword := range pricingKeywords {
				if strings.Contains(linkLower, keyword) {
					// Resolve relative URLs
					fullURL := s.resolveURL(baseURL, link)
					if fullURL != "" && !s.containsURL(candidates, fullURL) {
						candidates = append(candidates, fullURL)
						candidateScores[fullURL] = 50
					}
					break
				}
			}
		}
	}

	// Sort by score
	sort.Slice(candidates, func(i, j int) bool {
		return candidateScores[candidates[i]] > candidateScores[candidates[j]]
	})

	// Limit to top 5
	if len(candidates) > 5 {
		candidates = candidates[:5]
	}

	// Select first as primary if available
	var selected *string
	if len(candidates) > 0 {
		selected = &candidates[0]
	}

	return &model.PricingDiscoverResponse{
		PricingCandidates:  candidates,
		SelectedPricingURL: selected,
	}, nil
}

// ExtractPricing extracts pricing information from a URL
func (s *PricingV2Service) ExtractPricing(ctx context.Context, pricingURL string) (*model.PricingExtractResponse, error) {
	// Validate URL
	if err := s.validateURL(pricingURL); err != nil {
		return &model.PricingExtractResponse{
			Error: fmt.Sprintf("invalid URL: %v", err),
		}, nil
	}

	// Fetch page content
	visibleText, rawHTML, err := s.fetchPageContent(ctx, pricingURL)
	if err != nil {
		return &model.PricingExtractResponse{
			Error: fmt.Sprintf("failed to fetch page: %v", err),
		}, nil
	}

	if len(visibleText) < 100 {
		return &model.PricingExtractResponse{
			Error:    "page content too short or empty",
			Warnings: []string{"page_content_minimal"},
		}, nil
	}

	// Extract using LLM
	plans, warnings, err := s.extractWithLLM(ctx, visibleText, rawHTML, pricingURL)
	if err != nil {
		return &model.PricingExtractResponse{
			Error:    fmt.Sprintf("extraction failed: %v", err),
			Warnings: warnings,
		}, nil
	}

	// Detect billing periods
	periods := s.detectBillingPeriods(plans)

	return &model.PricingExtractResponse{
		Plans:           plans,
		SourceURL:       pricingURL,
		DetectedPeriods: periods,
		Warnings:        warnings,
	}, nil
}

// SavePlans saves extracted plans to the database
func (s *PricingV2Service) SavePlans(ctx context.Context, userID string, req model.PricingSaveRequest) (*model.PricingSaveResponse, error) {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return &model.PricingSaveResponse{
			Error: "invalid user ID",
		}, nil
	}

	// Delete existing plans for this user (replace with new extraction)
	if err := s.repo.DeleteByUserID(ctx, uid); err != nil {
		log.Printf("[pricing-v2] failed to delete existing plans: %v", err)
	}

	// Convert and save
	plans := make([]*model.PricingV2Plan, len(req.Plans))
	for i, p := range req.Plans {
		plans[i] = &model.PricingV2Plan{
			UserID:        uid,
			WebsiteURL:    req.WebsiteURL,
			SourceURL:     req.SourceURL,
			ExtractedAt:   time.Now(),
			PlanName:      p.Name,
			PriceAmount:   p.PriceAmount,
			PriceString:   p.PriceString,
			Currency:      p.Currency,
			BillingPeriod: p.BillingPeriod,
			IncludedUnits: p.IncludedUnits,
			Features:      p.Features,
			Evidence:      p.Evidence,
		}
	}

	count, err := s.repo.CreateMany(ctx, plans)
	if err != nil {
		return &model.PricingSaveResponse{
			Error: fmt.Sprintf("failed to save plans: %v", err),
		}, nil
	}

	return &model.PricingSaveResponse{
		SavedCount: count,
	}, nil
}

// GetSavedPlans returns saved pricing v2 plans for a user
func (s *PricingV2Service) GetSavedPlans(ctx context.Context, userID string) (*model.SavedPricingV2Response, error) {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID")
	}

	plans, err := s.repo.FindByUserID(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("failed to get plans: %w", err)
	}

	return &model.SavedPricingV2Response{
		Plans: plans,
		Count: len(plans),
	}, nil
}

// LLM Extraction Prompt
const extractionPrompt = `You are a pricing data extraction specialist. Extract pricing plan information from the provided website content.

STRICT RULES:
1. ONLY extract information that is EXPLICITLY present in the content
2. If a field is not found, use null - NEVER guess or invent data
3. Include evidence snippets (exact text from source) for every extracted value
4. Detect billing periods: "monthly", "yearly", or "unknown"
5. Parse per-seat prices like "$19/seat/mo" correctly
6. Extract quantifiable units like "7,500 credits/seat/month"
7. List only the TOP 5 most important features per plan

Output ONLY valid JSON in this exact format:
{
  "plans": [
    {
      "name": "Plan Name",
      "price_amount": 19.00,
      "price_string": "$19/seat/mo",
      "currency": "USD",
      "billing_period": "monthly",
      "included_units": [
        {
          "name": "credits",
          "amount": 7500,
          "unit": "per seat per month",
          "raw_text": "7,500 credits/seat/month"
        }
      ],
      "features": ["Feature 1", "Feature 2"],
      "evidence": {
        "name_snippet": "exact text where plan name appears",
        "price_snippet": "exact text showing the price",
        "units_snippet": "exact text showing included units"
      }
    }
  ],
  "detected_billing_options": ["monthly", "yearly"],
  "warnings": []
}

IMPORTANT:
- If you find both monthly AND yearly prices, create separate plan entries for each billing period
- If features are not visible, return empty features array and add "features_not_visible" to warnings
- If pricing appears to require login/contact sales, add "pricing_gated" to warnings
- Currency should be "USD", "EUR", "GBP", etc. based on currency symbols ($ = USD, € = EUR, £ = GBP)`

// extractWithLLM uses OpenAI to extract pricing from page content
func (s *PricingV2Service) extractWithLLM(ctx context.Context, visibleText, rawHTML, sourceURL string) ([]model.ExtractedPlan, []string, error) {
	if s.openAIKey == "" {
		return nil, nil, fmt.Errorf("OpenAI API key not configured")
	}

	// Prepare content for LLM (limit size)
	content := visibleText
	if len(content) > 15000 {
		content = content[:15000] + "\n...[truncated]"
	}

	userPrompt := fmt.Sprintf(`Extract pricing information from this page.

Source URL: %s

Page Content:
%s`, sourceURL, content)

	// Call OpenAI
	reqBody := map[string]interface{}{
		"model": "gpt-4o-mini",
		"messages": []map[string]string{
			{"role": "system", "content": extractionPrompt},
			{"role": "user", "content": userPrompt},
		},
		"temperature": 0.1,
		"max_tokens":  2000,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.openAIKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, err
	}

	var apiResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}

	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, nil, err
	}

	if apiResp.Error.Message != "" {
		return nil, nil, fmt.Errorf("OpenAI error: %s", apiResp.Error.Message)
	}

	if len(apiResp.Choices) == 0 {
		return nil, nil, fmt.Errorf("no response from OpenAI")
	}

	// Parse LLM response
	response := strings.TrimSpace(apiResp.Choices[0].Message.Content)
	response = strings.TrimPrefix(response, "```json")
	response = strings.TrimPrefix(response, "```")
	response = strings.TrimSuffix(response, "```")
	response = strings.TrimSpace(response)

	var result struct {
		Plans    []model.ExtractedPlan `json:"plans"`
		Warnings []string              `json:"warnings"`
	}

	if err := json.Unmarshal([]byte(response), &result); err != nil {
		log.Printf("[pricing-v2] failed to parse LLM response: %v, response: %s", err, response)
		return nil, []string{"parse_error"}, fmt.Errorf("failed to parse extraction result")
	}

	return result.Plans, result.Warnings, nil
}

// Helper functions

func (s *PricingV2Service) normalizeURL(rawURL string) string {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return ""
	}

	// Add https if no scheme
	if !strings.HasPrefix(rawURL, "http://") && !strings.HasPrefix(rawURL, "https://") {
		rawURL = "https://" + rawURL
	}

	// Parse and normalize
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return ""
	}

	// Ensure trailing slash for root
	if parsed.Path == "" {
		parsed.Path = "/"
	}

	return parsed.String()
}

func (s *PricingV2Service) validateURL(rawURL string) error {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid URL format")
	}

	// Only allow http/https
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("only http/https URLs allowed")
	}

	// Block localhost and private IPs
	host := parsed.Hostname()
	if host == "localhost" || host == "127.0.0.1" || host == "0.0.0.0" {
		return fmt.Errorf("localhost not allowed")
	}

	// Check for private IP ranges
	ip := net.ParseIP(host)
	if ip != nil {
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() {
			return fmt.Errorf("private/internal IPs not allowed")
		}
	}

	return nil
}

func (s *PricingV2Service) urlExists(ctx context.Context, testURL string) bool {
	req, err := http.NewRequestWithContext(ctx, "HEAD", testURL, nil)
	if err != nil {
		return false
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; Revalyze/1.0)")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK
}

func (s *PricingV2Service) fetchPageContent(ctx context.Context, pageURL string) (string, string, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", pageURL, nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	// Limit response size
	limitedReader := io.LimitReader(resp.Body, maxResponseSize)
	body, err := io.ReadAll(limitedReader)
	if err != nil {
		return "", "", err
	}

	rawHTML := string(body)
	visibleText := s.extractVisibleText(rawHTML)

	return visibleText, rawHTML, nil
}

func (s *PricingV2Service) extractVisibleText(htmlContent string) string {
	doc, err := html.Parse(strings.NewReader(htmlContent))
	if err != nil {
		// Fallback: strip HTML tags with regex
		re := regexp.MustCompile(`<[^>]*>`)
		return re.ReplaceAllString(htmlContent, " ")
	}

	var textBuilder strings.Builder
	var extractText func(*html.Node)

	extractText = func(n *html.Node) {
		// Skip script, style, and hidden elements
		if n.Type == html.ElementNode {
			switch n.Data {
			case "script", "style", "noscript", "head", "meta", "link":
				return
			}
		}

		if n.Type == html.TextNode {
			text := strings.TrimSpace(n.Data)
			if text != "" {
				textBuilder.WriteString(text)
				textBuilder.WriteString(" ")
			}
		}

		for c := n.FirstChild; c != nil; c = c.NextSibling {
			extractText(c)
		}
	}

	extractText(doc)

	// Clean up whitespace
	result := textBuilder.String()
	result = regexp.MustCompile(`\s+`).ReplaceAllString(result, " ")
	return strings.TrimSpace(result)
}

func (s *PricingV2Service) extractLinksFromPage(ctx context.Context, pageURL string) ([]string, error) {
	_, rawHTML, err := s.fetchPageContent(ctx, pageURL)
	if err != nil {
		return nil, err
	}

	doc, err := html.Parse(strings.NewReader(rawHTML))
	if err != nil {
		return nil, err
	}

	var links []string
	var extractLinks func(*html.Node)

	extractLinks = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "a" {
			for _, attr := range n.Attr {
				if attr.Key == "href" {
					links = append(links, attr.Val)
					break
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			extractLinks(c)
		}
	}

	extractLinks(doc)
	return links, nil
}

func (s *PricingV2Service) resolveURL(base *url.URL, ref string) string {
	refURL, err := url.Parse(ref)
	if err != nil {
		return ""
	}
	resolved := base.ResolveReference(refURL)
	return resolved.String()
}

func (s *PricingV2Service) containsURL(urls []string, target string) bool {
	for _, u := range urls {
		if u == target {
			return true
		}
	}
	return false
}

func (s *PricingV2Service) detectBillingPeriods(plans []model.ExtractedPlan) []string {
	periodSet := make(map[string]bool)
	for _, p := range plans {
		if p.BillingPeriod != "" && p.BillingPeriod != "unknown" {
			periodSet[p.BillingPeriod] = true
		}
	}

	periods := make([]string, 0, len(periodSet))
	for p := range periodSet {
		periods = append(periods, p)
	}
	return periods
}
