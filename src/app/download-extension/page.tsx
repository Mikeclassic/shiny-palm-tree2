import { Metadata } from 'next';
import Link from 'next/link';
import { Download, Chrome, CheckCircle2, AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Download Extension - ClearSeller',
  description: 'Download the ClearSeller Chrome Extension to find winning products automatically',
};

export default function DownloadExtensionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-white">
            ⚡ ClearSeller
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-6">
            <Chrome size={48} className="text-orange-500" />
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              ClearSeller Extension
            </h1>
          </div>
          <p className="text-xl text-slate-300 mb-8">
            Find winning dropshipping products automatically on AliExpress, Amazon, and Temu
          </p>

          {/* Install Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            {/* Primary: Chrome Web Store (when published) */}
            <a
              href="https://chrome.google.com/webstore/detail/YOUR_EXTENSION_ID_HERE"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition transform hover:scale-105"
              title="One-click install from Chrome Web Store (Coming Soon)"
            >
              <Chrome size={24} />
              Add to Chrome
            </a>

            {/* Secondary: Manual Download */}
            <a
              href="/api/download-extension"
              download="clearseller-extension.zip"
              className="inline-flex items-center gap-3 px-8 py-4 bg-white/10 border border-white/20 hover:bg-white/20 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition"
            >
              <Download size={24} />
              Download ZIP
            </a>
          </div>

          <p className="text-sm text-slate-400 mt-2">
            Free • Works with Chrome & Edge • No account required
          </p>

          <div className="mt-4 text-xs text-slate-500">
            <p>✨ Chrome Web Store version coming soon for one-click installation!</p>
            <p>For now, use the ZIP download and follow the instructions below</p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="text-lg font-bold text-white mb-2">Smart Scoring</h3>
            <p className="text-slate-400 text-sm">
              AI-powered 0-100 scoring system evaluates profit potential instantly
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="text-3xl mb-3">🔥</div>
            <h3 className="text-lg font-bold text-white mb-2">Auto-Detection</h3>
            <p className="text-slate-400 text-sm">
              Automatically highlights winning products on search pages
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-lg font-bold text-white mb-2">One-Click Import</h3>
            <p className="text-slate-400 text-sm">
              Import products to your store with optimized pricing in seconds
            </p>
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <AlertCircle className="text-orange-500" />
            Installation Instructions
          </h2>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Download the Extension</h3>
                <p className="text-slate-400 text-sm">
                  Click the "Download Extension" button above to download the zip file
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Extract the Zip File</h3>
                <p className="text-slate-400 text-sm">
                  Right-click the downloaded file and select "Extract All" or use your preferred unzip tool
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Open Chrome Extensions</h3>
                <p className="text-slate-400 text-sm mb-2">
                  In Chrome, go to: <code className="bg-white/10 px-2 py-1 rounded text-orange-400">chrome://extensions/</code>
                </p>
                <p className="text-slate-400 text-sm">
                  Or click the menu (⋮) → Extensions → Manage Extensions
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Enable Developer Mode</h3>
                <p className="text-slate-400 text-sm">
                  Toggle the "Developer mode" switch in the top-right corner
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                5
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Load the Extension</h3>
                <p className="text-slate-400 text-sm mb-2">
                  Click "Load unpacked" and select the extracted folder
                </p>
                <p className="text-slate-400 text-sm">
                  The extension icon should appear in your toolbar!
                </p>
              </div>
            </div>

            {/* Step 6 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Start Finding Winners!</h3>
                <p className="text-slate-400 text-sm">
                  Visit AliExpress, Amazon, or Temu and the extension will automatically start analyzing products
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Video Tutorial Section */}
        <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">📹 Video Tutorial</h2>
          <p className="text-slate-300 mb-4">
            Watch this 2-minute video to see how to install and use the extension:
          </p>
          <div className="aspect-video bg-slate-800 rounded-lg flex items-center justify-center">
            <p className="text-slate-500">Video tutorial coming soon...</p>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-white font-semibold mb-2">Why do I need to enable Developer Mode?</h3>
              <p className="text-slate-400 text-sm">
                Chrome requires Developer Mode to load extensions from outside the Chrome Web Store.
                This is a standard Chrome security feature. The extension is completely safe and open-source.
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">Will this work on other browsers?</h3>
              <p className="text-slate-400 text-sm">
                Yes! The extension works on any Chromium-based browser including Microsoft Edge, Brave, and Opera.
                The installation process is similar.
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">Do I need to be logged in to ClearSeller?</h3>
              <p className="text-slate-400 text-sm">
                Yes, you need to be logged in to ClearSeller to import products. The extension uses your existing
                session, so just log in to clearseller.com in the same browser.
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">Which platforms are supported?</h3>
              <p className="text-slate-400 text-sm">
                Currently supports AliExpress, Amazon, and Temu. More platforms coming soon!
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">Is the extension free?</h3>
              <p className="text-slate-400 text-sm">
                Yes! The extension is completely free. Free users can import up to 10 products per day.
                Pro users get unlimited imports.
              </p>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="text-center mt-12">
          <p className="text-slate-400 mb-4">
            Need help? Contact us at{' '}
            <a href="mailto:support@clearseller.com" className="text-orange-500 hover:underline">
              support@clearseller.com
            </a>
          </p>
          <Link
            href="/dashboard"
            className="text-orange-500 hover:underline font-semibold"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
