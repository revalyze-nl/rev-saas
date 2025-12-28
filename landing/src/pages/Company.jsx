import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const Company = () => {
  useEffect(() => {
    document.title = 'Company Information | Revalyze';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 relative">
      {/* Global background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900" />
        <div className="absolute top-[10%] left-[10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-[50%] right-[10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="py-6 border-b border-slate-800/50">
          <div className="max-w-4xl mx-auto px-6">
            <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-6">
            {/* Title */}
            <div className="mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Company Information
              </h1>
            </div>

            {/* Company Details */}
            <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 mb-12">
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-slate-500 text-sm mb-1">Company name</p>
                    <p className="text-white text-lg font-medium">Revalyze B.V.</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm mb-1">Legal form</p>
                    <p className="text-white text-lg">Private Limited Company (Besloten Vennootschap)</p>
                  </div>
                </div>

                <div className="border-t border-slate-700/50 pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-slate-500 text-sm mb-1">Chamber of Commerce (KvK) number</p>
                      <p className="text-white text-lg font-mono">97717606</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm mb-1">VAT number</p>
                      <p className="text-white text-lg font-mono">NL868199473B01</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-700/50 pt-6">
                  <div>
                    <p className="text-slate-500 text-sm mb-1">Registered location</p>
                    <p className="text-white text-lg">Utrecht, Netherlands</p>
                  </div>
                </div>

                <div className="border-t border-slate-700/50 pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-slate-500 text-sm mb-1">Website</p>
                      <a 
                        href="https://revalyze.co" 
                        className="text-blue-400 hover:text-blue-300 transition-colors text-lg"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        https://revalyze.co
                      </a>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm mb-1">Contact email</p>
                      <a 
                        href="mailto:hello@revalyze.co" 
                        className="text-blue-400 hover:text-blue-300 transition-colors text-lg"
                      >
                        hello@revalyze.co
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="text-slate-300 leading-relaxed text-lg">
              <p>
                Revalyze B.V. provides AI-powered pricing analysis and simulation software for SaaS companies.
              </p>
            </div>

            {/* Back to Home */}
            <div className="mt-16 pt-8 border-t border-slate-800/50">
              <Link 
                to="/" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors border border-slate-700 hover:border-blue-500/50"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </Link>
            </div>
          </div>
        </main>

        {/* Simple Footer */}
        <footer className="py-8 border-t border-slate-800/50">
          <div className="max-w-4xl mx-auto px-6 text-center text-sm text-slate-500">
            <p>&copy; {new Date().getFullYear()} Revalyze B.V. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Company;

