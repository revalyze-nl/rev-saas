import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePlans } from '../../context/PlansContext';
import { businessMetricsApi, simulationApi, downloadBlob, AICreditsError } from '../../lib/apiClient';
import { useAiCreditsContext } from '../../context/AiCreditsContext';
import DemoBadge from '../../components/demo/DemoBadge';
import { useDemo } from '../../context/DemoContext';
import { 
  toPlanKey, 
  getActionConfig, 
  getCustomerCountForPlan,
  getTwoHighestPricedPlans,
} from '../../lib/planUtils';
import ImpactOverviewChart from '../../components/simulation/ImpactOverviewChart';
import BeforeAfterSummary from '../../components/simulation/BeforeAfterSummary';

// Helper function to humanize action codes
const humanizeActionCode = (code) => {
  if (!code) return '';
  return code
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

// Price Preset Chips Component
const PricePresetChips = ({ presets, currentPrice, onSelect, disabled }) => {
  if (!presets?.length || !currentPrice) return null;

  const calculatePrice = (preset) => {
    const match = preset.match(/([+-])(\d+)%/);
    if (!match) return null;
    const sign = match[1] === '+' ? 1 : -1;
    const percentage = parseInt(match[2]);
    const change = currentPrice * (percentage / 100) * sign;
    return Math.round((currentPrice + change) * 100) / 100;
  };

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      <span className="text-xs text-slate-500 self-center mr-1">Quick:</span>
      {presets.map((preset) => {
        const newPrice = calculatePrice(preset);
        const isIncrease = preset.startsWith('+');
        return (
          <button
            key={preset}
            type="button"
            onClick={() => onSelect(newPrice)}
            disabled={disabled || !newPrice}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isIncrease
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20'
            }`}
          >
            {preset}
          </button>
        );
      })}
    </div>
  );
};

// Sensitivity level badge component (renamed from Risk for better UX)
const SensitivityBadge = ({ level }) => {
  const styles = {
    low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const labels = {
    low: 'Low Sensitivity',
    medium: 'Moderate Sensitivity',
    high: 'High Sensitivity',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[level] || styles.medium}`}>
      {labels[level] || 'Moderate Sensitivity'}
    </span>
  );
};

// Scenario card component
const ScenarioCard = ({ scenario, currency, isPriceIncrease, isRecommended }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const scenarioColors = {
    Conservative: 'border-emerald-500/30 bg-emerald-500/5',
    Base: 'border-violet-500/30 bg-violet-500/5',
    Aggressive: 'border-orange-500/30 bg-orange-500/5',
  };

  return (
    <div className={`rounded-2xl p-5 border ${scenarioColors[scenario.name] || 'border-slate-700'} backdrop-blur-sm relative`}>
      {isRecommended && (
        <div className="absolute -top-2 left-4">
          <span className="px-2 py-0.5 text-xs font-medium bg-violet-500 text-white rounded-full">
            Recommended
          </span>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold text-white">{scenario.name}</h4>
        <SensitivityBadge level={scenario.risk_level} />
      </div>
      {isRecommended && (
        <p className="text-xs text-slate-400 mb-3 -mt-2">
          Balanced trade-off between revenue lift and churn impact.
        </p>
      )}

      <div className="space-y-3">
        <div className="p-3 rounded-xl bg-slate-800/50">
          <p className="text-xs text-slate-500 mb-1">
            {isPriceIncrease ? 'Expected Customer Loss' : 'Expected Customer Gain'}
          </p>
          <p className="text-white font-semibold">
            {isPriceIncrease
              ? `${scenario.customer_loss_min_pct}% – ${scenario.customer_loss_max_pct}%`
              : `${scenario.customer_gain_min_pct}% – ${scenario.customer_gain_max_pct}%`}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/50">
          <p className="text-xs text-slate-500 mb-1">Projected Customers</p>
          <p className="text-white font-semibold">
            {scenario.new_customer_count_min.toLocaleString()} – {scenario.new_customer_count_max.toLocaleString()}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/50">
          <p className="text-xs text-slate-500 mb-1">Projected MRR</p>
          <p className="text-white font-semibold">
            {formatCurrency(scenario.new_mrr_min)} – {formatCurrency(scenario.new_mrr_max)}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/50">
          <p className="text-xs text-slate-500 mb-1">Projected ARR (12 mo)</p>
          <p className="text-white font-semibold">
            {formatCurrency(scenario.new_arr_min)} – {formatCurrency(scenario.new_arr_max)}
          </p>
        </div>
      </div>
    </div>
  );
};

// Simulation result component
const SimulationResult = ({ result, onDownloadPdf, isPdfLoading, isDemoMode }) => {
  if (!result) return null;

  const formatCurrency = (value, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const isPriceIncrease = result.price_change_pct >= 0;
  const changeSign = isPriceIncrease ? '+' : '';

  const riskLevels = { low: 1, medium: 2, high: 3 };
  const overallRisk = result.scenarios?.reduce((highest, sc) => {
    const level = sc.risk_level || 'medium';
    return riskLevels[level] > riskLevels[highest] ? level : highest;
  }, 'low');

  return (
    <div className="space-y-6">
      {/* Header Summary Card */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition-opacity" />
        <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">{result.plan_name}</h3>
              <div className="flex items-center gap-3 text-lg">
                <span className="text-slate-400">
                  {formatCurrency(result.current_price, result.currency)}
                </span>
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <span className="text-white font-semibold">
                  {formatCurrency(result.new_price, result.currency)}
                </span>
                <span className="text-slate-500">/ month</span>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
              <div className={`text-2xl font-bold ${isPriceIncrease ? 'text-emerald-400' : 'text-blue-400'}`}>
                {changeSign}{result.price_change_pct?.toFixed(1)}%
              </div>
              <SensitivityBadge level={overallRisk} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-700/50">
            <div>
              <p className="text-xs text-slate-500">Current Customers</p>
              <p className="text-white font-semibold">{result.active_customers_on_plan?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Global MRR</p>
              <p className="text-white font-semibold">{formatCurrency(result.global_mrr, result.currency)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Current Churn</p>
              <p className="text-white font-semibold">{result.global_churn_rate}%</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <div className="relative group/pdf inline-block">
              <button
                onClick={onDownloadPdf}
                disabled={isPdfLoading}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
              >
                {isPdfLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download Simulation PDF</span>
                  </>
                )}
              </button>
              {/* Demo mode tooltip */}
              {isDemoMode && !isPdfLoading && (
                <div className="absolute bottom-full left-0 mb-2 w-56 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover/pdf:opacity-100 group-hover/pdf:visible transition-all pointer-events-none z-20">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-slate-300">
                      PDF will be labeled as demo data with a watermark
                    </p>
                  </div>
                  <div className="absolute bottom-0 left-6 transform translate-y-1/2 rotate-45 w-2 h-2 bg-slate-800 border-r border-b border-slate-700" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Data Visualization Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <BeforeAfterSummary result={result} />
        <ImpactOverviewChart 
          scenarios={result.scenarios} 
          currency={result.currency}
          isPriceIncrease={isPriceIncrease}
        />
      </div>

      {/* Scenario Cards */}
      <div className="grid lg:grid-cols-3 gap-4">
        {result.scenarios?.map((scenario) => (
          <ScenarioCard
            key={scenario.name}
            scenario={scenario}
            currency={result.currency}
            isPriceIncrease={isPriceIncrease}
            isRecommended={scenario.name === 'Base'}
          />
        ))}
      </div>

      {/* AI Narrative */}
      {result.ai_narrative && (
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition-opacity" />
          <div className="relative bg-gradient-to-br from-violet-500/5 via-slate-900/60 to-fuchsia-500/5 rounded-2xl p-6 border border-violet-500/20">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-white">AI Pricing Insights</h4>
            </div>
            <div className="text-slate-300 leading-relaxed whitespace-pre-line">
              {result.ai_narrative}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// History item component
const HistoryItem = ({ simulation, onClick, isActive }) => {
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const changeSign = simulation.price_change_pct >= 0 ? '+' : '';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl transition-all ${
        isActive
          ? 'bg-violet-500/10 border-2 border-violet-500/50'
          : 'bg-slate-800/30 hover:bg-slate-800/50 border border-transparent hover:border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-white font-medium text-sm">{simulation.plan_name}</span>
        <span className={`text-xs font-bold ${simulation.price_change_pct >= 0 ? 'text-emerald-400' : 'text-blue-400'}`}>
          {changeSign}{simulation.price_change_pct?.toFixed(1)}%
        </span>
      </div>
      <p className="text-xs text-slate-500">{formatDate(simulation.created_at)}</p>
    </button>
  );
};

// Main component
const PricingSimulation = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { plans, isLoading: plansLoading, addPlan } = usePlans();
  const { credits, loading: creditsLoading, refetch: refetchCredits } = useAiCreditsContext();
  const { isDemoMode } = useDemo();

  const actionCode = searchParams.get('action');
  const [showActionBanner, setShowActionBanner] = useState(true);

  // Form state
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [activeCustomers, setActiveCustomers] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [customerCountInfo, setCustomerCountInfo] = useState(null);
  const [actionPrefillApplied, setActionPrefillApplied] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const dismissActionBanner = () => {
    setShowActionBanner(false);
    searchParams.delete('action');
    setSearchParams(searchParams, { replace: true });
  };

  // Business metrics
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Results
  const [currentResult, setCurrentResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // PDF download state
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const simulationsEnabled = credits?.simulationsEnabled ?? true;
  const selectedPlan = plans?.find((p) => p.id === selectedPlanId);
  const actionConfig = useMemo(() => getActionConfig(actionCode), [actionCode]);

  const presetChips = useMemo(() => {
    if (!actionConfig || !showActionBanner) return null;
    return actionConfig.presetChips;
  }, [actionConfig, showActionBanner]);

  // Fetch business metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data } = await businessMetricsApi.get();
        setMetrics(data);
      } catch (err) {
        console.error('Failed to fetch metrics:', err);
      } finally {
        setMetricsLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  // Fetch simulation history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await simulationApi.list(5);
        setHistory(data || []);
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Apply prefill when action code, plans, and metrics are ready
  useEffect(() => {
    if (actionPrefillApplied || plansLoading || metricsLoading || !plans?.length) return;
    if (!actionCode || !actionConfig) {
      setActionPrefillApplied(true);
      return;
    }

    if (!actionConfig.planSelector) {
      setActionPrefillApplied(true);
      return;
    }

    const targetPlan = actionConfig.planSelector(plans);
    if (targetPlan) {
      setSelectedPlanId(targetPlan.id);
      const countInfo = getCustomerCountForPlan(targetPlan, plans, metrics);
      setCustomerCountInfo(countInfo);
      if (countInfo.count !== null) {
        setActiveCustomers(countInfo.count.toString());
      }
    }
    setActionPrefillApplied(true);
  }, [actionCode, actionConfig, plans, metrics, plansLoading, metricsLoading, actionPrefillApplied]);

  const updateCustomerCountForPlan = useCallback((plan) => {
    if (!plan) {
      setCustomerCountInfo(null);
      return;
    }
    const countInfo = getCustomerCountForPlan(plan, plans, metrics);
    setCustomerCountInfo(countInfo);
    if (countInfo.count !== null) {
      setActiveCustomers(countInfo.count.toString());
    } else {
      setActiveCustomers('');
    }
  }, [plans, metrics]);

  const handlePlanChange = (e) => {
    const planId = e.target.value;
    setSelectedPlanId(planId);
    setFormError('');
    setNewPrice('');
    const plan = plans?.find((p) => p.id === planId);
    updateCustomerCountForPlan(plan);
  };

  const handlePresetSelect = (price) => {
    if (price) setNewPrice(price.toString());
  };
  
  const canSubmit = useMemo(() => {
    if (!selectedPlanId) return false;
    if (!newPrice || parseFloat(newPrice) < 0) return false;
    const customerCount = parseInt(activeCustomers);
    if (!activeCustomers || isNaN(customerCount) || customerCount <= 0) return false;
    return true;
  }, [selectedPlanId, newPrice, activeCustomers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setFormError('');
    setQuotaExceeded(false);
    setIsSubmitting(true);

    try {
      const { data } = await simulationApi.run({
        planId: selectedPlanId,
        currentPrice: selectedPlan.price,
        newPrice: parseFloat(newPrice),
        currency: selectedPlan.currency || 'USD',
        activeCustomersOnPlan: parseInt(activeCustomers),
        globalMrr: metrics?.mrr || 0,
        globalChurnRate: metrics?.monthly_churn_rate || 5,
        pricingGoal: metrics?.pricing_goal || 'revenue',
      });

      setCurrentResult(data);
      setHistory((prev) => [data, ...prev.slice(0, 4)]);
      refetchCredits();
    } catch (err) {
      if (err instanceof AICreditsError && err.code === 'AI_QUOTA_EXCEEDED') {
        setQuotaExceeded(true);
        refetchCredits();
      } else {
        setFormError(err.message || 'Failed to run simulation');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadHistoryItem = (simulation) => setCurrentResult(simulation);

  const handleDownloadPdf = async () => {
    if (!currentResult?.id) return;
    setIsPdfLoading(true);
    try {
      const { ok, blob } = await simulationApi.exportPdf(currentResult.id);
      if (ok && blob) {
        const planName = currentResult.plan_name?.replace(/\s+/g, '-').toLowerCase() || 'simulation';
        const date = new Date(currentResult.created_at).toISOString().split('T')[0].replace(/-/g, '');
        downloadBlob(blob, `pricing-simulation-${planName}-${date}.pdf`);
      }
    } catch (err) {
      console.error('Failed to download PDF:', err);
    } finally {
      setIsPdfLoading(false);
    }
  };

  const formatPrice = (price, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  if (creditsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!simulationsEnabled) {
    return (
      <div className="min-h-screen">
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/10 to-transparent rounded-3xl blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
                    Pricing Simulation
                  </h1>
                  <DemoBadge />
                </div>
                <p className="text-slate-400 text-lg">
                  Test new price points before rolling them out
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-600 to-orange-600 rounded-3xl blur opacity-20" />
            <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl p-12 border border-amber-500/30 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-500/30">
                <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Simulations Not Available</h2>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                Pricing simulations are only available on Growth and Enterprise plans. 
                Upgrade to test new price points in a safe sandbox environment.
              </p>
              <button
                onClick={() => navigate('/app/billing')}
                className="px-8 py-4 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-xl font-bold text-lg hover:from-violet-600 hover:to-fuchsia-700 hover:scale-[1.02] transition-all shadow-lg shadow-violet-500/25"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative mb-10">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/10 to-transparent rounded-3xl blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
                  Pricing Simulation
                </h1>
                <p className="text-slate-400 text-lg">
                  Test new price points before rolling them out
                </p>
              </div>
            </div>
            {credits && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${
                credits.remainingCredits === 0
                  ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                  : credits.remainingCredits <= 2
                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                  : 'bg-slate-800/50 border border-slate-700 text-slate-400'
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>{credits.remainingCredits} credits</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Suggested Action Banner */}
      {actionCode && showActionBanner && (
        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-indigo-400 font-medium mb-0.5">Suggested from your analysis</p>
                <p className="text-white font-medium">{humanizeActionCode(actionCode)}</p>
              </div>
            </div>
            <button onClick={dismissActionBanner} className="text-slate-400 hover:text-white transition-colors p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Quota Exceeded */}
      {quotaExceeded && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-red-400 font-semibold mb-1">AI Credits Exhausted</h4>
              <p className="text-red-300/80 text-sm mb-3">You've used all your AI credits for this month.</p>
              <button
                onClick={() => navigate('/app/billing')}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm transition-all"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-bold text-white mb-4">New Simulation</h3>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Plan Selector */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Select Plan</label>
                  <select
                    value={selectedPlanId}
                    onChange={handlePlanChange}
                    disabled={plansLoading || isSubmitting}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all disabled:opacity-50"
                  >
                    <option value="">Choose a plan...</option>
                    {plans?.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - {formatPrice(plan.price, plan.currency)}
                      </option>
                    ))}
                  </select>

                  {selectedPlan && (
                    <div className="mt-2 p-3 rounded-lg bg-slate-800/50 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Current Price</span>
                        <span className="text-white font-medium">
                          {formatPrice(selectedPlan.price, selectedPlan.currency)} / month
                        </span>
                      </div>
                      {selectedPlan.interval && selectedPlan.interval !== 'month' && selectedPlan.interval !== 'monthly' && (
                        <p className="text-xs text-slate-500 mt-1">
                          Displayed as monthly equivalent. Billed {selectedPlan.interval}.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* New Price */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    New Price {selectedPlan && <span className="text-slate-500 font-normal">({selectedPlan.currency || 'USD'})</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newPrice}
                    onChange={(e) => { setNewPrice(e.target.value); setFormError(''); }}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all disabled:opacity-50"
                    placeholder="Enter new price"
                  />
                  {selectedPlan && presetChips && (
                    <PricePresetChips
                      presets={presetChips}
                      currentPrice={selectedPlan.price}
                      onSelect={handlePresetSelect}
                      disabled={isSubmitting}
                    />
                  )}
                </div>

                {/* Active Customers */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Active Customers on This Plan
                    {customerCountInfo?.source === 'estimated' && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">Estimated</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={activeCustomers}
                    onChange={(e) => { setActiveCustomers(e.target.value); setFormError(''); }}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all disabled:opacity-50"
                    placeholder="e.g., 500"
                  />
                  {customerCountInfo?.message && (
                    <p className="mt-1.5 text-xs text-slate-500">{customerCountInfo.message}</p>
                  )}
                </div>

                {/* Business Metrics Summary */}
                {metrics && (
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-3">Business Metrics</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-slate-500">MRR</p>
                        <p className="text-white font-medium">{formatPrice(metrics.mrr || 0, metrics.currency)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Churn</p>
                        <p className="text-white font-medium">{metrics.monthly_churn_rate || 0}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Goal</p>
                        <p className="text-white font-medium capitalize">{metrics.pricing_goal || 'Revenue'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {formError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-red-400 text-sm">{formError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !canSubmit}
                  className="w-full px-6 py-4 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-xl font-bold text-lg hover:from-violet-600 hover:to-fuchsia-700 hover:scale-[1.02] transition-all shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Running Simulation...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Run Simulation
                    </span>
                  )}
                </button>
                <p className="text-xs text-slate-500 mt-3 text-center">
                  Estimates based on your inputs. Actual results may vary.
                </p>
              </form>
            </div>
          </div>

          {/* History */}
          {!historyLoading && history.length > 0 && (
            <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">Recent Simulations</h3>
              <div className="space-y-2">
                {history.map((sim) => (
                  <HistoryItem
                    key={sim.id}
                    simulation={sim}
                    onClick={() => loadHistoryItem(sim)}
                    isActive={currentResult?.id === sim.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Results */}
        <div className="lg:col-span-3">
          {currentResult ? (
            <SimulationResult
              result={currentResult}
              onDownloadPdf={handleDownloadPdf}
              isPdfLoading={isPdfLoading}
              isDemoMode={isDemoMode}
            />
          ) : (
            <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl p-12 border border-slate-800 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-violet-500/20">
                <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Simulate a Price Change</h3>
              <p className="text-slate-400 mb-2 max-w-sm mx-auto">
                Select a plan from the left panel and enter a new price to see projected impact on revenue and churn.
              </p>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                For accurate projections, set customer counts per plan in Business Metrics.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingSimulation;
