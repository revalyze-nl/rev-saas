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

// UserRepository handles user data operations in MongoDB.
type UserRepository struct {
	collection *mongo.Collection
}

// NewUserRepository creates a new UserRepository.
func NewUserRepository(db *mongo.Database) *UserRepository {
	return &UserRepository{
		collection: db.Collection("users"),
	}
}

// Create inserts a new user into the database.
func (r *UserRepository) Create(ctx context.Context, user *model.User) error {
	result, err := r.collection.InsertOne(ctx, user)
	if err != nil {
		return err
	}
	// Set the ID on the user object
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		user.ID = oid
	}
	return nil
}

// GetByEmail retrieves a user by their email address.
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	var user model.User
	err := r.collection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetByID retrieves a user by their ID (ObjectID).
func (r *UserRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*model.User, error) {
	var user model.User
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetByIDString retrieves a user by their ID (string).
func (r *UserRepository) GetByIDString(ctx context.Context, id string) (*model.User, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	return r.GetByID(ctx, oid)
}

// Update updates a user in the database.
func (r *UserRepository) Update(ctx context.Context, user *model.User) error {
	filter := bson.M{"_id": user.ID}
	update := bson.M{
		"$set": bson.M{
			"email":                user.Email,
			"full_name":            user.FullName,
			"role":                 user.Role,
			"plan":                 user.Plan,
			"analysis_total_used":  user.AnalysisTotalUsed,
			"analysis_month_count": user.AnalysisMonthCount,
			"analysis_month_start": user.AnalysisMonthStart,
			"trial_expires_at":     user.TrialExpiresAt,
		},
	}

	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

// UpdatePlan updates only the user's plan field.
func (r *UserRepository) UpdatePlan(ctx context.Context, userID primitive.ObjectID, plan string) error {
	filter := bson.M{"_id": userID}
	update := bson.M{
		"$set": bson.M{
			"plan": plan,
		},
	}

	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

// GetByEmailVerifyTokenHash finds a user by their email verification token hash.
func (r *UserRepository) GetByEmailVerifyTokenHash(ctx context.Context, tokenHash string) (*model.User, error) {
	var user model.User
	err := r.collection.FindOne(ctx, bson.M{"email_verify_token_hash": tokenHash}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// UpdateEmailVerificationFields updates only the email verification related fields for a user.
func (r *UserRepository) UpdateEmailVerificationFields(ctx context.Context, userID primitive.ObjectID,
	emailVerified bool, tokenHash string, expiresAt *time.Time, sentAt *time.Time) error {
	filter := bson.M{"_id": userID}
	update := bson.M{
		"$set": bson.M{
			"email_verified":          emailVerified,
			"email_verify_token_hash": tokenHash,
			"email_verify_expires_at": expiresAt,
			"email_verify_sent_at":    sentAt,
		},
	}
	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

// CountAll returns the total number of users.
func (r *UserRepository) CountAll(ctx context.Context) (int, error) {
	count, err := r.collection.CountDocuments(ctx, bson.M{})
	return int(count), err
}

// GetRecent returns the most recent users.
func (r *UserRepository) GetRecent(ctx context.Context, limit int) ([]*model.User, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(int64(limit))
	cursor, err := r.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []*model.User
	if err := cursor.All(ctx, &users); err != nil {
		return nil, err
	}
	return users, nil
}

// GetPaginated returns paginated users with optional search and filter.
func (r *UserRepository) GetPaginated(ctx context.Context, offset, limit int, search, planFilter string) ([]*model.User, int, error) {
	filter := bson.M{}
	if search != "" {
		filter["email"] = bson.M{"$regex": search, "$options": "i"}
	}
	if planFilter != "" {
		filter["plan"] = planFilter
	}

	// Get total count
	total, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	// Get paginated results
	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetSkip(int64(offset)).
		SetLimit(int64(limit))

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var users []*model.User
	if err := cursor.All(ctx, &users); err != nil {
		return nil, 0, err
	}

	return users, int(total), nil
}

// UpdateFields updates specific fields for a user.
func (r *UserRepository) UpdateFields(ctx context.Context, userID primitive.ObjectID, updates map[string]interface{}) error {
	filter := bson.M{"_id": userID}
	update := bson.M{"$set": updates}
	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

// Delete removes a user from the database.
func (r *UserRepository) Delete(ctx context.Context, userID primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": userID})
	return err
}

