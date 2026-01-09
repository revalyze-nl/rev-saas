import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const PricingTeaser = () => {
  return (
    <section id="pricing" className="py-24 px-6 bg-dark-800">
      <div className="max-w-5xl mx-auto">
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
            className="bg-dark-800 rounded-2xl p-8 border border-dark-700 flex flex-col"
          >
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-dark-100 mb-1">Starter</h3>
              <p className="text-dark-500 text-sm">For teams exploring better decisions</p>
            </div>

            <div className="mb-8">
              <span className="text-3xl font-semibold text-dark-50">€69</span>
              <span className="text-dark-500 ml-1">/month</span>
            </div>
            
            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex items-start gap-3 text-sm text-dark-300">
                <span className="text-dark-600 mt-0.5">—</span>
                Make decisions visible
              </li>
              <li className="flex items-start gap-3 text-sm text-dark-300">
                <span className="text-dark-600 mt-0.5">—</span>
                Explore alternatives
              </li>
              <li className="flex items-start gap-3 text-sm text-dark-300">
                <span className="text-dark-600 mt-0.5">—</span>
                See what might happen
              </li>
            </ul>

            <div className="pt-6 border-t border-dark-700 mb-8">
              <ul className="space-y-2 text-xs text-dark-500">
                <li>3 decisions / month</li>
                <li>3 scenarios / month</li>
                <li>Notes-only outcomes</li>
              </ul>
            </div>

            <a
              href="https://app.revalyze.co/signup"
              className="block w-full py-3 text-center text-dark-400 border border-dark-700 rounded-lg font-medium hover:text-dark-200 hover:border-dark-600 transition-colors"
            >
              Start small
            </a>
          </motion.div>

          {/* Growth */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true, margin: "-100px" }}
            className="relative bg-dark-700 rounded-2xl p-8 border border-dark-600 flex flex-col"
          >
            <div className="absolute -top-3 left-6">
              <span className="text-xs text-dark-400 bg-dark-700 px-3 py-1 border border-dark-600 rounded-full">
                Most teams start here
              </span>
            </div>

            <div className="mb-6 mt-2">
              <h3 className="text-lg font-semibold text-dark-50 mb-1">Growth</h3>
              <p className="text-dark-400 text-sm">For teams that want to learn from outcomes</p>
            </div>

            <div className="mb-8">
              <span className="text-3xl font-semibold text-dark-50">€159</span>
              <span className="text-dark-400 ml-1">/month</span>
            </div>
            
            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex items-start gap-3 text-sm text-dark-200">
                <span className="text-dark-500 mt-0.5">—</span>
                Compare scenarios
              </li>
              <li className="flex items-start gap-3 text-sm text-dark-200">
                <span className="text-dark-500 mt-0.5">—</span>
                Choose paths intentionally
              </li>
              <li className="flex items-start gap-3 text-sm text-dark-200">
                <span className="text-dark-500 mt-0.5">—</span>
                Track measurable outcomes
              </li>
              <li className="flex items-start gap-3 text-sm text-dark-200">
                <span className="text-dark-500 mt-0.5">—</span>
                Build a decision history
              </li>
            </ul>

            <div className="pt-6 border-t border-dark-600 mb-8">
              <ul className="space-y-2 text-xs text-dark-400">
                <li>10 decisions / month</li>
                <li>10 scenarios / month</li>
                <li>Outcome KPIs</li>
                <li>Decision timeline</li>
              </ul>
            </div>

            <a
              href="https://app.revalyze.co/signup"
              className="block w-full py-3 text-center text-dark-900 bg-dark-100 rounded-lg font-medium hover:bg-dark-50 transition-colors"
            >
              Upgrade to Growth
            </a>
          </motion.div>

          {/* Enterprise */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true, margin: "-100px" }}
            className="bg-dark-800 rounded-2xl p-8 border border-dark-700 flex flex-col"
          >
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-dark-100 mb-1">Enterprise</h3>
              <p className="text-dark-500 text-sm">For organizations that don't want to repeat mistakes</p>
            </div>

            <div className="mb-8">
              <span className="text-3xl font-semibold text-dark-50">€399</span>
              <span className="text-dark-500 ml-1">/month</span>
            </div>
            
            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex items-start gap-3 text-sm text-dark-300">
                <span className="text-dark-600 mt-0.5">—</span>
                Learn from past decisions
              </li>
              <li className="flex items-start gap-3 text-sm text-dark-300">
                <span className="text-dark-600 mt-0.5">—</span>
                Recognize patterns over time
              </li>
              <li className="flex items-start gap-3 text-sm text-dark-300">
                <span className="text-dark-600 mt-0.5">—</span>
                Share insights with leadership
              </li>
              <li className="flex items-start gap-3 text-sm text-dark-300">
                <span className="text-dark-600 mt-0.5">—</span>
                Export decisions and results
              </li>
            </ul>

            <div className="pt-6 border-t border-dark-700 mb-8">
              <ul className="space-y-2 text-xs text-dark-500">
                <li>50 decisions / month</li>
                <li>50 scenarios / month</li>
                <li>Learning across decisions</li>
                <li>Exports & reports</li>
                <li className="text-dark-600">Team-level visibility (coming soon)</li>
              </ul>
            </div>

            <a
              href="https://app.revalyze.co/signup"
              className="block w-full py-3 text-center text-dark-400 border border-dark-700 rounded-lg font-medium hover:text-dark-200 hover:border-dark-600 transition-colors"
            >
              Start with Enterprise
            </a>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center text-sm text-dark-500 mt-10"
        >
          14-day free trial on all plans. No credit card required.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center text-xs text-dark-600 mt-4"
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
