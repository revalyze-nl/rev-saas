package service

import (
	"context"
	"strings"
	"time"

	"rev-saas-api/internal/model"
)

// InferenceService handles website scraping and AI inference
type InferenceService struct {
	verdictService *VerdictService
}

// NewInferenceService creates a new inference service
func NewInferenceService(verdictService *VerdictService) *InferenceService {
	return &InferenceService{
		verdictService: verdictService,
	}
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

// GenerateVerdict generates an AI verdict based on context using OpenAI
func (s *InferenceService) GenerateVerdict(ctx context.Context, websiteURL string, resolvedContext model.DecisionContextV2) (*model.VerdictV2, *model.ModelMetaV2, error) {
	startTime := time.Now()

	// Use VerdictService to generate verdict via OpenAI
	v1Response, err := s.verdictService.GenerateVerdict(ctx, websiteURL)
	if err != nil {
		return nil, nil, err
	}

	// Convert V1 VerdictResponse to V2 VerdictV2 format
	confidenceScore := mapConfidenceToScore(v1Response.Confidence)
	riskScore := mapRiskToScore(v1Response.WhatToExpect.RiskLevel)

	// Map risk analysis - prefer premium riskAnalysis, fallback to whatToExpect
	var riskAnalysis *model.RiskAnalysisV2
	if v1Response.RiskAnalysis != nil {
		riskAnalysis = &model.RiskAnalysisV2{
			RiskLevel:      v1Response.RiskAnalysis.RiskLevel,
			WhoIsAffected:  v1Response.RiskAnalysis.WhoIsAffected,
			HowItManifests: v1Response.RiskAnalysis.HowItManifests,
			WhyAcceptable:  v1Response.RiskAnalysis.WhyAcceptable,
		}
	}

	verdict := &model.VerdictV2{
		Headline:        v1Response.Headline,
		Summary:         v1Response.Summary,
		ConfidenceScore: confidenceScore,
		ConfidenceLabel: model.ConfidenceLabelFromScore(confidenceScore),
		CTA:             v1Response.CTA,
		WhyThisDecision: v1Response.WhyThisDecision,
		WhatToExpect: model.WhatToExpectV2{
			RiskScore:   riskScore,
			RiskLabel:   model.RiskLabelFromScore(riskScore),
			Description: v1Response.WhatToExpect.Description,
		},
		SupportingDetails: model.SupportingDetailsV2{
			ExpectedRevenueImpact: v1Response.SupportingDetails.ExpectedRevenueImpact,
			ChurnOutlook:          v1Response.SupportingDetails.ChurnOutlook,
			MarketPositioning:     v1Response.SupportingDetails.MarketPositioning,
		},
		// Premium V2 fields
		DecisionSnapshot:       mapDecisionSnapshot(v1Response.DecisionSnapshot),
		PersonalizationSignals: mapPersonalizationSignals(v1Response.PersonalizationSignals),
		ExecutiveVerdict:       mapExecutiveVerdict(v1Response.ExecutiveVerdict),
		IfYouProceed:           mapIfYouProceed(v1Response.IfYouProceed),
		IfYouDoNotAct:          mapIfYouDoNotAct(v1Response.IfYouDoNotAct),
		AlternativesConsidered: mapAlternatives(v1Response.AlternativesConsidered),
		RiskAnalysis:           riskAnalysis,
		WhyThisFits:            mapWhyThisFits(v1Response.WhyThisFits),
		ExecutionChecklist:     mapExecutionChecklist(v1Response.ExecutionChecklist),
		ExecutionNote:          v1Response.ExecutionNote,
	}

	meta := &model.ModelMetaV2{
		ModelName:           "gpt-4o-mini",
		PromptVersion:       "2.0-premium",
		InferenceDurationMs: time.Since(startTime).Milliseconds(),
	}

	return verdict, meta, nil
}

// Helper functions to map premium V1 fields to V2
func mapDecisionSnapshot(ds *model.DecisionSnapshot) *model.DecisionSnapshotV2 {
	if ds == nil {
		return nil
	}
	return &model.DecisionSnapshotV2{
		RevenueImpactRange: ds.RevenueImpactRange,
		PrimaryRiskLevel:   ds.PrimaryRiskLevel,
		PrimaryRiskExplain: ds.PrimaryRiskExplain,
		TimeToImpact:       ds.TimeToImpact,
		ExecutionEffort:    ds.ExecutionEffort,
		Reversibility:      ds.Reversibility,
	}
}

func mapPersonalizationSignals(ps *model.PersonalizationSignals) *model.PersonalizationSignalsV2 {
	if ps == nil {
		return nil
	}
	return &model.PersonalizationSignalsV2{
		PricingPageInsight:    ps.PricingPageInsight,
		CompanyStageInsight:   ps.CompanyStageInsight,
		CompetitorInsight:     ps.CompetitorInsight,
		KPIInsight:            ps.KPIInsight,
		MarketPositionInsight: ps.MarketPositionInsight,
	}
}

func mapExecutionChecklist(ec *model.ExecutionChecklist) *model.ExecutionChecklistV2 {
	if ec == nil {
		return nil
	}
	return &model.ExecutionChecklistV2{
		Next14Days:     ec.Next14Days,
		Next30To60Days: ec.Next30To60Days,
		SuccessMetrics: ec.SuccessMetrics,
	}
}

func mapExecutiveVerdict(ev *model.ExecutiveVerdict) *model.ExecutiveVerdictV2 {
	if ev == nil {
		return nil
	}
	return &model.ExecutiveVerdictV2{
		Recommendation: ev.Recommendation,
		DecisionType:   ev.DecisionType,
		TimeHorizon:    ev.TimeHorizon,
		ScopeOfImpact:  ev.ScopeOfImpact,
	}
}

func mapIfYouProceed(p *model.IfYouProceed) *model.IfYouProceedV2 {
	if p == nil {
		return nil
	}
	return &model.IfYouProceedV2{
		ExpectedUpside:   p.ExpectedUpside,
		SecondaryEffects: p.SecondaryEffects,
	}
}

func mapIfYouDoNotAct(d *model.IfYouDoNotAct) *model.IfYouDoNotActV2 {
	if d == nil {
		return nil
	}
	return &model.IfYouDoNotActV2{
		WhatStagnates:       d.WhatStagnates,
		CompetitorAdvantage: d.CompetitorAdvantage,
		FutureDifficulty:    d.FutureDifficulty,
	}
}

func mapAlternatives(alts []model.AlternativeConsidered) []model.AlternativeConsideredV2 {
	if alts == nil {
		return nil
	}
	result := make([]model.AlternativeConsideredV2, len(alts))
	for i, alt := range alts {
		result[i] = model.AlternativeConsideredV2{
			Name:           alt.Name,
			WhyNotSelected: alt.WhyNotSelected,
		}
	}
	return result
}

func mapWhyThisFits(w *model.WhyThisFits) *model.WhyThisFitsV2 {
	if w == nil {
		return nil
	}
	return &model.WhyThisFitsV2{
		CompanyStageReason:  w.CompanyStageReason,
		BusinessModelReason: w.BusinessModelReason,
		MarketSegmentReason: w.MarketSegmentReason,
		PrimaryKPIReason:    w.PrimaryKPIReason,
	}
}

// mapConfidenceToScore converts confidence string to numeric score
func mapConfidenceToScore(confidence string) float64 {
	switch strings.ToLower(confidence) {
	case "high":
		return 0.85
	case "medium":
		return 0.65
	case "low":
		return 0.35
	default:
		return 0.5
	}
}

// mapRiskToScore converts risk string to numeric score
func mapRiskToScore(risk string) float64 {
	switch strings.ToLower(risk) {
	case "high":
		return 0.8
	case "medium":
		return 0.5
	case "low":
		return 0.2
	default:
		return 0.5
	}
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
