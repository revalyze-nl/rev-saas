package main

import (
	"context"
	"flag"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"rev-saas-api/internal/model"
)

// MigrationConfig holds migration settings
type MigrationConfig struct {
	MongoURI    string
	Database    string
	DryRun      bool
	SkipExisting bool
}

func main() {
	cfg := MigrationConfig{}

	flag.StringVar(&cfg.MongoURI, "mongo-uri", "mongodb://localhost:27017", "MongoDB connection URI")
	flag.StringVar(&cfg.Database, "database", "revalyze", "Database name")
	flag.BoolVar(&cfg.DryRun, "dry-run", true, "Run without making changes")
	flag.BoolVar(&cfg.SkipExisting, "skip-existing", true, "Skip decisions already migrated")
	flag.Parse()

	log.Printf("Migration settings: dry-run=%v, skip-existing=%v", cfg.DryRun, cfg.SkipExisting)

	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(cfg.MongoURI))
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer client.Disconnect(ctx)

	db := client.Database(cfg.Database)
	oldCollection := db.Collection("decisions")
	newCollection := db.Collection("decisions_v2")

	// Run migration
	err = migrateDecisions(ctx, oldCollection, newCollection, cfg)
	if err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	log.Println("Migration completed successfully!")
}

func migrateDecisions(ctx context.Context, oldColl, newColl *mongo.Collection, cfg MigrationConfig) error {
	// Find all v1 decisions
	cursor, err := oldColl.Find(ctx, bson.M{})
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	var migrated, skipped, errors int

	for cursor.Next(ctx) {
		var oldDecision model.PricingDecision
		if err := cursor.Decode(&oldDecision); err != nil {
			log.Printf("Error decoding decision: %v", err)
			errors++
			continue
		}

		// Check if already migrated
		if cfg.SkipExisting {
			count, _ := newColl.CountDocuments(ctx, bson.M{
				"legacy_id": oldDecision.ID,
				"user_id":   oldDecision.UserID,
			})
			if count > 0 {
				skipped++
				continue
			}
		}

		// Transform to v2
		newDecision := transformToV2(&oldDecision)

		if cfg.DryRun {
			log.Printf("[DRY-RUN] Would migrate decision %s (%s)", oldDecision.ID.Hex(), oldDecision.CompanyName)
			migrated++
			continue
		}

		// Insert new v2 decision
		_, err := newColl.InsertOne(ctx, newDecision)
		if err != nil {
			log.Printf("Error inserting decision %s: %v", oldDecision.ID.Hex(), err)
			errors++
			continue
		}

		migrated++
		log.Printf("Migrated decision %s (%s)", oldDecision.ID.Hex(), oldDecision.CompanyName)
	}

	log.Printf("Migration summary: migrated=%d, skipped=%d, errors=%d", migrated, skipped, errors)
	return nil
}

func transformToV2(old *model.PricingDecision) *model.DecisionV2 {
	now := time.Now()

	// Convert confidence level to score
	confidenceScore := 0.5
	switch old.ConfidenceLevel {
	case model.ConfidenceHigh:
		confidenceScore = 0.85
	case model.ConfidenceMedium:
		confidenceScore = 0.65
	case model.ConfidenceLow:
		confidenceScore = 0.45
	}

	// Convert risk level to score
	riskScore := 0.5
	switch old.RiskLevel {
	case model.RiskHigh:
		riskScore = 0.8
	case model.RiskMedium:
		riskScore = 0.5
	case model.RiskLow:
		riskScore = 0.2
	}

	// Build context with source attribution (all from "user" since they were explicit)
	companyStage := string(old.Context.CompanyStage)
	businessModel := string(old.Context.BusinessModel)
	primaryKPI := string(old.Context.PrimaryKPI)
	market := string(old.Context.Market)

	context := model.DecisionContextV2{
		CompanyStage: model.ContextField{
			Value:  &companyStage,
			Source: model.ContextSourceUser,
		},
		BusinessModel: model.ContextField{
			Value:  &businessModel,
			Source: model.ContextSourceUser,
		},
		PrimaryKPI: model.ContextField{
			Value:  &primaryKPI,
			Source: model.ContextSourceUser,
		},
		Market: model.MarketContext{
			Type: model.ContextField{
				Value:  nil, // V1 didn't have separate type/segment
				Source: model.ContextSourceUser,
			},
			Segment: model.ContextField{
				Value:  &market,
				Source: model.ContextSourceUser,
			},
		},
	}

	// Build verdict
	verdict := model.VerdictV2{
		Headline:        old.VerdictHeadline,
		Summary:         old.VerdictSummary,
		ConfidenceScore: confidenceScore,
		ConfidenceLabel: model.ConfidenceLabelFromScore(confidenceScore),
		CTA:             "",
		WhyThisDecision: []string{},
		WhatToExpect: model.WhatToExpectV2{
			RiskScore:   riskScore,
			RiskLabel:   model.RiskLabelFromScore(riskScore),
			Description: "",
		},
		SupportingDetails: model.SupportingDetailsV2{
			ExpectedRevenueImpact: old.ExpectedImpact.RevenueRange,
			ChurnOutlook:          old.ExpectedImpact.ChurnNote,
			MarketPositioning:     "",
		},
	}

	// Convert status
	newStatus := mapStatus(old.Status)

	// Convert status events
	statusEvents := make([]model.StatusEventV2, len(old.StatusEvents))
	for i, e := range old.StatusEvents {
		statusEvents[i] = model.StatusEventV2{
			ID:            e.ID,
			Status:        string(e.Status),
			Reason:        e.Reason,
			ImplementedAt: e.ImplementedAt,
			RollbackAt:    e.RollbackAt,
			CreatedBy:     e.CreatedBy,
			CreatedAt:     e.CreatedAt,
		}
	}

	// Create initial versions
	contextVersion := model.ContextVersion{
		Version:   1,
		Context:   context,
		Reason:    "Migrated from v1",
		CreatedAt: old.CreatedAt,
	}

	verdictVersion := model.VerdictVersion{
		Version:   1,
		Verdict:   verdict,
		Reason:    "Migrated from v1",
		CreatedAt: old.CreatedAt,
	}

	return &model.DecisionV2{
		ID:              primitive.NewObjectID(), // New ID for v2
		UserID:          old.UserID,
		CompanyName:     old.CompanyName,
		WebsiteURL:      old.WebsiteURL,
		Status:          newStatus,
		Context:         context,
		ContextVersion:  1,
		ContextVersions: []model.ContextVersion{contextVersion},
		Verdict:         verdict,
		VerdictVersion:  1,
		VerdictVersions: []model.VerdictVersion{verdictVersion},
		ModelMeta: model.ModelMetaV2{
			ModelName:           old.ModelMeta.ModelName,
			PromptVersion:       old.ModelMeta.PromptVersion,
			InferenceDurationMs: 0,
		},
		ExpectedImpact: model.ExpectedImpactV2{
			RevenueRange: old.ExpectedImpact.RevenueRange,
			ChurnNote:    old.ExpectedImpact.ChurnNote,
		},
		StatusEvents:       statusEvents,
		Outcomes:           []model.OutcomeV2{}, // Outcomes need separate migration
		IsDeleted:          old.IsDeleted,
		DeletedAt:          old.DeletedAt,
		CreatedAt:          old.CreatedAt,
		UpdatedAt:          now,
	}
}

func mapStatus(oldStatus model.DecisionStatus) string {
	switch oldStatus {
	case model.StatusProposed:
		return model.DecisionStatusPending
	case model.StatusInReview:
		return model.DecisionStatusPending
	case model.StatusApproved:
		return model.DecisionStatusApproved
	case model.StatusRejected:
		return model.DecisionStatusRejected
	case model.StatusImplemented:
		return model.DecisionStatusCompleted
	case model.StatusRolledBack:
		return model.DecisionStatusCompleted // Keep as completed but with rollback event
	default:
		return model.DecisionStatusPending
	}
}
