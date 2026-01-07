package mongo

import (
	"context"
	"math"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"rev-saas-api/internal/model"
)

// DecisionRepository handles pricing decision data operations in MongoDB.
type DecisionRepository struct {
	decisions *mongo.Collection
	outcomes  *mongo.Collection
}

// NewDecisionRepository creates a new DecisionRepository.
func NewDecisionRepository(db *mongo.Database) *DecisionRepository {
	repo := &DecisionRepository{
		decisions: db.Collection("pricing_decisions"),
		outcomes:  db.Collection("decision_outcomes"),
	}

	// Create indexes
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Index on user_id for fast user-scoped queries
	repo.decisions.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "user_id", Value: 1}},
	})

	// Compound index for listing with filters
	repo.decisions.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "user_id", Value: 1},
			{Key: "created_at", Value: -1},
		},
	})

	// Text index for search
	repo.decisions.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "company_name", Value: "text"},
			{Key: "website_url", Value: "text"},
			{Key: "verdict_headline", Value: "text"},
		},
	})

	// Index on decision_id for outcomes
	repo.outcomes.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "decision_id", Value: 1}},
	})

	return repo
}

// Create inserts a new pricing decision with initial status event.
func (r *DecisionRepository) Create(ctx context.Context, decision *model.PricingDecision) error {
	now := time.Now().UTC()
	decision.CreatedAt = now
	decision.UpdatedAt = now
	decision.IsDeleted = false
	if decision.Status == "" {
		decision.Status = model.StatusProposed
	}
	if decision.Tags == nil {
		decision.Tags = []string{}
	}

	// Create initial status event
	initialEvent := model.StatusEvent{
		ID:        primitive.NewObjectID(),
		Status:    decision.Status,
		CreatedBy: decision.UserID,
		CreatedAt: now,
	}
	decision.StatusEvents = []model.StatusEvent{initialEvent}

	result, err := r.decisions.InsertOne(ctx, decision)
	if err != nil {
		return err
	}

	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		decision.ID = oid
	}
	return nil
}

// GetByID retrieves a decision by ID.
func (r *DecisionRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*model.PricingDecision, error) {
	var decision model.PricingDecision
	err := r.decisions.FindOne(ctx, bson.M{"_id": id}).Decode(&decision)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &decision, nil
}

// GetByIDAndUser retrieves a decision by ID ensuring it belongs to the user (excludes soft-deleted).
func (r *DecisionRepository) GetByIDAndUser(ctx context.Context, id, userID primitive.ObjectID) (*model.PricingDecision, error) {
	var decision model.PricingDecision
	filter := bson.M{
		"_id":        id,
		"user_id":    userID,
		"is_deleted": bson.M{"$ne": true},
	}
	err := r.decisions.FindOne(ctx, filter).Decode(&decision)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &decision, nil
}

// List retrieves decisions with filters and pagination, including outcome summaries.
func (r *DecisionRepository) List(ctx context.Context, userID primitive.ObjectID, filters model.DecisionListFilters) (*model.DecisionListResponse, error) {
	// Build filter - exclude soft-deleted
	filter := bson.M{
		"user_id":    userID,
		"is_deleted": bson.M{"$ne": true},
	}

	if filters.Query != "" {
		filter["$text"] = bson.M{"$search": filters.Query}
	}
	if filters.Status != "" {
		filter["status"] = filters.Status
	}
	if filters.DecisionType != "" {
		filter["decision_type"] = filters.DecisionType
	}
	if filters.Confidence != "" {
		filter["confidence_level"] = filters.Confidence
	}
	if filters.Risk != "" {
		filter["risk_level"] = filters.Risk
	}
	if filters.FromDate != nil || filters.ToDate != nil {
		dateFilter := bson.M{}
		if filters.FromDate != nil {
			dateFilter["$gte"] = *filters.FromDate
		}
		if filters.ToDate != nil {
			dateFilter["$lte"] = *filters.ToDate
		}
		filter["created_at"] = dateFilter
	}

	// Count total
	total, err := r.decisions.CountDocuments(ctx, filter)
	if err != nil {
		return nil, err
	}

	// Set defaults
	page := filters.Page
	if page < 1 {
		page = 1
	}
	pageSize := filters.PageSize
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	// Build sort
	sortBy := filters.SortBy
	if sortBy == "" {
		sortBy = "created_at"
	}
	sortOrder := filters.SortOrder
	if sortOrder == 0 {
		sortOrder = -1 // Default descending
	}

	// Query options
	skip := int64((page - 1) * pageSize)
	limit := int64(pageSize)
	opts := options.Find().
		SetSort(bson.D{{Key: sortBy, Value: sortOrder}}).
		SetSkip(skip).
		SetLimit(limit)

	cursor, err := r.decisions.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var decisions []*model.PricingDecision
	var decisionIDs []primitive.ObjectID
	for cursor.Next(ctx) {
		var d model.PricingDecision
		if err := cursor.Decode(&d); err != nil {
			return nil, err
		}
		decisions = append(decisions, &d)
		decisionIDs = append(decisionIDs, d.ID)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	// Fetch latest outcomes for these decisions
	outcomeMap := make(map[primitive.ObjectID]*model.DecisionOutcome)
	if len(decisionIDs) > 0 {
		outcomeCursor, err := r.outcomes.Find(ctx, bson.M{
			"decision_id": bson.M{"$in": decisionIDs},
		}, options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
		if err == nil {
			defer outcomeCursor.Close(ctx)
			for outcomeCursor.Next(ctx) {
				var o model.DecisionOutcome
				if err := outcomeCursor.Decode(&o); err == nil {
					// Only keep the latest outcome per decision
					if _, exists := outcomeMap[o.DecisionID]; !exists {
						outcomeMap[o.DecisionID] = &o
					}
				}
			}
		}
	}

	// Build list items with outcome summaries
	listItems := make([]*model.DecisionListItem, 0, len(decisions))
	for _, d := range decisions {
		latestOutcome := outcomeMap[d.ID]

		// Calculate days since last status change
		daysSinceStatus := 0
		if len(d.StatusEvents) > 0 {
			lastEvent := d.StatusEvents[len(d.StatusEvents)-1]
			daysSinceStatus = int(time.Since(lastEvent.CreatedAt).Hours() / 24)
		}

		listItems = append(listItems, &model.DecisionListItem{
			PricingDecision: d,
			OutcomeSummary:  d.GetOutcomeSummary(latestOutcome),
			LatestOutcome:   latestOutcome,
			DaysSinceStatus: daysSinceStatus,
		})
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	return &model.DecisionListResponse{
		Decisions:  listItems,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

// UpdateStatusWithEvent updates the status of a decision and adds an audit event.
func (r *DecisionRepository) UpdateStatusWithEvent(ctx context.Context, id, userID primitive.ObjectID, req model.UpdateStatusRequest) error {
	filter := bson.M{
		"_id":        id,
		"user_id":    userID,
		"is_deleted": bson.M{"$ne": true},
	}

	now := time.Now().UTC()

	// Create status event
	statusEvent := model.StatusEvent{
		ID:            primitive.NewObjectID(),
		Status:        req.Status,
		Reason:        req.Reason,
		ImplementedAt: req.ImplementedAt,
		RollbackAt:    req.RollbackAt,
		CreatedBy:     userID,
		CreatedAt:     now,
	}

	// Build update based on status
	setFields := bson.M{
		"status":     req.Status,
		"updated_at": now,
	}

	switch req.Status {
	case model.StatusImplemented:
		if req.ImplementedAt != nil {
			setFields["implemented_at"] = *req.ImplementedAt
		} else {
			setFields["implemented_at"] = now
		}
	case model.StatusRejected:
		setFields["rejection_reason"] = req.Reason
	case model.StatusRolledBack:
		setFields["rollback_reason"] = req.Reason
		if req.RollbackAt != nil {
			setFields["rollback_at"] = *req.RollbackAt
		} else {
			setFields["rollback_at"] = now
		}
	}

	update := bson.M{
		"$set":  setFields,
		"$push": bson.M{"status_events": statusEvent},
	}

	result, err := r.decisions.UpdateOne(ctx, filter, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return mongo.ErrNoDocuments
	}
	return nil
}

// UpdateStatus updates the status of a decision (legacy - use UpdateStatusWithEvent).
func (r *DecisionRepository) UpdateStatus(ctx context.Context, id, userID primitive.ObjectID, status model.DecisionStatus) error {
	return r.UpdateStatusWithEvent(ctx, id, userID, model.UpdateStatusRequest{Status: status})
}

// Delete soft-deletes a decision.
func (r *DecisionRepository) Delete(ctx context.Context, id, userID primitive.ObjectID) error {
	filter := bson.M{
		"_id":        id,
		"user_id":    userID,
		"is_deleted": bson.M{"$ne": true},
	}

	now := time.Now().UTC()
	update := bson.M{
		"$set": bson.M{
			"is_deleted": true,
			"deleted_at": now,
			"updated_at": now,
		},
	}

	result, err := r.decisions.UpdateOne(ctx, filter, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return mongo.ErrNoDocuments
	}

	return nil
}

// HardDelete permanently removes a decision and its outcomes.
func (r *DecisionRepository) HardDelete(ctx context.Context, id, userID primitive.ObjectID) error {
	filter := bson.M{
		"_id":     id,
		"user_id": userID,
	}

	result, err := r.decisions.DeleteOne(ctx, filter)
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return mongo.ErrNoDocuments
	}

	// Also delete associated outcomes
	r.outcomes.DeleteMany(ctx, bson.M{"decision_id": id})

	return nil
}

// CreateOutcome inserts a new outcome for a decision with auto-calculated deltaPercent.
func (r *DecisionRepository) CreateOutcome(ctx context.Context, outcome *model.DecisionOutcome) error {
	now := time.Now().UTC()
	outcome.CreatedAt = now
	outcome.UpdatedAt = now

	// Calculate delta percent if before and after are provided
	if outcome.MetricBefore != nil && outcome.MetricAfter != nil && *outcome.MetricBefore != 0 {
		delta := ((*outcome.MetricAfter - *outcome.MetricBefore) / *outcome.MetricBefore) * 100
		outcome.DeltaPercent = &delta
	}

	result, err := r.outcomes.InsertOne(ctx, outcome)
	if err != nil {
		return err
	}

	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		outcome.ID = oid
	}
	return nil
}

// ListOutcomes retrieves all outcomes for a decision.
func (r *DecisionRepository) ListOutcomes(ctx context.Context, decisionID primitive.ObjectID) ([]*model.DecisionOutcome, error) {
	filter := bson.M{"decision_id": decisionID}
	opts := options.Find().SetSort(bson.D{{Key: "window_days", Value: 1}})

	cursor, err := r.outcomes.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var outcomes []*model.DecisionOutcome
	for cursor.Next(ctx) {
		var o model.DecisionOutcome
		if err := cursor.Decode(&o); err != nil {
			return nil, err
		}
		outcomes = append(outcomes, &o)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return outcomes, nil
}

// GetMultipleByIDsAndUser retrieves multiple decisions by IDs for comparison (up to 3).
func (r *DecisionRepository) GetMultipleByIDsAndUser(ctx context.Context, ids []primitive.ObjectID, userID primitive.ObjectID) ([]*model.DecisionCompareItem, error) {
	if len(ids) == 0 || len(ids) > 3 {
		return nil, nil
	}

	filter := bson.M{
		"_id":        bson.M{"$in": ids},
		"user_id":    userID,
		"is_deleted": bson.M{"$ne": true},
	}

	cursor, err := r.decisions.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var decisions []*model.PricingDecision
	var decisionIDs []primitive.ObjectID
	for cursor.Next(ctx) {
		var d model.PricingDecision
		if err := cursor.Decode(&d); err != nil {
			return nil, err
		}
		decisions = append(decisions, &d)
		decisionIDs = append(decisionIDs, d.ID)
	}

	// Fetch latest outcomes
	outcomeMap := make(map[primitive.ObjectID]*model.DecisionOutcome)
	if len(decisionIDs) > 0 {
		outcomeCursor, err := r.outcomes.Find(ctx, bson.M{
			"decision_id": bson.M{"$in": decisionIDs},
		}, options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
		if err == nil {
			defer outcomeCursor.Close(ctx)
			for outcomeCursor.Next(ctx) {
				var o model.DecisionOutcome
				if err := outcomeCursor.Decode(&o); err == nil {
					if _, exists := outcomeMap[o.DecisionID]; !exists {
						outcomeMap[o.DecisionID] = &o
					}
				}
			}
		}
	}

	// Build compare items
	items := make([]*model.DecisionCompareItem, 0, len(decisions))
	for _, d := range decisions {
		items = append(items, &model.DecisionCompareItem{
			PricingDecision: d,
			LatestOutcome:   outcomeMap[d.ID],
		})
	}

	return items, nil
}

// DeleteAllByUserID deletes all decisions and outcomes for a user.
func (r *DecisionRepository) DeleteAllByUserID(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	// Get all decision IDs for this user
	cursor, err := r.decisions.Find(ctx, bson.M{"user_id": userID}, options.Find().SetProjection(bson.M{"_id": 1}))
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)

	var decisionIDs []primitive.ObjectID
	for cursor.Next(ctx) {
		var doc struct {
			ID primitive.ObjectID `bson:"_id"`
		}
		if err := cursor.Decode(&doc); err != nil {
			continue
		}
		decisionIDs = append(decisionIDs, doc.ID)
	}

	// Delete outcomes for these decisions
	if len(decisionIDs) > 0 {
		r.outcomes.DeleteMany(ctx, bson.M{"decision_id": bson.M{"$in": decisionIDs}})
	}

	// Delete decisions
	result, err := r.decisions.DeleteMany(ctx, bson.M{"user_id": userID})
	if err != nil {
		return 0, err
	}

	return result.DeletedCount, nil
}
