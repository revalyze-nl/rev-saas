package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"rev-saas-api/internal/config"
	"rev-saas-api/internal/handler"
	"rev-saas-api/internal/middleware"
	mongorepo "rev-saas-api/internal/repository/mongo"
	"rev-saas-api/internal/router"
	"rev-saas-api/internal/service"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Validate environment-specific configuration (fail fast)
	// This ensures production uses live keys and staging/local use test keys
	if err := cfg.ValidateEnvironment(); err != nil {
		log.Fatalf("Environment validation error: %v", err)
	}

	// Validate Stripe configuration (fail fast with clear error messages)
	if err := cfg.ValidateStripeConfig(); err != nil {
		log.Fatalf("Stripe configuration error: %v", err)
	}

	// Validate Stripe Billing configuration
	if err := cfg.ValidateStripeBillingConfig(); err != nil {
		log.Fatalf("Stripe Billing configuration error: %v", err)
	}

	// Load elasticity configuration for pricing simulations
	elasticityCfg, err := config.LoadElasticityConfig()
	if err != nil {
		log.Fatalf("failed to load elasticity config: %v", err)
	}

	// Initialize MongoDB connection
	mongoClient, err := mongorepo.NewClient(cfg.MongoURI, cfg.MongoDB)
	if err != nil {
		log.Fatalf("failed to connect to MongoDB: %v", err)
	}
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := mongoClient.Close(ctx); err != nil {
			log.Printf("error closing Mongo client: %v", err)
		}
	}()

	// Get database instance
	db := mongoClient.DB()

	// Initialize repositories
	userRepo := mongorepo.NewUserRepository(db)
	companyRepo := mongorepo.NewCompanyRepository(db)
	userMetadataRepo := mongorepo.NewUserMetadataRepository(db)
	planRepo := mongorepo.NewPlanRepository(db)
	competitorRepo := mongorepo.NewCompetitorRepository(db)
	analysisRepo := mongorepo.NewAnalysisRepository(db)
	analysisV2Repo := mongorepo.NewAnalysisV2Repository(db)
	businessMetricsRepo := mongorepo.NewBusinessMetricsRepository(db)
	simulationRepo := mongorepo.NewSimulationRepository(db)
	aiUsageRepo := mongorepo.NewAIUsageRepository(db)
	stripeConnRepo := mongorepo.NewStripeConnectionRepository(db)
	billingSubRepo := mongorepo.NewBillingSubscriptionRepository(db)
	webhookEventRepo := mongorepo.NewWebhookEventRepository(db)
	competitorV2Repo := mongorepo.NewCompetitorV2Repository(db)
	pricingV2Repo := mongorepo.NewPricingV2Repository(db)
	errorLogRepo := mongorepo.NewErrorLogRepository(db)
	decisionRepo := mongorepo.NewDecisionRepository(db)
	decisionV2Repo := mongorepo.NewDecisionV2Repository(db)
	workspaceProfileRepo := mongorepo.NewWorkspaceProfileRepository(db)
	scenarioRepo := mongorepo.NewScenarioRepository(db)
	outcomeRepo := mongorepo.NewOutcomeRepository(db)
	scenarioDeltaRepo := mongorepo.NewScenarioDeltaRepository(db)

	// Initialize services
	jwtService := service.NewJWTService(cfg.JWTSecret)
	encryptionService := service.NewEncryptionService(cfg.EncryptionKey)
	emailService := service.NewEmailService(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPFrom, cfg.AppPublicURL)
	authService := service.NewAuthService(userRepo, companyRepo, userMetadataRepo, jwtService, emailService, cfg.AppPublicURL)
	planService := service.NewPlanService(planRepo)
	competitorService := service.NewCompetitorService(competitorRepo)
	analysisService := service.NewAnalysisService(analysisRepo, planRepo, competitorRepo, businessMetricsRepo)
	businessMetricsService := service.NewBusinessMetricsService(businessMetricsRepo)
	limitsService := service.NewLimitsService(userRepo, planRepo, competitorRepo, analysisRepo)
	// Set decision and scenario repos for limit checking
	limitsService.SetDecisionRepo(decisionV2Repo)
	limitsService.SetScenarioRepo(scenarioRepo)
	competitorV2Service := service.NewCompetitorV2Service(competitorV2Repo, userRepo, cfg.OpenAIAPIKey, limitsService)
	pricingV2Service := service.NewPricingV2Service(pricingV2Repo, cfg.OpenAIAPIKey)
	aiPricingService := service.NewAIPricingService(cfg.OpenAIAPIKey)
	aiCreditsService := service.NewAICreditsService(aiUsageRepo, billingSubRepo)
	simulationService := service.NewSimulationService(elasticityCfg, simulationRepo, planRepo, pricingV2Repo, aiPricingService)

	// Stripe Connect service
	stripeService := service.NewStripeService(
		cfg.StripeSecretKey,
		cfg.StripeConnectClientID,
		cfg.StripeConnectRedirectURL,
		cfg.AppPublicURL,
		cfg.JWTSecret,
		cfg.StripeLivemode,
		encryptionService,
		stripeConnRepo,
		planRepo,
		businessMetricsRepo,
	)

	// V2 Analysis Engine services
	ruleEngine := service.NewPricingRuleEngine()
	llmAnalysisServiceV2 := service.NewLLMAnalysisServiceV2(cfg.OpenAIAPIKey)
	analysisServiceV2 := service.NewAnalysisServiceV2(ruleEngine, llmAnalysisServiceV2, analysisV2Repo, planRepo, competitorRepo, pricingV2Repo, competitorV2Repo, businessMetricsRepo)

	// Stripe Billing service
	billingService := service.NewBillingService(cfg, billingSubRepo, webhookEventRepo, userRepo, aiUsageRepo)

	// Initialize error logger
	service.InitErrorLogger(errorLogRepo)

	// Admin service
	adminService := service.NewAdminService(userRepo, billingSubRepo, aiUsageRepo, errorLogRepo)

	// Demo service
	demoService := service.NewDemoService(userRepo, planRepo, competitorRepo, competitorV2Repo, businessMetricsRepo, analysisRepo, analysisV2Repo, simulationRepo, pricingV2Repo)

	// Verdict service (AI pricing recommendation)
	verdictService := service.NewVerdictService(cfg.OpenAIAPIKey)

	// Decision V2 services (versioned decisions with context resolution)
	inferenceService := service.NewInferenceService(verdictService)
	workspaceProfileService := service.NewWorkspaceProfileService(workspaceProfileRepo)
	decisionV2Service := service.NewDecisionV2Service(decisionV2Repo, workspaceProfileRepo, inferenceService)

	// Scenario service (AI-generated strategic scenarios)
	scenarioService := service.NewScenarioService(cfg.OpenAIAPIKey, scenarioRepo, decisionV2Repo)

	// Outcome service (measurable outcomes with KPI tracking)
	outcomeService := service.NewOutcomeService(outcomeRepo, decisionV2Repo, scenarioRepo, scenarioDeltaRepo)

	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(jwtService, userRepo)

	// Initialize handlers
	healthHandler := handler.NewHealthHandler()
	authHandler := handler.NewAuthHandler(authService)
	planHandler := handler.NewPlanHandler(planService, limitsService)
	competitorHandler := handler.NewCompetitorHandler(competitorService, limitsService)
	competitorV2Handler := handler.NewCompetitorV2Handler(competitorV2Service)
	pricingV2Handler := handler.NewPricingV2Handler(pricingV2Service)
	analysisHandler := handler.NewAnalysisHandler(analysisService, limitsService, aiPricingService, aiCreditsService)
	analysisPDFHandler := handler.NewAnalysisPDFHandler(analysisService, businessMetricsRepo)
	analysisV2Handler := handler.NewAnalysisV2Handler(analysisServiceV2, aiCreditsService)
	businessMetricsHandler := handler.NewBusinessMetricsHandler(businessMetricsService)
	limitsHandler := handler.NewLimitsHandler(limitsService)
	simulationHandler := handler.NewSimulationHandler(simulationService, aiPricingService, aiCreditsService)
	aiCreditsHandler := handler.NewAICreditsHandler(aiCreditsService)
	stripeHandler := handler.NewStripeHandler(stripeService)
	billingHandler := handler.NewBillingHandler(billingService, cfg)
	adminHandler := handler.NewAdminHandler(adminService, demoService)
	demoHandler := handler.NewDemoHandler(demoService)
	verdictHandler := handler.NewVerdictHandler(verdictService, decisionRepo)
	decisionHandler := handler.NewDecisionHandler(decisionRepo)
	decisionV2Handler := handler.NewDecisionV2Handler(decisionV2Service, limitsService)
	workspaceProfileHandler := handler.NewWorkspaceProfileHandler(workspaceProfileService)
	scenarioHandler := handler.NewScenarioHandler(scenarioService, limitsService)
	outcomeHandler := handler.NewOutcomeHandler(outcomeService, limitsService)
	
	// Learning service and handler
	learningRepo := mongorepo.NewLearningRepository(db)
	learningService := service.NewLearningService(learningRepo)
	learningHandler := handler.NewLearningHandler(learningService, limitsService)
	
	// Wire learning service into verdict service for prompt injection
	verdictService.SetLearningService(learningService)
	
	// Export handler
	exportHandler := handler.NewExportHandler(decisionV2Repo, scenarioService, outcomeService, limitsService)

	// Create router
	r := router.NewRouter(healthHandler, authHandler, planHandler, competitorHandler, competitorV2Handler, pricingV2Handler, analysisHandler, analysisPDFHandler, analysisV2Handler, businessMetricsHandler, limitsHandler, simulationHandler, aiCreditsHandler, stripeHandler, billingHandler, adminHandler, demoHandler, verdictHandler, decisionHandler, decisionV2Handler, workspaceProfileHandler, scenarioHandler, outcomeHandler, learningHandler, exportHandler, authMiddleware)

	// Configure HTTP server
	srv := &http.Server{
		Addr:         ":" + cfg.AppPort,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Starting server on :%s", cfg.AppPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Create a deadline to wait for current operations to complete
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("server shutdown error: %v", err)
	}

	log.Println("Server stopped gracefully")
}
