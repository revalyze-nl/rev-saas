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

// ErrorLogRepository handles error log persistence.
type ErrorLogRepository struct {
	collection *mongo.Collection
}

// NewErrorLogRepository creates a new ErrorLogRepository.
func NewErrorLogRepository(db *mongo.Database) *ErrorLogRepository {
	return &ErrorLogRepository{
		collection: db.Collection("error_logs"),
	}
}

// Create inserts a new error log.
func (r *ErrorLogRepository) Create(ctx context.Context, log *model.ErrorLog) error {
	if log.ID.IsZero() {
		log.ID = primitive.NewObjectID()
	}
	if log.Timestamp.IsZero() {
		log.Timestamp = time.Now()
	}
	_, err := r.collection.InsertOne(ctx, log)
	return err
}

// GetRecent returns the most recent error logs.
func (r *ErrorLogRepository) GetRecent(ctx context.Context, limit int, category, level string) ([]*model.ErrorLog, error) {
	filter := bson.M{}
	if category != "" {
		filter["category"] = category
	}
	if level != "" {
		filter["level"] = level
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "timestamp", Value: -1}}).
		SetLimit(int64(limit))

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var logs []*model.ErrorLog
	if err := cursor.All(ctx, &logs); err != nil {
		return nil, err
	}
	return logs, nil
}

// CountByLevel returns the count of errors by level within a time range.
func (r *ErrorLogRepository) CountByLevel(ctx context.Context, level string, since time.Time) (int, error) {
	filter := bson.M{
		"level":     level,
		"timestamp": bson.M{"$gte": since},
	}
	count, err := r.collection.CountDocuments(ctx, filter)
	return int(count), err
}

// CountToday returns total error count for today.
func (r *ErrorLogRepository) CountToday(ctx context.Context) (int, error) {
	today := time.Now().Truncate(24 * time.Hour)
	filter := bson.M{
		"level":     "error",
		"timestamp": bson.M{"$gte": today},
	}
	count, err := r.collection.CountDocuments(ctx, filter)
	return int(count), err
}

// DeleteOlderThan deletes logs older than the specified duration.
func (r *ErrorLogRepository) DeleteOlderThan(ctx context.Context, before time.Time) error {
	_, err := r.collection.DeleteMany(ctx, bson.M{
		"timestamp": bson.M{"$lt": before},
	})
	return err
}


