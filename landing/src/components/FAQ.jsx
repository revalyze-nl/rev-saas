import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    question: "How does Revalyze analyze competitor pricing?",
    answer: "Revalyze uses AI-powered web scraping and analysis to automatically discover and track your competitors' pricing pages. We extract plan names, prices, features, and billing periods, then provide actionable insights on how your pricing compares to the market."
  },
  {
    question: "What data do I need to get started?",
    answer: "Just your own pricing plans and a list of competitor URLs. Revalyze handles the rest—automatically extracting competitor data, analyzing market positioning, and generating recommendations. No spreadsheets or manual data entry required."
  },
  {
    question: "How accurate are the pricing simulations?",
    answer: "Our simulations use established price elasticity models combined with your specific market data. We provide three scenarios (Conservative, Base, Aggressive) so you can see a range of potential outcomes. While no prediction is 100% accurate, our models help you make data-driven decisions rather than guessing."
  },
  {
    question: "Can I export reports for my team or investors?",
    answer: "Yes! Every analysis and simulation can be exported as a professional PDF report. These reports include charts, insights, and recommendations—perfect for board meetings, investor updates, or team discussions."
  },
  {
    question: "How often should I run pricing analysis?",
    answer: "We recommend running a full analysis monthly, or whenever you're considering a price change. For competitor monitoring, Revalyze can track changes automatically and alert you when competitors update their pricing."
  },
  {
    question: "Is my pricing data secure?",
    answer: "Absolutely. All data is encrypted in transit and at rest. We never share your pricing data with other users or third parties. Your competitive intelligence stays yours."
  },
  {
    question: "What if a competitor's pricing page can't be scraped?",
    answer: "Some websites have anti-scraping measures. In these cases, you can manually add competitor data, or our support team can help find alternative data sources. We're constantly improving our extraction capabilities."
  },
  {
    question: "Do you offer a free trial?",
    answer: "Yes! New users get free AI credits to try out the platform. You can run analyses, simulations, and explore all features before committing to a paid plan."
  }
];

const FAQItem = ({ faq, isOpen, onClick }) => {
  return (
    <div className="border-b border-slate-700/50 last:border-none">
      <button
        onClick={onClick}
        className="w-full py-6 flex items-center justify-between text-left group"
      >
        <span className="text-lg font-medium text-white group-hover:text-blue-400 transition-colors pr-8">
          {faq.question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-slate-400 leading-relaxed">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="py-24 relative overflow-hidden">
      
      <div className="relative max-w-4xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
            FAQ
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Frequently Asked{' '}
            <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Everything you need to know about Revalyze and how it can help optimize your SaaS pricing.
          </p>
        </motion.div>

        {/* FAQ List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/30 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-8"
        >
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              faq={faq}
              isOpen={openIndex === index}
              onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
            />
          ))}
        </motion.div>

        {/* Still have questions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-slate-400 mb-4">Still have questions?</p>
          <a
            href="mailto:info@revalyze.co"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors border border-slate-700 hover:border-blue-500/50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contact Support
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;

