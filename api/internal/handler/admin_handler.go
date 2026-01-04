package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"rev-saas-api/internal/middleware"
	"rev-saas-api/internal/model"
	"rev-saas-api/internal/service"
)

// AdminHandler handles admin-only endpoints.
type AdminHandler struct {
	adminService *service.AdminService
}

// NewAdminHandler creates a new AdminHandler.
func NewAdminHandler(adminService *service.AdminService) *AdminHandler {
	return &AdminHandler{
		adminService: adminService,
	}
}

// GetStats returns dashboard statistics.
func (h *AdminHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	stats, err := h.adminService.GetDashboardStats(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// GetUsers returns paginated list of users.
func (h *AdminHandler) GetUsers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Parse query params
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	search := r.URL.Query().Get("search")
	planFilter := r.URL.Query().Get("plan")

	result, err := h.adminService.GetUsers(ctx, page, limit, search, planFilter)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// GetUser returns a single user by ID.
func (h *AdminHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get user ID from URL path using gorilla mux
	vars := mux.Vars(r)
	userID := vars["id"]
	if userID == "" {
		http.Error(w, "user ID required", http.StatusBadRequest)
		return
	}

	user, err := h.adminService.GetUserByID(ctx, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// UpdateUser updates a user's properties.
func (h *AdminHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	vars := mux.Vars(r)
	userID := vars["id"]
	if userID == "" {
		http.Error(w, "user ID required", http.StatusBadRequest)
		return
	}

	var req struct {
		Plan string `json:"plan"`
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	err := h.adminService.UpdateUser(ctx, userID, req.Plan, req.Role)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

// DeleteUser deletes a user.
func (h *AdminHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	vars := mux.Vars(r)
	userID := vars["id"]
	if userID == "" {
		http.Error(w, "user ID required", http.StatusBadRequest)
		return
	}

	err := h.adminService.DeleteUser(ctx, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

// GetSubscriptions returns all subscriptions.
func (h *AdminHandler) GetSubscriptions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	statusFilter := r.URL.Query().Get("status")

	result, err := h.adminService.GetSubscriptions(ctx, statusFilter)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// GetAIUsage returns AI credit usage.
func (h *AdminHandler) GetAIUsage(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	period := r.URL.Query().Get("period")
	if period == "" {
		period = "month"
	}

	result, err := h.adminService.GetAIUsage(ctx, period)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// GetErrorLogs returns error logs.
func (h *AdminHandler) GetErrorLogs(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Parse query params
	limitStr := r.URL.Query().Get("limit")
	limit := 100
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	category := r.URL.Query().Get("category")
	level := r.URL.Query().Get("level")

	result, err := h.adminService.GetErrorLogs(ctx, limit, category, level)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// GetSystemHealth returns system health status.
func (h *AdminHandler) GetSystemHealth(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	health, err := h.adminService.GetSystemHealth(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(health)
}

// AdminMiddleware checks if user is admin.
func AdminMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())
		if user == nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		if user.Role != model.RoleAdmin {
			http.Error(w, "admin access required", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Ensure imports are used
var _ = time.Now
var _ = primitive.ObjectID{}

