package service

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"rev-saas-api/internal/model"
	mongorepo "rev-saas-api/internal/repository/mongo"
)

// WorkspaceProfileService handles workspace profile operations
type WorkspaceProfileService struct {
	repo *mongorepo.WorkspaceProfileRepository
}

// NewWorkspaceProfileService creates a new service
func NewWorkspaceProfileService(repo *mongorepo.WorkspaceProfileRepository) *WorkspaceProfileService {
	return &WorkspaceProfileService{repo: repo}
}

// GetByUserID retrieves workspace profile for a user
func (s *WorkspaceProfileService) GetByUserID(ctx context.Context, userID primitive.ObjectID) (*model.WorkspaceProfile, error) {
	return s.repo.GetByUserID(ctx, userID)
}

// GetOrCreateDefault retrieves existing profile or creates an empty one
func (s *WorkspaceProfileService) GetOrCreateDefault(ctx context.Context, userID primitive.ObjectID) (*model.WorkspaceProfile, error) {
	profile, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if profile != nil {
		return profile, nil
	}

	// Create default profile
	newProfile := &model.WorkspaceProfile{
		UserID:   userID,
		Defaults: model.WorkspaceDefaults{},
	}

	if err := s.repo.Create(ctx, newProfile); err != nil {
		return nil, fmt.Errorf("failed to create default profile: %w", err)
	}

	return newProfile, nil
}

// UpdateDefaults updates workspace default settings
func (s *WorkspaceProfileService) UpdateDefaults(ctx context.Context, userID primitive.ObjectID, defaults model.WorkspaceDefaults) (*model.WorkspaceProfile, error) {
	// Validate enum values
	if defaults.CompanyStage != nil {
		if !isValidCompanyStage(*defaults.CompanyStage) {
			return nil, fmt.Errorf("invalid company stage: %s", *defaults.CompanyStage)
		}
	}
	if defaults.BusinessModel != nil {
		if !isValidBusinessModel(*defaults.BusinessModel) {
			return nil, fmt.Errorf("invalid business model: %s", *defaults.BusinessModel)
		}
	}
	if defaults.PrimaryKPI != nil {
		if !isValidPrimaryKPI(*defaults.PrimaryKPI) {
			return nil, fmt.Errorf("invalid primary KPI: %s", *defaults.PrimaryKPI)
		}
	}
	if defaults.Market != nil {
		if defaults.Market.Type != nil && !isValidMarketType(*defaults.Market.Type) {
			return nil, fmt.Errorf("invalid market type: %s", *defaults.Market.Type)
		}
		if defaults.Market.Segment != nil && !isValidMarketSegment(*defaults.Market.Segment) {
			return nil, fmt.Errorf("invalid market segment: %s", *defaults.Market.Segment)
		}
	}

	profile := &model.WorkspaceProfile{
		UserID:   userID,
		Defaults: defaults,
	}

	if err := s.repo.Upsert(ctx, profile); err != nil {
		return nil, fmt.Errorf("failed to update defaults: %w", err)
	}

	return s.repo.GetByUserID(ctx, userID)
}

// PatchDefaults partially updates workspace defaults
func (s *WorkspaceProfileService) PatchDefaults(ctx context.Context, userID primitive.ObjectID, patch model.WorkspaceDefaultsPatch) (*model.WorkspaceProfile, error) {
	// Get existing profile
	existing, err := s.GetOrCreateDefault(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Apply patch
	if patch.CompanyStage != nil {
		if !isValidCompanyStage(*patch.CompanyStage) {
			return nil, fmt.Errorf("invalid company stage: %s", *patch.CompanyStage)
		}
		existing.Defaults.CompanyStage = patch.CompanyStage
	}
	if patch.BusinessModel != nil {
		if !isValidBusinessModel(*patch.BusinessModel) {
			return nil, fmt.Errorf("invalid business model: %s", *patch.BusinessModel)
		}
		existing.Defaults.BusinessModel = patch.BusinessModel
	}
	if patch.PrimaryKPI != nil {
		if !isValidPrimaryKPI(*patch.PrimaryKPI) {
			return nil, fmt.Errorf("invalid primary KPI: %s", *patch.PrimaryKPI)
		}
		existing.Defaults.PrimaryKPI = patch.PrimaryKPI
	}
	if patch.Market != nil {
		if existing.Defaults.Market == nil {
			existing.Defaults.Market = &model.MarketDefaults{}
		}
		if patch.Market.Type != nil {
			if !isValidMarketType(*patch.Market.Type) {
				return nil, fmt.Errorf("invalid market type: %s", *patch.Market.Type)
			}
			existing.Defaults.Market.Type = patch.Market.Type
		}
		if patch.Market.Segment != nil {
			if !isValidMarketSegment(*patch.Market.Segment) {
				return nil, fmt.Errorf("invalid market segment: %s", *patch.Market.Segment)
			}
			existing.Defaults.Market.Segment = patch.Market.Segment
		}
	}

	if err := s.repo.Update(ctx, existing); err != nil {
		return nil, fmt.Errorf("failed to patch defaults: %w", err)
	}

	return existing, nil
}

// Validation helpers
func isValidCompanyStage(s string) bool {
	valid := map[string]bool{
		"pre_seed": true, "seed": true, "series_a": true,
		"series_b": true, "series_c_plus": true, "public": true,
	}
	return valid[s]
}

func isValidBusinessModel(s string) bool {
	valid := map[string]bool{
		"saas": true, "marketplace": true, "ecommerce": true,
		"services": true, "hardware": true, "hybrid": true,
	}
	return valid[s]
}

func isValidPrimaryKPI(s string) bool {
	valid := map[string]bool{
		"arr": true, "mrr": true, "gmv": true,
		"revenue": true, "users": true, "retention": true,
	}
	return valid[s]
}

func isValidMarketType(s string) bool {
	valid := map[string]bool{
		"b2b": true, "b2c": true, "b2b2c": true,
	}
	return valid[s]
}

func isValidMarketSegment(s string) bool {
	valid := map[string]bool{
		"devtools":     true,
		"fintech":      true,
		"healthtech":   true,
		"edtech":       true,
		"ecommerce":    true,
		"crm":          true,
		"hr":           true,
		"marketing":    true,
		"analytics":    true,
		"security":     true,
		"productivity": true,
		"other":        true,
	}
	return valid[s]
}
