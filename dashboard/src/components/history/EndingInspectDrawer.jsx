import { useEffect, memo } from 'react';

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
 * Netflix-Style Ending Inspect Drawer
 * Right-side drawer for viewing full scenario details
 * Professional copy matching Netflix vibe
 */
const EndingInspectDrawer = memo(({ 
  scenario, 
  isOpen, 
  onClose, 
  onChoose,
  isChosen = false
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
  const typeLabel = getEndingTypeLabel(scenario.type);

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
          {/* Summary */}
          <div className="p-4 bg-slate-900/50 border border-slate-800/30 rounded-xl">
            <p className="text-sm text-slate-300 leading-relaxed">{scenario.summary}</p>
          </div>

          {/* Key Metrics Grid */}
          <div>
            <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Key Metrics</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Revenue Impact</p>
                <p className="text-sm font-medium text-emerald-400">{scenario.revenueImpact}</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Churn Impact</p>
                <p className="text-sm text-slate-300">{scenario.churnImpact}</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Risk Level</p>
                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${getRiskStyle(scenario.riskLevel)}`}>
                  {scenario.riskLevel}
                </span>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Time to Impact</p>
                <p className="text-sm text-slate-300">{scenario.timeToImpact}</p>
              </div>
            </div>
          </div>

          {/* Delta vs Baseline Section */}
          {scenario.deltas && !scenario.isBaseline && (
            <div>
              <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Delta vs Baseline</h3>
              <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Revenue</span>
                    <span className={`text-sm font-medium ${scenario.deltas.revenueDelta?.includes('+') || scenario.deltas.revenueDelta?.toLowerCase().includes('more') ? 'text-emerald-400' : 'text-red-400'}`}>
                      {scenario.deltas.revenueDelta || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Churn</span>
                    <span className={`text-sm font-medium ${scenario.deltas.churnDelta?.includes('-') || scenario.deltas.churnDelta?.toLowerCase().includes('better') ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {scenario.deltas.churnDelta || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Risk</span>
                    <span className={`text-sm font-medium ${scenario.deltas.riskDelta?.toLowerCase() === 'lower' ? 'text-emerald-400' : scenario.deltas.riskDelta?.toLowerCase() === 'higher' ? 'text-red-400' : 'text-slate-400'}`}>
                      {scenario.deltas.riskDelta || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Time</span>
                    <span className="text-sm font-medium text-slate-300">
                      {scenario.deltas.timeDelta || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between col-span-2">
                    <span className="text-xs text-slate-400">Effort</span>
                    <span className={`text-sm font-medium ${scenario.deltas.effortDelta?.toLowerCase() === 'lower' ? 'text-emerald-400' : scenario.deltas.effortDelta?.toLowerCase() === 'higher' ? 'text-amber-400' : 'text-slate-400'}`}>
                      {scenario.deltas.effortDelta || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Baseline Indicator */}
          {scenario.isBaseline && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">This is the baseline scenario</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">All other scenarios show deltas compared to this path.</p>
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

          {/* Operational implications */}
          {impl.operationalImplications && impl.operationalImplications.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
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

