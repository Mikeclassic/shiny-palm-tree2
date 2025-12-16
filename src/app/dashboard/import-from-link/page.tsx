"use client";

import { useState } from "react";
import { Loader2, Link as LinkIcon, ShoppingBag, Check, AlertCircle, Sparkles, ExternalLink } from "lucide-react";
import Image from "next/image";

interface ProductData {
  itemId: string;
  title: string;
  price: number;
  images: string[];
  variants: any[];
  shipping: {
    time: string;
    cost: number;
    company: string;
  };
  description: string;
  rating: number;
  reviewCount: number;
  reviews: any[];
  sourceUrl: string;
}

export default function ImportFromLink() {
  const [productUrl, setProductUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchProgress, setFetchProgress] = useState("");
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [error, setError] = useState("");
  const [generatingListing, setGeneratingListing] = useState(false);
  const [listingGenerated, setListingGenerated] = useState(false);

  const handleFetchProduct = async () => {
    if (!productUrl.trim()) {
      setError("Please enter a product URL");
      return;
    }

    setLoading(true);
    setError("");
    setProductData(null);
    setListingGenerated(false);

    try {
      setFetchProgress("Fetching product details...");

      const response = await fetch('/api/aliexpress/fetch-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productUrl })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch product');
      }

      setFetchProgress("Product data fetched successfully!");
      setProductData(data.data);

    } catch (err: any) {
      setError(err.message || 'Failed to fetch product data');
      console.error('Error fetching product:', err);
    } finally {
      setLoading(false);
      setFetchProgress("");
    }
  };

  const handleGenerateListing = async () => {
    if (!productData) return;

    setGeneratingListing(true);
    setError("");

    try {
      setFetchProgress("Generating Shopify listing...");

      // Call Shopify listing generation API
      const response = await fetch('/api/shopify/generate-listing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productData,
          // Calculate suggested price (2.5x markup)
          suggestedPrice: productData.price * 2.5
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate listing');
      }

      setFetchProgress("Listing generated successfully!");
      setListingGenerated(true);

      // Show success message
      setTimeout(() => {
        setFetchProgress("");
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Failed to generate listing');
      console.error('Error generating listing:', err);
    } finally {
      setGeneratingListing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <ShoppingBag className="text-blue-600" size={40} />
            Import from AliExpress Link
          </h1>
          <p className="text-slate-600">
            Paste an AliExpress product URL to fetch details and generate a Shopify listing
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            AliExpress Product URL
          </label>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleFetchProduct()}
                placeholder="https://www.aliexpress.com/item/..."
                className="w-full pl-12 pr-4 py-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-slate-700"
                disabled={loading}
              />
            </div>
            <button
              onClick={handleFetchProduct}
              disabled={loading || !productUrl.trim()}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Fetching...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Fetch Product
                </>
              )}
            </button>
          </div>

          {/* Progress Message */}
          {fetchProgress && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
              {loading || generatingListing ? (
                <Loader2 className="animate-spin text-blue-600" size={20} />
              ) : (
                <Check className="text-green-600" size={20} />
              )}
              <span className="text-blue-900 font-medium">{fetchProgress}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="text-red-600" size={20} />
              <span className="text-red-900">{error}</span>
            </div>
          )}
        </div>

        {/* Product Data Display */}
        {productData && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Product Details</h2>
              <a
                href={productData.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
              >
                <ExternalLink size={16} />
                View on AliExpress
              </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Images */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Product Images</h3>
                <div className="grid grid-cols-2 gap-4">
                  {productData.images.slice(0, 4).map((img, idx) => (
                    <div key={idx} className="relative h-48 bg-slate-100 rounded-lg overflow-hidden">
                      <Image
                        src={img}
                        alt={`Product image ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
                {productData.images.length > 4 && (
                  <p className="text-sm text-slate-500 mt-2">
                    +{productData.images.length - 4} more images
                  </p>
                )}
              </div>

              {/* Details */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Title</h3>
                  <p className="text-slate-700">{productData.title}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">Price</h3>
                    <p className="text-2xl font-bold text-green-600">
                      ${productData.price.toFixed(2)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      Suggested: ${(productData.price * 2.5).toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">Rating</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-yellow-600">
                        {productData.rating.toFixed(1)}
                      </span>
                      <span className="text-slate-500">/ 5.0</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {productData.reviewCount.toLocaleString()} reviews
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Shipping</h3>
                  <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">Time:</span> {productData.shipping.time} days
                    </p>
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">Cost:</span> ${productData.shipping.cost.toFixed(2)}
                    </p>
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">Company:</span> {productData.shipping.company}
                    </p>
                  </div>
                </div>

                {productData.variants && productData.variants.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">Variants</h3>
                    <p className="text-sm text-slate-600">
                      {productData.variants.length} variant types available
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Description</h3>
              <div className="bg-slate-50 p-6 rounded-lg">
                <p className="text-slate-700 whitespace-pre-wrap">
                  {productData.description.substring(0, 500)}
                  {productData.description.length > 500 && '...'}
                </p>
              </div>
            </div>

            {/* Generate Listing Button */}
            <div className="flex justify-center">
              <button
                onClick={handleGenerateListing}
                disabled={generatingListing || listingGenerated}
                className="px-12 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl flex items-center gap-3 text-lg"
              >
                {generatingListing ? (
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    Generating Shopify Listing...
                  </>
                ) : listingGenerated ? (
                  <>
                    <Check size={24} />
                    Listing Generated Successfully!
                  </>
                ) : (
                  <>
                    <ShoppingBag size={24} />
                    Generate Shopify Listing
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
