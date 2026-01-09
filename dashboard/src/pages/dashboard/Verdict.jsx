import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { decisionsV2Api } from '../../lib/apiClient';
import {
  getOutcome,
  saveOutcome,
  clearOutcome,
  calculateReadinessScore,
  getOutcomeStatusLabel,
} from '../../lib/outcomeStorage';
import ExportButton from '../../components/ExportButton';

// Context options
const COMPANY_STAGES = [
  { value: 'unknown', label: 'Select stage...' },
  { value: 'pre_seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series_a', label: 'Series A' },
  { value: 'series_b_plus', label: 'Series B+' },
  { value: 'public', label: 'Public' },
];

const BUSINESS_MODELS = [
  { value: 'unknown', label: 'Select model...' },
  { value: 'saas', label: 'SaaS' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'agency', label: 'Agency' },
  { value: 'enterprise_license', label: 'Enterprise License' },
  { value: 'usage_based', label: 'Usage-based' },
];

const PRIMARY_KPIS = [
  { value: 'unknown', label: 'Select KPI...' },
  { value: 'mrr_growth', label: 'MRR Growth' },
  { value: 'churn_reduction', label: 'Churn Reduction' },
  { value: 'activation', label: 'Activation' },
  { value: 'arpu', label: 'ARPU' },
  { value: 'nrr', label: 'NRR' },
  { value: 'cvr', label: 'Conversion Rate' },
  { value: 'retention', label: 'Retention' },
];

const MARKETS = [
  { value: 'unknown', label: 'Select market...' },
  { value: 'b2b', label: 'B2B' },
  { value: 'b2c', label: 'B2C' },
  { value: 'b2b2c', label: 'B2B2C' },
  { value: 'devtools', label: 'DevTools' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'other', label: 'Other' },
];

const Verdict = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState({});
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showContext, setShowContext] = useState(false);
  const [context, setContext] = useState({
    companyStage: 'unknown',
    businessModel: 'saas',
    primaryKpi: 'mrr_growth',
    market: 'b2b',
  });

  // Outcome tracking state
  const [showOutcomePanel, setShowOutcomePanel] = useState(false);
  const [outcome, setOutcome] = useState({
    decisionTaken: null,
    dateImplemented: '',
    actualRevenueImpact: '',
    actualChurnImpact: '',
    notes: '',
  });
  const [outcomeSaved, setOutcomeSaved] = useState(false);

  // Ref for execution checklist scrolling
  const executionChecklistRef = useRef(null);

  // Refs to prevent double-submit and duplicate requests
  const abortControllerRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const lastRequestRef = useRef({ url: null, time: 0 });
  const hasReceivedResponseRef = useRef(false);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Load outcome from localStorage when decision loads
  useEffect(() => {
    if (decision?.id) {
      const storedOutcome = getOutcome(decision.id);
      setOutcome(storedOutcome);
    }
  }, [decision?.id]);

  // Handle outcome field change
  const handleOutcomeChange = useCallback((field, value) => {
    setOutcome(prev => ({ ...prev, [field]: value }));
    setOutcomeSaved(false);
  }, []);

  // Save outcome to localStorage
  const handleSaveOutcome = useCallback(() => {
    if (!decision?.id) return;
    
    // Trim text fields before saving
    const trimmedOutcome = {
      ...outcome,
      actualRevenueImpact: outcome.actualRevenueImpact?.trim() || '',
      actualChurnImpact: outcome.actualChurnImpact?.trim() || '',
      notes: outcome.notes?.trim() || '',
    };
    
    saveOutcome(decision.id, trimmedOutcome);
    setOutcome(trimmedOutcome);
    setOutcomeSaved(true);
    setTimeout(() => setOutcomeSaved(false), 2000);
  }, [decision?.id, outcome]);

  // Clear outcome from localStorage
  const handleClearOutcome = useCallback(() => {
    if (!decision?.id) return;
    
    clearOutcome(decision.id);
    setOutcome({
      decisionTaken: null,
      dateImplemented: '',
      actualRevenueImpact: '',
      actualChurnImpact: '',
      notes: '',
    });
    setOutcomeSaved(false);
  }, [decision?.id]);

  // Scroll to execution checklist
  const scrollToChecklist = useCallback(() => {
    executionChecklistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Open the checklist section if not already
    setExpandedSections(prev => ({ ...prev, execution: true }));
  }, []);

  // Check if user is on paid plan
  const isPaidUser = user?.plan && user.plan !== 'free';

  // Extract verdict from decision for easier access
  const verdict = decision?.verdict;

  // Calculate outcome status and readiness score
  const outcomeStatus = getOutcomeStatusLabel(outcome);
  const readinessScore = calculateReadinessScore(outcome);

  // Count execution checklist items
  const next14DaysCount = verdict?.executionChecklist?.next14Days?.length || 0;
  const next30To60DaysCount = verdict?.executionChecklist?.next30To60Days?.length || 0;
  const hasExecutionChecklist = next14DaysCount > 0 || next30To60DaysCount > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    let trimmedUrl = websiteUrl.trim();
    if (!trimmedUrl) return;

    // Ensure URL has protocol
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      trimmedUrl = 'https://' + trimmedUrl;
    }

    const now = Date.now();

    // Prevent double-submit with multiple checks
    if (isSubmittingRef.current) {
      console.log('[Verdict] Ignoring: already submitting');
      return;
    }

    if (loading) {
      console.log('[Verdict] Ignoring: loading state is true');
      return;
    }

    // Prevent duplicate requests for same URL within 60 seconds
    if (lastRequestRef.current.url === trimmedUrl && 
        now - lastRequestRef.current.time < 60000) {
      console.log('[Verdict] Ignoring: same URL requested within 60s');
      return;
    }

    // Prevent any request if we already have a response
    if (hasReceivedResponseRef.current && decision) {
      console.log('[Verdict] Ignoring: already have a response');
      return;
    }

    // Mark as submitting IMMEDIATELY before any async work
    isSubmittingRef.current = true;
    lastRequestRef.current = { url: trimmedUrl, time: now };
    hasReceivedResponseRef.current = false;

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    console.log('[Verdict] Starting request for:', trimmedUrl);

    try {
      const response = await decisionsV2Api.create({
        websiteUrl: trimmedUrl,
        context: {
          companyStage: context.companyStage !== 'unknown' ? context.companyStage : undefined,
          businessModel: context.businessModel !== 'unknown' ? context.businessModel : undefined,
          primaryKpi: context.primaryKpi !== 'unknown' ? context.primaryKpi : undefined,
          market: {
            type: context.market !== 'unknown' ? context.market : undefined,
          },
        },
      });
      
      console.log('[Verdict] Response received, setting decision');
      hasReceivedResponseRef.current = true;
      setError(null); // Clear any error from duplicate requests
      setDecision(response.data);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[Verdict] Request aborted');
        return;
      }
      // Ignore duplicate request errors completely - the first request will succeed
      if (err.message && err.message.includes('duplicate')) {
        console.log('[Verdict] Ignoring duplicate error');
        return;
      }
      console.error('[Verdict] Error:', err);
      // Only show error if we don't have a response yet
      if (!hasReceivedResponseRef.current) {
        setError('Failed to generate verdict. Please try again.');
      }
    } finally {
      console.log('[Verdict] Request complete, resetting state');
      setLoading(false);
      isSubmittingRef.current = false;
      abortControllerRef.current = null;
    }
  };

  const handleContextChange = (field, value) => {
    setContext(prev => ({ ...prev, [field]: value }));
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const BlurredText = ({ children }) => (
    <span className="blur-sm select-none">{children}</span>
  );

  const getConfidenceStyle = (level) => {
    const lowerLevel = level?.toLowerCase();
    switch (lowerLevel) {
      case 'high': return 'text-emerald-400';
      case 'medium': return 'text-amber-400';
      case 'low': return 'text-slate-400';
      default: return 'text-slate-400';
    }
  };

  const getRiskStyle = (level) => {
    const lowerLevel = level?.toLowerCase();
    switch (lowerLevel) {
      case 'low': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getEffortStyle = (level) => {
    const lowerLevel = level?.toLowerCase();
    switch (lowerLevel) {
      case 'low': return 'text-emerald-400';
      case 'medium': return 'text-amber-400';
      case 'high': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Collapsible Section Component
  const CollapsibleSection = ({ id, title, children, defaultOpen = false, badge = null }) => {
    const isOpen = expandedSections[id] ?? defaultOpen;
    return (
      <div>
        <button
          onClick={() => toggleSection(id)}
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

  // Show input form when no decision exists
  if (!decision) {
    return (
      <div className="max-w-2xl mx-auto pt-8">
        <div className="text-center mb-12">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            Premium Decision Intelligence
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight leading-tight">
            Get your strategic verdict
          </h1>
          <p className="text-lg text-slate-400">
            Executive-grade analysis that justifies a paid subscription.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourcompany.com"
              className="w-full px-4 py-4 bg-slate-900/50 border border-slate-800/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50"
              disabled={loading}
            />
          </div>

          {/* Context Section (Collapsible) */}
          <div className="border border-slate-800/30 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowContext(!showContext)}
              className="w-full flex items-center justify-between p-4 bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
            >
              <span className="text-sm text-slate-400">
                Add context for better recommendations
              </span>
              <svg
                className={`w-4 h-4 text-slate-500 transition-transform ${showContext ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showContext && (
              <div className="p-4 bg-slate-900/20 border-t border-slate-800/30 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">Company Stage</label>
                  <select
                    value={context.companyStage}
                    onChange={(e) => handleContextChange('companyStage', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
                  >
                    {COMPANY_STAGES.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">Business Model</label>
                  <select
                    value={context.businessModel}
                    onChange={(e) => handleContextChange('businessModel', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
                  >
                    {BUSINESS_MODELS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">Primary KPI</label>
                  <select
                    value={context.primaryKpi}
                    onChange={(e) => handleContextChange('primaryKpi', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
                  >
                    {PRIMARY_KPIS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">Target Market</label>
                  <select
                    value={context.market}
                    onChange={(e) => handleContextChange('market', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
                  >
                    {MARKETS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !websiteUrl.trim()}
            className="w-full py-4 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Generating premium verdict...</span>
              </>
            ) : (
              'Generate Decision Intelligence'
            )}
          </button>
        </form>

        <p className="text-xs text-slate-600 mt-8 text-center">
          Board-level strategic analysis for founders and executives.
        </p>
      </div>
    );
  }

  // Show verdict result - Premium Decision Intelligence UI
  return (
    <div className="max-w-3xl mx-auto pt-8 pb-16">
      {/* New Analysis Button */}
      <div className="mb-6">
        <button
          onClick={() => {
            setDecision(null);
            setWebsiteUrl('');
            setExpandedSections({});
            // Reset refs for new analysis
            hasReceivedResponseRef.current = false;
            lastRequestRef.current = { url: null, time: 0 };
            isSubmittingRef.current = false;
          }}
          className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Analyze another company
        </button>
      </div>

      {/* DECISION SNAPSHOT - 30-second overview (Always visible at top) */}
      {verdict.decisionSnapshot && (
        <div className="mb-8 p-6 bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/50 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-xs text-slate-400 uppercase tracking-wider font-medium">Decision Snapshot</h3>
              <span className="text-xs text-slate-600">(30-second overview)</span>
            </div>
            
            {/* Outcome Status Badge + Export */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${outcomeStatus.style}`}>
                  {outcomeStatus.label}
                </span>
                {outcomeStatus.date && (
                  <span className="text-xs text-slate-500">
                    • {new Date(outcomeStatus.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
              
              {/* Export Button */}
              {decision?.id && <ExportButton decisionId={decision.id} />}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Revenue Impact */}
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Expected Revenue</p>
              <p className="text-lg font-bold text-emerald-400">
                {isPaidUser ? verdict.decisionSnapshot.revenueImpactRange : <BlurredText>+15–25%</BlurredText>}
              </p>
            </div>
            
            {/* Primary Risk */}
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Primary Risk</p>
              <p className={`text-lg font-bold ${getRiskStyle(verdict.decisionSnapshot.primaryRiskLevel).split(' ')[0]}`}>
                {verdict.decisionSnapshot.primaryRiskLevel}
              </p>
              {verdict.decisionSnapshot.primaryRiskExplain && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {isPaidUser ? verdict.decisionSnapshot.primaryRiskExplain : <BlurredText>Risk explanation</BlurredText>}
                </p>
              )}
            </div>
            
            {/* Time to Impact */}
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Time to Impact</p>
              <p className="text-lg font-bold text-white">
                {verdict.decisionSnapshot.timeToImpact}
              </p>
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
            
            {/* Confidence */}
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Confidence</p>
              <p className={`text-lg font-bold ${getConfidenceStyle(verdict.confidenceLabel)}`}>
                {verdict.confidenceLabel}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FOUNDER GUT-CHECK - Strategic reflection */}
      <CollapsibleSection id="gutcheck" title="Founder gut-check" defaultOpen={false}>
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Does this decision match how you want the company to be perceived 12 months from now?
          </p>
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="flex items-start gap-2">
              <span className="text-slate-600 mt-0.5">•</span>
              <span><span className="text-slate-300">Brand signal:</span> what does this choice communicate to your market?</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-600 mt-0.5">•</span>
              <span><span className="text-slate-300">Team reality:</span> can your team sustain the execution cost?</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-600 mt-0.5">•</span>
              <span><span className="text-slate-300">Compounding:</span> does this get easier or harder if delayed?</span>
            </li>
          </ul>
          <div className="pt-2 border-t border-slate-800/30">
            <p className="text-xs text-slate-500">
              Recommended answer:{' '}
              <span className={
                (verdict.confidenceLabel?.toLowerCase() === 'high' && 
                 verdict.decisionSnapshot?.reversibility?.toLowerCase() === 'high')
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }>
                {(verdict.confidenceLabel?.toLowerCase() === 'high' && 
                  verdict.decisionSnapshot?.reversibility?.toLowerCase() === 'high')
                  ? 'Yes'
                  : 'Depends'}
              </span>
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Executive Verdict - Main Headline */}
      <div className="mb-8">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
          {verdict.executiveVerdict?.decisionType || 'Strategic Verdict'}
        </p>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-5 tracking-tight leading-tight">
          {isPaidUser ? (verdict.executiveVerdict?.recommendation || verdict.headline) : (
            <BlurredText>{verdict.executiveVerdict?.recommendation || verdict.headline}</BlurredText>
          )}
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

      {/* PERSONALIZATION SIGNALS - Company-specific insights */}
      {verdict.personalizationSignals && (
        <div className="mb-8 p-5 bg-violet-500/5 border border-violet-500/20 rounded-xl">
          <h3 className="text-xs text-violet-400 uppercase tracking-wider font-medium mb-4">
            Why This Is Specific to Your Company
          </h3>
          <div className="space-y-3">
            {verdict.personalizationSignals.pricingPageInsight && (
              <p className="text-sm text-slate-300 leading-relaxed">
                {isPaidUser ? verdict.personalizationSignals.pricingPageInsight : <BlurredText>{verdict.personalizationSignals.pricingPageInsight}</BlurredText>}
              </p>
            )}
            {verdict.personalizationSignals.companyStageInsight && (
              <p className="text-sm text-slate-300 leading-relaxed">
                {isPaidUser ? verdict.personalizationSignals.companyStageInsight : <BlurredText>{verdict.personalizationSignals.companyStageInsight}</BlurredText>}
              </p>
            )}
            {verdict.personalizationSignals.competitorInsight && (
              <p className="text-sm text-slate-300 leading-relaxed">
                {isPaidUser ? verdict.personalizationSignals.competitorInsight : <BlurredText>{verdict.personalizationSignals.competitorInsight}</BlurredText>}
              </p>
            )}
            {verdict.personalizationSignals.kpiInsight && (
              <p className="text-sm text-slate-300 leading-relaxed">
                {isPaidUser ? verdict.personalizationSignals.kpiInsight : <BlurredText>{verdict.personalizationSignals.kpiInsight}</BlurredText>}
              </p>
            )}
            {verdict.personalizationSignals.marketPositionInsight && (
              <p className="text-sm text-slate-300 leading-relaxed">
                {isPaidUser ? verdict.personalizationSignals.marketPositionInsight : <BlurredText>{verdict.personalizationSignals.marketPositionInsight}</BlurredText>}
              </p>
            )}
          </div>
          {!isPaidUser && (
            <p className="text-xs text-violet-400 mt-4">Upgrade to see company-specific insights</p>
          )}
        </div>
      )}

      {/* Primary Action */}
      <div className="mb-10">
        <button
          onClick={() => isPaidUser && setShowOutcomePanel(!showOutcomePanel)}
          className="w-full py-4 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          disabled={!isPaidUser}
        >
          {isPaidUser ? (
            <>
              {showOutcomePanel ? 'Close outcome tracking' : (verdict.cta || 'Proceed with this decision')}
              <svg 
                className={`w-4 h-4 transition-transform ${showOutcomePanel ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          ) : 'Upgrade to proceed'}
        </button>

        {!isPaidUser && (
          <p className="text-center text-xs text-slate-500 mt-3">
            Upgrade to unlock full analysis and act on recommendations
          </p>
        )}

        {/* Outcome Tracking Panel (Collapsible) */}
        {showOutcomePanel && isPaidUser && (
          <div className="mt-4 p-6 bg-slate-900/40 border border-slate-700/50 rounded-2xl animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-sm text-slate-300 font-medium uppercase tracking-wider">Track Your Outcome</h3>
              </div>
              {outcomeSaved && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}
            </div>
            
            <p className="text-xs text-slate-500 mb-5">
              Log your decision outcome to improve future recommendations.
            </p>

            <div className="space-y-4">
              {/* Decision Taken - Radio buttons */}
              <div>
                <label className="text-xs text-slate-500 block mb-2">Decision taken?</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOutcomeChange('decisionTaken', true)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      outcome.decisionTaken === true
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : 'bg-slate-900/50 border-slate-800/50 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => handleOutcomeChange('decisionTaken', false)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      outcome.decisionTaken === false
                        ? 'bg-red-500/20 border-red-500/40 text-red-400'
                        : 'bg-slate-900/50 border-slate-800/50 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Not yet
                  </button>
                  <button
                    onClick={() => handleOutcomeChange('decisionTaken', null)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      outcome.decisionTaken === null
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                        : 'bg-slate-900/50 border-slate-800/50 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Undecided
                  </button>
                </div>
              </div>

              {/* Planned/Implemented Date */}
              <div>
                <label className="text-xs text-slate-500 block mb-2">Planned/implemented date</label>
                <input
                  type="date"
                  value={outcome.dateImplemented || ''}
                  onChange={(e) => handleOutcomeChange('dateImplemented', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
                />
              </div>

              {/* Impact Fields - Side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-2">Actual revenue impact</label>
                  <input
                    type="text"
                    value={outcome.actualRevenueImpact}
                    onChange={(e) => handleOutcomeChange('actualRevenueImpact', e.target.value)}
                    placeholder="e.g. +18%, +$12k MRR"
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-2">Actual churn impact</label>
                  <input
                    type="text"
                    value={outcome.actualChurnImpact}
                    onChange={(e) => handleOutcomeChange('actualChurnImpact', e.target.value)}
                    placeholder="e.g. -0.5%, +1.2%"
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-slate-500 block mb-2">Notes</label>
                <textarea
                  value={outcome.notes}
                  onChange={(e) => handleOutcomeChange('notes', e.target.value)}
                  placeholder="Any observations, learnings, or context..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveOutcome}
                  className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Save outcome
                </button>
                <button
                  onClick={handleClearOutcome}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors text-sm"
                >
                  Clear
                </button>
              </div>

              <p className="text-xs text-slate-600 text-center">
                Outcomes are saved locally and help you track predicted vs actual results.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Sections */}
      <div className="space-y-3">

        {/* 1. If You Proceed */}
        {verdict.ifYouProceed && (
          <CollapsibleSection id="proceed" title="If you proceed with this decision" defaultOpen={true}>
            <div className="space-y-4">
              {verdict.ifYouProceed.expectedUpside && verdict.ifYouProceed.expectedUpside.length > 0 && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-2">Expected upside</h4>
                  <ul className="space-y-2">
                    {verdict.ifYouProceed.expectedUpside.map((item, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">+</span>
                        {isPaidUser ? item : <BlurredText>{item}</BlurredText>}
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
                        {isPaidUser ? item : <BlurredText>{item}</BlurredText>}
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
          <CollapsibleSection id="inaction" title="If you do NOT take action">
            <div className="space-y-3">
              {verdict.ifYouDoNotAct.whatStagnates && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-1">What stagnates</h4>
                  <p className="text-sm text-slate-300">{isPaidUser ? verdict.ifYouDoNotAct.whatStagnates : <BlurredText>{verdict.ifYouDoNotAct.whatStagnates}</BlurredText>}</p>
                </div>
              )}
              {verdict.ifYouDoNotAct.competitorAdvantage && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-1">What competitors gain</h4>
                  <p className="text-sm text-slate-300">{isPaidUser ? verdict.ifYouDoNotAct.competitorAdvantage : <BlurredText>{verdict.ifYouDoNotAct.competitorAdvantage}</BlurredText>}</p>
                </div>
              )}
              {verdict.ifYouDoNotAct.futureDifficulty && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-1">What becomes harder later</h4>
                  <p className="text-sm text-slate-300">{isPaidUser ? verdict.ifYouDoNotAct.futureDifficulty : <BlurredText>{verdict.ifYouDoNotAct.futureDifficulty}</BlurredText>}</p>
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
                  <p className="text-sm text-slate-500">{isPaidUser ? alt.whyNotSelected : <BlurredText>{alt.whyNotSelected}</BlurredText>}</p>
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
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-1">Who is most affected</h4>
                  <p className="text-sm text-slate-300">{isPaidUser ? verdict.riskAnalysis.whoIsAffected : <BlurredText>{verdict.riskAnalysis.whoIsAffected}</BlurredText>}</p>
                </div>
              )}
              {verdict.riskAnalysis.howItManifests && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-1">How risk manifests</h4>
                  <p className="text-sm text-slate-300">{isPaidUser ? verdict.riskAnalysis.howItManifests : <BlurredText>{verdict.riskAnalysis.howItManifests}</BlurredText>}</p>
                </div>
              )}
              {verdict.riskAnalysis.whyAcceptable && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-1">Why acceptable</h4>
                  <p className="text-sm text-slate-300">{isPaidUser ? verdict.riskAnalysis.whyAcceptable : <BlurredText>{verdict.riskAnalysis.whyAcceptable}</BlurredText>}</p>
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
                <span className="text-sm text-slate-500">Revenue impact</span>
                <span className="text-sm text-slate-300 font-medium">{isPaidUser ? verdict.supportingDetails.expectedRevenueImpact : <BlurredText>+12–18%</BlurredText>}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800/30">
                <span className="text-sm text-slate-500">Short-term churn</span>
                <span className="text-sm text-slate-300">{isPaidUser ? verdict.supportingDetails.churnOutlook : <BlurredText>Minimal</BlurredText>}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-500">Long-term positioning</span>
                <span className="text-sm text-slate-300">{isPaidUser ? verdict.supportingDetails.marketPositioning : <BlurredText>Premium</BlurredText>}</span>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* 6. Why This Fits */}
        {verdict.whyThisFits && (
          <CollapsibleSection id="fit" title="Why this decision fits your company">
            <div className="space-y-3">
              {verdict.whyThisFits.companyStageReason && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-1">Company stage</h4>
                  <p className="text-sm text-slate-300">{isPaidUser ? verdict.whyThisFits.companyStageReason : <BlurredText>{verdict.whyThisFits.companyStageReason}</BlurredText>}</p>
                </div>
              )}
              {verdict.whyThisFits.businessModelReason && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-1">Business model</h4>
                  <p className="text-sm text-slate-300">{isPaidUser ? verdict.whyThisFits.businessModelReason : <BlurredText>{verdict.whyThisFits.businessModelReason}</BlurredText>}</p>
                </div>
              )}
              {verdict.whyThisFits.marketSegmentReason && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-1">Market segment</h4>
                  <p className="text-sm text-slate-300">{isPaidUser ? verdict.whyThisFits.marketSegmentReason : <BlurredText>{verdict.whyThisFits.marketSegmentReason}</BlurredText>}</p>
                </div>
              )}
              {verdict.whyThisFits.primaryKpiReason && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-1">Primary KPI alignment</h4>
                  <p className="text-sm text-slate-300">{isPaidUser ? verdict.whyThisFits.primaryKpiReason : <BlurredText>{verdict.whyThisFits.primaryKpiReason}</BlurredText>}</p>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* 7. Execution Checklist - OPERATIONAL */}
        {verdict.executionChecklist && (
          <div ref={executionChecklistRef}>
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
              {/* Next 14 Days */}
              {verdict.executionChecklist.next14Days && verdict.executionChecklist.next14Days.length > 0 && (
                <div>
                  <h4 className="text-xs text-emerald-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                    Next 14 Days
                  </h4>
                  <ul className="space-y-2 pl-4">
                    {verdict.executionChecklist.next14Days.map((item, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">1.{i+1}</span>
                        {isPaidUser ? item : <BlurredText>{item}</BlurredText>}
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
                    Next 30–60 Days
                  </h4>
                  <ul className="space-y-2 pl-4">
                    {verdict.executionChecklist.next30To60Days.map((item, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">2.{i+1}</span>
                        {isPaidUser ? item : <BlurredText>{item}</BlurredText>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Success Metrics */}
              {verdict.executionChecklist.successMetrics && verdict.executionChecklist.successMetrics.length > 0 && (
                <div>
                  <h4 className="text-xs text-violet-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-violet-400 rounded-full"></span>
                    Success Metrics to Monitor
                  </h4>
                  <ul className="space-y-2 pl-4">
                    {verdict.executionChecklist.successMetrics.map((item, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <svg className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        {isPaidUser ? item : <BlurredText>{item}</BlurredText>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CollapsibleSection>
          </div>
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
          <CollapsibleSection id="expectations" title="What to expect">
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

      {/* MIC DROP - Closing statement */}
      <div className="mt-10 p-4 bg-slate-900/30 border border-slate-800/40 rounded-xl text-center">
        <p className="text-sm text-slate-400 italic">
          This decision compounds; delaying it increases the cost of change.
        </p>
      </div>

      {/* Sticky Mini-Panel - Execution Readiness (Desktop: right side, Mobile: bottom) */}
      {hasExecutionChecklist && isPaidUser && (
        <div className="fixed bottom-6 right-6 z-40 hidden lg:block">
          <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 shadow-2xl min-w-[200px]">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Execution</span>
            </div>
            
            <div className="space-y-2 mb-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Next 14 days</span>
                <span className="text-xs text-emerald-400 font-medium">{next14DaysCount} items</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Next 30-60 days</span>
                <span className="text-xs text-amber-400 font-medium">{next30To60DaysCount} items</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-800/50">
                <span className="text-xs text-slate-500">Readiness</span>
                <span className={`text-sm font-bold ${
                  readinessScore >= 80 ? 'text-emerald-400' :
                  readinessScore >= 60 ? 'text-amber-400' :
                  readinessScore >= 30 ? 'text-slate-400' :
                  'text-slate-600'
                }`}>
                  {readinessScore}%
                </span>
              </div>
            </div>
            
            <button
              onClick={scrollToChecklist}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
            >
              Open checklist
            </button>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bar - Execution Readiness */}
      {hasExecutionChecklist && isPaidUser && (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
          <div className="bg-slate-900/95 backdrop-blur-sm border-t border-slate-700/50 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                <span className="text-xs text-slate-400">{next14DaysCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                <span className="text-xs text-slate-400">{next30To60DaysCount}</span>
              </div>
              <span className={`text-sm font-bold ${
                readinessScore >= 80 ? 'text-emerald-400' :
                readinessScore >= 60 ? 'text-amber-400' :
                'text-slate-400'
              }`}>
                {readinessScore}%
              </span>
            </div>
            <button
              onClick={scrollToChecklist}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
            >
              View checklist
            </button>
          </div>
        </div>
      )}

      {/* Timestamp and View in Archive */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <p className="text-xs text-slate-600">
          Analysis completed {formatDate(decision.createdAt)}
        </p>
        <button
          onClick={() => navigate(`/archive/${decision.id}`)}
          className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
        >
          View full details in Archive
        </button>
      </div>
    </div>
  );
};

export default Verdict;
