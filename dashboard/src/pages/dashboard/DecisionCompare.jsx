import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { decisionsApi } from '../../lib/apiClient';

// Context display labels
const CONTEXT_LABELS = {
  companyStage: {
    pre_seed: 'Pre-Seed',
    seed: 'Seed',
    series_a: 'Series A',
    series_b_plus: 'Series B+',
    public: 'Public',
    unknown: 'Unknown',
  },
  businessModel: {
    saas: 'SaaS',
    marketplace: 'Marketplace',
    usage_based: 'Usage-Based',
    hybrid: 'Hybrid',
    other: 'Other',
  },
  primaryKpi: {
    mrr_growth: 'MRR Growth',
    retention: 'Retention',
    arpu: 'ARPU',
    market_share: 'Market Share',
    profitability: 'Profitability',
  },
  market: {
    b2b: 'B2B',
    b2c: 'B2C',
    b2b2c: 'B2B2C',
    enterprise: 'Enterprise',
    smb: 'SMB',
  },
};

// Outcome type labels
const OUTCOME_TYPE_LABELS = {
  revenue: 'Revenue',
  churn: 'Churn',
  conversion: 'Conversion',
  arpu: 'ARPU',
  customer_satisfaction: 'Customer Satisfaction',
  other: 'Other',
};

// Status badge
const StatusBadge = ({ status }) => {
  const styles = {
    proposed: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    in_review: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    approved: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    implemented: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rolled_back: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  const labels = {
    proposed: 'Proposed',
    in_review: 'In Review',
    approved: 'Approved',
    rejected: 'Rejected',
    implemented: 'Implemented',
    rolled_back: 'Rolled Back',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded border ${styles[status] || styles.proposed}`}>
      {labels[status] || status}
    </span>
  );
};

// Risk badge
const RiskBadge = ({ level }) => {
  const styles = {
    high: 'bg-red-500/10 text-red-400 border-red-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${styles[level] || styles.low}`}>
      {level?.charAt(0).toUpperCase() + level?.slice(1)} Risk
    </span>
  );
};

// Confidence style
const getConfidenceStyle = (level) => {
  const styles = {
    high: 'text-emerald-400',
    medium: 'text-amber-400',
    low: 'text-slate-400',
  };
  return styles[level] || styles.low;
};

// Context display component
const ContextDisplay = ({ context }) => {
  if (!context) return <p className="text-slate-500 text-sm">No context provided</p>;

  const items = [];
  if (context.companyStage && context.companyStage !== 'unknown') {
    items.push({ label: 'Stage', value: CONTEXT_LABELS.companyStage[context.companyStage] || context.companyStage });
  }
  if (context.businessModel) {
    items.push({ label: 'Model', value: CONTEXT_LABELS.businessModel[context.businessModel] || context.businessModel });
  }
  if (context.primaryKpi) {
    items.push({ label: 'KPI', value: CONTEXT_LABELS.primaryKpi[context.primaryKpi] || context.primaryKpi });
  }
  if (context.market) {
    items.push({ label: 'Market', value: CONTEXT_LABELS.market[context.market] || context.market });
  }

  if (items.length === 0) return <p className="text-slate-500 text-sm">No context provided</p>;

  return (
    <div className="space-y-1">
      {items.map((item, index) => (
        <div key={index} className="flex justify-between text-sm">
          <span className="text-slate-500">{item.label}:</span>
          <span className="text-slate-300">{item.value}</span>
        </div>
      ))}
    </div>
  );
};

// Latest outcome display
const LatestOutcomeDisplay = ({ outcome }) => {
  if (!outcome) return <p className="text-slate-500 text-sm">No outcomes recorded</p>;

  const delta = outcome.deltaPercent;
  const isChurn = outcome.outcomeType === 'churn';
  const isPositive = delta !== null && delta !== undefined && delta > 0;
  const isNegative = delta !== null && delta !== undefined && delta < 0;
  const isGood = isChurn ? isNegative : isPositive;
  const isBad = isChurn ? isPositive : isNegative;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 text-xs font-medium text-slate-400 bg-slate-800/50 rounded">
          {OUTCOME_TYPE_LABELS[outcome.outcomeType] || outcome.outcomeType}
        </span>
        <span className="text-xs text-slate-500">{outcome.timeframeDays}-day</span>
      </div>
      {outcome.metricName && (
        <p className="text-sm text-slate-300">{outcome.metricName}</p>
      )}
      <div className="flex items-center gap-4">
        {outcome.metricBefore !== null && outcome.metricBefore !== undefined && (
          <div>
            <p className="text-xs text-slate-500">Before</p>
            <p className="text-sm text-slate-400">{outcome.metricBefore.toLocaleString()}</p>
          </div>
        )}
        {outcome.metricAfter !== null && outcome.metricAfter !== undefined && (
          <div>
            <p className="text-xs text-slate-500">After</p>
            <p className="text-sm text-slate-300">{outcome.metricAfter.toLocaleString()}</p>
          </div>
        )}
        {delta !== null && delta !== undefined && (
          <div>
            <p className="text-xs text-slate-500">Change</p>
            <p className={`text-sm font-medium ${isGood ? 'text-emerald-400' : isBad ? 'text-red-400' : 'text-slate-400'}`}>
              {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Single decision column
const DecisionColumn = ({ decision, label, isWide }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const navigate = useNavigate();

  return (
    <div className={`flex-1 min-w-0 ${isWide ? '' : 'max-w-sm'}`}>
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-4">{label}</div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <StatusBadge status={decision.status} />
          <RiskBadge level={decision.riskLevel} />
        </div>

        <p className="text-sm text-slate-500 mb-2">
          {decision.companyName}
        </p>

        <h2 className="text-lg font-bold text-white mb-3 leading-tight">
          {decision.verdictHeadline}
        </h2>

        <p className="text-sm text-slate-300 mb-3 line-clamp-3">
          {decision.verdictSummary}
        </p>

        <div className="flex items-center gap-4 text-sm">
          <span className={`font-medium ${getConfidenceStyle(decision.confidenceLevel)}`}>
            {decision.confidenceLevel?.charAt(0).toUpperCase() + decision.confidenceLevel?.slice(1)} Confidence
          </span>
          <span className="text-slate-500">
            {formatDate(decision.createdAt)}
          </span>
        </div>
      </div>

      {/* Context */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-slate-400 mb-2">Context</h4>
        <div className="p-3 bg-slate-900/30 border border-slate-800/30 rounded-lg">
          <ContextDisplay context={decision.context} />
        </div>
      </div>

      {/* Expected Impact */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-slate-400 mb-2">Expected Impact</h4>
        <div className="p-3 bg-slate-900/30 border border-slate-800/30 rounded-lg">
          {decision.expectedImpact?.revenueRange ? (
            <>
              <p className="text-emerald-400 text-sm">{decision.expectedImpact.revenueRange}</p>
              {decision.expectedImpact.churnNote && (
                <p className="text-slate-400 text-xs mt-1">{decision.expectedImpact.churnNote}</p>
              )}
            </>
          ) : (
            <p className="text-slate-500 text-sm">Not specified</p>
          )}
        </div>
      </div>

      {/* Latest Outcome */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-slate-400 mb-2">Latest Outcome</h4>
        <div className="p-3 bg-slate-900/30 border border-slate-800/30 rounded-lg">
          <LatestOutcomeDisplay outcome={decision.latestOutcome} />
        </div>
      </div>

      {/* Why This Decision */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-slate-400 mb-2">Why This Decision</h4>
        <div className="p-3 bg-slate-900/30 border border-slate-800/30 rounded-lg">
          {decision.verdictJson?.whyThisDecision?.length > 0 ? (
            <ul className="space-y-2">
              {decision.verdictJson.whyThisDecision.slice(0, 3).map((reason, index) => (
                <li key={index} className="text-sm text-slate-400 flex items-start gap-2">
                  <span className="text-slate-600 mt-0.5">•</span>
                  <span className="line-clamp-2">{reason}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 text-sm">Not specified</p>
          )}
        </div>
      </div>

      {/* What to Expect */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-slate-400 mb-2">What to Expect</h4>
        <div className="p-3 bg-slate-900/30 border border-slate-800/30 rounded-lg">
          {decision.verdictJson?.whatToExpect ? (
            <>
              <RiskBadge level={decision.verdictJson.whatToExpect.riskLevel} />
              <p className="text-slate-400 text-sm mt-2 line-clamp-3">
                {decision.verdictJson.whatToExpect.description}
              </p>
            </>
          ) : (
            <p className="text-slate-500 text-sm">Not specified</p>
          )}
        </div>
      </div>

      {/* View Details Button */}
      <button
        onClick={() => navigate(`/dashboard/decisions/${decision.id}`)}
        className="w-full px-4 py-2 text-sm text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 rounded-lg transition-colors"
      >
        View Full Details
      </button>
    </div>
  );
};

// Main component
const DecisionCompare = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const idsParam = searchParams.get('ids');
      if (!idsParam) {
        setError('No decision IDs provided. Use ?ids=id1,id2 or ?ids=id1,id2,id3');
        setLoading(false);
        return;
      }

      const ids = idsParam.split(',').map(id => id.trim()).filter(id => id);
      if (ids.length < 2 || ids.length > 3) {
        setError('Please provide 2-3 decision IDs for comparison');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await decisionsApi.compare(ids);
        setDecisions(response.data.decisions || []);
      } catch (err) {
        console.error('Failed to compare decisions:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin w-8 h-8 text-violet-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate('/dashboard/history')}
          className="text-sm text-slate-400 hover:text-white mb-6 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Archive
        </button>
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      </div>
    );
  }

  if (decisions.length < 2) {
    return (
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate('/dashboard/history')}
          className="text-sm text-slate-400 hover:text-white mb-6 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Archive
        </button>
        <p className="text-slate-400">Not enough decisions found for comparison</p>
      </div>
    );
  }

  const isThreeWay = decisions.length === 3;

  return (
    <div className={`mx-auto ${isThreeWay ? 'max-w-7xl' : 'max-w-5xl'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => navigate('/dashboard/history')}
            className="text-sm text-slate-400 hover:text-white mb-2 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Archive
          </button>
          <h1 className="text-2xl font-bold text-white">Compare Decisions</h1>
          <p className="text-slate-400 text-sm mt-1">
            Comparing {decisions.length} decisions side-by-side
          </p>
        </div>
      </div>

      {/* Side by side comparison */}
      <div className="flex gap-6">
        {decisions.map((decision, index) => (
          <div key={decision.id} className="flex-1 flex">
            <DecisionColumn
              decision={decision}
              label={`Decision ${index + 1}`}
              isWide={!isThreeWay}
            />
            {index < decisions.length - 1 && (
              <div className="w-px bg-slate-800/50 flex-shrink-0 mx-6" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DecisionCompare;
