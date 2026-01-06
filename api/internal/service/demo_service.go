package service

import (
	"context"
	"fmt"
	"log"

	"go.mongodb.org/mongo-driver/bson/primitive"

	mongorepo "rev-saas-api/internal/repository/mongo"
)

// DemoService handles demo mode operations.
type DemoService struct {
	userRepo            *mongorepo.UserRepository
	planRepo            *mongorepo.PlanRepository
	competitorRepo      *mongorepo.CompetitorRepository
	competitorV2Repo    *mongorepo.CompetitorV2Repository
	businessMetricsRepo *mongorepo.BusinessMetricsRepository
	analysisRepo        *mongorepo.AnalysisRepository
	analysisV2Repo      *mongorepo.AnalysisV2Repository
	simulationRepo      *mongorepo.SimulationRepository
	pricingV2Repo       *mongorepo.PricingV2Repository
}

// NewDemoService creates a new DemoService.
func NewDemoService(
	userRepo *mongorepo.UserRepository,
	planRepo *mongorepo.PlanRepository,
	competitorRepo *mongorepo.CompetitorRepository,
	competitorV2Repo *mongorepo.CompetitorV2Repository,
	businessMetricsRepo *mongorepo.BusinessMetricsRepository,
	analysisRepo *mongorepo.AnalysisRepository,
	analysisV2Repo *mongorepo.AnalysisV2Repository,
	simulationRepo *mongorepo.SimulationRepository,
	pricingV2Repo *mongorepo.PricingV2Repository,
) *DemoService {
	return &DemoService{
		userRepo:            userRepo,
		planRepo:            planRepo,
		competitorRepo:      competitorRepo,
		competitorV2Repo:    competitorV2Repo,
		businessMetricsRepo: businessMetricsRepo,
		analysisRepo:        analysisRepo,
		analysisV2Repo:      analysisV2Repo,
		simulationRepo:      simulationRepo,
		pricingV2Repo:       pricingV2Repo,
	}
}

// DemoReplaceResult contains counts of deleted demo data.
type DemoReplaceResult struct {
	PlansDeleted           int64 `json:"plans_deleted"`
	CompetitorsDeleted     int64 `json:"competitors_deleted"`
	CompetitorsV2Deleted   int64 `json:"competitors_v2_deleted"`
	BusinessMetricsDeleted int64 `json:"business_metrics_deleted"`
	AnalysesDeleted        int64 `json:"analyses_deleted"`
	AnalysesV2Deleted      int64 `json:"analyses_v2_deleted"`
	SimulationsDeleted     int64 `json:"simulations_deleted"`
	PricingV2Deleted       int64 `json:"pricing_v2_deleted"`
}

// ReplaceDemoData deletes all demo data for a user and disables demo mode.
func (s *DemoService) ReplaceDemoData(ctx context.Context, userID primitive.ObjectID) (*DemoReplaceResult, error) {
	result := &DemoReplaceResult{}
	var err error

	// Delete plans
	result.PlansDeleted, err = s.planRepo.DeleteAllByUserID(ctx, userID)
	if err != nil {
		log.Printf("[DemoService] Error deleting plans for user %s: %v", userID.Hex(), err)
	} else {
		log.Printf("[DemoService] Deleted %d plans for user %s", result.PlansDeleted, userID.Hex())
	}

	// Delete competitors (v1)
	result.CompetitorsDeleted, err = s.competitorRepo.DeleteAllByUserID(ctx, userID)
	if err != nil {
		log.Printf("[DemoService] Error deleting competitors for user %s: %v", userID.Hex(), err)
	} else {
		log.Printf("[DemoService] Deleted %d competitors for user %s", result.CompetitorsDeleted, userID.Hex())
	}

	// Delete competitors (v2)
	err = s.competitorV2Repo.DeleteAllByUserID(ctx, userID)
	if err != nil {
		log.Printf("[DemoService] Error deleting v2 competitors for user %s: %v", userID.Hex(), err)
	} else {
		log.Printf("[DemoService] Deleted v2 competitors for user %s", userID.Hex())
	}

	// Delete business metrics
	result.BusinessMetricsDeleted, err = s.businessMetricsRepo.DeleteByUserID(ctx, userID)
	if err != nil {
		log.Printf("[DemoService] Error deleting business metrics for user %s: %v", userID.Hex(), err)
	} else {
		log.Printf("[DemoService] Deleted %d business metrics for user %s", result.BusinessMetricsDeleted, userID.Hex())
	}

	// Delete analyses (v1)
	result.AnalysesDeleted, err = s.analysisRepo.DeleteAllByUserID(ctx, userID)
	if err != nil {
		log.Printf("[DemoService] Error deleting analyses for user %s: %v", userID.Hex(), err)
	} else {
		log.Printf("[DemoService] Deleted %d analyses for user %s", result.AnalysesDeleted, userID.Hex())
	}

	// Delete analyses (v2)
	result.AnalysesV2Deleted, err = s.analysisV2Repo.DeleteAllByUserID(ctx, userID)
	if err != nil {
		log.Printf("[DemoService] Error deleting v2 analyses for user %s: %v", userID.Hex(), err)
	} else {
		log.Printf("[DemoService] Deleted %d v2 analyses for user %s", result.AnalysesV2Deleted, userID.Hex())
	}

	// Delete simulations
	result.SimulationsDeleted, err = s.simulationRepo.DeleteAllByUserID(ctx, userID)
	if err != nil {
		log.Printf("[DemoService] Error deleting simulations for user %s: %v", userID.Hex(), err)
	} else {
		log.Printf("[DemoService] Deleted %d simulations for user %s", result.SimulationsDeleted, userID.Hex())
	}

	// Delete pricing v2
	err = s.pricingV2Repo.DeleteByUserID(ctx, userID)
	if err != nil {
		log.Printf("[DemoService] Error deleting pricing v2 for user %s: %v", userID.Hex(), err)
	} else {
		log.Printf("[DemoService] Deleted pricing v2 for user %s", userID.Hex())
	}

	// Mark demo as disabled for this user
	err = s.userRepo.UpdateFields(ctx, userID, map[string]interface{}{
		"demo_disabled": true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to disable demo mode: %w", err)
	}

	log.Printf("[DemoService] Demo mode disabled for user %s", userID.Hex())
	return result, nil
}
