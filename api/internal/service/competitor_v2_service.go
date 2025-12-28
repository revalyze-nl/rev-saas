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

	// Get limit based on plan
	planLimits := GetPlanLimits(user.Plan)
	limit := planLimits.MaxCompetitors
	
	log.Printf("[competitor-v2] User plan: %s, limit: %d, current: %d, trying to add: %d", user.Plan, limit, currentCount, len(competitors))

	// Check if adding these would exceed limit
	if int(currentCount)+len(competitors) > limit {
		remaining := limit - int(currentCount)
		if remaining <= 0 {
			return nil, fmt.Errorf("competitor limit reached (%d/%d). Upgrade your plan to add more", currentCount, limit)
		}
		return nil, fmt.Errorf("can only add %d more competitors (%d/%d). Upgrade your plan for more", remaining, currentCount, limit)
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

	// Get limit based on plan
	planLimits := GetPlanLimits(user.Plan)
	limit := planLimits.MaxCompetitors

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
