import { useState, useEffect, memo } from 'react';
import { learningApi } from '../lib/apiClient';

/**
 * Learning Indicators Component
 * Shows historical learning signals when available
 * Disappears if no data exists
 */
const LearningIndicators = memo(({ companyStage, primaryKpi }) => {
  const [indicators, setIndicators] = useState([]);
  const [confidenceBoost, setConfidenceBoost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState('');

  useEffect(() => {
    const fetchIndicators = async () => {
      if (!companyStage && !primaryKpi) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await learningApi.getIndicators(companyStage, primaryKpi);
        const data = response?.data || response;
        
        if (data && data.indicators && data.indicators.length > 0) {
          setIndicators(data.indicators);
          setConfidenceBoost(data.confidenceBoost || 0);
          setSummary(data.summary || '');
        } else {
          setIndicators([]);
          setConfidenceBoost(0);
          setSummary('');
        }
      } catch (err) {
        // Silently fail - no learning data is OK
        console.log('[learning] No historical data available');
        setIndicators([]);
      } finally {
        setLoading(false);
      }
    };

    fetchIndicators();
  }, [companyStage, primaryKpi]);

  // Don't render if no indicators
  if (loading) return null;
  if (indicators.length === 0) return null;

  return (
    <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 mb-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-medium text-white">Learning Signals</h4>
          {confidenceBoost > 0 && (
            <p className="text-[10px] text-violet-400">+{(confidenceBoost * 100).toFixed(0)}% confidence boost</p>
          )}
        </div>
      </div>

      {/* Indicators */}
      <div className="space-y-2">
        {indicators.map((indicator, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <div className={`mt-1 w-1.5 h-1.5 rounded-full ${
              indicator.relevance === 'high' ? 'bg-emerald-400' :
              indicator.relevance === 'medium' ? 'bg-yellow-400' : 'bg-slate-400'
            }`} />
            <div className="flex-1">
              <p className="text-xs text-white">{indicator.title}</p>
              <p className="text-[10px] text-slate-400">{indicator.description}</p>
              {indicator.sampleSize > 0 && (
                <p className="text-[9px] text-slate-500 mt-0.5">Based on {indicator.sampleSize} similar decisions</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {summary && (
        <p className="text-[10px] text-slate-500 mt-3 pt-3 border-t border-violet-500/10">
          {summary}
        </p>
      )}
    </div>
  );
});

LearningIndicators.displayName = 'LearningIndicators';

export default LearningIndicators;

