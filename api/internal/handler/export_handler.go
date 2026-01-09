package handler

import (
	"bytes"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/mux"
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

// ExportDecisionHTML handles GET /api/v2/decisions/:id/export/html (for PDF via browser print)
func (h *ExportHandler) ExportDecisionHTML(w http.ResponseWriter, r *http.Request) {
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

	// Build premium HTML
	html := buildPremiumPDFExport(decision, scenarios, outcome)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(html))
}

func buildPremiumPDFExport(decision *model.DecisionV2, scenarios *model.ScenarioSet, outcome *model.MeasurableOutcome) string {
	var buf bytes.Buffer
	
	currentDate := time.Now().Format("Jan 02, 2006")
	
	buf.WriteString(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Decision Report - `)
	buf.WriteString(decision.CompanyName)
	buf.WriteString(`</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            line-height: 1.6;
            padding: 0;
            min-height: 100vh;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 48px 40px;
            background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
            min-height: 100vh;
        }
        
        /* Header */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 48px;
            padding-bottom: 24px;
            border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }
        
        .logo {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .logo-icon {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .logo-icon svg {
            width: 24px;
            height: 24px;
        }
        
        .logo-text {
            font-size: 24px;
            font-weight: 700;
            background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .date {
            font-size: 14px;
            color: #64748b;
        }
        
        /* Title Section */
        .title-section {
            margin-bottom: 40px;
        }
        
        .report-title {
            font-size: 32px;
            font-weight: 700;
            color: #f8fafc;
            margin-bottom: 8px;
        }
        
        .report-subtitle {
            font-size: 16px;
            color: #94a3b8;
        }
        
        /* Company Info */
        .company-info {
            background: rgba(30, 41, 59, 0.5);
            border: 1px solid rgba(148, 163, 184, 0.1);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 32px;
        }
        
        .company-name {
            font-size: 20px;
            font-weight: 600;
            color: #f8fafc;
            margin-bottom: 4px;
        }
        
        .company-url {
            font-size: 14px;
            color: #8b5cf6;
        }
        
        /* Section */
        .section {
            margin-bottom: 32px;
        }
        
        .section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
        }
        
        .section-icon {
            width: 32px;
            height: 32px;
            background: rgba(139, 92, 246, 0.15);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .section-icon svg {
            width: 18px;
            height: 18px;
            color: #8b5cf6;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #f8fafc;
        }
        
        .section-content {
            background: rgba(30, 41, 59, 0.5);
            border: 1px solid rgba(148, 163, 184, 0.1);
            border-radius: 16px;
            padding: 24px;
        }
        
        /* Verdict Box */
        .verdict-headline {
            font-size: 18px;
            font-weight: 600;
            color: #f8fafc;
            margin-bottom: 12px;
            line-height: 1.4;
        }
        
        .verdict-summary {
            font-size: 14px;
            color: #94a3b8;
            line-height: 1.7;
        }
        
        /* Metrics Grid */
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-top: 20px;
        }
        
        .metric-card {
            background: rgba(15, 23, 42, 0.5);
            border: 1px solid rgba(148, 163, 184, 0.1);
            border-radius: 12px;
            padding: 16px;
        }
        
        .metric-label {
            font-size: 11px;
            font-weight: 500;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
        }
        
        .metric-value {
            font-size: 16px;
            font-weight: 600;
            color: #f8fafc;
        }
        
        .metric-value.positive {
            color: #10b981;
        }
        
        .metric-value.negative {
            color: #ef4444;
        }
        
        .metric-value.warning {
            color: #f59e0b;
        }
        
        /* Scenario Card */
        .scenario-card {
            background: rgba(139, 92, 246, 0.1);
            border: 1px solid rgba(139, 92, 246, 0.2);
            border-radius: 12px;
            padding: 20px;
            margin-top: 16px;
        }
        
        .scenario-badge {
            display: inline-block;
            background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
            color: white;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 4px 10px;
            border-radius: 20px;
            margin-bottom: 12px;
        }
        
        .scenario-title {
            font-size: 16px;
            font-weight: 600;
            color: #f8fafc;
            margin-bottom: 8px;
        }
        
        .scenario-summary {
            font-size: 14px;
            color: #94a3b8;
            line-height: 1.6;
        }
        
        /* KPI Table */
        .kpi-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
        }
        
        .kpi-table th {
            text-align: left;
            font-size: 11px;
            font-weight: 500;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 12px 16px;
            border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }
        
        .kpi-table td {
            padding: 14px 16px;
            font-size: 14px;
            color: #e2e8f0;
            border-bottom: 1px solid rgba(148, 163, 184, 0.05);
        }
        
        .kpi-table tr:last-child td {
            border-bottom: none;
        }
        
        .kpi-name {
            font-weight: 500;
        }
        
        .delta-positive {
            color: #10b981;
            font-weight: 600;
        }
        
        .delta-negative {
            color: #ef4444;
            font-weight: 600;
        }
        
        /* Status Badge */
        .status-badge {
            display: inline-block;
            font-size: 12px;
            font-weight: 500;
            padding: 4px 12px;
            border-radius: 20px;
        }
        
        .status-achieved {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
        }
        
        .status-missed {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
        }
        
        .status-pending {
            background: rgba(148, 163, 184, 0.15);
            color: #94a3b8;
        }
        
        .status-in-progress {
            background: rgba(59, 130, 246, 0.15);
            color: #3b82f6;
        }
        
        /* Footer */
        .footer {
            margin-top: 48px;
            padding-top: 24px;
            border-top: 1px solid rgba(148, 163, 184, 0.1);
            text-align: center;
        }
        
        .footer-text {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 4px;
        }
        
        .footer-brand {
            font-size: 14px;
            font-weight: 500;
            color: #8b5cf6;
        }
        
        /* Print Styles */
        @media print {
            body {
                background: white;
                color: #1e293b;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .container {
                background: white;
                padding: 20px;
            }
            
            .section-content, .company-info, .metric-card, .scenario-card {
                background: #f8fafc;
                border-color: #e2e8f0;
            }
            
            .logo-text {
                color: #8b5cf6;
                -webkit-text-fill-color: #8b5cf6;
            }
            
            .report-title, .company-name, .section-title, .verdict-headline, .scenario-title {
                color: #0f172a;
            }
            
            .kpi-table td, .verdict-summary, .scenario-summary {
                color: #475569;
            }
        }
        
        @page {
            margin: 0.5in;
            size: A4;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="logo">
                <div class="logo-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                </div>
                <span class="logo-text">Revalyze</span>
            </div>
            <div class="date">`)
	buf.WriteString(currentDate)
	buf.WriteString(`</div>
        </div>
        
        <!-- Title -->
        <div class="title-section">
            <h1 class="report-title">Decision Intelligence Report</h1>
            <p class="report-subtitle">Strategic analysis and recommendations based on AI-powered insights</p>
        </div>
        
        <!-- Company Info -->
        <div class="company-info">
            <div class="company-name">`)
	buf.WriteString(decision.CompanyName)
	buf.WriteString(`</div>
            <div class="company-url">`)
	buf.WriteString(decision.WebsiteURL)
	buf.WriteString(`</div>
        </div>
        
        <!-- Executive Summary -->
        <div class="section">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                </div>
                <h2 class="section-title">Executive Summary</h2>
            </div>
            <div class="section-content">
                <div class="verdict-headline">`)
	buf.WriteString(decision.Verdict.Headline)
	buf.WriteString(`</div>
                <p class="verdict-summary">`)
	buf.WriteString(decision.Verdict.Summary)
	buf.WriteString(`</p>
            </div>
        </div>
        
        <!-- Decision Snapshot -->
        <div class="section">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                </div>
                <h2 class="section-title">Decision Snapshot</h2>
            </div>
            <div class="section-content">
                <div class="metrics-grid">`)
	
	// Add metrics if available
	if decision.Verdict.DecisionSnapshot != nil {
		ds := decision.Verdict.DecisionSnapshot
		
		// Revenue Impact
		buf.WriteString(`
                    <div class="metric-card">
                        <div class="metric-label">Expected Revenue Impact</div>
                        <div class="metric-value positive">`)
		buf.WriteString(ds.RevenueImpactRange)
		buf.WriteString(`</div>
                    </div>`)
		
		// Risk Level
		riskClass := "warning"
		if strings.ToLower(ds.PrimaryRiskLevel) == "low" {
			riskClass = "positive"
		} else if strings.ToLower(ds.PrimaryRiskLevel) == "high" {
			riskClass = "negative"
		}
		buf.WriteString(`
                    <div class="metric-card">
                        <div class="metric-label">Risk Level</div>
                        <div class="metric-value `)
		buf.WriteString(riskClass)
		buf.WriteString(`">`)
		buf.WriteString(ds.PrimaryRiskLevel)
		buf.WriteString(`</div>
                    </div>`)
		
		// Time to Impact
		buf.WriteString(`
                    <div class="metric-card">
                        <div class="metric-label">Time to Impact</div>
                        <div class="metric-value">`)
		buf.WriteString(ds.TimeToImpact)
		buf.WriteString(`</div>
                    </div>`)
		
		// Execution Effort
		effortClass := ""
		if strings.ToLower(ds.ExecutionEffort) == "low" {
			effortClass = "positive"
		} else if strings.ToLower(ds.ExecutionEffort) == "high" {
			effortClass = "negative"
		}
		buf.WriteString(`
                    <div class="metric-card">
                        <div class="metric-label">Execution Effort</div>
                        <div class="metric-value `)
		buf.WriteString(effortClass)
		buf.WriteString(`">`)
		buf.WriteString(ds.ExecutionEffort)
		buf.WriteString(`</div>
                    </div>`)
	}
	
	buf.WriteString(`
                </div>
            </div>
        </div>`)
	
	// Chosen Scenario
	if scenarios != nil && decision.ChosenScenarioID != nil && *decision.ChosenScenarioID != "" {
		for _, sc := range scenarios.Scenarios {
			if string(sc.ScenarioID) == *decision.ChosenScenarioID {
				buf.WriteString(`
        
        <!-- Chosen Path -->
        <div class="section">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </div>
                <h2 class="section-title">Chosen Strategic Path</h2>
            </div>
            <div class="section-content">
                <div class="scenario-card">
                    <span class="scenario-badge">Selected Strategy</span>
                    <div class="scenario-title">`)
				buf.WriteString(sc.Title)
				buf.WriteString(`</div>
                    <p class="scenario-summary">`)
				buf.WriteString(sc.Summary)
				buf.WriteString(`</p>
                    <div class="metrics-grid" style="margin-top: 16px;">
                        <div class="metric-card">
                            <div class="metric-label">Revenue Impact</div>
                            <div class="metric-value positive">`)
				buf.WriteString(sc.Metrics.RevenueImpactRange)
				buf.WriteString(`</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">Churn Impact</div>
                            <div class="metric-value">`)
				buf.WriteString(sc.Metrics.ChurnImpactRange)
				buf.WriteString(`</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`)
				break
			}
		}
	}
	
	// Outcome KPIs
	if outcome != nil && len(outcome.KPIs) > 0 {
		statusClass := "status-pending"
		statusLabel := "Pending"
		switch outcome.Status {
		case model.OutcomeStatusAchieved:
			statusClass = "status-achieved"
			statusLabel = "Achieved"
		case model.OutcomeStatusMissed:
			statusClass = "status-missed"
			statusLabel = "Missed"
		case model.OutcomeStatusInProgress:
			statusClass = "status-in-progress"
			statusLabel = "In Progress"
		}
		
		buf.WriteString(`
        
        <!-- Outcome Tracking -->
        <div class="section">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                </div>
                <h2 class="section-title">Outcome Tracking</h2>
            </div>
            <div class="section-content">
                <div style="margin-bottom: 16px;">
                    <span class="status-badge `)
		buf.WriteString(statusClass)
		buf.WriteString(`">`)
		buf.WriteString(statusLabel)
		buf.WriteString(`</span>
                </div>
                <table class="kpi-table">
                    <thead>
                        <tr>
                            <th>KPI</th>
                            <th>Baseline</th>
                            <th>Target</th>
                            <th>Actual</th>
                            <th>Delta</th>
                        </tr>
                    </thead>
                    <tbody>`)
		
		for _, kpi := range outcome.KPIs {
			actual := "—"
			deltaStr := "—"
			deltaClass := ""
			
			if kpi.Actual != nil {
				actual = fmt.Sprintf("%.1f", *kpi.Actual)
			}
			if kpi.DeltaPct != nil {
				if *kpi.DeltaPct > 0 {
					deltaStr = fmt.Sprintf("+%.1f%%", *kpi.DeltaPct)
					deltaClass = "delta-positive"
				} else if *kpi.DeltaPct < 0 {
					deltaStr = fmt.Sprintf("%.1f%%", *kpi.DeltaPct)
					deltaClass = "delta-negative"
				} else {
					deltaStr = "0%"
				}
			}
			
			buf.WriteString(`
                        <tr>
                            <td class="kpi-name">`)
			buf.WriteString(string(kpi.Key))
			buf.WriteString(`</td>
                            <td>`)
			buf.WriteString(fmt.Sprintf("%.1f", kpi.Baseline))
			buf.WriteString(`</td>
                            <td>`)
			buf.WriteString(fmt.Sprintf("%.1f", kpi.Target))
			buf.WriteString(`</td>
                            <td>`)
			buf.WriteString(actual)
			buf.WriteString(`</td>
                            <td class="`)
			buf.WriteString(deltaClass)
			buf.WriteString(`">`)
			buf.WriteString(deltaStr)
			buf.WriteString(`</td>
                        </tr>`)
		}
		
		buf.WriteString(`
                    </tbody>
                </table>
            </div>
        </div>`)
	}
	
	// Footer
	buf.WriteString(`
        
        <!-- Footer -->
        <div class="footer">
            <p class="footer-text">Generated by</p>
            <p class="footer-brand">Revalyze - AI-Powered Decision Intelligence</p>
            <p class="footer-text" style="margin-top: 8px;">© `)
	buf.WriteString(fmt.Sprintf("%d", time.Now().Year()))
	buf.WriteString(` Revalyze B.V.</p>
        </div>
    </div>
    
    <script>
        // Auto-open print dialog
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        };
    </script>
</body>
</html>`)
	
	return buf.String()
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
