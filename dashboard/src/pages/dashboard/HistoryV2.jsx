import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { decisionsV2Api } from '../../lib/apiClient';

// Status badge with v2 statuses
const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    approved: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    deferred: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  const labels = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    deferred: 'Deferred',
    completed: 'Completed',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded border ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
};

// Confidence score display (numeric)
const ConfidenceScore = ({ score, label }) => {
  const color = score >= 0.8 ? 'text-emerald-400' : score >= 0.6 ? 'text-amber-400' : 'text-slate-400';
  return (
    <div className="flex items-center gap-1">
      <span className={`text-sm font-medium ${color}`}>{Math.round(score * 100)}%</span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
};

// Risk score display
const RiskScore = ({ score, label }) => {
  const color = score >= 0.7 ? 'text-red-400' : score >= 0.4 ? 'text-amber-400' : 'text-emerald-400';
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded bg-slate-800/50 ${color}`}>
      {label} Risk
    </span>
  );
};

// Context source indicator
const SourceBadge = ({ source }) => {
  const styles = {
    user: 'bg-violet-500/10 text-violet-400',
    workspace: 'bg-blue-500/10 text-blue-400',
    inferred: 'bg-amber-500/10 text-amber-400',
  };
  const icons = {
    user: '👤',
    workspace: '🏢',
    inferred: '🤖',
  };
  return (
    <span className={`px-1.5 py-0.5 text-xs rounded ${styles[source] || styles.inferred}`}>
      {icons[source]}
    </span>
  );
};

// Outcome summary badge
const OutcomeBadge = ({ summary }) => {
  if (!summary) return null;
  const isPositive = summary.startsWith('+');
  const style = isPositive
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : 'bg-red-500/10 text-red-400 border-red-500/20';
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded border ${style}`}>
      {summary}
    </span>
  );
};

// Decision card component
const DecisionCard = ({ decision, onOpen, onCompare, compareMode, isSelected }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getContextValue = (field) => field?.value || '—';

  return (
    <div
      className={`p-5 bg-slate-900/50 border rounded-xl transition-all cursor-pointer ${
        compareMode
          ? isSelected
            ? 'border-violet-500/50 bg-violet-900/10'
            : 'border-slate-700/50 hover:border-slate-600'
          : 'border-slate-700/50 hover:border-violet-500/30 hover:bg-slate-900/70'
      }`}
      onClick={() => compareMode ? onCompare(decision.id) : onOpen(decision.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">{decision.companyName}</h3>
          <p className="text-sm text-slate-400 truncate max-w-md">{decision.websiteUrl}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={decision.status} />
          {compareMode && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onCompare(decision.id)}
              className="w-4 h-4 rounded border-slate-600 text-violet-500 focus:ring-violet-500/20"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      </div>

      <p className="text-sm text-slate-300 mb-4 line-clamp-2">{decision.verdictHeadline}</p>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <ConfidenceScore score={decision.confidenceScore} label={decision.confidenceLabel} />
        <RiskScore score={decision.riskScore} label={decision.riskLabel} />
        {decision.outcomeSummary && <OutcomeBadge summary={decision.outcomeSummary} />}
      </div>

      {/* Context pills with source attribution */}
      <div className="flex flex-wrap gap-2 mb-3">
        {decision.context?.companyStage?.value && (
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 rounded text-xs">
            <SourceBadge source={decision.context.companyStage.source} />
            <span className="text-slate-300">{decision.context.companyStage.value}</span>
          </div>
        )}
        {decision.context?.businessModel?.value && (
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 rounded text-xs">
            <SourceBadge source={decision.context.businessModel.source} />
            <span className="text-slate-300">{decision.context.businessModel.value}</span>
          </div>
        )}
        {decision.context?.market?.segment?.value && (
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 rounded text-xs">
            <SourceBadge source={decision.context.market.segment.source} />
            <span className="text-slate-300">{decision.context.market.segment.value}</span>
          </div>
        )}
      </div>

      <div className="text-xs text-slate-500">{formatDate(decision.createdAt)}</div>
    </div>
  );
};

const HistoryV2 = () => {
  const navigate = useNavigate();
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    segment: '',
    kpi: '',
    minConfidence: '',
    search: '',
  });

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchDecisions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        ...filters,
        page: pagination.page,
        pageSize: pagination.pageSize,
      };
      // Remove empty values
      Object.keys(params).forEach(k => !params[k] && delete params[k]);

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
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  const handleOpenDecision = (id) => {
    navigate(`/app/decisions-v2/${id}`);
  };

  const handleToggleCompare = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      if (prev.length >= 3) {
        return prev; // Max 3
      }
      return [...prev, id];
    });
  };

  const handleCompare = () => {
    if (selectedIds.length >= 2) {
      navigate(`/app/decisions-v2/compare?ids=${selectedIds.join(',')}`);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
  };

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/10 to-transparent rounded-3xl blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
                  Decision Archive
                </h1>
                <p className="text-slate-400">
                  {pagination.total} decision{pagination.total !== 1 ? 's' : ''} tracked
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setCompareMode(!compareMode);
                  setSelectedIds([]);
                }}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  compareMode
                    ? 'bg-violet-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {compareMode ? 'Exit Compare' : 'Compare'}
              </button>
              {compareMode && selectedIds.length >= 2 && (
                <button
                  onClick={handleCompare}
                  className="px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-xl font-medium hover:from-violet-600 hover:to-fuchsia-700 transition-all"
                >
                  Compare {selectedIds.length} Decisions
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="Search companies..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 outline-none w-64"
          />

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:border-violet-500 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="deferred">Deferred</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={filters.segment}
            onChange={(e) => handleFilterChange('segment', e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:border-violet-500 outline-none"
          >
            <option value="">All Segments</option>
            <option value="devtools">DevTools</option>
            <option value="fintech">Fintech</option>
            <option value="healthtech">Healthtech</option>
            <option value="ecommerce">E-commerce</option>
            <option value="crm">CRM</option>
            <option value="analytics">Analytics</option>
            <option value="productivity">Productivity</option>
          </select>

          <select
            value={filters.minConfidence}
            onChange={(e) => handleFilterChange('minConfidence', e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:border-violet-500 outline-none"
          >
            <option value="">Any Confidence</option>
            <option value="0.8">High (80%+)</option>
            <option value="0.6">Medium+ (60%+)</option>
          </select>
        </div>
      </div>

      {/* Decision List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin h-8 w-8 text-violet-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={fetchDecisions} className="px-4 py-2 bg-violet-500 text-white rounded-lg">
            Retry
          </button>
        </div>
      ) : decisions.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No decisions yet</h3>
          <p className="text-slate-400 mb-4">Start analyzing companies to build your decision archive</p>
          <button
            onClick={() => navigate('/app/verdict')}
            className="px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-xl font-medium"
          >
            Analyze a Company
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {decisions.map(decision => (
              <DecisionCard
                key={decision.id}
                decision={decision}
                onOpen={handleOpenDecision}
                onCompare={handleToggleCompare}
                compareMode={compareMode}
                isSelected={selectedIds.includes(decision.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page <= 1}
                className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-slate-400 px-4">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HistoryV2;
