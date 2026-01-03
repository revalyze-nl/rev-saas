import { useEffect } from 'react';
import { motion } from 'framer-motion';

const Company = () => {
  useEffect(() => {
    document.title = 'Company Information | Revalyze';
  }, []);

  return (
    <div className="min-h-screen bg-surface-800 pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-12">
            Company Information
          </h1>
          
          <div className="space-y-8">
            {/* Company Details */}
            <div className="bg-surface-700/50 rounded-2xl p-8 border border-white/5">
              <dl className="space-y-6">
                <div>
                  <dt className="text-sm font-medium text-content-tertiary uppercase tracking-wider mb-1">
                    Company name
                  </dt>
                  <dd className="text-xl font-semibold text-white">
                    Revalyze B.V.
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-content-tertiary uppercase tracking-wider mb-1">
                    Legal form
                  </dt>
                  <dd className="text-lg text-content-secondary">
                    Private Limited Company (Besloten Vennootschap)
                  </dd>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <dt className="text-sm font-medium text-content-tertiary uppercase tracking-wider mb-1">
                    Chamber of Commerce (KvK) number
                  </dt>
                  <dd className="text-lg text-white font-mono">
                    97717606
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-content-tertiary uppercase tracking-wider mb-1">
                    VAT number
                  </dt>
                  <dd className="text-lg text-white font-mono">
                    NL868199473B01
                  </dd>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <dt className="text-sm font-medium text-content-tertiary uppercase tracking-wider mb-1">
                    Registered location
                  </dt>
                  <dd className="text-lg text-content-secondary">
                    Utrecht, Netherlands
                  </dd>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <dt className="text-sm font-medium text-content-tertiary uppercase tracking-wider mb-1">
                    Website
                  </dt>
                  <dd>
                    <a 
                      href="https://revalyze.co" 
                      className="text-lg text-brand-400 hover:text-brand-300 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      https://revalyze.co
                    </a>
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-content-tertiary uppercase tracking-wider mb-1">
                    Contact email
                  </dt>
                  <dd>
                    <a 
                      href="mailto:hello@revalyze.co" 
                      className="text-lg text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      hello@revalyze.co
                    </a>
                  </dd>
                </div>
              </dl>
            </div>

            {/* Description */}
            <div className="bg-surface-700/30 rounded-xl p-6 border border-white/5">
              <p className="text-content-secondary leading-relaxed">
                Revalyze B.V. provides AI-powered pricing analysis and simulation software for SaaS companies.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Company;
