import { motion } from 'framer-motion';

const AnalysisShowcase = () => {
  return (
    <section className="py-24 bg-surface-700 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500/10 border border-brand-500/20 rounded-full text-sm font-medium text-brand-400 mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              AI Analysis
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              Understand your pricing
              <br />
              <span className="gradient-text">in minutes, not months</span>
            </h2>
            
            <p className="text-xl text-content-secondary mb-8 leading-relaxed">
              Connect your Stripe account and our AI instantly analyzes your revenue data, customer segments, and pricing performance to surface actionable insights.
            </p>

            <div className="space-y-4">
              {[
                { title: "Revenue Health Score", desc: "See how your pricing compares to industry benchmarks" },
                { title: "Churn Risk Analysis", desc: "Identify pricing-related churn patterns early" },
                { title: "ARPU Optimization", desc: "Find opportunities to increase average revenue per user" },
                { title: "Plan Performance", desc: "Understand which plans drive growth vs. drag it down" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-brand-500 to-accent-blue rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-semibold text-white">{item.title}</span>
                    <span className="text-content-secondary"> — {item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right - Visual */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-brand-500/20 to-accent-blue/20 rounded-3xl blur-2xl opacity-60"></div>
              
              <div className="relative glass-card rounded-2xl p-6 glow-brand">
                {/* Analysis Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-surface-600/80 rounded-xl p-4 border border-white/5">
                    <div className="text-xs text-content-tertiary mb-2 font-medium uppercase tracking-wider">Revenue Health</div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-emerald-400">87</span>
                      <span className="text-content-tertiary text-sm mb-1">/100</span>
                    </div>
                    <div className="mt-2 h-2 bg-surface-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: '87%' }}></div>
                    </div>
                  </div>
                  
                  <div className="bg-surface-600/80 rounded-xl p-4 border border-white/5">
                    <div className="text-xs text-content-tertiary mb-2 font-medium uppercase tracking-wider">Pricing Power</div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-brand-400">High</span>
                    </div>
                    <div className="mt-2 text-xs text-content-secondary">Room to increase +15%</div>
                  </div>
                </div>

                {/* Insights List */}
                <div className="space-y-3">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-emerald-400 text-sm">Growth Opportunity</div>
                        <div className="text-xs text-content-secondary mt-1">Pro plan is underpriced by 18% vs market average</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-amber-400 text-sm">Attention Needed</div>
                        <div className="text-xs text-content-secondary mt-1">Starter → Pro upgrade rate below benchmark</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-brand-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-brand-400 text-sm">AI Recommendation</div>
                        <div className="text-xs text-content-secondary mt-1">Consider adding a mid-tier plan at $79/mo</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AnalysisShowcase;

