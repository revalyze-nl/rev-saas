import { useEffect } from 'react';
import { motion } from 'framer-motion';

const Terms = () => {
  useEffect(() => {
    document.title = 'Terms & Conditions | Revalyze';
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
            Terms & Conditions
          </h1>
          
          <p className="text-content-tertiary mb-12">
            Effective date: 03 January 2026
          </p>

          <div className="prose prose-invert max-w-none space-y-12">
            
            {/* Header Info */}
            <div className="bg-surface-700/50 rounded-xl p-6 border border-white/5">
              <p className="text-content-secondary leading-relaxed m-0">
                <strong className="text-white">Company:</strong> Revalyze B.V., Netherlands ("Revalyze", "we", "us")<br />
                <strong className="text-white">Website:</strong> revalyze.co (the "Website")<br />
                <strong className="text-white">Service:</strong> Revalyze AI Pricing Brain for SaaS (the "Service")
              </p>
            </div>

            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
              <p className="text-content-secondary leading-relaxed">
                By creating an account, accessing, or using the Service, you ("Customer", "you") agree to these Terms & Conditions ("Terms"). If you are using the Service on behalf of a company, you represent that you have authority to bind that company, and "you" refers to the company.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. Definitions</h2>
              <ul className="space-y-3 text-content-secondary">
                <li><strong className="text-white">Account:</strong> Your registered user account on the Service.</li>
                <li><strong className="text-white">Plan:</strong> A paid subscription tier (Starter, Growth, Enterprise) with defined usage limits.</li>
                <li><strong className="text-white">Credits:</strong> Usage units for AI-powered features (e.g., "AI Insight Credits").</li>
                <li><strong className="text-white">Content:</strong> All data you submit or connect, including pricing plans, competitor information, business metrics, and website URLs.</li>
                <li><strong className="text-white">AI Output:</strong> Any analysis, recommendations, summaries, or generated text produced by AI models.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. Description of the Service</h2>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">3.1</strong> The Service provides pricing analysis, pricing simulations, reports, and insights based on information you provide and/or connect.
              </p>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">3.2</strong> The Service may include AI-generated insights. These insights are informational and advisory, not professional financial, legal, or accounting advice.
              </p>
              <p className="text-content-secondary leading-relaxed">
                <strong className="text-white">3.3</strong> You acknowledge that outcomes such as revenue, churn, conversion, customer loss, or ARR impacts are estimates and may differ materially from real-world results.
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Eligibility and Account Registration</h2>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">4.1</strong> You must be at least 18 years old and able to form a binding contract.
              </p>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">4.2</strong> You agree to provide accurate information and keep it updated.
              </p>
              <p className="text-content-secondary leading-relaxed">
                <strong className="text-white">4.3</strong> You are responsible for all activity under your Account and for maintaining the confidentiality of your login credentials.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. User Responsibilities and Data Accuracy</h2>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">5.1</strong> You are responsible for the completeness and accuracy of Content you submit (including competitor pricing, features, plan details, and business metrics).
              </p>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">5.2</strong> If you connect third-party services (e.g., Stripe), you confirm you have the right to connect and access the related data.
              </p>
              <p className="text-content-secondary leading-relaxed">
                <strong className="text-white">5.3</strong> The quality of outputs depends on input quality. Revalyze is not responsible for inaccurate or incomplete outputs caused by incorrect inputs.
              </p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Prohibited Use</h2>
              <p className="text-content-secondary leading-relaxed mb-4">
                You agree not to:
              </p>
              <ul className="list-disc list-inside text-content-secondary space-y-2">
                <li>Use the Service for unlawful purposes or in violation of applicable law.</li>
                <li>Attempt to reverse engineer, scrape, probe, or disrupt the Service.</li>
                <li>Circumvent Plan limits, Credits, or access controls.</li>
                <li>Upload malicious code or attempt unauthorized access.</li>
                <li>Use the Service to infringe intellectual property rights or confidentiality obligations.</li>
                <li>Use competitor data in a way that violates third-party terms or law.</li>
              </ul>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Plans, Credits, and Usage Limits</h2>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">7.1</strong> Your subscription Plan determines limits such as number of plans, competitors, analyses, simulations, and/or Credits.
              </p>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">7.2</strong> Credits are consumed when AI-powered features run, regardless of whether you like the result, except in cases of verified Service malfunction attributable to Revalyze.
              </p>
              <p className="text-content-secondary leading-relaxed">
                <strong className="text-white">7.3</strong> We may change Plan features, limits, and Credits from time to time. If changes materially reduce your Plan value, we will provide notice and allow you to cancel effective at the next renewal.
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Pricing, Billing, and Payments</h2>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">8.1</strong> Payments are processed via Stripe. Revalyze does not store full payment card details.
              </p>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">8.2</strong> Subscriptions renew automatically at the end of each billing period unless cancelled before renewal.
              </p>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">8.3</strong> No refunds: Fees are non-refundable except where required by applicable law.
              </p>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">8.4</strong> You are responsible for applicable taxes (VAT/sales tax) unless otherwise stated.
              </p>
              <p className="text-content-secondary leading-relaxed">
                <strong className="text-white">8.5</strong> If payment fails, we may suspend or downgrade your access until payment is resolved.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Cancellation and Customer Portal</h2>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">9.1</strong> You can cancel your subscription at any time via the Customer Portal (if enabled) or via the billing settings in the Service.
              </p>
              <p className="text-content-secondary leading-relaxed">
                <strong className="text-white">9.2</strong> Cancellation stops future renewals. You retain access until the end of the current billing period unless stated otherwise.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Trials and Promotions</h2>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">10.1</strong> If we offer a free trial or promotional access, it may include limits and expiry.
              </p>
              <p className="text-content-secondary leading-relaxed">
                <strong className="text-white">10.2</strong> We may modify or end trials at any time, subject to reasonable notice.
              </p>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">11. Third-Party Services</h2>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">11.1</strong> The Service may integrate with or rely on third parties, including:
              </p>
              <ul className="list-disc list-inside text-content-secondary space-y-1 mb-4 ml-4">
                <li>Stripe (payments and billing)</li>
                <li>AI providers (e.g., OpenAI) for AI-powered features</li>
                <li>Email providers (SMTP/Gmail or other) for account emails</li>
              </ul>
              <p className="text-content-secondary leading-relaxed">
                <strong className="text-white">11.2</strong> Third-party services are subject to their own terms. Revalyze is not responsible for third-party outages, errors, or policy changes.
              </p>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">12. AI-Specific Terms, Limitations, and No Hallucination Guarantee</h2>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">12.1</strong> AI Output may be incorrect, incomplete, outdated, or biased.
              </p>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">12.2</strong> Revalyze does not guarantee that AI Output will be accurate, error-free, or suitable for your specific business decisions.
              </p>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">12.3</strong> You must independently validate AI Output before implementing pricing changes.
              </p>
              <div className="bg-surface-700/50 rounded-lg p-4 border border-white/5">
                <p className="text-content-secondary m-0">
                  <strong className="text-white">12.4</strong> You acknowledge that "no hallucinations" cannot be guaranteed, and you accept that AI may produce plausible but incorrect statements. Revalyze will use reasonable safeguards (prompting, validation rules, disclaimers), but final responsibility remains with you.
                </p>
              </div>
            </section>

            {/* Section 13 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">13. Reports, Exports, and Data Retention</h2>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">13.1</strong> The Service may generate reports (including PDF exports) based on your Content.
              </p>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">13.2</strong> You may export reports for internal business use. You must not resell or publicly redistribute reports as a competing product.
              </p>
              <p className="text-content-secondary leading-relaxed">
                <strong className="text-white">13.3</strong> We may retain logs and reports for security, auditing, and product improvement purposes, consistent with our Privacy Policy.
              </p>
            </section>

            {/* Section 14 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">14. Intellectual Property</h2>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">14.1</strong> The Service, including software, UI, branding, and underlying logic, is owned by Revalyze and protected by IP laws.
              </p>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">14.2</strong> You retain ownership of Content you submit. You grant Revalyze a worldwide, non-exclusive license to use Content solely to provide, maintain, secure, and improve the Service.
              </p>
              <p className="text-content-secondary leading-relaxed">
                <strong className="text-white">14.3</strong> You may not copy, modify, distribute, sell, or lease any part of the Service without our written permission.
              </p>
            </section>

            {/* Section 15 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">15. Confidentiality</h2>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">15.1</strong> Each party may receive confidential information from the other.
              </p>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">15.2</strong> You agree not to disclose Revalyze's non-public product details, pricing logic, or internal system behavior.
              </p>
              <p className="text-content-secondary leading-relaxed">
                <strong className="text-white">15.3</strong> Revalyze will treat your non-public business data as confidential and handle it under the Privacy Policy and security practices.
              </p>
            </section>

            {/* Section 16 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">16. Security and Availability</h2>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">16.1</strong> We implement reasonable technical and organizational measures to protect data.
              </p>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">16.2</strong> No warranty of uninterrupted service: The Service may be unavailable due to maintenance, upgrades, or third-party failures.
              </p>
              <p className="text-content-secondary leading-relaxed">
                <strong className="text-white">16.3</strong> You acknowledge that no system is perfectly secure and you use the Service at your own risk.
              </p>
            </section>

            {/* Section 17 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">17. Disclaimers (No Warranties)</h2>
              <div className="bg-surface-700/50 rounded-lg p-4 border border-white/5">
                <p className="text-content-secondary m-0 uppercase text-sm leading-relaxed">
                  THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE". TO THE MAXIMUM EXTENT PERMITTED BY LAW, REVALYZE DISCLAIMS ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE OR AI OUTPUT WILL BE ERROR-FREE OR THAT RESULTS WILL ACHIEVE ANY SPECIFIC BUSINESS OUTCOME.
                </p>
              </div>
            </section>

            {/* Section 18 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">18. Limitation of Liability</h2>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">18.1</strong> To the maximum extent permitted by law, Revalyze will not be liable for:
              </p>
              <ul className="list-disc list-inside text-content-secondary space-y-1 mb-4 ml-4">
                <li>loss of profits, revenue, goodwill, or data</li>
                <li>business interruption</li>
                <li>decisions you make based on AI Output or simulations</li>
                <li>indirect, incidental, special, consequential, or punitive damages</li>
              </ul>
              <p className="text-content-secondary leading-relaxed">
                <strong className="text-white">18.2</strong> Revalyze's total liability for any claim related to the Service is limited to the fees paid by you to Revalyze in the 3 months preceding the event giving rise to the claim.
              </p>
            </section>

            {/* Section 19 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">19. Indemnification</h2>
              <p className="text-content-secondary leading-relaxed mb-4">
                You agree to indemnify and hold harmless Revalyze from claims arising out of:
              </p>
              <ul className="list-disc list-inside text-content-secondary space-y-1">
                <li>your Content, including competitor data you submit</li>
                <li>your violation of these Terms</li>
                <li>your misuse of third-party services or rights infringement</li>
              </ul>
            </section>

            {/* Section 20 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">20. Suspension and Termination</h2>
              <p className="text-content-secondary leading-relaxed mb-3">
                <strong className="text-white">20.1</strong> We may suspend or terminate access if you violate these Terms or if we believe your use creates risk, abuse, or legal exposure.
              </p>
              <p className="text-content-secondary leading-relaxed">
                <strong className="text-white">20.2</strong> Upon termination, your right to use the Service ends. Certain sections (IP, disclaimers, liability, indemnity) survive termination.
              </p>
            </section>

            {/* Section 21 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">21. Changes to Terms</h2>
              <p className="text-content-secondary leading-relaxed">
                We may update these Terms from time to time. If changes are material, we will provide notice (e.g., via email or in-app). Continued use after the effective date means you accept the updated Terms.
              </p>
            </section>

            {/* Section 22 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">22. Governing Law and Jurisdiction</h2>
              <p className="text-content-secondary leading-relaxed">
                These Terms are governed by the laws of the Netherlands. Any dispute will be submitted to the competent courts in the Netherlands, unless mandatory consumer law applies otherwise.
              </p>
            </section>

            {/* Section 23 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">23. Contact</h2>
              <p className="text-content-secondary leading-relaxed mb-4">
                For questions about these Terms:
              </p>
              <div className="bg-surface-700/30 rounded-lg p-4 border border-white/5">
                <p className="text-content-secondary m-0">
                  Email: <a href="mailto:hello@revalyze.co" className="text-brand-400 hover:text-brand-300">hello@revalyze.co</a><br />
                  Company: Revalyze B.V., Netherlands
                </p>
              </div>
            </section>

          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Terms;
