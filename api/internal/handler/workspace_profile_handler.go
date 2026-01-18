package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"rev-saas-api/internal/middleware"
	"rev-saas-api/internal/model"
	"rev-saas-api/internal/service"
)

// writeJSONWP writes a JSON response - local helper for workspace profile
func writeJSONWP(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// WorkspaceProfileHandler handles workspace profile API requests
type WorkspaceProfileHandler struct {
	service *service.WorkspaceProfileService
}

// NewWorkspaceProfileHandler creates a new handler
func NewWorkspaceProfileHandler(svc *service.WorkspaceProfileService) *WorkspaceProfileHandler {
	return &WorkspaceProfileHandler{service: svc}
}

// Get handles GET /api/v2/workspace/profile
func (h *WorkspaceProfileHandler) Get(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	profile, err := h.service.GetOrCreateDefault(r.Context(), user.ID)
	if err != nil {
		log.Printf("[workspace-profile-handler] get error: %v", err)
		writeJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSONWP(w, profile, http.StatusOK)
}

// UpdateDefaults handles PUT /api/v2/workspace/defaults
func (h *WorkspaceProfileHandler) UpdateDefaults(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req model.WorkspaceDefaults
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	profile, err := h.service.UpdateDefaults(r.Context(), user.ID, req)
	if err != nil {
		log.Printf("[workspace-profile-handler] update defaults error: %v", err)
		writeJSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	writeJSONWP(w, profile, http.StatusOK)
}

// PatchDefaults handles PATCH /api/v2/workspace/defaults
func (h *WorkspaceProfileHandler) PatchDefaults(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req model.WorkspaceDefaultsPatch
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	profile, err := h.service.PatchDefaults(r.Context(), user.ID, req)
	if err != nil {
		log.Printf("[workspace-profile-handler] patch defaults error: %v", err)
		writeJSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	writeJSONWP(w, profile, http.StatusOK)
}

// UpdateProfile handles PUT /api/v2/workspace/profile
func (h *WorkspaceProfileHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req model.WorkspaceProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	profile, err := h.service.UpdateProfile(r.Context(), user.ID, req)
	if err != nil {
		log.Printf("[workspace-profile-handler] update profile error: %v", err)
		writeJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSONWP(w, profile, http.StatusOK)
}
