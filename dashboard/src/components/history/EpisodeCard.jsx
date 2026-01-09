import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { decisionsV2Api } from '../../lib/apiClient';
import { 
  getOutcome, 
  isOutcomeComplete,
  getChosenScenario,
  saveChosenScenario
} from '../../lib/outcomeStorage';
import EndingCard from './EndingCard';
import EndingInspectDrawer from './EndingInspectDrawer';
import OutcomePanel from './OutcomePanel';

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

// Generate dramatic episode title from verdict
const generateEpisodeTitle = (decision) => {
  const verdict = decision.verdict || {};
  const headline = verdict.headline || verdict.executiveVerdict?.recommendation || '';
  
  // Use headline if it's dramatic enough, otherwise generate one
  if (headline && headline.length > 20) {
    return headline;
  }
  
  // Deterministic title patterns based on decision type
  const patterns = [
    'The Day We Chose Growth Over Safety',
    'The Price We Paid for Premium',
    'A Bet on Market Expansion',
    'The Pivot That Changed Everything',
    'When Simplicity Won',
  ];
  
  // Simple hash to pick consistently
  const hash = decision.id?.split('').reduce((a, c) => a + c.charCodeAt(0), 0) || 0;
  return patterns[hash % patterns.length];
};

// Get status config
const getStatusConfig = (decision, hasChosenScenario, hasOutcome) => {
  if (hasOutcome) {
    return { 
      label: 'Outcome Recorded', 
      style: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      nodeColor: 'bg-amber-500',
      nodeRing: 'ring-amber-500/30'
    };
  }
  if (hasChosenScenario) {
    return { 
      label: 'Path Chosen', 
      style: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      nodeColor: 'bg-emerald-500',
      nodeRing: 'ring-emerald-500/30'
    };
  }
  if (decision.hasScenarios) {
    return { 
      label: 'Explored', 
      style: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
      nodeColor: 'bg-violet-500',
      nodeRing: 'ring-violet-500/30'
    };
  }
  return { 
    label: 'Draft', 
    style: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    nodeColor: 'bg-slate-500',
    nodeRing: 'ring-slate-500/30'
  };
};

/**
 * Netflix-Style Episode Card
 * Represents a single Verdict as an "Episode" in the decision journey
 */
const EpisodeCard = memo(({ 
  decision, 
  episodeNumber,
  isExpanded, 
  onToggleExpand,
  onVerdictUpdate,
  showTimelineNode = true
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
  const [showConfirmModal, setShowConfirmModal] = useState(null);

  // Load outcome status and chosen scenario
  useEffect(() => {
    if (decision) {
      const storedChosen = getChosenScenario(decision.id);
      if (storedChosen) {
        setChosenScenario(storedChosen.scenarioId);
        setChosenScenarioData(storedChosen);
      } else if (decision.chosenScenarioId) {
        setChosenScenario(decision.chosenScenarioId);
      }

      const outcome = getOutcome(decision.id);
      setOutcomeStatus({
        hasOutcome: outcome.decisionTaken !== null || outcome.dateImplemented || outcome.notes || outcome.outcomeSummary,
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
  const handleGenerateEndings = useCallback(async () => {
    if (!decision) return;
    setGenerating(true);
    try {
      const { data } = await decisionsV2Api.generateScenarios(decision.id, false);
      const transformed = transformScenarios(data.scenarios);
      setScenarios(transformed);
      if (onVerdictUpdate) onVerdictUpdate(decision.id);
    } catch (err) {
      console.error('Failed to generate scenarios:', err);
    } finally {
      setGenerating(false);
    }
  }, [decision, onVerdictUpdate]);

  // Inspect scenario
  const handleInspect = useCallback((scenario) => {
    setDrawerScenario(scenario);
    setIsDrawerOpen(true);
  }, []);

  // Initiate choose ending
  const handleChooseClick = useCallback((scenario) => {
    setShowConfirmModal(scenario);
  }, []);

  // Confirm choose ending - calls applyScenario which creates outcome
  const handleConfirmChoose = useCallback(async () => {
    if (!decision || !showConfirmModal) return;
    setApplyingScenario(showConfirmModal.id);
    try {
      // Call apply scenario API - this sets chosen and creates outcome
      const response = await decisionsV2Api.applyScenario(decision.id, showConfirmModal.id);
      
      // Also save to localStorage for offline access
      const saved = saveChosenScenario(decision.id, showConfirmModal);
      
      setChosenScenario(showConfirmModal.id);
      setChosenScenarioData(saved);
      setIsDrawerOpen(false);
      setDrawerScenario(null);
      setShowConfirmModal(null);
      
      // Update outcome status since applyScenario creates one
      if (response?.outcome) {
        setOutcomeStatus({
          hasOutcome: true,
          isComplete: false,
        });
      }
      
      if (onVerdictUpdate) onVerdictUpdate(decision.id);
    } catch (err) {
      console.error('Failed to apply scenario:', err);
      // Fallback to old method if API fails
      try {
        await decisionsV2Api.setChosenScenario(decision.id, showConfirmModal.id);
        const saved = saveChosenScenario(decision.id, showConfirmModal);
        setChosenScenario(showConfirmModal.id);
        setChosenScenarioData(saved);
        setIsDrawerOpen(false);
        setDrawerScenario(null);
        setShowConfirmModal(null);
        if (onVerdictUpdate) onVerdictUpdate(decision.id);
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
      }
    } finally {
      setApplyingScenario(null);
    }
  }, [decision, showConfirmModal, onVerdictUpdate]);

  // Handle outcome saved
  const handleOutcomeSaved = useCallback(() => {
    const outcome = getOutcome(decision.id);
    setOutcomeStatus({
      hasOutcome: outcome.decisionTaken !== null || outcome.dateImplemented || outcome.notes || outcome.outcomeSummary,
      isComplete: isOutcomeComplete(outcome),
    });
    if (onVerdictUpdate) onVerdictUpdate(decision.id);
  }, [decision?.id, onVerdictUpdate]);

  // Close drawer
  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setTimeout(() => setDrawerScenario(null), 300);
  }, []);

  if (!decision) return null;

  const verdict = decision.verdict || {};
  const status = getStatusConfig(decision, !!chosenScenario, outcomeStatus.hasOutcome);
  const episodeTitle = generateEpisodeTitle(decision);
  
  // Find chosen scenario name
  const chosenScenarioName = chosenScenarioData?.scenarioName || 
    scenarios.find(s => s.id === chosenScenario)?.name ||
    (chosenScenario ? chosenScenario.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : null);

  // Build "Previously on..." bullets
  const previouslyOnBullets = [
    verdict.executiveVerdict?.recommendation,
    decision.context?.primaryKPI?.value && `Primary KPI: ${decision.context.primaryKPI.value}`,
    verdict.executiveVerdict?.timeHorizon && `Time horizon: ${verdict.executiveVerdict.timeHorizon}`,
  ].filter(Boolean).slice(0, 3);

  // Format date for timeline
  const createdDate = decision.createdAt ? new Date(decision.createdAt) : null;
  const timelineDate = createdDate ? createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const timelineTime = createdDate ? createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
  const timelineYear = createdDate ? createdDate.getFullYear() : '';

  return (
    <div className="relative">
      {/* Timeline with Date/Time - Positioned outside card on the left */}
      {showTimelineNode && (
        <div className="absolute -left-20 top-0 w-16 flex flex-col items-center pt-2">
          {/* Date Display */}
          <div className="text-center mb-1.5">
            <p className="text-[11px] font-medium text-slate-400">{timelineDate}</p>
            <p className="text-[9px] text-slate-500">{timelineTime}</p>
          </div>
          {/* Timeline Node */}
          <div className={`w-2.5 h-2.5 rounded-full ${status.nodeColor} ring-2 ${status.nodeRing} z-10`} />
          {/* Timeline Line */}
          <div className="flex-1 w-0.5 bg-slate-800/50 mt-1" />
        </div>
      )}

      {/* Episode Card - Aligned with filter buttons */}
      <div 
        id={`episode-${decision.id}`}
        className={`border rounded-2xl overflow-hidden transition-all duration-300 mb-4 ${
          isExpanded 
            ? 'bg-slate-900/70 border-violet-500/40 shadow-xl shadow-violet-500/5' 
            : 'bg-slate-900/40 border-slate-800/50 hover:border-slate-700/70 hover:bg-slate-900/50'
        }`}
      >
        {/* Collapsed Header */}
        <button
          onClick={() => onToggleExpand(decision.id)}
          className="w-full text-left p-5"
          aria-expanded={isExpanded}
        >
          <div className="flex items-start gap-4">
            {/* Episode Number Badge */}
            <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg transition-colors ${
              isExpanded 
                ? 'bg-violet-500/30 text-violet-300 border border-violet-500/30' 
                : 'bg-slate-800/80 text-slate-400 border border-slate-700/50'
            }`}>
              E{episodeNumber || '?'}
            </div>

            {/* Center Content */}
            <div className="flex-1 min-w-0">
              {/* Series Name */}
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                {decision.companyName}
              </p>
              
              {/* Episode Title */}
              <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">
                {episodeTitle}
              </h3>
              
              {/* Hook/Subtitle */}
              <p className="text-sm text-slate-400 mb-3">
                {chosenScenarioName 
                  ? `You chose: ${chosenScenarioName}`
                  : scenarios.length > 0
                    ? 'You explored multiple futures. Only one path becomes reality.'
                    : 'A decision awaits. Generate endings to explore your options.'
                }
              </p>

              {/* Status Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${status.style}`}>
                  {status.label}
                </span>
                {scenarios.length > 0 && (
                  <span className="px-2.5 py-1 text-xs text-slate-500 bg-slate-800/50 rounded-full border border-slate-700/30">
                    {scenarios.length} endings
                  </span>
                )}
              </div>
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

        {/* Action Buttons Row */}
        <div className="px-5 pb-4 flex items-center gap-2">
          {scenarios.length > 0 || decision.hasScenarios ? (
            <button
              onClick={() => onToggleExpand(decision.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                isExpanded
                  ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                  : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 border border-slate-700/50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              {isExpanded ? 'Hide Endings' : 'View Endings'}
            </button>
          ) : (
            <button
              onClick={handleGenerateEndings}
              disabled={generating}
              className="px-4 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
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
          )}
          <button
            onClick={() => navigate(`/decisions/${decision.id}`)}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors flex items-center gap-2"
          >
            Open Episode
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-slate-800/50">
            {/* Previously On... */}
            {previouslyOnBullets.length > 0 && (
              <div className="p-5 bg-slate-950/30 border-b border-slate-800/30">
                <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Previously on this decision...</h4>
                <ul className="space-y-1.5">
                  {previouslyOnBullets.map((bullet, i) => (
                    <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                      <span className="text-slate-600 mt-0.5">-</span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Alternate Endings Section */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Alternate Endings
                </h4>
              </div>

              {scenariosLoading ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="animate-spin w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : scenarios.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {scenarios.map((scenario) => (
                      <EndingCard
                        key={scenario.id}
                        scenario={scenario}
                        isChosen={chosenScenario === scenario.id}
                        onInspect={handleInspect}
                        onChoose={handleChooseClick}
                      />
                    ))}
                  </div>
                  {!chosenScenario && (
                    <p className="text-xs text-slate-500 text-center italic">
                      Choosing an ending locks your path and enables outcome tracking.
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-10 bg-slate-900/30 rounded-xl border border-slate-800/30">
                  <svg className="w-12 h-12 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-sm text-white mb-2">No endings generated yet</p>
                  <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
                    Generate alternate endings to explore different strategic paths
                  </p>
                  <button
                    onClick={handleGenerateEndings}
                    disabled={generating}
                    className="px-5 py-2.5 bg-violet-500 hover:bg-violet-600 text-white font-medium text-sm rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
                  >
                    {generating ? 'Generating...' : 'Generate Endings'}
                  </button>
                </div>
              )}
            </div>

            {/* Outcome Panel */}
            <div className="border-t border-slate-800/40 p-5">
              <OutcomePanel 
                decisionId={decision.id}
                chosenScenarioId={chosenScenario}
                chosenScenarioName={chosenScenarioName}
                onOutcomeSaved={handleOutcomeSaved}
              />
            </div>
          </div>
        )}

        {/* Inspect Drawer */}
        <EndingInspectDrawer
          scenario={drawerScenario}
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          onChoose={handleChooseClick}
          isChosen={drawerScenario ? chosenScenario === drawerScenario.id : false}
        />

        {/* Choose Confirmation Modal */}
        {showConfirmModal && (
          <>
            <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowConfirmModal(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Choose this ending?</h3>
                    <p className="text-xs text-slate-500">This will lock your path forward</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/50 border border-slate-800/50 rounded-xl mb-4">
                  <p className="text-white font-medium mb-1">{showConfirmModal.name}</p>
                  <p className="text-xs text-slate-500">{showConfirmModal.summary?.slice(0, 100)}...</p>
                </div>

                <p className="text-sm text-slate-400 mb-6">
                  Once chosen, you can track the outcome of this decision path. You can still review other endings but this will be marked as your path.
                </p>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowConfirmModal(null)}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                    disabled={applyingScenario}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmChoose}
                    disabled={applyingScenario}
                    className="px-5 py-2.5 text-sm bg-violet-500 hover:bg-violet-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {applyingScenario ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Choosing...
                      </>
                    ) : (
                      'Choose this ending'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

EpisodeCard.displayName = 'EpisodeCard';

export default EpisodeCard;

