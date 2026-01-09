import { useState, useEffect, memo, useCallback } from 'react';
import { decisionsV2Api } from '../../lib/apiClient';

// Status options
const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', style: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  { value: 'in_progress', label: 'In Progress', style: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'achieved', label: 'Achieved', style: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'missed', label: 'Missed', style: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

// Confidence options
const CONFIDENCE_OPTIONS = [
  { value: 'low', label: 'Low', style: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'medium', label: 'Medium', style: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'high', label: 'High', style: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
];

// KPI Unit symbols
const KPI_UNITS = {
  '%': '%',
  'pp': 'pp',
  '€': '€',
  '$': '$',
  'count': '',
  'days': 'd',
  'x': 'x',
};

// Format delta with +/- sign and color class
const formatDeltaPct = (value) => {
  if (value === null || value === undefined) return { text: '—', colorClass: 'text-slate-600' };
  const sign = value > 0 ? '+' : '';
  const colorClass = value > 0 ? 'text-emerald-400' : value < 0 ? 'text-red-400' : 'text-slate-400';
  return { text: `${sign}${value.toFixed(1)}%`, colorClass };
};

// Format absolute delta
const formatDelta = (value, unit) => {
  if (value === null || value === undefined) return '—';
  const sign = value > 0 ? '+' : '';
  const unitSymbol = KPI_UNITS[unit] || unit;
  return `${sign}${value.toFixed(1)}${unitSymbol}`;
};

/**
 * KPI Row Component - Editable row for KPI tracking
 */
const KPIRow = memo(({ kpi, onChange, editable, onActualUpdate }) => {
  const unitSymbol = KPI_UNITS[kpi.unit] || kpi.unit || '';
  const deltaPctFormatted = formatDeltaPct(kpi.deltaPct);
  
  const handleActualChange = (e) => {
    const val = e.target.value === '' ? null : parseFloat(e.target.value);
    
    // Auto-compute delta locally for immediate feedback
    let delta = null;
    let deltaPct = null;
    if (val !== null) {
      delta = val - kpi.baseline;
      if (kpi.baseline !== 0) {
        deltaPct = (delta / kpi.baseline) * 100;
      }
    }
    
    onChange({ ...kpi, actual: val, delta, deltaPct });
  };

  const handleBaselineChange = (e) => {
    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
    
    // Recompute delta if actual exists
    let delta = kpi.delta;
    let deltaPct = kpi.deltaPct;
    if (kpi.actual !== null && kpi.actual !== undefined) {
      delta = kpi.actual - val;
      if (val !== 0) {
        deltaPct = (delta / val) * 100;
      }
    }
    
    onChange({ ...kpi, baseline: val, delta, deltaPct });
  };

  const handleTargetChange = (e) => {
    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
    onChange({ ...kpi, target: val });
  };

  const handleConfidenceChange = (confidence) => {
    onChange({ ...kpi, confidence });
  };

  const confidenceOption = CONFIDENCE_OPTIONS.find(c => c.value === kpi.confidence);

  return (
    <tr className="border-b border-slate-800/30 last:border-0">
      {/* KPI Name */}
      <td className="py-3 pr-3">
        <div>
          <span className="text-sm font-medium text-white">{kpi.key}</span>
          {kpi.notes && (
            <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[100px]">{kpi.notes}</p>
          )}
        </div>
      </td>
      
      {/* Baseline */}
      <td className="py-3 px-2 text-center">
        {editable ? (
          <input
            type="number"
            value={kpi.baseline || ''}
            onChange={handleBaselineChange}
            className="w-16 px-2 py-1.5 text-xs text-center bg-slate-900/50 border border-slate-700/50 rounded text-white focus:outline-none focus:border-violet-500/50"
            placeholder="0"
          />
        ) : (
          <span className="text-xs text-slate-400">{kpi.baseline}{unitSymbol}</span>
        )}
      </td>
      
      {/* Target */}
      <td className="py-3 px-2 text-center">
        {editable ? (
          <input
            type="number"
            value={kpi.target || ''}
            onChange={handleTargetChange}
            className="w-16 px-2 py-1.5 text-xs text-center bg-slate-900/50 border border-slate-700/50 rounded text-violet-300 focus:outline-none focus:border-violet-500/50"
            placeholder="0"
          />
        ) : (
          <span className="text-xs text-violet-400">{kpi.target}{unitSymbol}</span>
        )}
      </td>
      
      {/* Actual */}
      <td className="py-3 px-2 text-center">
        {editable ? (
          <input
            type="number"
            value={kpi.actual ?? ''}
            onChange={handleActualChange}
            className="w-16 px-2 py-1.5 text-xs text-center bg-slate-900/50 border border-slate-700/50 rounded text-white font-medium focus:outline-none focus:border-violet-500/50"
            placeholder="—"
          />
        ) : (
          <span className={`text-xs ${kpi.actual !== null && kpi.actual !== undefined ? 'text-white font-medium' : 'text-slate-600'}`}>
            {kpi.actual !== null && kpi.actual !== undefined ? `${kpi.actual}${unitSymbol}` : '—'}
          </span>
        )}
      </td>
      
      {/* Delta % - Visually emphasized */}
      <td className="py-3 px-2 text-center">
        <span className={`text-sm font-bold ${deltaPctFormatted.colorClass}`}>
          {deltaPctFormatted.text}
        </span>
      </td>
      
      {/* Confidence */}
      <td className="py-3 pl-2 text-center">
        {editable ? (
          <select
            value={kpi.confidence || 'medium'}
            onChange={(e) => handleConfidenceChange(e.target.value)}
            className="w-20 px-1 py-1.5 text-[10px] bg-slate-900/50 border border-slate-700/50 rounded text-slate-300 focus:outline-none focus:border-violet-500/50"
          >
            {CONFIDENCE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          confidenceOption && (
            <span className={`px-1.5 py-0.5 text-[10px] rounded ${confidenceOption.style}`}>
              {confidenceOption.label}
            </span>
          )
        )}
      </td>
    </tr>
  );
});

KPIRow.displayName = 'KPIRow';

/**
 * Evidence Link Row Component
 */
const EvidenceLinkRow = memo(({ link, index, onChange, onRemove, editable }) => {
  if (!editable) {
    return (
      <a 
        href={link.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        {link.label || link.url}
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={link.label || ''}
        onChange={(e) => onChange(index, { ...link, label: e.target.value })}
        className="flex-1 px-2 py-1.5 text-xs bg-slate-900/50 border border-slate-700/50 rounded text-white focus:outline-none focus:border-violet-500/50"
        placeholder="Label (e.g., Stripe)"
      />
      <input
        type="url"
        value={link.url || ''}
        onChange={(e) => onChange(index, { ...link, url: e.target.value })}
        className="flex-1 px-2 py-1.5 text-xs bg-slate-900/50 border border-slate-700/50 rounded text-white focus:outline-none focus:border-violet-500/50"
        placeholder="https://..."
      />
      <button
        onClick={() => onRemove(index)}
        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
});

EvidenceLinkRow.displayName = 'EvidenceLinkRow';

/**
 * Outcome Tracking Panel
 * Phase 1: Measurable decision result with KPI tracking
 * Locked until an ending is chosen, then allows KPI tracking
 */
const OutcomePanel = memo(({ 
  decisionId, 
  chosenScenarioId,
  chosenScenarioName,
  onOutcomeSaved,
  userPlan = 'growth' // 'starter' | 'growth' | 'enterprise'
}) => {
  const [outcome, setOutcome] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load outcome from backend
  const loadOutcome = useCallback(async () => {
    if (!decisionId || !chosenScenarioId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await decisionsV2Api.getOutcome(decisionId);
      // Handle both { data: ... } and direct response
      const data = response?.data || response;
      setOutcome(data);
    } catch (err) {
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        // No outcome yet - that's ok
        setOutcome(null);
      } else {
        console.warn('Failed to load outcome:', err);
        setError('Failed to load outcome');
      }
    } finally {
      setLoading(false);
    }
  }, [decisionId, chosenScenarioId]);

  // Load on mount and when chosenScenarioId changes
  useEffect(() => {
    if (chosenScenarioId) {
      loadOutcome();
    }
  }, [chosenScenarioId, loadOutcome]);

  // Save outcome to backend
  const handleSave = async () => {
    if (!outcome) return;
    
    // Validate KPI count for Growth+ plans
    if (userPlan !== 'starter' && outcome.kpis && (outcome.kpis.length < 3 || outcome.kpis.length > 6)) {
      setError('KPI count must be between 3 and 6');
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      const response = await decisionsV2Api.updateOutcome(decisionId, {
        status: outcome.status,
        kpis: outcome.kpis,
        summary: outcome.summary,
        notes: outcome.notes,
        evidenceLinks: outcome.evidenceLinks,
      });
      const updated = response?.data || response;
      setOutcome(updated);
      setIsEditing(false);
      
      if (onOutcomeSaved) {
        onOutcomeSaved(updated);
      }
    } catch (err) {
      console.error('Failed to save outcome:', err);
      setError(err.message || 'Failed to save outcome');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (newStatus) => {
    setOutcome(prev => ({ ...prev, status: newStatus }));
  };

  const handleKPIChange = (index, updatedKPI) => {
    setOutcome(prev => ({
      ...prev,
      kpis: prev.kpis.map((k, i) => i === index ? updatedKPI : k),
    }));
  };

  const handleNotesChange = (e) => {
    setOutcome(prev => ({ ...prev, notes: e.target.value }));
  };

  const handleEvidenceLinkChange = (index, updatedLink) => {
    setOutcome(prev => ({
      ...prev,
      evidenceLinks: prev.evidenceLinks.map((l, i) => i === index ? updatedLink : l),
    }));
  };

  const handleAddEvidenceLink = () => {
    setOutcome(prev => ({
      ...prev,
      evidenceLinks: [...(prev.evidenceLinks || []), { label: '', url: '' }],
    }));
  };

  const handleRemoveEvidenceLink = (index) => {
    setOutcome(prev => ({
      ...prev,
      evidenceLinks: prev.evidenceLinks.filter((_, i) => i !== index),
    }));
  };

  const currentStatus = STATUS_OPTIONS.find(s => s.value === outcome?.status);
  const isStarterPlan = userPlan === 'starter';

  // Locked state - no ending chosen
  if (!chosenScenarioId) {
    return (
      <div className="bg-slate-900/30 border border-slate-800/40 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-500">Outcome Tracking</h4>
            <p className="text-xs text-slate-600">Choose an ending above to start tracking your outcome.</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-slate-900/30 border border-slate-800/40 rounded-xl p-5">
        <div className="flex items-center justify-center py-4">
          <svg className="animate-spin w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    );
  }

  // No outcome yet - show empty state
  if (!outcome) {
    return (
      <div className="bg-slate-900/30 border border-slate-800/40 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">Outcome Tracking Ready</h4>
            <p className="text-xs text-slate-500">
              Path: {chosenScenarioName || 'Selected'} • KPIs will be generated when you apply the scenario
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Starter plan - show upgrade message instead of KPIs
  if (isStarterPlan) {
    return (
      <div className="bg-slate-900/30 border border-slate-800/40 rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-white">Outcome Tracking</h4>
              <p className="text-xs text-slate-500">Path: {chosenScenarioName || 'Selected'}</p>
            </div>
          </div>
          {currentStatus && (
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${currentStatus.style}`}>
              {currentStatus.label}
            </span>
          )}
        </div>
        
        {/* Upgrade CTA */}
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 text-center">
          <svg className="w-8 h-8 text-violet-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <h5 className="text-sm font-medium text-white mb-1">Unlock KPI Tracking</h5>
          <p className="text-xs text-slate-400 mb-3">
            Upgrade to Growth to track measurable outcomes with KPIs, deltas, and evidence links.
          </p>
          <button className="px-4 py-2 text-xs bg-violet-500 hover:bg-violet-600 text-white font-medium rounded-lg transition-colors">
            Upgrade to Growth
          </button>
        </div>
        
        {/* Notes only for Starter */}
        {outcome.notes && (
          <div className="mt-4 pt-3 border-t border-slate-800/30">
            <p className="text-xs text-slate-500 mb-1">Notes</p>
            <p className="text-sm text-slate-300">{outcome.notes}</p>
          </div>
        )}
      </div>
    );
  }

  // View mode - show saved outcome with KPI table
  if (!isEditing) {
    return (
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-white">Outcome Tracking</h4>
              <p className="text-xs text-slate-500">Path: {chosenScenarioName || 'Selected'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Status Badge - Always visible */}
            {currentStatus && (
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${currentStatus.style}`}>
                {currentStatus.label}
              </span>
            )}
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800/50"
            >
              Edit
            </button>
          </div>
        </div>

        {/* KPI Table */}
        {outcome.kpis && outcome.kpis.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-800/50">
                  <th className="pb-2 font-medium">KPI</th>
                  <th className="pb-2 px-2 font-medium text-center">Baseline</th>
                  <th className="pb-2 px-2 font-medium text-center">Target</th>
                  <th className="pb-2 px-2 font-medium text-center">Actual</th>
                  <th className="pb-2 px-2 font-medium text-center">Δ%</th>
                  <th className="pb-2 pl-2 font-medium text-center">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {outcome.kpis.map((kpi, idx) => (
                  <KPIRow key={idx} kpi={kpi} editable={false} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Evidence Links */}
        {outcome.evidenceLinks && outcome.evidenceLinks.length > 0 && (
          <div className="mt-4 pt-3 border-t border-emerald-500/10">
            <p className="text-xs text-slate-500 mb-2">Evidence</p>
            <div className="flex flex-wrap gap-3">
              {outcome.evidenceLinks.map((link, idx) => (
                <EvidenceLinkRow key={idx} link={link} index={idx} editable={false} />
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {outcome.notes && (
          <div className="mt-4 pt-3 border-t border-emerald-500/10">
            <p className="text-xs text-slate-500 mb-1">Notes</p>
            <p className="text-sm text-slate-300">{outcome.notes}</p>
          </div>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="bg-slate-900/30 border border-slate-800/40 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">Edit Outcome</h4>
            <p className="text-xs text-slate-500">Path: {chosenScenarioName || 'Selected'}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* Status Selection */}
        <div>
          <label className="text-xs text-slate-500 block mb-2">Outcome Status</label>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => handleStatusChange(option.value)}
                className={`py-2.5 px-3 text-sm rounded-lg border transition-colors ${
                  outcome.status === option.value
                    ? option.style
                    : 'bg-slate-900/50 border-slate-800/50 text-slate-400 hover:border-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Table - Editable */}
        {outcome.kpis && outcome.kpis.length > 0 && (
          <div>
            <label className="text-xs text-slate-500 block mb-2">
              KPI Measurements 
              <span className="text-slate-600 ml-1">({outcome.kpis.length}/6 KPIs)</span>
            </label>
            <div className="overflow-x-auto bg-slate-900/30 rounded-lg border border-slate-800/30 p-3">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-slate-800/50">
                    <th className="pb-2 font-medium">KPI</th>
                    <th className="pb-2 px-2 font-medium text-center">Baseline</th>
                    <th className="pb-2 px-2 font-medium text-center">Target</th>
                    <th className="pb-2 px-2 font-medium text-center">Actual</th>
                    <th className="pb-2 px-2 font-medium text-center">Δ%</th>
                    <th className="pb-2 pl-2 font-medium text-center">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {outcome.kpis.map((kpi, idx) => (
                    <KPIRow 
                      key={idx} 
                      kpi={kpi} 
                      onChange={(updated) => handleKPIChange(idx, updated)}
                      editable={true}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-600 mt-1.5">
              Delta % auto-calculates: ((actual - baseline) / baseline) × 100
            </p>
          </div>
        )}

        {/* Evidence Links */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-500">Evidence Links (Stripe, Mixpanel, etc.)</label>
            <button
              onClick={handleAddEvidenceLink}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              + Add link
            </button>
          </div>
          <div className="space-y-2">
            {outcome.evidenceLinks && outcome.evidenceLinks.length > 0 ? (
              outcome.evidenceLinks.map((link, idx) => (
                <EvidenceLinkRow 
                  key={idx} 
                  link={link} 
                  index={idx}
                  onChange={handleEvidenceLinkChange}
                  onRemove={handleRemoveEvidenceLink}
                  editable={true}
                />
              ))
            ) : (
              <p className="text-xs text-slate-600 py-2">No evidence links added yet</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-slate-500 block mb-1.5">Notes (optional)</label>
          <textarea
            placeholder="How did it go? Any learnings or observations..."
            value={outcome.notes || ''}
            onChange={handleNotesChange}
            rows={3}
            className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => setIsEditing(false)}
            className="px-4 py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Outcome
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

OutcomePanel.displayName = 'OutcomePanel';

export default OutcomePanel;
