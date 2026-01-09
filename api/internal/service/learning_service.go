package service

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"rev-saas-api/internal/model"
	mongorepo "rev-saas-api/internal/repository/mongo"
)

// LearningService handles cross-decision learning and historical insights
type LearningService struct {
	learningRepo *mongorepo.LearningRepository
}

// NewLearningService creates a new learning service
func NewLearningService(learningRepo *mongorepo.LearningRepository) *LearningService {
	return &LearningService{
		learningRepo: learningRepo,
	}
}

// RefreshInsights aggregates all outcome data and updates learning insights
func (s *LearningService) RefreshInsights(ctx context.Context) error {
	log.Println("[learning] Starting insight refresh...")

	aggregates, err := s.learningRepo.AggregateOutcomes(ctx)
	if err != nil {
		return fmt.Errorf("failed to aggregate outcomes: %w", err)
	}

	log.Printf("[learning] Found %d aggregate cohorts", len(aggregates))

	now := time.Now()
	for _, agg := range aggregates {
		if agg.Count < 1 {
			continue
		}

		successRate := float64(agg.AchievedCount) / float64(agg.Count)
		missRate := float64(agg.MissedCount) / float64(agg.Count)
		avgDelta := agg.TotalDelta / float64(agg.Count)

		// Determine confidence based on sample size
		confidence := "low"
		if agg.Count >= 5 && agg.Count < 15 {
			confidence = "medium"
		} else if agg.Count >= 15 {
			confidence = "high"
		}

		insight := &model.LearningInsight{
			CompanyStage:    agg.Key.CompanyStage,
			PrimaryKPI:      agg.Key.PrimaryKPI,
			ScenarioType:    agg.Key.ScenarioType,
			SampleSize:      agg.Count,
			SuccessRate:     successRate,
			AverageDelta:    avgDelta,
			MissRate:        missRate,
			Confidence:      confidence,
			NewestOutcomeAt: now,
		}

		if err := s.learningRepo.UpsertInsight(ctx, insight); err != nil {
			log.Printf("[learning] Warning: failed to upsert insight for %s/%s/%s: %v",
				agg.Key.CompanyStage, agg.Key.PrimaryKPI, agg.Key.ScenarioType, err)
		}
	}

	log.Println("[learning] Insight refresh complete")
	return nil
}

// GetLearningContext retrieves learning signals for a new verdict
func (s *LearningService) GetLearningContext(ctx context.Context, companyStage, primaryKPI string) (*model.VerdictLearningContext, error) {
	insights, err := s.learningRepo.GetRelatedInsights(ctx, companyStage, primaryKPI)
	if err != nil {
		return nil, fmt.Errorf("failed to get related insights: %w", err)
	}

	if len(insights) == 0 {
		return nil, nil // No historical data yet
	}

	learningCtx := &model.VerdictLearningContext{
		HistoricalSignals: make([]model.HistoricalSignal, 0),
	}

	totalConfidenceBoost := 0.0
	summaryParts := []string{}

	for _, insight := range insights {
		// Calculate relevance based on matching fields
		relevance := s.calculateRelevance(insight, companyStage, primaryKPI)
		matchingFields := s.getMatchingFields(insight, companyStage, primaryKPI)

		// Build description
		description := s.buildSignalDescription(insight)

		signal := model.HistoricalSignal{
			Description:    description,
			SampleSize:     insight.SampleSize,
			SuccessRate:    insight.SuccessRate,
			AverageDelta:   insight.AverageDelta,
			Relevance:      relevance,
			MatchingFields: matchingFields,
		}

		learningCtx.HistoricalSignals = append(learningCtx.HistoricalSignals, signal)

		// Calculate confidence boost (weighted by relevance and sample size)
		boostWeight := 0.0
		switch relevance {
		case "high":
			boostWeight = 0.15
		case "medium":
			boostWeight = 0.08
		case "low":
			boostWeight = 0.03
		}
		if insight.SampleSize >= 10 {
			boostWeight *= 1.5
		}
		totalConfidenceBoost += boostWeight

		// Add to summary
		if insight.SuccessRate >= 0.7 && insight.SampleSize >= 5 {
			summaryParts = append(summaryParts, fmt.Sprintf(
				"%.0f%% success with %s path (n=%d)",
				insight.SuccessRate*100,
				insight.ScenarioType,
				insight.SampleSize,
			))
		}
	}

	// Cap confidence boost at 25%
	if totalConfidenceBoost > 0.25 {
		totalConfidenceBoost = 0.25
	}
	learningCtx.ConfidenceBoost = totalConfidenceBoost

	// Build summary
	if len(summaryParts) > 0 {
		learningCtx.LearningSummary = "Historical patterns: " + strings.Join(summaryParts, "; ")
	}

	return learningCtx, nil
}

// GetLearningIndicators returns learning indicators for frontend display
func (s *LearningService) GetLearningIndicators(ctx context.Context, companyStage, primaryKPI string) (*model.LearningResponse, error) {
	learningCtx, err := s.GetLearningContext(ctx, companyStage, primaryKPI)
	if err != nil {
		return nil, err
	}

	if learningCtx == nil || len(learningCtx.HistoricalSignals) == 0 {
		return &model.LearningResponse{
			Indicators:      []model.LearningIndicator{},
			ConfidenceBoost: 0,
		}, nil
	}

	indicators := make([]model.LearningIndicator, 0)

	// Add confidence boost indicator if significant
	if learningCtx.ConfidenceBoost >= 0.05 {
		indicators = append(indicators, model.LearningIndicator{
			Type:        "confidence_boost",
			Title:       "Confidence boosted by past outcomes",
			Description: fmt.Sprintf("+%.0f%% confidence from historical patterns", learningCtx.ConfidenceBoost*100),
			Relevance:   "high",
		})
	}

	// Add historical success indicators
	for _, signal := range learningCtx.HistoricalSignals {
		if signal.SuccessRate >= 0.65 && signal.SampleSize >= 5 && signal.Relevance != "low" {
			indicators = append(indicators, model.LearningIndicator{
				Type:        "historical_success",
				Title:       "Historically successful in similar cases",
				Description: signal.Description,
				SampleSize:  signal.SampleSize,
				Relevance:   signal.Relevance,
			})
		}
	}

	// Limit to top 3 indicators
	if len(indicators) > 3 {
		indicators = indicators[:3]
	}

	return &model.LearningResponse{
		Indicators:      indicators,
		ConfidenceBoost: learningCtx.ConfidenceBoost,
		Summary:         learningCtx.LearningSummary,
	}, nil
}

// BuildAIPromptInjection generates text to inject into the AI prompt for verdict generation
func (s *LearningService) BuildAIPromptInjection(ctx context.Context, companyStage, primaryKPI string) string {
	learningCtx, err := s.GetLearningContext(ctx, companyStage, primaryKPI)
	if err != nil || learningCtx == nil || len(learningCtx.HistoricalSignals) == 0 {
		return ""
	}

	var parts []string
	parts = append(parts, "\n\nHISTORICAL CONTEXT (use to inform your recommendation):")

	for _, signal := range learningCtx.HistoricalSignals {
		if signal.SampleSize >= 3 && signal.Relevance != "low" {
			parts = append(parts, fmt.Sprintf("- %s", signal.Description))
		}
	}

	if learningCtx.LearningSummary != "" {
		parts = append(parts, fmt.Sprintf("\nSummary: %s", learningCtx.LearningSummary))
	}

	parts = append(parts, "\nUse these historical patterns to adjust confidence levels and recommendations.")

	return strings.Join(parts, "\n")
}

// calculateRelevance determines how relevant an insight is to the current context
func (s *LearningService) calculateRelevance(insight model.LearningInsight, companyStage, primaryKPI string) string {
	matchCount := 0
	if insight.CompanyStage == companyStage && companyStage != "" {
		matchCount++
	}
	if insight.PrimaryKPI == primaryKPI && primaryKPI != "" {
		matchCount++
	}

	if matchCount == 2 {
		return "high"
	} else if matchCount == 1 {
		return "medium"
	}
	return "low"
}

// getMatchingFields returns which fields match the current context
func (s *LearningService) getMatchingFields(insight model.LearningInsight, companyStage, primaryKPI string) []string {
	fields := make([]string, 0)
	if insight.CompanyStage == companyStage && companyStage != "" {
		fields = append(fields, "company_stage")
	}
	if insight.PrimaryKPI == primaryKPI && primaryKPI != "" {
		fields = append(fields, "primary_kpi")
	}
	return fields
}

// buildSignalDescription creates a human-readable description for a learning signal
func (s *LearningService) buildSignalDescription(insight model.LearningInsight) string {
	scenarioLabel := strings.Replace(insight.ScenarioType, "_", " ", -1)
	scenarioLabel = strings.Title(scenarioLabel)

	return fmt.Sprintf(
		"In similar past decisions, the %s scenario succeeded %.0f%% of the time (n=%d)",
		scenarioLabel,
		insight.SuccessRate*100,
		insight.SampleSize,
	)
}

