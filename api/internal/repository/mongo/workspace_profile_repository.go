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

// WorkspaceProfileRepository handles workspace profile persistence
type WorkspaceProfileRepository struct {
	collection *mongo.Collection
}

// NewWorkspaceProfileRepository creates a new repository
func NewWorkspaceProfileRepository(db *mongo.Database) *WorkspaceProfileRepository {
	coll := db.Collection("workspace_profiles")

	// Create unique index on user_id
	indexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "user_id", Value: 1}},
		Options: options.Index().SetUnique(true),
	}
	_, _ = coll.Indexes().CreateOne(context.Background(), indexModel)

	return &WorkspaceProfileRepository{collection: coll}
}

// GetByUserID retrieves profile by user ID
func (r *WorkspaceProfileRepository) GetByUserID(ctx context.Context, userID primitive.ObjectID) (*model.WorkspaceProfile, error) {
	var profile model.WorkspaceProfile
	err := r.collection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&profile)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &profile, nil
}

// Create creates a new profile
func (r *WorkspaceProfileRepository) Create(ctx context.Context, profile *model.WorkspaceProfile) error {
	profile.ID = primitive.NewObjectID()
	profile.CreatedAt = time.Now()
	profile.UpdatedAt = time.Now()

	_, err := r.collection.InsertOne(ctx, profile)
	return err
}

// Update updates an existing profile
func (r *WorkspaceProfileRepository) Update(ctx context.Context, profile *model.WorkspaceProfile) error {
	profile.UpdatedAt = time.Now()

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"user_id": profile.UserID},
		bson.M{"$set": profile},
	)
	return err
}

// Upsert creates or updates a profile
func (r *WorkspaceProfileRepository) Upsert(ctx context.Context, profile *model.WorkspaceProfile) error {
	profile.UpdatedAt = time.Now()

	opts := options.Update().SetUpsert(true)
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"user_id": profile.UserID},
		bson.M{
			"$set": profile,
			"$setOnInsert": bson.M{
				"_id":        primitive.NewObjectID(),
				"created_at": time.Now(),
			},
		},
		opts,
	)
	return err
}
