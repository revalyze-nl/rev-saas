package mongo

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"rev-saas-api/internal/model"
)

// LearningRepository handles learning insight persistence
type LearningRepository struct {
	collection        *mongo.Collection
	outcomesCol       *mongo.Collection
	decisionsCol      *mongo.Collection
}

// NewLearningRepository creates a new learning repository
func NewLearningRepository(db *mongo.Database) *LearningRepository {
	coll := db.Collection("learning_insights")
	
	// Create indexes
	indexes := []mongo.IndexModel{
		{Keys: bson.D{
			{Key: "company_stage", Value: 1},
			{Key: "primary_kpi", Value: 1},
			{Key: "scenario_type", Value: 1},
		}, Options: options.Index().SetUnique(true)},
	}
	_, err := coll.Indexes().CreateMany(context.Background(), indexes)
	if err != nil {
		log.Printf("[learning-repo] Warning: failed to create indexes: %v", err)
	}

	return &LearningRepository{
		collection:   coll,
		outcomesCol:  db.Collection("outcomes"),
		decisionsCol: db.Collection("decisions_v2"),
	}
}

// GetInsight retrieves a learning insight for the given key
func (r *LearningRepository) GetInsight(ctx context.Context, companyStage, primaryKPI, scenarioType string) (*model.LearningInsight, error) {
	var insight model.LearningInsight
	err := r.collection.FindOne(ctx, bson.M{
		"company_stage": companyStage,
		"primary_kpi":   primaryKPI,
		"scenario_type": scenarioType,
	}).Decode(&insight)

	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &insight, nil
}

// UpsertInsight creates or updates a learning insight
func (r *LearningRepository) UpsertInsight(ctx context.Context, insight *model.LearningInsight) error {
	now := time.Now()
	insight.UpdatedAt = now

	filter := bson.M{
		"company_stage": insight.CompanyStage,
		"primary_kpi":   insight.PrimaryKPI,
		"scenario_type": insight.ScenarioType,
	}

	update := bson.M{
		"$set": bson.M{
			"sample_size":       insight.SampleSize,
			"success_rate":      insight.SuccessRate,
			"average_delta":     insight.AverageDelta,
			"miss_rate":         insight.MissRate,
			"confidence":        insight.Confidence,
			"oldest_outcome_at": insight.OldestOutcomeAt,
			"newest_outcome_at": insight.NewestOutcomeAt,
			"updated_at":        now,
		},
		"$setOnInsert": bson.M{
			"_id":        primitive.NewObjectID(),
			"created_at": now,
		},
	}

	opts := options.Update().SetUpsert(true)
	_, err := r.collection.UpdateOne(ctx, filter, update, opts)
	return err
}

// AggregateOutcomes aggregates outcome data for learning
func (r *LearningRepository) AggregateOutcomes(ctx context.Context) ([]model.OutcomeAggregate, error) {
	// Pipeline to join outcomes with decisions and aggregate by company stage, primary KPI, scenario type
	pipeline := mongo.Pipeline{
		// Match outcomes with achieved/missed status
		{{Key: "$match", Value: bson.M{
			"status": bson.M{"$in": []string{"achieved", "missed"}},
		}}},
		// Lookup decision to get company stage and primary KPI
		{{Key: "$lookup", Value: bson.M{
			"from":         "decisions_v2",
			"localField":   "verdict_id",
			"foreignField": "_id",
			"as":           "decision",
		}}},
		// Unwind decision (should be exactly one)
		{{Key: "$unwind", Value: bson.M{
			"path":                       "$decision",
			"preserveNullAndEmptyArrays": false,
		}}},
		// Project needed fields
		{{Key: "$project", Value: bson.M{
			"company_stage":     "$decision.context.company_stage.value",
			"primary_kpi":       "$decision.context.primary_kpi.value",
			"scenario_type":     "$chosen_scenario_id",
			"status":            1,
			"kpis":              1,
		}}},
		// Group by company stage, primary KPI, scenario type
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"company_stage": "$company_stage",
				"primary_kpi":   "$primary_kpi",
				"scenario_type": "$scenario_type",
			},
			"count":          bson.M{"$sum": 1},
			"achieved_count": bson.M{"$sum": bson.M{"$cond": []interface{}{bson.M{"$eq": []interface{}{"$status", "achieved"}}, 1, 0}}},
			"missed_count":   bson.M{"$sum": bson.M{"$cond": []interface{}{bson.M{"$eq": []interface{}{"$status", "missed"}}, 1, 0}}},
			"total_delta": bson.M{"$sum": bson.M{
				"$avg": bson.M{"$ifNull": []interface{}{"$kpis.delta_pct", 0}},
			}},
		}}},
	}

	cursor, err := r.outcomesCol.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var aggregates []model.OutcomeAggregate
	if err := cursor.All(ctx, &aggregates); err != nil {
		return nil, err
	}

	return aggregates, nil
}

// GetRelatedInsights finds learning insights that match the given context
func (r *LearningRepository) GetRelatedInsights(ctx context.Context, companyStage, primaryKPI string) ([]model.LearningInsight, error) {
	// Find insights that match any of the context fields
	filter := bson.M{
		"$or": []bson.M{
			{"company_stage": companyStage, "primary_kpi": primaryKPI},
			{"company_stage": companyStage},
			{"primary_kpi": primaryKPI},
		},
		"sample_size": bson.M{"$gte": 3}, // Only include insights with sufficient sample size
	}

	cursor, err := r.collection.Find(ctx, filter, options.Find().SetLimit(10))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var insights []model.LearningInsight
	if err := cursor.All(ctx, &insights); err != nil {
		return nil, err
	}

	return insights, nil
}

