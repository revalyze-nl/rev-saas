import { useEffect } from 'react';
import { motion } from 'framer-motion';

const Privacy = () => {
  useEffect(() => {
    document.title = 'Privacy Policy | Revalyze';
  }, []);

  return (
    <div className="min-h-screen bg-surface-800 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Privacy Policy
          </h1>
          
          <p className="text-content-tertiary mb-12">
            Effective date: 03 January 2026
          </p>

          <div className="prose prose-invert max-w-none space-y-12">
            
            {/* Header Info */}
            <div className="bg-surface-700/50 rounded-xl p-6 border border-white/5">
              <p className="text-content-secondary leading-relaxed m-0">
                <strong className="text-white">Company:</strong> Revalyze B.V., Netherlands ("Revalyze", "we", "us")<br />
                <strong className="text-white">Website:</strong> revalyze.co<br />
                <strong className="text-white">Service:</strong> Revalyze AI Pricing Brain for SaaS
              </p>
            </div>

            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
              <p className="text-content-secondary leading-relaxed">
                This Privacy Policy explains how Revalyze B.V. collects, uses, stores, and protects personal data when you use our website and services ("Service").
              </p>
              <p className="text-content-secondary leading-relaxed">
                We are committed to protecting your privacy and complying with the General Data Protection Regulation (GDPR) and applicable Dutch and EU data protection laws.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. Data Controller</h2>
              <p className="text-content-secondary leading-relaxed">
                Revalyze B.V. is the data controller responsible for processing your personal data.
              </p>
              <div className="bg-surface-700/30 rounded-lg p-4 border border-white/5 mt-4">
                <p className="text-content-secondary m-0">
                  <strong className="text-white">Contact:</strong><br />
                  Email: <a href="mailto:hello@revalyze.co" className="text-brand-400 hover:text-brand-300">hello@revalyze.co</a><br />
                  Location: Netherlands
                </p>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. Personal Data We Collect</h2>
              
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.1 Account & Identity Data</h3>
              <ul className="list-disc list-inside text-content-secondary space-y-1">
                <li>Name</li>
                <li>Email address</li>
                <li>Company name</li>
                <li>Account identifiers</li>
                <li>Authentication data (magic link tokens, hashed identifiers)</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.2 Billing & Payment Data</h3>
              <ul className="list-disc list-inside text-content-secondary space-y-1">
                <li>Subscription status</li>
                <li>Plan type</li>
                <li>Billing cycle</li>
                <li>Payment metadata (last 4 digits, country, VAT status)</li>
              </ul>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mt-4">
                <p className="text-amber-400 font-medium m-0">
                  ⚠️ Important: Payment card details are processed only by Stripe. Revalyze does not store full card numbers.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.3 Business & Usage Data</h3>
              <ul className="list-disc list-inside text-content-secondary space-y-1">
                <li>Pricing plans you create</li>
                <li>Competitor data you submit or select</li>
                <li>Pricing simulations and scenarios</li>
                <li>Generated reports and exports (e.g., PDFs)</li>
                <li>Feature usage, credit consumption</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.4 AI-Related Data</h3>
              <ul className="list-disc list-inside text-content-secondary space-y-1">
                <li>Inputs you provide to AI-powered features</li>
                <li>AI-generated outputs (analysis, summaries, recommendations)</li>
              </ul>
              <p className="text-content-secondary mt-3">
                AI outputs may be logged temporarily for:
              </p>
              <ul className="list-disc list-inside text-content-secondary space-y-1 ml-4">
                <li>Debugging</li>
                <li>Abuse prevention</li>
                <li>Model quality improvement</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.5 Technical & Log Data</h3>
              <ul className="list-disc list-inside text-content-secondary space-y-1">
                <li>IP address</li>
                <li>Browser type</li>
                <li>Device and OS</li>
                <li>Timestamps</li>
                <li>Error logs and performance metrics</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. How We Use Your Data</h2>
              <p className="text-content-secondary leading-relaxed mb-4">
                We process personal data for the following purposes:
              </p>
              <ul className="list-disc list-inside text-content-secondary space-y-1">
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
              <h2 className="text-2xl font-bold text-white mb-4">5. Legal Basis for Processing (GDPR)</h2>
              <p className="text-content-secondary leading-relaxed mb-4">
                We rely on the following legal bases:
              </p>
              <ul className="list-disc list-inside text-content-secondary space-y-2">
                <li><strong className="text-white">Contract performance:</strong> providing the Service you requested</li>
                <li><strong className="text-white">Legitimate interest:</strong> security, analytics, service improvement</li>
                <li><strong className="text-white">Legal obligation:</strong> accounting, tax, compliance</li>
                <li><strong className="text-white">Consent:</strong> marketing emails (if applicable)</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. AI & Automated Processing Disclosure</h2>
              <p className="text-content-secondary leading-relaxed">
                Revalyze uses AI models to generate insights and recommendations.
              </p>
              <ul className="list-disc list-inside text-content-secondary space-y-1 mt-4">
                <li>AI outputs are informational only</li>
                <li>No fully automated decision with legal or significant effect is made without user action</li>
                <li>You remain responsible for final pricing decisions</li>
              </ul>
              <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg p-4 mt-4">
                <p className="text-brand-400 m-0">
                  AI may generate incorrect or incomplete results. You must independently verify outputs.
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Data Sharing & Third Parties</h2>
              <p className="text-content-secondary leading-relaxed mb-4">
                We share data only with trusted processors necessary to run the Service:
              </p>
              <p className="text-white font-semibold mb-3">Key subprocessors:</p>
              <ul className="list-disc list-inside text-content-secondary space-y-1">
                <li><strong className="text-white">Stripe</strong> – payments & billing</li>
                <li><strong className="text-white">AI providers</strong> (e.g. OpenAI) – AI analysis</li>
                <li><strong className="text-white">Email providers</strong> (SMTP/Gmail or similar) – transactional emails</li>
                <li><strong className="text-white">Hosting & infrastructure providers</strong> – servers and databases</li>
                <li><strong className="text-white">Analytics & error tracking tools</strong> (if enabled)</li>
              </ul>
              <p className="text-content-secondary leading-relaxed mt-4">
                All subprocessors are bound by data processing agreements where required.
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. International Data Transfers</h2>
              <p className="text-content-secondary leading-relaxed">
                Some subprocessors may process data outside the EU.
              </p>
              <p className="text-content-secondary leading-relaxed mt-3">
                Where applicable, we rely on:
              </p>
              <ul className="list-disc list-inside text-content-secondary space-y-1 mt-2">
                <li>Standard Contractual Clauses (SCCs)</li>
                <li>GDPR-approved safeguards</li>
              </ul>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Data Retention</h2>
              <p className="text-content-secondary leading-relaxed mb-4">
                We retain personal data only as long as necessary:
              </p>
              <ul className="list-disc list-inside text-content-secondary space-y-1">
                <li><strong className="text-white">Account data:</strong> while account is active</li>
                <li><strong className="text-white">Billing data:</strong> as required by law (tax/accounting)</li>
                <li><strong className="text-white">Logs:</strong> limited retention for security and debugging</li>
                <li><strong className="text-white">AI inputs/outputs:</strong> short-term retention unless legally required</li>
              </ul>
              <p className="text-content-secondary leading-relaxed mt-4">
                You may request deletion subject to legal obligations.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Your GDPR Rights</h2>
              <p className="text-content-secondary leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-content-secondary space-y-1">
                <li>Access your personal data</li>
                <li>Rectify incorrect data</li>
                <li>Request deletion ("right to be forgotten")</li>
                <li>Restrict or object to processing</li>
                <li>Data portability</li>
                <li>Withdraw consent at any time</li>
              </ul>
              <div className="bg-surface-700/50 rounded-lg p-4 mt-4 border border-white/5">
                <p className="text-content-secondary m-0">
                  To exercise your rights, contact: <a href="mailto:hello@revalyze.co" className="text-brand-400 hover:text-brand-300">hello@revalyze.co</a>
                </p>
              </div>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">11. Cookies & Tracking</h2>
              <p className="text-content-secondary leading-relaxed">
                We may use essential cookies for authentication and session management.
              </p>
              <p className="text-content-secondary leading-relaxed mt-3">
                Optional analytics cookies (if used) will be disclosed separately.
              </p>
              <p className="text-content-secondary leading-relaxed mt-3 font-medium">
                We do not sell personal data.
              </p>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">12. Security Measures</h2>
              <p className="text-content-secondary leading-relaxed mb-4">
                We implement reasonable technical and organizational safeguards, including:
              </p>
              <ul className="list-disc list-inside text-content-secondary space-y-1">
                <li>Encrypted connections (HTTPS)</li>
                <li>Access controls</li>
                <li>Secure infrastructure</li>
                <li>Limited internal access</li>
              </ul>
              <p className="text-content-tertiary leading-relaxed mt-4 text-sm">
                No system is 100% secure. You use the Service at your own risk.
              </p>
            </section>

            {/* Section 13 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">13. Children's Privacy</h2>
              <p className="text-content-secondary leading-relaxed">
                The Service is not intended for individuals under 18.
              </p>
              <p className="text-content-secondary leading-relaxed mt-2">
                We do not knowingly collect data from children.
              </p>
            </section>

            {/* Section 14 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">14. Changes to This Policy</h2>
              <p className="text-content-secondary leading-relaxed">
                We may update this Privacy Policy from time to time.
              </p>
              <p className="text-content-secondary leading-relaxed mt-2">
                Material changes will be communicated via email or in-app notice.
              </p>
            </section>

            {/* Section 15 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">15. Contact & Complaints</h2>
              <p className="text-content-secondary leading-relaxed">
                If you have concerns, contact us first.
              </p>
              <p className="text-content-secondary leading-relaxed mt-3">
                You also have the right to lodge a complaint with your local Data Protection Authority (e.g., in the Netherlands: Autoriteit Persoonsgegevens).
              </p>
            </section>

          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Privacy;
