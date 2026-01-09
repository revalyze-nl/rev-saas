import { motion } from 'framer-motion';

const Hero = () => {
  return (
    <section className="min-h-[90vh] flex items-center justify-center px-6 pt-24 pb-20 bg-dark-900">
      <div className="max-w-3xl mx-auto text-center">
        {/* Main heading - thoughtful, quiet */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="font-serif text-4xl md:text-5xl lg:text-6xl text-dark-50 mb-8 leading-tight tracking-tight"
        >
          Some decisions matter longer than the moment they're made.
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
          className="text-xl md:text-2xl text-dark-300 mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          Most teams move on after a decision. Revalyze helps you learn from it.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <a
            href="https://app.revalyze.co/signup"
            className="inline-flex items-center justify-center px-8 py-4 bg-dark-50 text-dark-900 rounded-lg font-medium hover:bg-dark-100 transition-colors"
          >
            Make your first decision
          </a>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center px-8 py-4 text-dark-300 rounded-lg font-medium hover:text-dark-50 hover:bg-dark-800 transition-colors border border-dark-700"
          >
            See how it works
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
