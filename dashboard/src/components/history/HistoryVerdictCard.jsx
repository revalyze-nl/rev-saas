import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { decisionsV2Api } from '../../lib/apiClient';
import { 
  getOutcome, 
  isOutcomeComplete,
  getChosenScenario,
  saveChosenScenario
} from '../../lib/outcomeStorage';
import ScenarioMiniCard from './ScenarioMiniCard';
import ScenarioDetailsDrawer from './ScenarioDetailsDrawer';
import OutcomeTracker from './OutcomeTracker';

// Transform backend scenarios to frontend format
const transformScenarios = (backendScenarios) => {
  if (!backendScenarios || !Array.isArray(backendScenarios)) return [];
  
  return backendScenarios.map(s => ({
    id: s.scenarioId,
    type: s.scenarioId.replace('_', '-'),
    name: s.title,
    summary: s.summary,
    positioning: s.positioning || '',
    bestWhen: s.bestWhen || '',
    revenueImpact: s.metrics?.revenueImpactRange || 'N/A',
    churnImpact: s.metrics?.churnImpactRange || 'N/A',
    riskLevel: s.metrics?.riskLabel || 'Medium',
    timeToImpact: s.metrics?.timeToImpact || 'N/A',
    executionEffort: s.metrics?.executionEffort || 'Medium',
    deltas: {
      revenue: s.deltas?.revenueDelta || (s.scenarioId === 'balanced' ? 'Baseline' : 'N/A'),
      churn: s.deltas?.churnDelta || (s.scenarioId === 'balanced' ? 'Baseline' : 'N/A'),
      risk: s.deltas?.riskDelta || (s.scenarioId === 'balanced' ? 'Baseline' : 'N/A'),
      time: s.deltas?.timeDelta || (s.scenarioId === 'balanced' ? 'Baseline' : 'N/A'),
      effort: s.deltas?.effortDelta || (s.scenarioId === 'balanced' ? 'Baseline' : 'N/A'),
    },
    comparedToRecommended: s.comparedToRecommended || '',
    isRecommended: s.scenarioId === 'balanced',
    tradeoffs: s.tradeoffs || [],
    implementation: {
      whatItLooksLike: s.details?.whatItLooksLike || [],
      operationalImplications: s.details?.operationalImplications || [],
      failureModes: s.details?.failureModes || [],
      whenMakesSense: s.details?.whenItMakesSense || '',
      successMetrics: s.details?.successMetrics || [],
      affectedPersonas: s.details?.affectedPersonas || [],
      whatChangesVsBaseline: s.details?.whatChangesVsBaseline || '',
    }
  }));
};

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Netflix-Style Episode Card
 * Represents a single Verdict as an "Episode" with expandable scenarios
 */
const HistoryVerdictCard = memo(({ 
  decision, 
  episodeNumber,
  isExpanded, 
  onToggleExpand,
  onVerdictUpdate
}) => {
  const navigate = useNavigate();
  
  // State
  const [scenarios, setScenarios] = useState([]);
  const [scenariosLoading, setScenariosLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [chosenScenario, setChosenScenario] = useState(null);
  const [chosenScenarioData, setChosenScenarioData] = useState(null);
  const [outcomeStatus, setOutcomeStatus] = useState({ hasOutcome: false, isComplete: false });
  const [drawerScenario, setDrawerScenario] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [applyingScenario, setApplyingScenario] = useState(null);
  const [showApplyConfirm, setShowApplyConfirm] = useState(null);

  // Load outcome status and chosen scenario
  useEffect(() => {
    if (decision) {
      // Get chosen scenario from localStorage first, then fallback to DB
      const storedChosen = getChosenScenario(decision.id);
      if (storedChosen) {
        setChosenScenario(storedChosen.scenarioId);
        setChosenScenarioData(storedChosen);
      } else if (decision.chosenScenarioId) {
        setChosenScenario(decision.chosenScenarioId);
      }

      // Load outcome status
      const outcome = getOutcome(decision.id);
      setOutcomeStatus({
        hasOutcome: outcome.decisionTaken !== null || outcome.dateImplemented || outcome.notes,
        isComplete: isOutcomeComplete(outcome),
      });
    }
  }, [decision]);

  // Fetch scenarios when expanded
  useEffect(() => {
    const fetchScenarios = async () => {
      if (isExpanded && decision && !scenariosLoading && scenarios.length === 0 && decision.hasScenarios !== false) {
        setScenariosLoading(true);
        try {
          const { data } = await decisionsV2Api.getScenarios(decision.id);
          const transformed = transformScenarios(data.scenarios);
          setScenarios(transformed);
        } catch (err) {
          // 404 is expected if scenarios don't exist
          if (!err.message?.includes('404') && !err.message?.includes('not found')) {
            console.error('Failed to fetch scenarios:', err);
          }
          setScenarios([]);
        } finally {
          setScenariosLoading(false);
        }
      }
    };

    fetchScenarios();
  }, [isExpanded, decision, scenarios.length, scenariosLoading]);

  // Generate scenarios
  const handleGenerateScenarios = useCallback(async () => {
    if (!decision) return;
    
    setGenerating(true);
    try {
      const { data } = await decisionsV2Api.generateScenarios(decision.id, false);
      const transformed = transformScenarios(data.scenarios);
      setScenarios(transformed);
      
      if (onVerdictUpdate) {
        onVerdictUpdate(decision.id);
      }
    } catch (err) {
      console.error('Failed to generate scenarios:', err);
    } finally {
      setGenerating(false);
    }
  }, [decision, onVerdictUpdate]);

  // View scenario details
  const handleViewDetails = useCallback((scenario) => {
    setDrawerScenario(scenario);
    setIsDrawerOpen(true);
  }, []);

  // Initiate apply scenario
  const handleApplyClick = useCallback((scenario) => {
    setShowApplyConfirm(scenario);
  }, []);

  // Confirm apply scenario
  const handleConfirmApply = useCallback(async () => {
    if (!decision || !showApplyConfirm) return;
    
    setApplyingScenario(showApplyConfirm.id);
    try {
      // Save to localStorage
      const saved = saveChosenScenario(decision.id, showApplyConfirm);
      
      // Also try backend
      try {
        await decisionsV2Api.setChosenScenario(decision.id, showApplyConfirm.id);
      } catch (err) {
        console.warn('Failed to save to backend:', err);
      }
      
      setChosenScenario(showApplyConfirm.id);
      setChosenScenarioData(saved);
      setIsDrawerOpen(false);
      setDrawerScenario(null);
      setShowApplyConfirm(null);
      
      if (onVerdictUpdate) {
        onVerdictUpdate(decision.id);
      }
    } catch (err) {
      console.error('Failed to apply scenario:', err);
    } finally {
      setApplyingScenario(null);
    }
  }, [decision, showApplyConfirm, onVerdictUpdate]);

  // Handle outcome saved
  const handleOutcomeSaved = useCallback(() => {
    const outcome = getOutcome(decision.id);
    setOutcomeStatus({
      hasOutcome: outcome.decisionTaken !== null || outcome.dateImplemented || outcome.notes,
      isComplete: isOutcomeComplete(outcome),
    });
    
    if (onVerdictUpdate) {
      onVerdictUpdate(decision.id);
    }
  }, [decision?.id, onVerdictUpdate]);

  // Close drawer
  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setTimeout(() => setDrawerScenario(null), 300);
  }, []);

  if (!decision) return null;

  const verdict = decision.verdict || {};
  const status = decision._status || { label: 'Draft', style: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };
  
  // Find chosen scenario name
  const chosenScenarioName = chosenScenarioData?.scenarioName || 
    scenarios.find(s => s.id === chosenScenario)?.name ||
    (chosenScenario ? chosenScenario.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : null);

  return (
    <div 
      id={`episode-${decision.id}`}
      className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
        isExpanded 
          ? 'bg-slate-900/60 border-violet-500/40 shadow-lg shadow-violet-500/5' 
          : 'bg-slate-900/30 border-slate-800/40 hover:border-slate-700/60 hover:bg-slate-900/40'
      }`}
    >
      {/* Episode Header - Always visible */}
      <button
        onClick={() => onToggleExpand(decision.id)}
        className="w-full text-left p-5"
      >
        <div className="flex items-start gap-4">
          {/* Episode Number */}
          <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg transition-colors ${
            isExpanded 
              ? 'bg-violet-500/20 text-violet-400' 
              : 'bg-slate-800/50 text-slate-500'
          }`}>
            {episodeNumber || '#'}
          </div>

          {/* Episode Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-lg font-semibold text-white truncate">
                {decision.companyName}
              </h3>
              {/* Status Badge */}
              <span className={`px-2 py-0.5 text-xs font-medium rounded border ${status.style}`}>
                {status.label}
              </span>
            </div>
            
            {/* Headline */}
            <p className="text-sm text-slate-400 mb-2 line-clamp-1">
              {decision.verdictHeadline || verdict.headline || verdict.executiveVerdict?.recommendation || 'Pricing strategy analysis'}
            </p>

            {/* Meta Row */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>{formatDate(decision.createdAt)}</span>
              {decision.context?.primaryKPI?.value && (
                <>
                  <span className="text-slate-700">•</span>
                  <span>KPI: {decision.context.primaryKPI.value}</span>
                </>
              )}
              {verdict.executiveVerdict?.timeHorizon && (
                <>
                  <span className="text-slate-700">•</span>
                  <span>{verdict.executiveVerdict.timeHorizon}</span>
                </>
              )}
            </div>

            {/* Chosen Ending Badge */}
            {chosenScenarioName && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                <svg className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs text-violet-400">
                  Chosen ending: <span className="font-medium text-violet-300">{chosenScenarioName}</span>
                </span>
              </div>
            )}

            {/* Outcome Summary */}
            {outcomeStatus.hasOutcome && (
              <div className="mt-2 text-xs text-emerald-400/80">
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                  Outcome recorded
                </span>
              </div>
            )}
          </div>

          {/* Expand Indicator */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            isExpanded ? 'bg-violet-500/20 rotate-180' : 'bg-slate-800/50'
          }`}>
            <svg 
              className={`w-5 h-5 transition-colors ${isExpanded ? 'text-violet-400' : 'text-slate-500'}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Quick Actions Row */}
      <div className="px-5 pb-4 flex items-center gap-2">
        <button
          onClick={() => onToggleExpand(decision.id)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
            isExpanded
              ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
              : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800 border border-slate-700/50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          {isExpanded ? 'Hide Endings' : 'View Endings'}
          {scenarios.length > 0 && !isExpanded && (
            <span className="text-xs text-slate-500">({scenarios.length})</span>
          )}
        </button>
        <button
          onClick={() => navigate(`/decisions/${decision.id}`)}
          className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors flex items-center gap-2"
        >
          Open Verdict
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
      </div>

      {/* Expanded Content - Alternate Endings */}
      {isExpanded && (
        <div className="border-t border-slate-800/40">
          {/* Alternate Endings Section */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Alternate Endings
              </h4>
              {!chosenScenario && scenarios.length > 0 && (
                <span className="text-xs text-slate-500">Choose an ending to track outcome</span>
              )}
            </div>

            {scenariosLoading ? (
              <div className="flex items-center justify-center py-12">
                <svg className="animate-spin w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : scenarios.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {scenarios.map((scenario) => (
                  <ScenarioMiniCard
                    key={scenario.id}
                    scenario={scenario}
                    isChosen={chosenScenario === scenario.id}
                    chosenScenarioId={chosenScenario}
                    chosenScenarioData={chosenScenarioData}
                    onViewDetails={handleViewDetails}
                    onApply={handleApplyClick}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-900/30 rounded-xl border border-slate-800/30">
                <svg className="w-12 h-12 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-sm text-white mb-2">Generate Alternate Endings</p>
                <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
                  AI will create 4 strategic paths: Aggressive, Balanced, Conservative, and Do Nothing
                </p>
                <button
                  onClick={handleGenerateScenarios}
                  disabled={generating}
                  className="px-5 py-2.5 bg-violet-500 hover:bg-violet-600 text-white font-medium text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                >
                  {generating ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Endings
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Outcome Section */}
          <div className="border-t border-slate-800/40 p-5">
            <OutcomeTracker 
              decisionId={decision.id}
              chosenScenarioId={chosenScenario}
              chosenScenarioName={chosenScenarioName}
              onOutcomeSaved={handleOutcomeSaved}
            />
          </div>
        </div>
      )}

      {/* Scenario Details Drawer */}
      <ScenarioDetailsDrawer
        scenario={drawerScenario}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onApply={handleApplyClick}
        isChosen={drawerScenario ? chosenScenario === drawerScenario.id : false}
        chosenScenarioId={chosenScenario}
        chosenScenarioData={chosenScenarioData}
      />

      {/* Apply Confirmation Modal */}
      {showApplyConfirm && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowApplyConfirm(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Choose This Ending?</h3>
                  <p className="text-xs text-slate-500">Set as your execution path</p>
                </div>
              </div>

              <div className="p-4 bg-slate-950/50 border border-slate-800/50 rounded-xl mb-4">
                <p className="text-white font-medium mb-1">{showApplyConfirm.name}</p>
                <p className="text-xs text-slate-500 italic">{showApplyConfirm.positioning || showApplyConfirm.summary}</p>
              </div>

              <p className="text-sm text-slate-400 mb-6">
                This will mark <span className="text-white font-medium">{showApplyConfirm.name}</span> as your chosen ending. You can then track the actual outcome.
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowApplyConfirm(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                  disabled={applyingScenario}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmApply}
                  disabled={applyingScenario}
                  className="px-5 py-2.5 text-sm bg-violet-500 hover:bg-violet-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {applyingScenario ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Applying...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Choose This Ending
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

HistoryVerdictCard.displayName = 'HistoryVerdictCard';

export default HistoryVerdictCard;
