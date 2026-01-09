package handler

import (
	"bytes"
	"encoding/json"
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

// ExportDecisionJSON handles GET /api/v2/decisions/:id/export/json
func (h *ExportHandler) ExportDecisionJSON(w http.ResponseWriter, r *http.Request) {
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

	log.Printf("[export] Exporting decision %s to JSON for user %s", decisionID.Hex(), user.ID.Hex())

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

	// Build export response
	export := buildExportData(decision, scenarios, outcome)

	// Set download headers
	filename := fmt.Sprintf("decision_%s_%s.json", 
		sanitizeExportFilename(decision.CompanyName), 
		time.Now().Format("2006-01-02"))
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	w.Header().Set("Content-Type", "application/json")
	
	json.NewEncoder(w).Encode(export)
}

// ExportDecisionMarkdown handles GET /api/v2/decisions/:id/export/markdown
func (h *ExportHandler) ExportDecisionMarkdown(w http.ResponseWriter, r *http.Request) {
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

	log.Printf("[export] Exporting decision %s to Markdown for user %s", decisionID.Hex(), user.ID.Hex())

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

	// Build markdown
	markdown := buildMarkdownExport(decision, scenarios, outcome)

	// Set download headers
	filename := fmt.Sprintf("decision_%s_%s.md", 
		sanitizeExportFilename(decision.CompanyName), 
		time.Now().Format("2006-01-02"))
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	w.Header().Set("Content-Type", "text/markdown; charset=utf-8")
	
	w.Write([]byte(markdown))
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

	log.Printf("[export] Exporting decision %s to HTML for user %s", decisionID.Hex(), user.ID.Hex())

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

	// Build HTML
	html := buildHTMLExport(decision, scenarios, outcome)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(html))
}

// DecisionExport represents the exported decision data
type DecisionExport struct {
	ExportedAt time.Time `json:"exportedAt"`
	Version    string    `json:"version"`
	
	// Decision
	Decision struct {
		ID           string `json:"id"`
		CompanyName  string `json:"companyName"`
		WebsiteURL   string `json:"websiteUrl"`
		CreatedAt    string `json:"createdAt"`
	} `json:"decision"`
	
	// Verdict
	Verdict struct {
		Headline    string `json:"headline"`
		Summary     string `json:"summary"`
		Confidence  string `json:"confidence"`
		RiskLevel   string `json:"riskLevel"`
		TimeHorizon string `json:"timeHorizon"`
	} `json:"verdict"`
	
	// Chosen Scenario
	ChosenScenario *struct {
		ID           string `json:"id"`
		Title        string `json:"title"`
		Summary      string `json:"summary"`
		RevenueImpact string `json:"revenueImpact"`
		ChurnImpact   string `json:"churnImpact"`
		Risk          string `json:"risk"`
		TimeToImpact  string `json:"timeToImpact"`
	} `json:"chosenScenario,omitempty"`
	
	// Outcome KPIs
	Outcome *struct {
		Status string `json:"status"`
		KPIs   []struct {
			Key        string   `json:"key"`
			Baseline   float64  `json:"baseline"`
			Target     float64  `json:"target"`
			Actual     *float64 `json:"actual,omitempty"`
			DeltaPct   *float64 `json:"deltaPct,omitempty"`
			Confidence string   `json:"confidence"`
		} `json:"kpis,omitempty"`
	} `json:"outcome,omitempty"`
}

func buildExportData(decision *model.DecisionV2, scenarios *model.ScenarioSet, outcome *model.MeasurableOutcome) *DecisionExport {
	export := &DecisionExport{
		ExportedAt: time.Now(),
		Version:    "1.0",
	}
	
	export.Decision.ID = decision.ID.Hex()
	export.Decision.CompanyName = decision.CompanyName
	export.Decision.WebsiteURL = decision.WebsiteURL
	export.Decision.CreatedAt = decision.CreatedAt.Format(time.RFC3339)
	
	export.Verdict.Headline = decision.Verdict.Headline
	export.Verdict.Summary = decision.Verdict.Summary
	if decision.Verdict.ExecutiveVerdict != nil {
		export.Verdict.TimeHorizon = decision.Verdict.ExecutiveVerdict.TimeHorizon
	}
	if decision.Verdict.DecisionSnapshot != nil {
		export.Verdict.RiskLevel = decision.Verdict.DecisionSnapshot.PrimaryRiskLevel
	}
	
	// Find chosen scenario
	if scenarios != nil && decision.ChosenScenarioID != nil {
		for _, sc := range scenarios.Scenarios {
			if string(sc.ScenarioID) == *decision.ChosenScenarioID {
				export.ChosenScenario = &struct {
					ID           string `json:"id"`
					Title        string `json:"title"`
					Summary      string `json:"summary"`
					RevenueImpact string `json:"revenueImpact"`
					ChurnImpact   string `json:"churnImpact"`
					Risk          string `json:"risk"`
					TimeToImpact  string `json:"timeToImpact"`
				}{
					ID:            string(sc.ScenarioID),
					Title:         sc.Title,
					Summary:       sc.Summary,
					RevenueImpact: sc.Metrics.RevenueImpactRange,
					ChurnImpact:   sc.Metrics.ChurnImpactRange,
					Risk:          sc.Metrics.RiskLabel,
					TimeToImpact:  sc.Metrics.TimeToImpact,
				}
				break
			}
		}
	}
	
	// Add outcome
	if outcome != nil {
		export.Outcome = &struct {
			Status string `json:"status"`
			KPIs   []struct {
				Key        string   `json:"key"`
				Baseline   float64  `json:"baseline"`
				Target     float64  `json:"target"`
				Actual     *float64 `json:"actual,omitempty"`
				DeltaPct   *float64 `json:"deltaPct,omitempty"`
				Confidence string   `json:"confidence"`
			} `json:"kpis,omitempty"`
		}{
			Status: string(outcome.Status),
		}
		
		for _, kpi := range outcome.KPIs {
			export.Outcome.KPIs = append(export.Outcome.KPIs, struct {
				Key        string   `json:"key"`
				Baseline   float64  `json:"baseline"`
				Target     float64  `json:"target"`
				Actual     *float64 `json:"actual,omitempty"`
				DeltaPct   *float64 `json:"deltaPct,omitempty"`
				Confidence string   `json:"confidence"`
			}{
				Key:        string(kpi.Key),
				Baseline:   kpi.Baseline,
				Target:     kpi.Target,
				Actual:     kpi.Actual,
				DeltaPct:   kpi.DeltaPct,
				Confidence: string(kpi.Confidence),
			})
		}
	}
	
	return export
}

func buildMarkdownExport(decision *model.DecisionV2, scenarios *model.ScenarioSet, outcome *model.MeasurableOutcome) string {
	var buf bytes.Buffer
	
	// Header
	buf.WriteString(fmt.Sprintf("# Decision Report: %s\n\n", decision.CompanyName))
	buf.WriteString(fmt.Sprintf("**Website:** %s\n", decision.WebsiteURL))
	buf.WriteString(fmt.Sprintf("**Generated:** %s\n\n", time.Now().Format("January 2, 2006")))
	buf.WriteString("---\n\n")
	
	// Verdict Summary
	buf.WriteString("## Verdict Summary\n\n")
	buf.WriteString(fmt.Sprintf("**%s**\n\n", decision.Verdict.Headline))
	buf.WriteString(fmt.Sprintf("%s\n\n", decision.Verdict.Summary))
	
	if decision.Verdict.DecisionSnapshot != nil {
		ds := decision.Verdict.DecisionSnapshot
		buf.WriteString("### Key Metrics\n\n")
		buf.WriteString(fmt.Sprintf("- **Revenue Impact:** %s\n", ds.RevenueImpactRange))
		buf.WriteString(fmt.Sprintf("- **Risk Level:** %s\n", ds.PrimaryRiskLevel))
		buf.WriteString(fmt.Sprintf("- **Time to Impact:** %s\n", ds.TimeToImpact))
		buf.WriteString(fmt.Sprintf("- **Execution Effort:** %s\n\n", ds.ExecutionEffort))
	}
	
	// Chosen Scenario
	if scenarios != nil && decision.ChosenScenarioID != nil {
		for _, sc := range scenarios.Scenarios {
			if string(sc.ScenarioID) == *decision.ChosenScenarioID {
				buf.WriteString("## Chosen Path\n\n")
				buf.WriteString(fmt.Sprintf("**%s**\n\n", sc.Title))
				buf.WriteString(fmt.Sprintf("%s\n\n", sc.Summary))
				buf.WriteString(fmt.Sprintf("- Revenue Impact: %s\n", sc.Metrics.RevenueImpactRange))
				buf.WriteString(fmt.Sprintf("- Churn Impact: %s\n", sc.Metrics.ChurnImpactRange))
				buf.WriteString(fmt.Sprintf("- Risk: %s\n", sc.Metrics.RiskLabel))
				buf.WriteString(fmt.Sprintf("- Time to Impact: %s\n\n", sc.Metrics.TimeToImpact))
				break
			}
		}
	}
	
	// Outcome
	if outcome != nil && len(outcome.KPIs) > 0 {
		buf.WriteString("## Outcome Tracking\n\n")
		buf.WriteString(fmt.Sprintf("**Status:** %s\n\n", strings.Title(string(outcome.Status))))
		
		buf.WriteString("| KPI | Baseline | Target | Actual | Δ% |\n")
		buf.WriteString("|-----|----------|--------|--------|----|\n")
		for _, kpi := range outcome.KPIs {
			actual := "—"
			deltaPct := "—"
			if kpi.Actual != nil {
				actual = fmt.Sprintf("%.1f", *kpi.Actual)
			}
			if kpi.DeltaPct != nil {
				sign := ""
				if *kpi.DeltaPct > 0 {
					sign = "+"
				}
				deltaPct = fmt.Sprintf("%s%.1f%%", sign, *kpi.DeltaPct)
			}
			buf.WriteString(fmt.Sprintf("| %s | %.1f | %.1f | %s | %s |\n",
				kpi.Key, kpi.Baseline, kpi.Target, actual, deltaPct))
		}
		buf.WriteString("\n")
	}
	
	buf.WriteString("---\n\n")
	buf.WriteString("*Exported from Revalyze Decision Intelligence*\n")
	
	return buf.String()
}

func buildHTMLExport(decision *model.DecisionV2, scenarios *model.ScenarioSet, outcome *model.MeasurableOutcome) string {
	var buf bytes.Buffer
	
	buf.WriteString(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Decision Report - `)
	buf.WriteString(decision.CompanyName)
	buf.WriteString(`</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #1f2937; padding: 40px; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 28px; margin-bottom: 8px; }
        h2 { font-size: 20px; margin-top: 32px; margin-bottom: 16px; color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
        h3 { font-size: 16px; margin-top: 24px; margin-bottom: 12px; color: #4b5563; }
        p { margin-bottom: 12px; }
        .meta { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
        .headline { font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 12px; }
        .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 16px 0; }
        .metric { background: #f9fafb; padding: 12px 16px; border-radius: 8px; }
        .metric-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
        .metric-value { font-size: 16px; font-weight: 600; color: #111827; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; }
        .positive { color: #059669; }
        .negative { color: #dc2626; }
        .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
        @media print {
            body { padding: 20px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <h1>Decision Report</h1>
    <div class="meta">
        <strong>`)
	buf.WriteString(decision.CompanyName)
	buf.WriteString(`</strong> • `)
	buf.WriteString(decision.WebsiteURL)
	buf.WriteString(`<br>
        Generated: `)
	buf.WriteString(time.Now().Format("January 2, 2006"))
	buf.WriteString(`
    </div>
    
    <h2>Verdict Summary</h2>
    <p class="headline">`)
	buf.WriteString(decision.Verdict.Headline)
	buf.WriteString(`</p>
    <p>`)
	buf.WriteString(decision.Verdict.Summary)
	buf.WriteString(`</p>`)
	
	// Key Metrics
	if decision.Verdict.DecisionSnapshot != nil {
		ds := decision.Verdict.DecisionSnapshot
		buf.WriteString(`
    <div class="metrics">
        <div class="metric">
            <div class="metric-label">Revenue Impact</div>
            <div class="metric-value">`)
		buf.WriteString(ds.RevenueImpactRange)
		buf.WriteString(`</div>
        </div>
        <div class="metric">
            <div class="metric-label">Risk Level</div>
            <div class="metric-value">`)
		buf.WriteString(ds.PrimaryRiskLevel)
		buf.WriteString(`</div>
        </div>
        <div class="metric">
            <div class="metric-label">Time to Impact</div>
            <div class="metric-value">`)
		buf.WriteString(ds.TimeToImpact)
		buf.WriteString(`</div>
        </div>
        <div class="metric">
            <div class="metric-label">Execution Effort</div>
            <div class="metric-value">`)
		buf.WriteString(ds.ExecutionEffort)
		buf.WriteString(`</div>
        </div>
    </div>`)
	}
	
	// Chosen Scenario
	if scenarios != nil && decision.ChosenScenarioID != nil {
		for _, sc := range scenarios.Scenarios {
			if string(sc.ScenarioID) == *decision.ChosenScenarioID {
				buf.WriteString(`
    <h2>Chosen Path: `)
				buf.WriteString(sc.Title)
				buf.WriteString(`</h2>
    <p>`)
				buf.WriteString(sc.Summary)
				buf.WriteString(`</p>
    <div class="metrics">
        <div class="metric">
            <div class="metric-label">Revenue Impact</div>
            <div class="metric-value">`)
				buf.WriteString(sc.Metrics.RevenueImpactRange)
				buf.WriteString(`</div>
        </div>
        <div class="metric">
            <div class="metric-label">Churn Impact</div>
            <div class="metric-value">`)
				buf.WriteString(sc.Metrics.ChurnImpactRange)
				buf.WriteString(`</div>
        </div>
    </div>`)
				break
			}
		}
	}
	
	// Outcome KPIs
	if outcome != nil && len(outcome.KPIs) > 0 {
		buf.WriteString(`
    <h2>Outcome Tracking</h2>
    <p><strong>Status:</strong> `)
		buf.WriteString(strings.Title(string(outcome.Status)))
		buf.WriteString(`</p>
    <table>
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
			deltaPct := "—"
			deltaClass := ""
			if kpi.Actual != nil {
				actual = fmt.Sprintf("%.1f", *kpi.Actual)
			}
			if kpi.DeltaPct != nil {
				sign := ""
				if *kpi.DeltaPct > 0 {
					sign = "+"
					deltaClass = "positive"
				} else if *kpi.DeltaPct < 0 {
					deltaClass = "negative"
				}
				deltaPct = fmt.Sprintf("%s%.1f%%", sign, *kpi.DeltaPct)
			}
			buf.WriteString(fmt.Sprintf(`
            <tr>
                <td>%s</td>
                <td>%.1f</td>
                <td>%.1f</td>
                <td>%s</td>
                <td class="%s">%s</td>
            </tr>`, string(kpi.Key), kpi.Baseline, kpi.Target, actual, deltaClass, deltaPct))
		}
		buf.WriteString(`
        </tbody>
    </table>`)
	}
	
	buf.WriteString(`
    
    <div class="footer">
        Exported from Revalyze Decision Intelligence • `)
	buf.WriteString(time.Now().Format("2006-01-02 15:04"))
	buf.WriteString(`
    </div>
</body>
</html>`)
	
	return buf.String()
}

func sanitizeExportFilename(name string) string {
	// Remove or replace invalid filename characters
	name = strings.ToLower(name)
	name = strings.ReplaceAll(name, " ", "_")
	name = strings.ReplaceAll(name, "/", "_")
	name = strings.ReplaceAll(name, "\\", "_")
	name = strings.ReplaceAll(name, ":", "_")
	name = strings.ReplaceAll(name, "*", "_")
	name = strings.ReplaceAll(name, "?", "_")
	name = strings.ReplaceAll(name, "\"", "_")
	name = strings.ReplaceAll(name, "<", "_")
	name = strings.ReplaceAll(name, ">", "_")
	name = strings.ReplaceAll(name, "|", "_")
	if len(name) > 50 {
		name = name[:50]
	}
	return name
}

