package service

import (
	"rev-saas-api/internal/model"
)

// ContextFieldInput contains all possible sources for a context field
type ContextFieldInput struct {
	UserValue      *string
	WorkspaceValue *string
	InferredValue  *string
	InferredConf   float64
	InferredSignal string
}

// ResolveContextField determines the final value based on priority:
// user > workspace > inferred (if conf >= 0.6) > null
func ResolveContextField(input ContextFieldInput) model.ContextField {
	// Priority 1: User explicit input
	if input.UserValue != nil && *input.UserValue != "" {
		return model.ContextField{
			Value:  input.UserValue,
			Source: model.ContextSourceUser,
		}
	}

	// Priority 2: Workspace defaults
	if input.WorkspaceValue != nil && *input.WorkspaceValue != "" {
		return model.ContextField{
			Value:  input.WorkspaceValue,
			Source: model.ContextSourceWorkspace,
		}
	}

	// Priority 3: AI inference (only if confidence >= 0.6)
	if input.InferredValue != nil && *input.InferredValue != "" && input.InferredConf >= 0.6 {
		signal := input.InferredSignal
		return model.ContextField{
			Value:           input.InferredValue,
			Source:          model.ContextSourceInferred,
			ConfidenceScore: &input.InferredConf,
			InferredSignal:  &signal,
		}
	}

	// Priority 4: Unknown/null with low confidence info if available
	if input.InferredConf > 0 {
		return model.ContextField{
			Value:           nil,
			Source:          model.ContextSourceInferred,
			ConfidenceScore: &input.InferredConf,
		}
	}

	return model.ContextField{
		Value:  nil,
		Source: model.ContextSourceInferred,
	}
}

// InferredField represents an AI-inferred value with confidence
type InferredField struct {
	Value      string
	Confidence float64
	Signal     string
}

// InferenceResult contains all inferred context fields
type InferenceResult struct {
	CompanyStage  *InferredField
	BusinessModel *InferredField
	PrimaryKPI    *InferredField
	MarketType    *InferredField
	MarketSegment *InferredField
	Signals       []model.InferenceSignal
}

// ResolveFullContext resolves all context fields given user input, workspace defaults, and inference
func ResolveFullContext(
	userCtx *model.CreateDecisionContextReqV2,
	workspaceDefaults *model.WorkspaceDefaults,
	inference *InferenceResult,
) model.DecisionContextV2 {
	// Extract user inputs
	var userStage, userModel, userKpi, userMarketType, userMarketSegment *string
	if userCtx != nil {
		userStage = userCtx.CompanyStage
		userModel = userCtx.BusinessModel
		userKpi = userCtx.PrimaryKPI
		if userCtx.Market != nil {
			userMarketType = userCtx.Market.Type
			userMarketSegment = userCtx.Market.Segment
		}
	}

	// Extract workspace defaults
	var wsStage, wsModel, wsKpi, wsMarketType, wsMarketSegment *string
	if workspaceDefaults != nil {
		wsStage = workspaceDefaults.CompanyStage
		wsModel = workspaceDefaults.BusinessModel
		wsKpi = workspaceDefaults.PrimaryKPI
		if workspaceDefaults.Market != nil {
			wsMarketType = workspaceDefaults.Market.Type
			wsMarketSegment = workspaceDefaults.Market.Segment
		}
	}

	// Extract inference (can be nil)
	var infStage, infModel, infKpi, infMarketType, infMarketSegment *InferredField
	if inference != nil {
		infStage = inference.CompanyStage
		infModel = inference.BusinessModel
		infKpi = inference.PrimaryKPI
		infMarketType = inference.MarketType
		infMarketSegment = inference.MarketSegment
	}

	return model.DecisionContextV2{
		CompanyStage: ResolveContextField(ContextFieldInput{
			UserValue:      userStage,
			WorkspaceValue: wsStage,
			InferredValue:  getInferredValue(infStage),
			InferredConf:   getInferredConf(infStage),
			InferredSignal: getInferredSignal(infStage),
		}),
		BusinessModel: ResolveContextField(ContextFieldInput{
			UserValue:      userModel,
			WorkspaceValue: wsModel,
			InferredValue:  getInferredValue(infModel),
			InferredConf:   getInferredConf(infModel),
			InferredSignal: getInferredSignal(infModel),
		}),
		PrimaryKPI: ResolveContextField(ContextFieldInput{
			UserValue:      userKpi,
			WorkspaceValue: wsKpi,
			InferredValue:  getInferredValue(infKpi),
			InferredConf:   getInferredConf(infKpi),
			InferredSignal: getInferredSignal(infKpi),
		}),
		Market: model.MarketContext{
			Type: ResolveContextField(ContextFieldInput{
				UserValue:      userMarketType,
				WorkspaceValue: wsMarketType,
				InferredValue:  getInferredValue(infMarketType),
				InferredConf:   getInferredConf(infMarketType),
				InferredSignal: getInferredSignal(infMarketType),
			}),
			Segment: ResolveContextField(ContextFieldInput{
				UserValue:      userMarketSegment,
				WorkspaceValue: wsMarketSegment,
				InferredValue:  getInferredValue(infMarketSegment),
				InferredConf:   getInferredConf(infMarketSegment),
				InferredSignal: getInferredSignal(infMarketSegment),
			}),
		},
	}
}

func getInferredValue(f *InferredField) *string {
	if f == nil {
		return nil
	}
	return &f.Value
}

func getInferredConf(f *InferredField) float64 {
	if f == nil {
		return 0
	}
	return f.Confidence
}

func getInferredSignal(f *InferredField) string {
	if f == nil {
		return ""
	}
	return f.Signal
}
