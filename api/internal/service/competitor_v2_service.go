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

	"github.com/chromedp/chromedp"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"rev-saas-api/internal/model"
	mongorepo "rev-saas-api/internal/repository/mongo"
)

// CompetitorV2Service handles competitor discovery and management
type CompetitorV2Service struct {
	repo      *mongorepo.CompetitorV2Repository
	userRepo  *mongorepo.UserRepository
	openAIKey string
}

// NewCompetitorV2Service creates a new CompetitorV2Service
func NewCompetitorV2Service(
	repo *mongorepo.CompetitorV2Repository,
	userRepo *mongorepo.UserRepository,
	openAIKey string,
	limitsService *LimitsService,
) *CompetitorV2Service {
	return &CompetitorV2Service{
		repo:      repo,
		userRepo:  userRepo,
		openAIKey: openAIKey,
	}
}

// DiscoverCompetitors uses AI to find competitors for a website
func (s *CompetitorV2Service) DiscoverCompetitors(ctx context.Context, websiteURL string) (*model.CompetitorDiscoveryResponse, error) {
	// Clean the URL
	websiteURL = strings.TrimSpace(websiteURL)
	if websiteURL == "" {
		return nil, fmt.Errorf("website URL is required")
	}

	// Remove protocol if present for cleaner prompts
	cleanURL := strings.TrimPrefix(strings.TrimPrefix(websiteURL, "https://"), "http://")
	cleanURL = strings.TrimSuffix(cleanURL, "/")

	// Call OpenAI to discover competitors
	competitors, err := s.callOpenAIForCompetitors(ctx, cleanURL)
	if err != nil {
		return nil, fmt.Errorf("failed to discover competitors: %w", err)
	}

	return &model.CompetitorDiscoveryResponse{
		Competitors: competitors,
		Source:      "ai",
	}, nil
}

// callOpenAIForCompetitors calls OpenAI API to discover competitors
func (s *CompetitorV2Service) callOpenAIForCompetitors(ctx context.Context, websiteURL string) ([]model.DiscoveredCompetitor, error) {
	if s.openAIKey == "" {
		return nil, fmt.Errorf("OpenAI API key not configured")
	}

	prompt := fmt.Sprintf(`Analyze the website "%s" and identify its top 5-7 direct competitors.

For each competitor, provide:
1. Company/Product name
2. Their main domain (e.g., competitor.com)
3. Why they are a competitor (1-2 sentences)
4. Confidence score (0.0 to 1.0) based on how directly they compete

Respond ONLY with a JSON array in this exact format, no other text:
[
  {
    "name": "Competitor Name",
    "domain": "competitor.com",
    "why": "Brief explanation of why they compete",
    "confidence": 0.85
  }
]

Focus on direct competitors in the same market segment. Order by confidence score (highest first).`, websiteURL)

	response, err := s.callOpenAI(ctx, prompt)
	if err != nil {
		return nil, err
	}

	// Parse the JSON response
	var competitors []model.DiscoveredCompetitor

	// Clean the response - sometimes OpenAI wraps it in markdown
	cleanResponse := strings.TrimSpace(response)
	cleanResponse = strings.TrimPrefix(cleanResponse, "```json")
	cleanResponse = strings.TrimPrefix(cleanResponse, "```")
	cleanResponse = strings.TrimSuffix(cleanResponse, "```")
	cleanResponse = strings.TrimSpace(cleanResponse)

	if err := json.Unmarshal([]byte(cleanResponse), &competitors); err != nil {
		log.Printf("[competitor-v2] Failed to parse OpenAI response: %v, response: %s", err, response)
		return nil, fmt.Errorf("failed to parse competitor data")
	}

	return competitors, nil
}

// callOpenAI makes the API call to OpenAI
func (s *CompetitorV2Service) callOpenAI(ctx context.Context, prompt string) (string, error) {
	reqBody := map[string]interface{}{
		"model": "gpt-4o-mini",
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
		"temperature": 0.3,
		"max_tokens":  1000,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.openAIKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
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
		return "", err
	}

	if apiResp.Error.Message != "" {
		return "", fmt.Errorf("OpenAI error: %s", apiResp.Error.Message)
	}

	if len(apiResp.Choices) == 0 {
		return "", fmt.Errorf("no response from OpenAI")
	}

	return apiResp.Choices[0].Message.Content, nil
}

// SaveCompetitors saves discovered competitors for a user
func (s *CompetitorV2Service) SaveCompetitors(ctx context.Context, userID string, competitors []model.DiscoveredCompetitor) ([]model.SavedCompetitor, error) {
	log.Printf("[competitor-v2] SaveCompetitors called with %d competitors for user %s", len(competitors), userID)
	
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	// Get user to check plan limits
	user, err := s.userRepo.GetByIDString(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Get current count
	currentCount, err := s.repo.CountByUserID(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("failed to count competitors: %w", err)
	}

	// Get limit based on plan (use GetEffectivePlan to consider role)
	effectivePlan := user.GetEffectivePlan()
	planLimits := GetPlanLimits(effectivePlan)
	limit := planLimits.MaxCompetitors

	log.Printf("[competitor-v2] User role: %s, effective plan: %s, unlimited: %v, limit: %d, current: %d, trying to add: %d",
		user.Role, effectivePlan, planLimits.IsUnlimited, limit, currentCount, len(competitors))

	// Skip limit check for unlimited plans (admin/investor)
	if !planLimits.IsUnlimited {
		// Check if adding these would exceed limit
		if int(currentCount)+len(competitors) > limit {
			remaining := limit - int(currentCount)
			if remaining <= 0 {
				return nil, fmt.Errorf("competitor limit reached (%d/%d). Upgrade your plan to add more", currentCount, limit)
			}
			return nil, fmt.Errorf("can only add %d more competitors (%d/%d). Upgrade your plan for more", remaining, currentCount, limit)
		}
	}

	var saved []model.SavedCompetitor

	for i, comp := range competitors {
		log.Printf("[competitor-v2] Saving competitor %d: %s (%s)", i+1, comp.Name, comp.Domain)
		
		savedComp := &model.SavedCompetitor{
			UserID:     uid,
			Name:       comp.Name,
			Domain:     comp.Domain,
			Why:        comp.Why,
			Confidence: comp.Confidence,
		}

		if err := s.repo.Create(ctx, savedComp); err != nil {
			log.Printf("[competitor-v2] Failed to save competitor %s: %v", comp.Name, err)
			continue
		}

		log.Printf("[competitor-v2] Successfully saved competitor %s with ID %s", comp.Name, savedComp.ID.Hex())
		saved = append(saved, *savedComp)
	}

	log.Printf("[competitor-v2] Total saved: %d out of %d", len(saved), len(competitors))
	return saved, nil
}

// GetSavedCompetitors returns all saved competitors for a user
func (s *CompetitorV2Service) GetSavedCompetitors(ctx context.Context, userID string) (*model.SavedCompetitorsResponse, error) {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	// Get user to check plan limits
	user, err := s.userRepo.GetByIDString(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	competitors, err := s.repo.FindByUserID(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("failed to get competitors: %w", err)
	}

	// Get limit based on plan (use GetEffectivePlan to consider role)
	effectivePlan := user.GetEffectivePlan()
	planLimits := GetPlanLimits(effectivePlan)
	limit := planLimits.MaxCompetitors

	// For unlimited plans, show 0 as limit (frontend interprets as unlimited)
	if planLimits.IsUnlimited {
		limit = 0
	}

	return &model.SavedCompetitorsResponse{
		Competitors: competitors,
		Count:       len(competitors),
		Limit:       limit,
	}, nil
}

// DeleteCompetitor removes a saved competitor
func (s *CompetitorV2Service) DeleteCompetitor(ctx context.Context, userID string, competitorID string) error {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	cid, err := primitive.ObjectIDFromHex(competitorID)
	if err != nil {
		return fmt.Errorf("invalid competitor ID: %w", err)
	}

	return s.repo.Delete(ctx, cid, uid)
}

// ExtractPricing extracts pricing data from a competitor's website
func (s *CompetitorV2Service) ExtractPricing(ctx context.Context, userID string, competitorID string) (*model.CompetitorPricing, error) {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	cid, err := primitive.ObjectIDFromHex(competitorID)
	if err != nil {
		return nil, fmt.Errorf("invalid competitor ID: %w", err)
	}

	// Get the competitor
	competitor, err := s.repo.FindByID(ctx, cid)
	if err != nil || competitor == nil {
		return nil, fmt.Errorf("competitor not found")
	}

	if competitor.UserID != uid {
		return nil, fmt.Errorf("unauthorized")
	}

	// Build pricing URL
	pricingURL := fmt.Sprintf("https://%s/pricing", competitor.Domain)
	log.Printf("[competitor-v2] Extracting pricing from: %s", pricingURL)

	// Extract pricing using chromedp
	pricing, err := s.extractPricingFromURL(ctx, pricingURL)
	if err != nil {
		return nil, fmt.Errorf("failed to extract pricing: %w", err)
	}

	// Save pricing to database
	if err := s.repo.UpdatePricing(ctx, cid, uid, pricing); err != nil {
		return nil, fmt.Errorf("failed to save pricing: %w", err)
	}

	return pricing, nil
}

// extractPricingFromURL uses chromedp to extract pricing from a URL
func (s *CompetitorV2Service) extractPricingFromURL(ctx context.Context, url string) (*model.CompetitorPricing, error) {
	// Create chromedp context
	allocCtx, allocCancel := chromedp.NewExecAllocator(ctx,
		append(chromedp.DefaultExecAllocatorOptions[:],
			chromedp.Flag("headless", true),
			chromedp.Flag("disable-gpu", true),
			chromedp.Flag("no-sandbox", true),
		)...,
	)
	defer allocCancel()

	chromeCtx, chromeCancel := chromedp.NewContext(allocCtx)
	defer chromeCancel()

	// Set timeout
	chromeCtx, cancel := context.WithTimeout(chromeCtx, 30*time.Second)
	defer cancel()

	var htmlContent string
	var nextDataContent string

	// Navigate and extract content
	err := chromedp.Run(chromeCtx,
		chromedp.Navigate(url),
		chromedp.Sleep(5*time.Second), // Wait for dynamic content
		chromedp.OuterHTML("html", &htmlContent),
		chromedp.Evaluate(`
			(function() {
				var el = document.getElementById('__NEXT_DATA__');
				return el ? el.textContent : '';
			})()
		`, &nextDataContent),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load page: %w", err)
	}

	var plans []model.CompetitorV2Plan
	extractionMethod := "html"

	// Try to parse __NEXT_DATA__ first (for Next.js sites like Notion, Motion)
	if nextDataContent != "" {
		log.Printf("[competitor-v2] Found __NEXT_DATA__, attempting to parse")
		parsedPlans := s.parseNextDataForPlans(nextDataContent)
		if len(parsedPlans) > 0 {
			plans = parsedPlans
			extractionMethod = "next_data"
			log.Printf("[competitor-v2] Extracted %d plans from __NEXT_DATA__", len(plans))
		}
	}

	// Fallback to HTML parsing
	if len(plans) == 0 {
		log.Printf("[competitor-v2] Falling back to HTML parsing")
		plans = s.extractPlansFromHTML(htmlContent)
		extractionMethod = "html"
	}

	// Try to extract features from DOM if not found in __NEXT_DATA__
	if len(plans) > 0 {
		for i := range plans {
			if len(plans[i].Features) == 0 {
				features := s.extractFeaturesFromHTML(htmlContent, plans[i].Name)
				if len(features) > 0 {
					plans[i].Features = features
				}
			}
		}
	}

	return &model.CompetitorPricing{
		Plans:            plans,
		ExtractedAt:      time.Now(),
		ExtractionMethod: extractionMethod,
		Verified:         false,
	}, nil
}

// parseNextDataForPlans parses Next.js __NEXT_DATA__ for pricing info
func (s *CompetitorV2Service) parseNextDataForPlans(jsonContent string) []model.CompetitorV2Plan {
	var plans []model.CompetitorV2Plan

	var data map[string]interface{}
	if err := json.Unmarshal([]byte(jsonContent), &data); err != nil {
		return plans
	}

	// Try different paths in __NEXT_DATA__
	// Path 1: props.pageProps.plans (Notion style)
	if props, ok := data["props"].(map[string]interface{}); ok {
		if pageProps, ok := props["pageProps"].(map[string]interface{}); ok {
			// Notion style: plans array
			if plansData, ok := pageProps["plans"].([]interface{}); ok {
				for _, p := range plansData {
					if planMap, ok := p.(map[string]interface{}); ok {
						plan := s.parsePlanFromMap(planMap)
						if plan.Name != "" {
							plans = append(plans, plan)
						}
					}
				}
			}
			// Motion style: tiers array
			if tiers, ok := pageProps["tiers"].([]interface{}); ok {
				for _, t := range tiers {
					if tierMap, ok := t.(map[string]interface{}); ok {
						plan := s.parsePlanFromMap(tierMap)
						if plan.Name != "" {
							plans = append(plans, plan)
						}
					}
				}
			}
		}
	}

	// Path 2: Direct tiers at root (some sites)
	if tiers, ok := data["tiers"].([]interface{}); ok {
		for _, t := range tiers {
			if tierMap, ok := t.(map[string]interface{}); ok {
				plan := s.parsePlanFromMap(tierMap)
				if plan.Name != "" {
					plans = append(plans, plan)
				}
			}
		}
	}

	return plans
}

// parsePlanFromMap extracts plan data from a map
func (s *CompetitorV2Service) parsePlanFromMap(planMap map[string]interface{}) model.CompetitorV2Plan {
	plan := model.CompetitorV2Plan{
		Currency: "USD",
	}

	// Name
	if name, ok := planMap["name"].(string); ok {
		plan.Name = name
	} else if name, ok := planMap["title"].(string); ok {
		plan.Name = name
	} else if name, ok := planMap["tier"].(string); ok {
		plan.Name = name
	}

	// Monthly price (check various field names)
	priceFields := []string{"priceMonthly", "price_monthly", "monthlyPrice", "monthly_price", "price"}
	for _, field := range priceFields {
		if price := s.extractPrice(planMap, field); price > 0 {
			// Check if price is in cents
			if price > 100 {
				price = price / 100
			}
			plan.PriceMonthly = price
			break
		}
	}

	// Yearly price
	yearlyFields := []string{"priceYearly", "price_yearly", "yearlyPrice", "yearly_price", "annualPrice"}
	for _, field := range yearlyFields {
		if price := s.extractPrice(planMap, field); price > 0 {
			if price > 100 {
				price = price / 100
			}
			plan.PriceYearly = price
			break
		}
	}

	// Features
	if features, ok := planMap["features"].([]interface{}); ok {
		for _, f := range features {
			if str, ok := f.(string); ok {
				plan.Features = append(plan.Features, str)
			} else if fMap, ok := f.(map[string]interface{}); ok {
				if text, ok := fMap["text"].(string); ok {
					plan.Features = append(plan.Features, text)
				} else if name, ok := fMap["name"].(string); ok {
					plan.Features = append(plan.Features, name)
				}
			}
		}
	}

	return plan
}

// extractPrice extracts a price value from a map
func (s *CompetitorV2Service) extractPrice(m map[string]interface{}, key string) float64 {
	if val, ok := m[key]; ok {
		switch v := val.(type) {
		case float64:
			return v
		case int:
			return float64(v)
		case int64:
			return float64(v)
		case string:
			// Try to parse price from string like "$12" or "12.99"
			re := regexp.MustCompile(`[\d.]+`)
			if match := re.FindString(v); match != "" {
				var price float64
				fmt.Sscanf(match, "%f", &price)
				return price
			}
		}
	}
	return 0
}

// extractPlansFromHTML extracts pricing plans from raw HTML
func (s *CompetitorV2Service) extractPlansFromHTML(html string) []model.CompetitorV2Plan {
	var plans []model.CompetitorV2Plan

	// Common plan name patterns
	planNames := []string{"Free", "Starter", "Basic", "Pro", "Professional", "Plus", "Premium", "Business", "Team", "Enterprise", "Individual"}
	
	// Price pattern: $X, $X.XX, $X/mo, etc.
	pricePattern := regexp.MustCompile(`\$(\d+(?:\.\d{2})?)\s*(?:/\s*(?:mo|month|user|seat))?`)

	for _, name := range planNames {
		// Check if plan name exists in HTML
		if strings.Contains(html, name) {
			// Try to find price near the plan name
			idx := strings.Index(html, name)
			if idx >= 0 {
				// Look for price within 500 chars after plan name
				searchArea := html[idx:min(idx+500, len(html))]
				if matches := pricePattern.FindStringSubmatch(searchArea); len(matches) > 1 {
					var price float64
					fmt.Sscanf(matches[1], "%f", &price)
					if price > 0 {
						plans = append(plans, model.CompetitorV2Plan{
							Name:         name,
							PriceMonthly: price,
							Currency:     "USD",
						})
					}
				}
			}
		}
	}

	return plans
}

// extractFeaturesFromHTML tries to extract features for a specific plan from HTML
func (s *CompetitorV2Service) extractFeaturesFromHTML(html string, planName string) []string {
	var features []string

	// Look for features in list items after plan name
	planIdx := strings.Index(strings.ToLower(html), strings.ToLower(planName))
	if planIdx < 0 {
		return features
	}

	// Get a section after the plan name
	searchArea := html[planIdx:min(planIdx+3000, len(html))]

	// Extract list items
	liPattern := regexp.MustCompile(`<li[^>]*>([^<]+)</li>`)
	matches := liPattern.FindAllStringSubmatch(searchArea, 20)

	for _, match := range matches {
		if len(match) > 1 {
			feature := strings.TrimSpace(match[1])
			if len(feature) > 3 && len(feature) < 100 {
				features = append(features, feature)
			}
		}
	}

	return features
}

// UpdatePricing updates pricing data for a competitor
func (s *CompetitorV2Service) UpdatePricing(ctx context.Context, userID string, competitorID string, plans []model.CompetitorV2Plan) error {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	cid, err := primitive.ObjectIDFromHex(competitorID)
	if err != nil {
		return fmt.Errorf("invalid competitor ID: %w", err)
	}

	pricing := &model.CompetitorPricing{
		Plans:            plans,
		ExtractedAt:      time.Now(),
		ExtractionMethod: "manual",
		Verified:         true, // Manual updates are considered verified
	}

	return s.repo.UpdatePricing(ctx, cid, uid, pricing)
}

// VerifyPricing marks pricing as verified
func (s *CompetitorV2Service) VerifyPricing(ctx context.Context, userID string, competitorID string) error {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	cid, err := primitive.ObjectIDFromHex(competitorID)
	if err != nil {
		return fmt.Errorf("invalid competitor ID: %w", err)
	}

	return s.repo.UpdatePricingVerification(ctx, cid, uid, true)
}
