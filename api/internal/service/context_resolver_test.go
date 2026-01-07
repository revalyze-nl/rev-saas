package service

import (
	"testing"

	"rev-saas-api/internal/model"
)

func TestResolveContextField_UserPriority(t *testing.T) {
	userVal := "saas"
	wsVal := "marketplace"
	infVal := "ecommerce"

	result := ResolveContextField(ContextFieldInput{
		UserValue:      &userVal,
		WorkspaceValue: &wsVal,
		InferredValue:  &infVal,
		InferredConf:   0.9,
	})

	if result.Source != model.ContextSourceUser {
		t.Errorf("expected source=user, got %s", result.Source)
	}
	if result.Value == nil || *result.Value != "saas" {
		t.Errorf("expected value=saas, got %v", result.Value)
	}
}

func TestResolveContextField_WorkspaceFallback(t *testing.T) {
	wsVal := "marketplace"
	infVal := "ecommerce"

	result := ResolveContextField(ContextFieldInput{
		UserValue:      nil, // No user input
		WorkspaceValue: &wsVal,
		InferredValue:  &infVal,
		InferredConf:   0.9,
	})

	if result.Source != model.ContextSourceWorkspace {
		t.Errorf("expected source=workspace, got %s", result.Source)
	}
	if result.Value == nil || *result.Value != "marketplace" {
		t.Errorf("expected value=marketplace, got %v", result.Value)
	}
}

func TestResolveContextField_InferredHighConfidence(t *testing.T) {
	infVal := "ecommerce"

	result := ResolveContextField(ContextFieldInput{
		UserValue:      nil,
		WorkspaceValue: nil,
		InferredValue:  &infVal,
		InferredConf:   0.75, // >= 0.6 threshold
		InferredSignal: "pricing_page_detected",
	})

	if result.Source != model.ContextSourceInferred {
		t.Errorf("expected source=inferred, got %s", result.Source)
	}
	if result.Value == nil || *result.Value != "ecommerce" {
		t.Errorf("expected value=ecommerce, got %v", result.Value)
	}
	if result.ConfidenceScore == nil || *result.ConfidenceScore != 0.75 {
		t.Errorf("expected confidence=0.75, got %v", result.ConfidenceScore)
	}
	if result.InferredSignal == nil || *result.InferredSignal != "pricing_page_detected" {
		t.Errorf("expected signal=pricing_page_detected, got %v", result.InferredSignal)
	}
}

func TestResolveContextField_InferredLowConfidence(t *testing.T) {
	infVal := "ecommerce"

	result := ResolveContextField(ContextFieldInput{
		UserValue:      nil,
		WorkspaceValue: nil,
		InferredValue:  &infVal,
		InferredConf:   0.5, // < 0.6 threshold
	})

	// Value should be nil because confidence is too low
	if result.Value != nil {
		t.Errorf("expected value=nil for low confidence, got %v", *result.Value)
	}
	if result.Source != model.ContextSourceInferred {
		t.Errorf("expected source=inferred, got %s", result.Source)
	}
	// But confidence score should still be recorded
	if result.ConfidenceScore == nil || *result.ConfidenceScore != 0.5 {
		t.Errorf("expected confidence=0.5, got %v", result.ConfidenceScore)
	}
}

func TestResolveContextField_EmptyUserValue(t *testing.T) {
	emptyUser := ""
	wsVal := "marketplace"

	result := ResolveContextField(ContextFieldInput{
		UserValue:      &emptyUser,
		WorkspaceValue: &wsVal,
	})

	// Empty string should fall through to workspace
	if result.Source != model.ContextSourceWorkspace {
		t.Errorf("expected source=workspace for empty user value, got %s", result.Source)
	}
}

func TestResolveFullContext(t *testing.T) {
	userStage := "seed"
	wsModel := "saas"
	wsKPI := "mrr"
	infMarketType := "b2b"
	infMarketSegment := "devtools"

	userCtx := &model.CreateDecisionContextReqV2{
		CompanyStage: &userStage,
	}

	wsDefaults := &model.WorkspaceDefaults{
		BusinessModel: &wsModel,
		PrimaryKPI:    &wsKPI,
	}

	inference := &InferenceResult{
		MarketType: &InferredField{
			Value:      infMarketType,
			Confidence: 0.85,
			Signal:     "enterprise_tier",
		},
		MarketSegment: &InferredField{
			Value:      infMarketSegment,
			Confidence: 0.72,
			Signal:     "api_docs_present",
		},
	}

	result := ResolveFullContext(userCtx, wsDefaults, inference)

	// User-provided stage
	if result.CompanyStage.Source != model.ContextSourceUser {
		t.Errorf("CompanyStage source: expected user, got %s", result.CompanyStage.Source)
	}

	// Workspace-provided model
	if result.BusinessModel.Source != model.ContextSourceWorkspace {
		t.Errorf("BusinessModel source: expected workspace, got %s", result.BusinessModel.Source)
	}

	// Workspace-provided KPI
	if result.PrimaryKPI.Source != model.ContextSourceWorkspace {
		t.Errorf("PrimaryKPI source: expected workspace, got %s", result.PrimaryKPI.Source)
	}

	// Inferred market type (high confidence)
	if result.Market.Type.Source != model.ContextSourceInferred {
		t.Errorf("Market.Type source: expected inferred, got %s", result.Market.Type.Source)
	}
	if result.Market.Type.Value == nil || *result.Market.Type.Value != "b2b" {
		t.Errorf("Market.Type value: expected b2b, got %v", result.Market.Type.Value)
	}

	// Inferred market segment (high confidence)
	if result.Market.Segment.Source != model.ContextSourceInferred {
		t.Errorf("Market.Segment source: expected inferred, got %s", result.Market.Segment.Source)
	}
}

func TestResolveFullContext_NilInputs(t *testing.T) {
	// Should not panic with nil inputs
	result := ResolveFullContext(nil, nil, nil)

	// All sources should be inferred with nil values
	if result.CompanyStage.Source != model.ContextSourceInferred {
		t.Errorf("CompanyStage source: expected inferred for nil input, got %s", result.CompanyStage.Source)
	}
	if result.CompanyStage.Value != nil {
		t.Errorf("CompanyStage value: expected nil for nil input, got %v", result.CompanyStage.Value)
	}
}
