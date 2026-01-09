package mongo

import (
	"context"
	"fmt"
	"math"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"rev-saas-api/internal/model"
)

// DecisionV2ListParams contains list query parameters
type DecisionV2ListParams struct {
	Status        string
	Segment       string
	KPI           string
	MinConfidence float64
	From          *time.Time
	To            *time.Time
	Search        string
	Page          int
	PageSize      int
}

// DecisionV2Repository handles decision persistence with versioning
type DecisionV2Repository struct {
	collection *mongo.Collection
}

// NewDecisionV2Repository creates a new repository
func NewDecisionV2Repository(db *mongo.Database) *DecisionV2Repository {
	coll := db.Collection("decisions")

	// Create indexes
	indexes := []mongo.IndexModel{
		{Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "created_at", Value: -1}}},
		{Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "status", Value: 1}}},
		{Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "context.primary_kpi.value", Value: 1}}},
		{Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "context.market.segment.value", Value: 1}}},
		{Keys: bson.D{{Key: "website_url", Value: 1}, {Key: "user_id", Value: 1}}},
		{Keys: bson.D{{Key: "outcomes.outcome_type", Value: 1}, {Key: "outcomes.is_correction", Value: 1}}},
	}
	_, _ = coll.Indexes().CreateMany(context.Background(), indexes)

	return &DecisionV2Repository{collection: coll}
}

// Create creates a new decision
func (r *DecisionV2Repository) Create(ctx context.Context, decision *model.DecisionV2) error {
	decision.ID = primitive.NewObjectID()
	decision.CreatedAt = time.Now()
	decision.UpdatedAt = time.Now()

	_, err := r.collection.InsertOne(ctx, decision)
	return err
}

// GetByIDAndUser retrieves a decision by ID with user ownership check
func (r *DecisionV2Repository) GetByIDAndUser(ctx context.Context, id, userID primitive.ObjectID) (*model.DecisionV2, error) {
	var decision model.DecisionV2
	err := r.collection.FindOne(ctx, bson.M{
		"_id":        id,
		"user_id":    userID,
		"is_deleted": bson.M{"$ne": true},
	}).Decode(&decision)

	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &decision, nil
}

// List retrieves decisions with filters and pagination
func (r *DecisionV2Repository) List(ctx context.Context, userID primitive.ObjectID, params DecisionV2ListParams) (*model.DecisionListResponseV2, error) {
	filter := bson.M{
		"user_id":    userID,
		"is_deleted": bson.M{"$ne": true},
	}

	if params.Status != "" {
		filter["status"] = params.Status
	}
	if params.Segment != "" {
		filter["context.market.segment.value"] = params.Segment
	}
	if params.KPI != "" {
		filter["context.primary_kpi.value"] = params.KPI
	}
	if params.MinConfidence > 0 {
		filter["verdict.confidence_score"] = bson.M{"$gte": params.MinConfidence}
	}
	if params.From != nil {
		if filter["created_at"] == nil {
			filter["created_at"] = bson.M{}
		}
		filter["created_at"].(bson.M)["$gte"] = params.From
	}
	if params.To != nil {
		if filter["created_at"] == nil {
			filter["created_at"] = bson.M{}
		}
		filter["created_at"].(bson.M)["$lte"] = params.To
	}
	if params.Search != "" {
		filter["$or"] = []bson.M{
			{"company_name": bson.M{"$regex": params.Search, "$options": "i"}},
			{"website_url": bson.M{"$regex": params.Search, "$options": "i"}},
			{"verdict.headline": bson.M{"$regex": params.Search, "$options": "i"}},
		}
	}

	// Defaults
	page := params.Page
	if page < 1 {
		page = 1
	}
	pageSize := params.PageSize
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	skip := (page - 1) * pageSize

	// Count total
	total, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, err
	}

	// Fetch documents
	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetSkip(int64(skip)).
		SetLimit(int64(pageSize))

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var decisions []model.DecisionV2
	if err := cursor.All(ctx, &decisions); err != nil {
		return nil, err
	}

	// Transform to list items
	items := make([]model.DecisionListItemV2, len(decisions))
	for i, d := range decisions {
		items[i] = model.DecisionListItemV2{
			ID:               d.ID,
			CompanyName:      d.CompanyName,
			WebsiteURL:       d.WebsiteURL,
			VerdictHeadline:  d.Verdict.Headline,
			VerdictSummary:   d.Verdict.Summary,
			ConfidenceScore:  d.Verdict.ConfidenceScore,
			ConfidenceLabel:  d.Verdict.ConfidenceLabel,
			RiskScore:        d.Verdict.WhatToExpect.RiskScore,
			RiskLabel:        d.Verdict.WhatToExpect.RiskLabel,
			Status:           d.Status,
			Context:          d.Context,
			OutcomeSummary:   getOutcomeSummaryFromDecision(d),
			HasScenarios:     d.ScenariosID != nil,
			ChosenScenarioID: d.ChosenScenarioID,
			CreatedAt:        d.CreatedAt,
		}
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	return &model.DecisionListResponseV2{
		Decisions:  items,
		Page:       page,
		PageSize:   pageSize,
		Total:      total,
		TotalPages: totalPages,
	}, nil
}

// UpdateContext creates a new context version
func (r *DecisionV2Repository) UpdateContext(
	ctx context.Context,
	id, userID primitive.ObjectID,
	newContext model.DecisionContextV2,
	version model.ContextVersion,
) (*model.DecisionV2, error) {
	now := time.Now()

	update := bson.M{
		"$set": bson.M{
			"context":         newContext,
			"context_version": version.Version,
			"updated_at":      now,
		},
		"$push": bson.M{
			"context_versions": version,
		},
	}

	result := r.collection.FindOneAndUpdate(
		ctx,
		bson.M{"_id": id, "user_id": userID, "is_deleted": bson.M{"$ne": true}},
		update,
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)

	var decision model.DecisionV2
	if err := result.Decode(&decision); err != nil {
		return nil, err
	}
	return &decision, nil
}

// UpdateVerdict creates a new verdict version
func (r *DecisionV2Repository) UpdateVerdict(
	ctx context.Context,
	id, userID primitive.ObjectID,
	newVerdict model.VerdictV2,
	version model.VerdictVersion,
	modelMeta model.ModelMetaV2,
) (*model.DecisionV2, error) {
	now := time.Now()

	update := bson.M{
		"$set": bson.M{
			"verdict":         newVerdict,
			"verdict_version": version.Version,
			"model_meta":      modelMeta,
			"expected_impact": model.ExpectedImpactV2{
				RevenueRange: newVerdict.SupportingDetails.ExpectedRevenueImpact,
				ChurnNote:    newVerdict.SupportingDetails.ChurnOutlook,
			},
			"updated_at": now,
		},
		"$push": bson.M{
			"verdict_versions": version,
		},
	}

	result := r.collection.FindOneAndUpdate(
		ctx,
		bson.M{"_id": id, "user_id": userID, "is_deleted": bson.M{"$ne": true}},
		update,
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)

	var decision model.DecisionV2
	if err := result.Decode(&decision); err != nil {
		return nil, err
	}
	return &decision, nil
}

// UpdateStatus appends a status event
func (r *DecisionV2Repository) UpdateStatus(
	ctx context.Context,
	id, userID primitive.ObjectID,
	newStatus string,
	event model.StatusEventV2,
) (*model.DecisionV2, error) {
	now := time.Now()

	update := bson.M{
		"$set": bson.M{
			"status":     newStatus,
			"updated_at": now,
		},
		"$push": bson.M{
			"status_events": event,
		},
	}

	result := r.collection.FindOneAndUpdate(
		ctx,
		bson.M{"_id": id, "user_id": userID, "is_deleted": bson.M{"$ne": true}},
		update,
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)

	var decision model.DecisionV2
	if err := result.Decode(&decision); err != nil {
		return nil, err
	}
	return &decision, nil
}

// AddOutcome appends an outcome
func (r *DecisionV2Repository) AddOutcome(
	ctx context.Context,
	id, userID primitive.ObjectID,
	outcome model.OutcomeV2,
) (*model.DecisionV2, error) {
	now := time.Now()

	update := bson.M{
		"$set": bson.M{
			"updated_at": now,
		},
		"$push": bson.M{
			"outcomes": outcome,
		},
	}

	result := r.collection.FindOneAndUpdate(
		ctx,
		bson.M{"_id": id, "user_id": userID, "is_deleted": bson.M{"$ne": true}},
		update,
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)

	var decision model.DecisionV2
	if err := result.Decode(&decision); err != nil {
		return nil, err
	}
	return &decision, nil
}

// GetMultipleByIDs retrieves multiple decisions by IDs
func (r *DecisionV2Repository) GetMultipleByIDs(
	ctx context.Context,
	userID primitive.ObjectID,
	ids []primitive.ObjectID,
) ([]*model.DecisionV2, error) {
	cursor, err := r.collection.Find(ctx, bson.M{
		"_id":        bson.M{"$in": ids},
		"user_id":    userID,
		"is_deleted": bson.M{"$ne": true},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var decisions []*model.DecisionV2
	if err := cursor.All(ctx, &decisions); err != nil {
		return nil, err
	}
	return decisions, nil
}

// SoftDelete marks a decision as deleted
func (r *DecisionV2Repository) SoftDelete(ctx context.Context, id, userID primitive.ObjectID) error {
	now := time.Now()
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id, "user_id": userID},
		bson.M{"$set": bson.M{"is_deleted": true, "deleted_at": now}},
	)
	return err
}

// LinkScenarios links a scenario set to a decision
func (r *DecisionV2Repository) LinkScenarios(ctx context.Context, id, userID, scenariosID primitive.ObjectID) error {
	now := time.Now()
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id, "user_id": userID, "is_deleted": bson.M{"$ne": true}},
		bson.M{"$set": bson.M{"scenarios_id": scenariosID, "updated_at": now}},
	)
	return err
}

// SetChosenScenario sets the chosen scenario for a decision
func (r *DecisionV2Repository) SetChosenScenario(ctx context.Context, id, userID primitive.ObjectID, scenarioID string) error {
	now := time.Now()
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id, "user_id": userID, "is_deleted": bson.M{"$ne": true}},
		bson.M{"$set": bson.M{
			"chosen_scenario_id": scenarioID,
			"chosen_scenario_at": now,
			"episode_status":     "path_chosen",
			"updated_at":         now,
		}},
	)
	return err
}

// UpdateEpisodeStatus updates the episode status of a decision
func (r *DecisionV2Repository) UpdateEpisodeStatus(ctx context.Context, id, userID primitive.ObjectID, episodeStatus string) error {
	now := time.Now()
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id, "user_id": userID, "is_deleted": bson.M{"$ne": true}},
		bson.M{"$set": bson.M{
			"episode_status": episodeStatus,
			"updated_at":     now,
		}},
	)
	return err
}

// LinkOutcome links a measurable outcome to a decision
func (r *DecisionV2Repository) LinkOutcome(ctx context.Context, id, userID, outcomeID primitive.ObjectID) error {
	now := time.Now()
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id, "user_id": userID, "is_deleted": bson.M{"$ne": true}},
		bson.M{"$set": bson.M{
			"outcome_id": outcomeID,
			"updated_at": now,
		}},
	)
	return err
}

// GetScenariosExistenceForDecisions returns a map of decision IDs to whether they have scenarios
func (r *DecisionV2Repository) GetScenariosExistenceForDecisions(ctx context.Context, userID primitive.ObjectID, decisionIDs []primitive.ObjectID) (map[primitive.ObjectID]bool, error) {
	cursor, err := r.collection.Find(ctx, bson.M{
		"_id":        bson.M{"$in": decisionIDs},
		"user_id":    userID,
		"is_deleted": bson.M{"$ne": true},
	}, options.Find().SetProjection(bson.M{"_id": 1, "scenarios_id": 1}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	result := make(map[primitive.ObjectID]bool)
	for cursor.Next(ctx) {
		var doc struct {
			ID          primitive.ObjectID  `bson:"_id"`
			ScenariosID *primitive.ObjectID `bson:"scenarios_id"`
		}
		if err := cursor.Decode(&doc); err != nil {
			continue
		}
		result[doc.ID] = doc.ScenariosID != nil
	}
	return result, nil
}

// Helper to get outcome summary from a full decision
func getOutcomeSummaryFromDecision(d model.DecisionV2) string {
	if len(d.Outcomes) == 0 {
		return ""
	}

	// Find latest effective outcome
	correctionMap := make(map[primitive.ObjectID]bool)
	for _, o := range d.Outcomes {
		if o.IsCorrection && o.CorrectsOutcomeID != nil {
			correctionMap[*o.CorrectsOutcomeID] = true
		}
	}

	var latest *model.OutcomeV2
	for i := range d.Outcomes {
		o := &d.Outcomes[i]
		// Skip if superseded
		if correctionMap[o.ID] {
			continue
		}
		if latest == nil || o.CreatedAt.After(latest.CreatedAt) {
			latest = o
		}
	}

	if latest == nil || latest.DeltaPercent == nil {
		return ""
	}

	sign := "+"
	if *latest.DeltaPercent < 0 {
		sign = ""
	}

	return fmt.Sprintf("%s%.1f%% (%dd)", sign, *latest.DeltaPercent, latest.TimeframeDays)
}
