import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalysis } from '../../context/AnalysisV2Context';
import { analysisV2Api, downloadBlob } from '../../lib/apiClient';

const Reports = () => {
  const navigate = useNavigate();
  const { analyses, isLoading } = useAnalysis();
  
  // PDF export state
  const [exportingId, setExportingId] = useState(null);
  const [exportError, setExportError] = useState(null);
  const [exportSuccess, setExportSuccess] = useState(null);

  // Handle PDF export
  const handleExportPdf = async (analysisId, analysisDate) => {
    setExportingId(analysisId);
    setExportError(null);
    setExportSuccess(null);
    
    try {
      const { ok, blob } = await analysisV2Api.exportPdf(analysisId);
      
      if (ok && blob) {
        const dateStr = new Date(analysisDate).toISOString().split('T')[0];
        const filename = `pricing-report-${dateStr}.pdf`;
        downloadBlob(blob, filename);
        setExportSuccess(analysisId);
        setTimeout(() => setExportSuccess(null), 3000);
      }
    } catch (error) {
      console.error('Failed to export PDF:', error);
      setExportError(error.message || 'Failed to export PDF');
      setTimeout(() => setExportError(null), 5000);
    } finally {
      setExportingId(null);
    }
  };

  // Format date
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  // Get insight counts by severity (for V2 structure)
  const getInsightCounts = (analysis) => {
    const insights = analysis.ruleResult?.insights || [];
    const criticalCount = insights.filter(i => i.severity === 'critical').length;
    const warningCount = insights.filter(i => i.severity === 'warning').length;
    const infoCount = insights.filter(i => i.severity === 'info').length;
    const recommendationCount = analysis.llmOutput?.recommendations?.length || 0;
    return { criticalCount, warningCount, infoCount, recommendationCount };
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-slate-400">Loading reports...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!analyses || analyses.length === 0) {
    return (
      <div className="min-h-screen">
        {/* Hero Header */}
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/10 to-transparent rounded-3xl blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
                  Reports
                </h1>
                <p className="text-slate-400 text-lg">
                  Download and manage your pricing analysis reports
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl p-12 border border-slate-700/50 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-violet-500/20">
                <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Generate Your First Report</h2>
              <p className="text-slate-400 mb-2 max-w-md mx-auto leading-relaxed">
                Reports are generated from your pricing analyses. Run an analysis first to unlock PDF exports.
              </p>
              <p className="text-slate-500 text-sm mb-8 max-w-md mx-auto">
                Reports include pricing recommendations, competitive positioning, and actionable insights.
              </p>
              <button
                onClick={() => navigate('/app/analyses')}
                className="px-8 py-4 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-xl font-bold text-lg hover:from-violet-600 hover:to-fuchsia-700 hover:scale-[1.02] hover:shadow-xl hover:shadow-violet-500/25 transition-all"
              >
                Run Analysis to Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Error Toast */}
      {exportError && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">
          <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl shadow-lg backdrop-blur-sm">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-red-300">{exportError}</span>
            <button 
              onClick={() => setExportError(null)}
              className="text-red-400 hover:text-red-300 ml-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/10 to-transparent rounded-3xl blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
                  Reports
                </h1>
                <p className="text-slate-400 text-lg">
                  Download and manage your pricing analysis reports
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/app/analyses')}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-xl font-semibold hover:from-violet-600 hover:to-fuchsia-700 transition-all hover:scale-[1.02] shadow-lg shadow-violet-500/25"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Analysis
            </button>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-800/50 border-b border-slate-700/50 text-sm font-semibold text-slate-400">
          <div className="col-span-3">Date</div>
          <div className="col-span-2">Data</div>
          <div className="col-span-4">Insights</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-slate-800/50">
          {analyses.map((analysis, index) => {
            const { criticalCount, warningCount, recommendationCount } = getInsightCounts(analysis);
            const isExporting = exportingId === analysis.id;
            const justExported = exportSuccess === analysis.id;
            const isLatest = index === 0;
            const numPlans = analysis.ruleResult?.numPlans || 0;
            const numCompetitors = analysis.ruleResult?.numCompetitors || 0;

            return (
              <div
                key={analysis.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-800/30 transition-colors group"
              >
                {/* Date */}
                <div className="col-span-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isLatest ? 'bg-violet-500/10' : 'bg-slate-800'
                  }`}>
                    <svg className={`w-5 h-5 ${isLatest ? 'text-violet-400' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{formatDate(analysis.createdAt)}</span>
                      {isLatest && (
                        <span className="text-[10px] font-semibold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">
                          Latest
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">{formatTime(analysis.createdAt)}</span>
                  </div>
                </div>

                {/* Data */}
                <div className="col-span-2 text-sm text-slate-400">
                  <span>{numPlans} plans</span>
                  <span className="mx-2 text-slate-600">•</span>
                  <span>{numCompetitors} competitors</span>
                </div>

                {/* Insights */}
                <div className="col-span-4 flex items-center gap-2 flex-wrap">
                  {criticalCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400 bg-red-500/10 px-2 py-1 rounded-lg">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {criticalCount} critical
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {warningCount} warnings
                    </span>
                  )}
                  {recommendationCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {recommendationCount} tips
                    </span>
                  )}
                  {criticalCount === 0 && warningCount === 0 && recommendationCount === 0 && (
                    <span className="text-xs text-slate-500">No issues found</span>
                  )}
                </div>

                {/* Actions */}
                <div className="col-span-3 flex items-center justify-end gap-2">
                  <button
                    onClick={() => navigate('/app/analyses')}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </button>

                  <button
                    onClick={() => handleExportPdf(analysis.id, analysis.createdAt)}
                    disabled={isExporting}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                      justExported
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : isExporting
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-400 hover:from-violet-500/30 hover:to-fuchsia-500/30 border border-violet-500/20'
                    }`}
                  >
                    {isExporting ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Exporting...
                      </>
                    ) : justExported ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Downloaded!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
        <span>{analyses.length} report{analyses.length !== 1 ? 's' : ''} available</span>
        <span>PDF reports include executive summary and recommendations</span>
      </div>
    </div>
  );
};

export default Reports;
