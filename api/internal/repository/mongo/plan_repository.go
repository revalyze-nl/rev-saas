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

// PlanRepository handles plan data operations in MongoDB.
type PlanRepository struct {
	collection *mongo.Collection
}

// NewPlanRepository creates a new PlanRepository.
func NewPlanRepository(db *mongo.Database) *PlanRepository {
	return &PlanRepository{
		collection: db.Collection("plans"),
	}
}

// Create inserts a new plan into the database.
func (r *PlanRepository) Create(ctx context.Context, plan *model.Plan) error {
	plan.CreatedAt = time.Now().UTC()
	result, err := r.collection.InsertOne(ctx, plan)
	if err != nil {
		return err
	}
	// Set the ID on the plan object
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		plan.ID = oid
	}
	return nil
}

// ListByUser retrieves all plans for a specific user.
func (r *PlanRepository) ListByUser(ctx context.Context, userID primitive.ObjectID) ([]*model.Plan, error) {
	filter := bson.M{"user_id": userID}
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var plans []*model.Plan
	for cursor.Next(ctx) {
		var p model.Plan
		if err := cursor.Decode(&p); err != nil {
			return nil, err
		}
		plans = append(plans, &p)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return plans, nil
}

// GetByID retrieves a plan by its ID.
func (r *PlanRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*model.Plan, error) {
	var plan model.Plan
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&plan)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &plan, nil
}

// GetByIDAndUser retrieves a plan by ID and ensures it belongs to the specified user.
func (r *PlanRepository) GetByIDAndUser(ctx context.Context, id primitive.ObjectID, userID primitive.ObjectID) (*model.Plan, error) {
	var plan model.Plan
	filter := bson.M{
		"_id":     id,
		"user_id": userID,
	}
	err := r.collection.FindOne(ctx, filter).Decode(&plan)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &plan, nil
}

// DeleteByIDAndUser deletes a plan by ID, ensuring it belongs to the specified user.
func (r *PlanRepository) DeleteByIDAndUser(ctx context.Context, id primitive.ObjectID, userID primitive.ObjectID) error {
	filter := bson.M{
		"_id":     id,
		"user_id": userID,
	}

	res, err := r.collection.DeleteOne(ctx, filter)
	if err != nil {
		return err
	}

	if res.DeletedCount == 0 {
		return mongo.ErrNoDocuments
	}

	return nil
}

// UpdateByIDAndUser updates a plan by ID, ensuring it belongs to the specified user.
func (r *PlanRepository) UpdateByIDAndUser(ctx context.Context, id primitive.ObjectID, userID primitive.ObjectID, update bson.M) error {
	filter := bson.M{
		"_id":     id,
		"user_id": userID,
	}

	res, err := r.collection.UpdateOne(ctx, filter, bson.M{"$set": update})
	if err != nil {
		return err
	}

	if res.MatchedCount == 0 {
		return mongo.ErrNoDocuments
	}

	return nil
}

// Update updates a plan document in the database.
func (r *PlanRepository) Update(ctx context.Context, plan *model.Plan) error {
	filter := bson.M{
		"_id":     plan.ID,
		"user_id": plan.UserID,
	}

	updateFields := bson.M{
		"name":              plan.Name,
		"price":             plan.Price,
		"currency":          plan.Currency,
		"billing_cycle":     plan.BillingCycle,
		"stripe_price_id":   plan.StripePriceID,
		"stripe_product_id": plan.StripeProductID,
	}

	// Only set stripe_price_lookup if it's not nil
	if plan.StripePriceLookup != nil {
		updateFields["stripe_price_lookup"] = plan.StripePriceLookup
	}

	update := bson.M{"$set": updateFields}

	res, err := r.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return err
	}

	if res.MatchedCount == 0 {
		return mongo.ErrNoDocuments
	}

	return nil
}


