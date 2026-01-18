package service

import (
	"context"
	"fmt"
	"log"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"rev-saas-api/internal/model"
	mongorepo "rev-saas-api/internal/repository/mongo"
)

// WorkspaceProfileService handles workspace profile operations
type WorkspaceProfileService struct {
	repo        *mongorepo.WorkspaceProfileRepository
	companyRepo *mongorepo.CompanyRepository
}

// NewWorkspaceProfileService creates a new service
func NewWorkspaceProfileService(repo *mongorepo.WorkspaceProfileRepository, companyRepo *mongorepo.CompanyRepository) *WorkspaceProfileService {
	return &WorkspaceProfileService{repo: repo, companyRepo: companyRepo}
}

// GetByUserID retrieves workspace profile for a user
func (s *WorkspaceProfileService) GetByUserID(ctx context.Context, userID primitive.ObjectID) (*model.WorkspaceProfile, error) {
	log.Printf("[DEBUG] GetByUserID called for user: %s", userID.Hex())
	profile, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		log.Printf("[DEBUG] Error fetching workspace profile: %v", err)
		return nil, err
	}

	// Fetch company details
	company, err := s.companyRepo.GetByUserID(ctx, userID)
	if err != nil {
		log.Printf("[DEBUG] Error fetching company: %v", err)
	}

	if company != nil {
		log.Printf("[DEBUG] Company found: %s", company.Name)
	} else {
		log.Printf("[DEBUG] No company found for user: %s", userID.Hex())
	}

	if err == nil && company != nil && profile != nil {
		profile.CompanyName = company.Name
		profile.CompanyWebsite = company.Website
	}

	return profile, err
}

// GetOrCreateDefault retrieves existing profile or creates an empty one
func (s *WorkspaceProfileService) GetOrCreateDefault(ctx context.Context, userID primitive.ObjectID) (*model.WorkspaceProfile, error) {
	profile, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	company, _ := s.companyRepo.GetByUserID(ctx, userID)

	if profile != nil {
		// Populate company details if available
		if company != nil {
			profile.CompanyName = company.Name
			profile.CompanyWebsite = company.Website
		}
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

	// Populate company details in return object
	if company != nil {
		newProfile.CompanyName = company.Name
		newProfile.CompanyWebsite = company.Website
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

	return s.GetByUserID(ctx, userID)
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

// UpdateProfile updates workspace profile information (company details)
func (s *WorkspaceProfileService) UpdateProfile(ctx context.Context, userID primitive.ObjectID, req model.WorkspaceProfileRequest) (*model.WorkspaceProfile, error) {
	// Update company details via CompanyRepository
	company, err := s.companyRepo.GetByUserID(ctx, userID)
	if err != nil {
		// If company doesn't exist, create it (part of a new flow)
		if company == nil {
			company = &model.Company{
				UserID: userID,
			}
		} else {
			return nil, fmt.Errorf("failed to get company: %w", err)
		}
	}

	if company == nil {
		// Try creating a new company object if get returned nil without error
		company = &model.Company{
			UserID: userID,
		}
	}

	if req.CompanyName != "" {
		company.Name = req.CompanyName
	}
	if req.CompanyWebsite != "" {
		company.Website = req.CompanyWebsite
	}

	if company.ID.IsZero() {
		if err := s.companyRepo.Create(ctx, company); err != nil {
			return nil, fmt.Errorf("failed to create company: %w", err)
		}
	} else {
		if err := s.companyRepo.Update(ctx, company); err != nil {
			return nil, fmt.Errorf("failed to update company: %w", err)
		}
	}

	// We don't update defaults here, use UpdateDefaults for that
	// But we need to return the full profile
	return s.GetByUserID(ctx, userID)
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
