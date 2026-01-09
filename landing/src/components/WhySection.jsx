import { motion } from 'framer-motion';

const reasons = [
  {
    title: "Memory",
    description: "Every decision you make is preserved with its full context. Six months from now, you'll know exactly why you chose what you chose.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    title: "Continuity",
    description: "Team members come and go. Institutional knowledge stays. New hires can see the thinking behind past choices.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    title: "Patterns",
    description: "Over time, you'll see what kinds of decisions work for your company—and which ones don't.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

const WhySection = () => {
  return (
    <section className="py-24 px-6 bg-dark-800 border-y border-dark-700">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-3xl md:text-4xl text-dark-50 mb-6">
            Why this matters
          </h2>
          <p className="text-lg text-dark-400 max-w-2xl mx-auto">
            The best teams don't just make decisions. They learn from them.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {reasons.map((reason, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true, margin: "-100px" }}
              className="bg-dark-900/50 rounded-xl p-6 border border-dark-700"
            >
              <div className="w-12 h-12 bg-dark-700 rounded-lg flex items-center justify-center text-dark-300 mb-5">
                {reason.icon}
              </div>
              <h3 className="text-xl font-semibold text-dark-50 mb-4">
                {reason.title}
              </h3>
              <p className="text-dark-400 leading-relaxed">
                {reason.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Dashboard screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mt-16"
        >
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-accent-600/10 via-accent-500/5 to-accent-600/10 rounded-2xl blur-xl" />
            <div className="relative bg-dark-700 rounded-xl border border-dark-600 overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-dark-800 border-b border-dark-600">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-dark-500" />
                  <div className="w-3 h-3 rounded-full bg-dark-500" />
                  <div className="w-3 h-3 rounded-full bg-dark-500" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-dark-700 rounded px-3 py-1 text-xs text-dark-400 text-center max-w-xs mx-auto">
                    app.revalyze.co/dashboard
                  </div>
                </div>
              </div>
              
              {/* Dashboard content */}
              <div className="p-6">
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Total Decisions", value: "47", change: "+12 this month" },
                    { label: "Success Rate", value: "73%", change: "+5% vs last quarter" },
                    { label: "Avg Time to Outcome", value: "34 days", change: "-8 days" },
                    { label: "Active Tracking", value: "8", change: "decisions" },
                  ].map((stat, i) => (
                    <div key={i} className="bg-dark-800/50 rounded-lg p-4 border border-dark-600/50">
                      <div className="text-xs text-dark-500 mb-1">{stat.label}</div>
                      <div className="text-2xl font-semibold text-dark-50">{stat.value}</div>
                      <div className="text-xs text-dark-500 mt-1">{stat.change}</div>
                    </div>
                  ))}
                </div>

                {/* Recent decisions mini-list */}
                <div className="bg-dark-800/30 rounded-lg p-4 border border-dark-600/30">
                  <div className="text-xs text-dark-500 uppercase tracking-wider mb-3">Recent Activity</div>
                  <div className="space-y-2">
                    {[
                      { action: "Outcome recorded", decision: "Enterprise tier launch", time: "2h ago" },
                      { action: "New decision", decision: "Q1 pricing review", time: "1d ago" },
                      { action: "Scenario added", decision: "Annual billing rollout", time: "3d ago" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-dark-400">{item.action}:</span>{" "}
                          <span className="text-dark-200">{item.decision}</span>
                        </div>
                        <span className="text-dark-600 text-xs">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WhySection;
