package service

import (
	"context"
	"errors"
	"strings"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"rev-saas-api/internal/model"
	mongorepo "rev-saas-api/internal/repository/mongo"
)

var (
	// ErrPlanNotFound is returned when the plan doesn't exist or doesn't belong to the user.
	ErrPlanNotFound = errors.New("plan not found")
)

// PlanService handles business logic for plans.
type PlanService struct {
	repo *mongorepo.PlanRepository
}

// NewPlanService creates a new PlanService.
func NewPlanService(repo *mongorepo.PlanRepository) *PlanService {
	return &PlanService{
		repo: repo,
	}
}

// PlanInput represents input for creating a plan.
type PlanInput struct {
	Name          string
	Price         float64
	Currency      string
	BillingCycle  string
	StripePriceID string
}

// CreatePlan creates a new plan for a user.
func (s *PlanService) CreatePlan(ctx context.Context, userID string, input PlanInput) (*model.Plan, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, errors.New("plan name is required")
	}
	if input.Price < 0 {
		return nil, errors.New("price must be non-negative")
	}

	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	// Default currency
	currency := strings.TrimSpace(input.Currency)
	if currency == "" {
		currency = "USD"
	}

	// Default billing cycle
	billingCycle := strings.TrimSpace(input.BillingCycle)
	if billingCycle == "" {
		billingCycle = "monthly"
	}

	plan := &model.Plan{
		UserID:        uid,
		Name:          name,
		Price:         input.Price,
		Currency:      currency,
		BillingCycle:  billingCycle,
		StripePriceID: strings.TrimSpace(input.StripePriceID),
	}

	if err := s.repo.Create(ctx, plan); err != nil {
		return nil, err
	}

	return plan, nil
}

// ListPlans returns all plans for a user.
func (s *PlanService) ListPlans(ctx context.Context, userID string) ([]*model.Plan, error) {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	return s.repo.ListByUser(ctx, uid)
}

// DeletePlan deletes a plan by ID, ensuring it belongs to the user.
func (s *PlanService) DeletePlan(ctx context.Context, userID string, planID string) error {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return errors.New("invalid user id")
	}

	pid, err := primitive.ObjectIDFromHex(planID)
	if err != nil {
		return errors.New("invalid plan id")
	}

	err = s.repo.DeleteByIDAndUser(ctx, pid, uid)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return ErrPlanNotFound
		}
		return err
	}

	return nil
}

// PlanUpdateInput represents input for updating a plan.
type PlanUpdateInput struct {
	Name          *string  `json:"name,omitempty"`
	Price         *float64 `json:"price,omitempty"`
	Currency      *string  `json:"currency,omitempty"`
	BillingCycle  *string  `json:"billing_cycle,omitempty"`
	StripePriceID *string  `json:"stripe_price_id,omitempty"`
}

// UpdatePlan updates a plan by ID, ensuring it belongs to the user.
func (s *PlanService) UpdatePlan(ctx context.Context, userID string, planID string, input PlanUpdateInput) (*model.Plan, error) {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	pid, err := primitive.ObjectIDFromHex(planID)
	if err != nil {
		return nil, errors.New("invalid plan id")
	}

	// Build update document
	update := make(map[string]interface{})

	if input.Name != nil {
		name := strings.TrimSpace(*input.Name)
		if name == "" {
			return nil, errors.New("plan name cannot be empty")
		}
		update["name"] = name
	}

	if input.Price != nil {
		if *input.Price < 0 {
			return nil, errors.New("price must be non-negative")
		}
		update["price"] = *input.Price
	}

	if input.Currency != nil {
		currency := strings.TrimSpace(*input.Currency)
		if currency != "" {
			update["currency"] = currency
		}
	}

	if input.BillingCycle != nil {
		cycle := strings.TrimSpace(*input.BillingCycle)
		if cycle != "" {
			update["billing_cycle"] = cycle
		}
	}

	if input.StripePriceID != nil {
		update["stripe_price_id"] = strings.TrimSpace(*input.StripePriceID)
	}

	if len(update) == 0 {
		return nil, errors.New("no fields to update")
	}

	err = s.repo.UpdateByIDAndUser(ctx, pid, uid, update)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrPlanNotFound
		}
		return nil, err
	}

	// Fetch and return updated plan
	return s.repo.GetByIDAndUser(ctx, pid, uid)
}


