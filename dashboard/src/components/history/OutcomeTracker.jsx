import { useState, useEffect, memo } from 'react';

// Outcome storage key
const getOutcomeKey = (decisionId) => `revalyze_outcome_${decisionId}`;

// Default outcome shape
const defaultOutcome = {
  verdictId: null,
  chosenScenarioId: null,
  outcomeSummary: '',
  kpiResult: '',
  notes: '',
  outcomeDate: '',
  savedAt: null,
};

// Load outcome from localStorage
const loadOutcome = (decisionId) => {
  if (!decisionId) return defaultOutcome;
  try {
    const stored = localStorage.getItem(getOutcomeKey(decisionId));
    if (stored) {
      return { ...defaultOutcome, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Failed to load outcome:', e);
  }
  return defaultOutcome;
};

// Save outcome to localStorage
const persistOutcome = (decisionId, outcome) => {
  if (!decisionId) return;
  try {
    const data = {
      ...outcome,
      verdictId: decisionId,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(getOutcomeKey(decisionId), JSON.stringify(data));
    return data;
  } catch (e) {
    console.error('Failed to save outcome:', e);
    return null;
  }
};

/**
 * Netflix-Style Outcome Tracker
 * Records the actual outcome after choosing an ending
 */
const OutcomeTracker = memo(({ 
  decisionId, 
  chosenScenarioId,
  chosenScenarioName,
  onOutcomeSaved 
}) => {
  const [outcome, setOutcome] = useState(defaultOutcome);
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing outcome on mount
  useEffect(() => {
    if (decisionId) {
      const existing = loadOutcome(decisionId);
      setOutcome(existing);
      // If there's saved data, start in view mode
      if (existing.savedAt && existing.outcomeSummary) {
        setIsEditing(false);
      }
    }
  }, [decisionId]);

  // Update chosen scenario when it changes
  useEffect(() => {
    if (chosenScenarioId) {
      setOutcome(prev => ({ ...prev, chosenScenarioId }));
    }
  }, [chosenScenarioId]);

  const handleChange = (field, value) => {
    setOutcome(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    if (!outcome.outcomeSummary.trim()) return;
    
    setSaving(true);
    
    // Add today's date if not set
    const outcomeToSave = {
      ...outcome,
      outcomeDate: outcome.outcomeDate || new Date().toISOString().split('T')[0],
    };
    
    const saved = persistOutcome(decisionId, outcomeToSave);
    
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setIsEditing(false);
      setOutcome(saved || outcomeToSave);
      
      if (onOutcomeSaved) {
        onOutcomeSaved(saved);
      }
      
      setTimeout(() => setSaved(false), 3000);
    }, 300);
  };

  const hasOutcome = outcome.savedAt && outcome.outcomeSummary;

  // No chosen scenario - disabled state
  if (!chosenScenarioId) {
    return (
      <div className="bg-slate-900/30 border border-slate-800/40 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-500">Outcome Tracking</h4>
            <p className="text-xs text-slate-600">Locked until you choose an ending</p>
          </div>
        </div>
        <p className="text-sm text-slate-500 italic">
          Choose an alternate ending above to start tracking your outcome.
        </p>
      </div>
    );
  }

  // View mode - show saved outcome
  if (hasOutcome && !isEditing) {
    return (
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-white">Outcome Recorded</h4>
              <p className="text-xs text-slate-500">
                {outcome.outcomeDate && new Date(outcome.outcomeDate).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric'
                })}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Edit
          </button>
        </div>

        {/* Summary */}
        <p className="text-sm text-slate-300 mb-3">{outcome.outcomeSummary}</p>

        {/* KPI Result */}
        {outcome.kpiResult && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mb-3">
            <span className="text-xs text-slate-500">Result:</span>
            <span className="text-sm font-medium text-emerald-400">{outcome.kpiResult}</span>
          </div>
        )}

        {/* Notes */}
        {outcome.notes && (
          <div className="mt-3 pt-3 border-t border-emerald-500/10">
            <p className="text-xs text-slate-500 mb-1">Notes</p>
            <p className="text-xs text-slate-400">{outcome.notes}</p>
          </div>
        )}

        {/* Chosen ending reference */}
        {chosenScenarioName && (
          <div className="mt-3 pt-3 border-t border-emerald-500/10">
            <p className="text-xs text-slate-500">
              Ending: <span className="text-violet-400">{chosenScenarioName}</span>
            </p>
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
            <h4 className="text-sm font-medium text-white">
              {hasOutcome ? 'Edit Outcome' : 'Record Outcome'}
            </h4>
            <p className="text-xs text-slate-500">
              Ending: <span className="text-violet-400">{chosenScenarioName || 'Selected'}</span>
            </p>
          </div>
        </div>
        {saved && (
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Summary - Required */}
        <div>
          <label className="text-xs text-slate-500 block mb-1.5">
            Outcome Summary <span className="text-red-400">*</span>
          </label>
          <textarea
            placeholder="What happened? 1-2 sentences describing the result..."
            value={outcome.outcomeSummary}
            onChange={(e) => handleChange('outcomeSummary', e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 resize-none"
          />
        </div>

        {/* KPI Result */}
        <div>
          <label className="text-xs text-slate-500 block mb-1.5">KPI Result (optional)</label>
          <input
            type="text"
            placeholder="e.g., +18% MRR, $250k ARR, 15% churn reduction"
            value={outcome.kpiResult}
            onChange={(e) => handleChange('kpiResult', e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
          />
        </div>

        {/* Date */}
        <div>
          <label className="text-xs text-slate-500 block mb-1.5">Outcome Date</label>
          <input
            type="date"
            value={outcome.outcomeDate}
            onChange={(e) => handleChange('outcomeDate', e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-slate-500 block mb-1.5">Notes (optional)</label>
          <textarea
            placeholder="Any additional learnings or context..."
            value={outcome.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {hasOutcome && (
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !outcome.outcomeSummary.trim()}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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

OutcomeTracker.displayName = 'OutcomeTracker';

export default OutcomeTracker;
