import { useState, useEffect, memo, useCallback } from 'react';
import { decisionsV2Api } from '../../lib/apiClient';

// Status options
const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', style: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: '⏳' },
  { value: 'in_progress', label: 'In Progress', style: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: '🔄' },
  { value: 'achieved', label: 'Achieved', style: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: '✓' },
  { value: 'missed', label: 'Missed', style: 'bg-red-500/20 text-red-400 border-red-500/30', icon: '✗' },
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

// Format delta with +/- sign
const formatDelta = (value, unit) => {
  if (value === null || value === undefined) return '—';
  const sign = value > 0 ? '+' : '';
  const unitSymbol = KPI_UNITS[unit] || unit;
  return `${sign}${value.toFixed(1)}${unitSymbol}`;
};

/**
 * KPI Row Component
 */
const KPIRow = memo(({ kpi, onChange, editable }) => {
  const unitSymbol = KPI_UNITS[kpi.unit] || kpi.unit;
  
  const handleActualChange = (e) => {
    const val = e.target.value === '' ? null : parseFloat(e.target.value);
    onChange({ ...kpi, actual: val });
  };

  const handleBaselineChange = (e) => {
    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
    onChange({ ...kpi, baseline: val });
  };

  const handleTargetChange = (e) => {
    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
    onChange({ ...kpi, target: val });
  };

  return (
    <tr className="border-b border-slate-800/30 last:border-0">
      <td className="py-2.5 pr-3">
        <div>
          <span className="text-sm font-medium text-white">{kpi.key}</span>
          {kpi.notes && (
            <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[120px]">{kpi.notes}</p>
          )}
        </div>
      </td>
      <td className="py-2.5 px-2 text-center">
        {editable ? (
          <input
            type="number"
            value={kpi.baseline || ''}
            onChange={handleBaselineChange}
            className="w-16 px-2 py-1 text-xs text-center bg-slate-900/50 border border-slate-700/50 rounded text-white focus:outline-none focus:border-violet-500/50"
            placeholder="0"
          />
        ) : (
          <span className="text-xs text-slate-400">{kpi.baseline}{unitSymbol}</span>
        )}
      </td>
      <td className="py-2.5 px-2 text-center">
        {editable ? (
          <input
            type="number"
            value={kpi.target || ''}
            onChange={handleTargetChange}
            className="w-16 px-2 py-1 text-xs text-center bg-slate-900/50 border border-slate-700/50 rounded text-white focus:outline-none focus:border-violet-500/50"
            placeholder="0"
          />
        ) : (
          <span className="text-xs text-violet-400">{kpi.target}{unitSymbol}</span>
        )}
      </td>
      <td className="py-2.5 px-2 text-center">
        {editable ? (
          <input
            type="number"
            value={kpi.actual ?? ''}
            onChange={handleActualChange}
            className="w-16 px-2 py-1 text-xs text-center bg-slate-900/50 border border-slate-700/50 rounded text-white focus:outline-none focus:border-violet-500/50"
            placeholder="—"
          />
        ) : (
          <span className={`text-xs ${kpi.actual !== null ? 'text-white font-medium' : 'text-slate-600'}`}>
            {kpi.actual !== null ? `${kpi.actual}${unitSymbol}` : '—'}
          </span>
        )}
      </td>
      <td className="py-2.5 pl-2 text-center">
        {kpi.delta !== null && kpi.delta !== undefined ? (
          <span className={`text-xs font-medium ${kpi.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatDelta(kpi.delta, kpi.unit)}
          </span>
        ) : (
          <span className="text-xs text-slate-600">—</span>
        )}
      </td>
    </tr>
  );
});

KPIRow.displayName = 'KPIRow';

/**
 * Outcome Tracking Panel
 * Locked until an ending is chosen, then allows KPI tracking
 */
const OutcomePanel = memo(({ 
  decisionId, 
  chosenScenarioId,
  chosenScenarioName,
  onOutcomeSaved 
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
      const data = await decisionsV2Api.getOutcome(decisionId);
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
    
    setSaving(true);
    setError(null);
    try {
      const updated = await decisionsV2Api.updateOutcome(decisionId, {
        status: outcome.status,
        kpis: outcome.kpis,
        summary: outcome.summary,
        notes: outcome.notes,
        evidenceLinks: outcome.evidenceLinks,
      });
      setOutcome(updated);
      setIsEditing(false);
      
      if (onOutcomeSaved) {
        onOutcomeSaved(updated);
      }
    } catch (err) {
      console.error('Failed to save outcome:', err);
      setError('Failed to save outcome');
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

  const currentStatus = STATUS_OPTIONS.find(s => s.value === outcome?.status);

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
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800/50"
          >
            Edit
          </button>
        </div>

        {/* Status Badge */}
        {currentStatus && (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border mb-4 ${currentStatus.style}`}>
            <span className="text-sm font-medium">{currentStatus.label}</span>
          </div>
        )}

        {/* KPI Table */}
        {outcome.kpis && outcome.kpis.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-800/50">
                  <th className="pb-2 font-medium">KPI</th>
                  <th className="pb-2 px-2 font-medium text-center">Baseline</th>
                  <th className="pb-2 px-2 font-medium text-center">Target</th>
                  <th className="pb-2 px-2 font-medium text-center">Actual</th>
                  <th className="pb-2 pl-2 font-medium text-center">Δ</th>
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

      <div className="space-y-4">
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
            <label className="text-xs text-slate-500 block mb-2">KPI Measurements</label>
            <div className="overflow-x-auto bg-slate-900/30 rounded-lg border border-slate-800/30 p-3">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-slate-800/50">
                    <th className="pb-2 font-medium">KPI</th>
                    <th className="pb-2 px-2 font-medium text-center">Baseline</th>
                    <th className="pb-2 px-2 font-medium text-center">Target</th>
                    <th className="pb-2 px-2 font-medium text-center">Actual</th>
                    <th className="pb-2 pl-2 font-medium text-center">Δ</th>
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
              Fill in baseline (starting value), target (expected), and actual (measured) values
            </p>
          </div>
        )}

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
