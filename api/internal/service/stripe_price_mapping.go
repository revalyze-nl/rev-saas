package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"rev-saas-api/internal/model"
)

// StripePriceExpanded represents an expanded Stripe price with product info.
type StripePriceExpanded struct {
	ID         string `json:"id"`
	Active     bool   `json:"active"`
	Currency   string `json:"currency"`
	UnitAmount int64  `json:"unit_amount"`
	Nickname   string `json:"nickname"`
	Recurring  *struct {
		Interval      string `json:"interval"`
		IntervalCount int    `json:"interval_count"`
	} `json:"recurring"`
	Product  *StripeProductExpanded `json:"product"`
	Metadata map[string]string      `json:"metadata"`
}

// StripeProductExpanded represents an expanded Stripe product.
type StripeProductExpanded struct {
	ID       string            `json:"id"`
	Name     string            `json:"name"`
	Active   bool              `json:"active"`
	Metadata map[string]string `json:"metadata"`
}

// PriceMappingResult represents the result of auto-mapping/import.
type PriceMappingResult struct {
	Mapped           []MappedPlan       `json:"mapped"`
	Unmapped         []UnmappedPlan     `json:"unmapped,omitempty"`
	Created          []CreatedPlan      `json:"created,omitempty"`  // New plans created from Stripe
	Updated          []UpdatedPlan      `json:"updated,omitempty"`  // Existing plans updated from Stripe
	Warnings         []string           `json:"warnings"`
	DiscoveredPrices []DiscoveredPrice  `json:"discovered_prices,omitempty"` // Debug info
}

// CreatedPlan represents a plan created from Stripe.
type CreatedPlan struct {
	PlanID          string  `json:"plan_id"`
	PlanName        string  `json:"plan_name"`
	Price           float64 `json:"price"`
	Currency        string  `json:"currency"`
	StripePriceID   string  `json:"stripe_price_id"`
	StripeProductID string  `json:"stripe_product_id"`
}

// UpdatedPlan represents an existing plan updated from Stripe.
type UpdatedPlan struct {
	PlanID        string  `json:"plan_id"`
	PlanName      string  `json:"plan_name"`
	OldPrice      float64 `json:"old_price"`
	NewPrice      float64 `json:"new_price"`
	Currency      string  `json:"currency"`
	StripePriceID string  `json:"stripe_price_id"`
}

// DiscoveredPrice shows what prices were found in Stripe (for debugging).
type DiscoveredPrice struct {
	PriceID     string `json:"price_id"`
	ProductName string `json:"product_name"`
	Nickname    string `json:"nickname,omitempty"`
	Currency    string `json:"currency"`
	Amount      string `json:"amount"`
	Interval    string `json:"interval"`
}

// MappedPlan represents a successfully mapped plan.
type MappedPlan struct {
	PlanID          string `json:"plan_id"`
	PlanName        string `json:"plan_name"`
	StripePriceID   string `json:"stripe_price_id"`
	StripeProductID string `json:"stripe_product_id"`
	MatchReason     string `json:"match_reason"`
}

// UnmappedPlan represents a plan that couldn't be mapped.
type UnmappedPlan struct {
	PlanID   string `json:"plan_id"`
	PlanName string `json:"plan_name"`
	Reason   string `json:"reason"`
}

// ListActiveRecurringPrices fetches all active recurring prices from Stripe.
func (s *StripeService) ListActiveRecurringPrices(ctx context.Context, accessToken string) ([]StripePriceExpanded, error) {
	var allPrices []StripePriceExpanded
	startingAfter := ""
	limit := 100

	for {
		url := fmt.Sprintf("%s/prices?active=true&limit=%d&expand[]=data.product", stripeAPIBaseURL, limit)
		if startingAfter != "" {
			url += "&starting_after=" + startingAfter
		}

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return nil, err
		}

		req.Header.Set("Authorization", "Bearer "+accessToken)

		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		body, _ := io.ReadAll(resp.Body)

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("%w: %s", ErrStripeAPIError, string(body))
		}

		var listResp struct {
			Data    []StripePriceExpanded `json:"data"`
			HasMore bool                  `json:"has_more"`
		}

		if err := json.Unmarshal(body, &listResp); err != nil {
			return nil, fmt.Errorf("failed to parse prices response: %w", err)
		}

		allPrices = append(allPrices, listResp.Data...)

		if !listResp.HasMore || len(listResp.Data) == 0 {
			break
		}

		startingAfter = listResp.Data[len(listResp.Data)-1].ID
	}

	return allPrices, nil
}

// FilterMonthlyPrices filters prices to only include monthly recurring prices.
func FilterMonthlyPrices(prices []StripePriceExpanded) []StripePriceExpanded {
	var monthly []StripePriceExpanded
	for _, p := range prices {
		if p.Recurring != nil && p.Recurring.Interval == "month" && p.Recurring.IntervalCount == 1 && p.Active {
			monthly = append(monthly, p)
		}
	}
	return monthly
}

// ImportPricesFromStripe fetches ALL prices from Stripe and creates/updates plans.
// This is the main function for syncing - it imports everything from Stripe.
// Requires user to have a connected Stripe account via OAuth.
func (s *StripeService) ImportPricesFromStripe(ctx context.Context, userID string) (*PriceMappingResult, error) {
	if !s.IsConfigured() {
		return nil, ErrStripeNotConfigured
	}

	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user id: %w", err)
	}

	// Get access token from connected account
	accessToken := s.getAccessToken(ctx, uid)
	if accessToken == "" {
		return nil, ErrStripeNotConnected
	}

	// Fetch all active prices from Stripe
	allPrices, err := s.ListActiveRecurringPrices(ctx, accessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch Stripe prices: %w", err)
	}

	// Filter to monthly prices only
	monthlyPrices := FilterMonthlyPrices(allPrices)

	// Get existing plans
	existingPlans, err := s.planRepo.ListByUser(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch plans: %w", err)
	}

	// Build map of stripe_price_id -> existing plan
	priceIDToPlan := make(map[string]*model.Plan)
	for _, p := range existingPlans {
		if p.StripePriceID != "" {
			priceIDToPlan[p.StripePriceID] = p
		}
	}

	log.Printf("[stripe] import: discovered_prices=%d monthly_prices=%d existing_plans=%d",
		len(allPrices), len(monthlyPrices), len(existingPlans))

	result := &PriceMappingResult{
		Created:          []CreatedPlan{},
		Updated:          []UpdatedPlan{},
		Warnings:         []string{},
		DiscoveredPrices: []DiscoveredPrice{},
	}

	// Process each monthly price from Stripe
	for _, price := range monthlyPrices {
		productName := "Unnamed Plan"
		productID := ""
		if price.Product != nil {
			productName = price.Product.Name
			productID = price.Product.ID
		}

		priceAmount := float64(price.UnitAmount) / 100.0
		currency := strings.ToUpper(price.Currency)

		// Add to discovered prices
		result.DiscoveredPrices = append(result.DiscoveredPrices, DiscoveredPrice{
			PriceID:     price.ID,
			ProductName: productName,
			Nickname:    price.Nickname,
			Currency:    currency,
			Amount:      fmt.Sprintf("%.2f", priceAmount),
			Interval:    "month",
		})

		// Check if we already have a plan with this stripe_price_id
		if existingPlan, exists := priceIDToPlan[price.ID]; exists {
			// Update existing plan if price changed
			if existingPlan.Price != priceAmount || existingPlan.Currency != currency {
				oldPrice := existingPlan.Price
				existingPlan.Price = priceAmount
				existingPlan.Currency = currency
				existingPlan.StripeProductID = productID
				existingPlan.StripePriceLookup = &model.StripePriceLookup{
					Currency:    currency,
					UnitAmount:  price.UnitAmount,
					Interval:    "month",
					Nickname:    price.Nickname,
					ProductName: productName,
				}

				if err := s.planRepo.Update(ctx, existingPlan); err != nil {
					result.Warnings = append(result.Warnings, fmt.Sprintf("Failed to update plan %s: %v", existingPlan.Name, err))
					continue
				}

				result.Updated = append(result.Updated, UpdatedPlan{
					PlanID:        existingPlan.ID.Hex(),
					PlanName:      existingPlan.Name,
					OldPrice:      oldPrice,
					NewPrice:      priceAmount,
					Currency:      currency,
					StripePriceID: price.ID,
				})
			}
		} else {
			// Create new plan from Stripe price
			newPlan := &model.Plan{
				UserID:          uid,
				Name:            productName,
				Price:           priceAmount,
				Currency:        currency,
				BillingCycle:    "monthly",
				StripePriceID:   price.ID,
				StripeProductID: productID,
				StripePriceLookup: &model.StripePriceLookup{
					Currency:    currency,
					UnitAmount:  price.UnitAmount,
					Interval:    "month",
					Nickname:    price.Nickname,
					ProductName: productName,
				},
			}

			if err := s.planRepo.Create(ctx, newPlan); err != nil {
				result.Warnings = append(result.Warnings, fmt.Sprintf("Failed to create plan %s: %v", productName, err))
				continue
			}

			result.Created = append(result.Created, CreatedPlan{
				PlanID:          newPlan.ID.Hex(),
				PlanName:        productName,
				Price:           priceAmount,
				Currency:        currency,
				StripePriceID:   price.ID,
				StripeProductID: productID,
			})

			// Add to map to avoid duplicates
			priceIDToPlan[price.ID] = newPlan
		}
	}

	log.Printf("[stripe] import: created=%d updated=%d warnings=%d",
		len(result.Created), len(result.Updated), len(result.Warnings))

	return result, nil
}

// getAccessToken returns the access token for Stripe API calls.
// Uses connected account token if available.
// Returns empty string if no connection (caller should handle this).
func (s *StripeService) getAccessToken(ctx context.Context, uid primitive.ObjectID) string {
	conn, err := s.connRepo.GetByUserID(ctx, uid)
	if err != nil {
		log.Printf("[stripe] failed to get connection: %v", err)
		return ""
	}

	if conn != nil && conn.Status == model.StripeStatusConnected {
		accessToken, err := s.encryptionService.Decrypt(conn.AccessTokenEncrypted)
		if err != nil {
			log.Printf("[stripe] failed to decrypt access token: %v", err)
			return ""
		}
		return accessToken
	}

	log.Printf("[stripe] no connected account for user")
	return ""
}

// AutoMapPrices is an alias for ImportPricesFromStripe for backward compatibility.
func (s *StripeService) AutoMapPrices(ctx context.Context, userID string) (*PriceMappingResult, error) {
	return s.ImportPricesFromStripe(ctx, userID)
}

