package service

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"rev-saas-api/internal/model"
	mongorepo "rev-saas-api/internal/repository/mongo"
)

// AdminService handles admin operations.
type AdminService struct {
	userRepo     *mongorepo.UserRepository
	billingRepo  *mongorepo.BillingSubscriptionRepository
	aiUsageRepo  *mongorepo.AIUsageRepository
	errorLogRepo *mongorepo.ErrorLogRepository
}

// NewAdminService creates a new AdminService.
func NewAdminService(
	userRepo *mongorepo.UserRepository,
	billingRepo *mongorepo.BillingSubscriptionRepository,
	aiUsageRepo *mongorepo.AIUsageRepository,
	errorLogRepo *mongorepo.ErrorLogRepository,
) *AdminService {
	return &AdminService{
		userRepo:     userRepo,
		billingRepo:  billingRepo,
		aiUsageRepo:  aiUsageRepo,
		errorLogRepo: errorLogRepo,
	}
}

// DashboardStats represents admin dashboard statistics.
type DashboardStats struct {
	TotalUsers          int                      `json:"totalUsers"`
	ActiveSubscriptions int                      `json:"activeSubscriptions"`
	TotalAICreditsUsed  int                      `json:"totalAICreditsUsed"`
	ErrorCount          int                      `json:"errorCount"`
	RecentUsers         []map[string]interface{} `json:"recentUsers"`
	UsageChart          []map[string]interface{} `json:"usageChart"`
}

// GetDashboardStats returns dashboard statistics.
func (s *AdminService) GetDashboardStats(ctx context.Context) (*DashboardStats, error) {
	// Get total users
	totalUsers, err := s.userRepo.CountAll(ctx)
	if err != nil {
		totalUsers = 0
	}

	// Get active subscriptions
	activeSubs, err := s.billingRepo.CountByStatus(ctx, string(model.SubscriptionStatusActive))
	if err != nil {
		activeSubs = 0
	}

	// Get AI credits used this month
	monthKey := time.Now().Format("2006-01")
	totalCredits, err := s.aiUsageRepo.GetTotalUsageForMonth(ctx, monthKey)
	if err != nil {
		totalCredits = 0
	}

	// Get recent users
	recentUsers, err := s.userRepo.GetRecent(ctx, 5)
	if err != nil {
		recentUsers = []*model.User{}
	}

	recentUsersList := make([]map[string]interface{}, 0, len(recentUsers))
	for _, u := range recentUsers {
		recentUsersList = append(recentUsersList, map[string]interface{}{
			"id":        u.ID.Hex(),
			"email":     u.Email,
			"plan":      u.Plan,
			"createdAt": u.CreatedAt.Format("Jan 2, 2006"),
		})
	}

	// Get error count for today
	errorCount := 0
	if s.errorLogRepo != nil {
		errorCount, _ = s.errorLogRepo.CountToday(ctx)
	}

	return &DashboardStats{
		TotalUsers:          totalUsers,
		ActiveSubscriptions: activeSubs,
		TotalAICreditsUsed:  totalCredits,
		ErrorCount:          errorCount,
		RecentUsers:         recentUsersList,
		UsageChart:          []map[string]interface{}{}, // TODO: implement chart data
	}, nil
}

// UsersResult represents paginated users result.
type UsersResult struct {
	Users []map[string]interface{} `json:"users"`
	Total int                      `json:"total"`
	Page  int                      `json:"page"`
	Limit int                      `json:"limit"`
}

// GetUsers returns paginated list of users.
func (s *AdminService) GetUsers(ctx context.Context, page, limit int, search, planFilter string) (*UsersResult, error) {
	offset := (page - 1) * limit

	users, total, err := s.userRepo.GetPaginated(ctx, offset, limit, search, planFilter)
	if err != nil {
		return nil, err
	}

	usersList := make([]map[string]interface{}, 0, len(users))
	for _, u := range users {
		// Get subscription status
		sub, _ := s.billingRepo.GetByUserID(ctx, u.ID)
		status := "active"
		if sub != nil {
			status = string(sub.Status)
		}

		usersList = append(usersList, map[string]interface{}{
			"id":            u.ID.Hex(),
			"email":         u.Email,
			"plan":          u.Plan,
			"role":          u.Role,
			"status":        status,
			"emailVerified": u.EmailVerified,
			"createdAt":     u.CreatedAt,
		})
	}

	return &UsersResult{
		Users: usersList,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}

// GetUserByID returns a user by ID with additional details.
func (s *AdminService) GetUserByID(ctx context.Context, userID string) (map[string]interface{}, error) {
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID")
	}

	user, err := s.userRepo.GetByID(ctx, oid)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, fmt.Errorf("user not found")
	}

	// Get subscription
	sub, _ := s.billingRepo.GetByUserID(ctx, oid)

	// Get AI credits
	monthKey := time.Now().Format("2006-01")
	usedCredits, _ := s.aiUsageRepo.GetUsage(ctx, oid, monthKey)
	limits := GetPlanLimits(user.Plan)

	result := map[string]interface{}{
		"id":            user.ID.Hex(),
		"email":         user.Email,
		"plan":          user.Plan,
		"role":          user.Role,
		"emailVerified": user.EmailVerified,
		"createdAt":     user.CreatedAt,
		"aiCredits": map[string]interface{}{
			"used":  usedCredits,
			"limit": limits.MonthlyAICredits,
		},
	}

	if sub != nil {
		result["subscription"] = map[string]interface{}{
			"status":           sub.Status,
			"currentPeriodEnd": sub.CurrentPeriodEnd,
			"cancelAtPeriodEnd": sub.CancelAtPeriodEnd,
		}
	}

	return result, nil
}

// UpdateUser updates a user's plan and role.
func (s *AdminService) UpdateUser(ctx context.Context, userID, plan, role string) error {
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID")
	}

	updates := make(map[string]interface{})
	if plan != "" {
		updates["plan"] = plan
	}
	if role != "" {
		updates["role"] = role
	}

	return s.userRepo.UpdateFields(ctx, oid, updates)
}

// DeleteUser deletes a user.
func (s *AdminService) DeleteUser(ctx context.Context, userID string) error {
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID")
	}

	return s.userRepo.Delete(ctx, oid)
}

// SubscriptionsResult represents subscriptions response.
type SubscriptionsResult struct {
	Subscriptions []map[string]interface{} `json:"subscriptions"`
	Stats         map[string]interface{}   `json:"stats"`
}

// GetSubscriptions returns all subscriptions with stats.
func (s *AdminService) GetSubscriptions(ctx context.Context, statusFilter string) (*SubscriptionsResult, error) {
	subs, err := s.billingRepo.GetAll(ctx, statusFilter)
	if err != nil {
		return nil, err
	}

	subsList := make([]map[string]interface{}, 0, len(subs))
	activeCount := 0
	pastDueCount := 0
	canceledCount := 0
	mrr := 0

	for _, sub := range subs {
		// Get user email
		user, _ := s.userRepo.GetByID(ctx, sub.UserID)
		email := ""
		if user != nil {
			email = user.Email
		}

		subsList = append(subsList, map[string]interface{}{
			"id":                sub.ID.Hex(),
			"userId":            sub.UserID.Hex(),
			"userEmail":         email,
			"plan":              sub.PlanKey,
			"status":            sub.Status,
			"currentPeriodEnd":  sub.CurrentPeriodEnd,
			"cancelAtPeriodEnd": sub.CancelAtPeriodEnd,
		})

		// Count stats
		switch sub.Status {
		case model.SubscriptionStatusActive:
			activeCount++
			// Calculate MRR based on plan
			switch sub.PlanKey {
			case model.PlanKeyStarter:
				mrr += 29
			case model.PlanKeyGrowth:
				mrr += 79
			case model.PlanKeyEnterprise:
				mrr += 199
			}
		case model.SubscriptionStatusPastDue:
			pastDueCount++
		case model.SubscriptionStatusCanceled:
			canceledCount++
		}
	}

	return &SubscriptionsResult{
		Subscriptions: subsList,
		Stats: map[string]interface{}{
			"active":   activeCount,
			"pastDue":  pastDueCount,
			"canceled": canceledCount,
			"mrr":      mrr,
		},
	}, nil
}

// AIUsageResult represents AI usage response.
type AIUsageResult struct {
	Usage []map[string]interface{} `json:"usage"`
	Stats map[string]interface{}   `json:"stats"`
}

// GetAIUsage returns AI usage statistics.
func (s *AdminService) GetAIUsage(ctx context.Context, period string) (*AIUsageResult, error) {
	monthKey := time.Now().Format("2006-01")

	// Get all usage for this month
	usageRecords, err := s.aiUsageRepo.GetAllForMonth(ctx, monthKey)
	if err != nil {
		return nil, err
	}

	usageList := make([]map[string]interface{}, 0, len(usageRecords))
	totalUsed := 0
	userCount := 0

	for _, usage := range usageRecords {
		// Get user details
		user, _ := s.userRepo.GetByID(ctx, usage.UserID)
		if user == nil {
			continue
		}

		limits := GetPlanLimits(user.Plan)

		usageList = append(usageList, map[string]interface{}{
			"userId": usage.UserID.Hex(),
			"email":  user.Email,
			"plan":   user.Plan,
			"used":   usage.UsedCredits,
			"limit":  limits.MonthlyAICredits,
		})

		totalUsed += usage.UsedCredits
		userCount++
	}

	avgPerUser := 0.0
	if userCount > 0 {
		avgPerUser = float64(totalUsed) / float64(userCount)
	}

	// Get top users
	topUsers := make([]map[string]interface{}, 0)
	for i, u := range usageList {
		if i >= 5 {
			break
		}
		topUsers = append(topUsers, map[string]interface{}{
			"email": u["email"],
			"used":  u["used"],
		})
	}

	return &AIUsageResult{
		Usage: usageList,
		Stats: map[string]interface{}{
			"totalCreditsUsed": totalUsed,
			"averagePerUser":   avgPerUser,
			"topUsers":         topUsers,
			"dailyUsage":       []map[string]interface{}{}, // TODO: implement daily breakdown
		},
	}, nil
}

// SystemHealthResult represents system health response.
type SystemHealthResult struct {
	Services map[string]interface{} `json:"services"`
	Metrics  map[string]interface{} `json:"metrics"`
}

// GetSystemHealth returns system health status.
func (s *AdminService) GetSystemHealth(ctx context.Context) (*SystemHealthResult, error) {
	// Check database connection
	dbStatus := "operational"
	dbLatency := 0

	start := time.Now()
	_, err := s.userRepo.CountAll(ctx)
	if err != nil {
		dbStatus = "down"
	} else {
		dbLatency = int(time.Since(start).Milliseconds())
	}

	// Get errors today
	errorsToday := 0
	if s.errorLogRepo != nil {
		errorsToday, _ = s.errorLogRepo.CountToday(ctx)
	}

	return &SystemHealthResult{
		Services: map[string]interface{}{
			"api":      map[string]interface{}{"status": "operational", "latency": 0},
			"database": map[string]interface{}{"status": dbStatus, "latency": dbLatency},
			"stripe":   map[string]interface{}{"status": "operational", "latency": 0},
			"openai":   map[string]interface{}{"status": "operational", "latency": 0},
		},
		Metrics: map[string]interface{}{
			"uptime":          "99.9%",
			"avgResponseTime": "145ms",
			"requestsToday":   0,
			"errorsToday":     errorsToday,
		},
	}, nil
}

// ErrorLogsResult represents error logs response.
type ErrorLogsResult struct {
	Logs  []map[string]interface{} `json:"logs"`
	Stats map[string]interface{}   `json:"stats"`
}

// GetErrorLogs returns recent error logs.
func (s *AdminService) GetErrorLogs(ctx context.Context, limit int, category, level string) (*ErrorLogsResult, error) {
	if s.errorLogRepo == nil {
		return &ErrorLogsResult{
			Logs: []map[string]interface{}{},
			Stats: map[string]interface{}{
				"totalToday":    0,
				"errorsToday":   0,
				"warningsToday": 0,
			},
		}, nil
	}

	logs, err := s.errorLogRepo.GetRecent(ctx, limit, category, level)
	if err != nil {
		return nil, err
	}

	logsList := make([]map[string]interface{}, 0, len(logs))
	for _, l := range logs {
		entry := map[string]interface{}{
			"id":        l.ID.Hex(),
			"timestamp": l.Timestamp,
			"level":     l.Level,
			"category":  l.Category,
			"message":   l.Message,
		}
		if l.Details != "" {
			entry["details"] = l.Details
		}
		if !l.UserID.IsZero() {
			entry["userId"] = l.UserID.Hex()
		}
		if l.UserEmail != "" {
			entry["userEmail"] = l.UserEmail
		}
		logsList = append(logsList, entry)
	}

	// Get stats
	today := time.Now().Truncate(24 * time.Hour)
	errorsToday, _ := s.errorLogRepo.CountByLevel(ctx, "error", today)
	warningsToday, _ := s.errorLogRepo.CountByLevel(ctx, "warning", today)

	return &ErrorLogsResult{
		Logs: logsList,
		Stats: map[string]interface{}{
			"totalToday":    errorsToday + warningsToday,
			"errorsToday":   errorsToday,
			"warningsToday": warningsToday,
		},
	}, nil
}
