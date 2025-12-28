import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const Terms = () => {
  useEffect(() => {
    document.title = 'Terms & Conditions | Revalyze';
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
                Revalyze Terms & Conditions
              </h1>
              <p className="text-lg text-slate-400">Terms of Service</p>
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
                  <span className="text-slate-500 ml-1">(the "Website")</span>
                </div>
                <div>
                  <span className="text-slate-500">Service:</span>
                  <span className="text-white ml-2">Revalyze AI Pricing Brain for SaaS (the "Service")</span>
                </div>
              </div>
            </div>

            {/* Terms Content */}
            <div className="prose prose-invert prose-slate max-w-none">
              <div className="space-y-12 text-slate-300 leading-relaxed">
                
                {/* Section 1 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
                  <p>
                    By creating an account, accessing, or using the Service, you ("Customer", "you") agree to these Terms & Conditions ("Terms"). If you are using the Service on behalf of a company, you represent that you have authority to bind that company, and "you" refers to the company.
                  </p>
                </section>

                {/* Section 2 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">2. Definitions</h2>
                  <ul className="list-none space-y-3 pl-0">
                    <li><strong className="text-white">Account:</strong> Your registered user account on the Service.</li>
                    <li><strong className="text-white">Plan:</strong> A paid subscription tier (Starter, Growth, Enterprise) with defined usage limits.</li>
                    <li><strong className="text-white">Credits:</strong> Usage units for AI-powered features (e.g., "AI Insight Credits").</li>
                    <li><strong className="text-white">Content:</strong> All data you submit or connect, including pricing plans, competitor information, business metrics, and website URLs.</li>
                    <li><strong className="text-white">AI Output:</strong> Any analysis, recommendations, summaries, or generated text produced by AI models.</li>
                  </ul>
                </section>

                {/* Section 3 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">3. Description of the Service</h2>
                  <p className="mb-4">
                    <strong className="text-white">3.1</strong> The Service provides pricing analysis, pricing simulations, reports, and insights based on information you provide and/or connect.
                  </p>
                  <p className="mb-4">
                    <strong className="text-white">3.2</strong> The Service may include AI-generated insights. These insights are informational and advisory, not professional financial, legal, or accounting advice.
                  </p>
                  <p>
                    <strong className="text-white">3.3</strong> You acknowledge that outcomes such as revenue, churn, conversion, customer loss, or ARR impacts are estimates and may differ materially from real-world results.
                  </p>
                </section>

                {/* Section 4 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">4. Eligibility and Account Registration</h2>
                  <p className="mb-4">
                    <strong className="text-white">4.1</strong> You must be at least 18 years old and able to form a binding contract.
                  </p>
                  <p className="mb-4">
                    <strong className="text-white">4.2</strong> You agree to provide accurate information and keep it updated.
                  </p>
                  <p>
                    <strong className="text-white">4.3</strong> You are responsible for all activity under your Account and for maintaining the confidentiality of your login credentials.
                  </p>
                </section>

                {/* Section 5 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">5. User Responsibilities and Data Accuracy</h2>
                  <p className="mb-4">
                    <strong className="text-white">5.1</strong> You are responsible for the completeness and accuracy of Content you submit (including competitor pricing, features, plan details, and business metrics).
                  </p>
                  <p className="mb-4">
                    <strong className="text-white">5.2</strong> If you connect third-party services (e.g., Stripe), you confirm you have the right to connect and access the related data.
                  </p>
                  <p>
                    <strong className="text-white">5.3</strong> The quality of outputs depends on input quality. Revalyze is not responsible for inaccurate or incomplete outputs caused by incorrect inputs.
                  </p>
                </section>

                {/* Section 6 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">6. Prohibited Use</h2>
                  <p className="mb-4">You agree not to:</p>
                  <ul className="list-disc pl-6 space-y-2">
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
                  <h2 className="text-2xl font-semibold text-white mb-4">7. Plans, Credits, and Usage Limits</h2>
                  <p className="mb-4">
                    <strong className="text-white">7.1</strong> Your subscription Plan determines limits such as number of plans, competitors, analyses, simulations, and/or Credits.
                  </p>
                  <p className="mb-4">
                    <strong className="text-white">7.2</strong> Credits are consumed when AI-powered features run, regardless of whether you like the result, except in cases of verified Service malfunction attributable to Revalyze.
                  </p>
                  <p>
                    <strong className="text-white">7.3</strong> We may change Plan features, limits, and Credits from time to time. If changes materially reduce your Plan value, we will provide notice and allow you to cancel effective at the next renewal.
                  </p>
                </section>

                {/* Section 8 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">8. Pricing, Billing, and Payments</h2>
                  <p className="mb-4">
                    <strong className="text-white">8.1</strong> Payments are processed via Stripe. Revalyze does not store full payment card details.
                  </p>
                  <p className="mb-4">
                    <strong className="text-white">8.2</strong> Subscriptions renew automatically at the end of each billing period unless cancelled before renewal.
                  </p>
                  <p className="mb-4">
                    <strong className="text-white">8.3</strong> No refunds: Fees are non-refundable except where required by applicable law.
                  </p>
                  <p className="mb-4">
                    <strong className="text-white">8.4</strong> You are responsible for applicable taxes (VAT/sales tax) unless otherwise stated.
                  </p>
                  <p>
                    <strong className="text-white">8.5</strong> If payment fails, we may suspend or downgrade your access until payment is resolved.
                  </p>
                </section>

                {/* Section 9 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">9. Cancellation and Customer Portal</h2>
                  <p className="mb-4">
                    <strong className="text-white">9.1</strong> You can cancel your subscription at any time via the Customer Portal (if enabled) or via the billing settings in the Service.
                  </p>
                  <p>
                    <strong className="text-white">9.2</strong> Cancellation stops future renewals. You retain access until the end of the current billing period unless stated otherwise.
                  </p>
                </section>

                {/* Section 10 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">10. Trials and Promotions</h2>
                  <p className="mb-4">
                    <strong className="text-white">10.1</strong> If we offer a free trial or promotional access, it may include limits and expiry.
                  </p>
                  <p>
                    <strong className="text-white">10.2</strong> We may modify or end trials at any time, subject to reasonable notice.
                  </p>
                </section>

                {/* Section 11 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">11. Third-Party Services</h2>
                  <p className="mb-4">
                    <strong className="text-white">11.1</strong> The Service may integrate with or rely on third parties, including:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 mb-4">
                    <li>Stripe (payments and billing)</li>
                    <li>AI providers (e.g., OpenAI) for AI-powered features</li>
                    <li>Email providers (SMTP/Gmail or other) for account emails</li>
                  </ul>
                  <p>
                    <strong className="text-white">11.2</strong> Third-party services are subject to their own terms. Revalyze is not responsible for third-party outages, errors, or policy changes.
                  </p>
                </section>

                {/* Section 12 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">12. AI-Specific Terms, Limitations, and No Hallucination Guarantee</h2>
                  <p className="mb-4">
                    <strong className="text-white">12.1</strong> AI Output may be incorrect, incomplete, outdated, or biased.
                  </p>
                  <p className="mb-4">
                    <strong className="text-white">12.2</strong> Revalyze does not guarantee that AI Output will be accurate, error-free, or suitable for your specific business decisions.
                  </p>
                  <p className="mb-4">
                    <strong className="text-white">12.3</strong> You must independently validate AI Output before implementing pricing changes.
                  </p>
                  <p>
                    <strong className="text-white">12.4</strong> You acknowledge that "no hallucinations" cannot be guaranteed, and you accept that AI may produce plausible but incorrect statements. Revalyze will use reasonable safeguards (prompting, validation rules, disclaimers), but final responsibility remains with you.
                  </p>
                </section>

                {/* Section 13 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">13. Reports, Exports, and Data Retention</h2>
                  <p className="mb-4">
                    <strong className="text-white">13.1</strong> The Service may generate reports (including PDF exports) based on your Content.
                  </p>
                  <p className="mb-4">
                    <strong className="text-white">13.2</strong> You may export reports for internal business use. You must not resell or publicly redistribute reports as a competing product.
                  </p>
                  <p>
                    <strong className="text-white">13.3</strong> We may retain logs and reports for security, auditing, and product improvement purposes, consistent with our Privacy Policy.
                  </p>
                </section>

                {/* Section 14 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">14. Intellectual Property</h2>
                  <p className="mb-4">
                    <strong className="text-white">14.1</strong> The Service, including software, UI, branding, and underlying logic, is owned by Revalyze and protected by IP laws.
                  </p>
                  <p className="mb-4">
                    <strong className="text-white">14.2</strong> You retain ownership of Content you submit. You grant Revalyze a worldwide, non-exclusive license to use Content solely to provide, maintain, secure, and improve the Service.
                  </p>
                  <p>
                    <strong className="text-white">14.3</strong> You may not copy, modify, distribute, sell, or lease any part of the Service without our written permission.
                  </p>
                </section>

                {/* Section 15 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">15. Confidentiality</h2>
                  <p className="mb-4">
                    <strong className="text-white">15.1</strong> Each party may receive confidential information from the other.
                  </p>
                  <p className="mb-4">
                    <strong className="text-white">15.2</strong> You agree not to disclose Revalyze's non-public product details, pricing logic, or internal system behavior.
                  </p>
                  <p>
                    <strong className="text-white">15.3</strong> Revalyze will treat your non-public business data as confidential and handle it under the Privacy Policy and security practices.
                  </p>
                </section>

                {/* Section 16 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">16. Security and Availability</h2>
                  <p className="mb-4">
                    <strong className="text-white">16.1</strong> We implement reasonable technical and organizational measures to protect data.
                  </p>
                  <p className="mb-4">
                    <strong className="text-white">16.2</strong> No warranty of uninterrupted service: The Service may be unavailable due to maintenance, upgrades, or third-party failures.
                  </p>
                  <p>
                    <strong className="text-white">16.3</strong> You acknowledge that no system is perfectly secure and you use the Service at your own risk.
                  </p>
                </section>

                {/* Section 17 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">17. Disclaimers (No Warranties)</h2>
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                    <p className="uppercase text-sm leading-relaxed">
                      THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE". TO THE MAXIMUM EXTENT PERMITTED BY LAW, REVALYZE DISCLAIMS ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE OR AI OUTPUT WILL BE ERROR-FREE OR THAT RESULTS WILL ACHIEVE ANY SPECIFIC BUSINESS OUTCOME.
                    </p>
                  </div>
                </section>

                {/* Section 18 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">18. Limitation of Liability</h2>
                  <p className="mb-4">
                    <strong className="text-white">18.1</strong> To the maximum extent permitted by law, Revalyze will not be liable for:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 mb-4">
                    <li>loss of profits, revenue, goodwill, or data</li>
                    <li>business interruption</li>
                    <li>decisions you make based on AI Output or simulations</li>
                    <li>indirect, incidental, special, consequential, or punitive damages</li>
                  </ul>
                  <p>
                    <strong className="text-white">18.2</strong> Revalyze's total liability for any claim related to the Service is limited to the fees paid by you to Revalyze in the 3 months preceding the event giving rise to the claim.
                  </p>
                </section>

                {/* Section 19 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">19. Indemnification</h2>
                  <p className="mb-4">You agree to indemnify and hold harmless Revalyze from claims arising out of:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>your Content, including competitor data you submit</li>
                    <li>your violation of these Terms</li>
                    <li>your misuse of third-party services or rights infringement</li>
                  </ul>
                </section>

                {/* Section 20 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">20. Suspension and Termination</h2>
                  <p className="mb-4">
                    <strong className="text-white">20.1</strong> We may suspend or terminate access if you violate these Terms or if we believe your use creates risk, abuse, or legal exposure.
                  </p>
                  <p>
                    <strong className="text-white">20.2</strong> Upon termination, your right to use the Service ends. Certain sections (IP, disclaimers, liability, indemnity) survive termination.
                  </p>
                </section>

                {/* Section 21 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">21. Changes to Terms</h2>
                  <p>
                    We may update these Terms from time to time. If changes are material, we will provide notice (e.g., via email or in-app). Continued use after the effective date means you accept the updated Terms.
                  </p>
                </section>

                {/* Section 22 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">22. Governing Law and Jurisdiction</h2>
                  <p>
                    These Terms are governed by the laws of the Netherlands. Any dispute will be submitted to the competent courts in the Netherlands, unless mandatory consumer law applies otherwise.
                  </p>
                </section>

                {/* Section 23 */}
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4">23. Contact</h2>
                  <p className="mb-4">For questions about these Terms:</p>
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

export default Terms;

