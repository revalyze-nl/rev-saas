import { motion } from 'framer-motion';

const testimonials = [
  {
    quote: "Revalyze helped us identify that we were underpricing our Pro plan by 40%. After the adjustment, our revenue increased without any significant churn.",
    author: "Sarah Chen",
    role: "CEO",
    company: "DataFlow Analytics",
    avatar: "SC",
    metric: "+40%",
    metricLabel: "Revenue Increase"
  },
  {
    quote: "The competitor analysis saved us weeks of manual research. We now run a pricing review every quarter using Revalyze insights.",
    author: "Marcus Rodriguez",
    role: "Head of Product",
    company: "CloudSync Pro",
    avatar: "MR",
    metric: "10hrs",
    metricLabel: "Saved Weekly"
  },
  {
    quote: "The simulation feature gave us confidence to raise prices. We could see exactly what would happen before making the change.",
    author: "Emma Thompson",
    role: "Founder",
    company: "DesignStack",
    avatar: "ET",
    metric: "3x",
    metricLabel: "Faster Decisions"
  }
];

const stats = [
  { value: "500+", label: "SaaS Companies" },
  { value: "$2M+", label: "Revenue Optimized" },
  { value: "15min", label: "Avg. Analysis Time" },
  { value: "98%", label: "Customer Satisfaction" }
];

const Testimonials = () => {
  return (
    <section id="testimonials" className="py-24 relative overflow-hidden">

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
            Trusted by SaaS Leaders
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            What Our{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
              Customers Say
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Join hundreds of SaaS companies making smarter pricing decisions with Revalyze.
          </p>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
        >
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 text-center"
            >
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="group"
            >
              <div className="h-full bg-slate-800/30 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-8 hover:border-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/5">
                {/* Metric Badge */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <span className="text-emerald-400 font-bold">{testimonial.metric}</span>
                  </div>
                  <span className="text-sm text-slate-500">{testimonial.metricLabel}</span>
                </div>

                {/* Quote */}
                <blockquote className="text-lg text-slate-300 leading-relaxed mb-8">
                  "{testimonial.quote}"
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{testimonial.author}</div>
                    <div className="text-sm text-slate-400">
                      {testimonial.role} at {testimonial.company}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <a
            href="https://app.revalyze.co/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all hover:scale-105"
          >
            Start Your Free Trial
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;

