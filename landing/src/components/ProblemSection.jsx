import { motion } from 'framer-motion';

const ProblemSection = () => {
  return (
    <section className="py-24 px-6 bg-dark-800">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-3xl md:text-4xl text-dark-50 mb-6">
            Decisions disappear into Slack threads and forgotten docs
          </h2>
          <p className="text-lg text-dark-300 max-w-2xl mx-auto">
            You made a pricing change six months ago. Do you remember why? 
            What alternatives you considered? Whether it worked?
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {[
            {
              title: "The context fades",
              description: "Three months later, nobody remembers what problem you were solving.",
            },
            {
              title: "Patterns stay hidden",
              description: "Your best decisions and worst mistakes look the same in hindsight.",
            },
            {
              title: "Teams repeat errors",
              description: "Without memory, every decision starts from scratch.",
            },
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true, margin: "-100px" }}
              className="text-center md:text-left"
            >
              <h3 className="text-lg font-semibold text-dark-100 mb-3">
                {item.title}
              </h3>
              <p className="text-dark-400 leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Screenshot - Decision History */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: "-100px" }}
          className="relative"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-accent-600/20 via-accent-500/10 to-accent-600/20 rounded-2xl blur-xl opacity-50" />
          <div className="relative bg-dark-700 rounded-xl border border-dark-600 overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-dark-800 border-b border-dark-600">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-dark-500" />
                <div className="w-3 h-3 rounded-full bg-dark-500" />
                <div className="w-3 h-3 rounded-full bg-dark-500" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-dark-700 rounded px-3 py-1 text-xs text-dark-400 text-center max-w-xs mx-auto">
                  app.revalyze.co/decisions
                </div>
              </div>
            </div>
            
            {/* Mock decision list */}
            <div className="p-6">
              <div className="text-xs text-dark-400 uppercase tracking-wider mb-4">Decision History</div>
              <div className="space-y-3">
                {[
                  { title: "Increase Pro plan from €99 to €129", date: "Oct 15, 2025", status: "Achieved", statusColor: "text-emerald-400" },
                  { title: "Launch annual billing option", date: "Sep 3, 2025", status: "In Progress", statusColor: "text-amber-400" },
                  { title: "Remove Starter plan free trial", date: "Aug 12, 2025", status: "Missed", statusColor: "text-red-400" },
                  { title: "Add enterprise tier", date: "Jul 28, 2025", status: "Achieved", statusColor: "text-emerald-400" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg border border-dark-600/50">
                    <div>
                      <div className="text-dark-100 font-medium text-sm">{item.title}</div>
                      <div className="text-dark-500 text-xs mt-1">{item.date}</div>
                    </div>
                    <span className={`text-xs font-medium ${item.statusColor}`}>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ProblemSection;
