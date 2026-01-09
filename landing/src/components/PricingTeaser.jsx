import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const PricingTeaser = () => {
  return (
    <section id="pricing" className="py-24 px-6 bg-dark-800">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-3xl md:text-4xl text-dark-50 mb-6">
            Simple, honest pricing
          </h2>
          <p className="text-lg text-dark-400 max-w-2xl mx-auto">
            Start free. Upgrade when you're ready.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Starter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="bg-dark-900/50 rounded-2xl p-8 border border-dark-700"
          >
            <h3 className="text-lg font-semibold text-dark-50 mb-2">Starter</h3>
            <p className="text-dark-500 text-sm mb-6">For individuals and small teams</p>
            <div className="mb-6">
              <span className="text-3xl font-semibold text-dark-50">€69</span>
              <span className="text-dark-500">/month</span>
            </div>
            <ul className="space-y-3 text-sm text-dark-400 mb-8">
              <li className="flex items-start gap-2">
                <span className="text-dark-600 mt-0.5">—</span>
                Up to 3 active decisions
              </li>
              <li className="flex items-start gap-2">
                <span className="text-dark-600 mt-0.5">—</span>
                Full decision history
              </li>
              <li className="flex items-start gap-2">
                <span className="text-dark-600 mt-0.5">—</span>
                PDF exports
              </li>
            </ul>
            <a
              href="https://app.revalyze.co/signup"
              className="block w-full py-3 text-center text-dark-300 border border-dark-600 rounded-lg font-medium hover:bg-dark-700 hover:text-dark-100 transition-colors"
            >
              Start free trial
            </a>
          </motion.div>

          {/* Growth */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true, margin: "-100px" }}
            className="bg-dark-50 rounded-2xl p-8 text-dark-900"
          >
            <h3 className="text-lg font-semibold text-dark-900 mb-2">Growth</h3>
            <p className="text-dark-500 text-sm mb-6">For growing teams</p>
            <div className="mb-6">
              <span className="text-3xl font-semibold text-dark-900">€159</span>
              <span className="text-dark-500">/month</span>
            </div>
            <ul className="space-y-3 text-sm text-dark-600 mb-8">
              <li className="flex items-start gap-2">
                <span className="text-dark-400 mt-0.5">—</span>
                Unlimited decisions
              </li>
              <li className="flex items-start gap-2">
                <span className="text-dark-400 mt-0.5">—</span>
                Scenario analysis
              </li>
              <li className="flex items-start gap-2">
                <span className="text-dark-400 mt-0.5">—</span>
                Outcome tracking
              </li>
              <li className="flex items-start gap-2">
                <span className="text-dark-400 mt-0.5">—</span>
                Team collaboration
              </li>
            </ul>
            <a
              href="https://app.revalyze.co/signup"
              className="block w-full py-3 text-center text-dark-50 bg-dark-900 rounded-lg font-medium hover:bg-dark-800 transition-colors"
            >
              Start free trial
            </a>
          </motion.div>

          {/* Enterprise */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true, margin: "-100px" }}
            className="bg-dark-900/50 rounded-2xl p-8 border border-dark-700"
          >
            <h3 className="text-lg font-semibold text-dark-50 mb-2">Enterprise</h3>
            <p className="text-dark-500 text-sm mb-6">For larger organizations</p>
            <div className="mb-6">
              <span className="text-3xl font-semibold text-dark-50">€399</span>
              <span className="text-dark-500">/month</span>
            </div>
            <ul className="space-y-3 text-sm text-dark-400 mb-8">
              <li className="flex items-start gap-2">
                <span className="text-dark-600 mt-0.5">—</span>
                Everything in Growth
              </li>
              <li className="flex items-start gap-2">
                <span className="text-dark-600 mt-0.5">—</span>
                Advanced analytics
              </li>
              <li className="flex items-start gap-2">
                <span className="text-dark-600 mt-0.5">—</span>
                SSO & audit logs
              </li>
              <li className="flex items-start gap-2">
                <span className="text-dark-600 mt-0.5">—</span>
                Dedicated support
              </li>
            </ul>
            <a
              href="mailto:hello@revalyze.co"
              className="block w-full py-3 text-center text-dark-300 border border-dark-600 rounded-lg font-medium hover:bg-dark-700 hover:text-dark-100 transition-colors"
            >
              Contact us
            </a>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center text-sm text-dark-500 mt-8"
        >
          14-day free trial on all plans. No credit card required.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center text-xs text-dark-600 mt-6"
        >
          By signing up, you agree to our{' '}
          <Link to="/terms" className="underline hover:text-dark-400">Terms</Link>
          {' '}and{' '}
          <Link to="/privacy" className="underline hover:text-dark-400">Privacy Policy</Link>.
        </motion.div>
      </div>
    </section>
  );
};

export default PricingTeaser;
