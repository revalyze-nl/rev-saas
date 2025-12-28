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

const pricingV2Collection = "pricing_v2_plans"

// PricingV2Repository handles pricing v2 data operations
type PricingV2Repository struct {
	collection *mongo.Collection
}

// NewPricingV2Repository creates a new PricingV2Repository
func NewPricingV2Repository(db *mongo.Database) *PricingV2Repository {
	return &PricingV2Repository{
		collection: db.Collection(pricingV2Collection),
	}
}

// Create creates a new pricing v2 plan
func (r *PricingV2Repository) Create(ctx context.Context, plan *model.PricingV2Plan) error {
	plan.ID = primitive.NewObjectID()
	if plan.ExtractedAt.IsZero() {
		plan.ExtractedAt = time.Now()
	}
	_, err := r.collection.InsertOne(ctx, plan)
	return err
}

// CreateMany creates multiple pricing v2 plans
func (r *PricingV2Repository) CreateMany(ctx context.Context, plans []*model.PricingV2Plan) (int, error) {
	if len(plans) == 0 {
		return 0, nil
	}

	docs := make([]interface{}, len(plans))
	for i, plan := range plans {
		plan.ID = primitive.NewObjectID()
		if plan.ExtractedAt.IsZero() {
			plan.ExtractedAt = time.Now()
		}
		docs[i] = plan
	}

	result, err := r.collection.InsertMany(ctx, docs)
	if err != nil {
		return 0, err
	}
	return len(result.InsertedIDs), nil
}

// FindByUserID returns all pricing v2 plans for a user
func (r *PricingV2Repository) FindByUserID(ctx context.Context, userID primitive.ObjectID) ([]model.PricingV2Plan, error) {
	filter := bson.M{"user_id": userID}
	opts := options.Find().SetSort(bson.D{{Key: "extracted_at", Value: -1}})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var plans []model.PricingV2Plan
	if err := cursor.All(ctx, &plans); err != nil {
		return nil, err
	}
	return plans, nil
}

// DeleteByUserID deletes all pricing v2 plans for a user
func (r *PricingV2Repository) DeleteByUserID(ctx context.Context, userID primitive.ObjectID) error {
	filter := bson.M{"user_id": userID}
	_, err := r.collection.DeleteMany(ctx, filter)
	return err
}

// Delete deletes a specific pricing v2 plan
func (r *PricingV2Repository) Delete(ctx context.Context, planID, userID primitive.ObjectID) error {
	filter := bson.M{
		"_id":     planID,
		"user_id": userID,
	}
	_, err := r.collection.DeleteOne(ctx, filter)
	return err
}

// CountByUserID returns the count of plans for a user
func (r *PricingV2Repository) CountByUserID(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	filter := bson.M{"user_id": userID}
	return r.collection.CountDocuments(ctx, filter)
}

// GetByIDAndUser returns a specific plan by ID and user ID
func (r *PricingV2Repository) GetByIDAndUser(ctx context.Context, planID, userID primitive.ObjectID) (*model.PricingV2Plan, error) {
	filter := bson.M{
		"_id":     planID,
		"user_id": userID,
	}
	
	var plan model.PricingV2Plan
	err := r.collection.FindOne(ctx, filter).Decode(&plan)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &plan, nil
}
