import { useState } from 'react';

const Scenarios = () => {
  const [selectedScenario, setSelectedScenario] = useState(null);

  const scenarios = [
    {
      id: 1,
      name: 'Conservative',
      priceChange: '+10%',
      expectedRevenue: '+8%',
      churnRisk: 'Low',
      confidence: 92,
    },
    {
      id: 2,
      name: 'Recommended',
      priceChange: '+15%',
      expectedRevenue: '+12%',
      churnRisk: 'Low',
      confidence: 85,
      recommended: true,
    },
    {
      id: 3,
      name: 'Aggressive',
      priceChange: '+25%',
      expectedRevenue: '+18%',
      churnRisk: 'Medium',
      confidence: 68,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Pricing Scenarios</h1>
        <p className="text-slate-400 mt-1">Compare different pricing strategies</p>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-3 gap-4">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => setSelectedScenario(scenario.id)}
            className={`relative p-6 rounded-xl border text-left transition-all ${
              selectedScenario === scenario.id
                ? 'bg-white/10 border-white/20'
                : scenario.recommended
                ? 'bg-violet-500/10 border-violet-500/30 hover:bg-violet-500/15'
                : 'bg-slate-900/50 border-slate-800/50 hover:bg-slate-900/70'
            }`}
          >
            {scenario.recommended && (
              <div className="absolute -top-2 left-4 px-2 py-0.5 bg-violet-500 text-white text-xs font-medium rounded">
                Recommended
              </div>
            )}

            <h3 className="text-lg font-semibold text-white mb-4">{scenario.name}</h3>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Price Change</span>
                <span className="text-sm font-medium text-white">{scenario.priceChange}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Revenue Impact</span>
                <span className="text-sm font-medium text-emerald-400">{scenario.expectedRevenue}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Churn Risk</span>
                <span className={`text-sm font-medium ${
                  scenario.churnRisk === 'Low' ? 'text-emerald-400' :
                  scenario.churnRisk === 'Medium' ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {scenario.churnRisk}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800/50">
                <span className="text-sm text-slate-500">Confidence</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                      style={{ width: `${scenario.confidence}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-white">{scenario.confidence}%</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Apply Button */}
      {selectedScenario && (
        <div className="mt-8 text-center">
          <button className="px-8 py-3 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors">
            Apply This Scenario
          </button>
        </div>
      )}
    </div>
  );
};

export default Scenarios;
