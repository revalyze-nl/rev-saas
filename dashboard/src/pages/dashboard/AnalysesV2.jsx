import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalysisV2 } from '../../context/AnalysisV2Context';
import { useAiCreditsContext } from '../../context/AiCreditsContext';
import { analysisV2Api, downloadBlob } from '../../lib/apiClient';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Legend
} from 'recharts';

// Custom Tooltip for Price Positioning Chart
const PricePositionTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-sm font-medium text-white">{data.name}</p>
      <p className="text-xs text-slate-400">
        {data.isUser ? 'Your Plan' : `Competitor: ${data.competitorName}`}
      </p>
      <p className="text-sm text-emerald-400 font-semibold mt-1">
        {data.currency}{data.price.toLocaleString()}
      </p>
    </div>
  );
};

// Custom Tooltip for Value vs Price Chart
const ValuePriceTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-sm font-medium text-white">{data.name}</p>
      <p className="text-xs text-slate-400">
        {data.isUser ? 'Your Plan' : `Competitor: ${data.competitorName}`}
      </p>
      <p className="text-sm text-emerald-400 font-semibold mt-1">
        Price: {data.currency}{data.price.toLocaleString()}
      </p>
      <p className="text-sm text-violet-400 font-semibold">
        Value Score: {data.valueScore}{data.isEstimated ? ' (estimated)' : ''}
      </p>
    </div>
  );
};

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
  const { refetch: refetchCredits } = useAiCreditsContext();
  
  const [exportingId, setExportingId] = useState(null);
  const [exportError, setExportError] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Prepare chart data from analysis
  const chartData = useMemo(() => {
    if (!selectedAnalysis?.input) return { priceData: [], valueData: [], median: null, hasData: false };

    const userPlans = selectedAnalysis.input.userPlans || [];
    const competitors = selectedAnalysis.input.competitors || [];
    
    const allPrices = [];
    const priceData = [];
    const valueData = [];
    
    // Calculate value score - uses features/units if available, otherwise price-based heuristic
    const calcValueScore = (price, featuresCount, unitsCount, isUser, index) => {
      const hasValueData = featuresCount > 0 || unitsCount > 0;
      if (hasValueData) {
        return {
          score: Math.min(100, (featuresCount * 8) + (unitsCount * 12) + 20),
          isEstimated: false
        };
      }
      // Price-based heuristic for better visual spread (matching PDF logic)
      const baseScore = 40 + ((index % 5) * 10);
      const userBonus = isUser ? 10 : 0;
      return {
        score: Math.min(100, baseScore + userBonus),
        isEstimated: true
      };
    };
    
    // Process user plans
    userPlans.forEach((plan, index) => {
      const price = plan.price_amount || plan.price || 0;
      if (price > 0) {
        allPrices.push(price);
        const currency = plan.currency || '$';
        const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
        
        const featuresCount = (plan.features || []).length;
        const unitsCount = (plan.included_units || []).length;
        const { score: valueScore, isEstimated } = calcValueScore(price, featuresCount, unitsCount, true, index);
        
        // Price Positioning: Y is constant (1) for horizontal distribution
        priceData.push({
          x: price,
          y: 1, // All points on same horizontal line
          price,
          name: plan.plan_name || plan.name || `Plan ${index + 1}`,
          isUser: true,
          competitorName: '',
          currency: currencySymbol
        });
        
        // Value vs Price: Y is value score
        valueData.push({
          x: price,
          y: valueScore,
          price,
          valueScore,
          name: plan.plan_name || plan.name || `Plan ${index + 1}`,
          isUser: true,
          competitorName: '',
          currency: currencySymbol,
          isEstimated
        });
      }
    });
    
    // Process competitor plans
    let competitorIndex = 0;
    competitors.forEach((comp) => {
      const compPlans = comp.plans || [];
      compPlans.forEach((plan) => {
        const price = plan.price_amount || plan.price || 0;
        if (price > 0) {
          allPrices.push(price);
          const currency = plan.currency || '$';
          const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
          
          const featuresCount = (plan.features || []).length;
          const unitsCount = (plan.included_units || []).length;
          const { score: valueScore, isEstimated } = calcValueScore(price, featuresCount, unitsCount, false, competitorIndex);
          
          competitorIndex++;
          // Price Positioning: Y is constant (1) for horizontal distribution
          priceData.push({
            x: price,
            y: 1, // All points on same horizontal line
            price,
            name: plan.plan_name || plan.name || `${comp.name} Plan`,
            isUser: false,
            competitorName: comp.name || 'Competitor',
            currency: currencySymbol
          });
          
          valueData.push({
            x: price,
            y: valueScore,
            price,
            valueScore,
            name: plan.plan_name || plan.name || `${comp.name} Plan`,
            isUser: false,
            competitorName: comp.name || 'Competitor',
            currency: currencySymbol,
            isEstimated
          });
        }
      });
    });
    
    // Calculate median
    const sortedPrices = [...allPrices].sort((a, b) => a - b);
    const median = sortedPrices.length > 0 
      ? sortedPrices.length % 2 === 0
        ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
        : sortedPrices[Math.floor(sortedPrices.length / 2)]
      : null;
    
    return {
      priceData,
      valueData,
      median,
      hasData: priceData.length > 0,
      hasEstimatedValues: valueData.some(d => d.isEstimated)
    };
  }, [selectedAnalysis]);

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
    if (result.success) {
      // Refresh credits to update the counter in Topbar
      refetchCredits();
    } else {
      console.error('Failed to run analysis:', result.error);
      // Also refetch credits in case of quota error
      if (result.isAICreditsError || result.isLimitError) {
        refetchCredits();
      }
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <p className="text-slate-400">Loading analysis history...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (analyses.length === 0) {
    return (
      <div className="min-h-screen">
        {/* Hero Header */}
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/10 to-transparent rounded-3xl blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
                  Pricing Analysis
                </h1>
                <p className="text-slate-400 text-lg">
                  AI-powered pricing insights and recommendations
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl p-12 border border-slate-700/50 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-violet-500/20">
                <svg className="w-12 h-12 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">No Analyses Yet</h2>
              <p className="text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                Run your first pricing analysis to get deterministic insights with AI-powered commentary.
              </p>
              <button
                onClick={handleRunNewAnalysis}
                disabled={isRunning}
                className="px-8 py-4 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-xl font-bold text-lg hover:from-violet-600 hover:to-fuchsia-700 hover:scale-[1.02] hover:shadow-xl hover:shadow-violet-500/25 transition-all disabled:opacity-50"
              >
                {isRunning ? (
                  <span className="flex items-center gap-3">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Running Analysis...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Run First Analysis
                  </span>
                )}
              </button>
              <p className="text-xs text-slate-500 mt-3 max-w-sm mx-auto">
                AI insights are advisory. Verify recommendations before implementing pricing changes.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedAnalysis) return null;

  const reportDate = formatDate(selectedAnalysis.createdAt);

  return (
    <div className="min-h-screen">
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
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-xl font-semibold hover:from-violet-600 hover:to-fuchsia-700 transition-all"
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

      {/* Hero Header */}
      <div className="relative mb-10">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/10 to-transparent rounded-3xl blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
                Pricing Analysis
              </h1>
              <p className="text-slate-400 text-lg">
                AI-powered pricing insights and recommendations
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating History Button */}
      <button
        onClick={() => setHistoryOpen(true)}
        className="fixed right-6 top-24 z-40 flex items-center gap-2 px-4 py-2.5 bg-slate-800/90 backdrop-blur-sm text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition-all border border-slate-700 shadow-lg"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        History
        <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full">
          {analyses.length}
        </span>
      </button>

      {/* History Sidebar Overlay */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setHistoryOpen(false)} />
          <aside className="relative w-full max-w-sm bg-slate-900 border-l border-slate-700 shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-violet-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-white">Analysis History</h3>
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              {analyses.map((analysis, index) => {
                const isSelected = analysis.id === selectedAnalysis?.id;
                const isLatest = index === 0;
                
                return (
                  <div
                    key={analysis.id}
                    className={`group rounded-xl border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-violet-500/50 bg-violet-500/10'
                        : 'border-slate-800 bg-slate-800/30 hover:border-slate-700'
                    }`}
                    onClick={() => {
                      selectAnalysis(analysis.id);
                      setHistoryOpen(false);
                    }}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">
                          {formatDateShort(analysis.createdAt)}
                        </span>
                        {isLatest && (
                          <span className="text-xs font-medium text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                            Latest
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                        <span>{analysis.ruleResult.numPlans} plans</span>
                        <span>{analysis.ruleResult.numCompetitors} competitors</span>
                      </div>

                      <div className="flex items-center gap-1.5">
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
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 p-4">
              <button
                onClick={() => {
                  handleRunNewAnalysis();
                  setHistoryOpen(false);
                }}
                disabled={isRunning}
                className="w-full text-center text-sm font-medium py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white hover:from-violet-600 hover:to-fuchsia-700 transition-all disabled:opacity-50"
              >
                {isRunning ? 'Running...' : '+ Run New Analysis'}
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Main Content */}
        <div className="space-y-6">
          
          {/* Report Header - Clean design */}
          <div className="bg-white/[0.02] backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50">
              <div>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-violet-400 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 px-3 py-1 rounded-full border border-violet-500/30">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Analysis Engine
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Pricing Analysis Report
                    </h2>
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
                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-400 rounded-xl font-medium hover:from-violet-500/30 hover:to-fuchsia-500/30 transition-all disabled:opacity-50 border border-violet-500/20"
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

          {/* Executive Summary - Clean, readable design */}
          {selectedAnalysis.llmOutput.executiveSummary && (
            <div className="bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-white">Executive Summary</h3>
                </div>
              </div>
              <div className="p-6">
                <p className="text-slate-300 text-[15px] leading-7 whitespace-pre-line">
                  {selectedAnalysis.llmOutput.executiveSummary}
                </p>
              </div>
            </div>
          )}

          {/* System Detected Insights (Rule Engine) */}
          {selectedAnalysis.ruleResult.insights.length > 0 && (
            <div className="bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">System Detected Insights</h3>
                    <p className="text-xs text-slate-500">Deterministic analysis</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {selectedAnalysis.ruleResult.insights.map((insight, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-xl border ${getSeverityStyle(insight.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(insight.severity)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-white">{insight.title}</h4>
                          <span className="text-xs text-slate-500 font-mono">{insight.code}</span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing Insights (LLM) - Clean readable design */}
          {selectedAnalysis.llmOutput.pricingInsights.length > 0 && (
            <div className="bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Pricing Insights</h3>
                    <p className="text-xs text-slate-500">AI-powered strategic analysis</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {selectedAnalysis.llmOutput.pricingInsights.map((insight, index) => (
                  <div key={index} className="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
                    <h4 className="font-semibold text-white mb-3 text-base">{insight.title}</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">{insight.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations (LLM) - Clean design */}
          {selectedAnalysis.llmOutput.recommendations.length > 0 && (
            <div className="bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-white">Recommendations</h3>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {selectedAnalysis.llmOutput.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-4 p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
                      <span className="text-sm font-bold text-emerald-400">{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-2 text-base">{rec.action}</h4>
                      <p className="text-sm text-slate-300 leading-relaxed">{rec.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Next Actions - Clean design */}
          {selectedAnalysis.llmOutput.suggestedNextActions?.length > 0 && (
            <div className="bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Suggested Next Actions</h3>
                    <p className="text-xs text-slate-500">Based on this analysis, here are the most impactful next steps</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {selectedAnalysis.llmOutput.suggestedNextActions.map((action, index) => (
                  <div 
                    key={index} 
                    className="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30 hover:border-cyan-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                            Action
                          </span>
                          <span className="text-xs text-slate-500 font-mono">{action.code}</span>
                        </div>
                        <h4 className="font-semibold text-white mb-2 text-base">{action.title}</h4>
                        <p className="text-sm text-slate-300 leading-relaxed">{action.description}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => navigate(`/app/simulation?action=${encodeURIComponent(action.code)}`)}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-600 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Simulate
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Visualizations */}
          {chartData.hasData && (
            <div className="space-y-6">
              {/* Price Positioning Chart */}
              <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-800">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">Price Positioning</h3>
                </div>
                
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis 
                        type="number" 
                        dataKey="x" 
                        name="Price"
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        tickFormatter={(value) => `$${value}`}
                        label={{ value: 'Price', position: 'bottom', fill: '#94a3b8', fontSize: 12, dy: 10 }}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="y" 
                        name="Plan"
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        domain={[0, 2]}
                        hide
                      />
                      <Tooltip content={<PricePositionTooltip />} />
                      {chartData.median && (
                        <ReferenceLine 
                          x={chartData.median} 
                          stroke="#8b5cf6" 
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          label={{ 
                            value: `Median: $${Math.round(chartData.median)}`, 
                            position: 'top', 
                            fill: '#8b5cf6',
                            fontSize: 11
                          }}
                        />
                      )}
                      <Scatter 
                        name="Plans" 
                        data={chartData.priceData}
                        fill="#8884d8"
                      >
                        {chartData.priceData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`}
                            fill={entry.isUser ? '#10b981' : '#64748b'}
                            stroke={entry.isUser ? '#10b981' : '#475569'}
                            strokeWidth={entry.isUser ? 2 : 1}
                            r={entry.isUser ? 8 : 6}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-xs text-slate-400">Your Plans</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-500"></div>
                    <span className="text-xs text-slate-400">Competitor Plans</span>
                  </div>
                  {chartData.median && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0.5 bg-violet-500" style={{ borderStyle: 'dashed' }}></div>
                      <span className="text-xs text-slate-400">Market Median</span>
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-slate-500 text-center mt-3">
                  Horizontal distribution of plan prices across your offerings and competitors.
                </p>
              </div>

              {/* Value vs Price Chart */}
              <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-800">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-violet-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">Value vs Price</h3>
                  {chartData.hasEstimatedValues && (
                    <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 ml-auto">
                      Contains estimated values
                    </span>
                  )}
                </div>
                
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis 
                        type="number" 
                        dataKey="x" 
                        name="Price"
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        tickFormatter={(value) => `$${value}`}
                        label={{ value: 'Price', position: 'bottom', fill: '#94a3b8', fontSize: 12, dy: 10 }}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="y" 
                        name="Value Score"
                        domain={[0, 100]}
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        label={{ value: 'Value Score', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12, dx: -5 }}
                      />
                      <Tooltip content={<ValuePriceTooltip />} />
                      <Scatter 
                        name="Plans" 
                        data={chartData.valueData}
                        fill="#8884d8"
                      >
                        {chartData.valueData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`}
                            fill={entry.isUser ? '#8b5cf6' : '#64748b'}
                            stroke={entry.isUser ? '#8b5cf6' : '#475569'}
                            strokeWidth={entry.isUser ? 2 : 1}
                            r={entry.isUser ? 8 : 6}
                            opacity={entry.isEstimated ? 0.6 : 1}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                    <span className="text-xs text-slate-400">Your Plans</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-500"></div>
                    <span className="text-xs text-slate-400">Competitor Plans</span>
                  </div>
                  {chartData.hasEstimatedValues && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-slate-500 opacity-60"></div>
                      <span className="text-xs text-slate-400">Estimated</span>
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-slate-500 text-center mt-3">
                  Compares the perceived value (based on features) against price. 
                  {chartData.hasEstimatedValues && ' Some values are estimated due to limited feature data.'}
                </p>
              </div>
            </div>
          )}

          {/* Risk Analysis (LLM) */}
          {selectedAnalysis.llmOutput.riskAnalysis.length > 0 && (
            <div className="bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-white">Risk Analysis</h3>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {selectedAnalysis.llmOutput.riskAnalysis.map((risk, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-slate-800/40 rounded-xl border border-slate-700/30">
                    <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-slate-300 leading-relaxed">{risk}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysesV2;
