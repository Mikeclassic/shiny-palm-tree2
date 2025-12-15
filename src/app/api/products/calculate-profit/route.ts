import { NextRequest, NextResponse } from "next/server";

interface ProfitCalculation {
  supplierPrice: number;
  sellingPrice: number;
  platform?: 'shopify' | 'woocommerce' | 'etsy';
  shippingMethod?: 'standard' | 'express';
}

interface FeesBreakdown {
  platformFees: number;
  paymentProcessing: number;
  shipping: number;
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
  recommendationType: 'success' | 'warning' | 'error';
}

export async function POST(req: NextRequest) {
  try {
    const data: ProfitCalculation = await req.json();

    if (!data.sellingPrice || !data.supplierPrice) {
      return NextResponse.json(
        { error: "Missing required fields: sellingPrice and supplierPrice" },
        { status: 400 }
      );
    }

    const platform = data.platform || 'shopify';
    const shippingMethod = data.shippingMethod || 'standard';

    const fees = calculateFees(data.sellingPrice, platform, shippingMethod);
    const totalCosts = data.supplierPrice + fees.total;
    const netProfit = data.sellingPrice - totalCosts;
    const profitMargin = (netProfit / data.sellingPrice) * 100;
    const roi = (netProfit / totalCosts) * 100;

    // Calculate minimum price to break even (covering all costs)
    const breakEvenPrice = totalCosts * 1.05; // Add 5% buffer

    // Generate recommendation
    let recommendation = '';
    let recommendationType: 'success' | 'warning' | 'error' = 'success';

    if (profitMargin < 15) {
      recommendation = '⚠️ Low profit margin - Consider increasing price or finding cheaper supplier';
      recommendationType = 'error';
    } else if (profitMargin < 30) {
      recommendation = '💡 Fair margin - Room for improvement with better pricing';
      recommendationType = 'warning';
    } else if (profitMargin > 60) {
      recommendation = '🚀 Excellent margin - Competitive advantage!';
      recommendationType = 'success';
    } else {
      recommendation = '✅ Healthy profit margin - Good positioning';
      recommendationType = 'success';
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
      recommendation,
      recommendationType
    };

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Profit calculation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function calculateFees(
  sellingPrice: number,
  platform: string,
  shippingMethod: string
): FeesBreakdown {
  // Platform-specific fee structures
  const platformFees: Record<string, { transactionPct: number; transactionFixed: number }> = {
    shopify: {
      transactionPct: 0.029,  // 2.9%
      transactionFixed: 0.30,
    },
    woocommerce: {
      transactionPct: 0.029,  // Stripe/PayPal
      transactionFixed: 0.30,
    },
    etsy: {
      transactionPct: 0.065,  // 6.5% transaction fee
      transactionFixed: 0.20,
    }
  };

  const platformConfig = platformFees[platform] || platformFees.shopify;
  const platformFee = (sellingPrice * platformConfig.transactionPct) +
                       platformConfig.transactionFixed;

  // Payment processing (typically same across platforms)
  const paymentProcessing = sellingPrice * 0.029 + 0.30;

  // Shipping cost estimation
  const shippingCosts: Record<string, number> = {
    standard: 6.5,   // Average US standard shipping
    express: 15.0    // Average US express shipping
  };

  const shipping = shippingCosts[shippingMethod] || shippingCosts.standard;

  return {
    platformFees: Number(platformFee.toFixed(2)),
    paymentProcessing: Number(paymentProcessing.toFixed(2)),
    shipping: Number(shipping.toFixed(2)),
    total: Number((platformFee + paymentProcessing + shipping).toFixed(2))
  };
}
