import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Privacy Policy</h1>
        <p className="text-sm text-slate-600 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-slate max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. Introduction</h2>
            <p className="text-slate-700">
              Welcome to ClearSeller ("we," "our," or "us"). We are committed to protecting your personal information
              and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard
              your information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li><strong>Account Information:</strong> When you sign up via Google OAuth, we collect your name, email address, and profile picture.</li>
              <li><strong>Product Data:</strong> Information about products you save, edit, or generate using our AI tools.</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900 mb-2 mt-4">2.2 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li><strong>Usage Data:</strong> Information about how you interact with our service, including API usage, features accessed, and timestamps.</li>
              <li><strong>Device Information:</strong> Browser type, IP address, operating system, and device identifiers.</li>
              <li><strong>Cookies:</strong> We use cookies for authentication and session management via NextAuth.js.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>To provide and maintain our service</li>
              <li>To authenticate your identity and manage your account</li>
              <li>To process AI-generated content requests</li>
              <li>To track credit usage and enforce quotas</li>
              <li>To communicate with you about service updates</li>
              <li>To improve our service and develop new features</li>
              <li>To detect and prevent fraud or abuse</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Third-Party Services</h2>
            <p className="text-slate-700 mb-2">We share data with the following third-party services:</p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li><strong>Google OAuth:</strong> For authentication (Google Privacy Policy applies)</li>
              <li><strong>OpenRouter:</strong> For AI text generation</li>
              <li><strong>Replicate:</strong> For AI image processing</li>
              <li><strong>Sentry:</strong> For error monitoring and debugging (optional, if enabled)</li>
              <li><strong>Database Provider:</strong> We use PostgreSQL hosted by our infrastructure provider to store your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Data Retention</h2>
            <p className="text-slate-700">
              We retain your personal information for as long as your account is active or as needed to provide you services.
              You may request deletion of your account and associated data at any time through your account settings or by
              contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. Your Rights (GDPR & CCPA)</h2>
            <p className="text-slate-700 mb-2">You have the right to:</p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Erasure:</strong> Request deletion of your account and data ("Right to be Forgotten")</li>
              <li><strong>Data Portability:</strong> Export your data in a machine-readable format</li>
              <li><strong>Withdraw Consent:</strong> Revoke consent for data processing at any time</li>
              <li><strong>Object:</strong> Object to processing of your personal data</li>
            </ul>
            <p className="text-slate-700 mt-4">
              To exercise these rights, please contact us at privacy@clearseller.com or use the account management
              features in your dashboard.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">7. Data Security</h2>
            <p className="text-slate-700">
              We implement appropriate technical and organizational security measures to protect your personal information,
              including encryption in transit (HTTPS), secure authentication (OAuth 2.0), rate limiting, and regular security
              audits. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">8. Children's Privacy</h2>
            <p className="text-slate-700">
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal
              information from children under 13. If we learn we have collected such information, we will delete it immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">9. International Data Transfers</h2>
            <p className="text-slate-700">
              Your information may be transferred to and processed in countries other than your own. We ensure appropriate
              safeguards are in place to protect your data in compliance with applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">10. Changes to This Policy</h2>
            <p className="text-slate-700">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new
              Privacy Policy on this page and updating the "Last Updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">11. Contact Us</h2>
            <p className="text-slate-700">
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p className="text-slate-700 mt-2">
              Email: privacy@clearseller.com<br />
              Address: [Your Company Address]
            </p>
          </section>

          <section className="bg-blue-50 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">12. Cookie Policy</h2>
            <p className="text-slate-700">
              We use essential cookies for authentication and session management. These cookies are necessary for the
              service to function and cannot be disabled. We do not use tracking or advertising cookies.
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
