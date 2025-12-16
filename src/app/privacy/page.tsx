import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy - ClearSeller',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-orange-500 hover:underline mb-8 block">← Back to Home</Link>
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <div className="space-y-6 text-slate-300">
          <p>Last updated: December 16, 2024</p>
          
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Data Collection</h2>
            <p>The ClearSeller extension collects minimal data:</p>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>Settings and preferences (stored locally)</li>
              <li>Product import history (stored locally)</li>
              <li>No personal browsing data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Permissions</h2>
            <ul className="list-disc ml-6 space-y-2">
              <li><strong>storage:</strong> Save settings locally</li>
              <li><strong>activeTab:</strong> Read product data from current page</li>
              <li><strong>Host permissions:</strong> Access AliExpress, Amazon, Temu for product data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Contact</h2>
            <p>Email: <a href="mailto:support@clearseller.com" className="text-orange-500">support@clearseller.com</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
