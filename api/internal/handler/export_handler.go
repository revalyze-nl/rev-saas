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

	log.Printf("[export] Building PDF for decision: %s, company: %s", decisionID.Hex(), decision.CompanyName)

	// Build PDF
	pdfBytes, err := buildComprehensivePDF(decision, scenarios, outcome)
	if err != nil {
		log.Printf("[export] PDF generation error: %v", err)
		writeJSONError(w, "failed to generate PDF", http.StatusInternalServerError)
		return
	}

	log.Printf("[export] PDF generated successfully, size: %d bytes", len(pdfBytes))

	// Send PDF
	filename := fmt.Sprintf("decision-report-%s.pdf", sanitizeExportFilename(decision.CompanyName))
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(pdfBytes)))
	w.Write(pdfBytes)
}

// PDF Colors
var (
	colorPrimary = []int{139, 92, 246}  // Purple
	colorDark    = []int{15, 23, 42}    // Dark blue
	colorGray    = []int{100, 116, 139} // Gray
	colorLightBg = []int{241, 245, 249} // Light gray bg
	colorGreen   = []int{16, 185, 129}  // Green
	colorRed     = []int{239, 68, 68}   // Red
	colorAmber   = []int{245, 158, 11}  // Amber
	colorBlue    = []int{59, 130, 246}  // Blue
)

func buildComprehensivePDF(decision *model.DecisionV2, scenarios *model.ScenarioSet, outcome *model.MeasurableOutcome) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(20, 15, 20)
	pdf.SetAutoPageBreak(true, 20)

	pageWidth := 170.0
	currentDate := time.Now().Format("Jan 02, 2006")

	// === PAGE 1: Cover & Executive Summary ===
	pdf.AddPage()

	// Header with logo icon (drawn as rounded rect with lightning bolt shape)
	drawLogoIcon(pdf, 20, 15)
	pdf.SetXY(34, 17)
	pdf.SetFont("Helvetica", "B", 20)
	pdf.SetTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2])
	pdf.CellFormat(80, 8, "Revalyze", "", 0, "L", false, 0, "")

	pdf.SetFont("Helvetica", "", 10)
	pdf.SetTextColor(colorGray[0], colorGray[1], colorGray[2])
	pdf.CellFormat(56, 8, currentDate, "", 1, "R", false, 0, "")

	pdf.Ln(8)

	// Divider
	pdf.SetDrawColor(colorPrimary[0], colorPrimary[1], colorPrimary[2])
	pdf.SetLineWidth(0.8)
	pdf.Line(20, pdf.GetY(), 190, pdf.GetY())
	pdf.Ln(10)

	// Title
	pdf.SetFont("Helvetica", "B", 24)
	pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
	pdf.CellFormat(pageWidth, 10, "Decision Intelligence Report", "", 1, "L", false, 0, "")

	pdf.SetFont("Helvetica", "", 11)
	pdf.SetTextColor(colorGray[0], colorGray[1], colorGray[2])
	pdf.CellFormat(pageWidth, 6, "Strategic analysis and recommendations based on AI-powered insights", "", 1, "L", false, 0, "")
	pdf.Ln(8)

	// Company Info Box
	pdf.SetFillColor(colorLightBg[0], colorLightBg[1], colorLightBg[2])
	pdf.RoundedRect(20, pdf.GetY(), pageWidth, 16, 3, "1234", "F")
	pdf.SetXY(25, pdf.GetY()+4)
	pdf.SetFont("Helvetica", "B", 13)
	pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
	pdf.CellFormat(100, 6, decision.CompanyName, "", 0, "L", false, 0, "")
	pdf.SetFont("Helvetica", "", 10)
	pdf.SetTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2])
	pdf.CellFormat(45, 6, decision.WebsiteURL, "", 1, "R", false, 0, "")
	pdf.Ln(10)

	// Executive Summary Section
	drawSection(pdf, "Executive Summary", pageWidth)

	pdf.SetFont("Helvetica", "B", 13)
	pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
	pdf.MultiCell(pageWidth, 6, decision.Verdict.Headline, "", "L", false)
	pdf.Ln(2)

	pdf.SetFont("Helvetica", "", 10)
	pdf.SetTextColor(colorGray[0], colorGray[1], colorGray[2])
	pdf.MultiCell(pageWidth, 5, decision.Verdict.Summary, "", "L", false)
	pdf.Ln(6)

	// Decision Snapshot
	if decision.Verdict.DecisionSnapshot != nil {
		drawSection(pdf, "Decision Snapshot (30-Second Overview)", pageWidth)
		drawSnapshotTable(pdf, decision.Verdict.DecisionSnapshot)
		pdf.Ln(6)
	}

	// If You Proceed
	if decision.Verdict.IfYouProceed != nil {
		drawSection(pdf, "If You Proceed With This Decision", pageWidth)

		if len(decision.Verdict.IfYouProceed.ExpectedUpside) > 0 {
			pdf.SetFont("Helvetica", "B", 10)
			pdf.SetTextColor(colorGreen[0], colorGreen[1], colorGreen[2])
			pdf.CellFormat(pageWidth, 5, "Expected Upside:", "", 1, "L", false, 0, "")
			drawBulletList(pdf, decision.Verdict.IfYouProceed.ExpectedUpside, colorDark)
		}

		if len(decision.Verdict.IfYouProceed.SecondaryEffects) > 0 {
			pdf.Ln(2)
			pdf.SetFont("Helvetica", "B", 10)
			pdf.SetTextColor(colorBlue[0], colorBlue[1], colorBlue[2])
			pdf.CellFormat(pageWidth, 5, "Secondary Positive Effects:", "", 1, "L", false, 0, "")
			drawBulletList(pdf, decision.Verdict.IfYouProceed.SecondaryEffects, colorGray)
		}
		pdf.Ln(4)
	}

	// If You Do Not Act
	if decision.Verdict.IfYouDoNotAct != nil {
		checkPageBreak(pdf, 50)
		drawSection(pdf, "If You Do NOT Take Action", pageWidth)

		ina := decision.Verdict.IfYouDoNotAct

		if ina.WhatStagnates != "" {
			pdf.SetFont("Helvetica", "B", 9)
			pdf.SetTextColor(colorRed[0], colorRed[1], colorRed[2])
			pdf.CellFormat(35, 5, "What Stagnates:", "", 0, "L", false, 0, "")
			pdf.SetFont("Helvetica", "", 9)
			pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
			pdf.MultiCell(pageWidth-35, 5, ina.WhatStagnates, "", "L", false)
		}

		if ina.CompetitorAdvantage != "" {
			pdf.SetFont("Helvetica", "B", 9)
			pdf.SetTextColor(colorRed[0], colorRed[1], colorRed[2])
			pdf.CellFormat(35, 5, "Competitors Gain:", "", 0, "L", false, 0, "")
			pdf.SetFont("Helvetica", "", 9)
			pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
			pdf.MultiCell(pageWidth-35, 5, ina.CompetitorAdvantage, "", "L", false)
		}

		if ina.FutureDifficulty != "" {
			pdf.SetFont("Helvetica", "B", 9)
			pdf.SetTextColor(colorRed[0], colorRed[1], colorRed[2])
			pdf.CellFormat(35, 5, "Future Difficulty:", "", 0, "L", false, 0, "")
			pdf.SetFont("Helvetica", "", 9)
			pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
			pdf.MultiCell(pageWidth-35, 5, ina.FutureDifficulty, "", "L", false)
		}
		pdf.Ln(4)
	}

	// Alternatives Considered
	if len(decision.Verdict.AlternativesConsidered) > 0 {
		checkPageBreak(pdf, 40)
		drawSection(pdf, "Alternatives Considered and Rejected", pageWidth)

		for i, alt := range decision.Verdict.AlternativesConsidered {
			pdf.SetFont("Helvetica", "B", 10)
			pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
			pdf.CellFormat(pageWidth, 5, fmt.Sprintf("%d. %s", i+1, alt.Name), "", 1, "L", false, 0, "")

			pdf.SetFont("Helvetica", "I", 9)
			pdf.SetTextColor(colorGray[0], colorGray[1], colorGray[2])
			pdf.MultiCell(pageWidth, 4, "Why rejected: "+alt.WhyNotSelected, "", "L", false)
			pdf.Ln(2)
		}
		pdf.Ln(2)
	}

	// Risk Analysis
	if decision.Verdict.RiskAnalysis != nil {
		checkPageBreak(pdf, 45)
		drawSection(pdf, "Risk and Trade-off Analysis", pageWidth)

		ra := decision.Verdict.RiskAnalysis

		// Risk badge
		riskColor := colorAmber
		if strings.ToLower(ra.RiskLevel) == "low" {
			riskColor = colorGreen
		} else if strings.ToLower(ra.RiskLevel) == "high" {
			riskColor = colorRed
		}

		pdf.SetFillColor(riskColor[0], riskColor[1], riskColor[2])
		pdf.SetTextColor(255, 255, 255)
		pdf.SetFont("Helvetica", "B", 9)
		badgeW := float64(len(ra.RiskLevel)*3 + 16)
		pdf.RoundedRect(20, pdf.GetY(), badgeW, 6, 2, "1234", "F")
		pdf.SetXY(20, pdf.GetY())
		pdf.CellFormat(badgeW, 6, strings.ToUpper(ra.RiskLevel)+" RISK", "", 1, "C", false, 0, "")
		pdf.Ln(3)

		drawLabelValue(pdf, "Who is Affected:", ra.WhoIsAffected, pageWidth)
		drawLabelValue(pdf, "How It Manifests:", ra.HowItManifests, pageWidth)
		drawLabelValue(pdf, "Why Acceptable:", ra.WhyAcceptable, pageWidth)
		pdf.Ln(4)
	}

	// Why This Fits Your Company
	if decision.Verdict.WhyThisFits != nil {
		checkPageBreak(pdf, 50)
		drawSection(pdf, "Why This Decision Fits Your Company", pageWidth)

		wtf := decision.Verdict.WhyThisFits

		if wtf.CompanyStageReason != "" {
			drawLabelValue(pdf, "Company Stage:", wtf.CompanyStageReason, pageWidth)
		}
		if wtf.BusinessModelReason != "" {
			drawLabelValue(pdf, "Business Model:", wtf.BusinessModelReason, pageWidth)
		}
		if wtf.MarketSegmentReason != "" {
			drawLabelValue(pdf, "Market Segment:", wtf.MarketSegmentReason, pageWidth)
		}
		if wtf.PrimaryKPIReason != "" {
			drawLabelValue(pdf, "Primary KPI:", wtf.PrimaryKPIReason, pageWidth)
		}
		pdf.Ln(4)
	}

	// Execution Checklist
	if decision.Verdict.ExecutionChecklist != nil {
		checkPageBreak(pdf, 60)
		drawSection(pdf, "Execution Checklist", pageWidth)

		ec := decision.Verdict.ExecutionChecklist

		if len(ec.Next14Days) > 0 {
			pdf.SetFont("Helvetica", "B", 10)
			pdf.SetTextColor(colorGreen[0], colorGreen[1], colorGreen[2])
			pdf.CellFormat(pageWidth, 5, "Next 14 Days:", "", 1, "L", false, 0, "")
			drawChecklistItems(pdf, ec.Next14Days)
		}

		if len(ec.Next30To60Days) > 0 {
			pdf.Ln(2)
			pdf.SetFont("Helvetica", "B", 10)
			pdf.SetTextColor(colorBlue[0], colorBlue[1], colorBlue[2])
			pdf.CellFormat(pageWidth, 5, "Next 30-60 Days:", "", 1, "L", false, 0, "")
			drawChecklistItems(pdf, ec.Next30To60Days)
		}

		if len(ec.SuccessMetrics) > 0 {
			pdf.Ln(2)
			pdf.SetFont("Helvetica", "B", 10)
			pdf.SetTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2])
			pdf.CellFormat(pageWidth, 5, "Success Metrics to Monitor:", "", 1, "L", false, 0, "")
			drawBulletList(pdf, ec.SuccessMetrics, colorDark)
		}
		pdf.Ln(4)
	}

	// === SCENARIOS SECTION ===
	if scenarios != nil && len(scenarios.Scenarios) > 0 {
		pdf.AddPage()

		// Section header
		drawLogoIcon(pdf, 20, 15)
		pdf.SetXY(32, 17)
		pdf.SetFont("Helvetica", "B", 16)
		pdf.SetTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2])
		pdf.CellFormat(80, 6, "Revalyze", "", 0, "L", false, 0, "")
		pdf.SetFont("Helvetica", "", 10)
		pdf.SetTextColor(colorGray[0], colorGray[1], colorGray[2])
		pdf.CellFormat(58, 6, "Strategic Scenarios", "", 1, "R", false, 0, "")
		pdf.Ln(8)

		pdf.SetDrawColor(colorPrimary[0], colorPrimary[1], colorPrimary[2])
		pdf.SetLineWidth(0.5)
		pdf.Line(20, pdf.GetY(), 190, pdf.GetY())
		pdf.Ln(8)

		pdf.SetFont("Helvetica", "B", 18)
		pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
		pdf.CellFormat(pageWidth, 8, "Alternative Strategic Paths", "", 1, "L", false, 0, "")
		pdf.SetFont("Helvetica", "", 10)
		pdf.SetTextColor(colorGray[0], colorGray[1], colorGray[2])
		pdf.CellFormat(pageWidth, 5, "AI-generated scenarios based on your decision context", "", 1, "L", false, 0, "")
		pdf.Ln(8)

		// Each scenario
		for _, sc := range scenarios.Scenarios {
			checkPageBreak(pdf, 70)

			// Scenario card
			isChosen := decision.ChosenScenarioID != nil && string(sc.ScenarioID) == *decision.ChosenScenarioID
			isRecommended := sc.ScenarioID == "balanced"

			// Background
			if isChosen {
				pdf.SetFillColor(139, 92, 246) // Purple bg for chosen
				pdf.RoundedRect(20, pdf.GetY(), pageWidth, 6, 2, "12", "F")
				pdf.SetTextColor(255, 255, 255)
			} else if isRecommended {
				pdf.SetFillColor(16, 185, 129) // Green bg for recommended
				pdf.RoundedRect(20, pdf.GetY(), pageWidth, 6, 2, "12", "F")
				pdf.SetTextColor(255, 255, 255)
			} else {
				pdf.SetFillColor(colorLightBg[0], colorLightBg[1], colorLightBg[2])
				pdf.RoundedRect(20, pdf.GetY(), pageWidth, 6, 2, "12", "F")
				pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
			}

			pdf.SetFont("Helvetica", "B", 10)
			pdf.SetXY(25, pdf.GetY()+1)
			badgeText := sc.Title
			if isChosen {
				badgeText = "✓ CHOSEN: " + sc.Title
			} else if isRecommended {
				badgeText = "★ RECOMMENDED: " + sc.Title
			}
			pdf.CellFormat(pageWidth-10, 5, badgeText, "", 1, "L", false, 0, "")
			pdf.Ln(2)

			// Summary
			pdf.SetFont("Helvetica", "", 9)
			pdf.SetTextColor(colorGray[0], colorGray[1], colorGray[2])
			pdf.MultiCell(pageWidth, 4, sc.Summary, "", "L", false)
			pdf.Ln(2)

			// Metrics row
			pdf.SetFont("Helvetica", "", 8)
			pdf.SetTextColor(colorGray[0], colorGray[1], colorGray[2])
			metricsText := fmt.Sprintf("Revenue: %s  |  Churn: %s  |  Risk: %s  |  Time: %s  |  Effort: %s",
				sc.Metrics.RevenueImpactRange,
				sc.Metrics.ChurnImpactRange,
				sc.Metrics.RiskLabel,
				sc.Metrics.TimeToImpact,
				sc.Metrics.ExecutionEffort)
			pdf.CellFormat(pageWidth, 4, metricsText, "", 1, "L", false, 0, "")

			// Trade-offs
			if len(sc.Tradeoffs) > 0 {
				pdf.Ln(1)
				pdf.SetFont("Helvetica", "I", 8)
				pdf.SetTextColor(colorGray[0], colorGray[1], colorGray[2])
				for _, t := range sc.Tradeoffs {
					pdf.CellFormat(5, 4, "•", "", 0, "L", false, 0, "")
					pdf.MultiCell(pageWidth-5, 4, t, "", "L", false)
				}
			}

			pdf.Ln(6)
		}
	}

	// === OUTCOME SECTION ===
	if outcome != nil && len(outcome.KPIs) > 0 {
		checkPageBreak(pdf, 80)
		pdf.Ln(4)

		drawSection(pdf, "Outcome Tracking", pageWidth)

		// Status badge
		statusText := "PENDING"
		statusColor := colorGray
		switch outcome.Status {
		case model.OutcomeStatusAchieved:
			statusText = "ACHIEVED"
			statusColor = colorGreen
		case model.OutcomeStatusMissed:
			statusText = "MISSED"
			statusColor = colorRed
		case model.OutcomeStatusInProgress:
			statusText = "IN PROGRESS"
			statusColor = colorBlue
		}

		pdf.SetFillColor(statusColor[0], statusColor[1], statusColor[2])
		pdf.SetTextColor(255, 255, 255)
		pdf.SetFont("Helvetica", "B", 8)
		badgeWidth := float64(len(statusText)*2 + 12)
		pdf.RoundedRect(20, pdf.GetY(), badgeWidth, 6, 2, "1234", "F")
		pdf.SetXY(20, pdf.GetY())
		pdf.CellFormat(badgeWidth, 6, statusText, "", 1, "C", false, 0, "")
		pdf.Ln(4)

		// KPI Table
		drawKPITable(pdf, outcome.KPIs, pageWidth)
	}

	// === FOOTER ===
	pdf.SetY(-25)
	pdf.SetDrawColor(colorGray[0], colorGray[1], colorGray[2])
	pdf.SetLineWidth(0.2)
	pdf.Line(20, pdf.GetY(), 190, pdf.GetY())
	pdf.Ln(4)

	pdf.SetFont("Helvetica", "", 8)
	pdf.SetTextColor(colorGray[0], colorGray[1], colorGray[2])
	pdf.CellFormat(pageWidth, 4, "Generated by", "", 1, "C", false, 0, "")

	pdf.SetFont("Helvetica", "B", 9)
	pdf.SetTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2])
	pdf.CellFormat(pageWidth, 5, "Revalyze - AI-Powered Decision Intelligence", "", 1, "C", false, 0, "")

	pdf.SetFont("Helvetica", "", 7)
	pdf.SetTextColor(colorGray[0], colorGray[1], colorGray[2])
	pdf.CellFormat(pageWidth, 4, fmt.Sprintf("© %d Revalyze B.V. | www.revalyze.co", time.Now().Year()), "", 1, "C", false, 0, "")

	// Check for errors
	if pdf.Err() {
		return nil, fmt.Errorf("PDF creation error: %v", pdf.Error())
	}

	// Output
	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, fmt.Errorf("PDF output error: %v", err)
	}

	return buf.Bytes(), nil
}

func drawSection(pdf *gofpdf.Fpdf, title string, pageWidth float64) {
	pdf.SetFillColor(colorPrimary[0], colorPrimary[1], colorPrimary[2])
	pdf.Rect(20, pdf.GetY(), 3, 6, "F")
	pdf.SetX(26)
	pdf.SetFont("Helvetica", "B", 12)
	pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
	pdf.CellFormat(pageWidth-6, 6, title, "", 1, "L", false, 0, "")
	pdf.Ln(2)
}

func drawSnapshotTable(pdf *gofpdf.Fpdf, ds *model.DecisionSnapshotV2) {
	pdf.SetFillColor(colorLightBg[0], colorLightBg[1], colorLightBg[2])
	pdf.SetFont("Helvetica", "B", 8)
	pdf.SetTextColor(colorGray[0], colorGray[1], colorGray[2])

	cols := []string{"REVENUE IMPACT", "RISK LEVEL", "TIME TO IMPACT", "EFFORT", "REVERSIBILITY"}
	colW := 34.0

	for _, col := range cols {
		pdf.CellFormat(colW, 7, col, "", 0, "C", true, 0, "")
	}
	pdf.Ln(-1)

	pdf.SetFont("Helvetica", "B", 10)

	// Revenue - green
	pdf.SetTextColor(colorGreen[0], colorGreen[1], colorGreen[2])
	pdf.CellFormat(colW, 8, ds.RevenueImpactRange, "", 0, "C", false, 0, "")

	// Risk
	riskColor := colorAmber
	if strings.ToLower(ds.PrimaryRiskLevel) == "low" {
		riskColor = colorGreen
	} else if strings.ToLower(ds.PrimaryRiskLevel) == "high" {
		riskColor = colorRed
	}
	pdf.SetTextColor(riskColor[0], riskColor[1], riskColor[2])
	pdf.CellFormat(colW, 8, ds.PrimaryRiskLevel, "", 0, "C", false, 0, "")

	// Time
	pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
	pdf.CellFormat(colW, 8, ds.TimeToImpact, "", 0, "C", false, 0, "")

	// Effort
	effortColor := colorGray
	if strings.ToLower(ds.ExecutionEffort) == "low" {
		effortColor = colorGreen
	} else if strings.ToLower(ds.ExecutionEffort) == "high" {
		effortColor = colorRed
	}
	pdf.SetTextColor(effortColor[0], effortColor[1], effortColor[2])
	pdf.CellFormat(colW, 8, ds.ExecutionEffort, "", 0, "C", false, 0, "")

	// Reversibility
	pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
	pdf.CellFormat(colW, 8, ds.Reversibility, "", 1, "C", false, 0, "")
}

func drawBulletList(pdf *gofpdf.Fpdf, items []string, textColor []int) {
	pdf.SetFont("Helvetica", "", 9)
	pdf.SetTextColor(textColor[0], textColor[1], textColor[2])
	for _, item := range items {
		pdf.CellFormat(5, 5, "•", "", 0, "L", false, 0, "")
		pdf.MultiCell(165, 5, item, "", "L", false)
	}
}

func drawChecklistItems(pdf *gofpdf.Fpdf, items []string) {
	pdf.SetFont("Helvetica", "", 9)
	pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
	for _, item := range items {
		pdf.CellFormat(5, 5, "☐", "", 0, "L", false, 0, "")
		pdf.MultiCell(165, 5, item, "", "L", false)
	}
}

func drawLabelValue(pdf *gofpdf.Fpdf, label, value string, pageWidth float64) {
	if value == "" {
		return
	}
	pdf.SetFont("Helvetica", "B", 9)
	pdf.SetTextColor(colorGray[0], colorGray[1], colorGray[2])
	pdf.CellFormat(35, 5, label, "", 0, "L", false, 0, "")
	pdf.SetFont("Helvetica", "", 9)
	pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
	pdf.MultiCell(pageWidth-35, 5, value, "", "L", false)
}

func drawKPITable(pdf *gofpdf.Fpdf, kpis []model.OutcomeKPI, pageWidth float64) {
	pdf.SetFillColor(colorLightBg[0], colorLightBg[1], colorLightBg[2])
	pdf.SetFont("Helvetica", "B", 8)
	pdf.SetTextColor(colorGray[0], colorGray[1], colorGray[2])

	cols := []float64{50, 30, 30, 30, 30}
	headers := []string{"KPI", "BASELINE", "TARGET", "ACTUAL", "DELTA"}

	for i, h := range headers {
		pdf.CellFormat(cols[i], 7, h, "", 0, "C", true, 0, "")
	}
	pdf.Ln(-1)

	for _, kpi := range kpis {
		pdf.SetFont("Helvetica", "", 9)
		pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
		pdf.CellFormat(cols[0], 7, string(kpi.Key), "B", 0, "L", false, 0, "")
		pdf.CellFormat(cols[1], 7, fmt.Sprintf("%.1f", kpi.Baseline), "B", 0, "C", false, 0, "")
		pdf.CellFormat(cols[2], 7, fmt.Sprintf("%.1f", kpi.Target), "B", 0, "C", false, 0, "")

		actualStr := "—"
		if kpi.Actual != nil {
			actualStr = fmt.Sprintf("%.1f", *kpi.Actual)
		}
		pdf.CellFormat(cols[3], 7, actualStr, "B", 0, "C", false, 0, "")

		deltaStr := "—"
		if kpi.DeltaPct != nil {
			if *kpi.DeltaPct > 0 {
				pdf.SetTextColor(colorGreen[0], colorGreen[1], colorGreen[2])
				deltaStr = fmt.Sprintf("+%.1f%%", *kpi.DeltaPct)
			} else if *kpi.DeltaPct < 0 {
				pdf.SetTextColor(colorRed[0], colorRed[1], colorRed[2])
				deltaStr = fmt.Sprintf("%.1f%%", *kpi.DeltaPct)
			} else {
				deltaStr = "0%"
			}
		}
		pdf.SetFont("Helvetica", "B", 9)
		pdf.CellFormat(cols[4], 7, deltaStr, "B", 1, "C", false, 0, "")
	}
}

func checkPageBreak(pdf *gofpdf.Fpdf, requiredHeight float64) {
	if pdf.GetY()+requiredHeight > 270 {
		pdf.AddPage()
	}
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

// drawLogoIcon draws a purple rounded square with a lightning bolt
func drawLogoIcon(pdf *gofpdf.Fpdf, x, y float64) {
	// Purple rounded square background
	pdf.SetFillColor(colorPrimary[0], colorPrimary[1], colorPrimary[2])
	pdf.RoundedRect(x, y, 10, 10, 2, "1234", "F")
	
	// Lightning bolt (simplified as lines)
	pdf.SetDrawColor(255, 255, 255)
	pdf.SetLineWidth(0.8)
	
	// Lightning bolt shape
	pdf.Line(x+6, y+2, x+4, y+5)   // Top diagonal
	pdf.Line(x+4, y+5, x+6.5, y+5) // Middle horizontal
	pdf.Line(x+6.5, y+5, x+4, y+8) // Bottom diagonal
}
