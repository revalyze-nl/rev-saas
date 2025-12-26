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

	"github.com/chromedp/chromedp"
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

// Toggle indicators - patterns that suggest a billing toggle exists
var toggleIndicators = []string{
	"pay monthly", "pay annually", "monthly", "yearly", "annual",
	"billed monthly", "billed annually", "billed yearly",
	"save", "per month", "per year", "/mo", "/yr",
	"switch to annual", "switch to monthly",
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

// ExtractPricing extracts pricing information from a URL with 3-stage strategy
func (s *PricingV2Service) ExtractPricing(ctx context.Context, pricingURL string) (*model.PricingExtractResponse, error) {
	// Validate URL
	if err := s.validateURL(pricingURL); err != nil {
		return &model.PricingExtractResponse{
			Error: fmt.Sprintf("invalid URL: %v", err),
		}, nil
	}

	// Stage 1: Static HTML parse
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

	// Extract hidden content (aria-hidden, display:none, etc.)
	hiddenContent := s.extractHiddenContent(rawHTML)

	// Extract script JSON candidates (__NEXT_DATA__, ld+json, window.__NUXT__)
	scriptJSON := s.extractScriptJSON(rawHTML)

	// Combine all content for LLM
	combinedContent := visibleText
	if hiddenContent != "" {
		combinedContent += "\n\n--- HIDDEN CONTENT (may contain alternate billing) ---\n" + hiddenContent
	}
	if scriptJSON != "" {
		combinedContent += "\n\n--- SCRIPT DATA ---\n" + scriptJSON
	}

	// Stage 2: Detection - check if toggle exists
	hasToggle := s.detectBillingToggle(visibleText, rawHTML)
	
	// First extraction attempt with static content
	plans, warnings, err := s.extractWithLLM(ctx, combinedContent, rawHTML, pricingURL)
	if err != nil {
		return &model.PricingExtractResponse{
			Error:    fmt.Sprintf("extraction failed: %v", err),
			Warnings: warnings,
		}, nil
	}

	// Detect billing periods from extracted plans
	periods := s.detectBillingPeriods(plans)
	
	// Check if we need browser rendering
	needsRender := false
	if hasToggle && len(periods) <= 1 {
		needsRender = true
		warnings = append(warnings, "toggle_detected_single_period")
	}

	// Stage 3: Browser render if needed
	if needsRender && s.shouldUseBrowserRender() {
		log.Printf("[pricing-v2] toggle detected, attempting browser render for: %s", pricingURL)
		
		browserPlans, browserPeriods, browserWarnings, err := s.extractWithBrowserRender(ctx, pricingURL)
		if err != nil {
			log.Printf("[pricing-v2] browser render failed: %v", err)
			warnings = append(warnings, "browser_render_failed")
		} else {
			// Use browser results if better
			if len(browserPlans) > len(plans) || len(browserPeriods) > len(periods) {
				plans = browserPlans
				periods = browserPeriods
				warnings = append(warnings, browserWarnings...)
				return &model.PricingExtractResponse{
					Plans:           plans,
					SourceURL:       pricingURL,
					DetectedPeriods: periods,
					NeedsRender:     false,
					RenderUsed:      true,
					Warnings:        warnings,
				}, nil
			}
		}
	}

	return &model.PricingExtractResponse{
		Plans:           plans,
		SourceURL:       pricingURL,
		DetectedPeriods: periods,
		NeedsRender:     needsRender,
		RenderUsed:      false,
		Warnings:        warnings,
	}, nil
}

// shouldUseBrowserRender checks if browser rendering is available
func (s *PricingV2Service) shouldUseBrowserRender() bool {
	// Always try browser render when needed
	return true
}

// extractWithBrowserRender uses chromedp to render page and capture toggle states
func (s *PricingV2Service) extractWithBrowserRender(ctx context.Context, pricingURL string) ([]model.ExtractedPlan, []string, []string, error) {
	// Create browser context with timeout
	allocCtx, cancel := chromedp.NewExecAllocator(ctx,
		append(chromedp.DefaultExecAllocatorOptions[:],
			chromedp.Flag("headless", true),
			chromedp.Flag("disable-gpu", true),
			chromedp.Flag("no-sandbox", true),
			chromedp.Flag("disable-dev-shm-usage", true),
			chromedp.Flag("disable-setuid-sandbox", true),
			chromedp.Flag("disable-web-security", false),
			chromedp.Flag("disable-background-networking", true),
			chromedp.Flag("disable-default-apps", true),
			chromedp.Flag("disable-extensions", true),
			chromedp.Flag("disable-sync", true),
			chromedp.Flag("disable-translate", true),
			chromedp.Flag("mute-audio", true),
			chromedp.Flag("hide-scrollbars", true),
		)...,
	)
	defer cancel()

	browserCtx, cancelBrowser := chromedp.NewContext(allocCtx, chromedp.WithLogf(log.Printf))
	defer cancelBrowser()

	// Set timeout for browser operations
	browserCtx, cancelTimeout := context.WithTimeout(browserCtx, 45*time.Second)
	defer cancelTimeout()

	var allPlans []model.ExtractedPlan
	var allPeriods []string
	var warnings []string

	// Snapshot A: Default state
	var defaultHTML string
	var defaultText string
	
	log.Printf("[pricing-v2] loading page in browser: %s", pricingURL)
	
	err := chromedp.Run(browserCtx,
		chromedp.Navigate(pricingURL),
		chromedp.WaitVisible("body", chromedp.ByQuery),
		chromedp.Sleep(2*time.Second), // Wait for JS to load
		chromedp.InnerHTML("html", &defaultHTML, chromedp.ByQuery),
		chromedp.Text("body", &defaultText, chromedp.ByQuery),
	)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to load page: %w", err)
	}

	log.Printf("[pricing-v2] captured default state, text length: %d", len(defaultText))

	// Try to find and click billing toggle tabs
	monthlyClicked := false
	yearlyClicked := false
	
	// Common selectors for monthly/yearly tabs
	tabSelectors := []struct {
		monthly string
		yearly  string
		name    string
	}{
		{`//button[contains(translate(., 'MONTHLY', 'monthly'), 'monthly')]`, `//button[contains(translate(., 'YEARLY', 'yearly'), 'yearly') or contains(translate(., 'ANNUAL', 'annual'), 'annual')]`, "button"},
		{`//*[@role='tab'][contains(translate(., 'MONTHLY', 'monthly'), 'monthly')]`, `//*[@role='tab'][contains(translate(., 'YEARLY', 'yearly'), 'yearly') or contains(translate(., 'ANNUAL', 'annual'), 'annual')]`, "role=tab"},
		{`//span[contains(translate(., 'MONTHLY', 'monthly'), 'monthly')]/ancestor::button[1]`, `//span[contains(translate(., 'YEARLY', 'yearly'), 'yearly') or contains(translate(., 'ANNUAL', 'annual'), 'annual')]/ancestor::button[1]`, "span-button"},
		{`//label[contains(translate(., 'MONTHLY', 'monthly'), 'monthly')]`, `//label[contains(translate(., 'YEARLY', 'yearly'), 'yearly') or contains(translate(., 'ANNUAL', 'annual'), 'annual')]`, "label"},
	}

	// Snapshot B: Monthly state (if toggle exists)
	var monthlyHTML string
	var monthlyText string
	
	for _, sel := range tabSelectors {
		err := chromedp.Run(browserCtx,
			chromedp.Click(sel.monthly, chromedp.BySearch),
			chromedp.Sleep(1*time.Second),
			chromedp.InnerHTML("html", &monthlyHTML, chromedp.ByQuery),
			chromedp.Text("body", &monthlyText, chromedp.ByQuery),
		)
		if err == nil {
			log.Printf("[pricing-v2] clicked monthly tab using selector: %s", sel.name)
			monthlyClicked = true
			break
		}
	}

	// Snapshot C: Yearly state
	var yearlyHTML string
	var yearlyText string
	
	for _, sel := range tabSelectors {
		err := chromedp.Run(browserCtx,
			chromedp.Click(sel.yearly, chromedp.BySearch),
			chromedp.Sleep(1*time.Second),
			chromedp.InnerHTML("html", &yearlyHTML, chromedp.ByQuery),
			chromedp.Text("body", &yearlyText, chromedp.ByQuery),
		)
		if err == nil {
			log.Printf("[pricing-v2] clicked yearly tab using selector: %s", sel.name)
			yearlyClicked = true
			break
		}
	}

	// Build combined content for LLM
	var combinedContent strings.Builder
	
	if monthlyClicked && monthlyText != "" {
		combinedContent.WriteString("=== MONTHLY BILLING STATE ===\n")
		combinedContent.WriteString(monthlyText)
		combinedContent.WriteString("\n\n")
	}
	
	if yearlyClicked && yearlyText != "" {
		combinedContent.WriteString("=== YEARLY/ANNUAL BILLING STATE ===\n")
		combinedContent.WriteString(yearlyText)
		combinedContent.WriteString("\n\n")
	}
	
	if !monthlyClicked && !yearlyClicked {
		// Use default state if no toggles clicked
		combinedContent.WriteString("=== DEFAULT STATE ===\n")
		combinedContent.WriteString(defaultText)
		warnings = append(warnings, "no_toggle_clicked")
	}

	// Add script JSON from rendered HTML
	combinedHTML := defaultHTML
	if yearlyHTML != "" {
		combinedHTML += yearlyHTML
	}
	if monthlyHTML != "" {
		combinedHTML += monthlyHTML
	}
	scriptJSON := s.extractScriptJSON(combinedHTML)
	if scriptJSON != "" {
		combinedContent.WriteString("\n\n--- SCRIPT DATA ---\n")
		combinedContent.WriteString(scriptJSON)
	}

	// Extract with LLM
	plans, llmWarnings, err := s.extractWithLLM(ctx, combinedContent.String(), combinedHTML, pricingURL)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("LLM extraction failed: %w", err)
	}

	allPlans = append(allPlans, plans...)
	warnings = append(warnings, llmWarnings...)
	allPeriods = s.detectBillingPeriods(allPlans)

	return allPlans, allPeriods, warnings, nil
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
			UserID:                  uid,
			WebsiteURL:              req.WebsiteURL,
			SourceURL:               req.SourceURL,
			ExtractedAt:             time.Now(),
			PlanName:                p.Name,
			PriceAmount:             p.PriceAmount,
			PriceString:             p.PriceString,
			Currency:                p.Currency,
			PriceFrequency:          p.PriceFrequency,
			BillingPeriod:           p.BillingPeriod,
			MonthlyEquivalentAmount: p.MonthlyEquivalentAmount,
			AnnualBilledAmount:      p.AnnualBilledAmount,
			IncludedUnits:           p.IncludedUnits,
			Features:                p.Features,
			Evidence:                p.Evidence,
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

// Updated LLM Extraction Prompt with billing period distinction
const extractionPrompt = `You are a pricing data extraction specialist. Extract pricing plan information from the provided website content.

STRICT RULES:
1. ONLY extract information that is EXPLICITLY present in the content
2. If a field is not found, use null - NEVER guess or invent data
3. Include evidence snippets (exact text from source) for every extracted value
4. Correctly distinguish billing periods:
   - "billed annually" or "per year" or "/yr" = billing_period: "yearly"
   - "billed monthly" or "per month" or "/mo" = billing_period: "monthly"
5. Handle annual plans showing monthly equivalent:
   - If plan shows "$15/mo billed annually", this is YEARLY billing with monthly_equivalent_amount=15
   - The annual_billed_amount would be 15*12=180
6. Parse per-seat prices like "$19/seat/mo" correctly
7. Extract quantifiable units like "7,500 credits/seat/month"
8. List only the TOP 5 most important features per plan

Output ONLY valid JSON in this exact format:
{
  "plans": [
    {
      "name": "Plan Name",
      "price_amount": 19.00,
      "price_string": "$19/seat/mo",
      "currency": "USD",
      "price_frequency": "per_month",
      "billing_period": "monthly",
      "monthly_equivalent_amount": null,
      "annual_billed_amount": null,
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

BILLING PERIOD EXAMPLES:
- "$12/mo billed monthly" → billing_period: "monthly", price_amount: 12, price_frequency: "per_month"
- "$10/mo billed annually" → billing_period: "yearly", monthly_equivalent_amount: 10, annual_billed_amount: 120, price_frequency: "per_month"
- "$120/year" → billing_period: "yearly", price_amount: 120, price_frequency: "per_year", monthly_equivalent_amount: 10

IMPORTANT:
- If you find BOTH monthly AND yearly prices for same plan, create SEPARATE entries for each
- If content has hidden sections (marked as HIDDEN CONTENT), check for alternate billing there
- Currency: $ = USD, € = EUR, £ = GBP
- If features are not visible, return empty array and add "features_not_visible" to warnings
- If pricing requires login/contact sales, add "pricing_gated" to warnings`

// extractWithLLM uses OpenAI to extract pricing from page content
func (s *PricingV2Service) extractWithLLM(ctx context.Context, content, rawHTML, sourceURL string) ([]model.ExtractedPlan, []string, error) {
	if s.openAIKey == "" {
		return nil, nil, fmt.Errorf("OpenAI API key not configured")
	}

	// Limit content size
	if len(content) > 20000 {
		content = content[:20000] + "\n...[truncated]"
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
		"max_tokens":  3000,
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

// extractHiddenContent extracts content from hidden elements
func (s *PricingV2Service) extractHiddenContent(htmlContent string) string {
	doc, err := html.Parse(strings.NewReader(htmlContent))
	if err != nil {
		return ""
	}

	var hiddenText strings.Builder
	var extractHidden func(*html.Node)

	extractHidden = func(n *html.Node) {
		if n.Type == html.ElementNode {
			// Skip script, style
			if n.Data == "script" || n.Data == "style" || n.Data == "noscript" {
				return
			}

			// Check for hidden attributes
			isHidden := false
			for _, attr := range n.Attr {
				if attr.Key == "aria-hidden" && attr.Val == "true" {
					isHidden = true
				}
				if attr.Key == "hidden" {
					isHidden = true
				}
				if attr.Key == "style" && (strings.Contains(attr.Val, "display:none") || strings.Contains(attr.Val, "display: none")) {
					isHidden = true
				}
				if attr.Key == "data-state" && (attr.Val == "inactive" || attr.Val == "hidden") {
					isHidden = true
				}
				// Check for tab panels that might be hidden
				if attr.Key == "role" && attr.Val == "tabpanel" {
					// Extract this content as it might be alternate billing
					isHidden = true
				}
			}

			if isHidden {
				// Extract text from this hidden element
				var extractText func(*html.Node)
				extractText = func(child *html.Node) {
					if child.Type == html.TextNode {
						text := strings.TrimSpace(child.Data)
						if text != "" {
							hiddenText.WriteString(text)
							hiddenText.WriteString(" ")
						}
					}
					for c := child.FirstChild; c != nil; c = c.NextSibling {
						extractText(c)
					}
				}
				extractText(n)
				return
			}
		}

		for c := n.FirstChild; c != nil; c = c.NextSibling {
			extractHidden(c)
		}
	}

	extractHidden(doc)
	return strings.TrimSpace(hiddenText.String())
}

// extractScriptJSON extracts JSON data from script tags
func (s *PricingV2Service) extractScriptJSON(htmlContent string) string {
	var jsonData strings.Builder

	// Pattern for __NEXT_DATA__
	nextDataRe := regexp.MustCompile(`<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)</script>`)
	if matches := nextDataRe.FindStringSubmatch(htmlContent); len(matches) > 1 {
		// Parse and extract relevant pricing data
		data := matches[1]
		if len(data) < 50000 { // Limit size
			jsonData.WriteString("NEXT_DATA: ")
			jsonData.WriteString(s.extractPricingFromJSON(data))
			jsonData.WriteString("\n")
		}
	}

	// Pattern for ld+json (structured data)
	ldJsonRe := regexp.MustCompile(`<script[^>]*type="application/ld\+json"[^>]*>([\s\S]*?)</script>`)
	ldMatches := ldJsonRe.FindAllStringSubmatch(htmlContent, -1)
	for _, match := range ldMatches {
		if len(match) > 1 && len(match[1]) < 10000 {
			jsonData.WriteString("LD+JSON: ")
			jsonData.WriteString(match[1])
			jsonData.WriteString("\n")
		}
	}

	// Pattern for __NUXT__
	nuxtRe := regexp.MustCompile(`window\.__NUXT__\s*=\s*(\{[\s\S]*?\});?\s*</script>`)
	if matches := nuxtRe.FindStringSubmatch(htmlContent); len(matches) > 1 {
		data := matches[1]
		if len(data) < 50000 {
			jsonData.WriteString("NUXT_DATA: ")
			jsonData.WriteString(s.extractPricingFromJSON(data))
			jsonData.WriteString("\n")
		}
	}

	return strings.TrimSpace(jsonData.String())
}

// extractPricingFromJSON tries to find pricing-related data in JSON
func (s *PricingV2Service) extractPricingFromJSON(jsonStr string) string {
	// Look for pricing-related keys
	pricingPatterns := []string{
		`"price"`, `"pricing"`, `"plans"`, `"subscription"`,
		`"monthly"`, `"yearly"`, `"annual"`, `"billing"`,
	}

	hasPricing := false
	for _, pattern := range pricingPatterns {
		if strings.Contains(strings.ToLower(jsonStr), strings.ToLower(pattern)) {
			hasPricing = true
			break
		}
	}

	if !hasPricing {
		return ""
	}

	// Return a truncated version
	if len(jsonStr) > 5000 {
		return jsonStr[:5000] + "...[truncated]"
	}
	return jsonStr
}

// detectBillingToggle checks if the page has a billing toggle
func (s *PricingV2Service) detectBillingToggle(visibleText, rawHTML string) bool {
	contentLower := strings.ToLower(visibleText + " " + rawHTML)

	// Check for toggle indicators
	toggleCount := 0
	for _, indicator := range toggleIndicators {
		if strings.Contains(contentLower, indicator) {
			toggleCount++
		}
	}

	// Check for tab/switch elements in HTML
	hasTabList := strings.Contains(rawHTML, `role="tablist"`) ||
		strings.Contains(rawHTML, `role="tab"`) ||
		strings.Contains(rawHTML, "toggle") ||
		strings.Contains(rawHTML, "switch")

	// Need multiple toggle indicators or tablist to confirm
	return toggleCount >= 2 || (toggleCount >= 1 && hasTabList)
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
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")

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

			// Skip hidden elements for visible text
			for _, attr := range n.Attr {
				if attr.Key == "aria-hidden" && attr.Val == "true" {
					return
				}
				if attr.Key == "hidden" {
					return
				}
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
