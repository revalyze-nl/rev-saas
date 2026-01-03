import { motion } from 'framer-motion';

const steps = [
  {
    number: "01",
    title: "Connect Your Data",
    description: "Link your Stripe account with read-only access. Add your competitors' pricing pages. Setup takes less than 5 minutes.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    )
  },
  {
    number: "02",
    title: "AI Analyzes Everything",
    description: "Our AI processes your revenue data, customer behavior, and competitive positioning. We run hundreds of pricing simulations.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    )
  },
  {
    number: "03",
    title: "Get Actionable Insights",
    description: "Receive specific pricing recommendations with projected revenue impact. Export PDF reports for stakeholders. No guesswork.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 bg-surface-800 relative">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500/10 border border-brand-500/20 rounded-full text-sm font-medium text-brand-400 mb-6">
            <span className="w-1.5 h-1.5 bg-brand-400 rounded-full"></span>
            How It Works
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            From data to decisions
            <br />
            <span className="gradient-text">in three steps</span>
          </h2>
          <p className="text-xl text-content-secondary max-w-2xl mx-auto">
            Get started in minutes, not weeks. Our AI does the heavy lifting.
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection line */}
          <div className="absolute left-8 top-12 bottom-12 w-px bg-gradient-to-b from-brand-500/50 via-brand-500/20 to-brand-500/50 hidden md:block"></div>

          <div className="space-y-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="flex items-start gap-6">
                  {/* Number */}
                  <div className="relative z-10 flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-accent-blue rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/25">
                      <span className="text-white font-bold text-lg">{step.number}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-surface-600/50 backdrop-blur-sm rounded-2xl p-6 border border-white/5 hover:border-brand-500/20 transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-surface-500 rounded-xl flex items-center justify-center text-brand-400 flex-shrink-0">
                        {step.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                        <p className="text-content-secondary leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
