import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    question: "What is Revalyze, in simple terms?",
    answer: `Revalyze helps teams keep track of important decisions and understand what happened after they were made.

Instead of decisions disappearing into meetings or documents, Revalyze connects them to outcomes so you can learn over time.`
  },
  {
    question: "Is Revalyze for strategy or day-to-day decisions?",
    answer: `Both.

Revalyze is designed for decisions that matter beyond the moment:
• Pricing changes
• Product bets
• Growth experiments
• Strategic trade-offs

If a decision can affect results weeks or months later, it belongs here.`
  },
  {
    question: "How is this different from taking notes or writing docs?",
    answer: `Notes capture what was said.
Documents capture what was decided.

Revalyze captures:
• Why a decision was made
• What alternatives existed
• Which path was chosen
• What actually changed afterward

That connection is usually missing.`
  },
  {
    question: "Do I need to know exactly what to input?",
    answer: `No.

You can start with as little as a short description. Revalyze helps structure the decision and explore alternatives.

You're not expected to "fill forms" or overthink upfront.`
  },
  {
    question: "What happens after I make a decision in Revalyze?",
    answer: `The decision becomes a record.

You can:
• Explore scenarios
• Choose a path
• Track outcomes
• Revisit it later

Over time, your decision history turns into a learning system.`
  },
  {
    question: "Does Revalyze replace meetings or planning tools?",
    answer: `No.

Revalyze sits after the discussion, not instead of it.

Meetings help you decide.
Revalyze helps you remember and learn.`
  },
  {
    question: "Is this only for large companies?",
    answer: `Not at all.

Early-stage teams often benefit the most because every decision has a bigger impact.

Revalyze grows with you as decisions start repeating.`
  },
  {
    question: "Do I need to use it every day?",
    answer: `No.

Revalyze isn't a daily task manager. It's used when a decision feels important enough to learn from later.

That's usually a few times a month, not every day.`
  },
  {
    question: "What if I stop using it later?",
    answer: `Your decision history stays intact.

Even if you pause, the decisions you recorded remain valuable references for the future.`
  },
  {
    question: "Can I try it without committing?",
    answer: `Yes.

You can start small and see how it fits your decision process before going deeper.`
  }
];

const FAQItem = ({ question, answer, isOpen, onClick }) => {
  return (
    <div className="border-b border-dark-700">
      <button
        onClick={onClick}
        className="w-full py-6 flex items-start justify-between text-left group"
      >
        <span className="text-lg font-medium text-dark-100 group-hover:text-dark-50 transition-colors pr-8">
          {question}
        </span>
        <span className="flex-shrink-0 mt-1">
          <svg
            className={`w-5 h-5 text-dark-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pb-6 pr-12">
              <p className="text-dark-400 leading-relaxed whitespace-pre-line">
                {answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 px-6 bg-dark-900">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-3xl md:text-4xl text-dark-50 mb-6">
            Frequently asked questions
          </h2>
          <p className="text-lg text-dark-400 max-w-xl mx-auto">
            Everything you might want to know about Revalyze.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          viewport={{ once: true, margin: "-100px" }}
          className="border-t border-dark-700"
        >
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onClick={() => handleToggle(index)}
            />
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mt-12 text-center"
        >
          <p className="text-dark-500 text-sm">
            Still have questions?{' '}
            <a href="mailto:hello@revalyze.co" className="text-dark-300 underline hover:text-dark-100 transition-colors">
              We're happy to help
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;

