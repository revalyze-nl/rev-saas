import { motion } from 'framer-motion';

const LaunchPromo = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950 py-16 px-8">
      {/* Main Container - LinkedIn optimal size 1200x627 */}
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-semibold mb-6">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            🚀 NOW LIVE
          </div>
          
          <img 
            src="/revalyze-logo.png" 
            alt="Revalyze" 
            className="h-16 mx-auto mb-6"
          />
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            AI-Powered Pricing Intelligence
            <br />
            <span className="bg-gradient-to-r from-brand-400 via-brand-500 to-purple-500 bg-clip-text text-transparent">
              for SaaS Companies
            </span>
          </h1>
          
          <p className="text-xl text-content-secondary max-w-2xl mx-auto">
            Analyze competitors, simulate pricing changes, and get AI-driven recommendations to maximize your revenue.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-3 gap-6 mb-12"
        >
          {/* Feature 1 */}
          <div className="bg-surface-800/50 backdrop-blur border border-surface-700 rounded-2xl p-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Competitor Analysis</h3>
            <p className="text-content-tertiary text-sm">AI discovers and tracks your competitors' pricing in real-time</p>
          </div>

          {/* Feature 2 */}
          <div className="bg-surface-800/50 backdrop-blur border border-surface-700 rounded-2xl p-6">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">AI Insights</h3>
            <p className="text-content-tertiary text-sm">Get actionable recommendations powered by advanced AI models</p>
          </div>

          {/* Feature 3 */}
          <div className="bg-surface-800/50 backdrop-blur border border-surface-700 rounded-2xl p-6">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Pricing Simulations</h3>
            <p className="text-content-tertiary text-sm">Test price changes and see projected impact on revenue</p>
          </div>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-brand-500/20 via-purple-500/20 to-brand-500/20 blur-3xl -z-10"></div>
          
          {/* Mock Dashboard */}
          <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden shadow-2xl">
            {/* Browser bar */}
            <div className="bg-surface-900 px-4 py-3 flex items-center gap-2 border-b border-surface-700">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex-1 text-center">
                <span className="text-xs text-content-tertiary bg-surface-800 px-4 py-1 rounded-full">
                  app.revalyze.co
                </span>
              </div>
            </div>
            
            {/* Dashboard content */}
            <div className="p-6">
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                {/* Stat cards */}
                <div className="bg-surface-700/50 rounded-xl p-4">
                  <p className="text-xs text-content-tertiary mb-1">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-white">€48,500</p>
                  <p className="text-xs text-emerald-400">↑ 12% vs last month</p>
                </div>
                <div className="bg-surface-700/50 rounded-xl p-4">
                  <p className="text-xs text-content-tertiary mb-1">Active Customers</p>
                  <p className="text-2xl font-bold text-white">1,247</p>
                  <p className="text-xs text-emerald-400">↑ 8% growth</p>
                </div>
                <div className="bg-surface-700/50 rounded-xl p-4">
                  <p className="text-xs text-content-tertiary mb-1">Competitors Tracked</p>
                  <p className="text-2xl font-bold text-white">12</p>
                  <p className="text-xs text-brand-400">AI monitored</p>
                </div>
                <div className="bg-surface-700/50 rounded-xl p-4">
                  <p className="text-xs text-content-tertiary mb-1">AI Insights</p>
                  <p className="text-2xl font-bold text-white">24</p>
                  <p className="text-xs text-purple-400">This month</p>
                </div>
              </div>
              
              {/* AI Insight Preview */}
              <div className="bg-gradient-to-r from-brand-500/10 to-purple-500/10 border border-brand-500/30 rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">💡 AI Recommendation</h4>
                    <p className="text-content-secondary text-sm">
                      Based on competitor analysis, consider increasing your Pro plan price by 15%. 
                      Your features justify a higher price point and competitors charge 20% more on average.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">+€7,200/mo potential</span>
                      <span className="px-2 py-1 bg-brand-500/20 text-brand-400 text-xs rounded-full">High confidence</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-12"
        >
          <p className="text-2xl font-bold text-white mb-2">
            🎉 We're Live!
          </p>
          <p className="text-content-secondary mb-6">
            Start your free trial at <span className="text-brand-400 font-semibold">revalyze.co</span>
          </p>
          
          <div className="flex items-center justify-center gap-6 text-sm text-content-tertiary">
            <span>✓ 14-day free trial</span>
            <span>✓ No credit card required</span>
            <span>✓ AI-powered insights</span>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default LaunchPromo;




