import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart
} from 'recharts';

// Custom tooltip for the chart
const CustomTooltip = ({ active, payload, label, currency }) => {
  if (!active || !payload || !payload.length) return null;
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 shadow-xl">
      <p className="text-sm font-semibold text-white mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div 
            className="w-3 h-3 rounded-sm" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="text-white font-medium">
            {entry.name.includes('ARR') || entry.name.includes('MRR')
              ? formatCurrency(entry.value)
              : `${entry.value}%`
            }
          </span>
        </div>
      ))}
    </div>
  );
};

const ImpactOverviewChart = ({ scenarios, currency, isPriceIncrease }) => {
  // Prepare chart data from scenarios
  const chartData = useMemo(() => {
    if (!scenarios || scenarios.length === 0) return [];

    return scenarios.map((scenario) => {
      const avgARR = (scenario.new_arr_min + scenario.new_arr_max) / 2;
      const avgCustomerChange = isPriceIncrease
        ? (scenario.customer_loss_min_pct + scenario.customer_loss_max_pct) / 2
        : (scenario.customer_gain_min_pct + scenario.customer_gain_max_pct) / 2;

      return {
        name: scenario.name,
        arr: Math.round(avgARR),
        customerChange: Math.round(avgCustomerChange * 10) / 10,
        riskLevel: scenario.risk_level,
      };
    });
  }, [scenarios, isPriceIncrease]);

  if (chartData.length === 0) {
    return null;
  }

  const formatCurrency = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-800">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-cyan-500/10 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white">Impact Overview</h3>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="name" 
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
            />
            <YAxis 
              yAxisId="left"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={formatCurrency}
              label={{ value: 'Projected ARR', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11, dx: -5 }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
              label={{ 
                value: isPriceIncrease ? 'Customer Loss %' : 'Customer Gain %', 
                angle: 90, 
                position: 'insideRight', 
                fill: '#94a3b8', 
                fontSize: 11,
                dx: 10
              }}
            />
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Legend 
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value) => <span className="text-slate-400 text-sm">{value}</span>}
            />
            <Bar 
              yAxisId="left"
              dataKey="arr" 
              name="Projected ARR" 
              fill="#8b5cf6" 
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="customerChange" 
              name={isPriceIncrease ? 'Customer Loss %' : 'Customer Gain %'}
              stroke="#f59e0b" 
              strokeWidth={2}
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend for risk levels */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-700/50">
        {chartData.map((item) => {
          const riskColors = {
            low: 'bg-emerald-500',
            medium: 'bg-amber-500',
            high: 'bg-red-500',
          };
          return (
            <div key={item.name} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${riskColors[item.riskLevel] || 'bg-slate-500'}`} />
              <span className="text-xs text-slate-400">{item.name}: {item.riskLevel} risk</span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 text-center mt-3">
        Estimates based on your inputs and selected scenario.
      </p>
    </div>
  );
};

export default ImpactOverviewChart;


