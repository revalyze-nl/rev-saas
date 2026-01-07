package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"rev-saas-api/internal/middleware"
	"rev-saas-api/internal/model"
	mongorepo "rev-saas-api/internal/repository/mongo"
	"rev-saas-api/internal/service"
)

// VerdictHandler handles verdict-related HTTP requests
type VerdictHandler struct {
	verdictService *service.VerdictService
	decisionRepo   *mongorepo.DecisionRepository
}

// NewVerdictHandler creates a new VerdictHandler
func NewVerdictHandler(verdictService *service.VerdictService, decisionRepo *mongorepo.DecisionRepository) *VerdictHandler {
	return &VerdictHandler{
		verdictService: verdictService,
		decisionRepo:   decisionRepo,
	}
}

// GenerateVerdict handles POST /api/verdict
func (h *VerdictHandler) GenerateVerdict(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context (optional - verdict can work without auth)
	userIDStr := middleware.UserIDFromContext(r.Context())
	var userID primitive.ObjectID
	var hasUser bool
	if userIDStr != "" {
		var err error
		userID, err = primitive.ObjectIDFromHex(userIDStr)
		if err == nil {
			hasUser = true
		}
	}

	// Parse request body
	var req model.VerdictRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[verdict-handler] Invalid request body: %v", err)
		http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Validate website URL
	if req.WebsiteURL == "" {
		http.Error(w, `{"error": "websiteUrl is required"}`, http.StatusBadRequest)
		return
	}

	log.Printf("[verdict-handler] Generating verdict for: %s", req.WebsiteURL)

	// Generate verdict
	verdict, err := h.verdictService.GenerateVerdict(r.Context(), req.WebsiteURL)
	if err != nil {
		log.Printf("[verdict-handler] Failed to generate verdict: %v", err)
		http.Error(w, `{"error": "Failed to generate verdict"}`, http.StatusInternalServerError)
		return
	}

	// Save verdict as a decision if user is authenticated
	if hasUser && h.decisionRepo != nil {
		companyName := extractCompanyName(req.WebsiteURL)
		decision := &model.PricingDecision{
			UserID:          userID,
			CompanyName:     companyName,
			WebsiteURL:      req.WebsiteURL,
			VerdictHeadline: verdict.Headline,
			VerdictSummary:  verdict.Summary,
			ConfidenceLevel: mapConfidenceLevel(verdict.Confidence),
			RiskLevel:       mapRiskLevel(verdict.WhatToExpect.RiskLevel),
			ExpectedImpact: model.ExpectedImpact{
				RevenueRange: verdict.SupportingDetails.ExpectedRevenueImpact,
				ChurnNote:    verdict.SupportingDetails.ChurnOutlook,
			},
			Context:     req.Context,
			Status:      model.StatusProposed,
			VerdictJSON: verdict,
			ModelMeta: model.ModelMeta{
				ModelName:     "gpt-4o-mini",
				PromptVersion: "1.0",
			},
		}

		if err := h.decisionRepo.Create(r.Context(), decision); err != nil {
			log.Printf("[verdict-handler] Failed to save decision: %v", err)
			// Don't fail the request, just log the error
		} else {
			log.Printf("[verdict-handler] Saved verdict as decision %s for user %s", decision.ID.Hex(), userID.Hex())
		}
	}

	// Return response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(verdict); err != nil {
		log.Printf("[verdict-handler] Failed to encode response: %v", err)
		http.Error(w, `{"error": "Failed to encode response"}`, http.StatusInternalServerError)
		return
	}
}

// extractCompanyName extracts a company name from URL
func extractCompanyName(url string) string {
	// Remove protocol
	url = strings.TrimPrefix(url, "https://")
	url = strings.TrimPrefix(url, "http://")
	// Remove www.
	url = strings.TrimPrefix(url, "www.")
	// Get domain part
	parts := strings.Split(url, "/")
	if len(parts) > 0 {
		domain := parts[0]
		// Remove TLD
		domainParts := strings.Split(domain, ".")
		if len(domainParts) > 0 {
			// Capitalize first letter
			name := domainParts[0]
			if len(name) > 0 {
				return strings.ToUpper(name[:1]) + name[1:]
			}
		}
	}
	return "Unknown Company"
}

// mapConfidenceLevel maps string confidence to model.ConfidenceLevel
func mapConfidenceLevel(confidence string) model.ConfidenceLevel {
	switch strings.ToLower(confidence) {
	case "high":
		return model.ConfidenceHigh
	case "medium":
		return model.ConfidenceMedium
	case "low":
		return model.ConfidenceLow
	default:
		return model.ConfidenceMedium
	}
}

// mapRiskLevel maps string risk to model.RiskLevel
func mapRiskLevel(risk string) model.RiskLevel {
	switch strings.ToLower(risk) {
	case "high":
		return model.RiskHigh
	case "medium":
		return model.RiskMedium
	case "low":
		return model.RiskLow
	default:
		return model.RiskMedium
	}
}
