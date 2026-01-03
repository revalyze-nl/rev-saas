import { motion } from 'framer-motion';

const SimulationShowcase = () => {
  return (
    <section className="py-24 bg-surface-800 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent-emerald/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Visual */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1"
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-accent-emerald/20 to-teal-500/20 rounded-3xl blur-2xl opacity-60"></div>
              
              <div className="relative glass-card rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/5 bg-surface-600/50">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                      <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                    </div>
                    <span className="text-sm text-content-tertiary">Pricing Simulation</span>
                  </div>
                </div>

                <div className="p-6">
                  {/* Price Change Header */}
                  <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/5">
                    <div>
                      <div className="text-sm text-content-tertiary mb-1">Pro Plan</div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl text-content-tertiary line-through">$29</span>
                        <svg className="w-5 h-5 text-accent-emerald" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        <span className="text-2xl text-white font-bold">$39</span>
                        <span className="text-content-tertiary">/month</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-accent-emerald">+34.5%</div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full">
                        <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                        <span className="text-sm text-amber-400 font-medium">Medium Risk</span>
                      </div>
                    </div>
                  </div>

                  {/* Scenario Cards */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {/* Conservative */}
                    <div className="bg-accent-emerald/10 border border-accent-emerald/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-accent-emerald rounded-full"></div>
                        <span className="text-xs font-semibold text-accent-emerald">Conservative</span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="text-[10px] text-content-tertiary uppercase tracking-wide">Churn</div>
                          <div className="text-sm text-white font-medium">2-4%</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-content-tertiary uppercase tracking-wide">MRR</div>
                          <div className="text-lg text-white font-bold">$11.2K</div>
                        </div>
                      </div>
                    </div>

                    {/* Base */}
                    <div className="bg-accent-blue/10 border border-accent-blue/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-accent-blue rounded-full"></div>
                        <span className="text-xs font-semibold text-accent-blue">Base</span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="text-[10px] text-content-tertiary uppercase tracking-wide">Churn</div>
                          <div className="text-sm text-white font-medium">4-7%</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-content-tertiary uppercase tracking-wide">MRR</div>
                          <div className="text-lg text-white font-bold">$10.8K</div>
                        </div>
                      </div>
                    </div>

                    {/* Aggressive */}
                    <div className="bg-accent-amber/10 border border-accent-amber/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-accent-amber rounded-full"></div>
                        <span className="text-xs font-semibold text-accent-amber">Aggressive</span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="text-[10px] text-content-tertiary uppercase tracking-wide">Churn</div>
                          <div className="text-sm text-white font-medium">7-12%</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-content-tertiary uppercase tracking-wide">MRR</div>
                          <div className="text-lg text-white font-bold">$10.2K</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Insight */}
                  <div className="bg-gradient-to-r from-brand-500/10 to-accent-purple/10 border border-brand-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-brand-500 to-accent-purple rounded-lg flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <span className="text-sm font-semibold text-brand-400">AI Analysis</span>
                    </div>
                    <p className="text-xs text-content-secondary leading-relaxed">
                      This price increase carries moderate risk with strong revenue potential. Consider grandfathering existing customers to minimize churn.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right - Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-emerald/10 border border-accent-emerald/20 rounded-full text-sm font-medium text-accent-emerald mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Pricing Simulation
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              Know the impact
              <br />
              <span className="bg-gradient-to-r from-accent-emerald to-teal-400 bg-clip-text text-transparent">before you ship</span>
            </h2>
            
            <p className="text-xl text-content-secondary mb-8 leading-relaxed">
              Stop guessing. Run pricing simulations with your real data and see projected revenue changes across multiple risk scenarios before making any changes.
            </p>

            <div className="space-y-4">
              {[
                { title: "3 Risk Scenarios", desc: "Conservative, Base, and Aggressive projections" },
                { title: "MRR/ARR Projections", desc: "See exact revenue impact in dollars" },
                { title: "Customer Impact", desc: "Understand potential churn vs. growth" },
                { title: "AI Executive Summary", desc: "Get strategic insights for stakeholders" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-accent-emerald to-teal-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
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
        </div>
      </div>
    </section>
  );
};

export default SimulationShowcase;
