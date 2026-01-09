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

// ScenarioRepository handles scenario persistence
type ScenarioRepository struct {
	collection *mongo.Collection
}

// NewScenarioRepository creates a new repository
func NewScenarioRepository(db *mongo.Database) *ScenarioRepository {
	coll := db.Collection("scenarios")

	// Create indexes
	indexes := []mongo.IndexModel{
		{Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "decision_id", Value: 1}, {Key: "version", Value: -1}}},
		{Keys: bson.D{{Key: "decision_id", Value: 1}, {Key: "is_deleted", Value: 1}}},
	}
	_, _ = coll.Indexes().CreateMany(context.Background(), indexes)

	return &ScenarioRepository{collection: coll}
}

// Create creates a new scenario set
func (r *ScenarioRepository) Create(ctx context.Context, scenarioSet *model.ScenarioSet) error {
	scenarioSet.ID = primitive.NewObjectID()
	scenarioSet.CreatedAt = time.Now()
	scenarioSet.UpdatedAt = time.Now()

	_, err := r.collection.InsertOne(ctx, scenarioSet)
	return err
}

// GetByDecisionID retrieves the latest scenario set for a decision
func (r *ScenarioRepository) GetByDecisionID(ctx context.Context, decisionID, userID primitive.ObjectID) (*model.ScenarioSet, error) {
	opts := options.FindOne().SetSort(bson.D{{Key: "version", Value: -1}})

	var scenarioSet model.ScenarioSet
	err := r.collection.FindOne(ctx, bson.M{
		"decision_id": decisionID,
		"user_id":     userID,
		"is_deleted":  bson.M{"$ne": true},
	}, opts).Decode(&scenarioSet)

	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &scenarioSet, nil
}

// GetByID retrieves a scenario set by its ID
func (r *ScenarioRepository) GetByID(ctx context.Context, id, userID primitive.ObjectID) (*model.ScenarioSet, error) {
	var scenarioSet model.ScenarioSet
	err := r.collection.FindOne(ctx, bson.M{
		"_id":        id,
		"user_id":    userID,
		"is_deleted": bson.M{"$ne": true},
	}).Decode(&scenarioSet)

	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &scenarioSet, nil
}

// GetLatestVersion retrieves the latest version number for a decision
func (r *ScenarioRepository) GetLatestVersion(ctx context.Context, decisionID, userID primitive.ObjectID) (int, error) {
	opts := options.FindOne().
		SetSort(bson.D{{Key: "version", Value: -1}}).
		SetProjection(bson.M{"version": 1})

	var result struct {
		Version int `bson:"version"`
	}
	err := r.collection.FindOne(ctx, bson.M{
		"decision_id": decisionID,
		"user_id":     userID,
		"is_deleted":  bson.M{"$ne": true},
	}, opts).Decode(&result)

	if err == mongo.ErrNoDocuments {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	return result.Version, nil
}

// SoftDelete marks a scenario set as deleted
func (r *ScenarioRepository) SoftDelete(ctx context.Context, id, userID primitive.ObjectID) error {
	now := time.Now()
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id, "user_id": userID},
		bson.M{"$set": bson.M{"is_deleted": true, "deleted_at": now}},
	)
	return err
}

// ExistsForDecision checks if scenarios exist for a decision
func (r *ScenarioRepository) ExistsForDecision(ctx context.Context, decisionID, userID primitive.ObjectID) (bool, error) {
	count, err := r.collection.CountDocuments(ctx, bson.M{
		"decision_id": decisionID,
		"user_id":     userID,
		"is_deleted":  bson.M{"$ne": true},
	})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// CountByUserSince counts scenario sets created by a user since a given time
func (r *ScenarioRepository) CountByUserSince(ctx context.Context, userID primitive.ObjectID, since time.Time) (int64, error) {
	return r.collection.CountDocuments(ctx, bson.M{
		"user_id":    userID,
		"created_at": bson.M{"$gte": since},
		"is_deleted": bson.M{"$ne": true},
	})
}

