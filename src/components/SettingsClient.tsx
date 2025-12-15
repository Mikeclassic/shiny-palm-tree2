"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  User,
  Store,
  CreditCard,
  Download,
  Trash2,
  ShoppingCart,
  Plus,
  Check,
  X,
  ExternalLink,
  Settings as SettingsIcon,
  Shield,
  Bell,
  Palette
} from "lucide-react";
import Image from "next/image";

interface UserData {
  name: string;
  email: string;
  image: string;
  isPro: boolean;
  descriptionCredits: number;
  bgRemovalCredits: number;
  bgChangeCredits: number;
}

interface StoreConnection {
  id: string;
  platform: string;
  storeName: string;
  storeUrl: string;
  isActive: boolean;
  createdAt: Date;
}

interface SettingsClientProps {
  user: UserData;
  stores: StoreConnection[];
}

type Tab = "account" | "stores" | "credits" | "data";

export default function SettingsClient({ user, stores }: SettingsClientProps) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("account");
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
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // Handle success/error messages from URL params
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'shopify_connected') {
      alert('Shopify store connected successfully!');
      window.history.replaceState({}, '', '/dashboard/settings');
    }

    if (error === 'store_already_connected') {
      alert('This store is already connected to another account. Please disconnect it from the other account first or contact support.');
      window.history.replaceState({}, '', '/dashboard/settings');
    }

    if (error === 'shopify_connection_failed') {
      alert('Failed to connect Shopify store. Please try again.');
      window.history.replaceState({}, '', '/dashboard/settings');
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

  const handleExportData = async () => {
    try {
      const res = await fetch("/api/user/export");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clearseller-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      alert("Your data has been downloaded successfully!");
    } catch (error) {
      alert("Failed to export data. Please try again.");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") {
      alert('Please type "DELETE" to confirm account deletion');
      return;
    }

    if (!confirm("Are you absolutely sure? This action cannot be undone. All your data, products, and store connections will be permanently deleted.")) {
      return;
    }

    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" });
      if (res.ok) {
        window.location.href = "/";
      } else {
        alert("Failed to delete account. Please try again.");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  };

  const tabs = [
    { id: "account" as Tab, label: "Account", icon: User },
    { id: "stores" as Tab, label: "Store Connections", icon: Store },
    { id: "credits" as Tab, label: "Credits & Usage", icon: CreditCard },
    { id: "data" as Tab, label: "Data & Privacy", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 flex items-center gap-3">
            <SettingsIcon size={32} className="text-brand-600" />
            Settings
          </h1>
          <p className="text-slate-600 mt-2">Manage your account, connections, and preferences</p>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-slate-200 rounded-t-xl overflow-x-auto">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-4 text-sm sm:text-base font-medium whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? "text-brand-600 border-b-2 border-brand-600 bg-brand-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-xl shadow-sm p-6 sm:p-8">
          {/* Account Tab */}
          {activeTab === "account" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Account Information</h2>

                <div className="flex items-center gap-4 mb-6">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name}
                      width={80}
                      height={80}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center">
                      <User size={40} className="text-brand-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{user.name || "User"}</h3>
                    <p className="text-slate-600">{user.email}</p>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                      user.isPro ? "bg-yellow-100 text-yellow-800" : "bg-slate-100 text-slate-700"
                    }`}>
                      {user.isPro ? "Pro Account" : "Free Account"}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Account details are managed through Google OAuth.
                    To update your name or profile picture, please update your Google account settings.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Store Connections Tab */}
          {activeTab === "stores" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Store Connections</h2>
                  <p className="text-slate-600 text-sm mt-1">Connect your Shopify or WooCommerce stores</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setShowShopifyModal(true)}
                    className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition font-semibold text-sm whitespace-nowrap"
                  >
                    <Plus size={18} />
                    Connect Shopify
                  </button>
                  <button
                    onClick={() => setShowWooModal(true)}
                    className="flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-lg hover:bg-purple-700 transition font-semibold text-sm whitespace-nowrap"
                  >
                    <Plus size={18} />
                    Connect WooCommerce
                  </button>
                </div>
              </div>

              {stores.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-12 text-center">
                  <ShoppingCart size={48} className="mx-auto text-slate-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No stores connected yet</h3>
                  <p className="text-slate-600 mb-6">Connect your first store to start publishing products</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stores.map((store) => (
                    <div key={store.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${store.platform === "shopify" ? "bg-green-100" : "bg-purple-100"}`}>
                            <Store size={20} className={store.platform === "shopify" ? "text-green-600" : "text-purple-600"} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{store.storeName}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              store.platform === "shopify" ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"
                            }`}>
                              {store.platform === "shopify" ? "Shopify" : "WooCommerce"}
                            </span>
                          </div>
                        </div>
                        {store.isActive ? (
                          <Check className="text-green-600" size={20} />
                        ) : (
                          <X className="text-red-600" size={20} />
                        )}
                      </div>
                      <a
                        href={store.storeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                      >
                        Visit Store
                        <ExternalLink size={14} />
                      </a>
                      <p className="text-xs text-slate-500 mt-2">
                        Connected {new Date(store.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Credits Tab */}
          {activeTab === "credits" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Daily Credits</h2>
                <p className="text-slate-600 mb-6 text-sm">
                  {user.isPro ? "As a Pro user, you have unlimited credits!" : "Free users get 5 credits per day for each AI operation. Credits reset daily."}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-blue-900">AI Descriptions</h3>
                      <Palette size={24} className="text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-blue-600">
                      {user.isPro ? "∞" : user.descriptionCredits}/5
                    </p>
                    <p className="text-xs text-blue-700 mt-1">Credits remaining</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-green-900">Background Removal</h3>
                      <Shield size={24} className="text-green-600" />
                    </div>
                    <p className="text-3xl font-bold text-green-600">
                      {user.isPro ? "∞" : user.bgRemovalCredits}/5
                    </p>
                    <p className="text-xs text-green-700 mt-1">Credits remaining</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-purple-900">Background Change</h3>
                      <Bell size={24} className="text-purple-600" />
                    </div>
                    <p className="text-3xl font-bold text-purple-600">
                      {user.isPro ? "∞" : user.bgChangeCredits}/5
                    </p>
                    <p className="text-xs text-purple-700 mt-1">Credits remaining</p>
                  </div>
                </div>

                {!user.isPro && (
                  <div className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
                    <h3 className="font-semibold text-slate-900 mb-2">Upgrade to Pro</h3>
                    <p className="text-slate-700 text-sm mb-4">
                      Get unlimited credits for all AI operations, priority support, and exclusive features.
                    </p>
                    <button className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-2.5 rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transition">
                      Upgrade Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Data & Privacy Tab */}
          {activeTab === "data" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Data & Privacy</h2>
                <p className="text-slate-600 mb-6 text-sm">Manage your data and account privacy settings</p>

                {/* Export Data */}
                <div className="border border-slate-200 rounded-lg p-6 mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Download size={24} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1">Export Your Data</h3>
                      <p className="text-slate-600 text-sm mb-4">
                        Download all your data including products, store connections, and preferences in JSON format.
                      </p>
                      <button
                        onClick={handleExportData}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                      >
                        Download Data
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delete Account */}
                <div className="border border-red-200 bg-red-50 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-100 rounded-lg">
                      <Trash2 size={24} className="text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1">Delete Account</h3>
                      <p className="text-slate-600 text-sm mb-4">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Type "DELETE" to confirm
                          </label>
                          <input
                            type="text"
                            value={deleteConfirm}
                            onChange={(e) => setDeleteConfirm(e.target.value)}
                            placeholder="DELETE"
                            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none text-sm w-full sm:w-64"
                          />
                        </div>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleteConfirm !== "DELETE"}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Delete My Account
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
                <label className="block text-sm font-medium text-slate-700 mb-2">Shopify Domain</label>
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
