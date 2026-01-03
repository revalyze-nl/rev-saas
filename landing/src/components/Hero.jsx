import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

const Hero = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  // Parallax transforms - subtle and performant
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <section ref={ref} id="hero" className="relative min-h-screen flex items-center justify-center bg-surface-800 pt-20 pb-32 overflow-hidden">
      {/* Parallax Background gradient orbs */}
      <motion.div 
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ y: backgroundY }}
      >
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-[120px] animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent-blue/10 rounded-full blur-[100px] animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-brand-500/5 to-transparent rounded-full"></div>
      </motion.div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}></div>

      <motion.div 
        className="relative max-w-7xl mx-auto px-6 lg:px-8"
        style={{ y: textY, opacity, scale }}
      >
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500/10 border border-brand-500/20 rounded-full text-sm font-medium text-brand-400 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
              </span>
              AI-Powered Pricing Intelligence
            </div>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-8 leading-[1.1] tracking-tight"
          >
            <span className="text-white">Stop Guessing Your</span>
            <br />
            <span className="gradient-text">SaaS Pricing</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-content-secondary mb-12 leading-relaxed max-w-3xl mx-auto"
          >
            Analyze your pricing, benchmark competitors, and simulate changes before you ship. 
            Get AI-powered recommendations backed by your real revenue data.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-20"
          >
            <a 
              href="https://app.revalyze.co/signup"
              className="group relative px-8 py-4 bg-gradient-to-r from-brand-500 to-accent-blue text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/40 hover:scale-105 overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Start Free Trial
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </a>
            <a 
              href="/demo"
              className="px-8 py-4 bg-surface-600 text-white rounded-xl font-semibold transition-all duration-300 border border-white/10 hover:bg-surface-500 hover:border-brand-500/30 hover:scale-105"
            >
              View Demo
            </a>
          </motion.div>

          {/* Dashboard Preview with parallax */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative max-w-5xl mx-auto"
          >
            {/* Glow behind */}
            <div className="absolute -inset-4 bg-gradient-to-r from-brand-500/20 via-accent-blue/20 to-brand-500/20 rounded-3xl blur-2xl"></div>
            
            {/* Main card */}
            <div className="relative glass-card rounded-2xl p-1 glow-brand">
              <div className="bg-surface-700 rounded-xl overflow-hidden">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-surface-600 border-b border-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-surface-700 rounded-lg px-4 py-1.5 text-xs text-content-tertiary text-center">
                      app.revalyze.co/dashboard
                    </div>
                  </div>
                </div>

                {/* Dashboard content */}
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-surface-600/50 rounded-xl p-4 border border-white/5">
                      <div className="text-xs text-content-tertiary mb-1 font-medium">Monthly Revenue</div>
                      <div className="text-2xl font-bold text-white">$47.8K</div>
                      <div className="flex items-center text-xs text-emerald-400 mt-1 font-medium">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                        </svg>
                        +12.5%
                      </div>
                    </div>
                    <div className="bg-surface-600/50 rounded-xl p-4 border border-white/5">
                      <div className="text-xs text-content-tertiary mb-1 font-medium">Avg Revenue/User</div>
                      <div className="text-2xl font-bold text-white">$129</div>
                      <div className="flex items-center text-xs text-emerald-400 mt-1 font-medium">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                        </svg>
                        +8.2%
                      </div>
                    </div>
                    <div className="bg-surface-600/50 rounded-xl p-4 border border-white/5">
                      <div className="text-xs text-content-tertiary mb-1 font-medium">Churn Rate</div>
                      <div className="text-2xl font-bold text-white">3.2%</div>
                      <div className="flex items-center text-xs text-emerald-400 mt-1 font-medium">
                        <svg className="w-3 h-3 mr-1 rotate-180" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                        </svg>
                        -0.5%
                      </div>
                    </div>
                    <div className="bg-surface-600/50 rounded-xl p-4 border border-white/5">
                      <div className="text-xs text-content-tertiary mb-1 font-medium">Market Position</div>
                      <div className="text-2xl font-bold text-white">Mid</div>
                      <div className="flex items-center text-xs text-amber-400 mt-1 font-medium">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Opportunity
                      </div>
                    </div>
                  </div>

                  {/* AI Recommendation */}
                  <div className="bg-gradient-to-r from-brand-500/10 to-accent-blue/10 rounded-xl p-5 border border-brand-500/20">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-accent-blue rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-white mb-1 flex items-center gap-2">
                          AI Recommendation
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">High Confidence</span>
                        </div>
                        <div className="text-sm text-content-secondary">
                          Increase Growth plan from <span className="font-semibold text-white">$129 → $149</span> (+15%). 
                          Expected impact: <span className="font-semibold text-emerald-400">+$8.4K MRR/month</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        style={{ opacity }}
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 border-2 border-content-tertiary/30 rounded-full flex justify-center pt-2">
          <div className="w-1 h-2 bg-content-tertiary/50 rounded-full"></div>
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
