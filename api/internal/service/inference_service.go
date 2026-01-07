package service

import (
	"context"
	"strings"
	"time"

	"rev-saas-api/internal/model"
)

// InferenceService handles website scraping and AI inference
type InferenceService struct {
	// TODO: Add dependencies (HTTP client, AI client, etc.)
}

// NewInferenceService creates a new inference service
func NewInferenceService() *InferenceService {
	return &InferenceService{}
}

// InferContextFromWebsite scrapes the website and infers context
// TODO: Implement actual website scraping and AI inference
func (s *InferenceService) InferContextFromWebsite(ctx context.Context, websiteURL string) (*InferenceResult, *model.InferenceArtifacts, error) {
	// STUB: Return empty results for now
	// In production, this would:
	// 1. Scrape the website (pricing page, about page, etc.)
	// 2. Send content to AI for analysis
	// 3. Parse AI response into structured fields

	now := time.Now()
	artifacts := &model.InferenceArtifacts{
		ScrapedAt:        &now,
		PricingPageFound: false, // TODO: Actually detect
		SignalsDetected:  []model.InferenceSignal{},
	}

	// TODO: Replace with actual inference
	// Example of what this might return:
	// result := &InferenceResult{
	//     BusinessModel: &InferredField{
	//         Value:      "saas",
	//         Confidence: 0.92,
	//         Signal:     "monthly_billing_detected",
	//     },
	//     MarketType: &InferredField{
	//         Value:      "b2b",
	//         Confidence: 0.88,
	//         Signal:     "enterprise_tier_present",
	//     },
	// }

	return &InferenceResult{}, artifacts, nil
}

// GenerateVerdict generates an AI verdict based on context
// TODO: Implement actual AI verdict generation
func (s *InferenceService) GenerateVerdict(ctx context.Context, websiteURL string, resolvedContext model.DecisionContextV2) (*model.VerdictV2, *model.ModelMetaV2, error) {
	// STUB: Return placeholder verdict
	// In production, this would call the AI service

	verdict := &model.VerdictV2{
		Headline:        "Analysis pending implementation",
		Summary:         "AI verdict generation not yet implemented. This is a placeholder.",
		ConfidenceScore: 0.5,
		ConfidenceLabel: model.ConfidenceLabelFromScore(0.5),
		CTA:             "Complete AI integration to receive actionable recommendations.",
		WhyThisDecision: []string{
			"Placeholder reason 1",
			"Placeholder reason 2",
		},
		WhatToExpect: model.WhatToExpectV2{
			RiskScore:   0.5,
			RiskLabel:   model.RiskLabelFromScore(0.5),
			Description: "Risk assessment pending AI integration.",
		},
		SupportingDetails: model.SupportingDetailsV2{
			ExpectedRevenueImpact: "To be determined",
			ChurnOutlook:          "To be determined",
			MarketPositioning:     "To be determined",
		},
	}

	meta := &model.ModelMetaV2{
		ModelName:           "stub",
		PromptVersion:       "0.0",
		InferenceDurationMs: 0,
		WebsiteContentHash:  "", // TODO: Hash scraped content
	}

	return verdict, meta, nil
}

// ExtractCompanyName extracts company name from URL
func (s *InferenceService) ExtractCompanyName(websiteURL string) string {
	url := websiteURL

	// Remove protocol
	url = strings.TrimPrefix(url, "https://")
	url = strings.TrimPrefix(url, "http://")
	url = strings.TrimPrefix(url, "www.")

	// Get domain part before path
	if idx := strings.Index(url, "/"); idx != -1 {
		url = url[:idx]
	}
	if idx := strings.Index(url, "?"); idx != -1 {
		url = url[:idx]
	}

	// Get first part before TLD
	parts := strings.Split(url, ".")
	if len(parts) > 0 {
		name := parts[0]
		if len(name) > 0 {
			// Capitalize first letter
			return strings.ToUpper(name[:1]) + name[1:]
		}
	}

	return "Unknown"
}
