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

// ScenarioDeltaRepository handles scenario delta caching
type ScenarioDeltaRepository struct {
	collection *mongo.Collection
}

// NewScenarioDeltaRepository creates a new repository
func NewScenarioDeltaRepository(db *mongo.Database) *ScenarioDeltaRepository {
	coll := db.Collection("scenario_deltas")

	// Create indexes
	indexes := []mongo.IndexModel{
		{Keys: bson.D{
			{Key: "verdict_id", Value: 1},
			{Key: "baseline_scenario_id", Value: 1},
			{Key: "candidate_scenario_id", Value: 1},
		}, Options: options.Index().SetUnique(true)},
	}
	_, _ = coll.Indexes().CreateMany(context.Background(), indexes)

	return &ScenarioDeltaRepository{collection: coll}
}

// Get retrieves a cached delta
func (r *ScenarioDeltaRepository) Get(ctx context.Context, verdictID primitive.ObjectID, baselineID, candidateID string) (*model.ScenarioDelta, error) {
	var delta model.ScenarioDelta
	err := r.collection.FindOne(ctx, bson.M{
		"verdict_id":            verdictID,
		"baseline_scenario_id":  baselineID,
		"candidate_scenario_id": candidateID,
	}).Decode(&delta)

	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &delta, nil
}

// Upsert creates or updates a cached delta
func (r *ScenarioDeltaRepository) Upsert(ctx context.Context, delta *model.ScenarioDelta) error {
	now := time.Now()
	delta.CreatedAt = now

	opts := options.Update().SetUpsert(true)
	filter := bson.M{
		"verdict_id":            delta.VerdictID,
		"baseline_scenario_id":  delta.BaselineScenarioID,
		"candidate_scenario_id": delta.CandidateScenarioID,
	}

	update := bson.M{
		"$set": bson.M{
			"deltas":     delta.Deltas,
			"created_at": now,
		},
		"$setOnInsert": bson.M{
			"_id": primitive.NewObjectID(),
		},
	}

	_, err := r.collection.UpdateOne(ctx, filter, update, opts)
	return err
}

// DeleteForVerdict deletes all cached deltas for a verdict (when scenarios are regenerated)
func (r *ScenarioDeltaRepository) DeleteForVerdict(ctx context.Context, verdictID primitive.ObjectID) error {
	_, err := r.collection.DeleteMany(ctx, bson.M{"verdict_id": verdictID})
	return err
}

