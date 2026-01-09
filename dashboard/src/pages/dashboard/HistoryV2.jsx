import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { decisionsV2Api } from '../../lib/apiClient';
import { getOutcome, getChosenScenario } from '../../lib/outcomeStorage';
import { EpisodeCard } from '../../components/history';

/**
 * History V2 - Netflix-Style Episodes Page
 * 
 * Each Verdict is displayed as an "Episode" in the decision journey.
 * Episodes can be expanded to reveal "Alternate Endings" (scenarios).
 * A vertical timeline connects all episodes visually.
 * 
 * Navigation:
 * - /history - Shows all episodes
 * - /history?verdictId=XYZ - Auto-expands and scrolls to that episode
 */

// Calculate episode status
const getEpisodeStatusKey = (decision, hasChosenScenario, hasOutcome) => {
  if (hasOutcome) return 'outcome';
  if (hasChosenScenario) return 'chosen';
  if (decision.hasScenarios) return 'explored';
  return 'draft';
};

const HistoryV2 = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // State
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  
  // Expanded episode state (only one at a time)
  const [expandedVerdictId, setExpandedVerdictId] = useState(null);
  
  // Active filter
  const [activeFilter, setActiveFilter] = useState('all');

  // Get verdictId from URL to auto-expand
  const urlVerdictId = searchParams.get('verdictId');

  // Fetch decisions
  const fetchDecisions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        pageSize: pagination.pageSize,
      };

      const { data } = await decisionsV2Api.list(params);
      setDecisions(data.decisions || []);
      setPagination(prev => ({
        ...prev,
        total: data.total,
        totalPages: data.totalPages,
      }));
    } catch (err) {
      setError(err.message || 'Failed to load decisions');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize]);

  // Initial fetch
  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  // Auto-expand verdict from URL (for "Derived from" navigation)
  useEffect(() => {
    if (urlVerdictId && !loading) {
      setExpandedVerdictId(urlVerdictId);
      
      // Scroll to the episode after a short delay
      setTimeout(() => {
        const element = document.getElementById(`episode-${urlVerdictId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [urlVerdictId, loading]);

  // Toggle expand
  const handleToggleExpand = useCallback((verdictId) => {
    setExpandedVerdictId(prev => prev === verdictId ? null : verdictId);
  }, []);

  // Handle verdict update (refresh badges)
  const handleVerdictUpdate = useCallback(() => {
    setDecisions(prev => [...prev]);
  }, []);

  // Enhance decisions with local storage data
  const enhancedDecisions = useMemo(() => {
    return decisions.map(d => {
      const chosenScenario = getChosenScenario(d.id);
      const outcome = getOutcome(d.id);
      const hasOutcome = outcome.decisionTaken !== null || outcome.dateImplemented || outcome.notes || outcome.status;
      const hasChosenScenario = !!chosenScenario || !!d.chosenScenarioId;
      
      return {
        ...d,
        _chosenScenario: chosenScenario,
        _hasOutcome: hasOutcome,
        _hasChosenScenario: hasChosenScenario,
        _statusKey: getEpisodeStatusKey(d, hasChosenScenario, hasOutcome),
      };
    });
  }, [decisions]);

  // Filter decisions
  const filteredDecisions = useMemo(() => {
    if (activeFilter === 'all') return enhancedDecisions;
    return enhancedDecisions.filter(d => d._statusKey === activeFilter);
  }, [enhancedDecisions, activeFilter]);

  // Count by status
  const statusCounts = useMemo(() => {
    const counts = { all: enhancedDecisions.length, draft: 0, explored: 0, chosen: 0, outcome: 0 };
    enhancedDecisions.forEach(d => {
      counts[d._statusKey]++;
    });
    return counts;
  }, [enhancedDecisions]);

  // Empty state
  if (!loading && !error && decisions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto pt-8 pb-16">
        <div className="text-center mb-12">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            Your Decision Journey
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight leading-tight">
            No episodes yet
          </h1>
          <p className="text-lg text-slate-400 mb-8">
            Every great story begins with a single decision. Start your first episode.
          </p>
          <button
            onClick={() => navigate('/verdict')}
            className="px-8 py-4 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors"
          >
            Create First Episode
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pt-8 pb-16 overflow-visible">
      {/* Header - Consistent with other pages */}
      <div className="text-center mb-12">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
          Your Decision Journey
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight leading-tight">
          Episodes
        </h1>
        <p className="text-lg text-slate-400">
          {pagination.total} episode{pagination.total !== 1 ? 's' : ''} in your journey. 
          Expand to explore alternate endings.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 -mx-2 px-2">
        {[
          { key: 'all', label: 'All Episodes' },
          { key: 'draft', label: 'Draft' },
          { key: 'explored', label: 'Explored' },
          { key: 'chosen', label: 'Path Chosen' },
          { key: 'outcome', label: 'Outcome Recorded' },
        ].map(filter => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key)}
            className={`px-4 py-2.5 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${
              activeFilter === filter.key
                ? 'bg-white text-slate-900'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-700/50'
            }`}
          >
            {filter.label}
            <span className={`ml-2 text-xs ${activeFilter === filter.key ? 'text-slate-600' : 'text-slate-500'}`}>
              {statusCounts[filter.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-12 bg-red-500/5 border border-red-500/20 rounded-xl">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchDecisions}
            className="px-4 py-2 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* No results with filters */}
      {!loading && !error && filteredDecisions.length === 0 && activeFilter !== 'all' && (
        <div className="text-center py-12 bg-slate-900/30 border border-slate-800/40 rounded-xl">
          <svg className="w-12 h-12 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-slate-400 mb-4">No episodes in this category</p>
          <button
            onClick={() => setActiveFilter('all')}
            className="text-sm text-violet-400 hover:text-violet-300"
          >
            View all episodes
          </button>
        </div>
      )}

      {/* Episode List with Timeline */}
      {!loading && !error && filteredDecisions.length > 0 && (
        <>
          <div className="relative overflow-visible">
            {/* Timeline Background Line - positioned outside on the left */}
            <div className="absolute -left-[49px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-violet-500/30 via-slate-700/50 to-transparent" />

            {/* Episodes */}
            <div className="space-y-0">
              {filteredDecisions.map((decision, index) => (
                <EpisodeCard
                  key={decision.id}
                  decision={decision}
                  episodeNumber={pagination.total - (pagination.page - 1) * pagination.pageSize - index}
                  isExpanded={expandedVerdictId === decision.id}
                  onToggleExpand={handleToggleExpand}
                  onVerdictUpdate={handleVerdictUpdate}
                  showTimelineNode={true}
                />
              ))}
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-8 pb-4">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page <= 1}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed bg-slate-800/50 rounded-lg transition-colors border border-slate-700/50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed bg-slate-800/50 rounded-lg transition-colors border border-slate-700/50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Create New Episode CTA */}
      {!loading && decisions.length > 0 && (
        <div className="text-center pt-8 pb-4">
          <button
            onClick={() => navigate('/verdict')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 hover:text-violet-300 font-medium rounded-xl border border-violet-500/20 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Episode
          </button>
        </div>
      )}
    </div>
  );
};

export default HistoryV2;
