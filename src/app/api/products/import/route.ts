import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

interface ImportProductRequest {
  title: string;
  price?: number;
  images: string[];
  description?: string;
  supplierUrl: string;
  supplierPrice: number;
  shippingTime?: string;
  rating?: number;
  reviewCount?: number;
  source: 'aliexpress' | 'amazon' | 'temu' | 'manual';
  productType?: string;
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
          importSource: { not: null }
        }
      });

      if (importCount >= 10) {
        return NextResponse.json({
          error: "Daily import limit reached (10/day). Upgrade to Pro for unlimited imports."
        }, { status: 403 });
      }
    }

    const body: ImportProductRequest = await req.json();

    console.log('[Import API] Received import request:', {
      title: body.title,
      images: body.images,
      imagesCount: body.images?.length,
      description: body.description?.substring(0, 100),
      supplierUrl: body.supplierUrl
    });

    // Validate required fields
    if (!body.title || !body.supplierUrl || !body.supplierPrice) {
      return NextResponse.json({
        error: "Missing required fields: title, supplierUrl, supplierPrice"
      }, { status: 400 });
    }

    // Calculate suggested markup (2-3x for typical dropshipping)
    const suggestedPrice = body.price || calculateSuggestedPrice(body.supplierPrice, body.source);

    // Calculate estimated profit
    const estimatedFees = suggestedPrice * 0.088 + 7.1; // ~8.8% fees + $7.10 shipping
    const estimatedProfit = suggestedPrice - body.supplierPrice - estimatedFees;
    const profitMarginPct = (estimatedProfit / suggestedPrice) * 100;

    // Check if product already exists
    const existingProduct = await db.product.findUnique({
      where: { sourceUrl: body.supplierUrl }
    });

    if (existingProduct) {
      return NextResponse.json({
        error: "Product already imported",
        product: existingProduct
      }, { status: 409 });
    }

    // Create product
    const imageUrl = body.images && body.images.length > 0 ? body.images[0] : '';
    console.log('[Import API] Creating product with imageUrl:', imageUrl);
    console.log('[Import API] Description:', body.description);

    const product = await db.product.create({
      data: {
        title: body.title,
        price: suggestedPrice,
        imageUrl: imageUrl,
        sourceUrl: body.supplierUrl, // Using supplierUrl for uniqueness (sourceUrl is @unique in schema)
        originalDesc: body.description || '',
        supplierUrl: body.supplierUrl,
        supplierPrice: body.supplierPrice,
        supplierRating: body.rating,
        supplierReviews: body.reviewCount,
        shippingTime: body.shippingTime,
        importSource: body.source,
        lastSourced: new Date(),
        estimatedProfit: Number(estimatedProfit.toFixed(2)),
        profitMarginPct: Number(profitMarginPct.toFixed(1)),
        productType: body.productType,
        tags: [],
      }
    });

    console.log('[Import API] Product created with ID:', product.id);
    console.log('[Import API] Product imageUrl saved as:', product.imageUrl);

    return NextResponse.json({
      success: true,
      product,
      suggestedPrice,
      profitMargin: Number(estimatedProfit.toFixed(2)),
      profitMarginPct: Number(profitMarginPct.toFixed(1))
    });

  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function calculateSuggestedPrice(supplierPrice: number, source: string): number {
  // Different markup strategies per platform
  const markupMultipliers: Record<string, number> = {
    aliexpress: 2.5,  // 2.5x markup
    amazon: 1.8,      // Lower markup (higher base price)
    temu: 3.0,        // Higher markup (very low base price)
    manual: 2.5       // Default 2.5x
  };

  const basePrice = supplierPrice * (markupMultipliers[source] || 2.5);

  // Psychological pricing: round to .99 or .95
  if (basePrice < 20) return Math.floor(basePrice) + 0.99;
  if (basePrice < 50) return Math.floor(basePrice / 5) * 5 + 4.99;
  return Math.floor(basePrice / 10) * 10 + 9.99;
}
