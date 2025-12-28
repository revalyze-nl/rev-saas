import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const Privacy = () => {
  useEffect(() => {
    document.title = 'Privacy Policy | Revalyze';
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
                Revalyze Privacy Policy
              </h1>
            </div>

            {/* Meta Info */}
            <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 mb-12">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Effective date:</span>
                  <span className="text-white ml-2">28 December 2025</span>
                </div>
                <div>
                  <span className="text-slate-500">Company:</span>
                  <span className="text-white ml-2">Revalyze B.V., Netherlands ("Revalyze", "we", "us")</span>
                </div>
                <div>
                  <span className="text-slate-500">Website:</span>
                  <a href="https://revalyze.co" className="text-blue-400 hover:text-blue-300 ml-2">revalyze.co</a>
                </div>
                <div>
                  <span className="text-slate-500">Service:</span>
                  <span className="text-white ml-2">Revalyze AI Pricing Brain for SaaS</span>
                </div>
              </div>
            </div>

            {/* Privacy Content */}
            <div className="prose prose-invert prose-slate max-w-none">
              <div className="space-y-12 text-slate-300 leading-relaxed">
                
                {/* Section 1 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
                  <p className="mb-4">
                    This Privacy Policy explains how Revalyze B.V. collects, uses, stores, and protects personal data when you use our website and services ("Service").
                  </p>
                  <p>
                    We are committed to protecting your privacy and complying with the General Data Protection Regulation (GDPR) and applicable Dutch and EU data protection laws.
                  </p>
                </section>

                {/* Section 2 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">2. Data Controller</h2>
                  <p className="mb-4">
                    Revalyze B.V. is the data controller responsible for processing your personal data.
                  </p>
                  <div className="bg-slate-800/30 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
                    <p className="font-semibold text-white mb-2">Contact:</p>
                    <p className="mb-1">
                      <span className="text-slate-500">Email:</span>
                      <a href="mailto:hello@revalyze.co" className="text-blue-400 hover:text-blue-300 ml-2">hello@revalyze.co</a>
                    </p>
                    <p>
                      <span className="text-slate-500">Location:</span>
                      <span className="text-white ml-2">Netherlands</span>
                    </p>
                  </div>
                </section>

                {/* Section 3 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">3. Personal Data We Collect</h2>
                  
                  <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.1 Account & Identity Data</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Name</li>
                    <li>Email address</li>
                    <li>Company name</li>
                    <li>Account identifiers</li>
                    <li>Authentication data (magic link tokens, hashed identifiers)</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.2 Billing & Payment Data</h3>
                  <ul className="list-disc pl-6 space-y-1 mb-4">
                    <li>Subscription status</li>
                    <li>Plan type</li>
                    <li>Billing cycle</li>
                    <li>Payment metadata (last 4 digits, country, VAT status)</li>
                  </ul>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                    <p className="text-amber-400 font-medium">Important:</p>
                    <p className="text-slate-300 mt-1">Payment card details are processed only by Stripe. Revalyze does not store full card numbers.</p>
                  </div>

                  <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.3 Business & Usage Data</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Pricing plans you create</li>
                    <li>Competitor data you submit or select</li>
                    <li>Pricing simulations and scenarios</li>
                    <li>Generated reports and exports (e.g., PDFs)</li>
                    <li>Feature usage, credit consumption</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.4 AI-Related Data</h3>
                  <ul className="list-disc pl-6 space-y-1 mb-4">
                    <li>Inputs you provide to AI-powered features</li>
                    <li>AI-generated outputs (analysis, summaries, recommendations)</li>
                  </ul>
                  <p className="mb-2">AI outputs may be logged temporarily for:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Debugging</li>
                    <li>Abuse prevention</li>
                    <li>Model quality improvement</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.5 Technical & Log Data</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>IP address</li>
                    <li>Browser type</li>
                    <li>Device and OS</li>
                    <li>Timestamps</li>
                    <li>Error logs and performance metrics</li>
                  </ul>
                </section>

                {/* Section 4 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">4. How We Use Your Data</h2>
                  <p className="mb-4">We process personal data for the following purposes:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Provide and operate the Service</li>
                    <li>Authenticate users (magic links, login emails)</li>
                    <li>Process subscriptions and payments</li>
                    <li>Generate pricing analyses and simulations</li>
                    <li>Improve product quality and reliability</li>
                    <li>Detect fraud, abuse, or technical issues</li>
                    <li>Communicate important service or legal updates</li>
                    <li>Comply with legal obligations</li>
                  </ul>
                </section>

                {/* Section 5 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">5. Legal Basis for Processing (GDPR)</h2>
                  <p className="mb-4">We rely on the following legal bases:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong className="text-white">Contract performance:</strong> providing the Service you requested</li>
                    <li><strong className="text-white">Legitimate interest:</strong> security, analytics, service improvement</li>
                    <li><strong className="text-white">Legal obligation:</strong> accounting, tax, compliance</li>
                    <li><strong className="text-white">Consent:</strong> marketing emails (if applicable)</li>
                  </ul>
                </section>

                {/* Section 6 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">6. AI & Automated Processing Disclosure</h2>
                  <p className="mb-4">Revalyze uses AI models to generate insights and recommendations.</p>
                  <ul className="list-disc pl-6 space-y-2 mb-4">
                    <li>AI outputs are informational only</li>
                    <li>No fully automated decision with legal or significant effect is made without user action</li>
                    <li>You remain responsible for final pricing decisions</li>
                  </ul>
                  <p>AI may generate incorrect or incomplete results. You must independently verify outputs.</p>
                </section>

                {/* Section 7 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">7. Data Sharing & Third Parties</h2>
                  <p className="mb-4">We share data only with trusted processors necessary to run the Service:</p>
                  
                  <h3 className="text-xl font-semibold text-white mt-6 mb-3">Key subprocessors:</h3>
                  <ul className="list-disc pl-6 space-y-2 mb-4">
                    <li><strong className="text-white">Stripe</strong> - payments & billing</li>
                    <li><strong className="text-white">AI providers (e.g. OpenAI)</strong> - AI analysis</li>
                    <li><strong className="text-white">Email providers (SMTP/Gmail or similar)</strong> - transactional emails</li>
                    <li><strong className="text-white">Hosting & infrastructure providers</strong> - servers and databases</li>
                    <li><strong className="text-white">Analytics & error tracking tools</strong> (if enabled)</li>
                  </ul>
                  <p>All subprocessors are bound by data processing agreements where required.</p>
                </section>

                {/* Section 8 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">8. International Data Transfers</h2>
                  <p className="mb-4">Some subprocessors may process data outside the EU.</p>
                  <p className="mb-2">Where applicable, we rely on:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Standard Contractual Clauses (SCCs)</li>
                    <li>GDPR-approved safeguards</li>
                  </ul>
                </section>

                {/* Section 9 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">9. Data Retention</h2>
                  <p className="mb-4">We retain personal data only as long as necessary:</p>
                  <ul className="list-disc pl-6 space-y-2 mb-4">
                    <li><strong className="text-white">Account data:</strong> while account is active</li>
                    <li><strong className="text-white">Billing data:</strong> as required by law (tax/accounting)</li>
                    <li><strong className="text-white">Logs:</strong> limited retention for security and debugging</li>
                    <li><strong className="text-white">AI inputs/outputs:</strong> short-term retention unless legally required</li>
                  </ul>
                  <p>You may request deletion subject to legal obligations.</p>
                </section>

                {/* Section 10 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">10. Your GDPR Rights</h2>
                  <p className="mb-4">You have the right to:</p>
                  <ul className="list-disc pl-6 space-y-2 mb-4">
                    <li>Access your personal data</li>
                    <li>Rectify incorrect data</li>
                    <li>Request deletion ("right to be forgotten")</li>
                    <li>Restrict or object to processing</li>
                    <li>Data portability</li>
                    <li>Withdraw consent at any time</li>
                  </ul>
                  <div className="bg-slate-800/30 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
                    <p>
                      To exercise your rights, contact: 
                      <a href="mailto:hello@revalyze.co" className="text-blue-400 hover:text-blue-300 ml-2">hello@revalyze.co</a>
                    </p>
                  </div>
                </section>

                {/* Section 11 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">11. Cookies & Tracking</h2>
                  <p className="mb-4">We may use essential cookies for authentication and session management.</p>
                  <p className="mb-4">Optional analytics cookies (if used) will be disclosed separately.</p>
                  <p className="font-semibold text-white">We do not sell personal data.</p>
                </section>

                {/* Section 12 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">12. Security Measures</h2>
                  <p className="mb-4">We implement reasonable technical and organizational safeguards, including:</p>
                  <ul className="list-disc pl-6 space-y-2 mb-4">
                    <li>Encrypted connections (HTTPS)</li>
                    <li>Access controls</li>
                    <li>Secure infrastructure</li>
                    <li>Limited internal access</li>
                  </ul>
                  <p>No system is 100% secure. You use the Service at your own risk.</p>
                </section>

                {/* Section 13 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">13. Children's Privacy</h2>
                  <p className="mb-4">The Service is not intended for individuals under 18.</p>
                  <p>We do not knowingly collect data from children.</p>
                </section>

                {/* Section 14 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">14. Changes to This Policy</h2>
                  <p className="mb-4">We may update this Privacy Policy from time to time.</p>
                  <p>Material changes will be communicated via email or in-app notice.</p>
                </section>

                {/* Section 15 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">15. Contact & Complaints</h2>
                  <p className="mb-4">If you have concerns, contact us first.</p>
                  <p className="mb-4">You also have the right to lodge a complaint with your local Data Protection Authority (e.g., in the Netherlands: Autoriteit Persoonsgegevens).</p>
                  <div className="bg-slate-800/30 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
                    <p className="mb-2">
                      <span className="text-slate-500">Email:</span>
                      <a href="mailto:hello@revalyze.co" className="text-blue-400 hover:text-blue-300 ml-2">hello@revalyze.co</a>
                    </p>
                    <p>
                      <span className="text-slate-500">Company:</span>
                      <span className="text-white ml-2">Revalyze B.V., Netherlands</span>
                    </p>
                  </div>
                </section>

              </div>
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

export default Privacy;

