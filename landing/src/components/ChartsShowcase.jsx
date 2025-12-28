import { motion } from 'framer-motion';

const ChartsShowcase = () => {
  // Mock data for Price Positioning chart
  const pricePositioningData = [
    { name: 'Competitor A', price: 29, isUser: false },
    { name: 'Your Starter', price: 39, isUser: true },
    { name: 'Competitor B', price: 49, isUser: false },
    { name: 'Your Pro', price: 79, isUser: true },
    { name: 'Competitor C', price: 99, isUser: false },
    { name: 'Your Enterprise', price: 149, isUser: true },
  ];

  // Mock data for Value vs Price chart
  const valueVsPriceData = [
    { name: 'Competitor A', price: 29, value: 45, isUser: false },
    { name: 'Your Starter', price: 39, value: 72, isUser: true },
    { name: 'Competitor B', price: 49, value: 55, isUser: false },
    { name: 'Your Pro', price: 79, value: 85, isUser: true },
    { name: 'Competitor C', price: 99, value: 68, isUser: false },
    { name: 'Your Enterprise', price: 149, value: 92, isUser: true },
  ];

  const maxPrice = 170;
  const chartWidth = 100; // percentage

  return (
    <section id="charts" className="py-24 relative overflow-hidden">

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium mb-6">
            Visual Intelligence
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            See Your Pricing{' '}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-500 bg-clip-text text-transparent">
              Position Clearly
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Interactive charts that make competitive analysis intuitive. Understand where you stand in seconds.
          </p>
        </motion.div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Price Positioning Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800/30 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Price Positioning</h3>
                <p className="text-sm text-slate-400">Market price distribution</p>
              </div>
            </div>

            {/* Mock Chart */}
            <div className="relative bg-slate-900/50 rounded-2xl p-6 mb-4">
              {/* Y-axis label */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-slate-500">
                Plans
              </div>
              
              {/* Chart area */}
              <div className="space-y-3 pl-4">
                {pricePositioningData.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-slate-400 truncate">{item.name}</div>
                    <div className="flex-1 h-6 bg-slate-800 rounded-lg relative overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(item.price / maxPrice) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                        className={`absolute left-0 top-0 h-full rounded-lg ${
                          item.isUser 
                            ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500' 
                            : 'bg-slate-600'
                        }`}
                      />
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 text-xs font-medium text-white"
                        style={{ left: `${Math.min((item.price / maxPrice) * 100 + 2, 85)}%` }}
                      >
                        ${item.price}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Market median line */}
              <div 
                className="absolute top-6 bottom-6 border-l-2 border-dashed border-amber-500/50"
                style={{ left: `calc(${(69 / maxPrice) * 100}% + 7rem)` }}
              >
                <div className="absolute -top-5 left-2 text-xs text-amber-400 whitespace-nowrap">
                  Market Median: $69
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
                <span className="text-slate-400">Your Plans</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-600" />
                <span className="text-slate-400">Competitors</span>
              </div>
            </div>
          </motion.div>

          {/* Value vs Price Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800/30 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Value vs Price</h3>
                <p className="text-sm text-slate-400">Feature value analysis</p>
              </div>
            </div>

            {/* Mock Scatter Chart */}
            <div className="relative bg-slate-900/50 rounded-2xl p-6 mb-4 h-64">
              {/* Y-axis */}
              <div className="absolute left-2 top-6 bottom-6 flex flex-col justify-between text-xs text-slate-500">
                <span>100</span>
                <span>75</span>
                <span>50</span>
                <span>25</span>
                <span>0</span>
              </div>
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-slate-500 whitespace-nowrap">
                Value Score
              </div>

              {/* X-axis */}
              <div className="absolute left-12 right-6 bottom-2 flex justify-between text-xs text-slate-500">
                <span>$0</span>
                <span>$50</span>
                <span>$100</span>
                <span>$150+</span>
              </div>

              {/* Grid lines */}
              <div className="absolute left-12 right-6 top-6 bottom-8">
                <div className="w-full h-full relative">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="absolute w-full border-t border-slate-700/30"
                      style={{ top: `${i * 25}%` }}
                    />
                  ))}
                  
                  {/* Data points */}
                  {valueVsPriceData.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ scale: 0, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className={`absolute w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2 cursor-pointer group ${
                        item.isUser
                          ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/50'
                          : 'bg-slate-500'
                      }`}
                      style={{
                        left: `${(item.price / 170) * 100}%`,
                        top: `${100 - item.value}%`
                      }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-slate-700">
                        <div className="font-medium text-white">{item.name}</div>
                        <div className="text-slate-400">${item.price} · Score: {item.value}</div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Value line (ideal) */}
                  <div className="absolute w-full h-full">
                    <svg className="w-full h-full" preserveAspectRatio="none">
                      <line
                        x1="0%"
                        y1="100%"
                        x2="100%"
                        y2="30%"
                        stroke="rgba(16, 185, 129, 0.3)"
                        strokeWidth="2"
                        strokeDasharray="8,4"
                      />
                    </svg>
                    <div className="absolute right-0 top-[30%] text-xs text-emerald-400 -translate-y-full">
                      Ideal Value Line
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
                <span className="text-slate-400">Your Plans</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-500" />
                <span className="text-slate-400">Competitors</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="grid md:grid-cols-3 gap-6 mt-12"
        >
          {[
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              ),
              title: "Export to PDF",
              description: "All charts included in professional reports, ready for stakeholders."
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ),
              title: "Real-time Updates",
              description: "Charts update instantly as you add competitors or modify plans."
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              ),
              title: "AI Insights",
              description: "Smart annotations highlight opportunities and potential issues."
            }
          ].map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-6 bg-slate-800/20 rounded-2xl border border-slate-700/30"
            >
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 flex-shrink-0">
                {feature.icon}
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">{feature.title}</h4>
                <p className="text-sm text-slate-400">{feature.description}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ChartsShowcase;

