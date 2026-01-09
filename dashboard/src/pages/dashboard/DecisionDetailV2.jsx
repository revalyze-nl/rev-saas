import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decisionsV2Api } from '../../lib/apiClient';
import {
  getOutcome,
  getOutcomeStatusLabel,
  normalizePercent,
  getDaysSinceImplemented,
  getComparisonStatus,
  calculateReadinessScore,
  isOutcomeComplete,
} from '../../lib/outcomeStorage';

// Confidence style helper
const getConfidenceStyle = (level) => {
  if (typeof level === 'string') {
    const lower = level.toLowerCase();
    if (lower === 'high') return 'text-emerald-400';
    if (lower === 'medium') return 'text-amber-400';
    return 'text-slate-400';
  }
  if (level >= 0.8) return 'text-emerald-400';
  if (level >= 0.6) return 'text-amber-400';
  return 'text-slate-400';
};

// Risk style helper
const getRiskStyle = (level) => {
  const lowerLevel = level?.toLowerCase();
  switch (lowerLevel) {
    case 'low': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20';
    default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  }
};

// Effort style helper
const getEffortStyle = (level) => {
  const lowerLevel = level?.toLowerCase();
  switch (lowerLevel) {
    case 'low': return 'text-emerald-400';
    case 'medium': return 'text-amber-400';
    case 'high': return 'text-red-400';
    default: return 'text-slate-400';
  }
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

// Format short date
const formatShortDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Calculate days since date
const getDaysSince = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  const today = new Date();
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffTime = today - date;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Collapsible Section Component (Read-only style)
const CollapsibleSection = ({ id, title, children, defaultOpen = false, badge = null }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-slate-900/20 border border-slate-800/30 rounded-xl hover:bg-slate-900/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">{title}</span>
          {badge}
        </div>
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="mt-2 p-5 bg-slate-900/20 border border-slate-800/30 rounded-xl">
          {children}
        </div>
      )}
    </div>
  );
};

const DecisionDetailV2 = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  // Outcome from localStorage
  const [outcome, setOutcome] = useState(null);

  const fetchDecision = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await decisionsV2Api.get(id);
      setDecision(data);
      
      // Load outcome from localStorage
      const storedOutcome = getOutcome(id);
      setOutcome(storedOutcome);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDecision();
  }, [fetchDecision]);

  // Loading state
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto pt-8 flex items-center justify-center min-h-[60vh]">
        <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  // Error state
  if (error || !decision) {
    return (
      <div className="max-w-3xl mx-auto pt-8 text-center">
        <p className="text-red-400 mb-4">{error || 'Decision not found'}</p>
        <button
          onClick={() => navigate('/history')}
          className="px-4 py-2 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors"
        >
          Back to Archive
        </button>
      </div>
    );
  }

  const verdict = decision.verdict || {};
  
  // Outcome status
  const outcomeStatus = getOutcomeStatusLabel(outcome);
  const readinessScore = calculateReadinessScore(outcome);
  const outcomeComplete = isOutcomeComplete(outcome);
  
  // Days since decision
  const daysSinceDecision = getDaysSince(decision.createdAt);
  const daysSinceImplemented = getDaysSinceImplemented(outcome?.dateImplemented);
  
  // Predicted values
  const predictedRevenue = verdict.supportingDetails?.expectedRevenueImpact || verdict.decisionSnapshot?.revenueImpactRange;
  const predictedChurn = verdict.supportingDetails?.churnOutlook;
  const predictedTimeToImpact = verdict.decisionSnapshot?.timeToImpact || verdict.executiveVerdict?.timeHorizon;
  const predictedRiskLevel = verdict.decisionSnapshot?.primaryRiskLevel || verdict.riskAnalysis?.riskLevel;
  
  // Comparison status
  const comparisonStatus = getComparisonStatus(outcome?.actualRevenueImpact, predictedRevenue);
  
  // Execution checklist counts
  const next14DaysCount = verdict?.executionChecklist?.next14Days?.length || 0;
  const next30To60DaysCount = verdict?.executionChecklist?.next30To60Days?.length || 0;
  const hasExecutionChecklist = next14DaysCount > 0 || next30To60DaysCount > 0;

  return (
    <div className="max-w-3xl mx-auto pt-8 pb-16">
      {/* Back button */}
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

      {/* HISTORY MODE HEADER - Date & Days Since */}
      <div className="mb-6 p-4 bg-slate-900/30 border border-slate-800/40 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-slate-400">{formatShortDate(decision.createdAt)}</span>
            </div>
            {daysSinceDecision !== null && (
              <span className="text-xs text-slate-600">
                {daysSinceDecision === 0 ? 'Today' : `${daysSinceDecision} days ago`}
              </span>
            )}
          </div>
          
          {/* Decision Status Badge */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-sm font-medium rounded-lg border ${
              outcome?.decisionTaken === true
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : outcome?.decisionTaken === false
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              {outcome?.decisionTaken === true ? '✓ Decision Taken' : 
               outcome?.decisionTaken === false ? '✗ Not Taken' : 
               '○ Undecided'}
            </span>
            {outcomeComplete && (
              <span className="w-2 h-2 bg-emerald-400 rounded-full" title="Outcome data complete" />
            )}
          </div>
        </div>
      </div>

      {/* DECISION SNAPSHOT - With Predicted vs Actual */}
      {verdict.decisionSnapshot && (
        <div className="mb-8 p-6 bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/50 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-xs text-slate-400 uppercase tracking-wider font-medium">Decision Snapshot</h3>
              <span className="text-xs text-slate-600">(Reviewing past decision)</span>
            </div>
            
            {/* Outcome Status */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${outcomeStatus.style}`}>
                {outcomeStatus.label}
              </span>
              {outcomeStatus.date && (
                <span className="text-xs text-slate-500">
                  • {formatShortDate(outcomeStatus.date)}
                </span>
              )}
            </div>
          </div>
          
          {/* Snapshot Grid with Predicted vs Actual */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Revenue Impact - Predicted vs Actual */}
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Revenue Impact</p>
              <div className="flex flex-col">
                <p className="text-lg font-bold text-emerald-400">
                  {verdict.decisionSnapshot.revenueImpactRange}
                </p>
                {outcome?.actualRevenueImpact && (
                  <p className={`text-xs mt-1 ${
                    normalizePercent(outcome.actualRevenueImpact) >= 0 
                      ? 'text-emerald-300' 
                      : 'text-red-400'
                  }`}>
                    Actual: {outcome.actualRevenueImpact}
                  </p>
                )}
              </div>
            </div>
            
            {/* Primary Risk */}
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Primary Risk</p>
              <p className={`text-lg font-bold ${getRiskStyle(verdict.decisionSnapshot.primaryRiskLevel).split(' ')[0]}`}>
                {verdict.decisionSnapshot.primaryRiskLevel}
              </p>
              {verdict.decisionSnapshot.primaryRiskExplain && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {verdict.decisionSnapshot.primaryRiskExplain}
                </p>
              )}
            </div>
            
            {/* Time to Impact */}
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Time to Impact</p>
              <p className="text-lg font-bold text-white">
                {verdict.decisionSnapshot.timeToImpact}
              </p>
              {daysSinceImplemented !== null && (
                <p className="text-xs text-slate-500 mt-1">
                  {daysSinceImplemented} days since implementation
                </p>
              )}
            </div>
            
            {/* Execution Effort */}
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Execution Effort</p>
              <p className={`text-lg font-bold ${getEffortStyle(verdict.decisionSnapshot.executionEffort)}`}>
                {verdict.decisionSnapshot.executionEffort}
              </p>
            </div>
            
            {/* Reversibility */}
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Reversibility</p>
              <p className={`text-lg font-bold ${getEffortStyle(verdict.decisionSnapshot.reversibility === 'High' ? 'Low' : verdict.decisionSnapshot.reversibility === 'Low' ? 'High' : 'Medium')}`}>
                {verdict.decisionSnapshot.reversibility}
              </p>
            </div>
            
            {/* Readiness Score */}
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Readiness</p>
              <p className={`text-lg font-bold ${
                readinessScore >= 80 ? 'text-emerald-400' :
                readinessScore >= 60 ? 'text-amber-400' :
                readinessScore >= 30 ? 'text-slate-400' :
                'text-slate-600'
              }`}>
                {readinessScore}%
              </p>
            </div>
          </div>

          {/* Comparison Status Line */}
          {(outcome?.actualRevenueImpact || outcome?.actualChurnImpact) && (
            <div className="mt-4 pt-4 border-t border-slate-800/40">
              {comparisonStatus === 'on_track' && (
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                  <p className="text-sm text-emerald-400 font-medium">On track — actual within predicted range</p>
                </div>
              )}
              {comparisonStatus === 'above' && (
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                  <p className="text-sm text-emerald-400 font-medium">Outperforming — above predicted range</p>
                </div>
              )}
              {comparisonStatus === 'below' && (
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                  <p className="text-sm text-amber-400 font-medium">Underperforming — below predicted range</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Executive Verdict - Main Headline */}
      <div className="mb-8">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
          {verdict.executiveVerdict?.decisionType || decision.companyName}
        </p>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-5 tracking-tight leading-tight">
          {verdict.executiveVerdict?.recommendation || verdict.headline}
        </h1>

        {/* Meta Info */}
        <div className="flex flex-wrap gap-4 mb-5 text-sm text-slate-500">
          {verdict.executiveVerdict?.timeHorizon && (
            <span>Time horizon: <span className="text-slate-300">{verdict.executiveVerdict.timeHorizon}</span></span>
          )}
          {verdict.executiveVerdict?.scopeOfImpact && (
            <span>Scope: <span className="text-slate-300">{verdict.executiveVerdict.scopeOfImpact}</span></span>
          )}
        </div>

        {/* Summary */}
        <p className="text-lg text-slate-300 leading-relaxed">
          {verdict.summary}
        </p>
      </div>

      {/* PERSONALIZATION SIGNALS (Read-only) */}
      {verdict.personalizationSignals && (
        <div className="mb-8 p-5 bg-violet-500/5 border border-violet-500/20 rounded-xl">
          <h3 className="text-xs text-violet-400 uppercase tracking-wider font-medium mb-4">
            Why This Was Specific to This Company
          </h3>
          <div className="space-y-3 text-sm text-slate-300">
            {verdict.personalizationSignals.pricingPageInsight && (
              <p>{verdict.personalizationSignals.pricingPageInsight}</p>
            )}
            {verdict.personalizationSignals.companyStageInsight && (
              <p>{verdict.personalizationSignals.companyStageInsight}</p>
            )}
            {verdict.personalizationSignals.competitorInsight && (
              <p>{verdict.personalizationSignals.competitorInsight}</p>
            )}
            {verdict.personalizationSignals.kpiInsight && (
              <p>{verdict.personalizationSignals.kpiInsight}</p>
            )}
          </div>
        </div>
      )}

      {/* OUTCOME DATA DISPLAY (From localStorage) */}
      {outcome && (outcome.decisionTaken !== null || outcome.dateImplemented || outcome.actualRevenueImpact || outcome.actualChurnImpact || outcome.notes) && (
        <div className="mb-8 p-6 bg-slate-900/40 border border-slate-700/50 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm text-slate-300 font-medium uppercase tracking-wider">Recorded Outcome</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Decision Status */}
            <div>
              <p className="text-xs text-slate-500 mb-1">Decision</p>
              <p className={`text-sm font-medium ${outcomeStatus.style}`}>
                {outcomeStatus.label}
              </p>
            </div>
            
            {/* Implementation Date */}
            {outcome.dateImplemented && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Implemented</p>
                <p className="text-sm text-slate-300">
                  {formatShortDate(outcome.dateImplemented)}
                  {daysSinceImplemented !== null && (
                    <span className="text-slate-500 ml-1">({daysSinceImplemented}d ago)</span>
                  )}
                </p>
              </div>
            )}
            
            {/* Actual Revenue */}
            {outcome.actualRevenueImpact && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Actual Revenue Impact</p>
                <p className={`text-sm font-medium ${
                  normalizePercent(outcome.actualRevenueImpact) >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {outcome.actualRevenueImpact}
                </p>
              </div>
            )}
            
            {/* Actual Churn */}
            {outcome.actualChurnImpact && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Actual Churn Impact</p>
                <p className={`text-sm font-medium ${
                  normalizePercent(outcome.actualChurnImpact) <= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {outcome.actualChurnImpact}
                </p>
              </div>
            )}
          </div>
          
          {/* Notes */}
          {outcome.notes && (
            <div className="mt-4 pt-4 border-t border-slate-800/40">
              <p className="text-xs text-slate-500 mb-2">Notes</p>
              <p className="text-sm text-slate-400 leading-relaxed">{outcome.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Collapsible Sections */}
      <div className="space-y-3">

        {/* 1. If You Proceed */}
        {verdict.ifYouProceed && (
          <CollapsibleSection id="proceed" title="If you proceeded with this decision" defaultOpen={true}>
            <div className="space-y-4">
              {verdict.ifYouProceed.expectedUpside && verdict.ifYouProceed.expectedUpside.length > 0 && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-2">Expected upside</h4>
                  <ul className="space-y-2">
                    {verdict.ifYouProceed.expectedUpside.map((item, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">+</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {verdict.ifYouProceed.secondaryEffects && verdict.ifYouProceed.secondaryEffects.length > 0 && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-2">Secondary effects</h4>
                  <ul className="space-y-2">
                    {verdict.ifYouProceed.secondaryEffects.map((item, i) => (
                      <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                        <span className="text-slate-600 mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* 2. If You Do Not Act */}
        {verdict.ifYouDoNotAct && (
          <CollapsibleSection id="inaction" title="If you did NOT take action">
            <div className="space-y-3">
              {verdict.ifYouDoNotAct.whatStagnates && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-1">What stagnates</h4>
                  <p className="text-sm text-slate-300">{verdict.ifYouDoNotAct.whatStagnates}</p>
                </div>
              )}
              {verdict.ifYouDoNotAct.competitorAdvantage && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-1">What competitors gained</h4>
                  <p className="text-sm text-slate-300">{verdict.ifYouDoNotAct.competitorAdvantage}</p>
                </div>
              )}
              {verdict.ifYouDoNotAct.futureDifficulty && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-1">What became harder</h4>
                  <p className="text-sm text-slate-300">{verdict.ifYouDoNotAct.futureDifficulty}</p>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* 3. Alternatives Considered */}
        {verdict.alternativesConsidered && verdict.alternativesConsidered.length > 0 && (
          <CollapsibleSection 
            id="alternatives" 
            title="Alternatives considered and rejected"
            badge={<span className="text-xs text-slate-600">({verdict.alternativesConsidered.length})</span>}
          >
            <div className="space-y-4">
              {verdict.alternativesConsidered.map((alt, i) => (
                <div key={i} className="border-b border-slate-800/30 pb-3 last:border-b-0 last:pb-0">
                  <h4 className="text-sm text-slate-300 font-medium mb-1">{alt.name}</h4>
                  <p className="text-sm text-slate-500">{alt.whyNotSelected}</p>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* 4. Risk Analysis */}
        {verdict.riskAnalysis && (
          <CollapsibleSection 
            id="risk" 
            title="Risk and trade-off analysis"
            badge={
              <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getRiskStyle(verdict.riskAnalysis.riskLevel)}`}>
                {verdict.riskAnalysis.riskLevel}
              </span>
            }
          >
            <div className="space-y-3">
              {verdict.riskAnalysis.whoIsAffected && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-1">Who was most affected</h4>
                  <p className="text-sm text-slate-300">{verdict.riskAnalysis.whoIsAffected}</p>
                </div>
              )}
              {verdict.riskAnalysis.howItManifests && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-1">How risk manifested</h4>
                  <p className="text-sm text-slate-300">{verdict.riskAnalysis.howItManifests}</p>
                </div>
              )}
              {verdict.riskAnalysis.whyAcceptable && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-1">Why it was acceptable</h4>
                  <p className="text-sm text-slate-300">{verdict.riskAnalysis.whyAcceptable}</p>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* 5. Expected Business Impact */}
        {verdict.supportingDetails && (
          <CollapsibleSection id="impact" title="Expected business impact">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-800/30">
                <span className="text-sm text-slate-500">Predicted revenue impact</span>
                <span className="text-sm text-slate-300 font-medium">{verdict.supportingDetails.expectedRevenueImpact}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800/30">
                <span className="text-sm text-slate-500">Predicted churn</span>
                <span className="text-sm text-slate-300">{verdict.supportingDetails.churnOutlook}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-500">Long-term positioning</span>
                <span className="text-sm text-slate-300">{verdict.supportingDetails.marketPositioning}</span>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* 6. Why This Fits */}
        {verdict.whyThisFits && (
          <CollapsibleSection id="fit" title="Why this decision fit your company">
            <div className="space-y-3">
              {verdict.whyThisFits.companyStageReason && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-1">Company stage</h4>
                  <p className="text-sm text-slate-300">{verdict.whyThisFits.companyStageReason}</p>
                </div>
              )}
              {verdict.whyThisFits.businessModelReason && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-1">Business model</h4>
                  <p className="text-sm text-slate-300">{verdict.whyThisFits.businessModelReason}</p>
                </div>
              )}
              {verdict.whyThisFits.marketSegmentReason && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-1">Market segment</h4>
                  <p className="text-sm text-slate-300">{verdict.whyThisFits.marketSegmentReason}</p>
                </div>
              )}
              {verdict.whyThisFits.primaryKpiReason && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-1">Primary KPI alignment</h4>
                  <p className="text-sm text-slate-300">{verdict.whyThisFits.primaryKpiReason}</p>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* 7. Execution Checklist - READ-ONLY with completed states */}
        {verdict.executionChecklist && hasExecutionChecklist && (
          <CollapsibleSection 
            id="execution" 
            title="Execution checklist" 
            defaultOpen={true}
            badge={
              <div className="flex items-center gap-2 ml-2">
                <span className="text-xs text-slate-500">Readiness:</span>
                <span className={`text-xs font-medium ${
                  readinessScore >= 80 ? 'text-emerald-400' :
                  readinessScore >= 60 ? 'text-amber-400' :
                  readinessScore >= 30 ? 'text-slate-400' :
                  'text-slate-600'
                }`}>
                  {readinessScore}%
                </span>
              </div>
            }
          >
            <div className="space-y-5">
              {/* Next 14 Days - Show as completed if decision was taken */}
              {verdict.executionChecklist.next14Days && verdict.executionChecklist.next14Days.length > 0 && (
                <div>
                  <h4 className="text-xs text-emerald-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                    First 14 Days
                    {outcome?.decisionTaken === true && (
                      <span className="text-xs text-slate-500 font-normal">(Phase completed)</span>
                    )}
                  </h4>
                  <ul className="space-y-2 pl-4">
                    {verdict.executionChecklist.next14Days.map((item, i) => (
                      <li key={i} className={`text-sm flex items-start gap-2 ${
                        outcome?.decisionTaken === true ? 'text-slate-500 line-through' : 'text-slate-300'
                      }`}>
                        {outcome?.decisionTaken === true ? (
                          <svg className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-emerald-400 mt-0.5">1.{i+1}</span>
                        )}
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next 30-60 Days */}
              {verdict.executionChecklist.next30To60Days && verdict.executionChecklist.next30To60Days.length > 0 && (
                <div>
                  <h4 className="text-xs text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                    Days 30–60
                    {outcome?.decisionTaken === true && daysSinceImplemented && daysSinceImplemented > 60 && (
                      <span className="text-xs text-slate-500 font-normal">(Phase completed)</span>
                    )}
                  </h4>
                  <ul className="space-y-2 pl-4">
                    {verdict.executionChecklist.next30To60Days.map((item, i) => {
                      const isCompleted = outcome?.decisionTaken === true && daysSinceImplemented && daysSinceImplemented > 60;
                      return (
                        <li key={i} className={`text-sm flex items-start gap-2 ${
                          isCompleted ? 'text-slate-500 line-through' : 'text-slate-300'
                        }`}>
                          {isCompleted ? (
                            <svg className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <span className="text-amber-400 mt-0.5">2.{i+1}</span>
                          )}
                          {item}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Success Metrics */}
              {verdict.executionChecklist.successMetrics && verdict.executionChecklist.successMetrics.length > 0 && (
                <div>
                  <h4 className="text-xs text-violet-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-violet-400 rounded-full"></span>
                    Success Metrics Monitored
                  </h4>
                  <ul className="space-y-2 pl-4">
                    {verdict.executionChecklist.successMetrics.map((item, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <svg className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Legacy fallbacks */}
        {!verdict.ifYouProceed && verdict.whyThisDecision && verdict.whyThisDecision.length > 0 && (
          <CollapsibleSection id="why" title="Why this decision">
            <div className="space-y-3">
              {verdict.whyThisDecision.map((reason, index) => (
                <p key={index} className="text-sm text-slate-400 leading-relaxed flex items-start gap-2">
                  <span className="text-slate-600 mt-0.5">•</span>
                  {reason}
                </p>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {!verdict.riskAnalysis && verdict.whatToExpect && (
          <CollapsibleSection id="expectations" title="What was expected">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getRiskStyle(verdict.whatToExpect.riskLabel)}`}>
                  {verdict.whatToExpect.riskLabel} Risk
                </span>
              </div>
              <p className="text-sm text-slate-400">{verdict.whatToExpect.description}</p>
            </div>
          </CollapsibleSection>
        )}

        {verdict.executionNote && !verdict.executionChecklist && (
          <CollapsibleSection id="executionNote" title="Execution note">
            <p className="text-sm text-slate-300 leading-relaxed">{verdict.executionNote}</p>
          </CollapsibleSection>
        )}
      </div>

      {/* MIC DROP - Closing statement (Past tense) */}
      <div className="mt-10 p-4 bg-slate-900/30 border border-slate-800/40 rounded-xl text-center">
        <p className="text-sm text-slate-400 italic">
          This decision compounded; delaying it would have increased the cost of change.
        </p>
      </div>

      {/* Footer */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <p className="text-xs text-slate-600">
          Decision made {formatDate(decision.createdAt)}
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/verdict')}
            className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            Analyze another company
          </button>
          <button
            onClick={() => navigate(`/scenarios?verdictId=${decision.id}`)}
            className="text-sm text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            View Scenarios
          </button>
          <button
            onClick={() => navigate(`/archive/${decision.id}`)}
            className="text-sm text-slate-500 hover:text-slate-400 transition-colors"
          >
            Edit outcome
          </button>
        </div>
      </div>
    </div>
  );
};

export default DecisionDetailV2;
