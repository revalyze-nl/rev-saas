import { memo } from 'react';

// Get ending type label
const getEndingTypeLabel = (type) => {
  switch (type) {
    case 'aggressive': return 'Aggressive';
    case 'balanced': return 'Balanced';
    case 'conservative': return 'Conservative';
    case 'do-nothing': 
    case 'do_nothing': return 'Do Nothing';
    default: return type?.charAt(0).toUpperCase() + type?.slice(1) || 'Unknown';
  }
};

// Get ending type style
const getEndingTypeStyle = (type) => {
  switch (type) {
    case 'aggressive': return 'border-l-red-500';
    case 'balanced': return 'border-l-emerald-500';
    case 'conservative': return 'border-l-blue-500';
    case 'do-nothing':
    case 'do_nothing': return 'border-l-slate-500';
    default: return 'border-l-slate-500';
  }
};

// Delta badge component - shows +/- with color
const DeltaBadge = ({ label, value, invertColors = false }) => {
  if (!value || value === 'Baseline' || value === 'N/A') {
    if (value === 'Baseline') {
      return (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">{label}</span>
          <span className="text-slate-400 font-medium">Baseline</span>
        </div>
      );
    }
    return null;
  }

  // Determine if positive or negative
  const isPositive = value.includes('+') || value.toLowerCase().includes('more') || value.toLowerCase().includes('faster') || value.toLowerCase().includes('better');
  const isNegative = value.includes('-') || value.toLowerCase().includes('less') || value.toLowerCase().includes('slower') || value.toLowerCase().includes('worse');
  const isHigher = value.toLowerCase().includes('higher');
  const isLower = value.toLowerCase().includes('lower');

  // Color logic - for some metrics, lower is better (churn, risk)
  let colorClass = 'text-slate-400';
  if (invertColors) {
    // For churn/risk - lower is green, higher is red
    if (isNegative || isLower) colorClass = 'text-emerald-400';
    else if (isPositive || isHigher) colorClass = 'text-red-400';
  } else {
    // For revenue/conversion - higher is green, lower is red
    if (isPositive || isHigher) colorClass = 'text-emerald-400';
    else if (isNegative || isLower) colorClass = 'text-red-400';
  }

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className={`font-medium ${colorClass}`}>{value}</span>
    </div>
  );
};

/**
 * Delta-First Ending Card
 * Shows scenario comparison as DELTAS vs baseline
 * NO absolute KPI values - only what changes
 */
const EndingCard = memo(({ 
  scenario, 
  isChosen = false,
  isBaseline = false,
  onInspect,
  onChoose
}) => {
  if (!scenario) return null;

  const typeLabel = getEndingTypeLabel(scenario.type);
  const borderStyle = getEndingTypeStyle(scenario.type);
  const deltas = scenario.deltas || {};

  return (
    <div 
      className={`relative p-4 border-l-4 ${borderStyle} rounded-xl transition-all ${
        isChosen 
          ? 'bg-violet-500/10 border border-violet-500/30 ring-2 ring-violet-500/20' 
          : isBaseline
            ? 'bg-emerald-500/5 border border-emerald-500/20'
            : 'bg-slate-900/50 border border-slate-800/40 hover:border-slate-700/60 hover:bg-slate-900/60'
      }`}
    >
      {/* Chosen Badge */}
      {isChosen && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center shadow-lg shadow-violet-500/30">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-sm font-semibold text-white">{typeLabel}</h4>
        {scenario.isRecommended && !isChosen && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30">
            Recommended
          </span>
        )}
        {isBaseline && !isChosen && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-500/20 text-slate-400 rounded border border-slate-500/30">
            Baseline
          </span>
        )}
        {isChosen && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-violet-500/20 text-violet-400 rounded border border-violet-500/30">
            Chosen
          </span>
        )}
      </div>

      {/* Delta Grid - DELTA FIRST, NO ABSOLUTE VALUES */}
      <div className="space-y-1.5 mb-4 py-2 border-y border-slate-800/30">
        <DeltaBadge label="Δ Revenue" value={deltas.revenue} />
        <DeltaBadge label="Δ Churn" value={deltas.churn} invertColors={true} />
        <DeltaBadge label="Δ Risk" value={deltas.risk} invertColors={true} />
        <DeltaBadge label="Δ Time" value={deltas.time} />
        {!isBaseline && deltas.effort && deltas.effort !== 'Baseline' && (
          <DeltaBadge label="Δ Effort" value={deltas.effort} invertColors={true} />
        )}
      </div>

      {/* Baseline indicator */}
      {isBaseline && (
        <p className="text-[10px] text-slate-500 mb-3 text-center">
          All other scenarios show changes vs this path
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onInspect(scenario)}
          className="flex-1 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-slate-700/50"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Inspect
        </button>
        {!isChosen && onChoose && (
          <button
            onClick={() => onChoose(scenario)}
            className="flex-1 py-2 text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-violet-500/30"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Choose
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

EndingCard.displayName = 'EndingCard';

export default EndingCard;
