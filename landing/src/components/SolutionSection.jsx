import { motion } from 'framer-motion';

const steps = [
  {
    number: "01",
    title: "Capture the decision",
    description: "What are you deciding? What's at stake? Document it while the context is fresh.",
    mockup: "capture",
  },
  {
    number: "02",
    title: "Explore alternatives",
    description: "What else could you do? What are the tradeoffs? See options side by side.",
    mockup: "alternatives",
  },
  {
    number: "03",
    title: "Choose with clarity",
    description: "Pick your path. Record your reasoning. No second-guessing later.",
    mockup: "choose",
  },
  {
    number: "04",
    title: "Track the outcome",
    description: "Did it work? What actually happened? Close the loop and learn.",
    mockup: "outcome",
  },
];

// Mini mockup components
const CaptureMockup = () => (
  <div className="bg-dark-800 rounded-lg p-4 border border-dark-600">
    <div className="text-xs text-dark-400 mb-3">New Decision</div>
    <div className="space-y-3">
      <div className="bg-dark-700 rounded px-3 py-2 text-sm text-dark-200">Should we raise prices by 20%?</div>
      <div className="flex gap-2">
        <span className="px-2 py-1 bg-accent-600/20 text-accent-400 rounded text-xs">Pricing</span>
        <span className="px-2 py-1 bg-dark-600 text-dark-300 rounded text-xs">High Impact</span>
      </div>
    </div>
  </div>
);

const AlternativesMockup = () => (
  <div className="bg-dark-800 rounded-lg p-4 border border-dark-600">
    <div className="text-xs text-dark-400 mb-3">Scenarios</div>
    <div className="space-y-2">
      {["Keep current pricing", "Increase by 10%", "Increase by 20%"].map((opt, i) => (
        <div key={i} className={`px-3 py-2 rounded text-xs ${i === 2 ? 'bg-accent-600/20 border border-accent-500/30 text-accent-300' : 'bg-dark-700 text-dark-300'}`}>
          {opt}
        </div>
      ))}
    </div>
  </div>
);

const ChooseMockup = () => (
  <div className="bg-dark-800 rounded-lg p-4 border border-dark-600">
    <div className="text-xs text-dark-400 mb-3">Final Verdict</div>
    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded px-3 py-2 mb-2">
      <div className="text-emerald-400 text-xs font-medium">✓ Proceed with 20% increase</div>
    </div>
    <div className="text-xs text-dark-500">Decided on Oct 15, 2025</div>
  </div>
);

const OutcomeMockup = () => (
  <div className="bg-dark-800 rounded-lg p-4 border border-dark-600">
    <div className="text-xs text-dark-400 mb-3">Outcome Tracking</div>
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-dark-700 rounded p-2">
        <div className="text-xs text-dark-500">Revenue</div>
        <div className="text-emerald-400 text-sm font-medium">+18%</div>
      </div>
      <div className="bg-dark-700 rounded p-2">
        <div className="text-xs text-dark-500">Churn</div>
        <div className="text-amber-400 text-sm font-medium">+2%</div>
      </div>
    </div>
  </div>
);

const mockups = {
  capture: CaptureMockup,
  alternatives: AlternativesMockup,
  choose: ChooseMockup,
  outcome: OutcomeMockup,
};

const SolutionSection = () => {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-dark-900">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-20"
        >
          <h2 className="font-serif text-3xl md:text-4xl text-dark-50 mb-6">
            A simple process for better decisions
          </h2>
          <p className="text-lg text-dark-300 max-w-2xl mx-auto">
            From consideration to outcome, everything in one place.
          </p>
        </motion.div>

        <div className="space-y-20">
          {steps.map((step, index) => {
            const MockupComponent = mockups[step.mockup];
            const isEven = index % 2 === 0;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true, margin: "-100px" }}
                className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-12`}
              >
                {/* Text content */}
                <div className="flex-1 text-center md:text-left">
                  <span className="text-sm font-mono text-dark-500 mb-2 block">
                    {step.number}
                  </span>
                  <h3 className="text-2xl font-semibold text-dark-50 mb-4">
                    {step.title}
                  </h3>
                  <p className="text-dark-400 leading-relaxed max-w-md">
                    {step.description}
                  </p>
                </div>

                {/* Mockup */}
                <div className="flex-1 w-full max-w-sm">
                  <MockupComponent />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;
