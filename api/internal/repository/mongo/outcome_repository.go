package mongo

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"rev-saas-api/internal/model"
)

// OutcomeRepository handles measurable outcome persistence
type OutcomeRepository struct {
	collection *mongo.Collection
}

// NewOutcomeRepository creates a new repository
func NewOutcomeRepository(db *mongo.Database) *OutcomeRepository {
	coll := db.Collection("measurable_outcomes")

	// Create indexes
	indexes := []mongo.IndexModel{
		{Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "verdict_id", Value: 1}}, Options: options.Index().SetUnique(true)},
		{Keys: bson.D{{Key: "verdict_id", Value: 1}}},
		{Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "status", Value: 1}}},
	}
	_, _ = coll.Indexes().CreateMany(context.Background(), indexes)

	return &OutcomeRepository{collection: coll}
}

// Create creates a new measurable outcome
func (r *OutcomeRepository) Create(ctx context.Context, outcome *model.MeasurableOutcome) error {
	outcome.ID = primitive.NewObjectID()
	outcome.CreatedAt = time.Now()
	outcome.UpdatedAt = time.Now()

	_, err := r.collection.InsertOne(ctx, outcome)
	return err
}

// GetByVerdictID retrieves the outcome for a verdict
func (r *OutcomeRepository) GetByVerdictID(ctx context.Context, verdictID, userID primitive.ObjectID) (*model.MeasurableOutcome, error) {
	var outcome model.MeasurableOutcome
	err := r.collection.FindOne(ctx, bson.M{
		"verdict_id": verdictID,
		"user_id":    userID,
	}).Decode(&outcome)

	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &outcome, nil
}

// GetByID retrieves an outcome by ID
func (r *OutcomeRepository) GetByID(ctx context.Context, id, userID primitive.ObjectID) (*model.MeasurableOutcome, error) {
	var outcome model.MeasurableOutcome
	err := r.collection.FindOne(ctx, bson.M{
		"_id":     id,
		"user_id": userID,
	}).Decode(&outcome)

	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &outcome, nil
}

// Update updates an outcome
func (r *OutcomeRepository) Update(ctx context.Context, outcome *model.MeasurableOutcome) error {
	outcome.UpdatedAt = time.Now()

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": outcome.ID, "user_id": outcome.UserID},
		bson.M{"$set": bson.M{
			"status":          outcome.Status,
			"horizon_days":    outcome.HorizonDays,
			"kpis":            outcome.KPIs,
			"evidence_links":  outcome.EvidenceLinks,
			"summary":         outcome.Summary,
			"notes":           outcome.Notes,
			"updated_at":      outcome.UpdatedAt,
		}},
	)
	return err
}

// UpdateStatus updates only the status field
func (r *OutcomeRepository) UpdateStatus(ctx context.Context, id, userID primitive.ObjectID, status model.OutcomeStatus) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id, "user_id": userID},
		bson.M{"$set": bson.M{
			"status":     status,
			"updated_at": time.Now(),
		}},
	)
	return err
}

// UpdateKPIs updates only the KPIs field
func (r *OutcomeRepository) UpdateKPIs(ctx context.Context, id, userID primitive.ObjectID, kpis []model.OutcomeKPI) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id, "user_id": userID},
		bson.M{"$set": bson.M{
			"kpis":       kpis,
			"updated_at": time.Now(),
		}},
	)
	return err
}

// Upsert creates or updates an outcome for a verdict
func (r *OutcomeRepository) Upsert(ctx context.Context, outcome *model.MeasurableOutcome) error {
	now := time.Now()
	outcome.UpdatedAt = now

	opts := options.Update().SetUpsert(true)
	filter := bson.M{
		"verdict_id": outcome.VerdictID,
		"user_id":    outcome.UserID,
	}

	update := bson.M{
		"$set": bson.M{
			"chosen_scenario_id": outcome.ChosenScenarioID,
			"status":             outcome.Status,
			"horizon_days":       outcome.HorizonDays,
			"kpis":               outcome.KPIs,
			"evidence_links":     outcome.EvidenceLinks,
			"summary":            outcome.Summary,
			"notes":              outcome.Notes,
			"updated_at":         now,
		},
		"$setOnInsert": bson.M{
			"_id":        primitive.NewObjectID(),
			"created_at": now,
		},
	}

	result, err := r.collection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		return err
	}

	// If it was an insert, get the new ID
	if result.UpsertedID != nil {
		outcome.ID = result.UpsertedID.(primitive.ObjectID)
		outcome.CreatedAt = now
	}

	return nil
}

// Delete deletes an outcome
func (r *OutcomeRepository) Delete(ctx context.Context, id, userID primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{
		"_id":     id,
		"user_id": userID,
	})
	return err
}

// ExistsForVerdict checks if an outcome exists for a verdict
func (r *OutcomeRepository) ExistsForVerdict(ctx context.Context, verdictID, userID primitive.ObjectID) (bool, error) {
	count, err := r.collection.CountDocuments(ctx, bson.M{
		"verdict_id": verdictID,
		"user_id":    userID,
	})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// ListByUser retrieves all outcomes for a user
func (r *OutcomeRepository) ListByUser(ctx context.Context, userID primitive.ObjectID, limit, offset int64) ([]model.MeasurableOutcome, int64, error) {
	filter := bson.M{"user_id": userID}

	total, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "updated_at", Value: -1}}).
		SetLimit(limit).
		SetSkip(offset)

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var outcomes []model.MeasurableOutcome
	if err := cursor.All(ctx, &outcomes); err != nil {
		return nil, 0, err
	}

	return outcomes, total, nil
}

// GetOutcomeStatusByVerdictIDs gets outcome status for multiple verdicts efficiently
func (r *OutcomeRepository) GetOutcomeStatusByVerdictIDs(ctx context.Context, verdictIDs []primitive.ObjectID, userID primitive.ObjectID) (map[primitive.ObjectID]*model.MeasurableOutcome, error) {
	filter := bson.M{
		"verdict_id": bson.M{"$in": verdictIDs},
		"user_id":    userID,
	}

	opts := options.Find().SetProjection(bson.M{
		"verdict_id":         1,
		"chosen_scenario_id": 1,
		"status":             1,
		"summary":            1,
	})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	result := make(map[primitive.ObjectID]*model.MeasurableOutcome)
	for cursor.Next(ctx) {
		var outcome model.MeasurableOutcome
		if err := cursor.Decode(&outcome); err != nil {
			continue
		}
		result[outcome.VerdictID] = &outcome
	}

	return result, nil
}

