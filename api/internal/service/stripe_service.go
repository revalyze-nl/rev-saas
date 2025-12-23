package service

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"rev-saas-api/internal/model"
	mongorepo "rev-saas-api/internal/repository/mongo"
)

var (
	ErrStripeNotConfigured     = errors.New("stripe is not configured")
	ErrStripeNotConnected      = errors.New("stripe account not connected")
	ErrStripeAlreadyConnected  = errors.New("stripe account already connected")
	ErrStripeInvalidState      = errors.New("invalid or expired state token")
	ErrStripeTokenExchangeFailed = errors.New("failed to exchange authorization code")
	ErrStripeAPIError          = errors.New("stripe API error")
	ErrStripeNoPriceMappings   = errors.New("no stripe_price_id mappings found on plans")
)

const (
	stripeOAuthAuthorizeURL = "https://connect.stripe.com/oauth/authorize"
	stripeOAuthTokenURL     = "https://connect.stripe.com/oauth/token"
	stripeOAuthDeauthorizeURL = "https://connect.stripe.com/oauth/deauthorize"
	stripeAPIBaseURL        = "https://api.stripe.com/v1"
	stateTokenValidityMinutes = 10
)

// StripeService handles Stripe Connect OAuth and metrics sync.
type StripeService struct {
	secretKey         string
	clientID          string
	redirectURL       string
	appPublicURL      string
	livemode          bool
	stateSecret       string // derived from JWT secret
	encryptionService *EncryptionService
	connRepo          *mongorepo.StripeConnectionRepository
	planRepo          *mongorepo.PlanRepository
	metricsRepo       *mongorepo.BusinessMetricsRepository
}

// NewStripeService creates a new StripeService.
func NewStripeService(
	secretKey, clientID, redirectURL, appPublicURL, jwtSecret string,
	livemode bool,
	encryptionService *EncryptionService,
	connRepo *mongorepo.StripeConnectionRepository,
	planRepo *mongorepo.PlanRepository,
	metricsRepo *mongorepo.BusinessMetricsRepository,
) *StripeService {
	return &StripeService{
		secretKey:         secretKey,
		clientID:          clientID,
		redirectURL:       redirectURL,
		appPublicURL:      appPublicURL,
		livemode:          livemode,
		stateSecret:       jwtSecret + "-stripe-state",
		encryptionService: encryptionService,
		connRepo:          connRepo,
		planRepo:          planRepo,
		metricsRepo:       metricsRepo,
	}
}

// IsConfigured returns true if Stripe is properly configured.
func (s *StripeService) IsConfigured() bool {
	return s.secretKey != "" && s.clientID != ""
}

// GetAppPublicURL returns the public URL of the app for redirects.
func (s *StripeService) GetAppPublicURL() string {
	return s.appPublicURL
}

// GetConnectionStatus returns the Stripe connection status for a user.
func (s *StripeService) GetConnectionStatus(ctx context.Context, userID string) (*model.StripeConnectionStatusResponse, error) {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	conn, err := s.connRepo.GetByUserID(ctx, uid)
	if err != nil {
		return nil, err
	}

	if conn == nil || conn.Status == model.StripeStatusDisconnected {
		return &model.StripeConnectionStatusResponse{
			Connected: false,
		}, nil
	}

	return &model.StripeConnectionStatusResponse{
		Connected:       true,
		StripeAccountID: conn.StripeAccountID,
		Livemode:        conn.Livemode,
		LastSyncAt:      conn.LastSyncAt,
	}, nil
}

// GenerateConnectURL creates a Stripe OAuth authorization URL.
func (s *StripeService) GenerateConnectURL(ctx context.Context, userID string) (string, error) {
	if !s.IsConfigured() {
		log.Printf("[stripe] connect URL requested but Stripe not configured")
		return "", ErrStripeNotConfigured
	}

	// Check if already connected
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return "", errors.New("invalid user id")
	}

	conn, err := s.connRepo.GetByUserID(ctx, uid)
	if err != nil {
		return "", err
	}

	if conn != nil && conn.Status == model.StripeStatusConnected {
		return "", ErrStripeAlreadyConnected
	}

	// Generate signed state token
	state := s.generateStateToken(userID)

	// Build OAuth URL
	params := url.Values{}
	params.Set("response_type", "code")
	params.Set("client_id", s.clientID)
	params.Set("scope", "read_write")
	params.Set("redirect_uri", s.redirectURL)
	params.Set("state", state)

	connectURL := stripeOAuthAuthorizeURL + "?" + params.Encode()

	// Debug logging (safe - no secrets)
	clientIDPrefix := s.clientID
	if len(clientIDPrefix) > 10 {
		clientIDPrefix = clientIDPrefix[:10] + "..."
	}
	log.Printf("[stripe] connect URL generated user=%s redirect=%s client_id_prefix=%s livemode=%v",
		userID, s.redirectURL, clientIDPrefix, s.livemode)

	return connectURL, nil
}

// HandleCallback processes the OAuth callback from Stripe.
func (s *StripeService) HandleCallback(ctx context.Context, code, state string) (string, error) {
	if !s.IsConfigured() {
		log.Printf("[stripe] callback received but Stripe not configured")
		return "", ErrStripeNotConfigured
	}

	// Validate state token
	userID, err := s.validateStateToken(state)
	if err != nil {
		log.Printf("[stripe] callback failed: invalid state token: %v", err)
		return "", ErrStripeInvalidState
	}

	log.Printf("[stripe] callback processing for user=%s", userID)

	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return "", errors.New("invalid user id in state")
	}

	// Exchange code for tokens
	tokenResp, err := s.exchangeCode(code)
	if err != nil {
		return "", err
	}

	// Encrypt tokens
	accessTokenEnc, err := s.encryptionService.Encrypt(tokenResp.AccessToken)
	if err != nil {
		return "", fmt.Errorf("failed to encrypt access token: %w", err)
	}

	refreshTokenEnc := ""
	if tokenResp.RefreshToken != "" {
		refreshTokenEnc, err = s.encryptionService.Encrypt(tokenResp.RefreshToken)
		if err != nil {
			return "", fmt.Errorf("failed to encrypt refresh token: %w", err)
		}
	}

	// Save connection
	conn := &model.StripeConnection{
		UserID:                uid,
		StripeAccountID:       tokenResp.StripeUserID,
		AccessTokenEncrypted:  accessTokenEnc,
		RefreshTokenEncrypted: refreshTokenEnc,
		TokenType:             tokenResp.TokenType,
		Scope:                 tokenResp.Scope,
		Livemode:              tokenResp.Livemode,
		Status:                model.StripeStatusConnected,
		ConnectedAt:           time.Now(),
	}

	if err := s.connRepo.UpsertConnection(ctx, conn); err != nil {
		return "", fmt.Errorf("failed to save connection: %w", err)
	}

	// Return redirect URL
	return s.appPublicURL + "/app/settings?stripe=connected", nil
}

// Disconnect revokes the Stripe connection for a user.
func (s *StripeService) Disconnect(ctx context.Context, userID string) error {
	if !s.IsConfigured() {
		return ErrStripeNotConfigured
	}

	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return errors.New("invalid user id")
	}

	conn, err := s.connRepo.GetByUserID(ctx, uid)
	if err != nil {
		return err
	}

	if conn == nil || conn.Status == model.StripeStatusDisconnected {
		return ErrStripeNotConnected
	}

	// Revoke access with Stripe (best effort)
	if conn.StripeAccountID != "" {
		_ = s.deauthorize(conn.StripeAccountID)
	}

	// Mark as disconnected
	return s.connRepo.MarkDisconnected(ctx, uid)
}

// SyncMetrics fetches metrics from Stripe and updates business_metrics.
// Also runs auto-mapping for unmapped plans and syncs plan prices.
// Requires user to have a connected Stripe account via OAuth.
func (s *StripeService) SyncMetrics(ctx context.Context, userID string) (*model.StripeSyncResult, error) {
	if !s.IsConfigured() {
		return nil, ErrStripeNotConfigured
	}

	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	// Get connected account
	conn, err := s.connRepo.GetByUserID(ctx, uid)
	if err != nil {
		return nil, err
	}

	if conn == nil || conn.Status == model.StripeStatusDisconnected {
		return nil, ErrStripeNotConnected
	}

	// Decrypt access token
	accessToken, err := s.encryptionService.Decrypt(conn.AccessTokenEncrypted)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt access token: %w", err)
	}

	stripeAccountID := conn.StripeAccountID
	warnings := []string{}
	var mappingResult *PriceMappingResult

	// ============================================
	// STEP 0: Auto-map prices for unmapped plans
	// ============================================
	mappingResult, err = s.AutoMapPrices(ctx, userID)
	if err != nil {
		log.Printf("[stripe] auto-mapping failed: %v", err)
		warnings = append(warnings, fmt.Sprintf("Auto-mapping failed: %v", err))
	} else {
		// Add mapping warnings
		warnings = append(warnings, mappingResult.Warnings...)
		
		// Add info about unmapped plans
		for _, unmapped := range mappingResult.Unmapped {
			warnings = append(warnings, fmt.Sprintf("Plan '%s' not mapped: %s", unmapped.PlanName, unmapped.Reason))
		}
	}

	// Re-fetch plans after auto-mapping (they may have been updated)
	plans, err := s.planRepo.ListByUser(ctx, uid)
	if err != nil {
		return nil, err
	}

	priceToKey := make(map[string]string) // stripe_price_id -> plan key
	for _, p := range plans {
		if p.StripePriceID != "" {
			// Use plan name as key (normalized)
			key := strings.ToLower(strings.ReplaceAll(p.Name, " ", "_"))
			priceToKey[p.StripePriceID] = key
		}
	}

	// Only show "no mappings" warning if auto-mapping didn't help
	if len(priceToKey) == 0 {
		warnings = append(warnings, "No stripe_price_id mappings found on plans. Metrics will be partial.")
	}

	// ============================================
	// STEP 1: Sync plan prices from Stripe
	// ============================================
	var updatedPrices []string
	for _, p := range plans {
		if p.StripePriceID == "" {
			continue
		}

		// Fetch price details from Stripe (use stripeAccountID which is empty in Direct Mode)
		priceDetails, err := s.fetchPriceDetails(accessToken, stripeAccountID, p.StripePriceID)
		if err != nil {
			log.Printf("[stripe] failed to fetch price %s: %v", p.StripePriceID, err)
			warnings = append(warnings, fmt.Sprintf("Failed to fetch price for plan %s", p.Name))
			continue
		}

		// Convert unit_amount (cents) to price
		newPrice := float64(priceDetails.UnitAmount) / 100.0
		newCurrency := strings.ToUpper(priceDetails.Currency)
		newBillingCycle := priceDetails.Recurring.Interval
		if newBillingCycle == "" {
			newBillingCycle = "monthly" // default for one-time prices
		}

		// Check if update is needed
		if p.Price != newPrice || p.Currency != newCurrency || p.BillingCycle != newBillingCycle {
			oldPrice := p.Price
			p.Price = newPrice
			p.Currency = newCurrency
			p.BillingCycle = newBillingCycle

			if err := s.planRepo.Update(ctx, p); err != nil {
				log.Printf("[stripe] failed to update plan %s: %v", p.Name, err)
				warnings = append(warnings, fmt.Sprintf("Failed to update plan %s", p.Name))
				continue
			}

			updatedPrices = append(updatedPrices, fmt.Sprintf("%s: %.2f → %.2f %s", p.Name, oldPrice, newPrice, newCurrency))
			log.Printf("[stripe] updated plan %s: %.2f → %.2f %s", p.Name, oldPrice, newPrice, newCurrency)
		}
	}

	// ============================================
	// STEP 2: Sync subscription metrics from Stripe
	// ============================================
	result, err := s.fetchAndComputeMetrics(accessToken, stripeAccountID, priceToKey)
	if err != nil {
		return nil, err
	}

	result.Warnings = append(warnings, result.Warnings...)

	// Update business metrics
	existingMetrics, _ := s.metricsRepo.GetByUserID(ctx, uid)

	updatedMetrics := &model.BusinessMetrics{
		UserID:               uid,
		Currency:             result.Updated.Currency,
		MRR:                  float64(result.Updated.MRR) / 100.0, // convert cents to currency units
		TotalActiveCustomers: &result.Updated.TotalActiveCustomers,
	}

	// If no active subscriptions but existing metrics, preserve them
	if result.Updated.TotalActiveCustomers == 0 && existingMetrics != nil {
		// Preserve existing MRR if no active subscriptions (don't reset to 0)
		if existingMetrics.MRR > 0 && result.Updated.MRR == 0 {
			updatedMetrics.MRR = existingMetrics.MRR
			result.Warnings = append(result.Warnings, "No active subscriptions found. Preserving existing MRR.")
		}
		if existingMetrics.TotalActiveCustomers != nil && *existingMetrics.TotalActiveCustomers > 0 {
			updatedMetrics.TotalActiveCustomers = existingMetrics.TotalActiveCustomers
		}
	}

	// Preserve existing non-synced fields
	if existingMetrics != nil {
		updatedMetrics.Customers = existingMetrics.Customers
		updatedMetrics.MonthlyChurnRate = existingMetrics.MonthlyChurnRate
		updatedMetrics.PricingGoal = existingMetrics.PricingGoal
		updatedMetrics.TargetArrGrowth = existingMetrics.TargetArrGrowth
	}

	if len(result.PlanCustomerCounts) > 0 {
		updatedMetrics.PlanCustomerCounts = result.PlanCustomerCounts
	} else if existingMetrics != nil && len(existingMetrics.PlanCustomerCounts) > 0 {
		// Preserve existing plan customer counts if no new data
		updatedMetrics.PlanCustomerCounts = existingMetrics.PlanCustomerCounts
	}

	if err := s.metricsRepo.UpsertForUser(ctx, updatedMetrics); err != nil {
		return nil, fmt.Errorf("failed to update business metrics: %w", err)
	}

	// Update last sync timestamp
	if err := s.connRepo.UpdateLastSyncAt(ctx, uid); err != nil {
		// Non-fatal, just log
		result.Warnings = append(result.Warnings, "Failed to update last_sync_at")
	}

	// Add updated prices to result
	result.Updated.UpdatedPrices = updatedPrices

	// Build mapping info
	var mappingInfo *model.StripeMappingInfo
	if mappingResult != nil {
		mappingInfo = &model.StripeMappingInfo{
			MappedCount:   len(mappingResult.Mapped),
			UnmappedCount: len(mappingResult.Unmapped),
		}
	}

	return &model.StripeSyncResult{
		OK:       true,
		Updated:  result.Updated,
		Mapping:  mappingInfo,
		Warnings: result.Warnings,
	}, nil
}

// SyncPlanPrices fetches price details from Stripe and updates plan prices.
// Requires user to have a connected Stripe account via OAuth.
func (s *StripeService) SyncPlanPrices(ctx context.Context, userID string) ([]string, error) {
	if !s.IsConfigured() {
		return nil, ErrStripeNotConfigured
	}

	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	// Get connected account
	conn, err := s.connRepo.GetByUserID(ctx, uid)
	if err != nil {
		return nil, err
	}

	if conn == nil || conn.Status == model.StripeStatusDisconnected {
		return nil, ErrStripeNotConnected
	}

	// Decrypt access token
	accessToken, err := s.encryptionService.Decrypt(conn.AccessTokenEncrypted)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt access token: %w", err)
	}

	stripeAccountID := conn.StripeAccountID

	// Get user's plans with Stripe price mappings
	plans, err := s.planRepo.ListByUser(ctx, uid)
	if err != nil {
		return nil, err
	}

	var updated []string
	for _, p := range plans {
		if p.StripePriceID == "" {
			continue
		}

		// Fetch price details from Stripe
		priceDetails, err := s.fetchPriceDetails(accessToken, stripeAccountID, p.StripePriceID)
		if err != nil {
			log.Printf("[stripe] failed to fetch price %s: %v", p.StripePriceID, err)
			continue
		}

		// Convert unit_amount (cents) to price
		newPrice := float64(priceDetails.UnitAmount) / 100.0
		newCurrency := strings.ToUpper(priceDetails.Currency)
		newBillingCycle := priceDetails.Recurring.Interval

		// Check if update is needed
		if p.Price != newPrice || p.Currency != newCurrency || p.BillingCycle != newBillingCycle {
			p.Price = newPrice
			p.Currency = newCurrency
			if newBillingCycle != "" {
				p.BillingCycle = newBillingCycle
			}

			if err := s.planRepo.Update(ctx, p); err != nil {
				log.Printf("[stripe] failed to update plan %s: %v", p.Name, err)
				continue
			}

			updated = append(updated, fmt.Sprintf("%s: %.2f %s", p.Name, newPrice, newCurrency))
		}
	}

	return updated, nil
}

// fetchPriceDetails fetches price details from Stripe API.
// Note: When using connected account's access token, we don't need Stripe-Account header
// as the token already has access to the connected account's data.
func (s *StripeService) fetchPriceDetails(accessToken, stripeAccountID, priceID string) (*stripePrice, error) {
	url := fmt.Sprintf("%s/prices/%s", stripeAPIBaseURL, priceID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	// Use the connected account's access token directly
	// No Stripe-Account header needed when using OAuth token
	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		log.Printf("[stripe] fetchPriceDetails failed for %s: status=%d body=%s", priceID, resp.StatusCode, string(body))
		return nil, fmt.Errorf("%w: %s", ErrStripeAPIError, string(body))
	}

	var price stripePrice
	if err := json.Unmarshal(body, &price); err != nil {
		return nil, err
	}

	return &price, nil
}

// --- Internal helper methods ---

type stripeOAuthTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	Scope        string `json:"scope"`
	Livemode     bool   `json:"livemode"`
	StripeUserID string `json:"stripe_user_id"`
}

func (s *StripeService) exchangeCode(code string) (*stripeOAuthTokenResponse, error) {
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)

	req, err := http.NewRequest("POST", stripeOAuthTokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}

	req.SetBasicAuth(s.secretKey, "")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: %s", ErrStripeTokenExchangeFailed, string(body))
	}

	var tokenResp stripeOAuthTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}

func (s *StripeService) deauthorize(stripeAccountID string) error {
	data := url.Values{}
	data.Set("client_id", s.clientID)
	data.Set("stripe_user_id", stripeAccountID)

	req, err := http.NewRequest("POST", stripeOAuthDeauthorizeURL, strings.NewReader(data.Encode()))
	if err != nil {
		return err
	}

	req.SetBasicAuth(s.secretKey, "")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("%w: deauthorize failed: %s", ErrStripeAPIError, string(body))
	}

	return nil
}

// generateStateToken creates a signed state token containing user ID and timestamp.
func (s *StripeService) generateStateToken(userID string) string {
	timestamp := time.Now().Unix()
	data := fmt.Sprintf("%s:%d", userID, timestamp)
	signature := s.signData(data)
	return data + ":" + signature
}

// validateStateToken verifies the state token and returns the user ID.
func (s *StripeService) validateStateToken(state string) (string, error) {
	parts := strings.SplitN(state, ":", 3)
	if len(parts) != 3 {
		return "", errors.New("invalid state format")
	}

	userID := parts[0]
	timestampStr := parts[1]
	signature := parts[2]

	// Verify signature
	expectedData := userID + ":" + timestampStr
	expectedSig := s.signData(expectedData)
	if signature != expectedSig {
		return "", errors.New("invalid signature")
	}

	// Verify timestamp (not expired)
	timestamp, err := strconv.ParseInt(timestampStr, 10, 64)
	if err != nil {
		return "", errors.New("invalid timestamp")
	}

	if time.Now().Unix()-timestamp > stateTokenValidityMinutes*60 {
		return "", errors.New("state token expired")
	}

	return userID, nil
}

func (s *StripeService) signData(data string) string {
	h := hmac.New(sha256.New, []byte(s.stateSecret))
	h.Write([]byte(data))
	return hex.EncodeToString(h.Sum(nil))
}

// syncResult holds internal sync computation results.
type syncResult struct {
	Updated            model.StripeSyncUpdated
	PlanCustomerCounts map[string]int
	Warnings           []string
}

func (s *StripeService) fetchAndComputeMetrics(accessToken, stripeAccountID string, priceToKey map[string]string) (*syncResult, error) {
	result := &syncResult{
		PlanCustomerCounts: make(map[string]int),
		Warnings:           []string{},
	}

	// Fetch active subscriptions
	subscriptions, err := s.fetchActiveSubscriptions(accessToken, stripeAccountID)
	if err != nil {
		return nil, err
	}

	// Compute MRR and plan customer counts
	totalMRR := int64(0)
	totalCustomers := 0
	currencyMap := make(map[string]int) // currency -> count

	for _, sub := range subscriptions {
		// Count customer
		totalCustomers++

		for _, item := range sub.Items.Data {
			// Add to MRR
			mrr := s.computeItemMRR(item)
			totalMRR += mrr

			// Track currency
			currency := strings.ToUpper(item.Price.Currency)
			currencyMap[currency]++

			// Map to plan key if available
			if planKey, ok := priceToKey[item.Price.ID]; ok {
				result.PlanCustomerCounts[planKey]++
			}
		}
	}

	// Determine primary currency (most used)
	primaryCurrency := "USD"
	maxCount := 0
	for currency, count := range currencyMap {
		if count > maxCount {
			maxCount = count
			primaryCurrency = currency
		}
	}

	result.Updated = model.StripeSyncUpdated{
		Currency:             primaryCurrency,
		MRR:                  totalMRR,
		TotalActiveCustomers: totalCustomers,
	}

	return result, nil
}

type stripeSubscription struct {
	ID       string `json:"id"`
	Status   string `json:"status"`
	Customer string `json:"customer"`
	Items    struct {
		Data []stripeSubscriptionItem `json:"data"`
	} `json:"items"`
}

type stripeSubscriptionItem struct {
	ID       string       `json:"id"`
	Price    stripePrice  `json:"price"`
	Quantity int          `json:"quantity"`
}

type stripePrice struct {
	ID         string `json:"id"`
	UnitAmount int64  `json:"unit_amount"`
	Currency   string `json:"currency"`
	Recurring  struct {
		Interval      string `json:"interval"`
		IntervalCount int    `json:"interval_count"`
	} `json:"recurring"`
}

func (s *StripeService) fetchActiveSubscriptions(accessToken, stripeAccountID string) ([]stripeSubscription, error) {
	var allSubs []stripeSubscription
	startingAfter := ""
	limit := 100

	for {
		url := fmt.Sprintf("%s/subscriptions?status=active&limit=%d", stripeAPIBaseURL, limit)
		if startingAfter != "" {
			url += "&starting_after=" + startingAfter
		}

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return nil, err
		}

		req.Header.Set("Authorization", "Bearer "+accessToken)
		// Only set Stripe-Account header if not in Direct Mode
		if stripeAccountID != "" {
			req.Header.Set("Stripe-Account", stripeAccountID)
		}

		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return nil, fmt.Errorf("%w: %s", ErrStripeAPIError, string(body))
		}

		var listResp struct {
			Data    []stripeSubscription `json:"data"`
			HasMore bool                 `json:"has_more"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&listResp); err != nil {
			return nil, err
		}

		allSubs = append(allSubs, listResp.Data...)

		if !listResp.HasMore || len(listResp.Data) == 0 {
			break
		}

		startingAfter = listResp.Data[len(listResp.Data)-1].ID
	}

	return allSubs, nil
}

func (s *StripeService) computeItemMRR(item stripeSubscriptionItem) int64 {
	amount := item.Price.UnitAmount * int64(item.Quantity)

	// Normalize to monthly
	switch item.Price.Recurring.Interval {
	case "year":
		return amount / 12
	case "month":
		return amount
	case "week":
		return amount * 52 / 12
	case "day":
		return amount * 365 / 12
	default:
		return amount
	}
}

