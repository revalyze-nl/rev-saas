import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decisionsV2Api } from '../../lib/apiClient';

// Status badge
const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    approved: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    deferred: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };
  return (
    <span className={`px-3 py-1.5 text-sm font-medium rounded-lg border ${styles[status] || styles.pending}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
};

// Source badge for context fields
const SourceBadge = ({ source, confidence }) => {
  const styles = {
    user: { bg: 'bg-violet-500/10', text: 'text-violet-400', label: 'User Input' },
    workspace: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Workspace Default' },
    inferred: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'AI Inferred' },
  };
  const s = styles[source] || styles.inferred;
  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-0.5 text-xs rounded ${s.bg} ${s.text}`}>{s.label}</span>
      {source === 'inferred' && confidence && (
        <span className="text-xs text-slate-500">{Math.round(confidence * 100)}% conf</span>
      )}
    </div>
  );
};

// Context field display
const ContextField = ({ label, field }) => {
  if (!field) return null;
  return (
    <div className="p-4 bg-slate-800/30 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-400">{label}</span>
        <SourceBadge source={field.source} confidence={field.confidenceScore} />
      </div>
      <p className="text-white font-medium">{field.value || '—'}</p>
      {field.inferredSignal && (
        <p className="text-xs text-slate-500 mt-1">Signal: {field.inferredSignal}</p>
      )}
    </div>
  );
};

// Outcome card
const OutcomeCard = ({ outcome, onCorrect }) => {
  const formatDate = (d) => new Date(d).toLocaleDateString();
  const isPositive = outcome.deltaPercent && outcome.deltaPercent > 0;

  return (
    <div className={`p-4 rounded-xl border ${
      outcome.isCorrection
        ? 'bg-amber-500/5 border-amber-500/20'
        : 'bg-slate-800/30 border-slate-700/50'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-sm font-medium text-white capitalize">{outcome.outcomeType}</span>
          <span className="text-xs text-slate-500 ml-2">{outcome.timeframeDays}d timeframe</span>
        </div>
        {outcome.isCorrection && (
          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-xs rounded">Correction</span>
        )}
      </div>

      {outcome.deltaPercent !== null && (
        <p className={`text-2xl font-bold mb-2 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}{outcome.deltaPercent?.toFixed(1)}%
        </p>
      )}

      {(outcome.metricBefore || outcome.metricAfter) && (
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
          <span>{outcome.metricBefore?.toLocaleString() || '—'}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          <span>{outcome.metricAfter?.toLocaleString() || '—'}</span>
        </div>
      )}

      {outcome.notes && <p className="text-sm text-slate-400 mb-2">{outcome.notes}</p>}

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{formatDate(outcome.createdAt)}</span>
        {!outcome.isCorrection && (
          <button
            onClick={() => onCorrect(outcome)}
            className="text-xs text-violet-400 hover:text-violet-300"
          >
            Add Correction
          </button>
        )}
      </div>
    </div>
  );
};

// Status timeline
const StatusTimeline = ({ events }) => {
  if (!events?.length) return null;

  const formatDate = (d) => new Date(d).toLocaleString();
  const statusColors = {
    pending: 'bg-slate-500',
    approved: 'bg-blue-500',
    rejected: 'bg-red-500',
    deferred: 'bg-amber-500',
    completed: 'bg-emerald-500',
  };

  return (
    <div className="space-y-3">
      {events.map((event, idx) => (
        <div key={idx} className="flex items-start gap-3">
          <div className={`w-3 h-3 rounded-full mt-1.5 ${statusColors[event.status] || 'bg-slate-500'}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white capitalize">{event.status}</span>
              <span className="text-xs text-slate-500">{formatDate(event.createdAt)}</span>
            </div>
            {event.reason && <p className="text-sm text-slate-400">{event.reason}</p>}
          </div>
        </div>
      ))}
    </div>
  );
};

const DecisionDetailV2 = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState(null);

  // Form state
  const [statusForm, setStatusForm] = useState({ status: '', reason: '' });
  const [outcomeForm, setOutcomeForm] = useState({
    outcomeType: 'revenue',
    timeframeDays: 30,
    metricBefore: '',
    metricAfter: '',
    notes: '',
  });
  const [contextForm, setContextForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchDecision = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await decisionsV2Api.get(id);
      setDecision(data);
      setContextForm({
        companyStage: data.context?.companyStage?.value || '',
        businessModel: data.context?.businessModel?.value || '',
        primaryKpi: data.context?.primaryKpi?.value || '',
        marketType: data.context?.market?.type?.value || '',
        marketSegment: data.context?.market?.segment?.value || '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDecision();
  }, [fetchDecision]);

  const handleStatusUpdate = async () => {
    if (!statusForm.status) return;
    setSaving(true);
    try {
      await decisionsV2Api.updateStatus(id, statusForm);
      await fetchDecision();
      setShowStatusModal(false);
      setStatusForm({ status: '', reason: '' });
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddOutcome = async () => {
    setSaving(true);
    try {
      const payload = {
        ...outcomeForm,
        metricBefore: outcomeForm.metricBefore ? parseFloat(outcomeForm.metricBefore) : undefined,
        metricAfter: outcomeForm.metricAfter ? parseFloat(outcomeForm.metricAfter) : undefined,
        isCorrection: !!correctionTarget,
        correctsOutcomeId: correctionTarget?.id,
      };
      await decisionsV2Api.addOutcome(id, payload);
      await fetchDecision();
      setShowOutcomeModal(false);
      setCorrectionTarget(null);
      setOutcomeForm({ outcomeType: 'revenue', timeframeDays: 30, metricBefore: '', metricAfter: '', notes: '' });
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleContextUpdate = async () => {
    setSaving(true);
    try {
      const payload = {
        context: {
          companyStage: contextForm.companyStage || undefined,
          businessModel: contextForm.businessModel || undefined,
          primaryKpi: contextForm.primaryKpi || undefined,
          market: {
            type: contextForm.marketType || undefined,
            segment: contextForm.marketSegment || undefined,
          },
        },
        reason: 'Manual update from dashboard',
      };
      await decisionsV2Api.updateContext(id, payload);
      await fetchDecision();
      setShowContextModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('Regenerate verdict? This will create a new version.')) return;
    setSaving(true);
    try {
      await decisionsV2Api.regenerateVerdict(id, 'Manual regeneration from dashboard');
      await fetchDecision();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this decision? This action cannot be undone.')) return;
    try {
      await decisionsV2Api.delete(id);
      navigate('/app/history-v2');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <svg className="animate-spin h-8 w-8 text-violet-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error || !decision) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error || 'Decision not found'}</p>
        <button onClick={() => navigate('/app/history-v2')} className="px-4 py-2 bg-violet-500 text-white rounded-lg">
          Back to Archive
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <button
            onClick={() => navigate('/app/history-v2')}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Archive
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">{decision.companyName}</h1>
          <a href={decision.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">
            {decision.websiteUrl}
          </a>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={decision.status} />
          <button
            onClick={() => setShowStatusModal(true)}
            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
          >
            Change Status
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - Verdict */}
        <div className="lg:col-span-2 space-y-6">
          {/* Verdict Card */}
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Verdict</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">v{decision.verdictVersion}</span>
                <button
                  onClick={handleRegenerate}
                  disabled={saving}
                  className="text-sm text-violet-400 hover:text-violet-300"
                >
                  Regenerate
                </button>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-3">{decision.verdict?.headline}</h3>
            <p className="text-slate-300 mb-4">{decision.verdict?.summary}</p>

            <div className="flex flex-wrap gap-4 mb-4">
              <div className="px-4 py-2 bg-slate-800/50 rounded-lg">
                <span className="text-xs text-slate-500">Confidence</span>
                <p className={`text-lg font-bold ${
                  decision.verdict?.confidenceScore >= 0.8 ? 'text-emerald-400' :
                  decision.verdict?.confidenceScore >= 0.6 ? 'text-amber-400' : 'text-slate-400'
                }`}>
                  {Math.round((decision.verdict?.confidenceScore || 0) * 100)}%
                </p>
              </div>
              <div className="px-4 py-2 bg-slate-800/50 rounded-lg">
                <span className="text-xs text-slate-500">Risk</span>
                <p className={`text-lg font-bold ${
                  decision.verdict?.whatToExpect?.riskScore >= 0.7 ? 'text-red-400' :
                  decision.verdict?.whatToExpect?.riskScore >= 0.4 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {decision.verdict?.whatToExpect?.riskLabel}
                </p>
              </div>
            </div>

            {decision.verdict?.cta && (
              <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                <p className="text-violet-300">{decision.verdict.cta}</p>
              </div>
            )}
          </div>

          {/* Context Card */}
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Context</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">v{decision.contextVersion}</span>
                <button
                  onClick={() => setShowContextModal(true)}
                  className="text-sm text-violet-400 hover:text-violet-300"
                >
                  Edit
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ContextField label="Company Stage" field={decision.context?.companyStage} />
              <ContextField label="Business Model" field={decision.context?.businessModel} />
              <ContextField label="Primary KPI" field={decision.context?.primaryKpi} />
              <ContextField label="Market Type" field={decision.context?.market?.type} />
              <ContextField label="Market Segment" field={decision.context?.market?.segment} />
            </div>
          </div>

          {/* Outcomes Card */}
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Outcomes</h2>
              <button
                onClick={() => setShowOutcomeModal(true)}
                className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20"
              >
                Add Outcome
              </button>
            </div>

            {decision.outcomes?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {decision.outcomes.map((outcome, idx) => (
                  <OutcomeCard
                    key={idx}
                    outcome={outcome}
                    onCorrect={(o) => {
                      setCorrectionTarget(o);
                      setOutcomeForm({ ...outcomeForm, outcomeType: o.outcomeType, timeframeDays: o.timeframeDays });
                      setShowOutcomeModal(true);
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No outcomes recorded yet</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Timeline */}
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Status History</h3>
            <StatusTimeline events={decision.statusEvents} />
          </div>

          {/* Expected Impact */}
          {decision.expectedImpact && (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Expected Impact</h3>
              {decision.expectedImpact.revenueRange && (
                <div className="mb-3">
                  <span className="text-xs text-slate-500">Revenue</span>
                  <p className="text-white">{decision.expectedImpact.revenueRange}</p>
                </div>
              )}
              {decision.expectedImpact.churnNote && (
                <div>
                  <span className="text-xs text-slate-500">Churn</span>
                  <p className="text-white">{decision.expectedImpact.churnNote}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Update Status</h3>
            <select
              value={statusForm.status}
              onChange={(e) => setStatusForm(s => ({ ...s, status: e.target.value }))}
              className="w-full px-4 py-3 mb-4 bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              <option value="">Select status...</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="deferred">Deferred</option>
              <option value="completed">Completed</option>
            </select>
            <textarea
              placeholder="Reason (optional)"
              value={statusForm.reason}
              onChange={(e) => setStatusForm(s => ({ ...s, reason: e.target.value }))}
              className="w-full px-4 py-3 mb-4 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none"
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowStatusModal(false)} className="px-4 py-2 text-slate-400">
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={saving || !statusForm.status}
                className="px-4 py-2 bg-violet-500 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outcome Modal */}
      {showOutcomeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">
              {correctionTarget ? 'Add Correction' : 'Add Outcome'}
            </h3>
            <select
              value={outcomeForm.outcomeType}
              onChange={(e) => setOutcomeForm(s => ({ ...s, outcomeType: e.target.value }))}
              className="w-full px-4 py-3 mb-4 bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              <option value="revenue">Revenue</option>
              <option value="churn">Churn</option>
              <option value="retention">Retention</option>
              <option value="growth">Growth</option>
              <option value="cost">Cost</option>
              <option value="other">Other</option>
            </select>
            <input
              type="number"
              placeholder="Timeframe (days)"
              value={outcomeForm.timeframeDays}
              onChange={(e) => setOutcomeForm(s => ({ ...s, timeframeDays: parseInt(e.target.value) || 30 }))}
              className="w-full px-4 py-3 mb-4 bg-slate-800 border border-slate-700 rounded-lg text-white"
            />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="number"
                placeholder="Before"
                value={outcomeForm.metricBefore}
                onChange={(e) => setOutcomeForm(s => ({ ...s, metricBefore: e.target.value }))}
                className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
              <input
                type="number"
                placeholder="After"
                value={outcomeForm.metricAfter}
                onChange={(e) => setOutcomeForm(s => ({ ...s, metricAfter: e.target.value }))}
                className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>
            <textarea
              placeholder="Notes"
              value={outcomeForm.notes}
              onChange={(e) => setOutcomeForm(s => ({ ...s, notes: e.target.value }))}
              className="w-full px-4 py-3 mb-4 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none"
              rows={2}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowOutcomeModal(false); setCorrectionTarget(null); }} className="px-4 py-2 text-slate-400">
                Cancel
              </button>
              <button
                onClick={handleAddOutcome}
                disabled={saving}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Modal */}
      {showContextModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold text-white mb-4">Edit Context</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <select
                value={contextForm.companyStage}
                onChange={(e) => setContextForm(s => ({ ...s, companyStage: e.target.value }))}
                className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="">Company Stage...</option>
                <option value="pre_seed">Pre-Seed</option>
                <option value="seed">Seed</option>
                <option value="series_a">Series A</option>
                <option value="series_b">Series B</option>
                <option value="series_c_plus">Series C+</option>
                <option value="public">Public</option>
              </select>
              <select
                value={contextForm.businessModel}
                onChange={(e) => setContextForm(s => ({ ...s, businessModel: e.target.value }))}
                className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="">Business Model...</option>
                <option value="saas">SaaS</option>
                <option value="marketplace">Marketplace</option>
                <option value="ecommerce">E-commerce</option>
                <option value="services">Services</option>
                <option value="hardware">Hardware</option>
                <option value="hybrid">Hybrid</option>
              </select>
              <select
                value={contextForm.primaryKpi}
                onChange={(e) => setContextForm(s => ({ ...s, primaryKpi: e.target.value }))}
                className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="">Primary KPI...</option>
                <option value="arr">ARR</option>
                <option value="mrr">MRR</option>
                <option value="gmv">GMV</option>
                <option value="revenue">Revenue</option>
                <option value="users">Users</option>
                <option value="retention">Retention</option>
              </select>
              <select
                value={contextForm.marketType}
                onChange={(e) => setContextForm(s => ({ ...s, marketType: e.target.value }))}
                className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="">Market Type...</option>
                <option value="b2b">B2B</option>
                <option value="b2c">B2C</option>
                <option value="b2b2c">B2B2C</option>
              </select>
            </div>
            <select
              value={contextForm.marketSegment}
              onChange={(e) => setContextForm(s => ({ ...s, marketSegment: e.target.value }))}
              className="w-full px-4 py-3 mb-4 bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              <option value="">Market Segment...</option>
              <option value="devtools">DevTools</option>
              <option value="fintech">Fintech</option>
              <option value="healthtech">Healthtech</option>
              <option value="edtech">Edtech</option>
              <option value="ecommerce">E-commerce</option>
              <option value="crm">CRM</option>
              <option value="hr">HR</option>
              <option value="marketing">Marketing</option>
              <option value="analytics">Analytics</option>
              <option value="security">Security</option>
              <option value="productivity">Productivity</option>
              <option value="other">Other</option>
            </select>
            <p className="text-xs text-slate-500 mb-4">Changes will create a new context version.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowContextModal(false)} className="px-4 py-2 text-slate-400">
                Cancel
              </button>
              <button
                onClick={handleContextUpdate}
                disabled={saving}
                className="px-4 py-2 bg-violet-500 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DecisionDetailV2;
