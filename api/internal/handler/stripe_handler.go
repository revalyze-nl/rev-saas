package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"rev-saas-api/internal/middleware"
	"rev-saas-api/internal/service"
)

// StripeHandler handles Stripe Connect endpoints.
type StripeHandler struct {
	stripeService *service.StripeService
}

// NewStripeHandler creates a new StripeHandler.
func NewStripeHandler(stripeService *service.StripeService) *StripeHandler {
	return &StripeHandler{
		stripeService: stripeService,
	}
}

// GetStatus returns the Stripe connection status for the current user.
// GET /api/stripe/status
func (h *StripeHandler) GetStatus(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	if userID == "" {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	status, err := h.stripeService.GetConnectionStatus(r.Context(), userID)
	if err != nil {
		log.Printf("Error getting Stripe status: %v", err)
		writeJSONError(w, "failed to get stripe status", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// Connect initiates the Stripe Connect OAuth flow.
// POST /api/stripe/connect
func (h *StripeHandler) Connect(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	if userID == "" {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	if !h.stripeService.IsConfigured() {
		writeJSONError(w, "stripe is not configured", http.StatusServiceUnavailable)
		return
	}

	connectURL, err := h.stripeService.GenerateConnectURL(r.Context(), userID)
	if err != nil {
		if err == service.ErrStripeAlreadyConnected {
			writeJSONError(w, "stripe account already connected", http.StatusConflict)
			return
		}
		log.Printf("Error generating Stripe connect URL: %v", err)
		writeJSONError(w, "failed to generate connect url", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"url": connectURL})
}

// Callback handles the OAuth callback from Stripe.
// GET /api/stripe/connect/callback
func (h *StripeHandler) Callback(w http.ResponseWriter, r *http.Request) {
	// Note: This endpoint does NOT require auth middleware because
	// Stripe redirects here and the user context is in the state token.

	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	errorCode := r.URL.Query().Get("error")
	errorDesc := r.URL.Query().Get("error_description")

	// Handle OAuth errors from Stripe
	if errorCode != "" {
		log.Printf("Stripe OAuth error: %s - %s", errorCode, errorDesc)
		// Redirect to frontend with error
		redirectURL := h.stripeService.GetAppPublicURL() + "/app/settings?stripe=error&error=" + errorCode
		http.Redirect(w, r, redirectURL, http.StatusFound)
		return
	}

	if code == "" || state == "" {
		writeJSONError(w, "missing code or state", http.StatusBadRequest)
		return
	}

	redirectURL, err := h.stripeService.HandleCallback(r.Context(), code, state)
	if err != nil {
		log.Printf("Error handling Stripe callback: %v", err)
		if err == service.ErrStripeInvalidState {
			http.Redirect(w, r, h.stripeService.GetAppPublicURL()+"/app/settings?stripe=error&error=invalid_state", http.StatusFound)
			return
		}
		http.Redirect(w, r, h.stripeService.GetAppPublicURL()+"/app/settings?stripe=error&error=connection_failed", http.StatusFound)
		return
	}

	http.Redirect(w, r, redirectURL, http.StatusFound)
}

// Disconnect revokes the Stripe connection.
// POST /api/stripe/disconnect
func (h *StripeHandler) Disconnect(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	if userID == "" {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	err := h.stripeService.Disconnect(r.Context(), userID)
	if err != nil {
		if err == service.ErrStripeNotConnected {
			writeJSONError(w, "stripe account not connected", http.StatusNotFound)
			return
		}
		log.Printf("Error disconnecting Stripe: %v", err)
		writeJSONError(w, "failed to disconnect stripe", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

// SyncMetrics manually syncs metrics from Stripe.
// POST /api/stripe/sync/metrics
func (h *StripeHandler) SyncMetrics(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	if userID == "" {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	result, err := h.stripeService.SyncMetrics(r.Context(), userID)
	if err != nil {
		if err == service.ErrStripeNotConnected {
			writeJSONError(w, "stripe account not connected", http.StatusNotFound)
			return
		}
		if err == service.ErrStripeNotConfigured {
			writeJSONError(w, "stripe is not configured", http.StatusServiceUnavailable)
			return
		}
		log.Printf("Error syncing Stripe metrics: %v", err)
		writeJSONError(w, "failed to sync metrics: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// SyncPrices runs auto-mapping only (no metrics sync).
// POST /api/stripe/sync/prices
// Supports Direct Mode: works even without OAuth connection if platform secret key is configured.
func (h *StripeHandler) SyncPrices(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	if userID == "" {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	result, err := h.stripeService.AutoMapPrices(r.Context(), userID)
	if err != nil {
		// Note: ErrStripeNotConnected is no longer returned in Direct Mode
		if err == service.ErrStripeNotConfigured {
			writeJSONError(w, "stripe is not configured", http.StatusServiceUnavailable)
			return
		}
		log.Printf("Error auto-mapping Stripe prices: %v", err)
		writeJSONError(w, "failed to auto-map prices: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

