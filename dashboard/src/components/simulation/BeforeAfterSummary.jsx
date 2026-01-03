import { useMemo } from 'react';

// Delta badge component
const DeltaBadge = ({ value, isPercentage = false, isPositiveGood = true }) => {
  if (value === null || value === undefined || isNaN(value)) return null;
  
  const isPositive = value >= 0;
  const isGood = isPositiveGood ? isPositive : !isPositive;
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      isGood 
        ? 'bg-emerald-500/20 text-emerald-400' 
        : 'bg-red-500/20 text-red-400'
    }`}>
      {isPositive ? '+' : ''}{isPercentage ? `${value.toFixed(1)}%` : value.toLocaleString()}
    </span>
  );
};

// Comparison row component
const ComparisonRow = ({ label, beforeValue, afterValue, delta, isPercentage, isCurrency, currency, isPositiveGood = true }) => {
  const formatValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (isCurrency) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    if (isPercentage) {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  };

  return (
    <div className="grid grid-cols-4 gap-4 py-3 border-b border-slate-700/50 last:border-b-0">
      <div className="text-slate-400 text-sm font-medium">{label}</div>
      <div className="text-slate-300 text-sm text-center">{formatValue(beforeValue)}</div>
      <div className="text-white text-sm font-medium text-center">{formatValue(afterValue)}</div>
      <div className="text-center">
        <DeltaBadge 
          value={delta} 
          isPercentage={isPercentage} 
          isPositiveGood={isPositiveGood} 
        />
      </div>
    </div>
  );
};

const BeforeAfterSummary = ({ result }) => {
  // Calculate comparison data from the Base scenario (or first available)
  const comparisonData = useMemo(() => {
    if (!result) return null;

    const baseScenario = result.scenarios?.find(s => s.name === 'Base') || result.scenarios?.[0];
    if (!baseScenario) return null;

    const isPriceIncrease = result.price_change_pct >= 0;
    
    // Calculate averages for base scenario
    const avgNewCustomers = Math.round((baseScenario.new_customer_count_min + baseScenario.new_customer_count_max) / 2);
    const avgNewMRR = (baseScenario.new_mrr_min + baseScenario.new_mrr_max) / 2;
    const avgNewARR = (baseScenario.new_arr_min + baseScenario.new_arr_max) / 2;
    
    // Current values
    const currentMRR = result.active_customers_on_plan * result.current_price;
    const currentARR = currentMRR * 12;
    
    // Customer change
    const customerDelta = avgNewCustomers - result.active_customers_on_plan;
    const customerDeltaPct = ((avgNewCustomers - result.active_customers_on_plan) / result.active_customers_on_plan) * 100;
    
    // ARR change
    const arrDelta = avgNewARR - currentARR;
    const arrDeltaPct = ((avgNewARR - currentARR) / currentARR) * 100;

    return {
      price: {
        before: result.current_price,
        after: result.new_price,
        delta: result.price_change_pct,
      },
      customers: {
        before: result.active_customers_on_plan,
        after: avgNewCustomers,
        delta: customerDeltaPct,
      },
      mrr: {
        before: currentMRR,
        after: avgNewMRR,
        delta: ((avgNewMRR - currentMRR) / currentMRR) * 100,
      },
      arr: {
        before: currentARR,
        after: avgNewARR,
        delta: arrDeltaPct,
      },
      isPriceIncrease,
      scenarioName: baseScenario.name,
    };
  }, [result]);

  if (!comparisonData) {
    return null;
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-violet-500/10 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">Before vs After</h3>
        </div>
        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">
          Based on {comparisonData.scenarioName} scenario
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-4 gap-4 pb-2 border-b border-slate-600/50 mb-1">
        <div className="text-slate-500 text-xs uppercase tracking-wide">Metric</div>
        <div className="text-slate-500 text-xs uppercase tracking-wide text-center">Before</div>
        <div className="text-slate-500 text-xs uppercase tracking-wide text-center">After</div>
        <div className="text-slate-500 text-xs uppercase tracking-wide text-center">Change</div>
      </div>

      {/* Comparison Rows */}
      <ComparisonRow
        label="Price / month"
        beforeValue={comparisonData.price.before}
        afterValue={comparisonData.price.after}
        delta={comparisonData.price.delta}
        isCurrency
        currency={result.currency}
        isPercentage
        isPositiveGood={true}
      />
      <ComparisonRow
        label="Active Customers"
        beforeValue={comparisonData.customers.before}
        afterValue={comparisonData.customers.after}
        delta={comparisonData.customers.after - comparisonData.customers.before}
        isPositiveGood={true}
      />
      <ComparisonRow
        label="Monthly Revenue"
        beforeValue={comparisonData.mrr.before}
        afterValue={comparisonData.mrr.after}
        delta={comparisonData.mrr.delta}
        isCurrency
        currency={result.currency}
        isPercentage
        isPositiveGood={true}
      />
      <ComparisonRow
        label="Annual Revenue"
        beforeValue={comparisonData.arr.before}
        afterValue={comparisonData.arr.after}
        delta={comparisonData.arr.delta}
        isCurrency
        currency={result.currency}
        isPercentage
        isPositiveGood={true}
      />

      {/* Visual Summary */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl ${
            comparisonData.arr.delta >= 0 
              ? 'bg-emerald-500/10 border border-emerald-500/20' 
              : 'bg-red-500/10 border border-red-500/20'
          }`}>
            <p className="text-xs text-slate-400 mb-1">Revenue Impact</p>
            <p className={`text-xl font-bold ${
              comparisonData.arr.delta >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {comparisonData.arr.delta >= 0 ? '+' : ''}{comparisonData.arr.delta.toFixed(1)}%
            </p>
          </div>
          <div className={`p-4 rounded-xl ${
            comparisonData.customers.delta >= 0 
              ? 'bg-emerald-500/10 border border-emerald-500/20' 
              : 'bg-amber-500/10 border border-amber-500/20'
          }`}>
            <p className="text-xs text-slate-400 mb-1">Customer Impact</p>
            <p className={`text-xl font-bold ${
              comparisonData.customers.delta >= 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {comparisonData.customers.delta >= 0 ? '+' : ''}{comparisonData.customers.delta.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500 text-center mt-4">
        Estimates based on your inputs and selected scenario.
      </p>
    </div>
  );
};

export default BeforeAfterSummary;

