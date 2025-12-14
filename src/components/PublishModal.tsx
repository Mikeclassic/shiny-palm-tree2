"use client";

import { useState, useEffect } from "react";
import { X, Store, Loader2, ExternalLink, CheckCircle2 } from "lucide-react";

interface PublishModalProps {
  productId: string;
  productTitle: string;
  onClose: () => void;
}

interface StoreOption {
  id: string;
  storeName: string;
  platform: string;
}

export default function PublishModal({ productId, productTitle, onClose }: PublishModalProps) {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [selectedStore, setSelectedStore] = useState("");
  const [publishUrl, setPublishUrl] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const res = await fetch("/api/stores/list");
      const data = await res.json();
      if (data.stores) {
        setStores(data.stores);
        if (data.stores.length > 0) {
          setSelectedStore(data.stores[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch stores:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedStore) {
      alert("Please select a store");
      return;
    }

    setPublishing(true);
    try {
      const res = await fetch("/api/stores/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          storeId: selectedStore,
        }),
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      setPublishUrl(data.externalUrl);
      setSuccess(true);
    } catch (error: any) {
      alert(error.message || "Failed to publish product");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900">Publish Product</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <CheckCircle2 size={64} className="mx-auto text-green-600 mb-4" />
            <h4 className="text-lg font-semibold text-slate-900 mb-2">Published Successfully!</h4>
            <p className="text-slate-600 mb-6">Your product is now live in your store</p>
            <a
              href={publishUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              View in Store
              <ExternalLink size={16} />
            </a>
          </div>
        ) : (
          <>
            <p className="text-slate-600 mb-4">
              Publishing: <strong>{productTitle}</strong>
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-slate-400" size={32} />
              </div>
            ) : stores.length === 0 ? (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
                <Store size={48} className="mx-auto text-orange-400 mb-3" />
                <p className="text-orange-800 font-semibold mb-2">No stores connected</p>
                <p className="text-orange-700 text-sm mb-4">
                  Connect a Shopify or WooCommerce store to publish products
                </p>
                <a
                  href="/dashboard/stores"
                  className="inline-block bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition font-semibold text-sm"
                >
                  Connect Store
                </a>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Store
                  </label>
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.storeName} ({store.platform === "shopify" ? "Shopify" : "WooCommerce"})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {publishing ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Publishing...
                    </>
                  ) : (
                    "Publish to Store"
                  )}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
