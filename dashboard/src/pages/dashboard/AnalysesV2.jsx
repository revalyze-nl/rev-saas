import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalysisV2 } from '../../context/AnalysisV2Context';
import { analysisV2Api, downloadBlob } from '../../lib/apiClient';

const AnalysesV2 = () => {
  const navigate = useNavigate();
  const { 
    analyses, 
    selectedAnalysis, 
    selectAnalysis, 
    isLoading, 
    isRunning, 
    runAnalysis, 
    limitError, 
    clearLimitError 
  } = useAnalysisV2();
  
  const [exportingId, setExportingId] = useState(null);
  const [exportError, setExportError] = useState(null);

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  };

  const formatDateShort = (isoString) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'warning':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'info':
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return (
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const handleRunNewAnalysis = async () => {
    const result = await runAnalysis();
    if (!result.success) {
      console.error('Failed to run analysis:', result.error);
    }
  };

  const handleExportPdf = async (analysisId, analysisDate) => {
    setExportingId(analysisId);
    setExportError(null);
    
    try {
      const { ok, blob } = await analysisV2Api.exportPdf(analysisId);
      
      if (ok && blob) {
        const dateStr = new Date(analysisDate).toISOString().split('T')[0];
        const filename = `pricing-report-${dateStr}.pdf`;
        downloadBlob(blob, filename);
      }
    } catch (error) {
      console.error('Failed to export PDF:', error);
      setExportError(error.message || 'Failed to export PDF');
      setTimeout(() => setExportError(null), 5000);
    } finally {
      setExportingId(null);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading analysis history...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (analyses.length === 0) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            No Analyses Yet
          </h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
            Run your first pricing analysis to get deterministic insights with AI-powered commentary.
          </p>
          <button
            onClick={handleRunNewAnalysis}
            disabled={isRunning}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-blue-700 hover:scale-105 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
          >
            {isRunning ? 'Running Analysis...' : 'Run Analysis'}
          </button>
        </div>
      </div>
    );
  }

  if (!selectedAnalysis) return null;

  const reportDate = formatDate(selectedAnalysis.createdAt);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Limit Error Modal */}
      {limitError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6 pb-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-b border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {limitError.errorCode === 'AI_QUOTA_EXCEEDED' ? 'AI Credits Exhausted' : 'Limit Reached'}
                  </h3>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-300 leading-relaxed">{limitError.reason}</p>
            </div>
            <div className="p-6 pt-4 bg-slate-800/30 border-t border-slate-800 flex items-center gap-3">
              <button
                onClick={clearLimitError}
                className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition-all"
              >
                Close
              </button>
              <button
                onClick={() => {
                  clearLimitError();
                  navigate('/app/billing');
                }}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Error Toast */}
      {exportError && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">
          <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl shadow-lg backdrop-blur-sm">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-red-300">{exportError}</span>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Report Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl p-8 border border-slate-800 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-purple-400 bg-gradient-to-r from-purple-500/20 to-blue-500/20 px-3 py-1 rounded-full border border-purple-500/30">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Analysis Engine
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Pricing Analysis Report
                </h1>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {reportDate}
                  </span>
                  <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                  <span>{selectedAnalysis.ruleResult.numPlans} plans</span>
                  <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                  <span>{selectedAnalysis.ruleResult.numCompetitors} competitors</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportPdf(selectedAnalysis.id, selectedAnalysis.createdAt)}
                  disabled={exportingId === selectedAnalysis.id}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition-all disabled:opacity-50 border border-slate-700"
                >
                  {exportingId === selectedAnalysis.id ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Exporting...
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
                
                <button
                  onClick={handleRunNewAnalysis}
                  disabled={isRunning}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-400 rounded-xl font-medium hover:from-purple-500/30 hover:to-blue-500/30 transition-all disabled:opacity-50 border border-purple-500/20"
                >
                  {isRunning ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Running...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Run New
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        {selectedAnalysis.llmOutput.executiveSummary && (
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="text-lg font-semibold text-white">Executive Summary</h2>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
              {selectedAnalysis.llmOutput.executiveSummary}
            </p>
          </div>
        )}

        {/* System Detected Insights (Rule Engine) */}
        {selectedAnalysis.ruleResult.insights.length > 0 && (
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h2 className="text-lg font-semibold text-white">System Detected Insights</h2>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full ml-auto">
                Deterministic
              </span>
            </div>
            <div className="space-y-3">
              {selectedAnalysis.ruleResult.insights.map((insight, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-xl border ${getSeverityStyle(insight.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(insight.severity)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-white">{insight.title}</h4>
                        <span className="text-xs text-slate-500 font-mono">{insight.code}</span>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing Insights (LLM) */}
        {selectedAnalysis.llmOutput.pricingInsights.length > 0 && (
          <div className="bg-gradient-to-br from-purple-500/5 via-slate-900/50 to-blue-500/5 backdrop-blur-sm rounded-2xl border border-purple-500/20 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-b border-purple-500/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Pricing Insights</h3>
                  <p className="text-xs text-slate-400">AI-powered strategic analysis</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {selectedAnalysis.llmOutput.pricingInsights.map((insight, index) => (
                <div key={index} className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                  <h4 className="font-medium text-white mb-2">{insight.title}</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{insight.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations (LLM) */}
        {selectedAnalysis.llmOutput.recommendations.length > 0 && (
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-lg font-semibold text-white">Recommendations</h2>
            </div>
            <div className="space-y-4">
              {selectedAnalysis.llmOutput.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-slate-800/30 rounded-xl">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-emerald-400">{index + 1}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-white mb-1">{rec.action}</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">{rec.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Next Actions */}
        {selectedAnalysis.llmOutput.suggestedNextActions?.length > 0 && (
          <div className="bg-gradient-to-br from-indigo-500/5 via-slate-900/50 to-purple-500/5 backdrop-blur-sm rounded-2xl border border-indigo-500/20 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-indigo-500/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Suggested Next Actions</h3>
                  <p className="text-xs text-slate-400">Based on this analysis, here are the most impactful next steps to validate with Pricing Simulation.</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {selectedAnalysis.llmOutput.suggestedNextActions.map((action, index) => (
                <div 
                  key={index} 
                  className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30 hover:border-indigo-500/30 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                          Action
                        </span>
                        <span className="text-xs text-slate-500 font-mono">{action.code}</span>
                      </div>
                      <h4 className="font-medium text-white mb-1">{action.title}</h4>
                      <p className="text-sm text-slate-400 leading-relaxed">{action.description}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => navigate(`/app/simulation?action=${encodeURIComponent(action.code)}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all hover:scale-105 shadow-lg shadow-indigo-500/20"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Simulate this
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk Analysis (LLM) */}
        {selectedAnalysis.llmOutput.riskAnalysis.length > 0 && (
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-red-500/20">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-lg font-semibold text-white">Risk Analysis</h2>
            </div>
            <div className="space-y-3">
              {selectedAnalysis.llmOutput.riskAnalysis.map((risk, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-slate-300 leading-relaxed">{risk}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar - Analysis History */}
      <aside className="lg:col-span-1">
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800 sticky top-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white">Analysis History</h3>
            </div>
            <span className="text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full">
              {analyses.length}
            </span>
          </div>

          <div className="space-y-3">
            {analyses.map((analysis, index) => {
              const isSelected = analysis.id === selectedAnalysis.id;
              const isLatest = index === 0;
              
              return (
                <div
                  key={analysis.id}
                  className={`group rounded-xl border transition-all duration-200 ${
                    isSelected
                      ? 'border-purple-500/50 bg-purple-500/5'
                      : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">
                        {formatDateShort(analysis.createdAt)}
                      </span>
                      {isLatest && (
                        <span className="text-xs font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                          Latest
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                      <span>{analysis.ruleResult.numPlans} plans</span>
                      <span>{analysis.ruleResult.numCompetitors} competitors</span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-3">
                      {analysis.ruleResult.insights.filter(i => i.severity === 'critical').length > 0 && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                          {analysis.ruleResult.insights.filter(i => i.severity === 'critical').length} critical
                        </span>
                      )}
                      {analysis.ruleResult.insights.filter(i => i.severity === 'warning').length > 0 && (
                        <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                          {analysis.ruleResult.insights.filter(i => i.severity === 'warning').length} warning
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => selectAnalysis(analysis.id)}
                      disabled={isSelected}
                      className={`w-full text-xs font-medium py-2 rounded-lg transition-all ${
                        isSelected
                          ? 'text-slate-500 bg-slate-800/50 cursor-default'
                          : 'text-white bg-slate-800 hover:bg-slate-700'
                      }`}
                    >
                      {isSelected ? 'Currently Viewing' : 'View Report'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <button
              onClick={handleRunNewAnalysis}
              disabled={isRunning}
              className="w-full text-center text-sm font-medium py-2.5 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 text-purple-400 hover:from-purple-500/20 hover:to-blue-500/20 transition-all border border-purple-500/20 disabled:opacity-50"
            >
              {isRunning ? 'Running...' : '+ Run New Analysis'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default AnalysesV2;

