import { motion } from 'framer-motion';

const FinalCTA = () => {
  return (
    <section className="py-24 px-6 bg-dark-900">
      <div className="max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 className="font-serif text-3xl md:text-4xl text-dark-50 mb-6">
            Start making decisions you can learn from
          </h2>
          <p className="text-lg text-dark-400 mb-10 max-w-lg mx-auto">
            Your next important decision deserves better than a Slack thread.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://app.revalyze.co/signup"
              className="inline-flex items-center justify-center px-8 py-4 bg-dark-50 text-dark-900 rounded-lg font-medium hover:bg-dark-100 transition-colors"
            >
              Make your first decision
            </a>
            <a
              href="mailto:hello@revalyze.co"
              className="inline-flex items-center justify-center px-8 py-4 text-dark-300 rounded-lg font-medium hover:text-dark-50 hover:bg-dark-800 transition-colors border border-dark-700"
            >
              Talk to us
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
