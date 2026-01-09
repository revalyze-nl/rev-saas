import { useEffect, memo } from 'react';

// Delta value styling
const getDeltaStyle = (value, invertColors = false) => {
  if (!value || value === 'Baseline' || value === 'N/A') {
    return 'text-slate-400';
  }
  
  const isPositive = value.includes('+') || value.toLowerCase().includes('more') || 
                     value.toLowerCase().includes('faster') || value.toLowerCase().includes('better');
  const isNegative = value.includes('-') || value.toLowerCase().includes('less') || 
                     value.toLowerCase().includes('slower') || value.toLowerCase().includes('worse');
  const isHigher = value.toLowerCase().includes('higher');
  const isLower = value.toLowerCase().includes('lower');

  if (invertColors) {
    // For churn/risk/effort - lower is green, higher is red
    if (isNegative || isLower) return 'text-emerald-400';
    if (isPositive || isHigher) return 'text-red-400';
  } else {
    // For revenue/conversion - higher is green, lower is red
    if (isPositive || isHigher) return 'text-emerald-400';
    if (isNegative || isLower) return 'text-red-400';
  }
  return 'text-slate-400';
};

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
    case 'aggressive': return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'balanced': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'conservative': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'do-nothing':
    case 'do_nothing': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  }
};

/**
 * Delta-First Ending Inspect Drawer
 * Shows ONLY deltas compared to baseline - NO absolute values
 * Professional Netflix-like experience
 */
const EndingInspectDrawer = memo(({ 
  scenario, 
  isOpen, 
  onClose, 
  onChoose,
  isChosen = false,
  baselineName = 'Recommended Path'
}) => {
  // Handle ESC key and body scroll
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
  const deltas = scenario.deltas || {};
  const typeLabel = getEndingTypeLabel(scenario.type);
  const isBaseline = scenario.isBaseline || scenario.type === 'balanced';

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-40 transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Drawer */}
      <div 
        className="fixed top-0 right-0 h-full w-full max-w-lg bg-slate-950 border-l border-slate-800/50 z-50 overflow-y-auto animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800/40 p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getEndingTypeStyle(scenario.type)}`}>
                  {typeLabel}
                </span>
                {scenario.isRecommended && (
                  <span className="px-2.5 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                    Recommended
                  </span>
                )}
                {isChosen && (
                  <span className="px-2.5 py-1 text-xs font-medium bg-violet-500/20 text-violet-400 rounded-full border border-violet-500/30">
                    Chosen Path
                  </span>
                )}
              </div>
              <h2 id="drawer-title" className="text-xl font-bold text-white">
                Ending: {scenario.name}
              </h2>
              {scenario.positioning && (
                <p className="text-sm text-slate-500 italic mt-1">{scenario.positioning}</p>
              )}
            </div>
            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
              aria-label="Close drawer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          {/* Compared to Banner */}
          <div className="bg-slate-900/50 border border-slate-800/30 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Compared to</p>
            <p className="text-sm font-medium text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {baselineName}
            </p>
          </div>

          {/* DELTA TABLE - PRIMARY CONTENT */}
          <div>
            <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              What Changes
            </h3>
            
            {isBaseline ? (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">This is the Baseline</span>
                </div>
                <p className="text-xs text-slate-500">
                  All other scenarios are compared against this path. No deltas to show.
                </p>
              </div>
            ) : (
              <div className="bg-slate-900/50 border border-slate-800/30 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-800/30">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Metric</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    <tr>
                      <td className="px-4 py-3 text-sm text-slate-300">Revenue Impact</td>
                      <td className={`px-4 py-3 text-sm font-medium text-right ${getDeltaStyle(deltas.revenue)}`}>
                        {deltas.revenue || '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-slate-300">Churn Impact</td>
                      <td className={`px-4 py-3 text-sm font-medium text-right ${getDeltaStyle(deltas.churn, true)}`}>
                        {deltas.churn || '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-slate-300">Risk Level</td>
                      <td className={`px-4 py-3 text-sm font-medium text-right ${getDeltaStyle(deltas.risk, true)}`}>
                        {deltas.risk || '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-slate-300">Time to Impact</td>
                      <td className={`px-4 py-3 text-sm font-medium text-right ${getDeltaStyle(deltas.time)}`}>
                        {deltas.time || '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-slate-300">Execution Effort</td>
                      <td className={`px-4 py-3 text-sm font-medium text-right ${getDeltaStyle(deltas.effort, true)}`}>
                        {deltas.effort || '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Why This Changes - Qualitative Explanation */}
          {impl.whatChangesVsBaseline && !isBaseline && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Why This Changes
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/30 border border-slate-800/30 rounded-lg p-4">
                {impl.whatChangesVsBaseline}
              </p>
            </div>
          )}

          {/* What this looks like in practice */}
          {impl.whatItLooksLike && impl.whatItLooksLike.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
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

          {/* Failure modes to watch */}
          {impl.failureModes && impl.failureModes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Failure modes to watch
              </h3>
              <ul className="space-y-2">
                {impl.failureModes.map((item, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2 bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">!</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* When this ending makes sense */}
          {impl.whenMakesSense && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                When this ending makes sense
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/30 border border-slate-800/30 rounded-lg p-4">
                {impl.whenMakesSense}
              </p>
            </div>
          )}

          {/* Trade-offs */}
          {scenario.tradeoffs && scenario.tradeoffs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                Trade-offs
              </h3>
              <ul className="space-y-2">
                {scenario.tradeoffs.map((item, i) => (
                  <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">-</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer with CTAs */}
        <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur-sm border-t border-slate-800/40 p-4 space-y-2">
          {isChosen ? (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl mb-3">
                <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-violet-400">This is your chosen path</span>
              </div>
              <button 
                onClick={onClose}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <button 
                onClick={() => onChoose(scenario)}
                className="w-full py-3 bg-violet-500 hover:bg-violet-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Choose this ending
              </button>
              <button 
                onClick={onClose}
                className="w-full py-3 text-slate-400 hover:text-white hover:bg-slate-800 font-medium rounded-xl transition-colors"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
});

EndingInspectDrawer.displayName = 'EndingInspectDrawer';

export default EndingInspectDrawer;
