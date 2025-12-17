import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const publishSchema = z.object({
  productId: z.string().min(1).optional(),
  storeId: z.string().min(1),
  productData: z.any().optional(),
  suggestedPrice: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validationResult = publishSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { productId, storeId, productData, suggestedPrice } = validationResult.data;

    let product: any;

    // If productData is provided (from RapidAPI import), create product first
    if (productData) {
      const priceToUse = suggestedPrice || productData.price;

      // Create product in database
      product = await db.product.create({
        data: {
          title: productData.title,
          price: priceToUse,
          imageUrl: productData.images[0] || '',
          sourceUrl: productData.sourceUrl,
          originalDesc: productData.description,
          supplierUrl: productData.sourceUrl,
          supplierPrice: productData.price,
          supplierRating: productData.rating,
          supplierReviews: productData.reviewCount,
          shippingTime: productData.shipping?.time || 'Unknown',
          importSource: 'aliexpress-rapidapi',
          lastSourced: new Date(),
          productType: 'Imported',
          tags: [],
          vendor: 'AliExpress',
          publishedAt: new Date(), // Mark as published
        }
      });

      // Attach additional data for Shopify publishing
      product.descriptionImages = productData.descriptionImages || [];
      product.reviews = productData.reviews || [];
      product.images = productData.images || [];
    } else if (productId) {
      // Get existing product
      product = await db.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
    } else {
      return NextResponse.json({ error: "Either productId or productData is required" }, { status: 400 });
    }

    // Get store
    const store = await db.store.findFirst({
      where: {
        id: storeId,
        user: { email: session.user.email },
        isActive: true,
      },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found or inactive" }, { status: 404 });
    }

    // Check if already published (only if product exists)
    if (product.id) {
      const existingPublish = await db.publishedProduct.findUnique({
        where: {
          productId_storeId: {
            productId: product.id,
            storeId,
          },
        },
      });

      if (existingPublish) {
        return NextResponse.json({ error: "Product already published to this store" }, { status: 400 });
      }
    }

    // Publish based on platform
    let result;
    if (store.platform === "shopify") {
      result = await publishToShopify(product, store);
    } else if (store.platform === "woocommerce") {
      result = await publishToWooCommerce(product, store);
    } else {
      return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
    }

    // Save published product
    await db.publishedProduct.create({
      data: {
        productId: product.id,
        storeId: store.id,
        externalId: result.externalId,
        externalUrl: result.externalUrl,
      },
    });

    return NextResponse.json({
      success: true,
      externalUrl: result.externalUrl,
      message: `Product published to ${store.storeName}`,
    });
  } catch (error: any) {
    console.error("Publish error:", error);
    return NextResponse.json({ error: error.message || "Failed to publish product" }, { status: 500 });
  }
}

async function publishToShopify(product: any, store: any) {
  // Build description with text + description images + reviews
  let descriptionHtml = '';

  // Add main description text
  const description = product.generatedDesc || product.originalDesc || "";
  if (description) {
    const textHtml = description.includes('<')
      ? description
      : description
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
          .map((line: string) => `<p>${line}</p>`)
          .join('');
    descriptionHtml += textHtml;
  }

  // Add description images if available (stored in product metadata)
  if (product.descriptionImages && Array.isArray(product.descriptionImages)) {
    descriptionHtml += '<div style="margin-top: 30px;"><h3 style="font-size: 20px; font-weight: bold; margin-bottom: 15px;">Product Details</h3>';
    product.descriptionImages.forEach((img: string) => {
      descriptionHtml += `<img src="${img}" style="width: 100%; max-width: 800px; margin-bottom: 15px;" />`;
    });
    descriptionHtml += '</div>';
  }

  // Add customer reviews if available - INCLUDE ALL REVIEWS
  if (product.reviews && Array.isArray(product.reviews) && product.reviews.length > 0) {
    descriptionHtml += '<div style="margin-top: 40px; border-top: 2px solid #e5e7eb; padding-top: 30px;"><h3 style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">Customer Reviews</h3>';

    // Add review statistics bar if available
    if (product.reviewStats) {
      const stats = product.reviewStats;
      descriptionHtml += `
        <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 48px; font-weight: bold; color: #f59e0b;">${stats.evarageStar || stats.averageStar || 0}</div>
            <div style="color: #6b7280; font-size: 14px;">out of 5 stars</div>
            <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">${product.reviews.length} total reviews</div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;">
            <div style="background: #dcfce7; border: 1px solid #86efac; padding: 10px; border-radius: 8px; text-align: center;">
              <div style="font-size: 20px; font-weight: bold; color: #16a34a;">${stats.fiveStarRate || 0}%</div>
              <div style="font-size: 11px; color: #6b7280;">5⭐ (${stats.fiveStarNum || 0})</div>
            </div>
            <div style="background: #dbeafe; border: 1px solid #93c5fd; padding: 10px; border-radius: 8px; text-align: center;">
              <div style="font-size: 20px; font-weight: bold; color: #2563eb;">${stats.fourStarRate || 0}%</div>
              <div style="font-size: 11px; color: #6b7280;">4⭐ (${stats.fourStarNum || 0})</div>
            </div>
            <div style="background: #fef3c7; border: 1px solid #fde047; padding: 10px; border-radius: 8px; text-align: center;">
              <div style="font-size: 20px; font-weight: bold; color: #ca8a04;">${stats.threeStarRate || 0}%</div>
              <div style="font-size: 11px; color: #6b7280;">3⭐ (${stats.threeStarNum || 0})</div>
            </div>
            <div style="background: #fed7aa; border: 1px solid #fdba74; padding: 10px; border-radius: 8px; text-align: center;">
              <div style="font-size: 20px; font-weight: bold; color: #ea580c;">${stats.twoStarRate || 0}%</div>
              <div style="font-size: 11px; color: #6b7280;">2⭐ (${stats.twoStarNum || 0})</div>
            </div>
            <div style="background: #fecaca; border: 1px solid #fca5a5; padding: 10px; border-radius: 8px; text-align: center;">
              <div style="font-size: 20px; font-weight: bold; color: #dc2626;">${stats.oneStarRate || 0}%</div>
              <div style="font-size: 11px; color: #6b7280;">1⭐ (${stats.oneStarNum || 0})</div>
            </div>
          </div>
        </div>
      `;
    }

    // Filter reviews to only show 3+ stars
    const filteredReviews = product.reviews.filter((review: any) => {
      const stars = review.review?.reviewStarts || 0;
      return stars >= 3;
    });

    // Collect all review images from filtered reviews
    const allReviewImages: string[] = [];
    filteredReviews.forEach((review: any) => {
      if (review.review?.reviewImages && Array.isArray(review.review.reviewImages)) {
        allReviewImages.push(...review.review.reviewImages);
      }
    });

    // Add featured review images section if there are images
    if (allReviewImages.length > 0) {
      descriptionHtml += `
        <div style="margin-bottom: 30px;">
          <h4 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #374151;">Customer Photos</h4>
          <div style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 10px;">
      `;

      allReviewImages.slice(0, 30).forEach((img: string) => {
        descriptionHtml += `
          <img src="${img}"
               style="width: 150px; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid #e5e7eb; flex-shrink: 0;" />
        `;
      });

      descriptionHtml += `
          </div>
          ${allReviewImages.length > 30 ? `<p style="color: #6b7280; font-size: 13px; margin-top: 10px;">+${allReviewImages.length - 30} more customer photos</p>` : ''}
        </div>
      `;
    }

    // Add average rating display
    const averageRating = product.reviewStats?.evarageStar || product.reviewStats?.averageStar || 0;
    const totalRatings = product.reviews.length;
    const stars = '⭐'.repeat(Math.round(averageRating));

    descriptionHtml += `
      <div style="margin-bottom: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; text-align: center;">
        <span style="font-size: 20px; font-weight: bold; color: #374151;">${averageRating}</span>
        <span style="font-size: 18px; margin: 0 8px;">${stars}</span>
        <span style="font-size: 16px; color: #6b7280;">${totalRatings} ratings</span>
      </div>
    `;

    descriptionHtml += `<div style="color: #6b7280; font-size: 14px; margin-bottom: 15px;">Showing ${filteredReviews.length} reviews (3+ stars)</div>`;

    // Add filtered reviews (3+ stars only)
    filteredReviews.forEach((review: any, index: number) => {
      const stars = '⭐'.repeat(review.review?.reviewStarts || 0);
      const reviewContent = review.review?.translation?.reviewContent || review.review?.reviewContent || '';
      let buyerName = review.buyer?.buyerTitle || 'Anonymous';
      // Replace "AliExpress Shopper" with "Anonymous Shopper"
      if (buyerName.toLowerCase().includes('aliexpress shopper')) {
        buyerName = 'Anonymous Shopper';
      }
      const buyerCountry = review.buyer?.buyerCountry || '';
      const reviewDate = review.review?.reviewDate || '';
      const buyerImage = review.buyer?.buyerImage || '';

      descriptionHtml += `
        <div style="border: 1px solid #e5e7eb; padding: 20px; margin-bottom: 15px; border-radius: 8px; background: #f9fafb;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
            <div style="display: flex; gap: 12px; align-items: center;">
              ${buyerImage ? `<img src="${buyerImage}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" />` : ''}
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <strong style="font-size: 16px;">${buyerName}</strong>
                  ${buyerCountry ? `<img src="https://flagcdn.com/w20/${buyerCountry.toLowerCase()}.png" style="width: 20px; height: 15px; object-fit: cover; border-radius: 2px;" onerror="this.style.display='none'" />` : ''}
                </div>
                <p style="color: #6b7280; font-size: 13px; margin: 5px 0 0 0;">${buyerCountry} • ${reviewDate}</p>
              </div>
            </div>
            <span style="font-size: 18px;">${stars}</span>
          </div>
          <p style="color: #374151; line-height: 1.6; margin: 10px 0;">${reviewContent}</p>
      `;

      // Add review images if available
      if (review.review?.reviewImages && review.review.reviewImages.length > 0) {
        descriptionHtml += '<div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;">';
        review.review.reviewImages.forEach((img: string) => {
          descriptionHtml += `<img src="${img}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 4px;" />`;
        });
        descriptionHtml += '</div>';
      }

      // Add variant info if available
      if (review.review?.itemSpecInfo) {
        descriptionHtml += `<p style="color: #6b7280; font-size: 12px; margin-top: 10px;"><strong>Variant:</strong> ${review.review.itemSpecInfo}</p>`;
      }

      descriptionHtml += '</div>';
    });

    descriptionHtml += '</div>';
  }

  // Build complete product images array (all main images + description images)
  const allImages: any[] = [];

  // Add all main product images
  if (product.images && Array.isArray(product.images)) {
    product.images.forEach((img: string) => {
      allImages.push({ src: img });
    });
  } else if (product.generatedImage || product.imageUrl) {
    // Fallback to single image
    allImages.push({ src: product.generatedImage || product.imageUrl });
  }

  // Add description images (limit to first 10 to avoid too many images)
  if (product.descriptionImages && Array.isArray(product.descriptionImages)) {
    product.descriptionImages.slice(0, 10).forEach((img: string) => {
      allImages.push({ src: img });
    });
  }

  // Build Shopify variants from AliExpress variant data
  let shopifyVariants: any[] = [];
  let shopifyOptions: any[] = [];

  if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
    // Extract variant types (e.g., Color, Size) - limit to 3 options (Shopify max)
    const validVariants = product.variants.filter((v: any) => v.values && v.values.length > 0).slice(0, 3);

    validVariants.forEach((variant: any, idx: number) => {
      shopifyOptions.push({
        name: variant.name || `Option ${idx + 1}`,
        values: variant.values.slice(0, 100).map((v: any) => v.name) // Shopify limit is 100 values per option
      });
    });

    // Generate all variant combinations
    if (shopifyOptions.length > 0) {
      const generateCombinations = (options: any[], index: number = 0, current: any = {}): any[] => {
        if (index === options.length) {
          return [current];
        }

        const results: any[] = [];
        const optionIndex = index + 1; // option1, option2, option3

        validVariants[index].values.slice(0, 100).forEach((value: any) => {
          const combination = {
            ...current,
            [`option${optionIndex}`]: value.name,
          };

          // Add image if this is the first option and it has an image
          if (index === 0 && value.image) {
            const imageUrl = value.image.startsWith('//') ? `https:${value.image}` : value.image;
            combination.image_src = imageUrl;
          }

          results.push(...generateCombinations(options, index + 1, combination));
        });

        return results;
      };

      shopifyVariants = generateCombinations(shopifyOptions).map((combo) => ({
        ...combo,
        price: product.price.toString(),
        inventory_management: null,
        inventory_quantity: 100,
        inventory_policy: 'deny',
      }));

      // Limit to 100 variants (Shopify max)
      shopifyVariants = shopifyVariants.slice(0, 100);
    }
  }

  // If no variants created, add default variant
  if (shopifyVariants.length === 0) {
    shopifyVariants.push({
      price: product.price.toString(),
      inventory_management: null,
      inventory_quantity: 100,
      inventory_policy: 'deny',
    });
  }

  const shopifyProduct = {
    product: {
      title: product.title,
      body_html: descriptionHtml,
      vendor: product.vendor || "ClearSeller",
      product_type: product.productType || "General",
      tags: product.tags?.join(", ") || "",
      images: allImages.length > 0 ? allImages : undefined,
      options: shopifyOptions.length > 0 ? shopifyOptions : undefined,
      variants: shopifyVariants,
    },
  };

  const response = await fetch(`https://${store.shopifyDomain}/admin/api/2024-01/products.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": store.shopifyAccessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(shopifyProduct),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Shopify API error: ${error}`);
  }

  const data = await response.json();
  const productHandle = data.product.handle;

  return {
    externalId: data.product.id.toString(),
    externalUrl: `https://${store.shopifyDomain}/products/${productHandle}`,
  };
}

async function publishToWooCommerce(product: any, store: any) {
  // Use generated description if available (already HTML formatted from AI)
  // Otherwise convert plain text to HTML
  const description = product.generatedDesc || product.originalDesc || "";
  const formattedDescription = description.includes('<')
    ? description // Already HTML formatted
    : description // Convert plain text to HTML
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)
        .map((line: string) => `<p>${line}</p>`)
        .join('');

  const wooProduct = {
    name: product.title,
    type: "simple",
    regular_price: product.price.toString(),
    description: formattedDescription,
    short_description: product.title,
    categories: product.productType ? [{ name: product.productType }] : [],
    tags: product.tags?.map((tag: string) => ({ name: tag })) || [],
    images: [
      {
        src: product.generatedImage || product.imageUrl,
      },
    ],
  };

  const auth = Buffer.from(`${store.wooConsumerKey}:${store.wooConsumerSecret}`).toString("base64");

  const response = await fetch(`${store.wooApiUrl}/products`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(wooProduct),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WooCommerce API error: ${error}`);
  }

  const data = await response.json();

  return {
    externalId: data.id.toString(),
    externalUrl: data.permalink,
  };
}
