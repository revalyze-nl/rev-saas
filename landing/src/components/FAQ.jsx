import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    question: "How does Revalyze connect to my Stripe account?",
    answer: "We use Stripe Connect with read-only access. Your payment data never touches our servers directly — we only analyze aggregated metrics like MRR, ARPU, and churn rates. You can revoke access anytime from your Stripe dashboard."
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. We use bank-level encryption (AES-256) for all data at rest and in transit. We're GDPR compliant and never share your data with third parties. Your Stripe connection is read-only, meaning we can never make changes to your account."
  },
  {
    question: "How accurate are the AI recommendations?",
    answer: "Our AI models are trained on thousands of SaaS pricing scenarios and continuously improved. Recommendations are based on your actual revenue data, market positioning, and competitor analysis. We provide confidence scores and multiple scenarios so you can make informed decisions."
  },
  {
    question: "What are AI Insight Credits?",
    answer: "AI Insight Credits are used for advanced AI-powered analyses like pricing simulations, competitor deep-dives, and strategic recommendations. Each plan includes a monthly allocation, and credits reset at the start of each billing cycle."
  },
  {
    question: "Can I try before I buy?",
    answer: "Yes! Every plan includes a 14-day free trial with full access to all features. No credit card required to start. You can explore the platform, connect your Stripe, and run simulations before deciding."
  },
  {
    question: "How does competitor tracking work?",
    answer: "Simply add your competitors' pricing page URLs. Our AI automatically extracts their plans, features, and pricing. We update this data regularly and alert you when competitors make pricing changes."
  },
  {
    question: "Can I export reports for my team or investors?",
    answer: "Yes! All plans include PDF export for pricing analyses. Growth and Enterprise plans also support simulation exports. Enterprise plans add CSV/Excel export for deeper data analysis."
  },
  {
    question: "What if I need more than the Enterprise plan offers?",
    answer: "Contact us at hello@revalyze.co for custom enterprise solutions. We offer custom integrations, dedicated support, and tailored AI models for larger organizations."
  }
];

const FAQItem = ({ faq, isOpen, onClick }) => {
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={onClick}
        className="w-full py-6 flex items-center justify-between text-left group"
      >
        <span className="text-lg font-medium text-white group-hover:text-brand-400 transition-colors pr-8">
          {faq.question}
        </span>
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-surface-600 flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-brand-500 rotate-180' : ''}`}>
          <svg 
            className={`w-4 h-4 transition-colors ${isOpen ? 'text-white' : 'text-content-tertiary'}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-content-secondary leading-relaxed pr-12">
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
    <section id="faq" className="py-24 bg-surface-800 relative">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500/10 border border-brand-500/20 rounded-full text-sm font-medium text-brand-400 mb-6">
            <span className="w-1.5 h-1.5 bg-brand-400 rounded-full"></span>
            FAQ
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Frequently asked
            <br />
            <span className="gradient-text">questions</span>
          </h2>
          <p className="text-xl text-content-secondary max-w-2xl mx-auto">
            Everything you need to know about Revalyze. Can't find an answer? 
            <a href="mailto:hello@revalyze.co" className="text-brand-400 hover:underline ml-1">Contact us</a>.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="bg-surface-700/50 backdrop-blur-sm rounded-2xl border border-white/5 px-8"
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
      </div>
    </section>
  );
};

export default FAQ;
