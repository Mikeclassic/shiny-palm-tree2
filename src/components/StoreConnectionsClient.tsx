"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Store, ShoppingCart, Plus, Check, X, ExternalLink } from "lucide-react";

interface StoreConnection {
  id: string;
  platform: string;
  storeName: string;
  storeUrl: string;
  isActive: boolean;
  createdAt: Date;
}

interface StoreConnectionsClientProps {
  stores: StoreConnection[];
}

export default function StoreConnectionsClient({ stores }: StoreConnectionsClientProps) {
  const searchParams = useSearchParams();
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [showWooModal, setShowWooModal] = useState(false);
  const [shopifyDomain, setShopifyDomain] = useState("");
  const [wooForm, setWooForm] = useState({
    storeName: "",
    storeUrl: "",
    consumerKey: "",
    consumerSecret: "",
  });
  const [loading, setLoading] = useState(false);

  // Handle success/error messages from URL params
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'shopify_connected') {
      alert('Shopify store connected successfully!');
      // Clear URL params
      window.history.replaceState({}, '', '/dashboard/stores');
    }

    if (error === 'store_already_connected') {
      alert('This store is already connected to another account. Please disconnect it from the other account first or contact support.');
      window.history.replaceState({}, '', '/dashboard/stores');
    }

    if (error === 'shopify_connection_failed') {
      alert('Failed to connect Shopify store. Please try again.');
      window.history.replaceState({}, '', '/dashboard/stores');
    }
  }, [searchParams]);

  const connectShopify = () => {
    if (!shopifyDomain) {
      alert("Please enter your Shopify domain");
      return;
    }

    const domain = shopifyDomain.includes(".myshopify.com")
      ? shopifyDomain
      : `${shopifyDomain}.myshopify.com`;

    window.location.href = `/api/stores/shopify/connect?shop=${domain}`;
  };

  const connectWooCommerce = async () => {
    if (!wooForm.storeName || !wooForm.storeUrl || !wooForm.consumerKey || !wooForm.consumerSecret) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/stores/woocommerce/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wooForm),
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      alert("WooCommerce store connected successfully!");
      window.location.reload();
    } catch (error: any) {
      alert(error.message || "Failed to connect WooCommerce store");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Store Connections</h2>
          <p className="text-slate-600 mt-2 text-sm sm:text-base">Connect your Shopify or WooCommerce stores to publish products with one click</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowShopifyModal(true)}
            className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 sm:px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold text-sm sm:text-base whitespace-nowrap"
          >
            <Plus size={20} />
            Connect Shopify
          </button>
          <button
            onClick={() => setShowWooModal(true)}
            className="flex items-center justify-center gap-2 bg-purple-600 text-white px-4 sm:px-6 py-3 rounded-lg hover:bg-purple-700 transition font-semibold text-sm sm:text-base whitespace-nowrap"
          >
            <Plus size={20} />
            Connect WooCommerce
          </button>
        </div>
      </div>

      {stores.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-8 sm:p-12 lg:p-16 text-center">
          <ShoppingCart size={48} className="mx-auto text-slate-400 mb-4 sm:w-16 sm:h-16" />
          <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">No stores connected yet</h3>
          <p className="text-sm sm:text-base text-slate-600 mb-6 max-w-md mx-auto">Connect your Shopify or WooCommerce store to start publishing products</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <button
              onClick={() => setShowShopifyModal(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold text-sm sm:text-base"
            >
              Connect Shopify
            </button>
            <button
              onClick={() => setShowWooModal(true)}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-semibold text-sm sm:text-base"
            >
              Connect WooCommerce
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {stores.map((store) => (
            <div key={store.id} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 hover:shadow-lg transition">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`p-2 sm:p-3 rounded-lg ${store.platform === "shopify" ? "bg-green-100" : "bg-purple-100"}`}>
                    <Store size={20} className={`sm:w-6 sm:h-6 ${store.platform === "shopify" ? "text-green-600" : "text-purple-600"}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm sm:text-base break-words">{store.storeName}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${store.platform === "shopify" ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"}`}>
                      {store.platform === "shopify" ? "Shopify" : "WooCommerce"}
                    </span>
                  </div>
                </div>
                {store.isActive ? (
                  <Check className="text-green-600 flex-shrink-0" size={20} />
                ) : (
                  <X className="text-red-600 flex-shrink-0" size={20} />
                )}
              </div>
              <a
                href={store.storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs sm:text-sm text-blue-600 hover:text-blue-800 break-all"
              >
                Visit Store
                <ExternalLink size={14} className="flex-shrink-0" />
              </a>
              <p className="text-xs text-slate-500 mt-3">
                Connected {new Date(store.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Shopify Modal */}
      {showShopifyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 sm:p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl sm:text-2xl font-bold">Connect Shopify Store</h3>
              <button onClick={() => setShowShopifyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Shopify Domain
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={shopifyDomain}
                    onChange={(e) => setShopifyDomain(e.target.value)}
                    placeholder="your-store"
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm sm:text-base"
                  />
                  <span className="text-slate-600 text-sm sm:text-base self-center sm:self-auto">.myshopify.com</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Enter your store name (e.g., "my-store" from my-store.myshopify.com)
                </p>
              </div>

              <button
                onClick={connectShopify}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold text-sm sm:text-base"
              >
                Connect Shopify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WooCommerce Modal */}
      {showWooModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-xl p-6 sm:p-8 max-w-md w-full my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl sm:text-2xl font-bold">Connect WooCommerce Store</h3>
              <button onClick={() => setShowWooModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Store Name</label>
                <input
                  type="text"
                  value={wooForm.storeName}
                  onChange={(e) => setWooForm({ ...wooForm, storeName: e.target.value })}
                  placeholder="My Store"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Store URL</label>
                <input
                  type="url"
                  value={wooForm.storeUrl}
                  onChange={(e) => setWooForm({ ...wooForm, storeUrl: e.target.value })}
                  placeholder="https://yourstore.com"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Consumer Key</label>
                <input
                  type="text"
                  value={wooForm.consumerKey}
                  onChange={(e) => setWooForm({ ...wooForm, consumerKey: e.target.value })}
                  placeholder="ck_..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Consumer Secret</label>
                <input
                  type="password"
                  value={wooForm.consumerSecret}
                  onChange={(e) => setWooForm({ ...wooForm, consumerSecret: e.target.value })}
                  placeholder="cs_..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm sm:text-base"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <p className="text-xs text-blue-800">
                  <strong>How to get API credentials:</strong><br />
                  1. Go to WooCommerce → Settings → Advanced → REST API<br />
                  2. Click "Add key"<br />
                  3. Set permissions to "Read/Write"<br />
                  4. Copy the Consumer Key and Consumer Secret
                </p>
              </div>

              <button
                onClick={connectWooCommerce}
                disabled={loading}
                className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition font-semibold disabled:opacity-50 text-sm sm:text-base"
              >
                {loading ? "Connecting..." : "Connect WooCommerce"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
