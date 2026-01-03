import { motion } from 'framer-motion';

const CompetitorShowcase = () => {
  return (
    <section className="py-24 bg-surface-700 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-accent-purple/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-purple/10 border border-accent-purple/20 rounded-full text-sm font-medium text-accent-purple mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Competitor Intelligence
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              Know exactly where you
              <br />
              <span className="bg-gradient-to-r from-accent-purple to-pink-400 bg-clip-text text-transparent">stand in the market</span>
            </h2>
            
            <p className="text-xl text-content-secondary mb-8 leading-relaxed">
              Our AI automatically extracts competitor pricing, features, and positioning. See how you compare and discover opportunities to differentiate and win.
            </p>

            <div className="space-y-4">
              {[
                { title: "AI Price Extraction", desc: "Automatically scrape competitor pricing pages" },
                { title: "Feature Comparison", desc: "Side-by-side view of what each plan offers" },
                { title: "Market Positioning", desc: "See where you sit: Budget, Mid, or Premium" },
                { title: "Gap Analysis", desc: "Find underserved segments to capture" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-accent-purple to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
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
              <div className="absolute -inset-4 bg-gradient-to-r from-accent-purple/20 to-pink-500/20 rounded-3xl blur-2xl opacity-60"></div>
              
              <div className="relative glass-card rounded-2xl p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-white">Market Comparison</h3>
                  <div className="text-xs text-content-tertiary">5 competitors tracked</div>
                </div>

                {/* Competitor Cards */}
                <div className="space-y-3">
                  {/* Your Company */}
                  <div className="bg-brand-500/10 border border-brand-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-accent-blue rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">You</span>
                        </div>
                        <div>
                          <div className="font-semibold text-white">Your Company</div>
                          <div className="text-xs text-content-tertiary">3 plans</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">$29 - $199</div>
                        <div className="text-xs text-brand-400">Mid-Market</div>
                      </div>
                    </div>
                  </div>

                  {/* Competitor 1 */}
                  <div className="bg-surface-600/80 border border-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-surface-500 rounded-lg flex items-center justify-center">
                          <span className="text-content-secondary font-bold text-sm">C1</span>
                        </div>
                        <div>
                          <div className="font-semibold text-white">Competitor A</div>
                          <div className="text-xs text-content-tertiary">4 plans</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">$49 - $299</div>
                        <div className="text-xs text-accent-amber">Premium</div>
                      </div>
                    </div>
                  </div>

                  {/* Competitor 2 */}
                  <div className="bg-surface-600/80 border border-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-surface-500 rounded-lg flex items-center justify-center">
                          <span className="text-content-secondary font-bold text-sm">C2</span>
                        </div>
                        <div>
                          <div className="font-semibold text-white">Competitor B</div>
                          <div className="text-xs text-content-tertiary">2 plans</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">$19 - $79</div>
                        <div className="text-xs text-accent-emerald">Budget</div>
                      </div>
                    </div>
                  </div>

                  {/* Competitor 3 */}
                  <div className="bg-surface-600/80 border border-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-surface-500 rounded-lg flex items-center justify-center">
                          <span className="text-content-secondary font-bold text-sm">C3</span>
                        </div>
                        <div>
                          <div className="font-semibold text-white">Competitor C</div>
                          <div className="text-xs text-content-tertiary">3 plans</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">$39 - $179</div>
                        <div className="text-xs text-brand-400">Mid-Market</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Insight */}
                <div className="mt-4 p-4 bg-accent-purple/10 border border-accent-purple/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-accent-purple to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-accent-purple text-sm">Opportunity Found</div>
                      <div className="text-xs text-content-secondary mt-1">No competitor offers a $99-149 tier. Consider filling this gap.</div>
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

export default CompetitorShowcase;

