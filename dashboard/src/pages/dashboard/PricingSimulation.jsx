import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePlans } from '../../context/PlansContext';
import { businessMetricsApi, simulationApi, downloadBlob, AICreditsError } from '../../lib/apiClient';
import { useAiCredits } from '../../hooks/useAiCredits';
import { 
  toPlanKey, 
  getActionConfig, 
  getCustomerCountForPlan,
  getTwoHighestPricedPlans,
} from '../../lib/planUtils';

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

// Action Guidance Banner Component (different from suggested action banner)
const ActionGuidanceBanner = ({ config, onDismiss }) => {
  if (!config?.bannerText) return null;

  const isInformational = config.mode === 'informational';
  const isIntermediateTier = config.mode === 'intermediate_tier';

  return (
    <div className={`rounded-xl p-4 mb-4 ${
      isInformational
        ? 'bg-amber-500/10 border border-amber-500/30'
        : isIntermediateTier
        ? 'bg-purple-500/10 border border-purple-500/30'
        : 'bg-blue-500/10 border border-blue-500/30'
    }`}>
      <div className="flex items-start gap-3">
        <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
          isInformational ? 'text-amber-400' : isIntermediateTier ? 'text-purple-400' : 'text-blue-400'
        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          <p className={`text-sm ${
            isInformational ? 'text-amber-300' : isIntermediateTier ? 'text-purple-300' : 'text-blue-300'
          }`}>
            {config.bannerText}
          </p>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-slate-400 hover:text-white p-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

// Customer Count Input Component with warnings and estimates
const CustomerCountInput = ({ 
  value, 
  onChange, 
  disabled, 
  customerCountInfo,
  onValidationChange,
}) => {
  const isEstimated = customerCountInfo?.source === 'estimated';
  const isMissing = customerCountInfo?.source === 'missing' && !value;
  const hasWarning = isMissing && !value;

  // Notify parent about validation state
  useEffect(() => {
    if (onValidationChange) {
      const isValid = value && parseInt(value) > 0;
      onValidationChange(isValid);
    }
  }, [value, onValidationChange]);

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-300 mb-2">
        Active Customers on This Plan
        {isEstimated && (
          <span className="ml-2 px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">
            Estimated
          </span>
        )}
      </label>
      <input
        type="number"
        min="1"
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-4 py-3 rounded-xl bg-slate-900/50 border text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50 ${
          hasWarning
            ? 'border-amber-500/50 focus:border-amber-500'
            : 'border-slate-700 focus:border-blue-500'
        }`}
        placeholder="e.g., 500"
      />
      
      {/* Helper/Warning Messages */}
      {customerCountInfo?.message && (
        <p className={`mt-1.5 text-xs ${
          isMissing ? 'text-amber-400' : 'text-slate-500'
        }`}>
          {isMissing && (
            <svg className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          {customerCountInfo.message}
        </p>
      )}
    </div>
  );
};

// Currency options for dropdown
const CURRENCY_OPTIONS = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
];

// Intermediate Tier Mode UI Component
const IntermediateTierForm = ({ basePlans, onCancel, addPlan, currency = 'EUR' }) => {
  const [tierName, setTierName] = useState('');
  const [tierPrice, setTierPrice] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  const lowerPlan = basePlans?.[0];
  const upperPlan = basePlans?.[1];
  const defaultCurrency = lowerPlan?.currency || upperPlan?.currency || currency;
  
  // State for selected currency - default to detected currency from other plans
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);
  
  const suggestedPrice = lowerPlan && upperPlan 
    ? Math.round((lowerPlan.price + upperPlan.price) / 2) 
    : null;

  const formatCurrency = (price, currencyCode = selectedCurrency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const canCreate = tierName.trim() && tierPrice && parseFloat(tierPrice) > 0 && !isCreating;

  const handleCreatePlan = async () => {
    if (!canCreate) return;
    
    setIsCreating(true);
    setCreateError(null);
    
    try {
      const result = await addPlan({
        name: tierName.trim(),
        price: parseFloat(tierPrice),
        currency: selectedCurrency,
        interval: 'monthly',
      });
      
      if (result.success) {
        setCreateSuccess(true);
        setTierName('');
        setTierPrice('');
        // Auto-dismiss success after 3 seconds
        setTimeout(() => setCreateSuccess(false), 3000);
      } else {
        setCreateError(result.error || 'Failed to create plan');
      }
    } catch (err) {
      setCreateError(err.message || 'Failed to create plan');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-purple-500/5 rounded-xl border border-purple-500/20">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-purple-400">New Intermediate Tier</h4>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-white"
        >
          Cancel
        </button>
      </div>

      {lowerPlan && upperPlan && (
        <p className="text-xs text-slate-400">
          Creating a tier between{' '}
          <span className="text-white">{lowerPlan.name}</span> ({formatCurrency(lowerPlan.price, lowerPlan.currency)}) and{' '}
          <span className="text-white">{upperPlan.name}</span> ({formatCurrency(upperPlan.price, upperPlan.currency)})
        </p>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">New Tier Name</label>
        <input
          type="text"
          value={tierName}
          onChange={(e) => setTierName(e.target.value)}
          placeholder="e.g., Professional"
          className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all text-sm"
        />
      </div>

      {/* New Tier Price with Currency Dropdown */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">New Tier Price</label>
        <div className="flex gap-2 w-full">
          {/* Currency Dropdown */}
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="w-20 flex-shrink-0 px-2 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all text-sm appearance-none cursor-pointer"
          >
            {CURRENCY_OPTIONS.map((curr) => (
              <option key={curr.code} value={curr.code}>
                {curr.code}
              </option>
            ))}
          </select>
          
          {/* Price Input */}
          <input
            type="number"
            min="0"
            step="0.01"
            value={tierPrice}
            onChange={(e) => setTierPrice(e.target.value)}
            placeholder="Enter price"
            className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all text-sm"
          />
        </div>
        {suggestedPrice && (
          <div className="mt-2 flex items-center gap-2">
            <p className="text-xs text-slate-500">
              Midpoint: {formatCurrency(suggestedPrice)}
            </p>
            <button
              type="button"
              onClick={() => setTierPrice(suggestedPrice.toString())}
              className="text-xs text-purple-400 hover:text-purple-300 underline"
            >
              Use this
            </button>
          </div>
        )}
      </div>

      {/* Success Message */}
      {createSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-emerald-400 font-medium">Plan created successfully!</p>
          </div>
          <p className="text-xs text-emerald-300/70 mt-1">
            You can now select it from the plans dropdown to run simulations.
          </p>
        </div>
      )}

      {/* Error Message */}
      {createError && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <p className="text-sm text-red-400">{createError}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 space-y-3">
        <button
          type="button"
          onClick={handleCreatePlan}
          disabled={!canCreate}
          className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-medium text-sm hover:from-purple-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isCreating ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create This Plan
            </>
          )}
        </button>
        
        <p className="text-xs text-slate-500 text-center">
          {createSuccess 
            ? 'Click Cancel to exit and select your new plan from the dropdown.'
            : 'After creating the plan, you can simulate price changes on it.'}
        </p>
      </div>

      {/* Info Box */}
      <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <p className="text-xs text-slate-400">
          <svg className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <strong className="text-slate-300">Tip:</strong> An intermediate tier helps capture customers 
          who find the gap between your existing plans too large.
        </p>
      </div>
    </div>
  );
};

// Suggested Action Banner Component
const SuggestedActionBanner = ({ actionCode, onDismiss }) => {
  if (!actionCode) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-indigo-400 font-medium mb-0.5">Suggested action from your latest analysis</p>
            <p className="text-white font-medium">{humanizeActionCode(actionCode)}</p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white transition-colors p-1"
          title="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Risk level badge component
const RiskBadge = ({ level }) => {
  const styles = {
    low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[level] || styles.medium}`}>
      {level?.charAt(0).toUpperCase() + level?.slice(1)} Risk
    </span>
  );
};

// Scenario card component
const ScenarioCard = ({ scenario, currency, isPriceIncrease }) => {
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
    Base: 'border-blue-500/30 bg-blue-500/5',
    Aggressive: 'border-orange-500/30 bg-orange-500/5',
  };

  return (
    <div className={`rounded-xl p-5 border ${scenarioColors[scenario.name] || 'border-slate-700'}`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-white">{scenario.name}</h4>
        <RiskBadge level={scenario.risk_level} />
      </div>

      <div className="space-y-3">
        {/* Customer Impact */}
        <div className="p-3 rounded-lg bg-slate-800/50">
          <p className="text-xs text-slate-500 mb-1">
            {isPriceIncrease ? 'Expected Customer Loss' : 'Expected Customer Gain'}
          </p>
          <p className="text-white font-semibold">
            {isPriceIncrease
              ? `${scenario.customer_loss_min_pct}% – ${scenario.customer_loss_max_pct}%`
              : `${scenario.customer_gain_min_pct}% – ${scenario.customer_gain_max_pct}%`}
          </p>
        </div>

        {/* Customer Count */}
        <div className="p-3 rounded-lg bg-slate-800/50">
          <p className="text-xs text-slate-500 mb-1">Projected Customers</p>
          <p className="text-white font-semibold">
            {scenario.new_customer_count_min.toLocaleString()} – {scenario.new_customer_count_max.toLocaleString()}
          </p>
        </div>

        {/* MRR */}
        <div className="p-3 rounded-lg bg-slate-800/50">
          <p className="text-xs text-slate-500 mb-1">Projected MRR</p>
          <p className="text-white font-semibold">
            {formatCurrency(scenario.new_mrr_min)} – {formatCurrency(scenario.new_mrr_max)}
          </p>
        </div>

        {/* ARR */}
        <div className="p-3 rounded-lg bg-slate-800/50">
          <p className="text-xs text-slate-500 mb-1">Projected ARR (12 mo)</p>
          <p className="text-white font-semibold">
            {formatCurrency(scenario.new_arr_min)} – {formatCurrency(scenario.new_arr_max)}
          </p>
        </div>

        {/* Churn */}
        <div className="p-3 rounded-lg bg-slate-800/50">
          <p className="text-xs text-slate-500 mb-1">Estimated Churn</p>
          <p className="text-white font-semibold">
            {scenario.estimated_churn_min_pct}% – {scenario.estimated_churn_max_pct}%
          </p>
        </div>
      </div>
    </div>
  );
};

// Simulation result component
const SimulationResult = ({ result, onDownloadPdf, isPdfLoading }) => {
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

  // Derive overall risk (highest among scenarios)
  const riskLevels = { low: 1, medium: 2, high: 3 };
  const overallRisk = result.scenarios?.reduce((highest, sc) => {
    const level = sc.risk_level || 'medium';
    return riskLevels[level] > riskLevels[highest] ? level : highest;
  }, 'low');

  return (
    <div className="space-y-6">
      {/* Header Summary Card */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800">
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
            <RiskBadge level={overallRisk} />
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

        {/* Download PDF Button */}
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <button
            onClick={onDownloadPdf}
            disabled={isPdfLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPdfLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
        </div>
      </div>

      {/* Scenario Cards */}
      <div className="grid lg:grid-cols-3 gap-4">
        {result.scenarios?.map((scenario) => (
          <ScenarioCard
            key={scenario.name}
            scenario={scenario}
            currency={result.currency}
            isPriceIncrease={isPriceIncrease}
          />
        ))}
      </div>

      {/* AI Narrative */}
      {result.ai_narrative && (
        <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl p-6 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h4 className="text-lg font-semibold text-white">AI Pricing Insights</h4>
          </div>
          <div className="text-slate-300 leading-relaxed whitespace-pre-line">
            {result.ai_narrative}
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
      className={`w-full text-left p-3 rounded-lg transition-all ${
        isActive
          ? 'bg-blue-500/20 border border-blue-500/30'
          : 'bg-slate-800/30 hover:bg-slate-800/50 border border-transparent'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-white font-medium text-sm">{simulation.plan_name}</span>
        <span className={`text-xs font-medium ${simulation.price_change_pct >= 0 ? 'text-emerald-400' : 'text-blue-400'}`}>
          {changeSign}{simulation.price_change_pct?.toFixed(1)}%
        </span>
      </div>
      <p className="text-xs text-slate-500">{formatDate(simulation.created_at)}</p>
    </button>
  );
};

// Locked Feature Component
const LockedFeature = ({ onUpgrade }) => (
  <div className="max-w-2xl mx-auto">
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-12 border border-slate-800 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-500/30">
        <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">
        Pricing Simulations Not Available
      </h2>
      <p className="text-slate-400 mb-6 max-w-md mx-auto">
        Pricing simulations are only available on Growth and Enterprise plans. 
        Upgrade to test new price points in a safe sandbox environment.
      </p>
      <button
        onClick={onUpgrade}
        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 hover:scale-105 transition-all shadow-lg shadow-blue-500/20"
      >
        Upgrade Now
      </button>
    </div>
  </div>
);

// Quota Exceeded Alert Component
const QuotaExceededAlert = ({ onUpgrade, onDismiss }) => (
  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
    <div className="flex items-start gap-3">
      <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div className="flex-1">
        <h4 className="text-red-400 font-semibold mb-1">AI Insight Credits Exhausted</h4>
        <p className="text-red-300/80 text-sm mb-3">
          You've used all your AI Insight Credits for this month on your current plan.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={onUpgrade}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm transition-all"
          >
            Upgrade Plan
          </button>
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-300 text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Credits Info Badge Component
const CreditsInfoBadge = ({ credits, loading }) => {
  if (loading || !credits) return null;
  
  const isLow = credits.remainingCredits <= 2;
  const isEmpty = credits.remainingCredits === 0;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
      isEmpty
        ? 'bg-red-500/10 border border-red-500/30 text-red-400'
        : isLow
        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
        : 'bg-slate-800/50 border border-slate-700 text-slate-400'
    }`}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
      <span>{credits.remainingCredits} credits remaining</span>
    </div>
  );
};

// Main component
const PricingSimulation = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { plans, isLoading: plansLoading, addPlan } = usePlans();
  const { credits, loading: creditsLoading, refetch: refetchCredits } = useAiCredits();

  // Get action code from URL query param
  const actionCode = searchParams.get('action');
  const [showActionBanner, setShowActionBanner] = useState(true);
  const [showGuidanceBanner, setShowGuidanceBanner] = useState(true);

  // Form state
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [activeCustomers, setActiveCustomers] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Customer count validation state
  const [customerCountValid, setCustomerCountValid] = useState(false);
  const [customerCountInfo, setCustomerCountInfo] = useState(null);

  // Intermediate tier mode state
  const [intermediateTierMode, setIntermediateTierMode] = useState(false);
  const [intermediateTierBasePlans, setIntermediateTierBasePlans] = useState([]);

  // Track if action prefill has been applied
  const [actionPrefillApplied, setActionPrefillApplied] = useState(false);

  // AI Credits error state
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // Dismiss action banner and remove query param
  const dismissActionBanner = () => {
    setShowActionBanner(false);
    // Remove the action param from URL
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
  const [pdfError, setPdfError] = useState('');

  // Check if simulations are enabled for the user's plan
  const simulationsEnabled = credits?.simulationsEnabled ?? true; // Default to true while loading

  // Get selected plan details
  const selectedPlan = plans?.find((p) => p.id === selectedPlanId);

  // Get action configuration
  const actionConfig = useMemo(() => getActionConfig(actionCode), [actionCode]);

  // Get preset chips based on action
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

  // ═══════════════════════════════════════════════════════════════════════════════
  // ACTION-BASED PREFILL LOGIC
  // Apply prefill when action code, plans, and metrics are ready
  // ═══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // Only run once when all data is ready
    if (actionPrefillApplied || plansLoading || metricsLoading || !plans?.length) {
      return;
    }

    // No action code, nothing to prefill
    if (!actionCode || !actionConfig) {
      setActionPrefillApplied(true);
      return;
    }

    // Handle intermediate tier mode
    if (actionConfig.mode === 'intermediate_tier') {
      setIntermediateTierMode(true);
      const basePlans = actionConfig.baseTierSelector?.(plans) || getTwoHighestPricedPlans(plans);
      setIntermediateTierBasePlans(basePlans);
      setActionPrefillApplied(true);
      return;
    }

    // Handle informational mode (no plan selection)
    if (actionConfig.mode === 'informational' || !actionConfig.planSelector) {
      setActionPrefillApplied(true);
      return;
    }

    // Select plan based on action config
    const targetPlan = actionConfig.planSelector(plans);
    if (targetPlan) {
      setSelectedPlanId(targetPlan.id);
      
      // Prefill customer count with safe defaults
      const countInfo = getCustomerCountForPlan(targetPlan, plans, metrics);
      setCustomerCountInfo(countInfo);
      
      if (countInfo.count !== null) {
        setActiveCustomers(countInfo.count.toString());
      } else {
        setActiveCustomers('');
      }
    }

    setActionPrefillApplied(true);
  }, [actionCode, actionConfig, plans, metrics, plansLoading, metricsLoading, actionPrefillApplied]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CUSTOMER COUNT SAFE DEFAULT LOGIC
  // Update customer count info when plan selection changes
  // ═══════════════════════════════════════════════════════════════════════════════
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

  // Handle plan selection change with prefill logic
  const handlePlanChange = (e) => {
    const planId = e.target.value;
    setSelectedPlanId(planId);
    setFormError('');
    setNewPrice(''); // Clear price when plan changes

    // Apply customer count safe defaults
    const plan = plans?.find((p) => p.id === planId);
    updateCustomerCountForPlan(plan);
  };

  // Handle preset chip selection
  const handlePresetSelect = (price) => {
    if (price) {
      setNewPrice(price.toString());
    }
  };

  // Cancel intermediate tier mode
  const cancelIntermediateTierMode = () => {
    setIntermediateTierMode(false);
    setIntermediateTierBasePlans([]);
  };

  // Validate form - updated to handle missing customer count properly
  const validate = () => {
    // Skip validation in intermediate tier mode (conceptual only)
    if (intermediateTierMode) {
      return false; // Can't run simulation in intermediate tier mode
    }
    
    if (!selectedPlanId) {
      setFormError('Please select a plan');
      return false;
    }
    if (!newPrice || parseFloat(newPrice) < 0) {
      setFormError('Please enter a valid new price');
      return false;
    }
    // Customer count must be > 0 (never treat empty/0 as valid for missing data)
    const customerCount = parseInt(activeCustomers);
    if (!activeCustomers || isNaN(customerCount) || customerCount <= 0) {
      setFormError('Please enter a valid number of customers (must be at least 1)');
      return false;
    }
    return true;
  };
  
  // Check if form can be submitted
  const canSubmit = useMemo(() => {
    if (intermediateTierMode) return false;
    if (!selectedPlanId) return false;
    if (!newPrice || parseFloat(newPrice) < 0) return false;
    const customerCount = parseInt(activeCustomers);
    if (!activeCustomers || isNaN(customerCount) || customerCount <= 0) return false;
    return true;
  }, [intermediateTierMode, selectedPlanId, newPrice, activeCustomers]);

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setQuotaExceeded(false);

    if (!validate()) return;

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
      // Add to history
      setHistory((prev) => [data, ...prev.slice(0, 4)]);
      // Refetch credits after successful simulation
      refetchCredits();
    } catch (err) {
      // Handle AI credits errors
      if (err instanceof AICreditsError) {
        if (err.code === 'AI_QUOTA_EXCEEDED') {
          setQuotaExceeded(true);
          refetchCredits();
        } else if (err.code === 'SIMULATION_NOT_AVAILABLE') {
          // This shouldn't happen if we're checking simulationsEnabled, but handle it anyway
          setFormError('Pricing simulations are only available on Growth and Enterprise plans.');
        }
      } else {
        setFormError(err.message || 'Failed to run simulation');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load history item
  const loadHistoryItem = (simulation) => {
    setCurrentResult(simulation);
  };

  // Handle PDF download
  const handleDownloadPdf = async () => {
    if (!currentResult?.id) return;

    setIsPdfLoading(true);
    setPdfError('');

    try {
      const { ok, blob } = await simulationApi.exportPdf(currentResult.id);
      if (ok && blob) {
        // Generate filename
        const planName = currentResult.plan_name?.replace(/\s+/g, '-').toLowerCase() || 'simulation';
        const date = new Date(currentResult.created_at).toISOString().split('T')[0].replace(/-/g, '');
        const filename = `pricing-simulation-${planName}-${date}.pdf`;
        
        downloadBlob(blob, filename);
      }
    } catch (err) {
      console.error('Failed to download PDF:', err);
      setPdfError(err.message || 'Failed to generate PDF');
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

  // Show loading state while checking if simulations are enabled
  if (creditsLoading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show locked feature screen if simulations are not enabled
  if (!simulationsEnabled) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Pricing Simulation</h1>
          <p className="text-slate-400">
            Test new price points before rolling them out. See projected impact on customers, MRR, and churn.
          </p>
        </div>
        <LockedFeature onUpgrade={() => navigate('/app/billing')} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Pricing Simulation</h1>
          <p className="text-slate-400">
            Test new price points before rolling them out. See projected impact on customers, MRR, and churn.
          </p>
        </div>
        <CreditsInfoBadge credits={credits} loading={creditsLoading} />
      </div>

      {/* Suggested Action Banner */}
      {actionCode && showActionBanner && (
        <SuggestedActionBanner 
          actionCode={actionCode}
          onDismiss={dismissActionBanner}
        />
      )}
      
      {/* Action-Specific Guidance Banner */}
      {actionConfig && showGuidanceBanner && actionConfig.bannerText && (
        <ActionGuidanceBanner 
          config={actionConfig}
          onDismiss={() => setShowGuidanceBanner(false)}
        />
      )}

      {/* Quota Exceeded Alert */}
      {quotaExceeded && (
        <QuotaExceededAlert 
          onUpgrade={() => navigate('/app/billing')}
          onDismiss={() => setQuotaExceeded(false)}
        />
      )}

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Simulation Form */}
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800">
            <h3 className="text-lg font-semibold text-white mb-4">
              {intermediateTierMode ? 'New Intermediate Tier' : 'New Simulation'}
            </h3>

            {/* Intermediate Tier Mode */}
            {intermediateTierMode ? (
              <IntermediateTierForm 
                basePlans={intermediateTierBasePlans}
                onCancel={cancelIntermediateTierMode}
                addPlan={addPlan}
                currency={metrics?.currency || 'EUR'}
              />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Action-Specific Guidance Text */}
                {actionConfig?.guidanceText && showActionBanner && (
                  <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      <svg className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      {actionConfig.guidanceText}
                    </p>
                  </div>
                )}

                {/* Plan Selector */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Select Plan
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={handlePlanChange}
                    disabled={plansLoading || isSubmitting}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50"
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
                          {formatPrice(selectedPlan.price, selectedPlan.currency)} / {selectedPlan.interval || 'month'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* New Price with Preset Chips */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    New Price {selectedPlan && <span className="text-slate-500 font-normal">({selectedPlan.currency || 'USD'})</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newPrice}
                    onChange={(e) => {
                      setNewPrice(e.target.value);
                      setFormError('');
                    }}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50"
                    placeholder="Enter new price"
                  />
                  
                  {/* Preset Chips */}
                  {selectedPlan && presetChips && (
                    <PricePresetChips
                      presets={presetChips}
                      currentPrice={selectedPlan.price}
                      onSelect={handlePresetSelect}
                      disabled={isSubmitting}
                    />
                  )}
                </div>

                {/* Active Customers with Safe Defaults */}
                <CustomerCountInput
                  value={activeCustomers}
                  onChange={(e) => {
                    setActiveCustomers(e.target.value);
                    setFormError('');
                    // Clear info message when user manually edits
                    if (customerCountInfo?.source === 'estimated') {
                      setCustomerCountInfo(prev => ({ ...prev, message: null }));
                    }
                  }}
                  disabled={isSubmitting}
                  customerCountInfo={selectedPlan ? customerCountInfo : null}
                  onValidationChange={setCustomerCountValid}
                />

                {/* Business Metrics Summary */}
                {metricsLoading ? (
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-500">
                      <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                      Loading metrics...
                    </div>
                  </div>
                ) : metrics ? (
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-3">Business Metrics (from settings)</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-slate-500">MRR</p>
                        <p className="text-white font-medium">
                          {formatPrice(metrics.mrr || 0, metrics.currency)}
                        </p>
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
                ) : (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <p className="text-amber-400 text-sm">
                      No business metrics set. Go to Settings to configure your metrics for better simulations.
                    </p>
                  </div>
                )}

                {/* Error */}
                {formError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-red-400 text-sm">{formError}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !canSubmit}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 hover:scale-[1.02] transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Running Simulation...
                    </span>
                  ) : (
                    'Run Simulation'
                  )}
                </button>
                
                {/* Validation Hint - show if missing required fields */}
                {!canSubmit && selectedPlanId && (
                  <p className="text-xs text-slate-500 text-center">
                    {!newPrice && 'Enter a new price'}
                    {newPrice && !activeCustomers && 'Enter customer count'}
                    {newPrice && activeCustomers && parseInt(activeCustomers) <= 0 && 'Customer count must be at least 1'}
                  </p>
                )}
              </form>
            )}
          </div>

          {/* History */}
          {!historyLoading && history.length > 0 && (
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800">
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
          {pdfError && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 text-sm">{pdfError}</p>
            </div>
          )}
          {currentResult ? (
            <SimulationResult 
              result={currentResult} 
              onDownloadPdf={handleDownloadPdf}
              isPdfLoading={isPdfLoading}
            />
          ) : (
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-12 border border-slate-800 text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Simulations Yet</h3>
              <p className="text-slate-400 max-w-sm mx-auto">
                Select a plan and enter a new price point to see how it might impact your customers, revenue, and churn.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingSimulation;

