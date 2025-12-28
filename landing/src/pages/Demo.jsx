import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Bar,
  Line,
  Legend
} from 'recharts';
import {
  DEMO_COMPANY,
  DEMO_PLANS,
  DEMO_COMPETITORS,
  DEMO_ANALYSIS,
  DEMO_SIMULATION,
  DEMO_METRICS,
  DEMO_USER,
  DEMO_MODE_BANNER
} from '../demo/demoData';

// Demo mode is always true in this component
const isDemo = true;

export default function Demo() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.title = 'Interactive Demo | Revalyze';
  }, []);

  const handleRunAnalysis = () => {
    setIsLoading(true);
    // Simulate loading delay
    setTimeout(() => {
      setIsLoading(false);
      setShowAnalysis(true);
    }, 1500);
  };

  const handleRunSimulation = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setShowSimulation(true);
    }, 1500);
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'plans', label: 'My Pricing' },
    { id: 'competitors', label: 'Competitors' },
    { id: 'analysis', label: 'AI Analysis' },
    { id: 'simulation', label: 'Simulation' }
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Demo Banner */}
      <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 bg-white/20 rounded text-xs font-medium">DEMO</span>
            <span className="text-sm">{DEMO_MODE_BANNER.text}</span>
          </div>
          <Link
            to="https://app.revalyze.co/signup"
            className="px-4 py-1.5 bg-white text-violet-700 rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
          >
            {DEMO_MODE_BANNER.ctaText} &rarr;
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="https://i.imgur.com/x8SISLw.png" alt="Revalyze" className="h-8" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
              <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm text-slate-300">{DEMO_USER.credits.remaining} credits</span>
            </div>
            <Link
              to="https://app.revalyze.co/signup"
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-120px)] border-r border-slate-800 bg-slate-900/50 p-4">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Demo User Info */}
          <div className="mt-8 p-4 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-medium">
                DU
              </div>
              <div>
                <p className="text-sm text-slate-300">{DEMO_USER.fullName}</p>
                <p className="text-xs text-slate-500">Demo Account</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'plans' && <PlansTab />}
          {activeTab === 'competitors' && <CompetitorsTab />}
          {activeTab === 'analysis' && (
            <AnalysisTab
              showAnalysis={showAnalysis}
              onRunAnalysis={handleRunAnalysis}
              isLoading={isLoading}
            />
          )}
          {activeTab === 'simulation' && (
            <SimulationTab
              showSimulation={showSimulation}
              onRunSimulation={handleRunSimulation}
              isLoading={isLoading}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab() {
  const stats = [
    { label: 'MRR', value: `$${(DEMO_METRICS.mrr / 1000).toFixed(1)}k`, change: `+${DEMO_METRICS.mrrGrowth}%`, color: 'violet' },
    { label: 'ARPU', value: `$${DEMO_METRICS.arpu}`, change: `+${DEMO_METRICS.arpuGrowth}%`, color: 'emerald' },
    { label: 'Churn Rate', value: `${DEMO_METRICS.churnRate}%`, change: `${DEMO_METRICS.churnChange}%`, color: 'amber' },
    { label: 'Customers', value: DEMO_METRICS.activeCustomers.toLocaleString(), change: `+${DEMO_METRICS.customerGrowth}%`, color: 'blue' }
  ];

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 p-8">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to {DEMO_COMPANY.name}</h1>
          <p className="text-violet-100">Your pricing intelligence dashboard</p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5"
          >
            <p className="text-sm text-slate-400 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-white mb-2">{stat.value}</p>
            <span className={`text-sm ${stat.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
              {stat.change}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        <QuickActionCard
          title="Run AI Analysis"
          description="Get insights on your pricing strategy"
          icon="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
        <QuickActionCard
          title="Simulate Price Change"
          description="See impact of pricing changes"
          icon="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
        />
        <QuickActionCard
          title="Track Competitors"
          description="Monitor competitor pricing"
          icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </div>

      <SignUpCTA />
    </div>
  );
}

// Plans Tab Component
function PlansTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">My Pricing Plans</h2>
          <p className="text-slate-400 text-sm">Manage your product pricing tiers</p>
        </div>
        <button
          disabled
          className="px-4 py-2 bg-slate-700 text-slate-400 rounded-lg cursor-not-allowed"
        >
          + Add Plan (Demo)
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {DEMO_PLANS.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-700/50">
              <h3 className="text-lg font-semibold text-white">{plan.planName}</h3>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-bold text-white">${plan.price}</span>
                <span className="text-slate-400">/{plan.billingPeriod}</span>
              </div>
              <p className="text-sm text-slate-400 mt-2">{plan.activeCustomers} active customers</p>
            </div>
            <div className="p-6">
              <ul className="space-y-3">
                {plan.features.map((feature, fi) => (
                  <li key={fi} className="flex items-center gap-2 text-sm">
                    {feature.included ? (
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className={feature.included ? 'text-slate-300' : 'text-slate-500'}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>

      <SignUpCTA />
    </div>
  );
}

// Competitors Tab Component
function CompetitorsTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Competitor Tracking</h2>
          <p className="text-slate-400 text-sm">{DEMO_COMPETITORS.length} competitors being monitored</p>
        </div>
        <button
          disabled
          className="px-4 py-2 bg-slate-700 text-slate-400 rounded-lg cursor-not-allowed"
        >
          + Add Competitor (Demo)
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {DEMO_COMPETITORS.map((comp, i) => (
          <motion.div
            key={comp.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-white">{comp.name}</h3>
                <p className="text-sm text-slate-400">{comp.url}</p>
              </div>
              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded">Active</span>
            </div>
            <p className="text-sm text-slate-400 mb-3">{comp.positioning}</p>
            <div className="flex gap-2 flex-wrap">
              {comp.plans.map((plan, pi) => (
                <span key={pi} className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded">
                  {plan.name}: ${plan.price}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <SignUpCTA />
    </div>
  );
}

// Analysis Tab Component
function AnalysisTab({ showAnalysis, onRunAnalysis, isLoading }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">AI Pricing Analysis</h2>
          <p className="text-slate-400 text-sm">Get AI-powered insights on your pricing strategy</p>
        </div>
        {!showAnalysis && (
          <button
            onClick={onRunAnalysis}
            disabled={isLoading}
            className="px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isLoading ? 'Running Analysis...' : 'Run Demo Analysis'}
          </button>
        )}
      </div>

      {!showAnalysis ? (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Ready to Analyze</h3>
          <p className="text-slate-400 mb-6">Click "Run Demo Analysis" to see AI-powered pricing insights</p>
        </div>
      ) : (
        <AnalysisResults />
      )}
    </div>
  );
}

// Analysis Results Component
function AnalysisResults() {
  const analysis = DEMO_ANALYSIS;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-3">Analysis Summary</h3>
        <p className="text-slate-300">{analysis.insights.summary}</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Market Position" value={analysis.metrics.priceGap} subtitle="vs market average" />
        <MetricCard label="Value Score" value={`${analysis.metrics.valueScore}/100`} subtitle="feature-to-price ratio" />
        <MetricCard label="Competitiveness" value={analysis.metrics.competitiveness} subtitle="market standing" />
        <MetricCard label="Competitors" value={analysis.competitorCount} subtitle="analyzed" />
      </div>

      {/* Insights */}
      <div className="grid grid-cols-2 gap-6">
        <InsightCard title="Strengths" items={analysis.insights.strengths} color="emerald" />
        <InsightCard title="Weaknesses" items={analysis.insights.weaknesses} color="red" />
        <InsightCard title="Opportunities" items={analysis.insights.opportunities} color="blue" />
      </div>

      {/* Suggested Actions */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Suggested Actions</h3>
        <div className="grid grid-cols-3 gap-4">
          {analysis.insights.suggestedActions.map((action, i) => (
            <div key={i} className="bg-slate-700/50 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">{action.title}</h4>
              <p className="text-sm text-slate-400 mb-3">{action.description}</p>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded ${
                  action.impact === 'High' ? 'bg-emerald-500/20 text-emerald-400' :
                  action.impact === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-slate-600 text-slate-300'
                }`}>
                  {action.impact} Impact
                </span>
                <span className="px-2 py-1 text-xs bg-slate-600 text-slate-300 rounded">
                  {action.effort} Effort
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <PricePositioningChart data={analysis.pricePositioningData} />
        <ValueVsPriceChart data={analysis.valueVsPriceData} />
      </div>

      {/* PDF Download */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">Export Report</h3>
            <p className="text-sm text-slate-400">Download a sample analysis report to see the PDF quality</p>
          </div>
          <a
            href="/samples/sample-analysis-report.pdf"
            download
            className="px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-lg hover:opacity-90 transition-opacity inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Sample PDF
          </a>
        </div>
      </div>

      <SignUpCTA />
    </motion.div>
  );
}

// Simulation Tab Component
function SimulationTab({ showSimulation, onRunSimulation, isLoading }) {
  const [selectedPlan, setSelectedPlan] = useState('plan-2');
  const [newPrice, setNewPrice] = useState(99);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Price Change Simulation</h2>
          <p className="text-slate-400 text-sm">Model the impact of pricing changes</p>
        </div>
      </div>

      {!showSimulation ? (
        <div className="grid grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4">Simulation Parameters</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Select Plan</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  {DEMO_PLANS.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.planName} - ${plan.price}/{plan.billingPeriod}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Current Price</label>
                <div className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300">
                  $79/month
                </div>
                <p className="text-xs text-slate-500 mt-1">Displayed as monthly equivalent</p>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">New Price</label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>

              <button
                onClick={onRunSimulation}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? 'Running Simulation...' : 'Run Demo Simulation'}
              </button>
              <p className="text-xs text-slate-500 text-center">
                Estimates based on your inputs. Actual results may vary.
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Ready to Simulate</h3>
              <p className="text-slate-400">Configure parameters and run simulation</p>
            </div>
          </div>
        </div>
      ) : (
        <SimulationResults />
      )}
    </div>
  );
}

// Simulation Results Component
function SimulationResults() {
  const sim = DEMO_SIMULATION;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Before vs After */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Before vs After Summary</h3>
        <div className="grid grid-cols-4 gap-4">
          <CompareCard
            label="Price"
            before={`$${sim.currentPrice}`}
            after={`$${sim.newPrice}`}
            change="+25%"
          />
          <CompareCard
            label="MRR"
            before={`$${(sim.beforeAfter.currentMRR / 1000).toFixed(1)}k`}
            after={`$${(sim.beforeAfter.projectedMRR / 1000).toFixed(1)}k`}
            change={sim.beforeAfter.mrrChange}
          />
          <CompareCard
            label="ARR"
            before={`$${(sim.beforeAfter.currentARR / 1000).toFixed(0)}k`}
            after={`$${(sim.beforeAfter.projectedARR / 1000).toFixed(0)}k`}
            change={sim.beforeAfter.arrChange}
          />
          <CompareCard
            label="Customers"
            before={sim.activeCustomers}
            after={sim.beforeAfter.customersAfter}
            change={`-${sim.beforeAfter.estimatedChurn}%`}
            negative
          />
        </div>
      </div>

      {/* Impact Overview Chart */}
      <ImpactOverviewChart scenarios={sim.scenarios} />

      {/* Scenarios */}
      <div className="grid grid-cols-3 gap-4">
        {sim.scenarios.map((scenario, i) => (
          <div
            key={scenario.name}
            className={`bg-slate-800/50 border rounded-xl p-5 ${
              scenario.recommended ? 'border-violet-500/50' : 'border-slate-700/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-white">{scenario.name}</h4>
              {scenario.recommended && (
                <span className="px-2 py-1 bg-violet-500/20 text-violet-300 text-xs rounded">
                  Recommended
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mb-4">{scenario.description}</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Projected ARR</span>
                <span className="text-white">${(scenario.projectedARR / 1000).toFixed(0)}k</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Customer Loss</span>
                <span className="text-red-400">-{scenario.customerLoss}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Sensitivity</span>
                <span className={`${
                  scenario.name === 'Conservative' ? 'text-red-400' :
                  scenario.name === 'Base' ? 'text-amber-400' :
                  'text-emerald-400'
                }`}>
                  {scenario.name === 'Conservative' ? 'High' :
                   scenario.name === 'Base' ? 'Moderate' : 'Low'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Analysis */}
      <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-3">AI Recommendation</h3>
        <p className="text-slate-300 mb-4">{sim.analysis.recommendation}</p>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Key Factors</h4>
            <ul className="space-y-1">
              {sim.analysis.keyFactors.map((factor, i) => (
                <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">+</span>
                  {factor}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Risks</h4>
            <ul className="space-y-1">
              {sim.analysis.risks.map((risk, i) => (
                <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="text-red-400 mt-1">!</span>
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* PDF Download */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">Export Report</h3>
            <p className="text-sm text-slate-400">Download a sample simulation report to see the PDF quality</p>
          </div>
          <a
            href="/samples/sample-simulation-report.pdf"
            download
            className="px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-lg hover:opacity-90 transition-opacity inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Sample PDF
          </a>
        </div>
      </div>

      <SignUpCTA />
    </motion.div>
  );
}

// Reusable Components
function QuickActionCard({ title, description, icon }) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 hover:border-violet-500/30 transition-colors cursor-pointer">
      <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center mb-3">
        <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <h3 className="font-medium text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}

function MetricCard({ label, value, subtitle }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

function InsightCard({ title, items, color }) {
  const colors = {
    emerald: 'bg-emerald-500/20 text-emerald-400',
    red: 'bg-red-500/20 text-red-400',
    blue: 'bg-blue-500/20 text-blue-400',
    amber: 'bg-amber-500/20 text-amber-400'
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
      <h4 className={`inline-block px-2 py-1 rounded text-sm font-medium mb-3 ${colors[color]}`}>
        {title}
      </h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
            <span className="text-slate-500 mt-0.5">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Price Positioning Chart - Scatter chart showing price distribution
function PricePositioningChart({ data }) {
  const userPlans = data.filter(d => d.isUser).map(d => ({ ...d, y: 1 }));
  const competitorPlans = data.filter(d => !d.isUser).map(d => ({ ...d, y: 1 }));
  const medianPrice = data.map(d => d.price).sort((a, b) => a - b)[Math.floor(data.length / 2)];
  
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
          <p className="font-medium text-white text-sm">{d.name}</p>
          <p className="text-slate-400 text-xs">${d.price}/month</p>
          <p className={`text-xs ${d.isUser ? 'text-violet-400' : 'text-slate-500'}`}>
            {d.isUser ? 'Your Plan' : 'Competitor'}
          </p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
      <h4 className="font-medium text-white mb-1">Price Positioning</h4>
      <p className="text-xs text-slate-400 mb-4">Your plans compared to competitors on price</p>
      
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              type="number" 
              dataKey="price" 
              name="Price" 
              unit="$"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              domain={[0, 'dataMax + 20']}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              hide 
              domain={[0, 2]}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine 
              x={medianPrice} 
              stroke="#f59e0b" 
              strokeDasharray="5 5" 
              label={{ value: 'Median', fill: '#f59e0b', fontSize: 10 }}
            />
            <Scatter 
              name="Competitors" 
              data={competitorPlans} 
              fill="#64748b"
              fillOpacity={0.7}
            />
            <Scatter 
              name="Your Plans" 
              data={userPlans} 
              fill="#8b5cf6"
              fillOpacity={1}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex items-center gap-4 mt-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-violet-500" />
          <span className="text-slate-400">Your Plans</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-500" />
          <span className="text-slate-400">Competitors</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-amber-500" />
          <span className="text-slate-400">Market Median</span>
        </div>
      </div>
    </div>
  );
}

// Value vs Price Chart - Scatter chart showing value score vs price
function ValueVsPriceChart({ data }) {
  const userPlans = data.filter(d => d.isUser);
  const competitorPlans = data.filter(d => !d.isUser);
  
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
          <p className="font-medium text-white text-sm">{d.name}</p>
          <p className="text-slate-400 text-xs">${d.price}/month</p>
          <p className="text-emerald-400 text-xs">Value Score: {d.valueScore}</p>
          <p className={`text-xs ${d.isUser ? 'text-violet-400' : 'text-slate-500'}`}>
            {d.isUser ? 'Your Plan' : 'Competitor'}
          </p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
      <h4 className="font-medium text-white mb-1">Value vs Price</h4>
      <p className="text-xs text-slate-400 mb-4">Feature value relative to pricing</p>
      
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              type="number" 
              dataKey="price" 
              name="Price" 
              unit="$"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              domain={[0, 'dataMax + 20']}
            />
            <YAxis 
              type="number" 
              dataKey="valueScore" 
              name="Value"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter 
              name="Competitors" 
              data={competitorPlans} 
              fill="#64748b"
              fillOpacity={0.7}
            />
            <Scatter 
              name="Your Plans" 
              data={userPlans} 
              fill="#8b5cf6"
              fillOpacity={1}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex items-center gap-4 mt-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-violet-500" />
          <span className="text-slate-400">Your Plans</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-500" />
          <span className="text-slate-400">Competitors</span>
        </div>
      </div>
    </div>
  );
}

// Impact Overview Chart - Shows scenarios with ARR and customer impact
function ImpactOverviewChart({ scenarios }) {
  const chartData = scenarios.map(s => ({
    name: s.name,
    projectedARR: Math.round(s.projectedARR / 1000),
    customerLoss: s.customerLoss,
    recommended: s.recommended
  }));
  
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
      <h4 className="font-medium text-white mb-1">Impact Overview</h4>
      <p className="text-xs text-slate-400 mb-4">Projected ARR and customer impact by scenario</p>
      
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="name" 
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
            />
            <YAxis 
              yAxisId="left"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(v) => `$${v}k`}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#f1f5f9' }}
            />
            <Bar 
              yAxisId="left"
              dataKey="projectedARR" 
              fill="#8b5cf6" 
              name="Projected ARR ($k)"
              radius={[4, 4, 0, 0]}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="customerLoss" 
              stroke="#ef4444" 
              name="Customer Loss (%)"
              strokeWidth={2}
              dot={{ fill: '#ef4444', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex items-center gap-4 mt-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-violet-500" />
          <span className="text-slate-400">Projected ARR</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-red-500" />
          <span className="text-slate-400">Customer Loss %</span>
        </div>
      </div>
    </div>
  );
}

function CompareCard({ label, before, after, change, negative = false }) {
  return (
    <div className="bg-slate-700/50 rounded-lg p-4">
      <p className="text-sm text-slate-400 mb-2">{label}</p>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-slate-500 text-sm line-through">{before}</span>
          <span className="text-white font-semibold ml-2">{after}</span>
        </div>
        <span className={`text-sm ${negative ? 'text-red-400' : 'text-emerald-400'}`}>
          {change}
        </span>
      </div>
    </div>
  );
}

function SignUpCTA() {
  return (
    <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl p-6 text-center">
      <h3 className="text-xl font-bold text-white mb-2">Ready to optimize your pricing?</h3>
      <p className="text-violet-100 mb-4">Sign up now and run real analysis with your own data</p>
      <Link
        to="https://app.revalyze.co/signup"
        className="inline-block px-6 py-3 bg-white text-violet-700 font-semibold rounded-lg hover:bg-white/90 transition-colors"
      >
        Start Free Trial
      </Link>
    </div>
  );
}

