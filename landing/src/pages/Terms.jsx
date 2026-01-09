import { useEffect } from 'react';
import { motion } from 'framer-motion';

const Terms = () => {
  useEffect(() => {
    document.title = 'Terms & Conditions | Revalyze';
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
            Terms & Conditions
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
              <h2 className="text-xl font-semibold text-dark-100 mb-4">1. Acceptance of Terms</h2>
              <p className="text-dark-400 leading-relaxed">
                By creating an account, accessing, or using the Service, you agree to these Terms & Conditions. If you are using the Service on behalf of a company, you represent that you have authority to bind that company.
              </p>
            </section>

            {/* Section 2 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">2. Description of the Service</h2>
              <p className="text-dark-400 leading-relaxed mb-3">
                Revalyze helps teams document, explore, and learn from their decisions. The Service provides tools to capture decision context, explore alternatives, record choices, and track outcomes.
              </p>
              <p className="text-dark-400 leading-relaxed">
                The Service is informational and does not constitute professional financial, legal, or business advice.
              </p>
            </section>

            {/* Section 3 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">3. Account Registration</h2>
              <ul className="list-disc list-inside text-dark-400 space-y-2">
                <li>You must be at least 18 years old</li>
                <li>You agree to provide accurate information</li>
                <li>You are responsible for all activity under your Account</li>
                <li>Keep your login credentials confidential</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">4. User Responsibilities</h2>
              <ul className="list-disc list-inside text-dark-400 space-y-2">
                <li>You are responsible for the accuracy of data you submit</li>
                <li>You must have the right to use any data you connect</li>
                <li>The quality of outputs depends on input quality</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">5. Prohibited Use</h2>
              <p className="text-dark-400 leading-relaxed mb-4">
                You agree not to:
              </p>
              <ul className="list-disc list-inside text-dark-400 space-y-1">
                <li>Use the Service for unlawful purposes</li>
                <li>Attempt to reverse engineer or disrupt the Service</li>
                <li>Circumvent Plan limits or access controls</li>
                <li>Upload malicious code</li>
                <li>Infringe intellectual property rights</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">6. Plans and Usage Limits</h2>
              <p className="text-dark-400 leading-relaxed mb-3">
                Your subscription Plan determines available features and limits. We may change Plan features from time to time with reasonable notice.
              </p>
            </section>

            {/* Section 7 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">7. Pricing and Billing</h2>
              <ul className="list-disc list-inside text-dark-400 space-y-2">
                <li>Payments are processed via Stripe</li>
                <li>Subscriptions renew automatically unless cancelled</li>
                <li>Fees are non-refundable except where required by law</li>
                <li>You are responsible for applicable taxes</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">8. Cancellation</h2>
              <p className="text-dark-400 leading-relaxed">
                You can cancel your subscription at any time via billing settings. Cancellation stops future renewals. You retain access until the end of the current billing period.
              </p>
            </section>

            {/* Section 9 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">9. Free Trials</h2>
              <p className="text-dark-400 leading-relaxed">
                Free trials may include limits and expiry dates. We may modify or end trials at any time with reasonable notice.
              </p>
            </section>

            {/* Section 10 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">10. Intellectual Property</h2>
              <p className="text-dark-400 leading-relaxed mb-3">
                The Service, including software and branding, is owned by Revalyze and protected by IP laws.
              </p>
              <p className="text-dark-400 leading-relaxed">
                You retain ownership of your data. You grant Revalyze a license to use your data solely to provide the Service.
              </p>
            </section>

            {/* Section 11 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">11. Confidentiality</h2>
              <p className="text-dark-400 leading-relaxed">
                We will treat your business data as confidential and handle it according to our Privacy Policy.
              </p>
            </section>

            {/* Section 12 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">12. Disclaimers</h2>
              <div className="bg-dark-800 rounded-lg p-4 border border-dark-700 not-prose">
                <p className="text-dark-400 m-0 text-sm leading-relaxed">
                  THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE". TO THE MAXIMUM EXTENT PERMITTED BY LAW, REVALYZE DISCLAIMS ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
                </p>
              </div>
            </section>

            {/* Section 13 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">13. Limitation of Liability</h2>
              <p className="text-dark-400 leading-relaxed mb-3">
                To the maximum extent permitted by law, Revalyze will not be liable for loss of profits, revenue, or data, or for indirect or consequential damages.
              </p>
              <p className="text-dark-400 leading-relaxed">
                Revalyze's total liability is limited to the fees paid by you in the 3 months preceding the event.
              </p>
            </section>

            {/* Section 14 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">14. Termination</h2>
              <p className="text-dark-400 leading-relaxed">
                We may suspend or terminate access if you violate these Terms. Upon termination, your right to use the Service ends. Certain sections survive termination.
              </p>
            </section>

            {/* Section 15 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">15. Changes to Terms</h2>
              <p className="text-dark-400 leading-relaxed">
                We may update these Terms from time to time. Material changes will be communicated via email or in-app notice. Continued use means acceptance.
              </p>
            </section>

            {/* Section 16 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">16. Governing Law</h2>
              <p className="text-dark-400 leading-relaxed">
                These Terms are governed by the laws of the Netherlands. Disputes will be submitted to the competent courts in the Netherlands.
              </p>
            </section>

            {/* Section 17 */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-dark-100 mb-4">17. Contact</h2>
              <p className="text-dark-400 leading-relaxed">
                For questions about these Terms, contact us at <a href="mailto:hello@revalyze.co" className="text-dark-200 underline">hello@revalyze.co</a>
              </p>
            </section>

          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Terms;
