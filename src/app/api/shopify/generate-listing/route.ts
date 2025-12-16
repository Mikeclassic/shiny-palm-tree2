import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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

    const { productData, suggestedPrice } = await req.json();

    if (!productData) {
      return NextResponse.json({ error: "Product data is required" }, { status: 400 });
    }

    console.log('[Shopify Listing] Generating listing for:', productData.title);

    // Generate formatted listing description
    const listingDescription = generateFormattedDescription(productData);

    // Generate listing title (optimized for SEO)
    const listingTitle = generateOptimizedTitle(productData);

    // Format variants for Shopify
    const formattedVariants = formatVariants(productData.variants);

    // Calculate profit margins
    const supplierPrice = productData.price;
    const sellPrice = suggestedPrice || (supplierPrice * 2.5);
    const shippingCost = productData.shipping?.cost || 0;
    const platformFees = sellPrice * 0.088 + 7.1; // 8.8% + $7.10
    const profit = sellPrice - supplierPrice - shippingCost - platformFees;
    const profitMargin = (profit / sellPrice) * 100;

    // Create product listing in database
    const listing = await db.product.create({
      data: {
        title: listingTitle,
        price: sellPrice,
        imageUrl: productData.images[0] || '',
        sourceUrl: productData.sourceUrl,
        originalDesc: productData.description,
        generatedDesc: listingDescription, // Use generatedDesc for the formatted listing
        supplierUrl: productData.sourceUrl,
        supplierPrice: supplierPrice,
        supplierRating: productData.rating,
        supplierReviews: productData.reviewCount,
        shippingTime: productData.shipping?.time || 'Unknown',
        importSource: 'aliexpress-rapidapi',
        lastSourced: new Date(),
        estimatedProfit: Number(profit.toFixed(2)),
        profitMarginPct: Number(profitMargin.toFixed(1)),
        productType: 'Imported',
        tags: generateTags(productData),
        vendor: 'AliExpress',
        // Leave publishedAt as null to indicate it's a draft
        publishedAt: null
      }
    });

    console.log('[Shopify Listing] Created product listing:', listing.id);

    // Prepare Shopify-formatted data
    const shopifyListing = {
      title: listingTitle,
      description: listingDescription,
      price: sellPrice.toFixed(2),
      compareAtPrice: (sellPrice * 1.4).toFixed(2), // Show 40% discount
      images: productData.images,
      variants: formattedVariants,
      tags: generateTags(productData),
      vendor: 'AliExpress',
      productType: 'Imported Product',
      metafields: {
        supplierPrice: supplierPrice.toFixed(2),
        estimatedProfit: profit.toFixed(2),
        profitMargin: profitMargin.toFixed(1),
        rating: productData.rating,
        reviewCount: productData.reviewCount,
        shippingTime: productData.shipping?.time
      }
    };

    return NextResponse.json({
      success: true,
      listing: shopifyListing,
      productId: listing.id,
      profitAnalysis: {
        supplierCost: supplierPrice,
        sellingPrice: sellPrice,
        shippingCost,
        platformFees,
        estimatedProfit: profit,
        profitMargin
      }
    });

  } catch (error: any) {
    console.error('[Shopify Listing] Error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to generate listing'
    }, { status: 500 });
  }
}

/**
 * Generate formatted description for Shopify
 */
function generateFormattedDescription(productData: any): string {
  const sections = [];

  // Product highlights
  sections.push('✨ **PRODUCT HIGHLIGHTS** ✨\n');
  sections.push(`⭐ Rated ${productData.rating}/5.0 with ${productData.reviewCount.toLocaleString()} verified reviews`);
  sections.push(`🚚 Ships within ${productData.shipping?.time || '15-30'} days`);
  sections.push(`💰 Premium quality at an affordable price`);
  sections.push(`✅ 100% Authentic Product\n`);

  // Description
  if (productData.description) {
    sections.push('📝 **DESCRIPTION**\n');
    sections.push(productData.description.substring(0, 800));
    sections.push('\n');
  }

  // Shipping info
  sections.push('🚚 **SHIPPING INFORMATION**\n');
  sections.push(`Delivery Time: ${productData.shipping?.time || '15-30'} days`);
  sections.push(`Shipping Cost: ${productData.shipping?.cost > 0 ? `$${productData.shipping.cost.toFixed(2)}` : 'FREE'}`);
  sections.push(`Tracking: Full tracking provided\n`);

  // Variants
  if (productData.variants && productData.variants.length > 0) {
    sections.push('🎨 **AVAILABLE OPTIONS**\n');
    productData.variants.forEach((variant: any) => {
      sections.push(`• ${variant.name || 'Variant'}: Multiple options available`);
    });
    sections.push('\n');
  }

  // Guarantee
  sections.push('✅ **OUR GUARANTEE**\n');
  sections.push('• Fast and reliable shipping');
  sections.push('• Quality checked before dispatch');
  sections.push('• Responsive customer support');
  sections.push('• Secure payment processing');

  return sections.join('\n');
}

/**
 * Generate optimized title for SEO
 */
function generateOptimizedTitle(productData: any): string {
  let title = productData.title;

  // Limit to 70 characters for SEO
  if (title.length > 70) {
    title = title.substring(0, 67) + '...';
  }

  // Add key features if space allows
  if (title.length < 50 && productData.rating >= 4.5) {
    title += ' ⭐ Top Rated';
  }

  return title;
}

/**
 * Format variants for Shopify
 */
function formatVariants(variants: any[]): any[] {
  if (!variants || variants.length === 0) {
    return [{
      option1: 'Default',
      price: 0,
      sku: 'DEFAULT',
      inventory_quantity: 100
    }];
  }

  // Format variants based on available options
  const formattedVariants: any[] = [];

  variants.forEach((variant, index) => {
    formattedVariants.push({
      option1: variant.name || `Option ${index + 1}`,
      option2: variant.value || '',
      price: variant.price || 0,
      sku: variant.sku || `VAR-${index + 1}`,
      inventory_quantity: 100,
      weight: 0,
      weight_unit: 'lb'
    });
  });

  return formattedVariants;
}

/**
 * Generate product tags
 */
function generateTags(productData: any): string[] {
  const tags = ['Imported', 'AliExpress', 'Trending'];

  // Add rating-based tags
  if (productData.rating >= 4.5) {
    tags.push('Top Rated', 'Best Seller');
  }

  // Add review-based tags
  if (productData.reviewCount >= 1000) {
    tags.push('Popular', 'High Demand');
  }

  // Add shipping tags
  if (productData.shipping?.cost === 0) {
    tags.push('Free Shipping');
  }

  return tags;
}
