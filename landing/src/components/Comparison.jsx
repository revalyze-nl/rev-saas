import { motion } from 'framer-motion';

const comparisonData = [
  {
    aspect: "Competitor Research",
    manual: "Hours of visiting pricing pages",
    revalyze: "Automatic extraction in seconds",
    manualTime: "4-6 hours",
    revalyzeTime: "< 1 min"
  },
  {
    aspect: "Price Analysis",
    manual: "Spreadsheet calculations",
    revalyze: "AI-powered insights & charts",
    manualTime: "2-3 hours",
    revalyzeTime: "Instant"
  },
  {
    aspect: "Market Positioning",
    manual: "Guesswork & assumptions",
    revalyze: "Data-driven visualizations",
    manualTime: "Subjective",
    revalyzeTime: "Objective"
  },
  {
    aspect: "Price Change Impact",
    manual: "Trial and error",
    revalyze: "3-scenario simulation",
    manualTime: "Risky",
    revalyzeTime: "Predictable"
  },
  {
    aspect: "Stakeholder Reports",
    manual: "Manual PowerPoint creation",
    revalyze: "One-click PDF export",
    manualTime: "1-2 hours",
    revalyzeTime: "< 1 min"
  },
  {
    aspect: "Regular Updates",
    manual: "Repeat entire process",
    revalyze: "Automatic monitoring",
    manualTime: "Weekly effort",
    revalyzeTime: "Always current"
  }
];

const Comparison = () => {
  return (
    <section id="comparison" className="py-24 relative overflow-hidden">
      
      <div className="relative max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-6">
            Why Revalyze?
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Stop Wasting Time on{' '}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Manual Analysis
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            See how Revalyze transforms hours of tedious work into actionable insights in minutes.
          </p>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/30 backdrop-blur-xl rounded-3xl border border-slate-700/50 overflow-hidden"
        >
          {/* Header Row */}
          <div className="grid grid-cols-3 bg-slate-800/50 border-b border-slate-700/50">
            <div className="p-6 font-semibold text-white">Task</div>
            <div className="p-6 font-semibold text-center">
              <span className="inline-flex items-center gap-2 text-red-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Manual Process
              </span>
            </div>
            <div className="p-6 font-semibold text-center">
              <span className="inline-flex items-center gap-2 text-emerald-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                With Revalyze
              </span>
            </div>
          </div>

          {/* Data Rows */}
          {comparisonData.map((row, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * index }}
              className={`grid grid-cols-3 ${
                index !== comparisonData.length - 1 ? 'border-b border-slate-700/30' : ''
              } hover:bg-slate-800/30 transition-colors`}
            >
              <div className="p-6">
                <span className="font-medium text-white">{row.aspect}</span>
              </div>
              <div className="p-6 text-center">
                <span className="text-slate-400">{row.manual}</span>
                <div className="mt-2">
                  <span className="inline-block px-3 py-1 bg-red-500/10 text-red-400 text-sm rounded-full">
                    {row.manualTime}
                  </span>
                </div>
              </div>
              <div className="p-6 text-center">
                <span className="text-slate-300">{row.revalyze}</span>
                <div className="mt-2">
                  <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 text-sm rounded-full">
                    {row.revalyzeTime}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-12 grid md:grid-cols-3 gap-6"
        >
          {[
            { value: "10+ hrs", label: "Saved per pricing review", icon: "⏱️" },
            { value: "95%", label: "More accurate insights", icon: "🎯" },
            { value: "3x", label: "Faster decision making", icon: "⚡" }
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-slate-800/50 to-slate-800/20 rounded-2xl p-6 text-center border border-slate-700/30"
            >
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <p className="text-slate-400 mb-6">Ready to work smarter, not harder?</p>
          <a
            href="https://app.revalyze.co/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl font-semibold hover:shadow-lg hover:shadow-amber-500/50 transition-all hover:scale-105"
          >
            Try Revalyze Free
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default Comparison;

