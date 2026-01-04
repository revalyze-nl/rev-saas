package service

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"rev-saas-api/internal/model"
	mongorepo "rev-saas-api/internal/repository/mongo"
)

// AI Credits error codes
const (
	AIQuotaExceededCode        = "AI_QUOTA_EXCEEDED"
	SimulationNotAvailableCode = "SIMULATION_NOT_AVAILABLE"
	PaymentRequiredCode        = "PAYMENT_REQUIRED"
)

// AI Credits errors
var (
	ErrAIQuotaExceeded     = errors.New("you have used all your AI Insight Credits for this month on your current plan")
	ErrSimulationNotInPlan = errors.New("pricing simulations are only available on Growth and Enterprise plans")
	ErrPaymentRequired     = errors.New("your subscription payment is past due. Please update your payment method to continue using the service")
)

// AICreditsService handles AI credit tracking and enforcement.
type AICreditsService struct {
	aiUsageRepo *mongorepo.AIUsageRepository
	billingRepo *mongorepo.BillingSubscriptionRepository
}

// NewAICreditsService creates a new AICreditsService.
func NewAICreditsService(aiUsageRepo *mongorepo.AIUsageRepository, billingRepo *mongorepo.BillingSubscriptionRepository) *AICreditsService {
	return &AICreditsService{
		aiUsageRepo: aiUsageRepo,
		billingRepo: billingRepo,
	}
}

// checkSubscriptionActive verifies that the user's subscription is in good standing.
// Returns error if subscription is past_due, unpaid, or incomplete.
func (s *AICreditsService) checkSubscriptionActive(ctx context.Context, userID string) error {
	userOID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return err
	}

	sub, err := s.billingRepo.GetByUserID(ctx, userOID)
	if err != nil {
		return err
	}

	// No subscription = free tier, allowed
	if sub == nil {
		return nil
	}

	// Check if subscription is in a bad state
	switch sub.Status {
	case model.SubscriptionStatusPastDue,
		model.SubscriptionStatusUnpaid,
		model.SubscriptionStatusIncomplete:
		return ErrPaymentRequired
	}

	return nil
}

// GetCurrentMonthKey returns the current month key in "YYYY-MM" format.
func GetCurrentMonthKey() string {
	return time.Now().UTC().Format("2006-01")
}

// ConsumeCredit attempts to consume 1 AI credit for a user.
// Returns nil if successful, or an error if quota exceeded or payment required.
func (s *AICreditsService) ConsumeCredit(ctx context.Context, userID string, planType string) error {
	// Get plan limits
	limits := GetPlanLimits(planType)

	// Unlimited plans (admin) can always proceed
	if limits.IsUnlimited {
		return nil
	}

	// Check subscription status first - block if payment failed
	if err := s.checkSubscriptionActive(ctx, userID); err != nil {
		return err
	}

	// Parse user ID
	userOID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return err
	}

	monthKey := GetCurrentMonthKey()

	// Get current usage
	usedCredits, err := s.aiUsageRepo.GetUsage(ctx, userOID, monthKey)
	if err != nil {
		return err
	}

	// Check if quota exceeded
	if usedCredits >= limits.MonthlyAICredits {
		return ErrAIQuotaExceeded
	}

	// Increment usage
	return s.aiUsageRepo.IncrementUsage(ctx, userOID, monthKey, 1)
}

// ConsumeCreditForSimulation attempts to consume 1 AI credit for a simulation.
// Also checks if simulations are enabled for the plan.
func (s *AICreditsService) ConsumeCreditForSimulation(ctx context.Context, userID string, planType string) error {
	// Get plan limits
	limits := GetPlanLimits(planType)

	// Check if simulations are enabled for this plan
	if !limits.SimulationsEnabled && !limits.IsUnlimited {
		return ErrSimulationNotInPlan
	}

	// Then consume credit
	return s.ConsumeCredit(ctx, userID, planType)
}

// CanRunSimulation checks if a user can run simulations on their plan.
func (s *AICreditsService) CanRunSimulation(planType string) bool {
	limits := GetPlanLimits(planType)
	return limits.SimulationsEnabled || limits.IsUnlimited
}

// GetCreditsInfo returns the current AI credits information for a user.
func (s *AICreditsService) GetCreditsInfo(ctx context.Context, userID string, planType string) (*model.AICreditsResponse, error) {
	limits := GetPlanLimits(planType)
	monthKey := GetCurrentMonthKey()

	var usedCredits int
	var err error

	if !limits.IsUnlimited {
		// Parse user ID
		userOID, parseErr := primitive.ObjectIDFromHex(userID)
		if parseErr != nil {
			return nil, parseErr
		}

		usedCredits, err = s.aiUsageRepo.GetUsage(ctx, userOID, monthKey)
		if err != nil {
			return nil, err
		}
	}

	remainingCredits := limits.MonthlyAICredits - usedCredits
	if remainingCredits < 0 {
		remainingCredits = 0
	}

	// For unlimited plans, show very high numbers
	monthlyCredits := limits.MonthlyAICredits
	if limits.IsUnlimited {
		monthlyCredits = 9999
		remainingCredits = 9999
	}

	return &model.AICreditsResponse{
		PlanType:           planType,
		MonthlyCredits:     monthlyCredits,
		UsedCredits:        usedCredits,
		RemainingCredits:   remainingCredits,
		SimulationsEnabled: limits.SimulationsEnabled || limits.IsUnlimited,
		MonthKey:           monthKey,
	}, nil
}

// HasCreditsRemaining checks if a user has AI credits remaining.
func (s *AICreditsService) HasCreditsRemaining(ctx context.Context, userID string, planType string) (bool, int, error) {
	limits := GetPlanLimits(planType)

	if limits.IsUnlimited {
		return true, 9999, nil
	}

	userOID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return false, 0, err
	}

	monthKey := GetCurrentMonthKey()
	usedCredits, err := s.aiUsageRepo.GetUsage(ctx, userOID, monthKey)
	if err != nil {
		return false, 0, err
	}

	remaining := limits.MonthlyAICredits - usedCredits
	return remaining > 0, remaining, nil
}






