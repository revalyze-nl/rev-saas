import { useEffect } from 'react';
import { motion } from 'framer-motion';

const Privacy = () => {
  useEffect(() => {
    document.title = 'Privacy Policy | Revalyze';
  }, []);

  return (
    <div className="min-h-screen bg-dark-900 pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-serif text-4xl md:text-5xl text-dark-50 mb-4">
            Privacy Policy
          </h1>
          
          <p className="text-dark-500 mb-12">
            Effective date: 03 January 2026
          </p>

          <div className="prose prose-invert max-w-none">
            
            {/* Header Info */}
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700 mb-12 not-prose">
              <p className="text-dark-400 leading-relaxed m-0 text-sm">
                <strong className="text-dark-200">Company:</strong> Revalyze B.V., Netherlands<br />
                <strong className="text-dark-200">Website:</strong> revalyze.co<br />
                <strong className="text-dark-200">Service:</strong> Revalyze Decision Intelligence Platform
              </p>
            </div>

            {/* Section 1 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">1. Introduction</h2>
              <p className="text-dark-400 leading-relaxed">
                This Privacy Policy explains how Revalyze B.V. collects, uses, stores, and protects personal data when you use our website and services.
              </p>
              <p className="text-dark-400 leading-relaxed">
                We are committed to protecting your privacy and complying with the General Data Protection Regulation (GDPR) and applicable Dutch and EU data protection laws.
              </p>
            </section>

            {/* Section 2 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">2. Data Controller</h2>
              <p className="text-dark-400 leading-relaxed">
                Revalyze B.V. is the data controller responsible for processing your personal data.
              </p>
              <div className="bg-dark-800 rounded-lg p-4 border border-dark-700 mt-4 not-prose">
                <p className="text-dark-400 m-0 text-sm">
                  <strong className="text-dark-200">Contact:</strong><br />
                  Email: <a href="mailto:hello@revalyze.co" className="text-dark-200 underline">hello@revalyze.co</a><br />
                  Location: Netherlands
                </p>
              </div>
            </section>

            {/* Section 3 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">3. Personal Data We Collect</h2>
              
              <h3 className="text-lg font-medium text-dark-200 mt-6 mb-3">3.1 Account & Identity Data</h3>
              <ul className="list-disc list-inside text-dark-400 space-y-1">
                <li>Name and email address</li>
                <li>Company name</li>
                <li>Account identifiers</li>
                <li>Authentication data</li>
              </ul>

              <h3 className="text-lg font-medium text-dark-200 mt-6 mb-3">3.2 Billing & Payment Data</h3>
              <ul className="list-disc list-inside text-dark-400 space-y-1">
                <li>Subscription status and plan type</li>
                <li>Billing cycle</li>
                <li>Payment metadata (last 4 digits, country)</li>
              </ul>
              <p className="text-dark-500 text-sm mt-2">
                Payment card details are processed only by Stripe. We do not store full card numbers.
              </p>

              <h3 className="text-lg font-medium text-dark-200 mt-6 mb-3">3.3 Business & Usage Data</h3>
              <ul className="list-disc list-inside text-dark-400 space-y-1">
                <li>Decisions you create and document</li>
                <li>Scenarios and alternatives you explore</li>
                <li>Outcomes you track</li>
                <li>Generated reports and exports</li>
              </ul>

              <h3 className="text-lg font-medium text-dark-200 mt-6 mb-3">3.4 Technical Data</h3>
              <ul className="list-disc list-inside text-dark-400 space-y-1">
                <li>IP address</li>
                <li>Browser type and device</li>
                <li>Timestamps and error logs</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">4. How We Use Your Data</h2>
              <ul className="list-disc list-inside text-dark-400 space-y-1">
                <li>Provide and operate the Service</li>
                <li>Authenticate users</li>
                <li>Process subscriptions and payments</li>
                <li>Improve product quality and reliability</li>
                <li>Detect fraud or technical issues</li>
                <li>Communicate service updates</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">5. Legal Basis for Processing</h2>
              <ul className="list-disc list-inside text-dark-400 space-y-2">
                <li><strong className="text-dark-200">Contract performance:</strong> providing the Service you requested</li>
                <li><strong className="text-dark-200">Legitimate interest:</strong> security, analytics, improvement</li>
                <li><strong className="text-dark-200">Legal obligation:</strong> accounting, tax, compliance</li>
                <li><strong className="text-dark-200">Consent:</strong> marketing emails (if applicable)</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">6. Data Sharing</h2>
              <p className="text-dark-400 leading-relaxed mb-4">
                We share data only with trusted processors necessary to run the Service:
              </p>
              <ul className="list-disc list-inside text-dark-400 space-y-1">
                <li><strong className="text-dark-200">Stripe</strong> — payments & billing</li>
                <li><strong className="text-dark-200">Hosting providers</strong> — servers and databases</li>
                <li><strong className="text-dark-200">Email providers</strong> — transactional emails</li>
              </ul>
              <p className="text-dark-400 leading-relaxed mt-4">
                All subprocessors are bound by data processing agreements where required.
              </p>
            </section>

            {/* Section 7 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">7. Data Retention</h2>
              <ul className="list-disc list-inside text-dark-400 space-y-1">
                <li><strong className="text-dark-200">Account data:</strong> while account is active</li>
                <li><strong className="text-dark-200">Billing data:</strong> as required by law</li>
                <li><strong className="text-dark-200">Logs:</strong> limited retention for security</li>
              </ul>
              <p className="text-dark-400 leading-relaxed mt-4">
                You may request deletion subject to legal obligations.
              </p>
            </section>

            {/* Section 8 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">8. Your Rights</h2>
              <p className="text-dark-400 leading-relaxed mb-4">
                Under GDPR, you have the right to:
              </p>
              <ul className="list-disc list-inside text-dark-400 space-y-1">
                <li>Access your personal data</li>
                <li>Rectify incorrect data</li>
                <li>Request deletion</li>
                <li>Restrict or object to processing</li>
                <li>Data portability</li>
                <li>Withdraw consent at any time</li>
              </ul>
              <div className="bg-dark-800 rounded-lg p-4 border border-dark-700 mt-4 not-prose">
                <p className="text-dark-400 m-0 text-sm">
                  To exercise your rights, contact: <a href="mailto:hello@revalyze.co" className="text-dark-200 underline">hello@revalyze.co</a>
                </p>
              </div>
            </section>

            {/* Section 9 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">9. Cookies</h2>
              <p className="text-dark-400 leading-relaxed">
                We use essential cookies for authentication and session management. We do not sell personal data.
              </p>
            </section>

            {/* Section 10 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">10. Security</h2>
              <p className="text-dark-400 leading-relaxed">
                We implement reasonable technical and organizational safeguards, including encrypted connections (HTTPS), access controls, and secure infrastructure.
              </p>
            </section>

            {/* Section 11 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">11. Changes to This Policy</h2>
              <p className="text-dark-400 leading-relaxed">
                We may update this Privacy Policy from time to time. Material changes will be communicated via email or in-app notice.
              </p>
            </section>

            {/* Section 12 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">12. Contact</h2>
              <p className="text-dark-400 leading-relaxed">
                If you have concerns, contact us at <a href="mailto:hello@revalyze.co" className="text-dark-200 underline">hello@revalyze.co</a>. You also have the right to lodge a complaint with your local Data Protection Authority.
              </p>
            </section>

          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Privacy;
