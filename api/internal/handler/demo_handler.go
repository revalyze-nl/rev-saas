package handler

import (
	"encoding/json"
	"net/http"

	"rev-saas-api/internal/middleware"
	"rev-saas-api/internal/model"
	"rev-saas-api/internal/service"
)

// DemoHandler handles demo mode endpoints.
type DemoHandler struct {
	demoService *service.DemoService
}

// NewDemoHandler creates a new DemoHandler.
func NewDemoHandler(demoService *service.DemoService) *DemoHandler {
	return &DemoHandler{
		demoService: demoService,
	}
}

// ReplaceDemoData handles POST /api/demo/replace
// Deletes all demo data for the investor user and disables demo mode.
func (h *DemoHandler) ReplaceDemoData(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	user := middleware.UserFromContext(ctx)
	if user == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Only allow investors to use this endpoint
	if user.Role != model.RoleInvestor {
		http.Error(w, "this endpoint is only available for investor accounts", http.StatusForbidden)
		return
	}

	// Check if demo mode is already disabled
	if user.DemoDisabled {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":      true,
			"message": "demo mode already disabled",
		})
		return
	}

	result, err := h.demoService.ReplaceDemoData(ctx, user.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"ok":     true,
		"result": result,
	})
}
