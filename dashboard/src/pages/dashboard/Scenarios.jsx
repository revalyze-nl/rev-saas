import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { decisionsV2Api } from '../../lib/apiClient';
import { 
  getOutcome, 
  getChosenScenario, 
  saveChosenScenario 
} from '../../lib/outcomeStorage';

// ==================== HELPER FUNCTIONS ====================

// Risk badge styles
const getRiskStyle = (level) => {
  const lowerLevel = level?.toLowerCase();
  switch (lowerLevel) {
    case 'low': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20';
    default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  }
};

// Effort badge styles
const getEffortStyle = (level) => {
  const lowerLevel = level?.toLowerCase();
  switch (lowerLevel) {
    case 'low': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  }
};

// Format date helper
const formatShortDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Transform backend scenarios to frontend format
const transformScenarios = (backendScenarios) => {
  if (!backendScenarios || !Array.isArray(backendScenarios)) return null;
  
  return backendScenarios.map(s => ({
    id: s.scenarioId,
    type: s.scenarioId.replace('_', '-'),
    name: s.title,
    summary: s.summary,
    positioning: s.positioning || getDefaultPositioning(s.scenarioId),
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
    isBaseline: s.scenarioId === 'balanced' || s.isBaseline,
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

// Default positioning if not provided by backend
const getDefaultPositioning = (scenarioId) => {
  switch (scenarioId) {
    case 'aggressive': return 'Max upside, highest volatility';
    case 'balanced': return 'Optimal risk-reward, recommended path';
    case 'conservative': return 'Safety-first, capital-preserving';
    case 'do_nothing': return 'Status quo, deferred cost';
    default: return '';
  }
};

// Calculate delta between two scenarios for comparison
const calculateDelta = (scenarioValue, chosenValue, metric) => {
  // Handle non-numeric comparisons
  if (metric === 'risk' || metric === 'effort') {
    const levels = { low: 1, medium: 2, high: 3 };
    const scenarioLevel = levels[scenarioValue?.toLowerCase()] || 0;
    const chosenLevel = levels[chosenValue?.toLowerCase()] || 0;
    const diff = scenarioLevel - chosenLevel;
    if (diff === 0) return 'Same';
    return diff > 0 ? 'Higher' : 'Lower';
  }
  
  // For revenue/churn, just show the comparison text
  if (scenarioValue === chosenValue) return 'Same';
  return scenarioValue || 'N/A';
};

// ==================== TOAST COMPONENT ====================
const Toast = ({ message, isVisible, onClose, type = 'success' }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => onClose(), 3500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const styles = {
    success: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
    info: 'bg-violet-500/20 border-violet-500/30 text-violet-300',
    warning: 'bg-amber-500/20 border-amber-500/30 text-amber-300',
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 border rounded-xl backdrop-blur-sm ${styles[type]}`}>
        {type === 'success' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
};

// ==================== APPLY SCENARIO MODAL ====================
const ApplyScenarioModal = ({ isOpen, scenario, onConfirm, onCancel, isApplying }) => {
  if (!isOpen || !scenario) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Apply Execution Path</h3>
              <p className="text-xs text-slate-500">This will set your chosen strategic direction</p>
            </div>
          </div>

          {/* Scenario Preview */}
          <div className="p-4 bg-slate-950/50 border border-slate-800/50 rounded-xl mb-4">
            <p className="text-sm text-slate-400 mb-1">Selected scenario:</p>
            <p className="text-white font-medium mb-2">{scenario.name}</p>
            <p className="text-xs text-slate-500 italic">{scenario.positioning}</p>
            
            {/* Expected Impact Preview */}
            <div className="mt-3 pt-3 border-t border-slate-800/50 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">Revenue: </span>
                <span className="text-emerald-400">{scenario.revenueImpact}</span>
              </div>
              <div>
                <span className="text-slate-500">Churn: </span>
                <span className="text-slate-300">{scenario.churnImpact}</span>
              </div>
              <div>
                <span className="text-slate-500">Risk: </span>
                <span className={scenario.riskLevel?.toLowerCase() === 'high' ? 'text-red-400' : scenario.riskLevel?.toLowerCase() === 'medium' ? 'text-amber-400' : 'text-emerald-400'}>
                  {scenario.riskLevel}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Time: </span>
                <span className="text-slate-300">{scenario.timeToImpact}</span>
              </div>
            </div>
          </div>

          {/* Confirmation Text */}
          <p className="text-sm text-slate-400 mb-6">
            Apply this scenario as your <span className="text-white font-medium">chosen execution path</span>? 
            This will update your verdict with the expected impact metrics.
          </p>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              disabled={isApplying}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isApplying}
              className="px-5 py-2.5 text-sm bg-violet-500 hover:bg-violet-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isApplying ? (
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
                  Apply Execution Path
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// ==================== REGENERATE MODAL ====================
const RegenerateModal = ({ isOpen, onConfirm, onCancel, isLoading }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
          <h3 className="text-lg font-semibold text-white mb-2">Regenerate Scenarios?</h3>
          <p className="text-sm text-slate-400 mb-6">
            This will generate new AI scenarios and replace the existing ones. 
            Your chosen execution path will be cleared.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-white text-slate-900 font-medium rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Regenerate
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// ==================== VERDICT SNAPSHOT CARD ====================
const VerdictSnapshotCard = ({ verdict, decision, chosenScenario }) => {
  const snapshot = verdict?.decisionSnapshot || {};
  const execVerdict = verdict?.executiveVerdict || {};
  
  return (
    <div className="mb-8 p-5 bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-800/60 rounded-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-violet-400 uppercase tracking-wider mb-1 font-medium">
            Scenarios derived from this Verdict
          </p>
          <h2 className="text-lg font-semibold text-white">
            {verdict?.headline || decision?.companyName || 'Pricing Strategy Decision'}
          </h2>
        </div>
        {execVerdict?.confidence && (
          <div className="px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg">
            <p className="text-xs text-slate-500 mb-0.5">AI Confidence</p>
            <p className="text-sm text-violet-400 font-medium">{execVerdict.confidence}</p>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-950/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Primary KPI</p>
          <p className="text-sm text-white font-medium">
            {decision?.context?.primaryKPI?.value || 'MRR Growth'}
          </p>
        </div>
        <div className="bg-slate-950/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Time Horizon</p>
          <p className="text-sm text-slate-300">
            {execVerdict?.timeHorizon || snapshot?.timeToImpact || '30-90 days'}
          </p>
        </div>
        <div className="bg-slate-950/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Expected Revenue</p>
          <p className="text-sm text-emerald-400 font-medium">
            {snapshot?.revenueImpactRange || '+10-25%'}
          </p>
        </div>
        <div className="bg-slate-950/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Risk Level</p>
          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${getRiskStyle(snapshot?.primaryRiskLevel)}`}>
            {snapshot?.primaryRiskLevel || 'Medium'}
          </span>
        </div>
      </div>

      {/* Chosen Execution Path */}
      {chosenScenario && (
        <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-violet-400 mb-0.5">Chosen Execution Path</p>
              <p className="text-sm text-white font-medium">{chosenScenario.scenarioName}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Applied</p>
            <p className="text-xs text-slate-400">{formatDateTime(chosenScenario.appliedAt)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== DELTA COMPARISON BADGE ====================
const DeltaComparisonBadge = ({ value, isChosen, isBaseline }) => {
  if (isChosen) {
    return (
      <span className="text-xs text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded font-medium">
        Chosen Path
      </span>
    );
  }
  
  if (isBaseline && !value) {
    return (
      <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded">
        Baseline
      </span>
    );
  }

  if (!value || value === 'Baseline' || value === 'Same') {
    return (
      <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded">
        {value || 'Same'}
      </span>
    );
  }

  const isPositive = value?.includes('+') || value?.toLowerCase().includes('faster') || value?.toLowerCase().includes('lower');
  const isNegative = value?.includes('-') || value?.toLowerCase().includes('slower') || value?.toLowerCase().includes('higher');

  return (
    <span className={`text-xs px-2 py-0.5 rounded ${
      isPositive ? 'text-emerald-400 bg-emerald-500/10' :
      isNegative ? 'text-amber-400 bg-amber-500/10' :
      'text-slate-400 bg-slate-800/50'
    }`}>
      {value}
    </span>
  );
};

// ==================== SCENARIO CARD ====================
const ScenarioCard = ({ 
  scenario, 
  onViewDetails, 
  onApply,
  isChosen, 
  chosenScenario,
  readOnly = false 
}) => {
  const isRecommended = scenario.isBaseline;

  // Calculate comparison vs chosen scenario (if one exists)
  const comparisonTarget = chosenScenario ? 'chosen' : 'baseline';
  
  return (
    <div className={`relative p-5 border rounded-2xl transition-all ${
      isChosen
        ? 'bg-violet-500/10 border-violet-500/40 ring-2 ring-violet-500/30'
        : isRecommended 
        ? 'bg-emerald-500/5 border-emerald-500/30' 
        : 'bg-slate-900/30 border-slate-800/40 hover:border-slate-700/60'
    }`}>
      {/* Chosen indicator */}
      {isChosen && (
        <div className="absolute -top-2 -right-2 w-7 h-7 bg-violet-500 rounded-full flex items-center justify-center shadow-lg shadow-violet-500/30">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-lg font-semibold text-white">{scenario.name}</h3>
            {isChosen && (
              <span className="px-2 py-0.5 text-xs font-medium bg-violet-500/20 text-violet-400 rounded-full border border-violet-500/30">
                Chosen Path
              </span>
            )}
            {isRecommended && !isChosen && (
              <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                Recommended
              </span>
            )}
            {!isChosen && !isRecommended && (
              <span className="px-2 py-0.5 text-xs font-medium bg-slate-500/20 text-slate-400 rounded-full border border-slate-500/30">
                Alternative
              </span>
            )}
          </div>
          {/* Positioning line */}
          <p className="text-sm text-slate-500 italic mb-2">{scenario.positioning}</p>
          <p className="text-sm text-slate-400">{scenario.summary}</p>
        </div>
      </div>

      {/* Best When */}
      {scenario.bestWhen && (
        <div className="mb-4 px-3 py-2 bg-gradient-to-r from-violet-500/5 to-transparent border-l-2 border-violet-500/30 rounded-r-lg">
          <p className="text-xs text-violet-400 font-medium">{scenario.bestWhen}</p>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-slate-950/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Revenue Impact</p>
          <p className="text-sm font-medium text-emerald-400 mb-1">{scenario.revenueImpact}</p>
          <DeltaComparisonBadge value={scenario.deltas.revenue} isChosen={isChosen} isBaseline={scenario.isBaseline} />
        </div>
        <div className="bg-slate-950/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Churn Impact</p>
          <p className="text-sm text-slate-300 mb-1">{scenario.churnImpact}</p>
          <DeltaComparisonBadge value={scenario.deltas.churn} isChosen={isChosen} isBaseline={scenario.isBaseline} />
        </div>
        <div className="bg-slate-950/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Risk Level</p>
          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${getRiskStyle(scenario.riskLevel)}`}>
            {scenario.riskLevel}
          </span>
          <div className="mt-1">
            <DeltaComparisonBadge value={scenario.deltas.risk} isChosen={isChosen} isBaseline={scenario.isBaseline} />
          </div>
        </div>
        <div className="bg-slate-950/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Time to Impact</p>
          <p className="text-sm text-slate-300 mb-1">{scenario.timeToImpact}</p>
          <DeltaComparisonBadge value={scenario.deltas.time} isChosen={isChosen} isBaseline={scenario.isBaseline} />
        </div>
      </div>

      {/* Effort Row */}
      <div className="mb-4 px-3 py-2.5 bg-slate-950/40 rounded-lg flex items-center justify-between">
        <span className="text-xs text-slate-500">Execution Effort</span>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getEffortStyle(scenario.executionEffort)}`}>
            {scenario.executionEffort}
          </span>
          <DeltaComparisonBadge value={scenario.deltas.effort} isChosen={isChosen} isBaseline={scenario.isBaseline} />
        </div>
      </div>

      {/* Comparison to Chosen/Baseline */}
      {!isChosen && (
        <div className="mb-4 px-3 py-2 bg-slate-950/40 rounded-lg border border-slate-800/30">
          <p className="text-xs text-slate-500 mb-1">
            {chosenScenario ? 'Compared to chosen path:' : 'Compared to recommended:'}
          </p>
          <p className={`text-sm font-medium ${
            scenario.type === 'aggressive' ? 'text-amber-400' :
            scenario.type === 'balanced' ? 'text-emerald-400' :
            scenario.type === 'conservative' ? 'text-blue-400' :
            'text-slate-400'
          }`}>
            {scenario.comparedToRecommended}
          </p>
        </div>
      )}

      {/* Trade-offs Accordion */}
      <details className="group border-t border-slate-800/30 pt-3">
        <summary className="cursor-pointer flex items-center justify-between text-sm text-slate-400 hover:text-white transition-colors list-none">
          <span>Trade-offs ({scenario.tradeoffs.length})</span>
          <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <ul className="mt-3 space-y-2">
          {scenario.tradeoffs.map((item, i) => (
            <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
              <span className="text-slate-600 mt-0.5">•</span>
              {item}
            </li>
          ))}
        </ul>
      </details>

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-slate-800/30 space-y-2">
        <button
          onClick={() => onViewDetails(scenario)}
          className="w-full py-2.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Inspect scenario
        </button>
        
        {!readOnly && !isChosen && (
          <button
            onClick={() => onApply(scenario)}
            className="w-full py-2.5 text-sm bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 hover:text-violet-300 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 border border-violet-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Apply this scenario
          </button>
        )}
        
        {isChosen && (
          <div className="w-full py-2.5 text-sm bg-violet-500/10 text-violet-400 font-medium rounded-lg flex items-center justify-center gap-2 border border-violet-500/20">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Chosen Execution Path
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== SCENARIO GRID ====================
const ScenarioGrid = ({ scenarios, onViewDetails, chosenScenarioId, chosenScenario, onApply, readOnly = false }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {scenarios.map((scenario) => (
        <ScenarioCard
          key={scenario.id}
          scenario={scenario}
          onViewDetails={onViewDetails}
          onApply={onApply}
          isChosen={scenario.id === chosenScenarioId}
          chosenScenario={chosenScenario}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
};

// ==================== SCENARIO DRAWER ====================
const ScenarioDrawer = ({ scenario, isOpen, onClose, onApply, isChosen, isApplying, readOnly = false }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !scenario) return null;

  const impl = scenario.implementation || {};
  const getScenarioTypeStyle = (type) => {
    switch (type) {
      case 'aggressive': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'balanced': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'conservative': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'do-nothing': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-slate-950 border-l border-slate-800/50 z-50 overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800/40 p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getScenarioTypeStyle(scenario.type)}`}>
                  {scenario.type === 'do-nothing' ? 'Status Quo' : scenario.type.charAt(0).toUpperCase() + scenario.type.slice(1)}
                </span>
                {isChosen && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-violet-500/20 text-violet-400 rounded border border-violet-500/30">
                    Chosen Path
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white">{scenario.name}</h2>
              <p className="text-sm text-slate-500 italic">{scenario.positioning}</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* What Changes vs Baseline */}
          {impl.whatChangesVsBaseline && (
            <div className="p-4 bg-gradient-to-br from-violet-500/10 to-slate-900/50 border border-violet-500/20 rounded-xl">
              <h3 className="text-sm font-semibold text-violet-400 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                What would change if you chose this?
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">{impl.whatChangesVsBaseline}</p>
              
              {/* Deltas summary */}
              <div className="mt-3 pt-3 border-t border-violet-500/20 grid grid-cols-2 gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Revenue:</span>
                  <DeltaComparisonBadge value={scenario.deltas.revenue} isChosen={isChosen} isBaseline={scenario.isBaseline} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Churn:</span>
                  <DeltaComparisonBadge value={scenario.deltas.churn} isChosen={isChosen} isBaseline={scenario.isBaseline} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Risk:</span>
                  <DeltaComparisonBadge value={scenario.deltas.risk} isChosen={isChosen} isBaseline={scenario.isBaseline} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Timeline:</span>
                  <DeltaComparisonBadge value={scenario.deltas.time} isChosen={isChosen} isBaseline={scenario.isBaseline} />
                </div>
              </div>
            </div>
          )}

          {/* Implementation Steps */}
          {impl.whatItLooksLike && impl.whatItLooksLike.length > 0 && (
            <div>
              <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                What this looks like in practice
              </h3>
              <ul className="space-y-2">
                {impl.whatItLooksLike.map((item, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-3 bg-slate-900/30 p-3 rounded-lg">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-xs flex items-center justify-center font-medium">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Success Metrics */}
          {impl.successMetrics && impl.successMetrics.length > 0 && (
            <div>
              <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Success metrics to monitor
              </h3>
              <ul className="space-y-2">
                {impl.successMetrics.map((item, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">📊</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Affected Personas */}
          {impl.affectedPersonas && impl.affectedPersonas.length > 0 && (
            <div>
              <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Who is impacted
              </h3>
              <ul className="space-y-2">
                {impl.affectedPersonas.map((item, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">👤</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Operational Implications */}
          {impl.operationalImplications && impl.operationalImplications.length > 0 && (
            <div>
              <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Operational implications
              </h3>
              <div className="space-y-2">
                {impl.operationalImplications.map((item, i) => (
                  <div key={i} className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-sm text-slate-300">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failure Modes */}
          {impl.failureModes && impl.failureModes.length > 0 && (
            <div>
              <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Risks & failure modes
              </h3>
              <ul className="space-y-2">
                {impl.failureModes.map((item, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2 bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">⚠</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* When it makes sense */}
          {impl.whenMakesSense && (
            <div>
              <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                When this scenario makes sense
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/30 border border-slate-800/30 rounded-lg p-4">
                {impl.whenMakesSense}
              </p>
            </div>
          )}
        </div>

        {/* Sticky Footer with CTAs */}
        <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur-sm border-t border-slate-800/40 p-4 space-y-2">
          {!readOnly && !isChosen && (
            <button
              onClick={() => onApply(scenario)}
              disabled={isApplying}
              className="w-full py-3 bg-violet-500 hover:bg-violet-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isApplying ? (
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Apply this scenario
                </>
              )}
            </button>
          )}
          
          {isChosen && (
            <div className="w-full py-3 bg-violet-500/20 text-violet-400 font-medium rounded-xl flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Chosen Execution Path
            </div>
          )}
          
          <button
            onClick={onClose}
            className="w-full py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
};

// ==================== SCENARIO COMPARE TABLE ====================
const ScenarioCompareTable = ({ scenarios, chosenScenarioId, readOnly = false }) => {
  const chosenScenario = scenarios.find(s => s.id === chosenScenarioId);
  const baseline = chosenScenario || scenarios.find(s => s.isBaseline);
  
  const metrics = [
    { key: 'revenueImpact', deltaKey: 'revenue', label: 'Revenue Impact' },
    { key: 'churnImpact', deltaKey: 'churn', label: 'Churn Impact' },
    { key: 'riskLevel', deltaKey: 'risk', label: 'Risk' },
    { key: 'timeToImpact', deltaKey: 'time', label: 'Time to Impact' },
    { key: 'executionEffort', deltaKey: 'effort', label: 'Execution Effort' },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800/40">
            <th className="text-left py-3 px-4 text-xs text-slate-500 font-medium uppercase tracking-wider">Metric</th>
            {scenarios.map((s) => (
              <th key={s.id} className={`text-center py-3 px-3 text-xs font-medium uppercase tracking-wider ${
                s.id === chosenScenarioId ? 'text-violet-400 bg-violet-500/5' : 
                s.isBaseline && !chosenScenarioId ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-400'
              }`}>
                <div className="flex flex-col items-center gap-1">
                  <span className="truncate max-w-[100px]">{s.name}</span>
                  {s.id === chosenScenarioId && <span className="text-[10px] text-violet-500">✓ Chosen</span>}
                  {s.isBaseline && !chosenScenarioId && <span className="text-[10px] text-emerald-500">★ Recommended</span>}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric, idx) => (
            <tr key={metric.key} className={idx % 2 === 0 ? 'bg-slate-900/20' : ''}>
              <td className="py-3 px-4 text-slate-400">{metric.label}</td>
              {scenarios.map((s) => (
                <td key={s.id} className={`text-center py-3 px-3 ${
                  s.id === chosenScenarioId ? 'bg-violet-500/5' : 
                  s.isBaseline && !chosenScenarioId ? 'bg-emerald-500/5' : ''
                }`}>
                  {metric.key === 'riskLevel' || metric.key === 'executionEffort' ? (
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${
                      metric.key === 'riskLevel' ? getRiskStyle(s[metric.key]) : getEffortStyle(s[metric.key])
                    }`}>
                      {s[metric.key]}
                    </span>
                  ) : (
                    <span className={`text-slate-300 ${s.id === chosenScenarioId || (s.isBaseline && !chosenScenarioId) ? 'font-medium' : ''}`}>
                      {s[metric.key]}
                    </span>
                  )}
                  {/* Delta below value */}
                  {s.id !== chosenScenarioId && s.id !== baseline?.id && s.deltas[metric.deltaKey] && s.deltas[metric.deltaKey] !== 'Baseline' && (
                    <div className="mt-1">
                      <span className="text-[10px] text-slate-500">{s.deltas[metric.deltaKey]}</span>
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ==================== SKELETON LOADER ====================
const ScenarioSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="p-5 border border-slate-800/40 rounded-2xl bg-slate-900/30 animate-pulse">
        <div className="h-6 w-40 bg-slate-800 rounded mb-3" />
        <div className="h-4 w-full bg-slate-800 rounded mb-4" />
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[1, 2, 3, 4].map((j) => (
            <div key={j} className="h-16 bg-slate-800 rounded-lg" />
          ))}
        </div>
        <div className="h-16 bg-slate-800 rounded-lg" />
      </div>
    ))}
  </div>
);

// ==================== MAIN SCENARIOS PAGE ====================
const Scenarios = ({ 
  decision: externalDecision = null,
  readOnly = false
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Core state
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [scenarios, setScenarios] = useState(null);
  const [scenariosExist, setScenariosExist] = useState(false);
  const [scenarioCreatedAt, setScenarioCreatedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);
  
  // Chosen scenario state (from localStorage)
  const [chosenScenario, setChosenScenario] = useState(null);
  const [chosenScenarioId, setChosenScenarioId] = useState(null);
  
  // Verdict metadata for explicit linking
  const [verdictContext, setVerdictContext] = useState({
    verdictId: null,
    verdictTitle: null,
    verdictTimestamp: null,
    primaryKPI: null,
    timeHorizon: null,
  });
  
  // Available verdicts list state
  const [availableVerdicts, setAvailableVerdicts] = useState([]);
  const [verdictsLoading, setVerdictsLoading] = useState(false);
  
  // Drawer state
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modal states
  const [scenarioToApply, setScenarioToApply] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);

  // Toast state
  const [toast, setToast] = useState({ message: '', isVisible: false, type: 'success' });

  // Show toast
  const showToast = (message, type = 'success') => {
    setToast({ message, isVisible: true, type });
  };

  // Load available verdicts (called on mount when no verdict is selected)
  const loadAvailableVerdicts = useCallback(async () => {
    setVerdictsLoading(true);
    try {
      const { data } = await decisionsV2Api.list({ pageSize: 50, page: 1 });
      setAvailableVerdicts(data.decisions || []);
    } catch (err) {
      console.error('Failed to load verdicts:', err);
    } finally {
      setVerdictsLoading(false);
    }
  }, []);

  // Load a specific decision and its scenarios from backend
  const loadDecision = useCallback(async (decisionId) => {
    setLoading(true);
    setError(null);
    try {
      const { data: decision } = await decisionsV2Api.get(decisionId);
      setSelectedDecision(decision);
      
      // Load chosen scenario from localStorage
      const storedChosen = getChosenScenario(decisionId);
      setChosenScenario(storedChosen);
      setChosenScenarioId(storedChosen?.scenarioId || decision.chosenScenarioId || null);
      
      // Set verdict context for explicit linking
      const verdict = decision.verdict || {};
      setVerdictContext({
        verdictId: decision.id,
        verdictTitle: verdict.executiveVerdict?.recommendation || verdict.headline || decision.companyName,
        verdictTimestamp: decision.createdAt,
        primaryKPI: decision.context?.primaryKPI?.value || 'MRR Growth',
        timeHorizon: verdict.executiveVerdict?.timeHorizon || '30-90 days',
      });
      
      // Try to load scenarios from backend
      try {
        const { data: scenarioData } = await decisionsV2Api.getScenarios(decisionId);
        const transformedScenarios = transformScenarios(scenarioData.scenarios);
        setScenarios(transformedScenarios);
        setScenariosExist(true);
        setScenarioCreatedAt(scenarioData.createdAt);
      } catch (scenarioErr) {
        // 404 means scenarios don't exist yet - that's fine
        if (scenarioErr.message?.includes('404') || scenarioErr.message?.includes('not found')) {
          setScenarios(null);
          setScenariosExist(false);
          setScenarioCreatedAt(null);
        } else {
          console.error('Failed to load scenarios:', scenarioErr);
          setScenarios(null);
          setScenariosExist(false);
        }
      }
      
      // Update URL with verdictId
      setSearchParams({ verdictId: decision.id });
    } catch (err) {
      console.error('Failed to load decision:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [setSearchParams]);

  // Generate scenarios via backend API
  const handleGenerateScenarios = useCallback(async (force = false) => {
    if (!selectedDecision) return;
    
    setGenerating(true);
    setError(null);
    try {
      const { data: scenarioData } = await decisionsV2Api.generateScenarios(selectedDecision.id, force);
      const transformedScenarios = transformScenarios(scenarioData.scenarios);
      setScenarios(transformedScenarios);
      setScenariosExist(true);
      setScenarioCreatedAt(scenarioData.createdAt);
      
      // Clear chosen scenario on regenerate
      if (force) {
        setChosenScenario(null);
        setChosenScenarioId(null);
        showToast('Scenarios regenerated successfully');
      }
    } catch (err) {
      console.error('Failed to generate scenarios:', err);
      setError('Failed to generate scenarios: ' + err.message);
    } finally {
      setGenerating(false);
      setShowRegenerateModal(false);
    }
  }, [selectedDecision]);

  // Open apply confirmation modal
  const handleApplyClick = useCallback((scenario) => {
    setScenarioToApply(scenario);
    setShowApplyModal(true);
  }, []);

  // Confirm apply scenario
  const handleConfirmApply = useCallback(async () => {
    if (!scenarioToApply || !selectedDecision) return;

    setApplying(true);
    try {
      // Save to localStorage with full impact data
      const saved = saveChosenScenario(selectedDecision.id, scenarioToApply);
      
      // Also try to save to backend
      try {
        await decisionsV2Api.setChosenScenario(selectedDecision.id, scenarioToApply.id);
      } catch (backendErr) {
        console.warn('Failed to save to backend, using localStorage:', backendErr);
      }
      
      // Update local state
      setChosenScenario(saved);
      setChosenScenarioId(scenarioToApply.id);
      
      showToast(`"${scenarioToApply.name}" applied as your execution path`, 'success');
      
      // Close modals
      setShowApplyModal(false);
      setScenarioToApply(null);
      setIsDrawerOpen(false);
    } catch (err) {
      console.error('Failed to apply scenario:', err);
      showToast('Failed to apply scenario', 'warning');
    } finally {
      setApplying(false);
    }
  }, [scenarioToApply, selectedDecision]);

  // Initialize from URL param or external decision
  useEffect(() => {
    // If external decision is provided (e.g., from History), use it
    if (externalDecision) {
      loadDecision(externalDecision.id);
      return;
    }

    // Check for verdictId in URL
    const verdictIdFromUrl = searchParams.get('verdictId');
    if (verdictIdFromUrl) {
      // Only load if different from current selection
      if (verdictContext.verdictId !== verdictIdFromUrl) {
        loadDecision(verdictIdFromUrl);
      }
    } else {
      // No verdict selected - clear state and load available verdicts
      setSelectedDecision(null);
      setScenarios(null);
      setScenariosExist(false);
      setChosenScenario(null);
      setChosenScenarioId(null);
      setVerdictContext({ verdictId: null, verdictTitle: null, verdictTimestamp: null, primaryKPI: null, timeHorizon: null });
      loadAvailableVerdicts();
    }
  }, [externalDecision, searchParams, loadDecision, loadAvailableVerdicts, verdictContext.verdictId]);

  // Handle verdict selection
  const handleVerdictSelect = useCallback((verdict) => {
    loadDecision(verdict.id);
  }, [loadDecision]);

  // Change verdict - clear selection and reload list
  const handleChangeVerdict = useCallback(() => {
    setSelectedDecision(null);
    setScenarios(null);
    setScenariosExist(false);
    setChosenScenario(null);
    setChosenScenarioId(null);
    setVerdictContext({ verdictId: null, verdictTitle: null, verdictTimestamp: null, primaryKPI: null, timeHorizon: null });
    setSearchParams({});
    loadAvailableVerdicts();
  }, [loadAvailableVerdicts, setSearchParams]);

  // Handle drawer
  const handleViewDetails = (scenario) => {
    setSelectedScenario(scenario);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedScenario(null), 300);
  };

  // Loading state
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto pt-8 flex items-center justify-center min-h-[60vh]">
        <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-5xl mx-auto pt-8 text-center">
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl mb-6">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => handleGenerateScenarios(true)}
            className="px-4 py-2 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors mr-3"
          >
            Retry Generation
          </button>
          <button
            onClick={() => handleChangeVerdict()}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Select Different Verdict
          </button>
        </div>
      </div>
    );
  }

  // NO VERDICT SELECTED - Show episode picker with Netflix style
  if (!selectedDecision) {
    return (
      <div className="max-w-3xl mx-auto pt-8 pb-16">
        {/* Netflix-style Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-xs text-violet-400 uppercase tracking-wider mb-3 font-medium">
            Alternate Endings
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight leading-tight">
            Select an Episode
          </h1>
          <p className="text-lg text-slate-400 mb-2">
            Choose an episode to explore its alternate endings
          </p>
          <p className="text-sm text-slate-500">
            Each episode reveals multiple strategic paths you could have taken
          </p>
        </div>

        {/* Create New Episode CTA */}
        <div className="mb-8 p-5 bg-gradient-to-r from-violet-500/10 to-slate-900/50 border border-violet-500/20 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm text-white font-medium">Start a new decision journey?</p>
            <p className="text-xs text-slate-500">Create a new episode with AI-powered analysis</p>
          </div>
          <button
            onClick={() => navigate('/verdict')}
            className="px-5 py-2.5 bg-violet-500 hover:bg-violet-600 text-white font-semibold rounded-xl transition-colors text-sm whitespace-nowrap"
          >
            Create Episode
          </button>
        </div>

        {/* Episode List */}
        <div className="mb-6">
          <h2 className="text-sm text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
            Your Episodes
          </h2>

          {verdictsLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : availableVerdicts.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/30 border border-slate-800/40 rounded-xl">
              <svg className="w-12 h-12 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
              <p className="text-slate-400 mb-4">No episodes yet</p>
              <p className="text-sm text-slate-500 mb-6">Create your first episode to start exploring alternate endings</p>
              <button
                onClick={() => navigate('/verdict')}
                className="px-6 py-3 bg-violet-500 hover:bg-violet-600 text-white font-semibold rounded-xl transition-colors"
              >
                Create First Episode
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {availableVerdicts.map((verdict, index) => {
                const outcome = getOutcome(verdict.id);
                const hasOutcome = outcome.decisionTaken !== null || outcome.status;
                const storedChosen = getChosenScenario(verdict.id);
                const episodeNum = availableVerdicts.length - index;
                
                return (
                  <button
                    key={verdict.id}
                    onClick={() => handleVerdictSelect(verdict)}
                    className="w-full text-left p-4 bg-slate-900/40 border border-slate-800/50 rounded-xl hover:bg-slate-900/60 hover:border-violet-500/30 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Episode Number Badge */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-800/80 text-slate-400 font-bold text-lg flex items-center justify-center border border-slate-700/50 group-hover:bg-violet-500/20 group-hover:text-violet-400 group-hover:border-violet-500/30 transition-colors">
                        E{episodeNum}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
                          {verdict.companyName}
                        </p>
                        <h3 className="text-base font-medium text-white truncate group-hover:text-violet-300 transition-colors">
                          {verdict.verdictHeadline || 'Pricing Strategy Decision'}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-600">{formatShortDate(verdict.createdAt)}</span>
                          {verdict.hasScenarios && (
                            <span className="px-2 py-0.5 text-[10px] bg-violet-500/10 text-violet-400 rounded border border-violet-500/20">
                              {storedChosen ? 'Ending chosen' : 'Endings available'}
                            </span>
                          )}
                          {hasOutcome && (
                            <span className="px-2 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                              Outcome recorded
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                        <svg className="w-5 h-5 text-slate-500 group-hover:text-violet-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // VERDICT SELECTED - Show scenarios
  const verdict = selectedDecision.verdict || {};

  return (
    <div className="max-w-5xl mx-auto pt-8 pb-16">
      {/* Back Button */}
      <button
        onClick={handleChangeVerdict}
        className="mb-6 text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2 group"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Scenarios
      </button>

      {/* Read-only Banner */}
      {readOnly && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-amber-300">
            This is a past decision snapshot. Scenarios reflect the analysis at that time.
          </p>
        </div>
      )}

      {/* Verdict Snapshot Card */}
      <VerdictSnapshotCard 
        verdict={verdict} 
        decision={selectedDecision} 
        chosenScenario={chosenScenario}
      />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              Strategic Execution Paths
            </h1>
            <p className="text-sm text-slate-400">
              {chosenScenario 
                ? 'Compare alternatives to your chosen path'
                : 'Choose an execution path for this decision'
              }
            </p>
          </div>
          
          {/* AI Trust Pill + Regenerate */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 border border-slate-800/50 rounded-full text-xs text-slate-400">
              <svg className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>AI Generated</span>
              {scenarioCreatedAt && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-500">{formatDateTime(scenarioCreatedAt)}</span>
                </>
              )}
            </div>
            
            {!readOnly && scenariosExist && (
              <button
                onClick={() => setShowRegenerateModal(true)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800/50"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Generate Scenarios Section (when not yet generated) */}
      {!scenariosExist && !scenarios && !generating && (
        <div className="mb-12 text-center py-16 bg-slate-900/30 border border-slate-800/40 rounded-xl">
          <svg className="w-16 h-16 text-slate-600 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-xl font-semibold text-white mb-2">Generate Execution Paths</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            AI will generate 4 strategic paths: Aggressive, Balanced, Conservative, and Do Nothing — each with specific metrics and implementation details.
          </p>
          <button
            onClick={() => handleGenerateScenarios(false)}
            disabled={generating}
            className="px-8 py-3 bg-violet-500 hover:bg-violet-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Scenarios
          </button>
        </div>
      )}

      {/* Generating Skeleton */}
      {generating && (
        <div className="mb-12">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl">
              <svg className="animate-spin w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm text-violet-300">Generating strategic paths...</span>
            </div>
          </div>
          <ScenarioSkeleton />
        </div>
      )}

      {/* Scenario Grid (when scenarios exist) */}
      {scenarios && scenarios.length > 0 && !generating && (
        <div className="mb-12">
          <ScenarioGrid 
            scenarios={scenarios} 
            onViewDetails={handleViewDetails}
            chosenScenarioId={chosenScenarioId}
            chosenScenario={chosenScenario}
            onApply={handleApplyClick}
            readOnly={readOnly}
          />
        </div>
      )}

      {/* Comparison Table (only when scenarios exist) */}
      {scenarios && scenarios.length > 0 && !generating && (
        <div className="mb-10">
          <h2 className="text-sm text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Comparison at a Glance
          </h2>
          <div className="bg-slate-900/30 border border-slate-800/40 rounded-xl overflow-hidden">
            <ScenarioCompareTable 
              scenarios={scenarios} 
              chosenScenarioId={chosenScenarioId}
              readOnly={readOnly} 
            />
          </div>
        </div>
      )}

      {/* Footer CTAs */}
      {scenarios && scenarios.length > 0 && !generating && (
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => navigate(`/history?verdictId=${verdictContext.verdictId}`)}
            className="text-sm text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            View Full Verdict
          </button>
          <button
            onClick={() => navigate('/history')}
            className="text-sm text-slate-500 hover:text-slate-400 transition-colors"
          >
            Back to History
          </button>
        </div>
      )}

      {/* Scenario Drawer */}
      <ScenarioDrawer
        scenario={selectedScenario}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onApply={handleApplyClick}
        isChosen={selectedScenario?.id === chosenScenarioId}
        isApplying={applying}
        readOnly={readOnly}
      />

      {/* Apply Scenario Modal */}
      <ApplyScenarioModal
        isOpen={showApplyModal}
        scenario={scenarioToApply}
        onConfirm={handleConfirmApply}
        onCancel={() => {
          setShowApplyModal(false);
          setScenarioToApply(null);
        }}
        isApplying={applying}
      />

      {/* Regenerate Modal */}
      <RegenerateModal
        isOpen={showRegenerateModal}
        onConfirm={() => handleGenerateScenarios(true)}
        onCancel={() => setShowRegenerateModal(false)}
        isLoading={generating}
      />

      {/* Toast */}
      <Toast 
        message={toast.message} 
        isVisible={toast.isVisible}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })} 
      />
    </div>
  );
};

export default Scenarios;
