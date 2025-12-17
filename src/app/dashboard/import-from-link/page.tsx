"use client";

import { useState, useEffect } from "react";
import { Loader2, Link as LinkIcon, ShoppingBag, Check, AlertCircle, Sparkles, ExternalLink, Star, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

interface ProductData {
  itemId: string;
  title: string;
  price: number;
  regularPrice: number;
  salePrice: number;
  images: string[];
  variants: any[];
  shipping: {
    time: string;
    cost: number;
    company: string;
  };
  description: string;
  descriptionImages: string[];
  rating: number;
  reviewCount: number;
  reviews: any[];
  reviewStats: any;
  sourceUrl: string;
}

interface ConnectedStore {
  id: string;
  storeName: string;
  platform: string;
  storeUrl: string;
}

export default function ImportFromLink() {
  const [productUrl, setProductUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchProgress, setFetchProgress] = useState("");
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [error, setError] = useState("");
  const [generatingListing, setGeneratingListing] = useState(false);
  const [listingGenerated, setListingGenerated] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState<'sale' | 'regular'>('sale');
  const [currentReviewPage, setCurrentReviewPage] = useState(1);
  const [connectedStores, setConnectedStores] = useState<ConnectedStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [loadingStores, setLoadingStores] = useState(false);
  const [showAllDescImages, setShowAllDescImages] = useState(false);

  const reviewsPerPage = 10;

  // Fetch connected stores on mount
  useEffect(() => {
    fetchConnectedStores();
  }, []);

  const fetchConnectedStores = async () => {
    setLoadingStores(true);
    try {
      const response = await fetch('/api/stores/list');
      const data = await response.json();
      console.log('[Import] Fetched stores:', data);
      if (data.stores && data.stores.length > 0) {
        setConnectedStores(data.stores);
        setSelectedStore(data.stores[0].id);
      }
    } catch (err) {
      console.error('Error fetching stores:', err);
    } finally {
      setLoadingStores(false);
    }
  };

  const handleFetchProduct = async () => {
    if (!productUrl.trim()) {
      setError("Please enter a product URL");
      return;
    }

    setLoading(true);
    setError("");
    setProductData(null);
    setListingGenerated(false);
    setCurrentReviewPage(1);

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

      // Set default price selection
      if (data.data.salePrice > 0) {
        setSelectedPrice('sale');
      } else {
        setSelectedPrice('regular');
      }

    } catch (err: any) {
      setError(err.message || 'Failed to fetch product data');
      console.error('Error fetching product:', err);
    } finally {
      setLoading(false);
      setFetchProgress("");
    }
  };

  const handlePublishToShopify = async () => {
    if (!productData) return;

    if (!selectedStore) {
      setError("Please select a store to publish to");
      return;
    }

    setGeneratingListing(true);
    setError("");

    try {
      setFetchProgress("Publishing to Shopify...");

      const priceToUse = selectedPrice === 'sale' ? productData.salePrice : productData.regularPrice;

      // Call Shopify publish API
      const response = await fetch('/api/stores/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          storeId: selectedStore,
          productData: {
            ...productData,
            price: priceToUse
          },
          suggestedPrice: priceToUse * 2.5
        })
      });

      const data = await response.json();

      console.log('[Publish] Response:', response.ok, data);

      if (!response.ok) {
        console.error('[Publish] Error response:', data);
        throw new Error(data.error || 'Failed to publish to Shopify');
      }

      if (!data.success || !data.externalUrl) {
        console.error('[Publish] Invalid response:', data);
        throw new Error('Invalid response from server');
      }

      console.log('[Publish] Successfully published:', data.externalUrl);
      setFetchProgress(`✅ Published! View product: ${data.externalUrl}`);
      setListingGenerated(true);

      // Don't auto-hide success message so user can see the URL
      // setTimeout(() => {
      //   setFetchProgress("");
      // }, 3000);

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to publish to Shopify';
      setError(errorMessage);
      console.error('[Publish] Error:', err);
      setFetchProgress("");
    } finally {
      setGeneratingListing(false);
    }
  };

  // Filter reviews to only show 3+ stars
  const filteredReviews = productData
    ? productData.reviews.filter((review: any) => {
        // Check for typo variations in API field name
        const stars = review.review?.reviewStarts || review.review?.reviewStars || review.review?.rating || 0;
        console.log('[Review Filter] Review stars:', stars, 'Review:', review.review);
        return stars >= 3;
      })
    : [];

  // Calculate pagination
  const totalReviewPages = Math.ceil(filteredReviews.length / reviewsPerPage);
  const paginatedReviews = filteredReviews.slice(
    (currentReviewPage - 1) * reviewsPerPage,
    currentReviewPage * reviewsPerPage
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-2 md:gap-3">
            <ShoppingBag className="text-blue-600" size={32} />
            <span className="leading-tight">Import from AliExpress Link</span>
          </h1>
          <p className="text-sm md:text-base text-slate-600">
            Paste an AliExpress product URL to fetch details and publish to Shopify
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 mb-8">
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            AliExpress Product URL
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
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
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 w-full sm:w-auto"
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
          <div className="space-y-8">
            {/* Product Overview */}
            <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
                <h2 className="text-xl md:text-2xl font-bold text-slate-900">Product Details</h2>
                <a
                  href={productData.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-2 text-sm"
                >
                  <ExternalLink size={16} />
                  View on AliExpress
                </a>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Product Images */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Product Images</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {productData.images.slice(0, 4).map((img, idx) => (
                      <div key={idx} className="relative h-48 bg-slate-100 rounded-lg overflow-hidden border-2 border-slate-200">
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

                {/* Product Info */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Title</h3>
                    <p className="text-slate-700">{productData.title}</p>
                  </div>

                  {/* Price Selection */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Select Price</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {productData.salePrice > 0 && (
                        <button
                          onClick={() => setSelectedPrice('sale')}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            selectedPrice === 'sale'
                              ? 'border-green-500 bg-green-50'
                              : 'border-slate-200 hover:border-green-300'
                          }`}
                        >
                          <div className="text-xs text-slate-600 mb-1">Sale Price</div>
                          <div className="text-xl md:text-2xl font-bold text-green-600">
                            ${productData.salePrice.toFixed(2)}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Suggested: ${(productData.salePrice * 2.5).toFixed(2)}
                          </div>
                        </button>
                      )}
                      {productData.regularPrice > 0 && (
                        <button
                          onClick={() => setSelectedPrice('regular')}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            selectedPrice === 'regular'
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          <div className="text-xs text-slate-600 mb-1">Regular Price</div>
                          <div className="text-xl md:text-2xl font-bold text-blue-600">
                            ${productData.regularPrice.toFixed(2)}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Suggested: ${(productData.regularPrice * 2.5).toFixed(2)}
                          </div>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rating */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">Rating</h3>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Star className="fill-yellow-400 text-yellow-400" size={20} />
                        <span className="text-2xl font-bold text-yellow-600">
                          {productData.rating.toFixed(1)}
                        </span>
                        <span className="text-slate-500">/ 5.0</span>
                      </div>
                      <span className="text-sm text-slate-500">
                        ({productData.reviewCount.toLocaleString()} reviews)
                      </span>
                    </div>
                  </div>

                  {/* Shipping */}
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

                  {/* Variants */}
                  {productData.variants && productData.variants.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-3">Variants</h3>
                      <div className="space-y-3">
                        {productData.variants.map((variant: any, idx: number) => (
                          <div key={idx} className="border-2 border-slate-200 rounded-lg p-3">
                            <div className="font-medium text-slate-900 mb-2">{variant.name || `Variant ${idx + 1}`}</div>
                            {variant.values && variant.values.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {variant.values.slice(0, 5).map((value: any, vIdx: number) => (
                                  <div key={vIdx} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-md border border-slate-200">
                                    {value.image && (
                                      <div className="relative w-12 h-12 rounded">
                                        <Image
                                          src={value.image.startsWith('//') ? `https:${value.image}` : value.image}
                                          alt={value.name}
                                          fill
                                          className="object-cover rounded"
                                        />
                                      </div>
                                    )}
                                    <span className="text-sm text-slate-700">{value.name}</span>
                                  </div>
                                ))}
                                {variant.values.length > 5 && (
                                  <span className="text-xs text-slate-500 px-2 py-1">
                                    +{variant.values.length - 5} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8">
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-4">Description</h3>
              <div className="bg-slate-50 p-4 md:p-6 rounded-lg mb-6">
                <p className="text-sm md:text-base text-slate-700 whitespace-pre-wrap">
                  {productData.description}
                </p>
              </div>

              {/* Description Images */}
              {productData.descriptionImages && productData.descriptionImages.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base md:text-lg font-semibold text-slate-900">Product Detail Images</h4>
                    {productData.descriptionImages.length > 4 && (
                      <button
                        onClick={() => setShowAllDescImages(!showAllDescImages)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                      >
                        {showAllDescImages ? 'Show Less' : `View All (${productData.descriptionImages.length})`}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(showAllDescImages ? productData.descriptionImages : productData.descriptionImages.slice(0, 4)).map((img: string, idx: number) => (
                      <div key={idx} className="relative h-96 bg-slate-100 rounded-lg overflow-hidden border-2 border-slate-200">
                        <Image
                          src={img}
                          alt={`Description image ${idx + 1}`}
                          fill
                          className="object-contain"
                        />
                      </div>
                    ))}
                  </div>
                  {!showAllDescImages && productData.descriptionImages.length > 4 && (
                    <p className="text-sm text-slate-500 mt-3 text-center">
                      +{productData.descriptionImages.length - 4} more images
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Reviews Section */}
            {productData.reviews && productData.reviews.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8">
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-6">Customer Reviews</h3>

                {/* Review Stats */}
                {productData.reviewStats && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="text-2xl font-bold text-green-600">
                        {productData.reviewStats.fiveStarRate}%
                      </div>
                      <div className="text-xs text-slate-600">5 Stars ({productData.reviewStats.fiveStarNum})</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="text-2xl font-bold text-blue-600">
                        {productData.reviewStats.fourStarRate}%
                      </div>
                      <div className="text-xs text-slate-600">4 Stars ({productData.reviewStats.fourStarNum})</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <div className="text-2xl font-bold text-yellow-600">
                        {productData.reviewStats.threeStarRate}%
                      </div>
                      <div className="text-xs text-slate-600">3 Stars ({productData.reviewStats.threeStarNum})</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <div className="text-2xl font-bold text-orange-600">
                        {productData.reviewStats.twoStarRate}%
                      </div>
                      <div className="text-xs text-slate-600">2 Stars ({productData.reviewStats.twoStarNum})</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <div className="text-2xl font-bold text-red-600">
                        {productData.reviewStats.oneStarRate}%
                      </div>
                      <div className="text-xs text-slate-600">1 Star ({productData.reviewStats.oneStarNum})</div>
                    </div>
                  </div>
                )}

                {/* Featured Review Images */}
                {(() => {
                  const allReviewImages: string[] = [];
                  filteredReviews.forEach((review: any) => {
                    if (review.review?.reviewImages && Array.isArray(review.review.reviewImages)) {
                      allReviewImages.push(...review.review.reviewImages);
                    }
                  });

                  if (allReviewImages.length > 0) {
                    return (
                      <div className="mb-8">
                        <h4 className="text-lg font-bold text-slate-900 mb-4">Customer Photos</h4>
                        <div className="flex gap-3 overflow-x-auto pb-3">
                          {allReviewImages.slice(0, 30).map((img, imgIdx) => (
                            <div key={imgIdx} className="flex-shrink-0">
                              <img
                                src={img.startsWith('//') ? `https:${img}` : img}
                                alt={`Customer photo ${imgIdx + 1}`}
                                className="w-36 h-36 object-cover rounded-lg border-2 border-slate-200"
                              />
                            </div>
                          ))}
                        </div>
                        {allReviewImages.length > 30 && (
                          <p className="text-sm text-slate-500 mt-2">
                            +{allReviewImages.length - 30} more customer photos
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Average Rating Display */}
                <div className="mb-6 p-4 bg-slate-50 rounded-lg text-center">
                  <span className="text-xl md:text-2xl font-bold text-slate-900">
                    {productData.reviewStats?.evarageStar || productData.reviewStats?.averageStar || 0}
                  </span>
                  <span className="text-lg md:text-xl mx-2">
                    {'⭐'.repeat(Math.round(productData.reviewStats?.evarageStar || productData.reviewStats?.averageStar || 0))}
                  </span>
                  <span className="text-base md:text-lg text-slate-600">
                    {productData.reviews.length} ratings
                  </span>
                </div>

                {/* Review List */}
                <div className="space-y-4">
                  {paginatedReviews.map((review: any, idx: number) => (
                    <div key={idx} className="border-2 border-slate-200 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {review.buyer?.buyerImage && (
                            <img
                              src={review.buyer.buyerImage}
                              alt="Buyer"
                              className="w-10 h-10 rounded-full"
                            />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">
                                {(() => {
                                  const name = review.buyer?.buyerTitle || 'Anonymous';
                                  return name.toLowerCase().includes('aliexpress shopper') ? 'Anonymous Shopper' : name;
                                })()}
                              </span>
                              {review.buyer?.buyerCountry && (
                                <img
                                  src={`https://flagcdn.com/w20/${review.buyer.buyerCountry.toLowerCase()}.png`}
                                  alt={review.buyer.buyerCountry}
                                  className="w-4 h-3 object-cover rounded-sm"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              )}
                            </div>
                            <div className="text-xs text-slate-500">
                              {review.buyer?.buyerCountry} • {review.review?.reviewDate}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={16}
                              className={
                                i < review.review?.reviewStarts
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-slate-300'
                              }
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-slate-700 mb-3">
                        {review.review?.translation?.reviewContent || review.review?.reviewContent}
                      </p>

                      {review.review?.reviewImages && review.review.reviewImages.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mt-3">
                          {review.review.reviewImages.map((img: string, imgIdx: number) => (
                            <div key={imgIdx} className="h-24 bg-slate-100 rounded-lg overflow-hidden">
                              <img
                                src={img.startsWith('//') ? `https:${img}` : img}
                                alt={`Review image ${imgIdx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {review.review?.itemSpecInfo && (
                        <div className="mt-3 text-xs text-slate-500">
                          <span className="font-medium">Variant:</span> {review.review.itemSpecInfo}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalReviewPages > 1 && (
                  <div className="flex flex-col items-center gap-4 mt-6">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        onClick={() => setCurrentReviewPage(p => Math.max(1, p - 1))}
                        disabled={currentReviewPage === 1}
                        className="px-3 md:px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-xs md:text-sm"
                      >
                        Previous
                      </button>

                      {/* Page numbers */}
                      <div className="flex items-center gap-1 md:gap-2">
                        {[...Array(totalReviewPages)].map((_, idx) => {
                          const pageNum = idx + 1;
                          // Show first page, last page, current page, and pages around current
                          if (
                            pageNum === 1 ||
                            pageNum === totalReviewPages ||
                            (pageNum >= currentReviewPage - 1 && pageNum <= currentReviewPage + 1)
                          ) {
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentReviewPage(pageNum)}
                                className={`w-8 h-8 md:w-10 md:h-10 rounded-lg font-medium text-xs md:text-sm transition ${
                                  currentReviewPage === pageNum
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          } else if (
                            pageNum === currentReviewPage - 2 ||
                            pageNum === currentReviewPage + 2
                          ) {
                            return <span key={pageNum} className="text-slate-400 hidden sm:inline">...</span>;
                          }
                          return null;
                        })}
                      </div>

                      <button
                        onClick={() => setCurrentReviewPage(p => Math.min(totalReviewPages, p + 1))}
                        disabled={currentReviewPage === totalReviewPages}
                        className="px-3 md:px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-xs md:text-sm"
                      >
                        Next
                      </button>
                    </div>
                    <p className="text-xs md:text-sm text-slate-500 text-center px-4">
                      Showing {(currentReviewPage - 1) * reviewsPerPage + 1}-{Math.min(currentReviewPage * reviewsPerPage, filteredReviews.length)} of {filteredReviews.length} reviews
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Publish Section */}
            <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8">
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-6">Publish to Shopify</h3>

              {/* Store Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Select Store
                </label>
                {loadingStores ? (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Loader2 className="animate-spin" size={16} />
                    Loading stores...
                  </div>
                ) : connectedStores.length > 0 ? (
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  >
                    {connectedStores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.storeName} ({store.platform})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-900">
                      No stores connected. Please connect a Shopify store first.
                    </p>
                  </div>
                )}
              </div>

              {/* Publish Button */}
              <div className="flex justify-center">
                <button
                  onClick={handlePublishToShopify}
                  disabled={generatingListing || listingGenerated || !selectedStore}
                  className="px-12 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl flex items-center gap-3 text-lg"
                >
                  {generatingListing ? (
                    <>
                      <Loader2 className="animate-spin" size={24} />
                      Publishing to Shopify...
                    </>
                  ) : listingGenerated ? (
                    <>
                      <Check size={24} />
                      Published Successfully!
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={24} />
                      Publish to Shopify
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
