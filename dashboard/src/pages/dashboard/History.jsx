import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { decisionsApi } from '../../lib/apiClient';

// Status badge component
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

// Outcome summary badge component
const OutcomeBadge = ({ summary }) => {
  if (!summary) return null;

  const isPositive = summary.includes('+') || summary.includes('Recently');
  const isNegative = summary.includes('Rejected') || summary.includes('Rolled back');
  const isPending = summary.includes('pending');

  const style = isPositive
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : isNegative
    ? 'bg-red-500/10 text-red-400 border-red-500/20'
    : isPending
    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    : 'bg-slate-500/10 text-slate-400 border-slate-500/20';

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded border ${style}`}>
      {summary}
    </span>
  );
};

// Confidence badge component
const ConfidenceBadge = ({ level }) => {
  const styles = {
    high: 'text-emerald-400',
    medium: 'text-amber-400',
    low: 'text-slate-400',
  };

  return (
    <span className={`text-xs font-medium ${styles[level] || styles.low}`}>
      {level?.charAt(0).toUpperCase() + level?.slice(1)} Confidence
    </span>
  );
};

// Risk badge component
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

// Decision card component
const DecisionCard = ({ decision, onOpen, onCompare, onStatusChange, compareMode, isSelected }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      className={`p-5 bg-slate-900/50 border rounded-xl transition-all ${
        compareMode
          ? isSelected
            ? 'border-violet-500/50 bg-violet-900/10'
            : 'border-slate-800/50 hover:border-slate-700/50 cursor-pointer'
          : 'border-slate-800/50 hover:bg-slate-900/70'
      }`}
      onClick={() => compareMode && onCompare(decision.id)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="text-sm text-slate-500">{formatDate(decision.createdAt)}</span>
            <StatusBadge status={decision.status} />
            <RiskBadge level={decision.riskLevel} />
            {decision.outcomeSummary && <OutcomeBadge summary={decision.outcomeSummary} />}
          </div>

          {/* Company and headline */}
          <p className="text-slate-400 text-sm mb-1">{decision.companyName}</p>
          <h3 className="text-white font-medium mb-2 truncate">{decision.verdictHeadline}</h3>

          {/* Expected impact */}
          {decision.expectedImpact?.revenueRange && (
            <p className="text-sm text-emerald-400">
              Expected: {decision.expectedImpact.revenueRange}
            </p>
          )}

          {/* Context badges */}
          {decision.context && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {decision.context.companyStage && decision.context.companyStage !== 'unknown' && (
                <span className="px-2 py-0.5 text-xs text-slate-400 bg-slate-800/50 rounded">
                  {decision.context.companyStage.replace('_', ' ')}
                </span>
              )}
              {decision.context.market && decision.context.market !== 'unknown' && (
                <span className="px-2 py-0.5 text-xs text-slate-400 bg-slate-800/50 rounded">
                  {decision.context.market.toUpperCase()}
                </span>
              )}
            </div>
          )}

          {/* Tags */}
          {decision.tags?.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {decision.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 text-xs text-violet-400 bg-violet-500/10 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right side: confidence and actions */}
        <div className="flex flex-col items-end gap-3">
          <ConfidenceBadge level={decision.confidenceLevel} />

          {!compareMode && (
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(decision.id);
                }}
                className="px-3 py-1.5 text-xs text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Open
              </button>
              {(decision.status === 'proposed' || decision.status === 'approved') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(decision.id, { status: 'implemented' });
                  }}
                  className="px-3 py-1.5 text-xs text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors"
                >
                  Implement
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Filter select component
const FilterSelect = ({ label, value, onChange, options }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs text-slate-500">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
    >
      <option value="">All</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

// Main component
const History = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });

  // Filters
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('decisionType') || '');
  const [confidenceFilter, setConfidenceFilter] = useState(searchParams.get('confidence') || '');
  const [riskFilter, setRiskFilter] = useState(searchParams.get('risk') || '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('to') || '');

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState([]);

  // Fetch decisions
  const fetchDecisions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        q: search,
        status: statusFilter,
        decisionType: typeFilter,
        confidence: confidenceFilter,
        risk: riskFilter,
        from: dateFrom,
        to: dateTo,
        page: pagination.page,
        pageSize: pagination.pageSize,
        sort: 'created_at',
        order: 'desc',
      };

      const response = await decisionsApi.list(params);
      setDecisions(response.data.decisions || []);
      setPagination({
        page: response.data.page,
        pageSize: response.data.pageSize,
        total: response.data.total,
        totalPages: response.data.totalPages,
      });
    } catch (err) {
      console.error('Failed to fetch decisions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, confidenceFilter, riskFilter, dateFrom, dateTo, pagination.page, pagination.pageSize]);

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter) params.set('decisionType', typeFilter);
    if (confidenceFilter) params.set('confidence', confidenceFilter);
    if (riskFilter) params.set('risk', riskFilter);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    setSearchParams(params);
  }, [search, statusFilter, typeFilter, confidenceFilter, riskFilter, dateFrom, dateTo, setSearchParams]);

  // Handlers
  const handleOpen = (id) => {
    navigate(`/dashboard/decisions/${id}`);
  };

  const handleStatusChange = async (id, statusData) => {
    try {
      await decisionsApi.updateStatus(id, statusData);
      fetchDecisions();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleCompareSelect = (id) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  const handleCompare = () => {
    if (selectedForCompare.length >= 2) {
      navigate(`/dashboard/decisions/compare?ids=${selectedForCompare.join(',')}`);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setConfidenceFilter('');
    setRiskFilter('');
    setDateFrom('');
    setDateTo('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Filter options
  const statusOptions = [
    { value: 'proposed', label: 'Proposed' },
    { value: 'in_review', label: 'In Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'implemented', label: 'Implemented' },
    { value: 'rolled_back', label: 'Rolled Back' },
  ];

  const typeOptions = [
    { value: 'price_increase', label: 'Price Increase' },
    { value: 'tiered_pricing', label: 'Tiered Pricing' },
    { value: 'packaging', label: 'Packaging' },
    { value: 'discounting', label: 'Discounting' },
    { value: 'usage_based', label: 'Usage Based' },
    { value: 'positioning', label: 'Positioning' },
  ];

  const confidenceOptions = [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  const riskOptions = [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Decision Archive</h1>
          <p className="text-slate-400 mt-1">
            Track and manage your pricing decisions
          </p>
        </div>

        <div className="flex gap-3">
          {compareMode ? (
            <>
              <button
                onClick={() => {
                  setCompareMode(false);
                  setSelectedForCompare([]);
                }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCompare}
                disabled={selectedForCompare.length < 2}
                className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Compare ({selectedForCompare.length}/3)
              </button>
            </>
          ) : (
            <button
              onClick={() => setCompareMode(true)}
              className="px-4 py-2 text-sm text-slate-400 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg transition-colors"
            >
              Compare Decisions
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-slate-900/30 border border-slate-800/30 rounded-xl">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-slate-500 block mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Company or URL..."
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
          />

          <FilterSelect
            label="Type"
            value={typeFilter}
            onChange={setTypeFilter}
            options={typeOptions}
          />

          <FilterSelect
            label="Confidence"
            value={confidenceFilter}
            onChange={setConfidenceFilter}
            options={confidenceOptions}
          />

          <FilterSelect
            label="Risk"
            value={riskFilter}
            onChange={setRiskFilter}
            options={riskOptions}
          />

          {/* Date range */}
          <div className="flex gap-2">
            <div>
              <label className="text-xs text-slate-500 block mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          {/* Clear filters */}
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Compare mode hint */}
      {compareMode && (
        <div className="mb-4 p-3 bg-violet-900/20 border border-violet-500/20 rounded-lg text-sm text-violet-300">
          Select 2-3 decisions to compare side-by-side
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin w-8 h-8 text-violet-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 mb-6">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && decisions.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-800/50 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No decisions yet</h3>
          <p className="text-slate-400 mb-4">
            Start by generating a verdict on the Verdict page
          </p>
          <button
            onClick={() => navigate('/dashboard/verdict')}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            Generate Verdict
          </button>
        </div>
      )}

      {/* Decision list */}
      {!loading && !error && decisions.length > 0 && (
        <>
          <div className="space-y-3 mb-6">
            {decisions.map((decision) => (
              <DecisionCard
                key={decision.id}
                decision={decision}
                onOpen={handleOpen}
                onCompare={handleCompareSelect}
                onStatusChange={handleStatusChange}
                compareMode={compareMode}
                isSelected={selectedForCompare.includes(decision.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between py-4 border-t border-slate-800/30">
              <p className="text-sm text-slate-500">
                Showing {decisions.length} of {pagination.total} decisions
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 text-sm text-slate-400 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 text-sm text-slate-400">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1.5 text-sm text-slate-400 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default History;
