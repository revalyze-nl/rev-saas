package mongo

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"rev-saas-api/internal/model"
)

// CompetitorV2Repository handles saved competitor operations
type CompetitorV2Repository struct {
	collection *mongo.Collection
}

// NewCompetitorV2Repository creates a new CompetitorV2Repository
func NewCompetitorV2Repository(db *mongo.Database) *CompetitorV2Repository {
	return &CompetitorV2Repository{
		collection: db.Collection("competitors_v2"),
	}
}

// Create saves a new competitor
func (r *CompetitorV2Repository) Create(ctx context.Context, competitor *model.SavedCompetitor) error {
	competitor.CreatedAt = time.Now()
	competitor.UpdatedAt = time.Now()

	result, err := r.collection.InsertOne(ctx, competitor)
	if err != nil {
		return err
	}

	competitor.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// FindByUserID returns all competitors for a user
func (r *CompetitorV2Repository) FindByUserID(ctx context.Context, userID primitive.ObjectID) ([]model.SavedCompetitor, error) {
	filter := bson.M{"user_id": userID}

	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var competitors []model.SavedCompetitor
	if err := cursor.All(ctx, &competitors); err != nil {
		return nil, err
	}

	return competitors, nil
}

// CountByUserID returns the count of competitors for a user
func (r *CompetitorV2Repository) CountByUserID(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	filter := bson.M{"user_id": userID}
	return r.collection.CountDocuments(ctx, filter)
}

// Delete removes a competitor by ID
func (r *CompetitorV2Repository) Delete(ctx context.Context, id primitive.ObjectID, userID primitive.ObjectID) error {
	filter := bson.M{
		"_id":     id,
		"user_id": userID,
	}

	_, err := r.collection.DeleteOne(ctx, filter)
	return err
}

// DeleteAllByUserID removes all competitors for a user
func (r *CompetitorV2Repository) DeleteAllByUserID(ctx context.Context, userID primitive.ObjectID) error {
	filter := bson.M{"user_id": userID}
	_, err := r.collection.DeleteMany(ctx, filter)
	return err
}

// FindByID returns a competitor by ID
func (r *CompetitorV2Repository) FindByID(ctx context.Context, id primitive.ObjectID) (*model.SavedCompetitor, error) {
	filter := bson.M{"_id": id}

	var competitor model.SavedCompetitor
	err := r.collection.FindOne(ctx, filter).Decode(&competitor)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &competitor, nil
}

