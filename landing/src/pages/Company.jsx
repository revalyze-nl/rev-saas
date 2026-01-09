import { useEffect } from 'react';
import { motion } from 'framer-motion';

const Company = () => {
  useEffect(() => {
    document.title = 'Company Information | Revalyze';
  }, []);

  return (
    <div className="min-h-screen bg-dark-900 pt-24 pb-16">
      <div className="max-w-2xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-serif text-4xl md:text-5xl text-dark-50 mb-12">
            Company Information
          </h1>
          
          <div className="space-y-8">
            {/* Company Details */}
            <div className="bg-dark-800 rounded-2xl p-8 border border-dark-700">
              <dl className="space-y-6">
                <div>
                  <dt className="text-xs font-medium text-dark-500 uppercase tracking-wider mb-1">
                    Company name
                  </dt>
                  <dd className="text-xl font-semibold text-dark-50">
                    Revalyze B.V.
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-dark-500 uppercase tracking-wider mb-1">
                    Legal form
                  </dt>
                  <dd className="text-dark-300">
                    Private Limited Company (Besloten Vennootschap)
                  </dd>
                </div>

                <div className="pt-4 border-t border-dark-700">
                  <dt className="text-xs font-medium text-dark-500 uppercase tracking-wider mb-1">
                    Chamber of Commerce (KvK) number
                  </dt>
                  <dd className="text-dark-100 font-mono">
                    97717606
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-dark-500 uppercase tracking-wider mb-1">
                    VAT number
                  </dt>
                  <dd className="text-dark-100 font-mono">
                    NL868199473B01
                  </dd>
                </div>

                <div className="pt-4 border-t border-dark-700">
                  <dt className="text-xs font-medium text-dark-500 uppercase tracking-wider mb-1">
                    Registered location
                  </dt>
                  <dd className="text-dark-300">
                    Utrecht, Netherlands
                  </dd>
                </div>

                <div className="pt-4 border-t border-dark-700">
                  <dt className="text-xs font-medium text-dark-500 uppercase tracking-wider mb-1">
                    Website
                  </dt>
                  <dd>
                    <a 
                      href="https://revalyze.co" 
                      className="text-dark-100 underline hover:text-dark-50 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      https://revalyze.co
                    </a>
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-dark-500 uppercase tracking-wider mb-1">
                    Contact email
                  </dt>
                  <dd>
                    <a 
                      href="mailto:hello@revalyze.co" 
                      className="text-dark-100 underline hover:text-dark-50 transition-colors"
                    >
                      hello@revalyze.co
                    </a>
                  </dd>
                </div>
              </dl>
            </div>

            {/* Description */}
            <div className="text-center py-8">
              <p className="text-dark-500 leading-relaxed">
                Revalyze helps teams make better decisions by providing tools to capture, explore, and learn from every choice.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Company;
