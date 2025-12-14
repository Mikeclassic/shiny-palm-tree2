import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Terms of Service</h1>
        <p className="text-sm text-slate-600 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-slate max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-700">
              By accessing or using ClearSeller ("the Service"), you agree to be bound by these Terms of Service ("Terms").
              If you do not agree to these Terms, you may not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. Description of Service</h2>
            <p className="text-slate-700">
              ClearSeller is a dropshipping automation platform that provides:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Automated product discovery and scraping from e-commerce stores</li>
              <li>AI-powered product description generation</li>
              <li>AI image processing (background removal and replacement)</li>
              <li>Supplier matching and sourcing tools</li>
              <li>Product catalog management</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. Account Registration</h2>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>You must create an account using Google OAuth to use the Service</li>
              <li>You must provide accurate and complete information</li>
              <li>You are responsible for maintaining the confidentiality of your account</li>
              <li>You must be at least 18 years old to use the Service</li>
              <li>One account per user; multiple accounts are prohibited</li>
              <li>You are responsible for all activities that occur under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Usage Limits and Credits</h2>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">4.1 Free Tier</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Free users receive 5 AI credits per day</li>
              <li>Credits reset daily at midnight UTC</li>
              <li>Each AI operation (description generation, background removal, background change) consumes 1 credit</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900 mb-2 mt-4">4.2 Pro Tier</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Pro users have unlimited AI credits</li>
              <li>Subject to fair use policy (see Section 6)</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900 mb-2 mt-4">4.3 Rate Limits</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>AI endpoints: 10 requests per 60 seconds per user</li>
              <li>Standard endpoints: 100 requests per 60 seconds per user</li>
              <li>Rate limits apply to all users regardless of tier</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Acceptable Use Policy</h2>
            <p className="text-slate-700 mb-2">You agree NOT to:</p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Use the Service for any illegal purpose or in violation of any laws</li>
              <li>Violate intellectual property rights of third parties</li>
              <li>Attempt to reverse engineer, decompile, or hack the Service</li>
              <li>Circumvent rate limits, credit systems, or other usage restrictions</li>
              <li>Use automated scripts or bots to abuse the Service</li>
              <li>Scrape or harvest data from the Service without permission</li>
              <li>Resell or redistribute access to the Service without authorization</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Impersonate others or provide false information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. Fair Use Policy</h2>
            <p className="text-slate-700">
              Pro tier users have unlimited AI credits, but usage must be reasonable and in good faith. We reserve
              the right to throttle or suspend accounts that:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Generate excessive API costs (e.g., thousands of requests per hour)</li>
              <li>Use the Service in ways that degrade performance for other users</li>
              <li>Engage in automated abuse or bulk processing beyond normal business use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">7. Intellectual Property</h2>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">7.1 Your Content</h3>
            <p className="text-slate-700">
              You retain all rights to content you create using the Service. AI-generated descriptions and images
              created through our Service are owned by you.
            </p>

            <h3 className="text-xl font-semibold text-slate-900 mb-2 mt-4">7.2 Our Content</h3>
            <p className="text-slate-700">
              The Service, including all software, designs, text, graphics, and other content (excluding user content),
              is owned by ClearSeller and protected by intellectual property laws.
            </p>

            <h3 className="text-xl font-semibold text-slate-900 mb-2 mt-4">7.3 Third-Party Content</h3>
            <p className="text-slate-700">
              Product data scraped from third-party stores is subject to those stores' terms and intellectual property
              rights. You are responsible for ensuring your use of such data complies with applicable laws and terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">8. Payment and Refunds</h2>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Pro subscriptions are billed according to the plan you select</li>
              <li>All fees are non-refundable unless required by law</li>
              <li>We reserve the right to change pricing with 30 days notice</li>
              <li>Failure to pay may result in service suspension or termination</li>
              <li>You may cancel your subscription at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">9. Termination</h2>
            <p className="text-slate-700 mb-2">We may suspend or terminate your account if you:</p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Violate these Terms of Service</li>
              <li>Engage in fraudulent or illegal activity</li>
              <li>Abuse the Service or violate the Fair Use Policy</li>
              <li>Fail to pay applicable fees</li>
            </ul>
            <p className="text-slate-700 mt-4">
              You may delete your account at any time through your account settings. Upon termination, your access
              to the Service will cease, and your data may be deleted in accordance with our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">10. Disclaimers</h2>
            <p className="text-slate-700 mb-2">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>No warranty of merchantability or fitness for a particular purpose</li>
              <li>No guarantee of accuracy, reliability, or availability</li>
              <li>No guarantee that the Service will be error-free or uninterrupted</li>
              <li>No guarantee regarding third-party content accuracy or legality</li>
              <li>AI-generated content may contain errors or inaccuracies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">11. Limitation of Liability</h2>
            <p className="text-slate-700">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, CLEARSELLER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES,
              ARISING OUT OF YOUR USE OF THE SERVICE.
            </p>
            <p className="text-slate-700 mt-4">
              Our total liability to you for any claims arising from the Service shall not exceed the amount you paid
              us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">12. Indemnification</h2>
            <p className="text-slate-700">
              You agree to indemnify and hold harmless ClearSeller from any claims, damages, losses, liabilities, and
              expenses (including legal fees) arising from:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Content you create or distribute using the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">13. Data and Privacy</h2>
            <p className="text-slate-700">
              Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent to
              our collection and use of data as described in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">14. Changes to Terms</h2>
            <p className="text-slate-700">
              We reserve the right to modify these Terms at any time. We will notify you of material changes via
              email or through the Service. Your continued use of the Service after changes constitutes acceptance
              of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">15. Governing Law</h2>
            <p className="text-slate-700">
              These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction],
              without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">16. Dispute Resolution</h2>
            <p className="text-slate-700">
              Any disputes arising from these Terms or the Service shall be resolved through binding arbitration
              in accordance with [Arbitration Rules], except where prohibited by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">17. Severability</h2>
            <p className="text-slate-700">
              If any provision of these Terms is found to be unenforceable, the remaining provisions shall remain
              in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">18. Contact Information</h2>
            <p className="text-slate-700">
              If you have questions about these Terms, please contact us at:
            </p>
            <p className="text-slate-700 mt-2">
              Email: legal@clearseller.com<br />
              Address: [Your Company Address]
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
