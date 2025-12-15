# ClearSeller: High-Impact Features Implementation Plan

## Overview
This document outlines the implementation strategy for three game-changing features that will dramatically increase user value and retention.

---

## 🎯 Feature 1.1: One-Click Product Import from AliExpress/Amazon/Temu

### **Business Value**
- **Problem Solved:** Manual product copying takes 10-20 minutes per product
- **User Benefit:** Import 50+ products in the time it used to take for 1
- **Monetization:** Premium feature - 500 imports/month for Pro users, 10/month for free

### **Technical Architecture**

#### Phase 1: Browser Extension (Week 1-2)
**Tech Stack:**
- Manifest V3 Chrome Extension
- React for popup UI
- Tailwind CSS for styling

**Files to Create:**
```
/extension/
├── manifest.json
├── popup/
│   ├── index.html
│   ├── popup.tsx
│   └── styles.css
├── content-scripts/
│   ├── aliexpress.ts
│   ├── amazon.ts
│   └── temu.ts
├── background/
│   └── service-worker.ts
└── assets/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

**Content Script Logic:**
```typescript
// content-scripts/aliexpress.ts
interface ScrapedProduct {
  title: string;
  price: number;
  images: string[];
  description: string;
  specifications: Record<string, string>;
  supplierUrl: string;
  shippingTime: string;
  rating: number;
  reviewCount: number;
}

async function scrapeAliExpressProduct(): Promise<ScrapedProduct> {
  return {
    title: document.querySelector('.product-title')?.textContent?.trim() || '',
    price: parsePrice(document.querySelector('.product-price')?.textContent),
    images: Array.from(document.querySelectorAll('.images-view img'))
      .map(img => img.getAttribute('src') || ''),
    description: document.querySelector('.product-description')?.innerHTML || '',
    specifications: extractSpecifications(),
    supplierUrl: window.location.href,
    shippingTime: extractShippingTime(),
    rating: parseFloat(document.querySelector('.rating')?.textContent || '0'),
    reviewCount: parseInt(document.querySelector('.review-count')?.textContent || '0')
  };
}
```

#### Phase 2: API Endpoint for Product Import (Week 2)
**New API Routes:**

**File:** `/src/app/api/products/import/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

interface ImportProductRequest {
  title: string;
  price: number;
  images: string[];
  description: string;
  supplierUrl: string;
  supplierPrice: number;
  shippingTime?: string;
  rating?: number;
  reviewCount?: number;
  source: 'aliexpress' | 'amazon' | 'temu';
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, isPro: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check import limits (10 for free, unlimited for Pro)
    if (!user.isPro) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const importCount = await db.product.count({
        where: {
          createdAt: { gte: today },
          supplierUrl: { not: null }
        }
      });

      if (importCount >= 10) {
        return NextResponse.json({
          error: "Daily import limit reached. Upgrade to Pro for unlimited imports."
        }, { status: 403 });
      }
    }

    const body: ImportProductRequest = await req.json();

    // Calculate suggested markup (2-3x for typical dropshipping)
    const suggestedPrice = calculateSuggestedPrice(body.supplierPrice, body.source);

    // Create product
    const product = await db.product.create({
      data: {
        title: body.title,
        price: suggestedPrice,
        imageUrl: body.images[0] || '',
        sourceUrl: body.supplierUrl,
        originalDesc: body.description,
        supplierUrl: body.supplierUrl,
        supplierPrice: body.supplierPrice,
        lastSourced: new Date(),
        tags: [],
      }
    });

    return NextResponse.json({
      success: true,
      product,
      suggestedPrice,
      profitMargin: suggestedPrice - body.supplierPrice
    });

  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function calculateSuggestedPrice(supplierPrice: number, source: string): number {
  // Different markup strategies per platform
  const markupMultipliers = {
    aliexpress: 2.5,  // 2.5x markup
    amazon: 1.8,      // Lower markup (higher base price)
    temu: 3.0         // Higher markup (very low base price)
  };

  const basePrice = supplierPrice * markupMultipliers[source];

  // Psychological pricing: round to .99 or .95
  if (basePrice < 20) return Math.floor(basePrice) + 0.99;
  if (basePrice < 50) return Math.floor(basePrice / 5) * 5 + 4.99;
  return Math.floor(basePrice / 10) * 10 + 9.99;
}
```

#### Phase 3: Competitor Price Analysis (Week 3)
**New API Route:** `/src/app/api/products/analyze-competitors/route.ts`

```typescript
// Uses web scraping to find similar products and suggest competitive pricing
export async function POST(req: NextRequest) {
  const { productTitle, category } = await req.json();

  // Search Google Shopping or Amazon for similar products
  const competitors = await searchCompetitorPrices(productTitle);

  // Calculate price statistics
  const prices = competitors.map(c => c.price);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return NextResponse.json({
    competitors,
    analysis: {
      averagePrice: avgPrice,
      priceRange: { min: minPrice, max: maxPrice },
      recommendedPrice: avgPrice * 0.95, // Slightly undercut average
      competitiveAdvantage: 'price' // or 'quality', 'shipping', etc.
    }
  });
}
```

### **Database Schema Updates**

Add to `schema.prisma`:
```prisma
model Product {
  // ... existing fields ...

  // New fields for imported products
  importSource      String?   // 'aliexpress' | 'amazon' | 'temu' | 'manual'
  supplierRating    Float?
  supplierReviews   Int?
  shippingTime      String?   // "7-14 days"
  competitorPrices  Json?     // Store competitor price analysis
  suggestedPrice    Float?    // AI-calculated optimal price
  profitMargin      Float?    // Calculated: price - supplierPrice - fees
  importedAt        DateTime?
}
```

### **UI Components**

**File:** `/src/components/ProductImportModal.tsx`
```typescript
"use client";
import { useState } from "react";
import { Upload, DollarSign, TrendingUp, AlertCircle } from "lucide-react";

interface ImportedProductData {
  title: string;
  price: number;
  supplierPrice: number;
  images: string[];
  source: string;
}

export default function ProductImportModal({
  importedData,
  onConfirm,
  onCancel
}: {
  importedData: ImportedProductData;
  onConfirm: (product: any) => void;
  onCancel: () => void;
}) {
  const [customPrice, setCustomPrice] = useState(importedData.price);
  const profitMargin = customPrice - importedData.supplierPrice;
  const profitPercentage = ((profitMargin / customPrice) * 100).toFixed(1);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-100 rounded-lg">
            <Upload className="text-green-600" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold">Confirm Product Import</h3>
            <p className="text-sm text-slate-600">Review and adjust before adding to catalog</p>
          </div>
        </div>

        {/* Product Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <img
              src={importedData.images[0]}
              alt={importedData.title}
              className="w-full rounded-lg border border-slate-200"
            />
          </div>
          <div>
            <h4 className="font-semibold text-lg mb-2">{importedData.title}</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">Supplier Cost</span>
                <span className="font-bold text-red-600">${importedData.supplierPrice.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-sm text-slate-600">Your Price</span>
                <input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(parseFloat(e.target.value))}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-right font-bold"
                  step="0.01"
                />
              </div>

              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                <span className="text-sm text-slate-600">Profit Margin</span>
                <div className="text-right">
                  <div className="font-bold text-green-600">${profitMargin.toFixed(2)}</div>
                  <div className="text-xs text-green-600">{profitPercentage}% margin</div>
                </div>
              </div>
            </div>

            {profitPercentage < '40' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-2">
                <AlertCircle size={20} className="text-yellow-600 shrink-0" />
                <p className="text-xs text-yellow-800">
                  Low profit margin. Consider increasing price for better ROI.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ ...importedData, price: customPrice })}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
          >
            Import Product
          </button>
        </div>
      </div>
    </div>
  );
}
```

### **Chrome Extension Installation Flow**

1. User clicks "Install Chrome Extension" button in dashboard
2. Redirect to Chrome Web Store (or provide manual installation instructions)
3. After installation, extension connects to ClearSeller account via API key
4. User visits AliExpress/Amazon/Temu product page
5. Click extension icon → "Import to ClearSeller" button appears
6. Extension scrapes product data and sends to API
7. ProductImportModal shows in dashboard with imported data
8. User confirms import with pricing adjustments

### **Success Metrics**
- Average import time: <30 seconds (vs 10-20 minutes manual)
- Free users: 10 imports/day
- Pro users: Unlimited imports
- Target: 80% of imported products get published to stores

---

## 💰 Feature 1.2: Profit Calculator & Price Optimizer

### **Business Value**
- **Problem Solved:** Dropshippers lose money on incorrect pricing and hidden fees
- **User Benefit:** Instant profit visibility on every product
- **Monetization:** Free feature (drives Pro upgrades for advanced analytics)

### **Technical Architecture**

#### Phase 1: Database Schema (Week 1)
Add to `schema.prisma`:
```prisma
model Product {
  // ... existing fields ...

  // Pricing & Profit fields
  costBreakdown     Json?     // { product: X, shipping: Y, fees: Z, taxes: W }
  estimatedFees     Float?    // Platform fees (Shopify 2.9% + 30¢, etc.)
  shippingCost      Float?    // Estimated shipping to customer
  netProfit         Float?    // Final profit after all costs
  profitMarginPct   Float?    // Percentage profit margin
  breakEvenPrice    Float?    // Minimum price to not lose money
  competitorAvgPrice Float?   // Average price from competitors
  priceRecommendation String? // 'increase' | 'decrease' | 'optimal'
}

model PricingRule {
  id                String   @id @default(cuid())
  userId            String
  name              String   // "Default Markup", "Premium Category", etc.

  // Rule conditions
  minCost           Float?
  maxCost           Float?
  productType       String?

  // Pricing strategy
  markupType        String   // 'percentage' | 'fixed' | 'tiered'
  markupValue       Float

  // Fee assumptions (user can customize)
  platformFeePct    Float    @default(2.9)  // Shopify default
  platformFeeFixed  Float    @default(0.30)
  shippingCostEstimate Float @default(5.00)

  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())

  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### Phase 2: Profit Calculation API (Week 1)
**File:** `/src/app/api/products/calculate-profit/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";

interface ProfitCalculation {
  supplierPrice: number;
  sellingPrice: number;
  quantity: number;
  platform: 'shopify' | 'woocommerce' | 'etsy';
  shippingMethod: 'standard' | 'express';
  destination: string; // country code
}

interface FeesBreakdown {
  platformFees: number;
  paymentProcessing: number;
  shipping: number;
  taxes: number;
  total: number;
}

interface ProfitResult {
  sellingPrice: number;
  totalCosts: number;
  costBreakdown: {
    productCost: number;
    fees: FeesBreakdown;
  };
  netProfit: number;
  profitMargin: number;
  roi: number;
  breakEvenPrice: number;
  recommendation: string;
}

export async function POST(req: NextRequest) {
  const data: ProfitCalculation = await req.json();

  const fees = calculateFees(data);
  const totalCosts = data.supplierPrice + fees.total;
  const netProfit = data.sellingPrice - totalCosts;
  const profitMargin = (netProfit / data.sellingPrice) * 100;
  const roi = (netProfit / totalCosts) * 100;

  // Calculate minimum price to break even
  const breakEvenPrice = totalCosts / 0.97; // Account for fees on selling price too

  // Generate recommendation
  let recommendation = '';
  if (profitMargin < 20) {
    recommendation = 'Low margin - consider increasing price';
  } else if (profitMargin > 60) {
    recommendation = 'High margin - competitive advantage';
  } else {
    recommendation = 'Healthy profit margin';
  }

  const result: ProfitResult = {
    sellingPrice: data.sellingPrice,
    totalCosts,
    costBreakdown: {
      productCost: data.supplierPrice,
      fees
    },
    netProfit,
    profitMargin,
    roi,
    breakEvenPrice,
    recommendation
  };

  return NextResponse.json(result);
}

function calculateFees(data: ProfitCalculation): FeesBreakdown {
  // Platform-specific fee structures
  const platformFees = {
    shopify: {
      transactionPct: 0.029,  // 2.9%
      transactionFixed: 0.30,
      monthlyFee: 29 / 30 / 100 // Amortized per product
    },
    woocommerce: {
      transactionPct: 0.029,  // Stripe/PayPal
      transactionFixed: 0.30,
      monthlyFee: 0 // Self-hosted
    },
    etsy: {
      transactionPct: 0.065,  // 6.5% transaction fee
      transactionFixed: 0.20,
      monthlyFee: 0
    }
  };

  const platformConfig = platformFees[data.platform];
  const platformFee = (data.sellingPrice * platformConfig.transactionPct) +
                       platformConfig.transactionFixed;

  // Payment processing (on top of platform fees)
  const paymentProcessing = data.sellingPrice * 0.029 + 0.30;

  // Shipping estimation
  const shippingCosts = {
    standard: { US: 5, CA: 8, EU: 12, other: 15 },
    express: { US: 12, CA: 18, EU: 25, other: 30 }
  };

  const region = getRegion(data.destination);
  const shipping = shippingCosts[data.shippingMethod][region];

  // Tax estimation (simplified - actual depends on nexus)
  const taxes = data.sellingPrice * 0.08; // Assume 8% avg sales tax

  return {
    platformFees: platformFee,
    paymentProcessing,
    shipping,
    taxes,
    total: platformFee + paymentProcessing + shipping + taxes
  };
}

function getRegion(countryCode: string): 'US' | 'CA' | 'EU' | 'other' {
  if (countryCode === 'US') return 'US';
  if (countryCode === 'CA') return 'CA';
  if (['DE', 'FR', 'IT', 'ES', 'UK'].includes(countryCode)) return 'EU';
  return 'other';
}
```

#### Phase 3: UI Components (Week 2)

**File:** `/src/components/ProfitCalculator.tsx`
```typescript
"use client";
import { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calculator,
  AlertCircle,
  CheckCircle
} from "lucide-react";

interface ProfitCalculatorProps {
  productId: string;
  supplierPrice: number;
  currentPrice: number;
  onPriceUpdate?: (newPrice: number) => void;
}

export default function ProfitCalculator({
  productId,
  supplierPrice,
  currentPrice,
  onPriceUpdate
}: ProfitCalculatorProps) {
  const [sellingPrice, setSellingPrice] = useState(currentPrice);
  const [platform, setPlatform] = useState<'shopify' | 'woocommerce' | 'etsy'>('shopify');
  const [profitData, setProfitData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    calculateProfit();
  }, [sellingPrice, platform]);

  const calculateProfit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products/calculate-profit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierPrice,
          sellingPrice,
          quantity: 1,
          platform,
          shippingMethod: 'standard',
          destination: 'US'
        })
      });
      const data = await res.json();
      setProfitData(data);
    } catch (error) {
      console.error('Profit calculation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!profitData) {
    return (
      <div className="animate-pulse bg-slate-100 rounded-lg p-4 h-32"></div>
    );
  }

  const isHealthyMargin = profitData.profitMargin >= 30;
  const isLowMargin = profitData.profitMargin < 20;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calculator className="text-blue-600" size={20} />
          </div>
          <h3 className="font-semibold text-lg">Profit Calculator</h3>
        </div>

        {/* Platform Selector */}
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as any)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option value="shopify">Shopify</option>
          <option value="woocommerce">WooCommerce</option>
          <option value="etsy">Etsy</option>
        </select>
      </div>

      {/* Price Input */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Selling Price
        </label>
        <div className="relative">
          <DollarSign
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="number"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg font-semibold text-lg"
            step="0.01"
          />
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="space-y-2 py-4 border-t border-b border-slate-200">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Product Cost</span>
          <span className="font-medium">${supplierPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Platform Fees</span>
          <span className="font-medium">${profitData.costBreakdown.fees.platformFees.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Payment Processing</span>
          <span className="font-medium">${profitData.costBreakdown.fees.paymentProcessing.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Shipping</span>
          <span className="font-medium">${profitData.costBreakdown.fees.shipping.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Taxes (Est.)</span>
          <span className="font-medium">${profitData.costBreakdown.fees.taxes.toFixed(2)}</span>
        </div>
      </div>

      {/* Net Profit */}
      <div className={`p-4 rounded-lg ${
        isHealthyMargin ? 'bg-green-50 border border-green-200' :
        isLowMargin ? 'bg-red-50 border border-red-200' :
        'bg-blue-50 border border-blue-200'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Net Profit</span>
          {isHealthyMargin ? (
            <TrendingUp className="text-green-600" size={20} />
          ) : isLowMargin ? (
            <TrendingDown className="text-red-600" size={20} />
          ) : (
            <CheckCircle className="text-blue-600" size={20} />
          )}
        </div>
        <div className="flex items-baseline justify-between">
          <div>
            <div className={`text-2xl font-bold ${
              isHealthyMargin ? 'text-green-600' :
              isLowMargin ? 'text-red-600' :
              'text-blue-600'
            }`}>
              ${profitData.netProfit.toFixed(2)}
            </div>
            <div className="text-sm text-slate-600">
              {profitData.profitMargin.toFixed(1)}% margin
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-600">ROI</div>
            <div className="text-lg font-semibold">
              {profitData.roi.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className={`flex gap-3 p-3 rounded-lg ${
        isLowMargin ? 'bg-yellow-50 border border-yellow-200' : 'bg-blue-50 border border-blue-200'
      }`}>
        <AlertCircle
          className={isLowMargin ? 'text-yellow-600' : 'text-blue-600'}
          size={20}
        />
        <div className="flex-1">
          <p className={`text-sm font-medium ${
            isLowMargin ? 'text-yellow-900' : 'text-blue-900'
          }`}>
            {profitData.recommendation}
          </p>
          {isLowMargin && (
            <p className="text-xs text-yellow-700 mt-1">
              Minimum price to break even: ${profitData.breakEvenPrice.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setSellingPrice(profitData.breakEvenPrice * 1.3)}
          className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition"
        >
          Set 30% Margin
        </button>
        <button
          onClick={() => setSellingPrice(profitData.breakEvenPrice * 1.5)}
          className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition"
        >
          Set 50% Margin
        </button>
      </div>

      {onPriceUpdate && sellingPrice !== currentPrice && (
        <button
          onClick={() => onPriceUpdate(sellingPrice)}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
        >
          Update Product Price
        </button>
      )}
    </div>
  );
}
```

**Add to Product Card:** `/src/components/ProductCard.tsx`
```typescript
// Add compact profit indicator to each product card
<div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
  <span className="text-xs text-slate-600">Profit</span>
  <div className="flex items-center gap-2">
    <span className="text-sm font-bold text-green-600">
      ${(product.price - product.supplierPrice - 8).toFixed(2)}
    </span>
    <span className="text-xs text-slate-500">
      ({(((product.price - product.supplierPrice - 8) / product.price) * 100).toFixed(0)}%)
    </span>
  </div>
</div>
```

### **Success Metrics**
- Show profit on 100% of products in feed
- Average profit margin increase: 15%
- 60% of users adjust prices based on calculator
- Reduce unprofitable product listings by 40%

---

## 🔥 Feature 1.5: Winning Product Detector with TikTok/FB Integration

### **Business Value**
- **Problem Solved:** Finding trending/viral products is manual and time-consuming
- **User Benefit:** AI-curated winning products daily
- **Monetization:** Premium feature - Pro users get 20 products/day, Free gets 5

### **Technical Architecture**

#### Phase 1: Data Collection APIs (Week 1-2)
**New Services:**

**File:** `/src/lib/trending/tiktok-scraper.ts`
```typescript
interface TikTokTrend {
  hashtag: string;
  videoCount: number;
  viewCount: number;
  growthRate: number; // % increase in last 24h
  relatedProducts: string[];
}

export async function getTikTokTrends(): Promise<TikTokTrend[]> {
  // Option 1: Use TikTok Creative Center API (official, free)
  // https://ads.tiktok.com/creative_radar_api/

  // Option 2: Scrape trending hashtags page
  const response = await fetch('https://ads.tiktok.com/business/creativecenter/trending-hashtags');

  // Parse trending hashtags related to products
  // Filter for e-commerce relevant tags (#tiktokmademebuyit, #amazonfinds, etc.)

  return [
    {
      hashtag: '#tiktokmademebuyit',
      videoCount: 15000,
      viewCount: 2500000000,
      growthRate: 35.2,
      relatedProducts: ['LED lights', 'phone accessories', 'kitchen gadgets']
    }
    // ... more trends
  ];
}

export async function searchTikTokProducts(query: string): Promise<any[]> {
  // Search TikTok for product-related content
  // Analyze video engagement (likes, comments, shares)
  // Extract product links from video descriptions

  const apiUrl = `https://www.tiktok.com/api/search/general/full/?keyword=${encodeURIComponent(query)}`;

  // Return products sorted by engagement
  return [];
}
```

**File:** `/src/lib/trending/google-trends.ts`
```typescript
import googleTrends from 'google-trends-api';

interface TrendingProduct {
  keyword: string;
  interest: number; // 0-100
  relatedQueries: string[];
  category: string;
}

export async function getGoogleTrendingProducts(
  category?: string
): Promise<TrendingProduct[]> {
  try {
    // Get real-time trending searches
    const trending = await googleTrends.realTimeTrends({
      geo: 'US',
      category: category || 'all'
    });

    const data = JSON.parse(trending);

    // Filter for shopping-related trends
    const shoppingTrends = data.storySummaries.featuredStoryIds
      .filter((id: string) => {
        const story = data.storySummaries.trendingStories.find((s: any) => s.id === id);
        return story?.entityNames?.some((name: string) =>
          name.toLowerCase().includes('buy') ||
          name.toLowerCase().includes('shop') ||
          name.toLowerCase().includes('deal')
        );
      });

    return shoppingTrends.map((story: any) => ({
      keyword: story.entityNames[0],
      interest: 100, // Real-time trends are max interest
      relatedQueries: story.relatedQueries || [],
      category: story.categories[0]
    }));
  } catch (error) {
    console.error('Google Trends error:', error);
    return [];
  }
}
```

**File:** `/src/lib/trending/aliexpress-api.ts`
```typescript
// Use AliExpress Affiliate API or scraping
export async function searchAliExpressProducts(query: string) {
  // Option 1: AliExpress Open API (requires affiliate account)
  // https://portals.aliexpress.com/affiportals/web/home.htm

  // Option 2: Scrape search results
  const searchUrl = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(query)}`;

  // Return products with:
  // - Price
  // - Orders (indicator of popularity)
  // - Rating
  // - Images

  return [];
}
```

#### Phase 2: Winning Product Scoring Algorithm (Week 2)
**File:** `/src/lib/trending/product-scorer.ts`

```typescript
interface ProductScore {
  productId: string;
  totalScore: number; // 0-100
  scores: {
    trendingScore: number;     // TikTok/Google Trends data
    demandScore: number;        // Search volume
    competitionScore: number;   // Number of sellers
    profitScore: number;        // Margin potential
    seasonalityScore: number;   // Time-sensitive
  };
  viralPotential: 'high' | 'medium' | 'low';
  reasoning: string[];
}

export async function scoreProduct(
  product: any,
  marketData: {
    tiktokMentions?: number;
    googleTrends?: number;
    competitorCount?: number;
    avgProfit?: number;
  }
): Promise<ProductScore> {

  // 1. Trending Score (30 points)
  const trendingScore = calculateTrendingScore(
    marketData.tiktokMentions || 0,
    marketData.googleTrends || 0
  );

  // 2. Demand Score (25 points)
  const demandScore = calculateDemandScore(product.supplierReviews || 0);

  // 3. Competition Score (20 points) - Lower competition = higher score
  const competitionScore = calculateCompetitionScore(
    marketData.competitorCount || 0
  );

  // 4. Profit Score (20 points)
  const profitScore = calculateProfitScore(
    product.price - (product.supplierPrice || 0)
  );

  // 5. Seasonality Score (5 points)
  const seasonalityScore = calculateSeasonalityScore(
    product.title,
    new Date()
  );

  const totalScore =
    trendingScore +
    demandScore +
    competitionScore +
    profitScore +
    seasonalityScore;

  const viralPotential =
    totalScore >= 80 ? 'high' :
    totalScore >= 60 ? 'medium' : 'low';

  const reasoning = generateReasoning({
    trendingScore,
    demandScore,
    competitionScore,
    profitScore,
    seasonalityScore
  });

  return {
    productId: product.id,
    totalScore,
    scores: {
      trendingScore,
      demandScore,
      competitionScore,
      profitScore,
      seasonalityScore
    },
    viralPotential,
    reasoning
  };
}

function calculateTrendingScore(tiktokMentions: number, googleTrends: number): number {
  // TikTok mentions weighted more (70%) than Google Trends (30%)
  const tiktokScore = Math.min((tiktokMentions / 10000) * 21, 21); // Max 21 points
  const googleScore = Math.min((googleTrends / 100) * 9, 9); // Max 9 points
  return tiktokScore + googleScore;
}

function calculateDemandScore(reviews: number): number {
  // More reviews = more demand
  if (reviews > 10000) return 25;
  if (reviews > 5000) return 20;
  if (reviews > 1000) return 15;
  if (reviews > 100) return 10;
  return 5;
}

function calculateCompetitionScore(competitors: number): number {
  // Inverse relationship - fewer competitors = higher score
  if (competitors < 10) return 20;
  if (competitors < 50) return 15;
  if (competitors < 200) return 10;
  if (competitors < 500) return 5;
  return 0;
}

function calculateProfitScore(margin: number): number {
  // Higher profit margin = higher score
  if (margin > 30) return 20;
  if (margin > 20) return 15;
  if (margin > 10) return 10;
  if (margin > 5) return 5;
  return 0;
}

function calculateSeasonalityScore(title: string, currentDate: Date): number {
  const month = currentDate.getMonth();
  const titleLower = title.toLowerCase();

  // Seasonal keywords
  const seasonal = {
    summer: [5, 6, 7], // Jun, Jul, Aug
    winter: [11, 0, 1], // Dec, Jan, Feb
    halloween: [9], // Oct
    christmas: [10, 11], // Nov, Dec
    valentine: [1] // Feb
  };

  for (const [keyword, months] of Object.entries(seasonal)) {
    if (titleLower.includes(keyword) && months.includes(month)) {
      return 5; // Perfect seasonal timing
    }
  }

  return 2; // Evergreen product
}

function generateReasoning(scores: any): string[] {
  const reasons: string[] = [];

  if (scores.trendingScore > 20) {
    reasons.push('🔥 Viral on TikTok/social media');
  }
  if (scores.demandScore > 20) {
    reasons.push('⭐ High customer demand (10k+ orders)');
  }
  if (scores.competitionScore > 15) {
    reasons.push('🎯 Low competition - untapped market');
  }
  if (scores.profitScore > 15) {
    reasons.push('💰 Excellent profit margins (>$20)');
  }
  if (scores.seasonalityScore === 5) {
    reasons.push('📅 Perfect timing - seasonal demand');
  }

  return reasons;
}
```

#### Phase 3: Daily Winning Products Cron Job (Week 3)
**File:** `/src/app/api/cron/discover-winners/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getTikTokTrends } from "@/lib/trending/tiktok-scraper";
import { getGoogleTrendingProducts } from "@/lib/trending/google-trends";
import { searchAliExpressProducts } from "@/lib/trending/aliexpress-api";
import { scoreProduct } from "@/lib/trending/product-scorer";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

// Called by Vercel Cron daily at 6am
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Starting daily winning product discovery...');

    // 1. Get trending topics from multiple sources
    const [tiktokTrends, googleTrends] = await Promise.all([
      getTikTokTrends(),
      getGoogleTrendingProducts('shopping')
    ]);

    // 2. Extract product keywords
    const keywords = [
      ...tiktokTrends.slice(0, 5).flatMap(t => t.relatedProducts),
      ...googleTrends.slice(0, 5).map(t => t.keyword)
    ];

    console.log(`📝 Found ${keywords.length} trending keywords`);

    // 3. Search AliExpress for each keyword
    const allProducts: any[] = [];
    for (const keyword of keywords) {
      const products = await searchAliExpressProducts(keyword);
      allProducts.push(...products);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`🛍️ Found ${allProducts.length} products`);

    // 4. Score each product
    const scoredProducts = await Promise.all(
      allProducts.map(async (product) => {
        const score = await scoreProduct(product, {
          tiktokMentions: product.tiktokMentions || 0,
          googleTrends: product.googleTrends || 0,
          competitorCount: product.competitorCount || 0,
          avgProfit: product.price * 2.5 - product.price // Estimate
        });

        return { ...product, score };
      })
    );

    // 5. Filter for high-potential winners (score > 70)
    const winners = scoredProducts
      .filter(p => p.score.totalScore >= 70)
      .sort((a, b) => b.score.totalScore - a.score.totalScore)
      .slice(0, 50); // Top 50 winners

    console.log(`🏆 Identified ${winners.length} winning products`);

    // 6. Save to database with special flag
    for (const winner of winners) {
      await db.product.upsert({
        where: { sourceUrl: winner.url },
        create: {
          title: winner.title,
          price: winner.suggestedPrice,
          imageUrl: winner.image,
          sourceUrl: winner.url,
          supplierUrl: winner.url,
          supplierPrice: winner.price,
          supplierRating: winner.rating,
          supplierReviews: winner.orders,
          tags: ['winning-product', ...winner.tags],
          aesthetic: '🔥 Trending',
          viralScore: winner.score.totalScore,
          viralPotential: winner.score.viralPotential,
          viralReasons: winner.score.reasoning,
          lastSourced: new Date()
        },
        update: {
          viralScore: winner.score.totalScore,
          viralPotential: winner.score.viralPotential,
          viralReasons: winner.score.reasoning,
          lastSourced: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      winnersFound: winners.length,
      topScore: winners[0]?.score.totalScore || 0
    });

  } catch (error: any) {
    console.error('Winning product discovery failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Update `schema.prisma`:**
```prisma
model Product {
  // ... existing fields ...

  // Viral/Trending fields
  viralScore        Float?     // 0-100 score
  viralPotential    String?    // 'high' | 'medium' | 'low'
  viralReasons      String[]   // Array of reasons why it's a winner
  trendingSource    String?    // 'tiktok' | 'google' | 'facebook'
  lastTrendCheck    DateTime?
}
```

#### Phase 4: UI Components (Week 3)

**File:** `/src/app/dashboard/winning-products/page.tsx`
```typescript
import { db } from "@/lib/db";
import { Flame, TrendingUp, Target } from "lucide-react";
import WinningProductCard from "@/components/WinningProductCard";

export const dynamic = 'force-dynamic';

export default async function WinningProductsPage() {
  // Get products with high viral scores
  const winningProducts = await db.product.findMany({
    where: {
      viralScore: { gte: 70 }
    },
    orderBy: { viralScore: 'desc' },
    take: 50
  });

  const todayWinners = winningProducts.filter(p => {
    const lastCheck = new Date(p.lastTrendCheck || 0);
    const today = new Date();
    return lastCheck.toDateString() === today.toDateString();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Flame size={32} />
          <h1 className="text-3xl font-bold">Winning Products</h1>
        </div>
        <p className="text-orange-100 mb-6">
          AI-curated viral products from TikTok, Instagram, and market trends.
          Updated daily at 6 AM.
        </p>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="text-2xl font-bold">{todayWinners.length}</div>
            <div className="text-sm text-orange-100">New Today</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="text-2xl font-bold">{winningProducts.length}</div>
            <div className="text-sm text-orange-100">Total Winners</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="text-2xl font-bold">
              {(winningProducts.reduce((sum, p) => sum + (p.viralScore || 0), 0) / winningProducts.length).toFixed(0)}
            </div>
            <div className="text-sm text-orange-100">Avg Score</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <button className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium">
          All Winners
        </button>
        <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-medium hover:bg-slate-50">
          High Potential (80+)
        </button>
        <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-medium hover:bg-slate-50">
          Medium Potential (70-79)
        </button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {winningProducts.map((product) => (
          <WinningProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
```

**File:** `/src/components/WinningProductCard.tsx`
```typescript
"use client";
import { useState } from "react";
import { Flame, TrendingUp, DollarSign, Star, ShoppingCart } from "lucide-react";
import Image from "next/image";

export default function WinningProductCard({ product }: { product: any }) {
  const [importing, setImporting] = useState(false);

  const handleQuickImport = async () => {
    setImporting(true);
    try {
      const res = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: product.title,
          price: product.price,
          images: [product.imageUrl],
          description: product.originalDesc || '',
          supplierUrl: product.supplierUrl,
          supplierPrice: product.supplierPrice,
          source: 'aliexpress'
        })
      });

      if (res.ok) {
        alert('Product imported successfully!');
      } else {
        alert('Failed to import product');
      }
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setImporting(false);
    }
  };

  const scoreColor =
    product.viralScore >= 90 ? 'text-red-600' :
    product.viralScore >= 80 ? 'text-orange-600' :
    'text-yellow-600';

  const potentialBadge =
    product.viralPotential === 'high' ? 'bg-red-100 text-red-700 border-red-200' :
    product.viralPotential === 'medium' ? 'bg-orange-100 text-orange-700 border-orange-200' :
    'bg-yellow-100 text-yellow-700 border-yellow-200';

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition group">
      {/* Image */}
      <div className="relative aspect-square bg-slate-100">
        <Image
          src={product.imageUrl}
          alt={product.title}
          fill
          className="object-cover"
        />

        {/* Viral Score Badge */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur rounded-lg px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2">
            <Flame className={scoreColor} size={20} />
            <span className={`text-xl font-bold ${scoreColor}`}>
              {product.viralScore}
            </span>
          </div>
        </div>

        {/* Potential Badge */}
        <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold border ${potentialBadge}`}>
          {product.viralPotential?.toUpperCase()} POTENTIAL
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-sm line-clamp-2 min-h-[40px]">
          {product.title}
        </h3>

        {/* Reasons */}
        <div className="space-y-1">
          {product.viralReasons?.slice(0, 3).map((reason: string, i: number) => (
            <div key={i} className="text-xs text-slate-600 flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>{reason}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-green-600" />
            <div>
              <div className="text-xs text-slate-500">Profit</div>
              <div className="font-semibold text-sm">
                ${(product.price - product.supplierPrice).toFixed(0)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Star size={16} className="text-yellow-500" />
            <div>
              <div className="text-xs text-slate-500">Rating</div>
              <div className="font-semibold text-sm">
                {product.supplierRating?.toFixed(1) || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={handleQuickImport}
          disabled={importing}
          className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <ShoppingCart size={18} />
          {importing ? 'Importing...' : 'Quick Import'}
        </button>
      </div>
    </div>
  );
}
```

**Add to Dashboard Navigation:**
```typescript
// In /src/app/dashboard/layout.tsx
<SidebarItem
  href="/dashboard/winning-products"
  icon={<Flame size={20} />}
  label="Winning Products"
/>
```

### **Vercel Cron Configuration**
**File:** `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/discover-winners",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/refresh-credits",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### **Success Metrics**
- Discover 50+ winning products daily
- Average viral score: 75+
- User engagement: 40% import at least 1 winning product/week
- Conversion: 25% of imported winners get published to stores

---

## 📊 Overall Implementation Timeline

**Week 1:**
- Database schema updates for all features
- Profit Calculator API + UI
- Basic product scoring algorithm

**Week 2:**
- Chrome Extension development (Phase 1)
- Product Import API
- TikTok/Google Trends integration

**Week 3:**
- Winning Product Detector cron job
- Winning Products page UI
- Chrome Extension content scripts

**Week 4:**
- Testing & bug fixes
- User onboarding flows
- Analytics tracking
- Production deployment

**Week 5:**
- User feedback collection
- Performance optimization
- Documentation
- Marketing launch

---

## 🎯 Success Metrics (Combined)

**User Engagement:**
- 70% of users use Profit Calculator within first week
- 50% import at least 1 product via Chrome Extension
- 40% check Winning Products page daily

**Business Metrics:**
- Free-to-Pro conversion rate: 15% (up from baseline)
- Average products imported per user: 25/month
- User retention (30-day): 60%

**Product Metrics:**
- Average import time: <30 seconds (vs 10-20 min manual)
- Profit margin improvement: +15% average
- Winning product success rate: 30% get published

---

## 💰 Monetization Impact

**Free Plan Limitations:**
- 10 product imports/day
- 5 winning products shown/day
- Basic profit calculator

**Pro Plan Benefits ($29/month):**
- Unlimited imports
- 50 winning products/day
- Advanced profit analytics
- Competitor price tracking
- Priority API access

**Projected Revenue:**
- Month 1: 100 users → 15 Pro conversions = $435/month
- Month 3: 500 users → 75 Pro conversions = $2,175/month
- Month 6: 2000 users → 300 Pro conversions = $8,700/month

---

Would you like me to start implementing any of these features? I recommend starting with the **Profit Calculator** (easiest, immediate value) while you work on getting the Chrome Extension approved for the Product Importer.
