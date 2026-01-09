import { memo } from 'react';

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

// Delta badge styles
const getDeltaStyle = (delta) => {
  if (!delta || delta === 'Baseline' || delta === 'Same' || delta === 'N/A') {
    return 'text-slate-500 bg-slate-800/50';
  }
  const isPositive = delta.includes('+') || delta.toLowerCase().includes('faster') || delta.toLowerCase().includes('lower') || delta.toLowerCase().includes('better');
  const isNegative = delta.includes('-') || delta.toLowerCase().includes('slower') || delta.toLowerCase().includes('higher') || delta.toLowerCase().includes('worse');
  
  if (isPositive) return 'text-emerald-400 bg-emerald-500/10';
  if (isNegative) return 'text-amber-400 bg-amber-500/10';
  return 'text-slate-400 bg-slate-800/50';
};

/**
 * Netflix-Style Alternate Ending Card
 * Compact scenario card for History accordion
 * Shows metrics and delta vs chosen scenario
 */
const ScenarioMiniCard = memo(({ 
  scenario, 
  isChosen = false,
  chosenScenarioId,
  chosenScenarioData,
  onViewDetails,
  onApply
}) => {
  if (!scenario) return null;

  const hasChosenScenario = !!chosenScenarioId;
  const showDeltas = hasChosenScenario && !isChosen && scenario.deltas;

  return (
    <div 
      className={`relative p-4 border rounded-xl transition-all ${
        isChosen 
          ? 'bg-violet-500/10 border-violet-500/40 ring-2 ring-violet-500/20' 
          : scenario.isRecommended
            ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/30'
            : 'bg-slate-900/40 border-slate-800/50 hover:border-slate-700/60'
      }`}
    >
      {/* Chosen checkmark */}
      {isChosen && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center shadow-lg shadow-violet-500/30">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-sm font-semibold text-white">{scenario.name}</h4>
          {isChosen && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-violet-500/20 text-violet-400 rounded border border-violet-500/30">
              Chosen Ending
            </span>
          )}
          {scenario.isRecommended && !isChosen && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30">
              Recommended
            </span>
          )}
        </div>
      </div>

      {/* One-liner description */}
      <p className="text-xs text-slate-400 mb-3 line-clamp-2">
        {scenario.positioning || scenario.summary}
      </p>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="text-center">
          <p className="text-[10px] text-slate-500 mb-0.5">Revenue</p>
          <p className="text-xs font-medium text-emerald-400">{scenario.revenueImpact}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-500 mb-0.5">Churn</p>
          <p className="text-xs text-slate-300">{scenario.churnImpact}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-500 mb-0.5">Risk</p>
          <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded border ${getRiskStyle(scenario.riskLevel)}`}>
            {scenario.riskLevel}
          </span>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-500 mb-0.5">Time</p>
          <p className="text-xs text-slate-300">{scenario.timeToImpact}</p>
        </div>
      </div>

      {/* Delta vs Chosen - Only show if there's a chosen scenario and this isn't it */}
      {showDeltas && (
        <div className="mb-3 p-2 bg-slate-950/40 rounded-lg border border-slate-800/30">
          <p className="text-[10px] text-slate-500 mb-1.5">vs Chosen ending:</p>
          <div className="flex flex-wrap gap-1.5">
            {scenario.deltas.revenue && scenario.deltas.revenue !== 'Baseline' && scenario.deltas.revenue !== 'N/A' && (
              <span className={`px-1.5 py-0.5 text-[10px] rounded ${getDeltaStyle(scenario.deltas.revenue)}`}>
                {scenario.deltas.revenue} revenue
              </span>
            )}
            {scenario.deltas.churn && scenario.deltas.churn !== 'Baseline' && scenario.deltas.churn !== 'N/A' && (
              <span className={`px-1.5 py-0.5 text-[10px] rounded ${getDeltaStyle(scenario.deltas.churn)}`}>
                {scenario.deltas.churn} churn
              </span>
            )}
            {scenario.deltas.risk && scenario.deltas.risk !== 'Baseline' && scenario.deltas.risk !== 'N/A' && (
              <span className={`px-1.5 py-0.5 text-[10px] rounded ${getDeltaStyle(scenario.deltas.risk)}`}>
                {scenario.deltas.risk} risk
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onViewDetails(scenario)}
          className="flex-1 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Inspect
        </button>
        {!isChosen && onApply && (
          <button
            onClick={() => onApply(scenario)}
            className="flex-1 py-2 text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-violet-500/20"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Apply
          </button>
        )}
        {isChosen && (
          <div className="flex-1 py-2 text-xs text-violet-400 bg-violet-500/10 rounded-lg flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Chosen
          </div>
        )}
      </div>
    </div>
  );
});

ScenarioMiniCard.displayName = 'ScenarioMiniCard';

export default ScenarioMiniCard;
