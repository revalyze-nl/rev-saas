package handler

import (
	"bytes"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/jung-kurt/gofpdf"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"rev-saas-api/internal/middleware"
	"rev-saas-api/internal/model"
	mongorepo "rev-saas-api/internal/repository/mongo"
	"rev-saas-api/internal/service"
)

// ExportHandler handles decision export functionality
type ExportHandler struct {
	decisionRepo    *mongorepo.DecisionV2Repository
	scenarioService *service.ScenarioService
	outcomeService  *service.OutcomeService
}

// NewExportHandler creates a new export handler
func NewExportHandler(
	decisionRepo *mongorepo.DecisionV2Repository,
	scenarioService *service.ScenarioService,
	outcomeService *service.OutcomeService,
) *ExportHandler {
	return &ExportHandler{
		decisionRepo:    decisionRepo,
		scenarioService: scenarioService,
		outcomeService:  outcomeService,
	}
}

// ExportDecisionJSON handles GET /api/v2/decisions/:id/export/json - DISABLED
func (h *ExportHandler) ExportDecisionJSON(w http.ResponseWriter, r *http.Request) {
	writeJSONError(w, "JSON export disabled. Use PDF export instead.", http.StatusNotImplemented)
}

// ExportDecisionMarkdown handles GET /api/v2/decisions/:id/export/markdown - DISABLED
func (h *ExportHandler) ExportDecisionMarkdown(w http.ResponseWriter, r *http.Request) {
	writeJSONError(w, "Markdown export disabled. Use PDF export instead.", http.StatusNotImplemented)
}

// ExportDecisionHTML handles GET /api/v2/decisions/:id/export/html - Now returns PDF
func (h *ExportHandler) ExportDecisionHTML(w http.ResponseWriter, r *http.Request) {
	h.ExportDecisionPDF(w, r)
}

// ExportDecisionPDF handles GET /api/v2/decisions/:id/export/pdf
func (h *ExportHandler) ExportDecisionPDF(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	decisionID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		writeJSONError(w, "invalid decision ID", http.StatusBadRequest)
		return
	}

	log.Printf("[export] Exporting decision %s to PDF for user %s", decisionID.Hex(), user.ID.Hex())

	// Get decision
	decision, err := h.decisionRepo.GetByIDAndUser(r.Context(), decisionID, user.ID)
	if err != nil {
		log.Printf("[export] get decision error: %v", err)
		writeJSONError(w, "failed to get decision", http.StatusInternalServerError)
		return
	}
	if decision == nil {
		writeJSONError(w, "decision not found", http.StatusNotFound)
		return
	}

	// Get scenarios
	scenarios, _ := h.scenarioService.GetScenarios(r.Context(), decisionID, user.ID)

	// Get outcome
	outcome, _ := h.outcomeService.GetOutcome(r.Context(), decisionID, user.ID)

	// Build PDF
	pdfBytes, err := buildPremiumPDF(decision, scenarios, outcome)
	if err != nil {
		log.Printf("[export] PDF generation error: %v", err)
		writeJSONError(w, "failed to generate PDF", http.StatusInternalServerError)
		return
	}

	// Send PDF
	filename := fmt.Sprintf("decision-report-%s.pdf", sanitizeExportFilename(decision.CompanyName))
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(pdfBytes)))
	w.Write(pdfBytes)
}

func buildPremiumPDF(decision *model.DecisionV2, scenarios *model.ScenarioSet, outcome *model.MeasurableOutcome) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(20, 20, 20)
	pdf.AddPage()

	// Colors
	primaryColor := []int{139, 92, 246}    // Purple
	darkColor := []int{15, 23, 42}          // Dark blue
	grayColor := []int{100, 116, 139}       // Gray
	lightGray := []int{241, 245, 249}       // Light gray bg
	greenColor := []int{16, 185, 129}       // Green
	redColor := []int{239, 68, 68}          // Red

	currentDate := time.Now().Format("Jan 02, 2006")
	pageWidth := 170.0

	// === HEADER ===
	// Logo text
	pdf.SetFont("Helvetica", "B", 24)
	pdf.SetTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
	pdf.CellFormat(100, 10, "Revalyze", "", 0, "L", false, 0, "")
	
	// Date
	pdf.SetFont("Helvetica", "", 10)
	pdf.SetTextColor(grayColor[0], grayColor[1], grayColor[2])
	pdf.CellFormat(70, 10, currentDate, "", 1, "R", false, 0, "")
	
	pdf.Ln(5)
	
	// Divider line
	pdf.SetDrawColor(primaryColor[0], primaryColor[1], primaryColor[2])
	pdf.SetLineWidth(0.5)
	pdf.Line(20, pdf.GetY(), 190, pdf.GetY())
	pdf.Ln(10)

	// === TITLE ===
	pdf.SetFont("Helvetica", "B", 22)
	pdf.SetTextColor(darkColor[0], darkColor[1], darkColor[2])
	pdf.CellFormat(pageWidth, 10, "Decision Intelligence Report", "", 1, "L", false, 0, "")
	
	pdf.SetFont("Helvetica", "", 11)
	pdf.SetTextColor(grayColor[0], grayColor[1], grayColor[2])
	pdf.CellFormat(pageWidth, 6, "Strategic analysis and recommendations based on AI-powered insights.", "", 1, "L", false, 0, "")
	pdf.Ln(10)

	// === COMPANY INFO BOX ===
	pdf.SetFillColor(lightGray[0], lightGray[1], lightGray[2])
	pdf.RoundedRect(20, pdf.GetY(), pageWidth, 18, 3, "1234", "F")
	
	pdf.SetXY(25, pdf.GetY()+4)
	pdf.SetFont("Helvetica", "B", 14)
	pdf.SetTextColor(darkColor[0], darkColor[1], darkColor[2])
	pdf.CellFormat(100, 6, decision.CompanyName, "", 0, "L", false, 0, "")
	
	pdf.SetFont("Helvetica", "", 10)
	pdf.SetTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
	pdf.CellFormat(60, 6, decision.WebsiteURL, "", 1, "R", false, 0, "")
	pdf.Ln(12)

	// === EXECUTIVE SUMMARY ===
	drawSectionHeader(pdf, "Executive Summary", darkColor, primaryColor)
	
	pdf.SetFont("Helvetica", "B", 12)
	pdf.SetTextColor(darkColor[0], darkColor[1], darkColor[2])
	pdf.MultiCell(pageWidth, 6, decision.Verdict.Headline, "", "L", false)
	pdf.Ln(3)
	
	pdf.SetFont("Helvetica", "", 10)
	pdf.SetTextColor(grayColor[0], grayColor[1], grayColor[2])
	pdf.MultiCell(pageWidth, 5, decision.Verdict.Summary, "", "L", false)
	pdf.Ln(8)

	// === DECISION SNAPSHOT ===
	if decision.Verdict.DecisionSnapshot != nil {
		drawSectionHeader(pdf, "Decision Snapshot", darkColor, primaryColor)
		
		ds := decision.Verdict.DecisionSnapshot
		
		// Table header
		pdf.SetFillColor(lightGray[0], lightGray[1], lightGray[2])
		pdf.SetFont("Helvetica", "B", 9)
		pdf.SetTextColor(grayColor[0], grayColor[1], grayColor[2])
		
		colWidths := []float64{42.5, 42.5, 42.5, 42.5}
		headers := []string{"REVENUE IMPACT", "RISK LEVEL", "TIME TO IMPACT", "EFFORT"}
		
		for i, header := range headers {
			pdf.CellFormat(colWidths[i], 8, header, "", 0, "C", true, 0, "")
		}
		pdf.Ln(-1)
		
		// Table values
		pdf.SetFont("Helvetica", "B", 11)
		
		// Revenue - green
		pdf.SetTextColor(greenColor[0], greenColor[1], greenColor[2])
		pdf.CellFormat(colWidths[0], 10, ds.RevenueImpactRange, "", 0, "C", false, 0, "")
		
		// Risk - color based on level
		riskColor := grayColor
		if strings.ToLower(ds.PrimaryRiskLevel) == "low" {
			riskColor = greenColor
		} else if strings.ToLower(ds.PrimaryRiskLevel) == "high" {
			riskColor = redColor
		} else if strings.ToLower(ds.PrimaryRiskLevel) == "medium" {
			riskColor = []int{245, 158, 11} // Amber
		}
		pdf.SetTextColor(riskColor[0], riskColor[1], riskColor[2])
		pdf.CellFormat(colWidths[1], 10, ds.PrimaryRiskLevel, "", 0, "C", false, 0, "")
		
		// Time - dark
		pdf.SetTextColor(darkColor[0], darkColor[1], darkColor[2])
		pdf.CellFormat(colWidths[2], 10, ds.TimeToImpact, "", 0, "C", false, 0, "")
		
		// Effort - color based
		effortColor := grayColor
		if strings.ToLower(ds.ExecutionEffort) == "low" {
			effortColor = greenColor
		} else if strings.ToLower(ds.ExecutionEffort) == "high" {
			effortColor = redColor
		}
		pdf.SetTextColor(effortColor[0], effortColor[1], effortColor[2])
		pdf.CellFormat(colWidths[3], 10, ds.ExecutionEffort, "", 1, "C", false, 0, "")
		
		pdf.Ln(8)
	}

	// === CHOSEN SCENARIO ===
	if scenarios != nil && decision.ChosenScenarioID != nil && *decision.ChosenScenarioID != "" {
		for _, sc := range scenarios.Scenarios {
			if string(sc.ScenarioID) == *decision.ChosenScenarioID {
				drawSectionHeader(pdf, "Chosen Strategic Path", darkColor, primaryColor)
				
				// Scenario badge
				pdf.SetFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
				pdf.SetTextColor(255, 255, 255)
				pdf.SetFont("Helvetica", "B", 8)
				pdf.RoundedRect(20, pdf.GetY(), 35, 6, 2, "1234", "F")
				pdf.SetXY(20, pdf.GetY())
				pdf.CellFormat(35, 6, "SELECTED STRATEGY", "", 1, "C", false, 0, "")
				pdf.Ln(3)
				
				// Scenario title
				pdf.SetFont("Helvetica", "B", 12)
				pdf.SetTextColor(darkColor[0], darkColor[1], darkColor[2])
				pdf.CellFormat(pageWidth, 6, sc.Title, "", 1, "L", false, 0, "")
				pdf.Ln(2)
				
				// Scenario summary
				pdf.SetFont("Helvetica", "", 10)
				pdf.SetTextColor(grayColor[0], grayColor[1], grayColor[2])
				pdf.MultiCell(pageWidth, 5, sc.Summary, "", "L", false)
				pdf.Ln(3)
				
				// Mini metrics
				if sc.Metrics.RevenueImpactRange != "" {
					pdf.SetFont("Helvetica", "", 9)
					pdf.SetTextColor(grayColor[0], grayColor[1], grayColor[2])
					pdf.CellFormat(30, 5, "Revenue:", "", 0, "L", false, 0, "")
					pdf.SetTextColor(greenColor[0], greenColor[1], greenColor[2])
					pdf.SetFont("Helvetica", "B", 9)
					pdf.CellFormat(50, 5, sc.Metrics.RevenueImpactRange, "", 0, "L", false, 0, "")
					
					pdf.SetFont("Helvetica", "", 9)
					pdf.SetTextColor(grayColor[0], grayColor[1], grayColor[2])
					pdf.CellFormat(30, 5, "Churn:", "", 0, "L", false, 0, "")
					pdf.SetTextColor(darkColor[0], darkColor[1], darkColor[2])
					pdf.SetFont("Helvetica", "B", 9)
					pdf.CellFormat(50, 5, sc.Metrics.ChurnImpactRange, "", 1, "L", false, 0, "")
				}
				
				pdf.Ln(8)
				break
			}
		}
	}

	// === OUTCOME KPIs ===
	if outcome != nil && len(outcome.KPIs) > 0 {
		// Check if we need a new page
		if pdf.GetY() > 220 {
			pdf.AddPage()
		}
		
		drawSectionHeader(pdf, "Outcome Tracking", darkColor, primaryColor)
		
		// Status badge
		statusText := "PENDING"
		statusColor := grayColor
		switch outcome.Status {
		case model.OutcomeStatusAchieved:
			statusText = "ACHIEVED"
			statusColor = greenColor
		case model.OutcomeStatusMissed:
			statusText = "MISSED"
			statusColor = redColor
		case model.OutcomeStatusInProgress:
			statusText = "IN PROGRESS"
			statusColor = []int{59, 130, 246} // Blue
		}
		
		pdf.SetFillColor(statusColor[0], statusColor[1], statusColor[2])
		pdf.SetTextColor(255, 255, 255)
		pdf.SetFont("Helvetica", "B", 8)
		badgeWidth := float64(len(statusText)*2 + 10)
		pdf.RoundedRect(20, pdf.GetY(), badgeWidth, 6, 2, "1234", "F")
		pdf.SetXY(20, pdf.GetY())
		pdf.CellFormat(badgeWidth, 6, statusText, "", 1, "C", false, 0, "")
		pdf.Ln(5)
		
		// KPI Table
		pdf.SetFillColor(lightGray[0], lightGray[1], lightGray[2])
		pdf.SetFont("Helvetica", "B", 9)
		pdf.SetTextColor(grayColor[0], grayColor[1], grayColor[2])
		
		kpiColWidths := []float64{50, 30, 30, 30, 30}
		kpiHeaders := []string{"KPI", "BASELINE", "TARGET", "ACTUAL", "DELTA"}
		
		for i, header := range kpiHeaders {
			pdf.CellFormat(kpiColWidths[i], 8, header, "", 0, "C", true, 0, "")
		}
		pdf.Ln(-1)
		
		// KPI rows
		for _, kpi := range outcome.KPIs {
			pdf.SetFont("Helvetica", "", 10)
			pdf.SetTextColor(darkColor[0], darkColor[1], darkColor[2])
			pdf.CellFormat(kpiColWidths[0], 8, string(kpi.Key), "B", 0, "L", false, 0, "")
			pdf.CellFormat(kpiColWidths[1], 8, fmt.Sprintf("%.1f", kpi.Baseline), "B", 0, "C", false, 0, "")
			pdf.CellFormat(kpiColWidths[2], 8, fmt.Sprintf("%.1f", kpi.Target), "B", 0, "C", false, 0, "")
			
			// Actual
			actualStr := "-"
			if kpi.Actual != nil {
				actualStr = fmt.Sprintf("%.1f", *kpi.Actual)
			}
			pdf.CellFormat(kpiColWidths[3], 8, actualStr, "B", 0, "C", false, 0, "")
			
			// Delta with color
			deltaStr := "-"
			if kpi.DeltaPct != nil {
				if *kpi.DeltaPct > 0 {
					pdf.SetTextColor(greenColor[0], greenColor[1], greenColor[2])
					deltaStr = fmt.Sprintf("+%.1f%%", *kpi.DeltaPct)
				} else if *kpi.DeltaPct < 0 {
					pdf.SetTextColor(redColor[0], redColor[1], redColor[2])
					deltaStr = fmt.Sprintf("%.1f%%", *kpi.DeltaPct)
				} else {
					deltaStr = "0%"
				}
			}
			pdf.SetFont("Helvetica", "B", 10)
			pdf.CellFormat(kpiColWidths[4], 8, deltaStr, "B", 1, "C", false, 0, "")
		}
		
		pdf.Ln(8)
	}

	// === FOOTER ===
	pdf.SetY(-30)
	pdf.SetDrawColor(grayColor[0], grayColor[1], grayColor[2])
	pdf.SetLineWidth(0.2)
	pdf.Line(20, pdf.GetY(), 190, pdf.GetY())
	pdf.Ln(5)
	
	pdf.SetFont("Helvetica", "", 9)
	pdf.SetTextColor(grayColor[0], grayColor[1], grayColor[2])
	pdf.CellFormat(pageWidth, 5, "Generated by", "", 1, "C", false, 0, "")
	
	pdf.SetFont("Helvetica", "B", 10)
	pdf.SetTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
	pdf.CellFormat(pageWidth, 5, "Revalyze - AI-Powered Decision Intelligence", "", 1, "C", false, 0, "")
	
	pdf.SetFont("Helvetica", "", 8)
	pdf.SetTextColor(grayColor[0], grayColor[1], grayColor[2])
	pdf.CellFormat(pageWidth, 5, fmt.Sprintf("© %d Revalyze B.V.", time.Now().Year()), "", 1, "C", false, 0, "")

	// Output
	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func drawSectionHeader(pdf *gofpdf.Fpdf, title string, darkColor, primaryColor []int) {
	// Small colored bar
	pdf.SetFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
	pdf.Rect(20, pdf.GetY(), 3, 7, "F")
	
	pdf.SetX(26)
	pdf.SetFont("Helvetica", "B", 13)
	pdf.SetTextColor(darkColor[0], darkColor[1], darkColor[2])
	pdf.CellFormat(140, 7, title, "", 1, "L", false, 0, "")
	pdf.Ln(3)
}

func sanitizeExportFilename(name string) string {
	name = strings.ToLower(name)
	name = strings.ReplaceAll(name, " ", "_")
	name = strings.ReplaceAll(name, "/", "_")
	name = strings.ReplaceAll(name, "\\", "_")
	name = strings.ReplaceAll(name, ":", "_")
	if len(name) > 50 {
		name = name[:50]
	}
	return name
}
