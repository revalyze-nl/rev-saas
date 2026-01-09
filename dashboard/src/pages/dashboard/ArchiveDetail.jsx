import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decisionsV2Api } from '../../lib/apiClient';
import {
  getOutcome,
  saveOutcome,
  normalizePercent,
  getDaysSinceImplemented,
  getComparisonStatus,
} from '../../lib/outcomeStorage';

// Confidence style helper
const getConfidenceStyle = (score) => {
  if (typeof score === 'string') {
    const lower = score.toLowerCase();
    if (lower === 'high') return 'text-emerald-400';
    if (lower === 'medium') return 'text-amber-400';
    return 'text-slate-400';
  }
  if (score >= 0.8) return 'text-emerald-400';
  if (score >= 0.6) return 'text-amber-400';
  return 'text-slate-400';
};

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return 'Just now';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Risk style helper
const getRiskStyle = (level) => {
  const lowerLevel = level?.toLowerCase();
  switch (lowerLevel) {
    case 'low': return 'text-emerald-400';
    case 'medium': return 'text-amber-400';
    case 'high': return 'text-red-400';
    default: return 'text-slate-400';
  }
};

const ArchiveDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Outcome tracking state - initialized from utility
  const [outcome, setOutcome] = useState(() => getOutcome(id));
  const [outcomeSaved, setOutcomeSaved] = useState(false);

  // Fetch decision from API
  const fetchDecision = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await decisionsV2Api.get(id);
      setDecision(response.data);
      
      // Load stored outcome using utility (handles malformed JSON gracefully)
      const storedOutcome = getOutcome(id);
      setOutcome(storedOutcome);
    } catch (err) {
      console.error('Failed to fetch decision:', err);
      setError('Failed to load decision details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDecision();
  }, [fetchDecision]);

  // Handle outcome field change - saves immediately using utility
  const handleOutcomeChange = (field, value) => {
    const updated = saveOutcome(id, { [field]: value });
    setOutcome(updated);
    setOutcomeSaved(false);
  };

  // Manual save button - shows confirmation
  const handleSaveOutcome = () => {
    saveOutcome(id, outcome);
    setOutcomeSaved(true);
    setTimeout(() => setOutcomeSaved(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading decision...</span>
        </div>
      </div>
    );
  }

  if (error || !decision) {
    return (
      <div className="max-w-3xl mx-auto pt-8">
        <div className="text-center py-12">
          <p className="text-slate-400 mb-4">{error || 'Decision not found'}</p>
          <button
            onClick={() => navigate('/history')}
            className="text-violet-400 hover:text-violet-300 transition-colors"
          >
            Back to History
          </button>
        </div>
      </div>
    );
  }

  const verdict = decision.verdict || {};

  // Get predicted values for comparison
  const predictedRevenue = verdict.supportingDetails?.expectedRevenueImpact || verdict.decisionSnapshot?.revenueImpactRange;
  const predictedChurn = verdict.supportingDetails?.churnOutlook;
  const predictedTimeToImpact = verdict.decisionSnapshot?.timeToImpact || verdict.executiveVerdict?.timeHorizon;
  const predictedRiskLevel = verdict.decisionSnapshot?.primaryRiskLevel || verdict.riskAnalysis?.riskLevel;

  // Calculate days since implemented
  const daysSinceImplemented = getDaysSinceImplemented(outcome.dateImplemented);

  // Get comparison status
  const comparisonStatus = getComparisonStatus(outcome.actualRevenueImpact, predictedRevenue);

  return (
    <div className="max-w-3xl mx-auto pt-8 pb-16">
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/history')}
          className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Archive
        </button>
      </div>

      {/* Header Section */}
      <div className="mb-8">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
          Archived Decision
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight leading-tight">
          {verdict.executiveVerdict?.recommendation || verdict.headline || decision.companyName || 'Strategic Verdict'}
        </h1>
        
        {/* Metadata Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-900/30 border border-slate-800/30 rounded-xl">
          <div>
            <p className="text-xs text-slate-500 mb-1">Company</p>
            <p className="text-sm text-slate-300">{decision.companyName || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Time Horizon</p>
            <p className="text-sm text-slate-300">{verdict.executiveVerdict?.timeHorizon || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Scope</p>
            <p className="text-sm text-slate-300">{verdict.executiveVerdict?.scopeOfImpact || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Confidence</p>
            <p className={`text-sm font-medium ${getConfidenceStyle(verdict.confidenceLabel)}`}>
              {verdict.confidenceLabel || 'N/A'}
            </p>
          </div>
        </div>
        
        <p className="text-xs text-slate-500 mt-4">
          Created: {formatDate(decision.createdAt)}
        </p>
      </div>

      {/* OUTCOME TRACKING SECTION */}
      <div className="mb-8 p-6 bg-slate-900/40 border border-slate-700/50 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm text-slate-300 font-medium uppercase tracking-wider">Outcome Tracking</h3>
          </div>
          {outcomeSaved && (
            <span className="text-xs text-emerald-400">Saved ✓</span>
          )}
        </div>
        
        {/* Premium subtitle */}
        <p className="text-xs text-slate-500 mb-6">
          Log outcomes to improve future recommendations.
        </p>

        <div className="space-y-5">
          {/* Decision Taken */}
          <div>
            <label className="text-xs text-slate-500 block mb-2">Decision taken?</label>
            <div className="flex gap-3">
              <button
                onClick={() => handleOutcomeChange('decisionTaken', true)}
                className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                  outcome.decisionTaken === true
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-900/50 border-slate-800/50 text-slate-400 hover:border-slate-700'
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => handleOutcomeChange('decisionTaken', false)}
                className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                  outcome.decisionTaken === false
                    ? 'bg-red-500/20 border-red-500/40 text-red-400'
                    : 'bg-slate-900/50 border-slate-800/50 text-slate-400 hover:border-slate-700'
                }`}
              >
                No
              </button>
            </div>
          </div>

          {/* Date Implemented */}
          <div>
            <label className="text-xs text-slate-500 block mb-2">Date implemented</label>
            <input
              type="date"
              value={outcome.dateImplemented || ''}
              onChange={(e) => handleOutcomeChange('dateImplemented', e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
            />
          </div>

          {/* Actual Revenue Impact */}
          <div>
            <label className="text-xs text-slate-500 block mb-2">Actual revenue impact (%)</label>
            <input
              type="text"
              value={outcome.actualRevenueImpact}
              onChange={(e) => handleOutcomeChange('actualRevenueImpact', e.target.value)}
              placeholder="e.g. +12%"
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          {/* Actual Churn Impact */}
          <div>
            <label className="text-xs text-slate-500 block mb-2">Actual churn impact (%)</label>
            <input
              type="text"
              value={outcome.actualChurnImpact}
              onChange={(e) => handleOutcomeChange('actualChurnImpact', e.target.value)}
              placeholder="e.g. -0.3%"
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-slate-500 block mb-2">Notes</label>
            <textarea
              value={outcome.notes}
              onChange={(e) => handleOutcomeChange('notes', e.target.value)}
              placeholder="Any observations, learnings, or context..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 resize-none"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveOutcome}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors"
          >
            Save Outcome
          </button>

          <p className="text-xs text-slate-600 text-center">
            Outcomes are saved locally. This data helps you compare predicted vs actual results.
          </p>
        </div>
      </div>

      {/* PREDICTED VS ACTUAL - Comparison Card */}
      <div className="mb-8 p-6 bg-gradient-to-br from-slate-800/30 to-slate-900/30 border border-slate-700/40 rounded-2xl">
        <div className="flex items-center gap-2 mb-5">
          <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-sm text-slate-300 font-medium uppercase tracking-wider">Predicted vs Actual</h3>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Header Row */}
          <div className="text-xs text-slate-600 font-medium">Metric</div>
          <div className="text-xs text-slate-600 font-medium text-center">Predicted</div>
          <div className="text-xs text-slate-600 font-medium text-center">Actual</div>

          {/* Revenue Impact Row */}
          <div className="text-sm text-slate-400">Revenue Impact</div>
          <div className="text-sm text-slate-300 text-center">
            {predictedRevenue || 'Not provided'}
          </div>
          <div className={`text-sm font-medium text-center ${
            outcome.actualRevenueImpact 
              ? (normalizePercent(outcome.actualRevenueImpact) >= 0 ? 'text-emerald-400' : 'text-red-400')
              : 'text-slate-600'
          }`}>
            {outcome.actualRevenueImpact || '—'}
          </div>

          {/* Churn Impact Row */}
          <div className="text-sm text-slate-400">Churn Impact</div>
          <div className="text-sm text-slate-300 text-center">
            {predictedChurn || 'Not provided'}
          </div>
          <div className={`text-sm font-medium text-center ${
            outcome.actualChurnImpact 
              ? (normalizePercent(outcome.actualChurnImpact) <= 0 ? 'text-emerald-400' : 'text-red-400')
              : 'text-slate-600'
          }`}>
            {outcome.actualChurnImpact || '—'}
          </div>

          {/* Time to Impact Row */}
          <div className="text-sm text-slate-400">Time to Impact</div>
          <div className="text-sm text-slate-300 text-center">
            {predictedTimeToImpact || 'Not provided'}
          </div>
          <div className="text-sm text-slate-300 text-center">
            {daysSinceImplemented !== null 
              ? `${daysSinceImplemented} days ago`
              : '—'
            }
          </div>

          {/* Risk Level Row */}
          <div className="text-sm text-slate-400">Risk Level</div>
          <div className={`text-sm font-medium text-center ${getRiskStyle(predictedRiskLevel)}`}>
            {predictedRiskLevel || 'Not provided'}
          </div>
          <div className="text-sm text-slate-600 text-center">
            {outcome.decisionTaken === true ? 'Accepted' : outcome.decisionTaken === false ? 'Rejected' : '—'}
          </div>
        </div>

        {/* Status Line */}
        <div className="pt-4 border-t border-slate-800/40">
          {(() => {
            if (!outcome.actualRevenueImpact && !outcome.actualChurnImpact) {
              return (
                <p className="text-xs text-slate-500 italic text-center">
                  Tracking starts once you enter actual outcomes above.
                </p>
              );
            }
            
            if (comparisonStatus === 'on_track') {
              return (
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                  <p className="text-sm text-emerald-400 font-medium">On track — actual revenue is within predicted range</p>
                </div>
              );
            } else if (comparisonStatus === 'above') {
              return (
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                  <p className="text-sm text-emerald-400 font-medium">Above range — outperforming prediction</p>
                </div>
              );
            } else if (comparisonStatus === 'below') {
              return (
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                  <p className="text-sm text-amber-400 font-medium">Below range — underperforming prediction</p>
                </div>
              );
            } else {
              return (
                <p className="text-xs text-slate-500 italic text-center">
                  Enter actual revenue impact to see comparison status.
                </p>
              );
            }
          })()}
        </div>
      </div>

      {/* Summary */}
      {verdict.summary && (
        <div className="mb-8">
          <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Summary</h3>
          <p className="text-slate-300 leading-relaxed">{verdict.summary}</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/verdict')}
          className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors text-sm"
        >
          New Analysis
        </button>
        <button
          onClick={() => navigate(`/decisions/${id}`)}
          className="flex-1 py-3 bg-slate-900/50 border border-slate-800 hover:border-slate-700 text-slate-300 font-medium rounded-xl transition-colors text-sm"
        >
          View Full Decision
        </button>
      </div>
    </div>
  );
};

export default ArchiveDetail;
