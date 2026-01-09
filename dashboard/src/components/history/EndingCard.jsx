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

/**
 * Compact Ending Card for 2x2 grid display
 * Shows scenario name, teaser, and action buttons
 * NO KPIs or detailed metrics - those live in the inspect drawer
 */
const EndingCard = memo(({ 
  scenario, 
  isChosen = false,
  onInspect,
  onChoose
}) => {
  if (!scenario) return null;

  const typeLabel = getEndingTypeLabel(scenario.type);
  const borderStyle = getEndingTypeStyle(scenario.type);

  return (
    <div 
      className={`relative p-4 border-l-4 ${borderStyle} rounded-xl transition-all ${
        isChosen 
          ? 'bg-violet-500/10 border border-violet-500/30 ring-2 ring-violet-500/20' 
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
        {isChosen && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-violet-500/20 text-violet-400 rounded border border-violet-500/30">
            Chosen
          </span>
        )}
      </div>

      {/* Teaser Line */}
      <p className="text-xs text-slate-400 mb-4 line-clamp-2 min-h-[32px]">
        {scenario.positioning || scenario.summary?.slice(0, 80) + '...'}
      </p>

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

