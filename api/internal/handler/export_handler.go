package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
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
	limitsService   *service.LimitsService
}

// NewExportHandler creates a new export handler
func NewExportHandler(
	decisionRepo *mongorepo.DecisionV2Repository,
	scenarioService *service.ScenarioService,
	outcomeService *service.OutcomeService,
	limitsService *service.LimitsService,
) *ExportHandler {
	return &ExportHandler{
		decisionRepo:    decisionRepo,
		scenarioService: scenarioService,
		outcomeService:  outcomeService,
		limitsService:   limitsService,
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

	// Check feature gating - Exports require Enterprise plan
	if h.limitsService != nil {
		limitResult := h.limitsService.CanUseExports(user)
		if !limitResult.Allowed {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"code":    limitResult.ErrorCode,
				"message": limitResult.Reason,
				"plan":    limitResult.Plan,
			})
			return
		}
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

// PDF Colors - Beautiful modern palette
var (
	// Brand colors
	colorPrimary   = []int{79, 70, 229}   // Indigo-600 - Primary brand
	colorSecondary = []int{139, 92, 246}  // Violet-500 - Secondary accent
	colorAccent    = []int{236, 72, 153}  // Pink-500 - Accent highlights
	
	// Neutral colors
	colorDark      = []int{17, 24, 39}    // Gray-900 - Dark text
	colorGray      = []int{75, 85, 99}    // Gray-600 - Secondary text
	colorLightGray = []int{156, 163, 175} // Gray-400 - Muted text
	colorLightBg   = []int{249, 250, 251} // Gray-50 - Light background
	colorCardBg    = []int{255, 255, 255} // White - Card background
	colorBorder    = []int{229, 231, 235} // Gray-200 - Borders
	
	// Status colors
	colorGreen     = []int{34, 197, 94}   // Green-500 - Success
	colorRed       = []int{239, 68, 68}   // Red-500 - Error
	colorAmber     = []int{245, 158, 11}  // Amber-500 - Warning
	colorBlue      = []int{59, 130, 246}  // Blue-500 - Info
	colorTeal      = []int{20, 184, 166}  // Teal-500 - Alternative accent
)

func buildComprehensivePDF(decision *model.DecisionV2, scenarios *model.ScenarioSet, outcome *model.MeasurableOutcome) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(20, 20, 20)
	pdf.SetAutoPageBreak(true, 25)

	pageWidth := 170.0
	currentDate := time.Now().Format("January 2, 2006")

	// === PAGE 1: Beautiful Cover & Executive Summary ===
	pdf.AddPage()

	// Top gradient-like banner (using layered rectangles)
	pdf.SetFillColor(colorPrimary[0], colorPrimary[1], colorPrimary[2])
	pdf.Rect(0, 0, 210, 55, "F")
	
	// Subtle overlay pattern (lighter stripe)
	pdf.SetFillColor(colorSecondary[0], colorSecondary[1], colorSecondary[2])
	pdf.Rect(0, 0, 70, 55, "F")
	
	// Logo (bigger size)
	drawLogo(pdf, 22, 8)
	
	// Date badge on right
	pdf.SetFillColor(255, 255, 255)
	pdf.RoundedRect(140, 12, 50, 8, 2, "1234", "F")
	pdf.SetXY(140, 12)
	pdf.SetFont("Helvetica", "", 8)
	pdf.SetTextColor(colorGray[0], colorGray[1], colorGray[2])
	pdf.CellFormat(50, 8, currentDate, "", 0, "C", false, 0, "")
	
	// Main title on banner
	pdf.SetXY(20, 32)
	pdf.SetFont("Helvetica", "B", 24)
	pdf.SetTextColor(255, 255, 255)
	pdf.CellFormat(pageWidth, 10, "Decision Intelligence Report", "", 1, "L", false, 0, "")
	
	pdf.SetXY(20, 43)
	pdf.SetFont("Helvetica", "", 11)
	pdf.SetTextColor(229, 231, 235)
	pdf.CellFormat(pageWidth, 5, "Strategic analysis and AI-powered recommendations", "", 1, "L", false, 0, "")

	pdf.SetY(65)

	// Company Info Card with shadow effect
	cardY := pdf.GetY()
	
	// Shadow (slightly offset darker rectangle)
	pdf.SetFillColor(220, 220, 220)
	pdf.RoundedRect(22, cardY+2, pageWidth, 22, 4, "1234", "F")
	
	// Main card
	pdf.SetFillColor(colorCardBg[0], colorCardBg[1], colorCardBg[2])
	pdf.SetDrawColor(colorBorder[0], colorBorder[1], colorBorder[2])
	pdf.SetLineWidth(0.3)
	pdf.RoundedRect(20, cardY, pageWidth, 22, 4, "1234", "FD")
	
	// Company icon circle
	pdf.SetFillColor(colorPrimary[0], colorPrimary[1], colorPrimary[2])
	pdf.Circle(32, cardY+11, 6, "F")
	pdf.SetFont("Helvetica", "B", 10)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetXY(29, cardY+8)
	initials := getInitials(decision.CompanyName)
	pdf.CellFormat(6, 6, initials, "", 0, "C", false, 0, "")
	
	// Company name
	pdf.SetXY(42, cardY+6)
	pdf.SetFont("Helvetica", "B", 14)
	pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
	pdf.CellFormat(100, 6, decision.CompanyName, "", 0, "L", false, 0, "")
	
	// Website URL
	pdf.SetXY(42, cardY+13)
	pdf.SetFont("Helvetica", "", 9)
	pdf.SetTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2])
	pdf.CellFormat(100, 5, decision.WebsiteURL, "", 0, "L", false, 0, "")
	
	pdf.SetY(cardY + 32)

	// Executive Summary Section
	drawSection(pdf, "Executive Summary", pageWidth)

	pdf.SetFont("Helvetica", "B", 13)
	pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
	pdf.MultiCell(pageWidth, 6, cleanTextForPDF(decision.Verdict.Headline), "", "L", false)
	pdf.Ln(2)

	pdf.SetFont("Helvetica", "", 10)
	pdf.SetTextColor(colorGray[0], colorGray[1], colorGray[2])
	pdf.MultiCell(pageWidth, 5, cleanTextForPDF(decision.Verdict.Summary), "", "L", false)
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
			pdf.MultiCell(pageWidth-35, 5, cleanTextForPDF(ina.WhatStagnates), "", "L", false)
		}

		if ina.CompetitorAdvantage != "" {
			pdf.SetFont("Helvetica", "B", 9)
			pdf.SetTextColor(colorRed[0], colorRed[1], colorRed[2])
			pdf.CellFormat(35, 5, "Competitors Gain:", "", 0, "L", false, 0, "")
			pdf.SetFont("Helvetica", "", 9)
			pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
			pdf.MultiCell(pageWidth-35, 5, cleanTextForPDF(ina.CompetitorAdvantage), "", "L", false)
		}

		if ina.FutureDifficulty != "" {
			pdf.SetFont("Helvetica", "B", 9)
			pdf.SetTextColor(colorRed[0], colorRed[1], colorRed[2])
			pdf.CellFormat(35, 5, "Future Difficulty:", "", 0, "L", false, 0, "")
			pdf.SetFont("Helvetica", "", 9)
			pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
			pdf.MultiCell(pageWidth-35, 5, cleanTextForPDF(ina.FutureDifficulty), "", "L", false)
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
			pdf.CellFormat(pageWidth, 5, fmt.Sprintf("%d. %s", i+1, cleanTextForPDF(alt.Name)), "", 1, "L", false, 0, "")

			pdf.SetFont("Helvetica", "I", 9)
			pdf.SetTextColor(colorGray[0], colorGray[1], colorGray[2])
			pdf.MultiCell(pageWidth, 4, "Why rejected: "+cleanTextForPDF(alt.WhyNotSelected), "", "L", false)
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

		// Beautiful header banner
		pdf.SetFillColor(colorSecondary[0], colorSecondary[1], colorSecondary[2])
		pdf.Rect(0, 0, 210, 45, "F")
		pdf.SetFillColor(colorPrimary[0], colorPrimary[1], colorPrimary[2])
		pdf.Rect(140, 0, 70, 45, "F")
		
		// Logo
		drawLogo(pdf, 22, 8)
		
		// Title on banner
		pdf.SetXY(20, 26)
		pdf.SetFont("Helvetica", "B", 20)
		pdf.SetTextColor(255, 255, 255)
		pdf.CellFormat(pageWidth, 8, "Strategic Scenarios", "", 1, "L", false, 0, "")
		
		pdf.SetXY(20, 35)
		pdf.SetFont("Helvetica", "", 10)
		pdf.SetTextColor(229, 231, 235)
		pdf.CellFormat(pageWidth, 5, "AI-generated alternative paths for your decision", "", 1, "L", false, 0, "")
		
		pdf.SetY(55)

		// Each scenario as a beautiful card
		for i, sc := range scenarios.Scenarios {
			checkPageBreak(pdf, 55)
			
			startY := pdf.GetY()
			isChosen := decision.ChosenScenarioID != nil && string(sc.ScenarioID) == *decision.ChosenScenarioID
			isRecommended := sc.ScenarioID == "balanced"
			
			// Card shadow
			pdf.SetFillColor(230, 230, 230)
			pdf.RoundedRect(22, startY+2, pageWidth, 48, 4, "1234", "F")
			
			// Main card
			pdf.SetFillColor(colorCardBg[0], colorCardBg[1], colorCardBg[2])
			pdf.SetDrawColor(colorBorder[0], colorBorder[1], colorBorder[2])
			pdf.SetLineWidth(0.3)
			pdf.RoundedRect(20, startY, pageWidth, 48, 4, "1234", "FD")
			
			// Left accent stripe based on status
			accentColor := colorLightGray
			if isChosen {
				accentColor = colorPrimary
			} else if isRecommended {
				accentColor = colorGreen
			}
			pdf.SetFillColor(accentColor[0], accentColor[1], accentColor[2])
			pdf.RoundedRect(20, startY, 5, 48, 4, "14", "F")
			
			// Scenario number badge
			pdf.SetFillColor(colorLightBg[0], colorLightBg[1], colorLightBg[2])
			pdf.Circle(35, startY+10, 6, "F")
			pdf.SetFont("Helvetica", "B", 10)
			pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
			pdf.SetXY(32, startY+7)
			pdf.CellFormat(6, 6, fmt.Sprintf("%d", i+1), "", 0, "C", false, 0, "")
			
			// Title with status
			pdf.SetXY(45, startY+6)
			pdf.SetFont("Helvetica", "B", 12)
			pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
			titleText := cleanTextForPDF(sc.Title)
			pdf.CellFormat(100, 6, titleText, "", 0, "L", false, 0, "")
			
			// Status badge
			if isChosen || isRecommended {
				badgeX := 155.0
				badgeText := "RECOMMENDED"
				badgeColor := colorGreen
				if isChosen {
					badgeText = "CHOSEN"
					badgeColor = colorPrimary
				}
				pdf.SetFillColor(badgeColor[0], badgeColor[1], badgeColor[2])
				pdf.RoundedRect(badgeX, startY+5, 32, 7, 2, "1234", "F")
				pdf.SetFont("Helvetica", "B", 7)
				pdf.SetTextColor(255, 255, 255)
				pdf.SetXY(badgeX, startY+5)
				pdf.CellFormat(32, 7, badgeText, "", 0, "C", false, 0, "")
			}
			
			// Summary
			pdf.SetXY(28, startY+16)
			pdf.SetFont("Helvetica", "", 9)
			pdf.SetTextColor(colorGray[0], colorGray[1], colorGray[2])
			pdf.MultiCell(157, 4, cleanTextForPDF(sc.Summary), "", "L", false)
			
			// Metrics row with icons - wider badges
			metricsY := startY + 34
			pdf.SetFont("Helvetica", "", 7)
			drawMetricBadge(pdf, 28, metricsY, "Revenue", cleanTextForPDF(sc.Metrics.RevenueImpactRange), colorGreen)
			drawMetricBadge(pdf, 70, metricsY, "Risk", cleanTextForPDF(sc.Metrics.RiskLabel), colorAmber)
			drawMetricBadge(pdf, 112, metricsY, "Time", cleanTextForPDF(sc.Metrics.TimeToImpact), colorBlue)
			drawMetricBadge(pdf, 154, metricsY, "Effort", cleanTextForPDF(sc.Metrics.ExecutionEffort), colorTeal)
			
			pdf.SetY(startY + 55)
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

	// === FOOTER - Draw on current page at the bottom ===
	// Disable auto page break temporarily
	pdf.SetAutoPageBreak(false, 0)
	
	// Footer position - absolute from page bottom
	footerY := 277.0 // A4 height is 297mm, footer at 277mm leaves 20mm for footer
	
	// Footer gradient-like bar
	pdf.SetFillColor(colorPrimary[0], colorPrimary[1], colorPrimary[2])
	pdf.Rect(0, footerY, 210, 20, "F")
	pdf.SetFillColor(colorSecondary[0], colorSecondary[1], colorSecondary[2])
	pdf.Rect(0, footerY, 70, 20, "F")
	
	// Footer text
	pdf.SetXY(20, footerY+4)
	pdf.SetFont("Helvetica", "", 8)
	pdf.SetTextColor(255, 255, 255)
	pdf.CellFormat(pageWidth, 4, "Generated by Revalyze - AI-Powered Decision Intelligence", "", 1, "C", false, 0, "")

	pdf.SetXY(20, footerY+9)
	pdf.SetFont("Helvetica", "", 7)
	pdf.SetTextColor(229, 231, 235)
	pdf.CellFormat(pageWidth, 4, fmt.Sprintf("(c) %d Revalyze B.V. | www.revalyze.co", time.Now().Year()), "", 1, "C", false, 0, "")

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
	y := pdf.GetY()
	
	// Gradient-like accent (two-color bar)
	pdf.SetFillColor(colorPrimary[0], colorPrimary[1], colorPrimary[2])
	pdf.RoundedRect(20, y, 4, 8, 1, "1234", "F")
	pdf.SetFillColor(colorSecondary[0], colorSecondary[1], colorSecondary[2])
	pdf.Rect(20, y+4, 4, 4, "F")
	
	// Section title
	pdf.SetX(28)
	pdf.SetFont("Helvetica", "B", 13)
	pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
	pdf.CellFormat(pageWidth-8, 8, title, "", 1, "L", false, 0, "")
	pdf.Ln(3)
}

func drawSnapshotTable(pdf *gofpdf.Fpdf, ds *model.DecisionSnapshotV2) {
	startY := pdf.GetY()
	
	// Background card - TALLER to fit two-line values
	pdf.SetFillColor(colorCardBg[0], colorCardBg[1], colorCardBg[2])
	pdf.SetDrawColor(colorBorder[0], colorBorder[1], colorBorder[2])
	pdf.SetLineWidth(0.3)
	pdf.RoundedRect(20, startY, 170, 38, 3, "1234", "FD")
	
	// Header row background
	pdf.SetFillColor(colorLightBg[0], colorLightBg[1], colorLightBg[2])
	pdf.RoundedRect(20, startY, 170, 10, 3, "12", "F")
	
	// Headers - use smaller font
	pdf.SetY(startY + 2)
	pdf.SetX(20)
	pdf.SetFont("Helvetica", "B", 6)
	pdf.SetTextColor(colorLightGray[0], colorLightGray[1], colorLightGray[2])
	
	cols := []string{"REVENUE IMPACT", "RISK", "TIME", "EFFORT", "REVERSIBILITY"}
	colW := 34.0
	for _, col := range cols {
		pdf.CellFormat(colW, 6, col, "", 0, "C", false, 0, "")
	}
	
	// Values - use MultiCell for wrapping long text
	valuesY := startY + 13
	
	// Revenue
	pdf.SetXY(20, valuesY)
	pdf.SetFont("Helvetica", "B", 8)
	pdf.SetTextColor(colorGreen[0], colorGreen[1], colorGreen[2])
	revenueText := cleanTextForPDF(ds.RevenueImpactRange)
	pdf.MultiCell(colW, 4, revenueText, "", "C", false)

	// Risk
	riskColor := colorAmber
	if strings.ToLower(ds.PrimaryRiskLevel) == "low" {
		riskColor = colorGreen
	} else if strings.ToLower(ds.PrimaryRiskLevel) == "high" {
		riskColor = colorRed
	}
	pdf.SetXY(20+colW, valuesY)
	pdf.SetTextColor(riskColor[0], riskColor[1], riskColor[2])
	pdf.MultiCell(colW, 4, cleanTextForPDF(ds.PrimaryRiskLevel), "", "C", false)

	// Time
	pdf.SetXY(20+colW*2, valuesY)
	pdf.SetTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2])
	pdf.MultiCell(colW, 4, cleanTextForPDF(ds.TimeToImpact), "", "C", false)

	// Effort
	effortColor := colorTeal
	if strings.ToLower(ds.ExecutionEffort) == "low" {
		effortColor = colorGreen
	} else if strings.ToLower(ds.ExecutionEffort) == "high" {
		effortColor = colorAmber
	}
	pdf.SetXY(20+colW*3, valuesY)
	pdf.SetTextColor(effortColor[0], effortColor[1], effortColor[2])
	pdf.MultiCell(colW, 4, cleanTextForPDF(ds.ExecutionEffort), "", "C", false)

	// Reversibility
	pdf.SetXY(20+colW*4, valuesY)
	pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
	pdf.MultiCell(colW, 4, cleanTextForPDF(ds.Reversibility), "", "C", false)
	
	pdf.SetY(startY + 42)
}

func drawBulletList(pdf *gofpdf.Fpdf, items []string, textColor []int) {
	for _, item := range items {
		y := pdf.GetY()
		// Colorful bullet point
		pdf.SetFillColor(colorSecondary[0], colorSecondary[1], colorSecondary[2])
		pdf.Circle(24, y+2.5, 1.5, "F")
		
		pdf.SetX(28)
		pdf.SetFont("Helvetica", "", 9)
		pdf.SetTextColor(textColor[0], textColor[1], textColor[2])
		pdf.MultiCell(162, 5, cleanTextForPDF(item), "", "L", false)
		pdf.Ln(1)
	}
}

func drawChecklistItems(pdf *gofpdf.Fpdf, items []string) {
	for _, item := range items {
		y := pdf.GetY()
		// Checkbox square
		pdf.SetDrawColor(colorBorder[0], colorBorder[1], colorBorder[2])
		pdf.SetLineWidth(0.4)
		pdf.RoundedRect(22, y, 4, 4, 0.5, "1234", "D")
		
		pdf.SetX(30)
		pdf.SetFont("Helvetica", "", 9)
		pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
		pdf.MultiCell(158, 5, cleanTextForPDF(item), "", "L", false)
		pdf.Ln(1)
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
	pdf.MultiCell(pageWidth-35, 5, cleanTextForPDF(value), "", "L", false)
}

func drawKPITable(pdf *gofpdf.Fpdf, kpis []model.OutcomeKPI, pageWidth float64) {
	startY := pdf.GetY()
	cols := []float64{50, 30, 30, 30, 30}
	headers := []string{"KPI", "BASELINE", "TARGET", "ACTUAL", "DELTA"}
	rowHeight := 9.0
	
	// Calculate table height
	tableHeight := 12.0 + (float64(len(kpis)) * rowHeight)
	
	// Table card background
	pdf.SetFillColor(colorCardBg[0], colorCardBg[1], colorCardBg[2])
	pdf.SetDrawColor(colorBorder[0], colorBorder[1], colorBorder[2])
	pdf.SetLineWidth(0.3)
	pdf.RoundedRect(20, startY, pageWidth, tableHeight, 3, "1234", "FD")
	
	// Header row
	pdf.SetFillColor(colorPrimary[0], colorPrimary[1], colorPrimary[2])
	pdf.RoundedRect(20, startY, pageWidth, 10, 3, "12", "F")
	
	pdf.SetY(startY + 2)
	pdf.SetX(20)
	pdf.SetFont("Helvetica", "B", 8)
	pdf.SetTextColor(255, 255, 255)
	
	for i, h := range headers {
		pdf.CellFormat(cols[i], 7, h, "", 0, "C", false, 0, "")
	}
	
	// Data rows
	pdf.SetY(startY + 12)
	for rowIdx, kpi := range kpis {
		pdf.SetX(20)
		
		// Alternating row background
		if rowIdx%2 == 0 {
			pdf.SetFillColor(colorLightBg[0], colorLightBg[1], colorLightBg[2])
			pdf.Rect(20, pdf.GetY(), pageWidth, rowHeight, "F")
		}
		
		pdf.SetFont("Helvetica", "B", 9)
		pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
		pdf.CellFormat(cols[0], rowHeight, string(kpi.Key), "", 0, "L", false, 0, "")
		
		pdf.SetFont("Helvetica", "", 9)
		pdf.SetTextColor(colorGray[0], colorGray[1], colorGray[2])
		pdf.CellFormat(cols[1], rowHeight, fmt.Sprintf("%.1f", kpi.Baseline), "", 0, "C", false, 0, "")
		
		pdf.SetTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2])
		pdf.CellFormat(cols[2], rowHeight, fmt.Sprintf("%.1f", kpi.Target), "", 0, "C", false, 0, "")

		actualStr := "-"
		if kpi.Actual != nil {
			actualStr = fmt.Sprintf("%.1f", *kpi.Actual)
		}
		pdf.SetTextColor(colorDark[0], colorDark[1], colorDark[2])
		pdf.CellFormat(cols[3], rowHeight, actualStr, "", 0, "C", false, 0, "")

		deltaStr := "-"
		deltaColor := colorGray
		if kpi.DeltaPct != nil {
			if *kpi.DeltaPct > 0 {
				deltaColor = colorGreen
				deltaStr = fmt.Sprintf("+%.1f%%", *kpi.DeltaPct)
			} else if *kpi.DeltaPct < 0 {
				deltaColor = colorRed
				deltaStr = fmt.Sprintf("%.1f%%", *kpi.DeltaPct)
			} else {
				deltaStr = "0%"
			}
		}
		pdf.SetFont("Helvetica", "B", 9)
		pdf.SetTextColor(deltaColor[0], deltaColor[1], deltaColor[2])
		pdf.CellFormat(cols[4], rowHeight, deltaStr, "", 1, "C", false, 0, "")
	}
	
	pdf.SetY(startY + tableHeight + 4)
}

func checkPageBreak(pdf *gofpdf.Fpdf, requiredHeight float64) {
	if pdf.GetY()+requiredHeight > 270 {
		pdf.AddPage()
	}
}

// drawMetricBadge draws a small metric badge with label and value
func drawMetricBadge(pdf *gofpdf.Fpdf, x, y float64, label, value string, accentColor []int) {
	badgeWidth := 40.0
	badgeHeight := 14.0
	
	// Background
	pdf.SetFillColor(colorLightBg[0], colorLightBg[1], colorLightBg[2])
	pdf.RoundedRect(x, y, badgeWidth, badgeHeight, 2, "1234", "F")
	
	// Label
	pdf.SetXY(x+2, y+1)
	pdf.SetFont("Helvetica", "", 6)
	pdf.SetTextColor(colorLightGray[0], colorLightGray[1], colorLightGray[2])
	pdf.CellFormat(badgeWidth-4, 3, label, "", 0, "L", false, 0, "")
	
	// Value - use MultiCell for wrapping
	pdf.SetXY(x+2, y+5)
	pdf.SetFont("Helvetica", "B", 6)
	pdf.SetTextColor(accentColor[0], accentColor[1], accentColor[2])
	pdf.MultiCell(badgeWidth-4, 3, value, "", "L", false)
}

// getInitials returns the first two letters of a company name
func getInitials(name string) string {
	words := strings.Fields(name)
	if len(words) == 0 {
		return "?"
	}
	if len(words) == 1 {
		if len(words[0]) >= 2 {
			return strings.ToUpper(words[0][:2])
		}
		return strings.ToUpper(words[0][:1])
	}
	return strings.ToUpper(string(words[0][0]) + string(words[1][0]))
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

// findExportLogoPath tries to find the logo file
func findExportLogoPath() string {
	// Try multiple possible paths
	paths := []string{
		"assets/revalyze-logo.png",
		"../assets/revalyze-logo.png",
		"/app/assets/revalyze-logo.png",
	}

	// Also try to find based on executable location
	if execPath, err := os.Executable(); err == nil {
		execDir := filepath.Dir(execPath)
		paths = append(paths, filepath.Join(execDir, "assets", "revalyze-logo.png"))
		paths = append(paths, filepath.Join(execDir, "..", "assets", "revalyze-logo.png"))
	}

	for _, p := range paths {
		if _, err := os.Stat(p); err == nil {
			absPath, _ := filepath.Abs(p)
			return absPath
		}
	}

	return ""
}

// cleanTextForPDF removes problematic characters that gofpdf can't render
func cleanTextForPDF(s string) string {
	// Replace em dash with regular dash
	s = strings.ReplaceAll(s, "\u2014", "-") // em dash
	s = strings.ReplaceAll(s, "\u2013", "-") // en dash

	// Replace smart quotes with regular quotes
	s = strings.ReplaceAll(s, "\u201c", `"`) // left double quote
	s = strings.ReplaceAll(s, "\u201d", `"`) // right double quote
	s = strings.ReplaceAll(s, "\u2018", "'") // left single quote
	s = strings.ReplaceAll(s, "\u2019", "'") // right single quote

	// Replace copyright symbol
	s = strings.ReplaceAll(s, "\u00a9", "(c)")

	// Replace other special characters
	s = strings.ReplaceAll(s, "\u2026", "...") // ellipsis
	s = strings.ReplaceAll(s, "\u2022", "-")   // bullet
	s = strings.ReplaceAll(s, "\u2192", "->")  // right arrow
	s = strings.ReplaceAll(s, "\u2190", "<-")  // left arrow
	s = strings.ReplaceAll(s, "\u2713", "[OK]") // checkmark
	s = strings.ReplaceAll(s, "\u26a0", "[!]") // warning sign

	// Normalize newlines
	s = strings.ReplaceAll(s, "\n\n", " ")
	s = strings.ReplaceAll(s, "\n", " ")
	
	// Clean up multiple spaces
	for strings.Contains(s, "  ") {
		s = strings.ReplaceAll(s, "  ", " ")
	}

	return strings.TrimSpace(s)
}

// drawLogo draws the logo (PNG if available, otherwise text fallback)
func drawLogo(pdf *gofpdf.Fpdf, x, y float64) {
	logoPath := findExportLogoPath()
	
	if logoPath != "" {
		// Use PNG logo - BIGGER size (38mm width)
		pdf.ImageOptions(logoPath, x, y, 38, 0, false,
			gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}, 0, "")
	} else {
		// Fallback: Draw a nice text-based logo
		pdf.SetFont("Helvetica", "B", 18)
		pdf.SetTextColor(255, 255, 255)
		pdf.SetXY(x, y+2)
		pdf.CellFormat(50, 10, "Revalyze", "", 0, "L", false, 0, "")
	}
}
