package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"

	"rev-saas-api/internal/middleware"
	"rev-saas-api/internal/service"
)

// AnalysisV2Handler handles HTTP requests for V2 pricing analysis.
type AnalysisV2Handler struct {
	analysisServiceV2 *service.AnalysisServiceV2
	aiCreditsService  *service.AICreditsService
}

// NewAnalysisV2Handler creates a new V2 analysis handler.
func NewAnalysisV2Handler(
	analysisServiceV2 *service.AnalysisServiceV2,
	aiCreditsService *service.AICreditsService,
) *AnalysisV2Handler {
	return &AnalysisV2Handler{
		analysisServiceV2: analysisServiceV2,
		aiCreditsService:  aiCreditsService,
	}
}

// RunAnalysisV2 handles POST /api/analysis/v2 - runs a new V2 pricing analysis.
func (h *AnalysisV2Handler) RunAnalysisV2(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	if userID == "" {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	planType := user.GetEffectivePlan()

	// Check AI credits before running analysis
	if h.aiCreditsService != nil {
		err := h.aiCreditsService.ConsumeCredit(r.Context(), userID, planType)
		if err != nil {
			if err == service.ErrAIQuotaExceeded {
				WriteAIQuotaExceededError(w)
				return
			}
			writeJSONError(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// Run the V2 analysis
	result, err := h.analysisServiceV2.RunAnalysisV2(r.Context(), userID)
	if err != nil {
		writeJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(result)
}

// GetAnalysisV2 handles GET /api/analysis/v2/{id} - retrieves a specific V2 analysis.
func (h *AnalysisV2Handler) GetAnalysisV2(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	if userID == "" {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	analysisID := vars["id"]
	if analysisID == "" {
		writeJSONError(w, "missing analysis id", http.StatusBadRequest)
		return
	}

	result, err := h.analysisServiceV2.GetAnalysisV2(r.Context(), userID, analysisID)
	if err != nil {
		writeJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if result == nil {
		writeJSONError(w, "analysis not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}

// ListAnalysesV2 handles GET /api/analysis/v2 - lists V2 analyses for the user.
func (h *AnalysisV2Handler) ListAnalysesV2(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	if userID == "" {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse limit query parameter
	limit := 20 // default
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
			if limit > 100 {
				limit = 100 // cap at 100
			}
		}
	}

	results, err := h.analysisServiceV2.ListAnalysesV2(r.Context(), userID, limit)
	if err != nil {
		writeJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	// Return empty array instead of null
	if results == nil {
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}

	json.NewEncoder(w).Encode(results)
}

// ExportPDFV2 handles GET /api/analysis/v2/{id}/pdf - exports a V2 analysis as PDF.
func (h *AnalysisV2Handler) ExportPDFV2(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	if userID == "" {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	analysisID := vars["id"]
	if analysisID == "" {
		writeJSONError(w, "missing analysis id", http.StatusBadRequest)
		return
	}

	// Fetch the analysis
	result, err := h.analysisServiceV2.GetAnalysisV2(r.Context(), userID, analysisID)
	if err != nil {
		writeJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if result == nil {
		writeJSONError(w, "analysis not found", http.StatusNotFound)
		return
	}

	// Generate PDF
	pdfData := service.PDFExportDataV2{
		Analysis: result,
	}

	pdfBuffer, err := service.GenerateAnalysisPDFV2(pdfData)
	if err != nil {
		writeJSONError(w, fmt.Sprintf("failed to generate PDF: %v", err), http.StatusInternalServerError)
		return
	}

	// Generate filename
	filename := fmt.Sprintf("pricing-report-v2-%s.pdf", result.CreatedAt.Format("2006-01-02"))

	// Set headers for PDF download
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", pdfBuffer.Len()))

	// Write PDF to response
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(pdfBuffer.Bytes())
}

