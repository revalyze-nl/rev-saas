package service

import (
	"bytes"
	"fmt"

	"rev-saas-api/internal/model"
)

// PDFExportDataV2 contains all data needed to generate the V2 analysis PDF.
type PDFExportDataV2 struct {
	Analysis *model.AnalysisResultV2
}

// GenerateAnalysisPDFV2 creates a professionally styled PDF report for V2 analysis.
func GenerateAnalysisPDFV2(data PDFExportDataV2) (*bytes.Buffer, error) {
	builder := newPDFBuilder()
	pdf := builder.pdf

	// Disable auto page break to control it manually
	pdf.SetAutoPageBreak(false, 0)

	analysis := data.Analysis

	// Format date
	reportDate := analysis.CreatedAt.Format("Jan 02, 2006")

	// Add first page
	pdf.AddPage()

	// ═══════════════════════════════════════════════════════════════
	// HEADER BAR
	// ═══════════════════════════════════════════════════════════════
	builder.drawHeader(reportDate)

	// ═══════════════════════════════════════════════════════════════
	// TITLE BLOCK
	// ═══════════════════════════════════════════════════════════════
	builder.drawTitleBlockV2()

	// ═══════════════════════════════════════════════════════════════
	// BUSINESS SNAPSHOT (from V2 input)
	// ═══════════════════════════════════════════════════════════════
	builder.drawSectionTitleCompact("Business Snapshot")
	builder.drawSnapshotBoxV2(analysis.Input.BusinessMetrics)

	// ═══════════════════════════════════════════════════════════════
	// EXECUTIVE SUMMARY
	// ═══════════════════════════════════════════════════════════════
	builder.drawSectionTitleCompact("Executive Summary")
	builder.drawSummaryV2Compact(analysis.LLMOutput.ExecutiveSummary)

	// ═══════════════════════════════════════════════════════════════
	// SYSTEM DETECTED INSIGHTS (Rule Engine)
	// ═══════════════════════════════════════════════════════════════
	if len(analysis.RuleResult.Insights) > 0 {
		builder.checkPageBreakV2(reportDate, 50)
		builder.drawSectionTitleColoredV2("System Detected Insights", colorAmber)
		builder.drawRuleEngineInsightsV2(analysis.RuleResult.Insights, reportDate)
	}

	// ═══════════════════════════════════════════════════════════════
	// PRICING INSIGHTS (LLM)
	// ═══════════════════════════════════════════════════════════════
	if len(analysis.LLMOutput.PricingInsights) > 0 {
		builder.checkPageBreakV2(reportDate, 50)
		builder.drawSectionTitleColoredV2("Pricing Insights", colorPrimary)
		builder.drawPricingInsightsV2Compact(analysis.LLMOutput.PricingInsights, reportDate)
	}

	// ═══════════════════════════════════════════════════════════════
	// RECOMMENDATIONS
	// ═══════════════════════════════════════════════════════════════
	if len(analysis.LLMOutput.Recommendations) > 0 {
		builder.checkPageBreakV2(reportDate, 50)
		builder.drawSectionTitleColoredV2("Recommendations", colorEmerald)
		builder.drawRecommendationsV2Compact(analysis.LLMOutput.Recommendations, reportDate)
	}

	// ═══════════════════════════════════════════════════════════════
	// SUGGESTED NEXT ACTIONS
	// ═══════════════════════════════════════════════════════════════
	if len(analysis.LLMOutput.SuggestedNextActions) > 0 {
		builder.checkPageBreakV2(reportDate, 50)
		builder.drawSectionTitleColoredV2("Suggested Next Actions", colorIndigo)
		builder.drawSuggestedNextActionsV2(analysis.LLMOutput.SuggestedNextActions, reportDate)
	}

	// ═══════════════════════════════════════════════════════════════
	// RISK ANALYSIS
	// ═══════════════════════════════════════════════════════════════
	if len(analysis.LLMOutput.RiskAnalysis) > 0 {
		builder.checkPageBreakV2(reportDate, 40)
		builder.drawSectionTitleColoredV2("Risk Analysis", colorRed)
		builder.drawRiskAnalysisV2Compact(analysis.LLMOutput.RiskAnalysis, reportDate)
	}

	// ═══════════════════════════════════════════════════════════════
	// FOOTER
	// ═══════════════════════════════════════════════════════════════
	builder.drawFooterV2()

	// Output to buffer
	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	return &buf, nil
}

// V2-specific PDF drawing methods

// checkPageBreakV2 checks if we need a new page and handles the transition
func (b *pdfBuilder) checkPageBreakV2(reportDate string, requiredSpace float64) {
	// Page height is ~297mm for A4, we want to leave 25mm for footer
	maxY := 272.0
	if b.pdf.GetY()+requiredSpace > maxY {
		b.drawFooterV2()
		b.pdf.AddPage()
		b.drawHeader(reportDate)
	}
}

// drawSectionTitleCompact draws a section title with minimal spacing
func (b *pdfBuilder) drawSectionTitleCompact(title string) {
	b.pdf.Ln(4)
	b.setColor(colorDark)
	b.pdf.SetFont("Arial", "B", 13)
	b.pdf.CellFormat(b.contentWidth, 6, title, "", 1, "L", false, 0, "")
	b.pdf.Ln(2)
}

// drawSectionTitleColoredV2 draws a section title with color and divider
func (b *pdfBuilder) drawSectionTitleColoredV2(title string, titleColor pdfColor) {
	b.pdf.Ln(6)
	b.setColor(titleColor)
	b.pdf.SetFont("Arial", "B", 13)
	b.pdf.CellFormat(b.contentWidth, 6, title, "", 1, "L", false, 0, "")

	// Short divider line
	y := b.pdf.GetY() + 1
	b.setDrawColor(titleColor)
	b.pdf.SetLineWidth(0.4)
	b.pdf.Line(b.leftMargin, y, b.leftMargin+50, y)

	b.pdf.Ln(4)
}

// drawTitleBlockV2 draws the main title for V2 reports
func (b *pdfBuilder) drawTitleBlockV2() {
	// Main title
	b.setColor(colorDark)
	b.pdf.SetFont("Arial", "B", 20)
	b.pdf.CellFormat(b.contentWidth, 8, "Pricing Analysis Report V2", "", 1, "L", false, 0, "")

	b.pdf.Ln(1)

	// Subtitle
	b.setColor(colorMedium)
	b.pdf.SetFont("Arial", "", 10)
	b.pdf.CellFormat(b.contentWidth, 5, "Deterministic analysis with AI-powered strategic insights.", "", 1, "L", false, 0, "")

	b.pdf.Ln(4)
}

// drawSnapshotBoxV2 draws the business snapshot from V2 input
func (b *pdfBuilder) drawSnapshotBoxV2(metrics model.BusinessMetricsInput) {
	// Check if no metrics
	hasMetrics := metrics.MRR > 0 || metrics.ChurnRate > 0 || metrics.Customers > 0

	if !hasMetrics {
		// No metrics - show placeholder
		b.setFillColor(colorBg)
		b.setDrawColor(colorLighter)
		b.pdf.SetLineWidth(0.3)

		boxX := b.leftMargin
		boxY := b.pdf.GetY()
		boxW := b.contentWidth
		boxH := 12.0

		b.pdf.RoundedRect(boxX, boxY, boxW, boxH, 2, "1234", "FD")

		b.pdf.SetXY(boxX+5, boxY+4)
		b.setColor(colorLight)
		b.pdf.SetFont("Arial", "I", 9)
		b.pdf.CellFormat(boxW-10, 4, "No business metrics configured.", "", 0, "L", false, 0, "")

		b.pdf.SetY(boxY + boxH + 4)
		return
	}

	// Draw rounded box
	b.setFillColor(colorBg)
	b.setDrawColor(colorLighter)
	b.pdf.SetLineWidth(0.3)

	boxX := b.leftMargin
	boxY := b.pdf.GetY()
	boxW := b.contentWidth
	boxH := 22.0

	b.pdf.RoundedRect(boxX, boxY, boxW, boxH, 2, "1234", "FD")

	// Left column
	colWidth := (boxW - 20) / 2
	leftX := boxX + 8
	rightX := boxX + colWidth + 12

	// Row 1 - MRR and Churn
	rowY := boxY + 5

	// MRR
	b.pdf.SetXY(leftX, rowY)
	b.setColor(colorMedium)
	b.pdf.SetFont("Arial", "", 8)
	b.pdf.CellFormat(20, 4, "MRR:", "", 0, "L", false, 0, "")
	b.setColor(colorDark)
	b.pdf.SetFont("Arial", "B", 9)
	currency := metrics.Currency
	if currency == "" {
		currency = "USD"
	}
	b.pdf.CellFormat(colWidth-20, 4, formatCurrency(metrics.MRR, currency), "", 0, "L", false, 0, "")

	// Monthly Churn
	b.pdf.SetXY(rightX, rowY)
	b.setColor(colorMedium)
	b.pdf.SetFont("Arial", "", 8)
	b.pdf.CellFormat(30, 4, "Churn:", "", 0, "L", false, 0, "")

	// Color based on churn rate
	if metrics.ChurnRate > 7 {
		b.setColor(colorRed)
	} else if metrics.ChurnRate < 3 {
		b.setColor(colorEmerald)
	} else {
		b.setColor(colorAmber)
	}
	b.pdf.SetFont("Arial", "B", 9)
	b.pdf.CellFormat(colWidth-30, 4, fmt.Sprintf("%.1f%%", metrics.ChurnRate), "", 0, "L", false, 0, "")

	// Row 2 - Customers and ARR
	rowY = boxY + 13

	// Customers
	b.pdf.SetXY(leftX, rowY)
	b.setColor(colorMedium)
	b.pdf.SetFont("Arial", "", 8)
	b.pdf.CellFormat(20, 4, "Customers:", "", 0, "L", false, 0, "")
	b.setColor(colorDark)
	b.pdf.SetFont("Arial", "B", 9)
	b.pdf.CellFormat(colWidth-20, 4, fmt.Sprintf("%d", metrics.Customers), "", 0, "L", false, 0, "")

	// ARR
	b.pdf.SetXY(rightX, rowY)
	b.setColor(colorMedium)
	b.pdf.SetFont("Arial", "", 8)
	b.pdf.CellFormat(30, 4, "ARR:", "", 0, "L", false, 0, "")
	b.setColor(colorDark)
	b.pdf.SetFont("Arial", "B", 9)
	b.pdf.CellFormat(colWidth-30, 4, formatCurrency(metrics.ARR, currency), "", 0, "L", false, 0, "")

	// Move cursor below box
	b.pdf.SetY(boxY + boxH + 4)
}

// drawSummaryV2Compact draws the executive summary for V2 with minimal spacing
func (b *pdfBuilder) drawSummaryV2Compact(summary string) {
	if summary == "" {
		summary = "No executive summary available for this analysis."
	}

	// Clean up summary text
	summary = cleanText(summary)

	b.setColor(colorDark)
	b.pdf.SetFont("Arial", "", 10)

	// Simple paragraph rendering with word wrap
	lines := b.pdf.SplitText(summary, b.contentWidth)
	for _, line := range lines {
		b.pdf.CellFormat(b.contentWidth, 4.5, line, "", 1, "L", false, 0, "")
	}

	b.pdf.Ln(2)
}

// drawRuleEngineInsightsV2 draws the deterministic rule engine insights
func (b *pdfBuilder) drawRuleEngineInsightsV2(insights []model.RuleEngineInsight, reportDate string) {
	for i, insight := range insights {
		// Check page break
		b.checkPageBreakV2(reportDate, 25)

		startY := b.pdf.GetY()

		// Severity indicator
		severityColor := colorMedium
		switch insight.Severity {
		case "critical":
			severityColor = colorRed
		case "warning":
			severityColor = colorAmber
		case "info":
			severityColor = colorPrimary
		}

		// Draw severity badge
		b.setFillColor(severityColor)
		b.pdf.Circle(b.leftMargin+3, startY+2.5, 1.5, "F")

		// Title line
		b.pdf.SetXY(b.leftMargin+8, startY)
		b.setColor(colorDark)
		b.pdf.SetFont("Arial", "B", 9)
		b.pdf.CellFormat(b.contentWidth-50, 5, insight.Title, "", 0, "L", false, 0, "")

		// Code badge (right side, same line as title)
		b.setColor(colorLight)
		b.pdf.SetFont("Arial", "", 7)
		b.pdf.CellFormat(40, 5, insight.Code, "", 0, "R", false, 0, "")

		// Move to next line for description
		b.pdf.SetXY(b.leftMargin+8, startY+6)

		// Description
		b.setColor(colorMedium)
		b.pdf.SetFont("Arial", "", 8)
		descText := cleanText(insight.Description)
		lines := b.pdf.SplitText(descText, b.contentWidth-12)
		for _, line := range lines {
			b.pdf.SetX(b.leftMargin + 8)
			b.pdf.CellFormat(b.contentWidth-12, 4, line, "", 1, "L", false, 0, "")
		}

		// Space between insights
		if i < len(insights)-1 {
			b.pdf.Ln(4)
		}
	}

	b.pdf.Ln(3)
}

// drawPricingInsightsV2Compact draws the LLM-generated pricing insights
func (b *pdfBuilder) drawPricingInsightsV2Compact(insights []model.LLMPricingInsight, reportDate string) {
	for i, insight := range insights {
		// Check page break
		b.checkPageBreakV2(reportDate, 30)

		startY := b.pdf.GetY()

		// Card background
		b.setFillColor(pdfColor{248, 250, 252}) // Very light gray
		b.setDrawColor(pdfColor{226, 232, 240})
		b.pdf.SetLineWidth(0.2)

		// Calculate height
		b.pdf.SetFont("Arial", "", 8)
		bodyLines := b.pdf.SplitText(cleanText(insight.Body), b.contentWidth-16)
		cardHeight := 10.0 + float64(len(bodyLines))*4

		b.pdf.RoundedRect(b.leftMargin, startY, b.contentWidth, cardHeight, 2, "1234", "FD")

		// Title
		b.pdf.SetXY(b.leftMargin+6, startY+3)
		b.setColor(colorDark)
		b.pdf.SetFont("Arial", "B", 9)
		b.pdf.CellFormat(b.contentWidth-12, 5, insight.Title, "", 1, "L", false, 0, "")

		// Body
		b.setColor(colorMedium)
		b.pdf.SetFont("Arial", "", 8)
		for _, line := range bodyLines {
			b.pdf.SetX(b.leftMargin + 6)
			b.pdf.CellFormat(b.contentWidth-12, 4, line, "", 1, "L", false, 0, "")
		}

		b.pdf.SetY(startY + cardHeight + 3)

		if i >= 4 {
			break // Limit to 5 insights
		}
	}

	b.pdf.Ln(2)
}

// drawRecommendationsV2Compact draws the LLM-generated recommendations
func (b *pdfBuilder) drawRecommendationsV2Compact(recommendations []model.LLMRecommendation, reportDate string) {
	for i, rec := range recommendations {
		// Check page break
		b.checkPageBreakV2(reportDate, 25)

		startY := b.pdf.GetY()

		// Number badge
		b.setFillColor(colorEmerald)
		b.pdf.Circle(b.leftMargin+4, startY+2.5, 3, "F")
		b.pdf.SetXY(b.leftMargin+1.5, startY+0.5)
		b.pdf.SetTextColor(255, 255, 255)
		b.pdf.SetFont("Arial", "B", 7)
		b.pdf.CellFormat(5, 4, fmt.Sprintf("%d", i+1), "", 0, "C", false, 0, "")

		// Action (bold)
		b.pdf.SetXY(b.leftMargin+10, startY)
		b.setColor(colorDark)
		b.pdf.SetFont("Arial", "B", 9)
		b.pdf.CellFormat(b.contentWidth-15, 5, cleanText(rec.Action), "", 1, "L", false, 0, "")

		// Reason
		b.pdf.SetX(b.leftMargin + 10)
		b.setColor(colorMedium)
		b.pdf.SetFont("Arial", "", 8)
		reasonText := cleanText(rec.Reason)
		lines := b.pdf.SplitText(reasonText, b.contentWidth-15)
		for _, line := range lines {
			b.pdf.SetX(b.leftMargin + 10)
			b.pdf.CellFormat(b.contentWidth-15, 4, line, "", 1, "L", false, 0, "")
		}

		b.pdf.Ln(3)

		if i >= 4 {
			break // Limit to 5 recommendations
		}
	}

	b.pdf.Ln(2)
}

// drawRiskAnalysisV2Compact draws the risk analysis section
func (b *pdfBuilder) drawRiskAnalysisV2Compact(risks []string, reportDate string) {
	for i, risk := range risks {
		if risk == "" {
			continue
		}

		// Check page break
		b.checkPageBreakV2(reportDate, 15)

		startY := b.pdf.GetY()

		// Warning indicator
		b.setFillColor(colorRed)
		b.pdf.Circle(b.leftMargin+3, startY+2, 1.5, "F")

		// Risk text
		b.pdf.SetXY(b.leftMargin+8, startY)
		b.setColor(colorDark)
		b.pdf.SetFont("Arial", "", 8)
		riskText := cleanText(risk)
		lines := b.pdf.SplitText(riskText, b.contentWidth-12)
		for _, line := range lines {
			b.pdf.SetX(b.leftMargin + 8)
			b.pdf.CellFormat(b.contentWidth-12, 4, line, "", 1, "L", false, 0, "")
		}

		b.pdf.Ln(2)

		if i >= 4 {
			break // Limit to 5 risks
		}
	}

	b.pdf.Ln(2)
}

// drawSuggestedNextActionsV2 draws the suggested next actions section
func (b *pdfBuilder) drawSuggestedNextActionsV2(actions []model.SuggestedNextAction, reportDate string) {
	for i, action := range actions {
		// Check page break
		b.checkPageBreakV2(reportDate, 25)

		startY := b.pdf.GetY()

		// Card background with indigo accent
		b.setFillColor(pdfColor{238, 242, 255}) // Very light indigo
		b.setDrawColor(pdfColor{199, 210, 254}) // Light indigo border
		b.pdf.SetLineWidth(0.2)

		// Calculate height based on description
		b.pdf.SetFont("Arial", "", 8)
		descLines := b.pdf.SplitText(cleanText(action.Description), b.contentWidth-16)
		cardHeight := 12.0 + float64(len(descLines))*4

		b.pdf.RoundedRect(b.leftMargin, startY, b.contentWidth, cardHeight, 2, "1234", "FD")

		// Action badge
		b.pdf.SetXY(b.leftMargin+6, startY+3)
		b.setFillColor(colorIndigo)
		b.pdf.SetFillColor(colorIndigo.R, colorIndigo.G, colorIndigo.B)
		b.pdf.RoundedRect(b.leftMargin+6, startY+3, 12, 4, 1, "1234", "F")
		b.pdf.SetXY(b.leftMargin+6, startY+3)
		b.pdf.SetTextColor(255, 255, 255)
		b.pdf.SetFont("Arial", "B", 6)
		b.pdf.CellFormat(12, 4, "ACTION", "", 0, "C", false, 0, "")

		// Code (right side)
		b.pdf.SetXY(b.leftMargin+b.contentWidth-50, startY+3)
		b.setColor(colorLight)
		b.pdf.SetFont("Arial", "", 6)
		b.pdf.CellFormat(44, 4, action.Code, "", 0, "R", false, 0, "")

		// Title
		b.pdf.SetXY(b.leftMargin+6, startY+8)
		b.setColor(colorDark)
		b.pdf.SetFont("Arial", "B", 9)
		b.pdf.CellFormat(b.contentWidth-12, 5, cleanText(action.Title), "", 1, "L", false, 0, "")

		// Description
		b.setColor(colorMedium)
		b.pdf.SetFont("Arial", "", 8)
		for _, line := range descLines {
			b.pdf.SetX(b.leftMargin + 6)
			b.pdf.CellFormat(b.contentWidth-12, 4, line, "", 1, "L", false, 0, "")
		}

		b.pdf.SetY(startY + cardHeight + 3)

		if i >= 2 {
			break // Limit to 3 actions
		}
	}

	b.pdf.Ln(2)
}

// drawFooterV2 draws the footer at the bottom of the page
func (b *pdfBuilder) drawFooterV2() {
	// Move to bottom of page
	footerY := b.pageHeight - 20

	// If current Y is past footer position, we're fine
	if b.pdf.GetY() > footerY-10 {
		// Too close to footer, don't overlap
		return
	}

	// Draw separator line
	b.setDrawColor(colorLighter)
	b.pdf.Line(b.leftMargin, footerY, b.pageWidth-b.rightMargin, footerY)

	// Disclaimer text
	b.pdf.SetXY(b.leftMargin, footerY+3)
	b.setColor(colorLight)
	b.pdf.SetFont("Arial", "I", 7)
	b.pdf.CellFormat(b.contentWidth, 3, "These suggestions are based on the data you provided and do not constitute financial or legal advice.", "", 1, "C", false, 0, "")

	// Footer text
	b.pdf.SetX(b.leftMargin)
	b.pdf.SetFont("Arial", "", 7)
	b.pdf.CellFormat(b.contentWidth, 3, "Generated by Revalyze - AI-Powered Pricing Intelligence | (c) 2025 Revalyze B.V.", "", 1, "C", false, 0, "")
}

