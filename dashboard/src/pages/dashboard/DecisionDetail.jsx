import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

// Collapsible section component
const CollapsibleSection = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-800/30 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-slate-900/20 hover:bg-slate-900/30 transition-colors"
      >
        <span className="text-sm text-slate-400">{title}</span>
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
        <div className="p-5 bg-slate-900/10 border-t border-slate-800/30">
          {children}
        </div>
      )}
    </div>
  );
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
    <span className={`px-3 py-1 text-sm font-medium rounded border ${styles[status] || styles.proposed}`}>
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

// Status Action Modal
const StatusActionModal = ({ isOpen, onClose, onSubmit, actionType }) => {
  const [reason, setReason] = useState('');
  const [implementedAt, setImplementedAt] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  const config = {
    approve: {
      title: 'Approve Decision',
      description: 'Move this decision to approved status.',
      requiresReason: false,
      requiresDate: false,
      submitLabel: 'Approve',
      submitStyle: 'bg-blue-600 hover:bg-blue-700',
    },
    in_review: {
      title: 'Start Review',
      description: 'Move this decision to in-review status.',
      requiresReason: false,
      requiresDate: false,
      submitLabel: 'Start Review',
      submitStyle: 'bg-purple-600 hover:bg-purple-700',
    },
    implement: {
      title: 'Mark as Implemented',
      description: 'Record when this decision was implemented.',
      requiresReason: false,
      requiresDate: true,
      submitLabel: 'Mark Implemented',
      submitStyle: 'bg-emerald-600 hover:bg-emerald-700',
    },
    reject: {
      title: 'Reject Decision',
      description: 'Provide a reason for rejecting this decision.',
      requiresReason: true,
      requiresDate: false,
      submitLabel: 'Reject',
      submitStyle: 'bg-red-600 hover:bg-red-700',
    },
    rollback: {
      title: 'Roll Back Decision',
      description: 'Provide a reason for rolling back this decision.',
      requiresReason: true,
      requiresDate: false,
      submitLabel: 'Roll Back',
      submitStyle: 'bg-amber-600 hover:bg-amber-700',
    },
  };

  const actionConfig = config[actionType] || config.approve;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (actionConfig.requiresReason && !reason.trim()) {
      return;
    }
    setSubmitting(true);

    try {
      const data = {};
      if (actionConfig.requiresReason) {
        data.reason = reason.trim();
      }
      if (actionConfig.requiresDate) {
        data.implementedAt = new Date(implementedAt).toISOString();
      }
      await onSubmit(data);
      setReason('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-white mb-2">{actionConfig.title}</h3>
        <p className="text-sm text-slate-400 mb-4">{actionConfig.description}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {actionConfig.requiresDate && (
            <div>
              <label className="text-sm text-slate-400 block mb-1">Implementation Date</label>
              <input
                type="date"
                value={implementedAt}
                onChange={(e) => setImplementedAt(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>
          )}

          {actionConfig.requiresReason && (
            <div>
              <label className="text-sm text-slate-400 block mb-1">Reason *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain the reason..."
                rows={3}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 resize-none"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (actionConfig.requiresReason && !reason.trim())}
              className={`flex-1 px-4 py-2 text-sm text-white ${actionConfig.submitStyle} rounded-lg transition-colors disabled:opacity-50`}
            >
              {submitting ? 'Processing...' : actionConfig.submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add Outcome Modal
const AddOutcomeModal = ({ isOpen, onClose, onSubmit }) => {
  const [outcomeType, setOutcomeType] = useState('revenue');
  const [timeframeDays, setTimeframeDays] = useState(30);
  const [metricName, setMetricName] = useState('');
  const [metricBefore, setMetricBefore] = useState('');
  const [metricAfter, setMetricAfter] = useState('');
  const [notes, setNotes] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit({
        outcomeType,
        timeframeDays: parseInt(timeframeDays),
        metricName: metricName.trim(),
        metricBefore: metricBefore ? parseFloat(metricBefore) : null,
        metricAfter: metricAfter ? parseFloat(metricAfter) : null,
        notes: notes.trim(),
        evidenceUrl: evidenceUrl.trim() || null,
      });
      // Reset form
      setOutcomeType('revenue');
      setTimeframeDays(30);
      setMetricName('');
      setMetricBefore('');
      setMetricAfter('');
      setNotes('');
      setEvidenceUrl('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-medium text-white mb-4">Add Outcome</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Outcome Type</label>
            <select
              value={outcomeType}
              onChange={(e) => setOutcomeType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              <option value="revenue">Revenue</option>
              <option value="churn">Churn</option>
              <option value="conversion">Conversion</option>
              <option value="arpu">ARPU</option>
              <option value="customer_satisfaction">Customer Satisfaction</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-1">Timeframe</label>
            <select
              value={timeframeDays}
              onChange={(e) => setTimeframeDays(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-1">Metric Name</label>
            <input
              type="text"
              value={metricName}
              onChange={(e) => setMetricName(e.target.value)}
              placeholder="e.g., Monthly Revenue, Churn Rate"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-400 block mb-1">Before</label>
              <input
                type="number"
                step="any"
                value={metricBefore}
                onChange={(e) => setMetricBefore(e.target.value)}
                placeholder="e.g., 10000"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">After</label>
              <input
                type="number"
                step="any"
                value={metricAfter}
                onChange={(e) => setMetricAfter(e.target.value)}
                placeholder="e.g., 12000"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add observations, context, or analysis..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 resize-none"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-1">Evidence URL (optional)</label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 text-sm text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Outcome'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Context Box Component
const ContextBox = ({ context }) => {
  if (!context) return null;

  const hasContext = context.companyStage && context.companyStage !== 'unknown';
  if (!hasContext && !context.businessModel && !context.primaryKpi && !context.market) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-slate-800/30 border border-slate-700/30 rounded-xl">
      <h3 className="text-sm font-medium text-slate-400 mb-3">Decision Context</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {context.companyStage && context.companyStage !== 'unknown' && (
          <div>
            <p className="text-xs text-slate-500">Stage</p>
            <p className="text-sm text-slate-300">{CONTEXT_LABELS.companyStage[context.companyStage] || context.companyStage}</p>
          </div>
        )}
        {context.businessModel && (
          <div>
            <p className="text-xs text-slate-500">Model</p>
            <p className="text-sm text-slate-300">{CONTEXT_LABELS.businessModel[context.businessModel] || context.businessModel}</p>
          </div>
        )}
        {context.primaryKpi && (
          <div>
            <p className="text-xs text-slate-500">Primary KPI</p>
            <p className="text-sm text-slate-300">{CONTEXT_LABELS.primaryKpi[context.primaryKpi] || context.primaryKpi}</p>
          </div>
        )}
        {context.market && (
          <div>
            <p className="text-xs text-slate-500">Market</p>
            <p className="text-sm text-slate-300">{CONTEXT_LABELS.market[context.market] || context.market}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Audit Trail Component
const AuditTrail = ({ statusEvents }) => {
  if (!statusEvents || statusEvents.length === 0) return null;

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <CollapsibleSection title={`Status History (${statusEvents.length})`}>
      <div className="space-y-3">
        {statusEvents.slice().reverse().map((event, index) => (
          <div key={event.id || index} className="flex items-start gap-3">
            <div className="w-2 h-2 mt-2 rounded-full bg-slate-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={event.status} />
                <span className="text-xs text-slate-500">{formatDateTime(event.createdAt)}</span>
              </div>
              {event.reason && (
                <p className="text-sm text-slate-400 mt-1">{event.reason}</p>
              )}
              {event.implementedAt && (
                <p className="text-xs text-slate-500 mt-1">
                  Implemented on {formatDateTime(event.implementedAt)}
                </p>
              )}
              {event.rollbackAt && (
                <p className="text-xs text-slate-500 mt-1">
                  Rolled back on {formatDateTime(event.rollbackAt)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
};

// Outcome Card Component
const OutcomeCard = ({ outcome }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const delta = outcome.deltaPercent;
  const isPositive = delta !== null && delta !== undefined && delta > 0;
  const isNegative = delta !== null && delta !== undefined && delta < 0;

  // For churn, negative is good
  const isChurn = outcome.outcomeType === 'churn';
  const isGood = isChurn ? isNegative : isPositive;
  const isBad = isChurn ? isPositive : isNegative;

  return (
    <div className="p-4 bg-slate-900/30 border border-slate-800/30 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs font-medium text-slate-400 bg-slate-800/50 rounded">
            {OUTCOME_TYPE_LABELS[outcome.outcomeType] || outcome.outcomeType}
          </span>
          <span className="text-sm text-slate-400">{outcome.timeframeDays}-day</span>
        </div>
        <span className="text-xs text-slate-500">{formatDate(outcome.createdAt)}</span>
      </div>

      {outcome.metricName && (
        <p className="text-sm font-medium text-slate-300 mb-2">{outcome.metricName}</p>
      )}

      <div className="flex items-center gap-4 mb-3">
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

      {outcome.notes && (
        <p className="text-sm text-slate-400 border-t border-slate-800/30 pt-3">{outcome.notes}</p>
      )}

      {outcome.evidenceUrl && (
        <a
          href={outcome.evidenceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-violet-400 hover:text-violet-300 mt-2 inline-block"
        >
          View Evidence →
        </a>
      )}
    </div>
  );
};

// Main component
const DecisionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [statusAction, setStatusAction] = useState(null); // null | 'approve' | 'in_review' | 'implement' | 'reject' | 'rollback'

  // Fetch decision (now includes outcomes)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await decisionsApi.get(id);
        setDecision(res.data);
      } catch (err) {
        console.error('Failed to fetch decision:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Update status
  const handleStatusChange = async (newStatus, data = {}) => {
    try {
      const res = await decisionsApi.updateStatus(id, { status: newStatus, ...data });
      setDecision(res.data);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert(err.message || 'Failed to update status');
    }
  };

  // Handle status action submit
  const handleStatusActionSubmit = async (data) => {
    const statusMap = {
      approve: 'approved',
      in_review: 'in_review',
      implement: 'implemented',
      reject: 'rejected',
      rollback: 'rolled_back',
    };
    await handleStatusChange(statusMap[statusAction], data);
    setStatusAction(null);
  };

  // Add outcome
  const handleAddOutcome = async (outcomeData) => {
    try {
      const res = await decisionsApi.addOutcome(id, outcomeData);
      // Refresh decision to get updated outcomes
      const updatedDecision = await decisionsApi.get(id);
      setDecision(updatedDecision.data);
    } catch (err) {
      console.error('Failed to add outcome:', err);
      alert(err.message || 'Failed to add outcome');
    }
  };

  // Delete decision
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this decision?')) return;

    try {
      await decisionsApi.delete(id);
      navigate('/dashboard/history');
    } catch (err) {
      console.error('Failed to delete decision:', err);
      alert(err.message || 'Failed to delete decision');
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
      <div className="max-w-3xl mx-auto">
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

  if (!decision) {
    return (
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/dashboard/history')}
          className="text-sm text-slate-400 hover:text-white mb-6 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Archive
        </button>
        <p className="text-slate-400">Decision not found</p>
      </div>
    );
  }

  const outcomes = decision.outcomes || [];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard/history')}
        className="text-sm text-slate-400 hover:text-white mb-6 flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Archive
      </button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <StatusBadge status={decision.status} />
          <RiskBadge level={decision.riskLevel} />
          <span className={`text-sm font-medium ${getConfidenceStyle(decision.confidenceLevel)}`}>
            {decision.confidenceLevel?.charAt(0).toUpperCase() + decision.confidenceLevel?.slice(1)} Confidence
          </span>
        </div>

        <p className="text-sm text-slate-500 mb-2">
          {decision.companyName} • {decision.websiteUrl}
        </p>

        <h1 className="text-3xl font-bold text-white mb-4">
          {decision.verdictHeadline}
        </h1>

        <p className="text-lg text-slate-300">
          {decision.verdictSummary}
        </p>

        <p className="text-sm text-slate-500 mt-4">
          Created {formatDate(decision.createdAt)}
          {decision.implementedAt && (
            <span> • Implemented {formatDate(decision.implementedAt)}</span>
          )}
        </p>
      </div>

      {/* Context Box */}
      <ContextBox context={decision.context} />

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        {decision.status === 'proposed' && (
          <>
            <button
              onClick={() => setStatusAction('in_review')}
              className="px-4 py-2 text-sm text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg transition-colors"
            >
              Start Review
            </button>
            <button
              onClick={() => setStatusAction('approve')}
              className="px-4 py-2 text-sm text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => setStatusAction('reject')}
              className="px-4 py-2 text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors"
            >
              Reject
            </button>
          </>
        )}
        {decision.status === 'in_review' && (
          <>
            <button
              onClick={() => setStatusAction('approve')}
              className="px-4 py-2 text-sm text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => setStatusAction('reject')}
              className="px-4 py-2 text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors"
            >
              Reject
            </button>
          </>
        )}
        {decision.status === 'approved' && (
          <button
            onClick={() => setStatusAction('implement')}
            className="px-4 py-2 text-sm text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors"
          >
            Mark as Implemented
          </button>
        )}
        {decision.status === 'implemented' && (
          <button
            onClick={() => setStatusAction('rollback')}
            className="px-4 py-2 text-sm text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition-colors"
          >
            Roll Back
          </button>
        )}
        <button
          onClick={() => setShowOutcomeModal(true)}
          className="px-4 py-2 text-sm text-slate-400 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg transition-colors"
        >
          Add Outcome
        </button>
        <button
          onClick={handleDelete}
          className="px-4 py-2 text-sm text-slate-500 hover:text-red-400 transition-colors ml-auto"
        >
          Delete
        </button>
      </div>

      {/* Rejection/Rollback Reason */}
      {decision.rejectionReason && (
        <div className="mb-6 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
          <h3 className="text-sm font-medium text-red-400 mb-1">Rejection Reason</h3>
          <p className="text-slate-400">{decision.rejectionReason}</p>
        </div>
      )}
      {decision.rollbackReason && (
        <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
          <h3 className="text-sm font-medium text-amber-400 mb-1">Rollback Reason</h3>
          <p className="text-slate-400">{decision.rollbackReason}</p>
        </div>
      )}

      {/* Expected Impact */}
      {(decision.expectedImpact?.revenueRange || decision.expectedImpact?.churnNote) && (
        <div className="mb-6 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
          <h3 className="text-sm font-medium text-emerald-400 mb-2">Expected Impact</h3>
          {decision.expectedImpact.revenueRange && (
            <p className="text-slate-300">Revenue: {decision.expectedImpact.revenueRange}</p>
          )}
          {decision.expectedImpact.churnNote && (
            <p className="text-slate-400 text-sm mt-1">{decision.expectedImpact.churnNote}</p>
          )}
        </div>
      )}

      {/* Collapsible Sections */}
      <div className="space-y-3 mb-8">
        {/* Audit Trail */}
        <AuditTrail statusEvents={decision.statusEvents} />

        {/* Why This Decision */}
        {decision.verdictJson?.whyThisDecision?.length > 0 && (
          <CollapsibleSection title="Why this decision" defaultOpen>
            <ul className="space-y-2">
              {decision.verdictJson.whyThisDecision.map((reason, index) => (
                <li key={index} className="text-sm text-slate-400 flex items-start gap-2">
                  <span className="text-slate-600 mt-0.5">•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* What to Expect */}
        {decision.verdictJson?.whatToExpect && (
          <CollapsibleSection title="What to expect">
            <div className="space-y-2">
              <RiskBadge level={decision.verdictJson.whatToExpect.riskLevel} />
              <p className="text-sm text-slate-400 mt-2">
                {decision.verdictJson.whatToExpect.description}
              </p>
            </div>
          </CollapsibleSection>
        )}

        {/* Supporting Details */}
        {decision.verdictJson?.supportingDetails && (
          <CollapsibleSection title="Supporting details">
            <div className="space-y-3">
              {decision.verdictJson.supportingDetails.expectedRevenueImpact && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Expected Revenue Impact</span>
                  <span className="text-sm text-slate-300">{decision.verdictJson.supportingDetails.expectedRevenueImpact}</span>
                </div>
              )}
              {decision.verdictJson.supportingDetails.churnOutlook && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Churn Outlook</span>
                  <span className="text-sm text-slate-300">{decision.verdictJson.supportingDetails.churnOutlook}</span>
                </div>
              )}
              {decision.verdictJson.supportingDetails.marketPositioning && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Market Positioning</span>
                  <span className="text-sm text-slate-300">{decision.verdictJson.supportingDetails.marketPositioning}</span>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}
      </div>

      {/* Tags */}
      {decision.tags?.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-slate-400 mb-2">Tags</h3>
          <div className="flex gap-2 flex-wrap">
            {decision.tags.map((tag, index) => (
              <span key={index} className="px-3 py-1 text-sm text-slate-400 bg-slate-800/50 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Outcomes */}
      <div className="border-t border-slate-800/30 pt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-white">Outcomes</h2>
          <button
            onClick={() => setShowOutcomeModal(true)}
            className="text-sm text-violet-400 hover:text-violet-300"
          >
            + Add Outcome
          </button>
        </div>

        {outcomes.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-800/50 rounded-xl">
            <p className="text-slate-500 mb-2">No outcomes recorded yet</p>
            <button
              onClick={() => setShowOutcomeModal(true)}
              className="text-sm text-violet-400 hover:text-violet-300"
            >
              Add your first outcome
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {outcomes.map((outcome) => (
              <OutcomeCard key={outcome.id} outcome={outcome} />
            ))}
          </div>
        )}
      </div>

      {/* Model Metadata */}
      {decision.modelMeta?.modelName && (
        <div className="mt-8 pt-8 border-t border-slate-800/30">
          <p className="text-xs text-slate-600">
            Generated by {decision.modelMeta.modelName}
            {decision.modelMeta.promptVersion && ` (v${decision.modelMeta.promptVersion})`}
          </p>
        </div>
      )}

      {/* Status Action Modal */}
      <StatusActionModal
        isOpen={!!statusAction}
        onClose={() => setStatusAction(null)}
        onSubmit={handleStatusActionSubmit}
        actionType={statusAction}
      />

      {/* Add Outcome Modal */}
      <AddOutcomeModal
        isOpen={showOutcomeModal}
        onClose={() => setShowOutcomeModal(false)}
        onSubmit={handleAddOutcome}
      />
    </div>
  );
};

export default DecisionDetail;
