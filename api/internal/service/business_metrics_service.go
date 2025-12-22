package service

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"rev-saas-api/internal/model"
	mongorepo "rev-saas-api/internal/repository/mongo"
)

// MetricsInput represents the input for setting business metrics.
type MetricsInput struct {
	Currency         string   `json:"currency"`
	MRR              float64  `json:"mrr"`
	Customers        int      `json:"customers"`
	MonthlyChurnRate float64  `json:"monthly_churn_rate"`
	PricingGoal      string   `json:"pricing_goal"`
	TargetArrGrowth  *float64 `json:"target_arr_growth"` // nullable/optional

	// Plan-based customer counts (additive fields)
	TotalActiveCustomers *int           `json:"total_active_customers,omitempty"`
	PlanCustomerCounts   map[string]int `json:"plan_customer_counts,omitempty"`
}

// BusinessMetricsService handles business logic for business metrics.
type BusinessMetricsService struct {
	repo *mongorepo.BusinessMetricsRepository
}

// NewBusinessMetricsService creates a new BusinessMetricsService.
func NewBusinessMetricsService(repo *mongorepo.BusinessMetricsRepository) *BusinessMetricsService {
	return &BusinessMetricsService{
		repo: repo,
	}
}

// GetMetrics retrieves business metrics for a user.
func (s *BusinessMetricsService) GetMetrics(ctx context.Context, userID string) (*model.BusinessMetrics, error) {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	return s.repo.GetByUserID(ctx, uid)
}

// SetMetrics creates or updates business metrics for a user.
func (s *BusinessMetricsService) SetMetrics(ctx context.Context, userID string, input MetricsInput) (*model.BusinessMetrics, error) {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	// Validation
	if input.MRR < 0 {
		return nil, errors.New("mrr must be non-negative")
	}
	if input.Customers < 0 {
		return nil, errors.New("customers must be non-negative")
	}
	if input.MonthlyChurnRate < 0 {
		return nil, errors.New("monthly_churn_rate must be non-negative")
	}

	// Validate plan customer counts (must be >= 0)
	for planKey, count := range input.PlanCustomerCounts {
		if count < 0 {
			return nil, errors.New("plan_customer_counts values must be non-negative: " + planKey)
		}
	}

	// Default currency if not provided
	currency := input.Currency
	if currency == "" {
		currency = "USD"
	}

	// Compute total_active_customers from plan_customer_counts if present
	totalActiveCustomers := input.TotalActiveCustomers
	planCustomerCounts := input.PlanCustomerCounts

	if len(planCustomerCounts) > 0 {
		// If plan_customer_counts is present, compute total as sum of plan counts
		// This overwrites any provided total_active_customers
		sum := 0
		for _, count := range planCustomerCounts {
			sum += count
		}
		totalActiveCustomers = &sum
	}

	metrics := &model.BusinessMetrics{
		UserID:               uid,
		Currency:             currency,
		MRR:                  input.MRR,
		Customers:            input.Customers,
		MonthlyChurnRate:     input.MonthlyChurnRate,
		PricingGoal:          input.PricingGoal,
		TargetArrGrowth:      input.TargetArrGrowth,
		TotalActiveCustomers: totalActiveCustomers,
		PlanCustomerCounts:   planCustomerCounts,
	}

	if err := s.repo.UpsertForUser(ctx, metrics); err != nil {
		return nil, err
	}

	return metrics, nil
}


