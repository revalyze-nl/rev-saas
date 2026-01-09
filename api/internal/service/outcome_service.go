package service

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"strconv"
	"strings"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"rev-saas-api/internal/model"
	mongorepo "rev-saas-api/internal/repository/mongo"
)

// OutcomeService handles outcome management and scenario application
type OutcomeService struct {
	outcomeRepo  *mongorepo.OutcomeRepository
	decisionRepo *mongorepo.DecisionV2Repository
	scenarioRepo *mongorepo.ScenarioRepository
	deltaRepo    *mongorepo.ScenarioDeltaRepository
}

// NewOutcomeService creates a new outcome service
func NewOutcomeService(
	outcomeRepo *mongorepo.OutcomeRepository,
	decisionRepo *mongorepo.DecisionV2Repository,
	scenarioRepo *mongorepo.ScenarioRepository,
	deltaRepo *mongorepo.ScenarioDeltaRepository,
) *OutcomeService {
	return &OutcomeService{
		outcomeRepo:  outcomeRepo,
		decisionRepo: decisionRepo,
		scenarioRepo: scenarioRepo,
		deltaRepo:    deltaRepo,
	}
}

// ApplyScenario applies a scenario to a verdict and creates/updates the outcome
func (s *OutcomeService) ApplyScenario(ctx context.Context, verdictID, userID primitive.ObjectID, scenarioID string) (*model.ApplyScenarioResponse, error) {
	// Validate scenario ID
	if !model.IsValidScenarioID(scenarioID) {
		return nil, fmt.Errorf("invalid scenario ID: %s", scenarioID)
	}

	// Get the decision
	decision, err := s.decisionRepo.GetByIDAndUser(ctx, verdictID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get decision: %w", err)
	}
	if decision == nil {
		return nil, fmt.Errorf("decision not found")
	}

	// Get scenarios to extract baseline KPIs
	scenarios, err := s.scenarioRepo.GetByDecisionID(ctx, verdictID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get scenarios: %w", err)
	}
	if scenarios == nil {
		return nil, fmt.Errorf("no scenarios found for this decision")
	}

	// Find the chosen scenario
	var chosenScenario *model.ScenarioItem
	for i := range scenarios.Scenarios {
		if string(scenarios.Scenarios[i].ScenarioID) == scenarioID {
			chosenScenario = &scenarios.Scenarios[i]
			break
		}
	}
	if chosenScenario == nil {
		return nil, fmt.Errorf("scenario not found: %s", scenarioID)
	}

	// Set chosen scenario on decision
	if err := s.decisionRepo.SetChosenScenario(ctx, verdictID, userID, scenarioID); err != nil {
		return nil, fmt.Errorf("failed to set chosen scenario: %w", err)
	}

	// Create or update outcome with prefilled KPIs
	kpis := s.generateKPIsFromScenario(decision, chosenScenario)
	
	outcome := &model.MeasurableOutcome{
		UserID:           userID,
		VerdictID:        verdictID,
		ChosenScenarioID: scenarioID,
		Status:           model.OutcomeStatusPending,
		HorizonDays:      s.extractHorizonDays(chosenScenario),
		KPIs:             kpis,
	}

	if err := s.outcomeRepo.Upsert(ctx, outcome); err != nil {
		return nil, fmt.Errorf("failed to create outcome: %w", err)
	}

	// Link outcome to decision
	if err := s.decisionRepo.LinkOutcome(ctx, verdictID, userID, outcome.ID); err != nil {
		log.Printf("[outcome] Warning: failed to link outcome to decision: %v", err)
	}

	log.Printf("[outcome] Applied scenario %s to verdict %s", scenarioID, verdictID.Hex())

	return &model.ApplyScenarioResponse{
		VerdictID:        verdictID,
		ChosenScenarioID: scenarioID,
		Status:           "path_chosen",
		Outcome: &model.MeasurableOutcomeResponse{
			ID:               outcome.ID,
			VerdictID:        outcome.VerdictID,
			ChosenScenarioID: outcome.ChosenScenarioID,
			Status:           outcome.Status,
			HorizonDays:      outcome.HorizonDays,
			KPIs:             outcome.KPIs,
			CreatedAt:        outcome.CreatedAt,
			UpdatedAt:        outcome.UpdatedAt,
		},
	}, nil
}

// GetOutcome retrieves the outcome for a verdict
func (s *OutcomeService) GetOutcome(ctx context.Context, verdictID, userID primitive.ObjectID) (*model.MeasurableOutcome, error) {
	return s.outcomeRepo.GetByVerdictID(ctx, verdictID, userID)
}

// UpdateOutcome updates an outcome
func (s *OutcomeService) UpdateOutcome(ctx context.Context, verdictID, userID primitive.ObjectID, req *model.UpdateMeasurableOutcomeRequest) (*model.MeasurableOutcome, error) {
	// Get existing outcome
	outcome, err := s.outcomeRepo.GetByVerdictID(ctx, verdictID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get outcome: %w", err)
	}
	if outcome == nil {
		return nil, fmt.Errorf("outcome not found - apply a scenario first")
	}

	// Update fields
	if req.Status != nil && model.IsValidOutcomeStatus(*req.Status) {
		outcome.Status = model.OutcomeStatus(*req.Status)
	}
	if req.KPIs != nil {
		// Compute deltas for KPIs with actuals
		for i := range req.KPIs {
			if req.KPIs[i].Actual != nil {
				delta := *req.KPIs[i].Actual - req.KPIs[i].Baseline
				req.KPIs[i].Delta = &delta
				if req.KPIs[i].Baseline != 0 {
					deltaPct := (delta / req.KPIs[i].Baseline) * 100
					req.KPIs[i].DeltaPct = &deltaPct
				}
			}
		}
		outcome.KPIs = req.KPIs
	}
	if req.EvidenceLinks != nil {
		outcome.EvidenceLinks = req.EvidenceLinks
	}
	if req.Summary != nil {
		outcome.Summary = *req.Summary
	}
	if req.Notes != nil {
		outcome.Notes = *req.Notes
	}

	// Update in database
	if err := s.outcomeRepo.Update(ctx, outcome); err != nil {
		return nil, fmt.Errorf("failed to update outcome: %w", err)
	}

	// Update episode status based on outcome state
	if s.isOutcomeComplete(outcome) {
		if err := s.decisionRepo.UpdateEpisodeStatus(ctx, verdictID, userID, "outcome_saved"); err != nil {
			log.Printf("[outcome] Warning: failed to update episode status: %v", err)
		}
	}

	return outcome, nil
}

// ComputeDelta computes the delta between two scenarios
func (s *OutcomeService) ComputeDelta(ctx context.Context, verdictID, userID primitive.ObjectID, baselineID, candidateID string) (*model.DeltaViewResponse, error) {
	// Check cache first
	if s.deltaRepo != nil {
		cached, err := s.deltaRepo.Get(ctx, verdictID, baselineID, candidateID)
		if err == nil && cached != nil {
			return &model.DeltaViewResponse{
				BaselineScenarioID:  baselineID,
				CandidateScenarioID: candidateID,
				Deltas:              cached.Deltas,
			}, nil
		}
	}

	// Get scenarios
	scenarios, err := s.scenarioRepo.GetByDecisionID(ctx, verdictID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get scenarios: %w", err)
	}
	if scenarios == nil {
		return nil, fmt.Errorf("no scenarios found")
	}

	// Find baseline and candidate
	var baseline, candidate *model.ScenarioItem
	for i := range scenarios.Scenarios {
		sc := &scenarios.Scenarios[i]
		if string(sc.ScenarioID) == baselineID {
			baseline = sc
		}
		if string(sc.ScenarioID) == candidateID {
			candidate = sc
		}
	}

	if baseline == nil || candidate == nil {
		return nil, fmt.Errorf("baseline or candidate scenario not found")
	}

	// Compute deltas
	deltas := s.computeScenarioDelta(baseline, candidate)

	// Cache result
	if s.deltaRepo != nil {
		delta := &model.ScenarioDelta{
			VerdictID:           verdictID,
			BaselineScenarioID:  baselineID,
			CandidateScenarioID: candidateID,
			Deltas:              deltas,
		}
		_ = s.deltaRepo.Upsert(ctx, delta)
	}

	return &model.DeltaViewResponse{
		BaselineScenarioID:  baselineID,
		CandidateScenarioID: candidateID,
		Deltas:              deltas,
	}, nil
}

// GetDeltaForInspect returns delta info for inspecting a scenario vs chosen/baseline
func (s *OutcomeService) GetDeltaForInspect(ctx context.Context, verdictID, userID primitive.ObjectID, candidateID string) (*model.DeltaViewResponse, error) {
	// Get decision to find chosen scenario or default to balanced
	decision, err := s.decisionRepo.GetByIDAndUser(ctx, verdictID, userID)
	if err != nil {
		return nil, err
	}
	if decision == nil {
		return nil, fmt.Errorf("decision not found")
	}

	baselineID := "balanced" // default
	if decision.ChosenScenarioID != nil && *decision.ChosenScenarioID != "" {
		baselineID = *decision.ChosenScenarioID
	}

	return s.ComputeDelta(ctx, verdictID, userID, baselineID, candidateID)
}

// generateKPIsFromScenario creates prefilled KPIs from scenario metrics
func (s *OutcomeService) generateKPIsFromScenario(decision *model.DecisionV2, scenario *model.ScenarioItem) []model.OutcomeKPI {
	kpis := []model.OutcomeKPI{}

	// Primary KPI from decision context
	primaryKPI := model.KPIKeyMRR
	if decision.Context.PrimaryKPI.Value != nil {
		switch *decision.Context.PrimaryKPI.Value {
		case "mrr_growth":
			primaryKPI = model.KPIKeyMRR
		case "churn_reduction":
			primaryKPI = model.KPIKeyChurn
		case "activation":
			primaryKPI = model.KPIKeyActivation
		case "arpu":
			primaryKPI = model.KPIKeyARPA
		case "nrr":
			primaryKPI = model.KPIKeyRetention
		case "cvr":
			primaryKPI = model.KPIKeyConversion
		}
	}

	// Parse revenue impact from scenario
	revenueMin, revenueMax := s.parsePercentRange(scenario.Metrics.RevenueImpactRange)
	churnMin, churnMax := s.parsePercentRange(scenario.Metrics.ChurnImpactRange)

	// Revenue KPI
	kpis = append(kpis, model.OutcomeKPI{
		Key:        model.KPIKeyRevenue,
		Unit:       model.KPIUnitPercent,
		Baseline:   0, // To be set by user
		Target:     (revenueMin + revenueMax) / 2, // Midpoint
		Actual:     nil,
		Delta:      nil,
		DeltaPct:   nil,
		Confidence: model.KPIConfidenceMedium,
		Notes:      fmt.Sprintf("Expected impact: %s", scenario.Metrics.RevenueImpactRange),
	})

	// Churn KPI
	kpis = append(kpis, model.OutcomeKPI{
		Key:        model.KPIKeyChurn,
		Unit:       model.KPIUnitPP,
		Baseline:   0,
		Target:     (churnMin + churnMax) / 2,
		Actual:     nil,
		Delta:      nil,
		DeltaPct:   nil,
		Confidence: model.KPIConfidenceMedium,
		Notes:      fmt.Sprintf("Expected impact: %s", scenario.Metrics.ChurnImpactRange),
	})

	// Primary KPI if different from revenue
	if primaryKPI != model.KPIKeyRevenue && primaryKPI != model.KPIKeyChurn {
		kpis = append(kpis, model.OutcomeKPI{
			Key:        primaryKPI,
			Unit:       s.getUnitForKPI(primaryKPI),
			Baseline:   0,
			Target:     0,
			Actual:     nil,
			Delta:      nil,
			DeltaPct:   nil,
			Confidence: model.KPIConfidenceLow,
			Notes:      "Set your baseline and target",
		})
	}

	return kpis
}

// parsePercentRange extracts min/max from strings like "+15-25%" or "Stagnates"
func (s *OutcomeService) parsePercentRange(rangeStr string) (float64, float64) {
	rangeStr = strings.TrimSpace(rangeStr)
	if rangeStr == "" || strings.ToLower(rangeStr) == "stagnates" || strings.ToLower(rangeStr) == "n/a" {
		return 0, 0
	}

	// Try to match patterns like "+15-25%", "-5-10%", "+25–40%"
	re := regexp.MustCompile(`([+-]?\d+\.?\d*)[–\-−](\d+\.?\d*)`)
	matches := re.FindStringSubmatch(rangeStr)
	if len(matches) >= 3 {
		min, _ := strconv.ParseFloat(matches[1], 64)
		max, _ := strconv.ParseFloat(matches[2], 64)
		return min, max
	}

	// Try single value like "+15%"
	re2 := regexp.MustCompile(`([+-]?\d+\.?\d*)`)
	matches2 := re2.FindStringSubmatch(rangeStr)
	if len(matches2) >= 2 {
		val, _ := strconv.ParseFloat(matches2[1], 64)
		return val, val
	}

	return 0, 0
}

// extractHorizonDays extracts days from time to impact string
func (s *OutcomeService) extractHorizonDays(scenario *model.ScenarioItem) int {
	timeStr := scenario.Metrics.TimeToImpact
	if timeStr == "" || strings.ToLower(timeStr) == "n/a" {
		return 90 // default
	}

	// Try to match patterns like "30-60 days", "14–45 days"
	re := regexp.MustCompile(`(\d+)[–\-−](\d+)`)
	matches := re.FindStringSubmatch(timeStr)
	if len(matches) >= 3 {
		min, _ := strconv.Atoi(matches[1])
		max, _ := strconv.Atoi(matches[2])
		return (min + max) / 2
	}

	// Try single value
	re2 := regexp.MustCompile(`(\d+)`)
	matches2 := re2.FindStringSubmatch(timeStr)
	if len(matches2) >= 2 {
		val, _ := strconv.Atoi(matches2[1])
		return val
	}

	return 90
}

// getUnitForKPI returns the default unit for a KPI type
func (s *OutcomeService) getUnitForKPI(key model.KPIKey) model.KPIUnit {
	switch key {
	case model.KPIKeyChurn, model.KPIKeyConversion, model.KPIKeyActivation, model.KPIKeyRetention:
		return model.KPIUnitPercent
	case model.KPIKeyMRR, model.KPIKeyARR, model.KPIKeyARPA, model.KPIKeyCAC, model.KPIKeyLTV:
		return model.KPIUnitEUR
	case model.KPIKeyNPS:
		return model.KPIUnitCount
	default:
		return model.KPIUnitPercent
	}
}

// isOutcomeComplete checks if an outcome has enough data to be considered complete
func (s *OutcomeService) isOutcomeComplete(outcome *model.MeasurableOutcome) bool {
	if outcome.Status == model.OutcomeStatusAchieved || outcome.Status == model.OutcomeStatusMissed {
		return true
	}
	// Check if at least one KPI has an actual value
	for _, kpi := range outcome.KPIs {
		if kpi.Actual != nil {
			return true
		}
	}
	return false
}

// computeScenarioDelta computes delta values between two scenarios
func (s *OutcomeService) computeScenarioDelta(baseline, candidate *model.ScenarioItem) model.DeltaValues {
	baseRevMin, baseRevMax := s.parsePercentRange(baseline.Metrics.RevenueImpactRange)
	candRevMin, candRevMax := s.parsePercentRange(candidate.Metrics.RevenueImpactRange)

	baseChurnMin, baseChurnMax := s.parsePercentRange(baseline.Metrics.ChurnImpactRange)
	candChurnMin, candChurnMax := s.parsePercentRange(candidate.Metrics.ChurnImpactRange)

	baseTimeMin, baseTimeMax := s.parseTimeRange(baseline.Metrics.TimeToImpact)
	candTimeMin, candTimeMax := s.parseTimeRange(candidate.Metrics.TimeToImpact)

	return model.DeltaValues{
		RevenueImpactPct: model.DeltaRange{
			Min: candRevMin - baseRevMin,
			Max: candRevMax - baseRevMax,
		},
		ChurnImpactPp: model.DeltaRange{
			Min: candChurnMin - baseChurnMin,
			Max: candChurnMax - baseChurnMax,
		},
		TimeToImpactDays: model.DeltaRange{
			Min: float64(candTimeMin - baseTimeMin),
			Max: float64(candTimeMax - baseTimeMax),
		},
		RiskDelta:   s.compareLevel(baseline.Metrics.RiskLabel, candidate.Metrics.RiskLabel),
		EffortDelta: s.compareLevel(baseline.Metrics.ExecutionEffort, candidate.Metrics.ExecutionEffort),
	}
}

// parseTimeRange extracts min/max days from time string
func (s *OutcomeService) parseTimeRange(timeStr string) (int, int) {
	if timeStr == "" || strings.ToLower(timeStr) == "n/a" {
		return 0, 0
	}

	re := regexp.MustCompile(`(\d+)[–\-−](\d+)`)
	matches := re.FindStringSubmatch(timeStr)
	if len(matches) >= 3 {
		min, _ := strconv.Atoi(matches[1])
		max, _ := strconv.Atoi(matches[2])
		return min, max
	}

	re2 := regexp.MustCompile(`(\d+)`)
	matches2 := re2.FindStringSubmatch(timeStr)
	if len(matches2) >= 2 {
		val, _ := strconv.Atoi(matches2[1])
		return val, val
	}

	return 0, 0
}

// compareLevel compares two level strings (low/medium/high) and returns delta direction
func (s *OutcomeService) compareLevel(baseline, candidate string) string {
	levelOrder := map[string]int{"low": 1, "medium": 2, "high": 3}
	
	baseVal := levelOrder[strings.ToLower(baseline)]
	candVal := levelOrder[strings.ToLower(candidate)]

	if candVal > baseVal {
		return "up"
	}
	if candVal < baseVal {
		return "down"
	}
	return "same"
}

