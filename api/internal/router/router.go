package router

import (
	"net/http"

	"github.com/gorilla/mux"

	"rev-saas-api/internal/handler"
	"rev-saas-api/internal/middleware"
)

// NewRouter creates and configures a new HTTP router.
func NewRouter(
	healthHandler *handler.HealthHandler,
	authHandler *handler.AuthHandler,
	planHandler *handler.PlanHandler,
	competitorHandler *handler.CompetitorHandler,
	competitorV2Handler *handler.CompetitorV2Handler,
	pricingV2Handler *handler.PricingV2Handler,
	analysisHandler *handler.AnalysisHandler,
	analysisPDFHandler *handler.AnalysisPDFHandler,
	analysisV2Handler *handler.AnalysisV2Handler,
	businessMetricsHandler *handler.BusinessMetricsHandler,
	limitsHandler *handler.LimitsHandler,
	simulationHandler *handler.SimulationHandler,
	aiCreditsHandler *handler.AICreditsHandler,
	stripeHandler *handler.StripeHandler,
	billingHandler *handler.BillingHandler,
	adminHandler *handler.AdminHandler,
	demoHandler *handler.DemoHandler,
	verdictHandler *handler.VerdictHandler,
	decisionHandler *handler.DecisionHandler,
	decisionV2Handler *handler.DecisionV2Handler,
	workspaceProfileHandler *handler.WorkspaceProfileHandler,
	scenarioHandler *handler.ScenarioHandler,
	outcomeHandler *handler.OutcomeHandler,
	learningHandler *handler.LearningHandler,
	exportHandler *handler.ExportHandler,
	authMiddleware *middleware.AuthMiddleware,
) http.Handler {
	r := mux.NewRouter()
	r.StrictSlash(true)

	// Health check endpoint
	r.HandleFunc("/health", healthHandler.Health).Methods(http.MethodGet)

	// Auth endpoints (public)
	r.HandleFunc("/auth/signup", authHandler.Signup).Methods(http.MethodPost)
	r.HandleFunc("/auth/login", authHandler.Login).Methods(http.MethodPost)
	r.HandleFunc("/auth/verify-email", authHandler.VerifyEmail).Methods(http.MethodGet)
	r.HandleFunc("/auth/resend-verification", authHandler.ResendVerification).Methods(http.MethodPost)

	// Public plan limits (no auth required)
	r.HandleFunc("/api/plans/limits", limitsHandler.GetPlanLimits).Methods(http.MethodGet)

	// Auth endpoints (protected)
	r.Handle("/auth/me", authMiddleware.RequireAuth(http.HandlerFunc(authHandler.Me))).
		Methods(http.MethodGet)
	r.Handle("/auth/profile", authMiddleware.RequireAuth(http.HandlerFunc(authHandler.UpdateProfile))).
		Methods(http.MethodPatch)

	// API v1 (protected)
	api := r.PathPrefix("/api").Subrouter()
	api.StrictSlash(true)
	api.Use(authMiddleware.RequireAuth)

	// Usage stats
	api.HandleFunc("/usage", limitsHandler.GetUsageStats).Methods(http.MethodGet)

	// AI Insight Credits
	api.HandleFunc("/ai-credits", aiCreditsHandler.GetCredits).Methods(http.MethodGet)

	// Plans
	api.HandleFunc("/plans", planHandler.Create).Methods(http.MethodPost)
	api.HandleFunc("/plans", planHandler.List).Methods(http.MethodGet)
	api.HandleFunc("/plans/{id}", planHandler.Update).Methods(http.MethodPut)
	api.HandleFunc("/plans/{id}", planHandler.Delete).Methods(http.MethodDelete)

	// Competitors (V1 - legacy)
	api.HandleFunc("/competitors", competitorHandler.Create).Methods(http.MethodPost)
	api.HandleFunc("/competitors", competitorHandler.List).Methods(http.MethodGet)
	api.HandleFunc("/competitors/{id}", competitorHandler.Update).Methods(http.MethodPut)
	api.HandleFunc("/competitors/{id}", competitorHandler.Delete).Methods(http.MethodDelete)

	// Competitors V2 (AI discovery) - use separate subrouter for v2
	apiv2 := r.PathPrefix("/api/v2").Subrouter()
	apiv2.Use(authMiddleware.RequireAuth)
	apiv2.HandleFunc("/competitors/discover", competitorV2Handler.Discover).Methods(http.MethodPost)
	apiv2.HandleFunc("/competitors/save", competitorV2Handler.Save).Methods(http.MethodPost)
	apiv2.HandleFunc("/competitors", competitorV2Handler.List).Methods(http.MethodGet)
	apiv2.HandleFunc("/competitors/{id}", competitorV2Handler.Delete).Methods(http.MethodDelete)
	apiv2.HandleFunc("/competitors/{id}/extract-pricing", competitorV2Handler.ExtractPricing).Methods(http.MethodPost)
	apiv2.HandleFunc("/competitors/{id}/pricing", competitorV2Handler.UpdatePricing).Methods(http.MethodPut)
	apiv2.HandleFunc("/competitors/{id}/verify-pricing", competitorV2Handler.VerifyPricing).Methods(http.MethodPost)

	// Workspace Profile V2
	apiv2.HandleFunc("/workspace/profile", workspaceProfileHandler.Get).Methods(http.MethodGet)
	apiv2.HandleFunc("/workspace/profile", workspaceProfileHandler.UpdateProfile).Methods(http.MethodPut)
	apiv2.HandleFunc("/workspace/defaults", workspaceProfileHandler.UpdateDefaults).Methods(http.MethodPut)
	apiv2.HandleFunc("/workspace/defaults", workspaceProfileHandler.PatchDefaults).Methods(http.MethodPatch)

	// Decision V2 (versioned decisions with context resolution)
	apiv2.HandleFunc("/decisions", decisionV2Handler.Create).Methods(http.MethodPost)
	apiv2.HandleFunc("/decisions", decisionV2Handler.List).Methods(http.MethodGet)
	apiv2.HandleFunc("/decisions/compare", decisionV2Handler.Compare).Methods(http.MethodPost)
	apiv2.HandleFunc("/decisions/{id}", decisionV2Handler.Get).Methods(http.MethodGet)
	apiv2.HandleFunc("/decisions/{id}", decisionV2Handler.Delete).Methods(http.MethodDelete)
	apiv2.HandleFunc("/decisions/{id}/context", decisionV2Handler.UpdateContext).Methods(http.MethodPut)
	apiv2.HandleFunc("/decisions/{id}/regenerate", decisionV2Handler.RegenerateVerdict).Methods(http.MethodPost)
	apiv2.HandleFunc("/decisions/{id}/status", decisionV2Handler.UpdateStatus).Methods(http.MethodPut)
	apiv2.HandleFunc("/decisions/{id}/outcomes", decisionV2Handler.AddOutcome).Methods(http.MethodPost)
	apiv2.HandleFunc("/decisions/{id}/outcomes/effective", decisionV2Handler.GetEffectiveOutcomes).Methods(http.MethodGet)

	// Scenarios (linked to decisions)
	apiv2.HandleFunc("/decisions/{id}/scenarios", scenarioHandler.GetScenarios).Methods(http.MethodGet)
	apiv2.HandleFunc("/decisions/{id}/scenarios/generate", scenarioHandler.GenerateScenarios).Methods(http.MethodPost)
	apiv2.HandleFunc("/decisions/{id}/chosen-scenario", scenarioHandler.SetChosenScenario).Methods(http.MethodPatch)

	// Outcome management (linked to decisions)
	apiv2.HandleFunc("/decisions/{id}/scenarios/{scenarioId}/apply", outcomeHandler.ApplyScenario).Methods(http.MethodPost)
	apiv2.HandleFunc("/decisions/{id}/outcome", outcomeHandler.GetOutcome).Methods(http.MethodGet)
	apiv2.HandleFunc("/decisions/{id}/outcome", outcomeHandler.UpdateOutcome).Methods(http.MethodPatch)
	apiv2.HandleFunc("/decisions/{id}/outcome/status", outcomeHandler.UpdateOutcomeStatus).Methods(http.MethodPatch)
	apiv2.HandleFunc("/decisions/{id}/outcome/kpi/{kpiKey}", outcomeHandler.UpdateKPIActual).Methods(http.MethodPatch)
	apiv2.HandleFunc("/decisions/{id}/deltas", outcomeHandler.GetDelta).Methods(http.MethodGet)

	// Learning (cross-decision memory)
	apiv2.HandleFunc("/learning/indicators", learningHandler.GetLearningIndicators).Methods(http.MethodGet)
	apiv2.HandleFunc("/learning/refresh", learningHandler.RefreshInsights).Methods(http.MethodPost)

	// Export (decision reports)
	apiv2.HandleFunc("/decisions/{id}/export/json", exportHandler.ExportDecisionJSON).Methods(http.MethodGet)
	apiv2.HandleFunc("/decisions/{id}/export/markdown", exportHandler.ExportDecisionMarkdown).Methods(http.MethodGet)
	apiv2.HandleFunc("/decisions/{id}/export/html", exportHandler.ExportDecisionHTML).Methods(http.MethodGet)

	// Pricing V2 (auto-import from website)
	api.HandleFunc("/pricing-v2/discover", pricingV2Handler.Discover).Methods(http.MethodPost)
	api.HandleFunc("/pricing-v2/extract", pricingV2Handler.Extract).Methods(http.MethodPost)
	api.HandleFunc("/pricing-v2/extract-from-text", pricingV2Handler.ExtractFromText).Methods(http.MethodPost)
	api.HandleFunc("/pricing-v2/save", pricingV2Handler.Save).Methods(http.MethodPost)
	api.HandleFunc("/pricing-v2", pricingV2Handler.List).Methods(http.MethodGet)
	api.HandleFunc("/pricing-v2/{id}", pricingV2Handler.Delete).Methods(http.MethodDelete)

	// Analysis (V1 - legacy)
	api.HandleFunc("/analysis/run", analysisHandler.RunAnalysis).Methods(http.MethodPost)
	api.HandleFunc("/analysis", analysisHandler.List).Methods(http.MethodGet)
	api.HandleFunc("/analysis/{id}/export-pdf", analysisPDFHandler.ExportPDF).Methods(http.MethodGet)

	// Analysis V2 (new deterministic engine)
	api.HandleFunc("/analysis/v2", analysisV2Handler.RunAnalysisV2).Methods(http.MethodPost)
	api.HandleFunc("/analysis/v2", analysisV2Handler.ListAnalysesV2).Methods(http.MethodGet)
	api.HandleFunc("/analysis/v2/{id}", analysisV2Handler.GetAnalysisV2).Methods(http.MethodGet)
	api.HandleFunc("/analysis/v2/{id}/pdf", analysisV2Handler.ExportPDFV2).Methods(http.MethodGet)

	// Business Metrics
	api.HandleFunc("/business-metrics", businessMetricsHandler.Get).Methods(http.MethodGet)
	api.HandleFunc("/business-metrics", businessMetricsHandler.Set).Methods(http.MethodPut)

	// Simulations
	api.HandleFunc("/simulations", simulationHandler.Create).Methods(http.MethodPost)
	api.HandleFunc("/simulations", simulationHandler.List).Methods(http.MethodGet)
	api.HandleFunc("/simulations/{id}", simulationHandler.Get).Methods(http.MethodGet)
	api.HandleFunc("/simulations/{id}/pdf", simulationHandler.ExportPDF).Methods(http.MethodGet)

	// Stripe Connect (protected endpoints)
	api.HandleFunc("/stripe/status", stripeHandler.GetStatus).Methods(http.MethodGet)
	api.HandleFunc("/stripe/connect", stripeHandler.Connect).Methods(http.MethodPost)
	api.HandleFunc("/stripe/disconnect", stripeHandler.Disconnect).Methods(http.MethodPost)
	api.HandleFunc("/stripe/sync/metrics", stripeHandler.SyncMetrics).Methods(http.MethodPost)
	api.HandleFunc("/stripe/sync/prices", stripeHandler.SyncPrices).Methods(http.MethodPost)

	// Stripe OAuth callback (public - state token validates user)
	r.HandleFunc("/api/stripe/connect/callback", stripeHandler.Callback).Methods(http.MethodGet)

	// Stripe Billing (protected endpoints)
	api.HandleFunc("/billing/status", billingHandler.GetStatus).Methods(http.MethodGet)
	api.HandleFunc("/billing/checkout-session", billingHandler.CreateCheckoutSession).Methods(http.MethodPost)
	api.HandleFunc("/billing/portal", billingHandler.CreatePortalSession).Methods(http.MethodPost)

	// Stripe Billing Webhook (public - uses Stripe signature verification, not auth)
	r.HandleFunc("/api/billing/webhook", billingHandler.HandleWebhook).Methods(http.MethodPost)

	// Demo mode endpoints (protected)
	api.HandleFunc("/demo/replace", demoHandler.ReplaceDemoData).Methods(http.MethodPost)

	// Verdict endpoint (protected)
	api.HandleFunc("/verdict", verdictHandler.GenerateVerdict).Methods(http.MethodPost)

	// Decision Archive (protected)
	api.HandleFunc("/decisions", decisionHandler.Create).Methods(http.MethodPost)
	api.HandleFunc("/decisions", decisionHandler.List).Methods(http.MethodGet)
	api.HandleFunc("/decisions/{id}", decisionHandler.Get).Methods(http.MethodGet)
	api.HandleFunc("/decisions/{id}", decisionHandler.Delete).Methods(http.MethodDelete)
	api.HandleFunc("/decisions/{id}/status", decisionHandler.UpdateStatus).Methods(http.MethodPatch)
	api.HandleFunc("/decisions/{id}/outcomes", decisionHandler.CreateOutcome).Methods(http.MethodPost)
	api.HandleFunc("/decisions/{id}/outcomes", decisionHandler.ListOutcomes).Methods(http.MethodGet)
	api.HandleFunc("/decisions/compare", decisionHandler.Compare).Methods(http.MethodGet)

	// Admin endpoints (protected + admin only)
	adminAPI := r.PathPrefix("/api/admin").Subrouter()
	adminAPI.Use(authMiddleware.RequireAuth)
	adminAPI.Use(handler.AdminMiddleware)
	adminAPI.HandleFunc("/stats", adminHandler.GetStats).Methods(http.MethodGet)
	adminAPI.HandleFunc("/users", adminHandler.GetUsers).Methods(http.MethodGet)
	adminAPI.HandleFunc("/users/{id}", adminHandler.GetUser).Methods(http.MethodGet)
	adminAPI.HandleFunc("/users/{id}", adminHandler.UpdateUser).Methods(http.MethodPatch)
	adminAPI.HandleFunc("/users/{id}", adminHandler.DeleteUser).Methods(http.MethodDelete)
	adminAPI.HandleFunc("/users/{id}/activate", adminHandler.ActivateUser).Methods(http.MethodPost)
	adminAPI.HandleFunc("/users/{id}/reset-data", adminHandler.ResetUserData).Methods(http.MethodPost)
	adminAPI.HandleFunc("/subscriptions", adminHandler.GetSubscriptions).Methods(http.MethodGet)
	adminAPI.HandleFunc("/ai-usage", adminHandler.GetAIUsage).Methods(http.MethodGet)
	adminAPI.HandleFunc("/error-logs", adminHandler.GetErrorLogs).Methods(http.MethodGet)
	adminAPI.HandleFunc("/health", adminHandler.GetSystemHealth).Methods(http.MethodGet)

	// Apply CORS middleware to all routes
	return middleware.CORS(r)
}
