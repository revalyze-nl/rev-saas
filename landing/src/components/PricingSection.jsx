import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const plans = [
  {
    name: "Starter",
    price: "€69",
    description: "For early-stage SaaS",
    features: [
      "Up to 3 pricing plans",
      "Up to 3 competitors",
      "AI-powered pricing analysis",
      "5 AI Insight Credits / month",
      "PDF export of reports"
    ],
    popular: false,
    isEnterprise: false
  },
  {
    name: "Growth",
    price: "€159",
    description: "For growing SaaS companies",
    features: [
      "Up to 5 pricing plans",
      "Up to 5 competitors",
      "AI-powered pricing analysis",
      "Pricing simulations (what-if)",
      "20 AI Insight Credits / month",
      "PDF export of all reports"
    ],
    popular: true,
    isEnterprise: false
  },
  {
    name: "Enterprise",
    price: "€399",
    description: "For larger organizations",
    features: [
      "7+ pricing plans",
      "10+ competitors",
      "Full AI analysis suite",
      "Unlimited simulations",
      "100 AI Insight Credits / month",
      "CSV & Excel export",
      "3 team seats included"
    ],
    popular: false,
    isEnterprise: true
  }
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 bg-surface-700 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface-800 via-surface-700 to-surface-800 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500/10 border border-brand-500/20 rounded-full text-sm font-medium text-brand-400 mb-6">
            <span className="w-1.5 h-1.5 bg-brand-400 rounded-full"></span>
            Pricing
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Simple, transparent
            <br />
            <span className="gradient-text">pricing</span>
          </h2>
          <p className="text-xl text-content-secondary max-w-2xl mx-auto">
            Start free for 14 days. No credit card required. Scale as you grow.
          </p>
        </motion.div>

        {/* AI Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto mb-12"
        >
          <p className="text-xs text-content-tertiary text-center leading-relaxed">
            AI-powered insights are advisory. All analyses and simulations are based on the data you provide and should not be considered guaranteed outcomes. Final pricing decisions remain your responsibility.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`relative ${plan.popular ? 'md:-mt-4 md:mb-4' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-brand-500 to-accent-blue text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg shadow-brand-500/25">
                    Most Popular
                  </div>
                </div>
              )}
              
              <div className={`h-full rounded-2xl p-8 border transition-all duration-300 flex flex-col ${
                plan.popular 
                  ? 'bg-gradient-to-b from-surface-600 to-surface-700 border-brand-500/30 shadow-xl shadow-brand-500/10' 
                  : 'bg-surface-600/50 border-white/5 hover:border-brand-500/20'
              }`}>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-content-secondary text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline">
                    <span className="text-5xl font-bold text-white">{plan.price}</span>
                    <span className="text-content-tertiary ml-2">/month</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6 flex-grow">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        plan.popular 
                          ? 'bg-gradient-to-br from-brand-500 to-accent-blue' 
                          : 'bg-surface-500'
                      }`}>
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-content-secondary text-sm flex items-center gap-2">
                        {feature}
                        {feature.includes('team seats') && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
                            Coming Soon
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Credits clarification */}
                <p className="text-[10px] text-content-muted mb-4 leading-relaxed">
                  AI Insight Credits are consumed per analysis or simulation run.
                </p>

                {/* Enterprise-specific copy */}
                {plan.isEnterprise && (
                  <p className="text-[10px] text-content-muted mb-4 leading-relaxed border-t border-white/5 pt-4">
                    Custom terms, invoicing, and onboarding support available upon request.
                  </p>
                )}

                <div className="mt-auto">
                  <a
                    href="https://app.revalyze.co/signup"
                    className={`block w-full py-3.5 rounded-xl font-semibold text-center transition-all duration-300 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-brand-500 to-accent-blue text-white shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/40'
                        : 'bg-surface-500 text-white hover:bg-surface-400'
                    }`}
                  >
                    Start Free Trial
                  </a>
                  
                  {/* CTA micro-copy */}
                  <p className="text-[10px] text-content-muted text-center mt-2">
                    Billed monthly. Cancel anytime from your dashboard.
                  </p>
                </div>

                {/* Usage limits disclaimer */}
                <p className="text-[10px] text-content-muted text-center mt-4 pt-4 border-t border-white/5">
                  Usage limits apply per billing period. Unused credits do not roll over.
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trial note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center text-content-tertiary mt-12 text-sm"
        >
          All plans include a 14-day free trial. No credit card required to start.
        </motion.p>

        {/* Legal footer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto mt-12 pt-8 border-t border-white/5"
        >
          <div className="space-y-3 text-center">
            <p className="text-xs text-content-muted">
              No refunds for unused time or credits, unless required by law.
            </p>
            <p className="text-xs text-content-muted">
              By subscribing, you agree to our{' '}
              <Link to="/terms" className="text-content-tertiary hover:text-brand-400 underline underline-offset-2">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-content-tertiary hover:text-brand-400 underline underline-offset-2">
                Privacy Policy
              </Link>.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
