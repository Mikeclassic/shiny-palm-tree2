import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'e92858eec4mshc38018bfb8b1dcdp166ff1jsne35147c192bb';
const RAPIDAPI_HOST = 'aliexpress-datahub.p.rapidapi.com';

interface ProductDetails {
  title: string;
  price: number;
  regularPrice: number;
  salePrice: number;
  images: string[];
  variants: any[];
  shipping: any;
}

interface ProductDescription {
  description: string;
  descriptionImages: string[];
}

interface ProductReviews {
  rating: number;
  reviewCount: number;
  reviews: any[];
  reviewStats: any;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productUrl } = await req.json();

    if (!productUrl) {
      return NextResponse.json({ error: "Product URL is required" }, { status: 400 });
    }

    // Extract item ID from URL
    const itemId = extractItemId(productUrl);
    if (!itemId) {
      return NextResponse.json({ error: "Invalid AliExpress URL" }, { status: 400 });
    }

    console.log('[RapidAPI] Fetching product data for item:', itemId);

    // Fetch all data in parallel
    const [productDetails, productDescription, productReviews] = await Promise.all([
      fetchProductDetails(itemId),
      fetchProductDescription(itemId),
      fetchProductReviews(itemId)
    ]);

    console.log('[RapidAPI] Successfully fetched all product data');

    // Combine all data
    const productData = {
      itemId,
      title: productDetails.title,
      price: productDetails.price,
      regularPrice: productDetails.regularPrice,
      salePrice: productDetails.salePrice,
      images: productDetails.images,
      variants: productDetails.variants,
      shipping: productDetails.shipping,
      description: productDescription.description,
      descriptionImages: productDescription.descriptionImages,
      rating: productReviews.rating,
      reviewCount: productReviews.reviewCount,
      reviews: productReviews.reviews,
      reviewStats: productReviews.reviewStats,
      sourceUrl: productUrl
    };

    return NextResponse.json({
      success: true,
      data: productData
    });

  } catch (error: any) {
    console.error('[RapidAPI] Error fetching product:', error);
    return NextResponse.json({
      error: error.message || 'Failed to fetch product data'
    }, { status: 500 });
  }
}

/**
 * Extract item ID from AliExpress URL
 */
function extractItemId(url: string): string | null {
  // Pattern: /item/1005005244562338.html or /item/1005005244562338
  const match = url.match(/\/item\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Fetch product details from RapidAPI
 */
async function fetchProductDetails(itemId: string): Promise<ProductDetails> {
  const response = await fetch(
    `https://${RAPIDAPI_HOST}/item_detail_2?itemId=${itemId}`,
    {
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch product details: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('[RapidAPI] Item details response:', JSON.stringify(data).substring(0, 500));

  // Parse the response to extract needed fields
  const result = data.result || {};
  const item = result.item || {};
  const priceInfo = item.sku?.def || {};
  const delivery = result.delivery || {};
  const shippingList = delivery.shippingList || [];
  const primaryShipping = shippingList[0] || {};

  // Handle price - can be a range like "25.4 - 44.47"
  let regularPrice = 0;
  let salePrice = 0;

  if (priceInfo.price) {
    const priceStr = String(priceInfo.price);
    regularPrice = parseFloat(priceStr.split('-')[0].trim());
  }

  if (priceInfo.promotionPrice) {
    const priceStr = String(priceInfo.promotionPrice);
    salePrice = parseFloat(priceStr.split('-')[0].trim());
  }

  // Use sale price if available, otherwise regular price
  const price = salePrice || regularPrice;

  // Handle images - add https: prefix to protocol-relative URLs
  const images = (item.images || []).map((img: string) => {
    return img.startsWith('//') ? `https:${img}` : img;
  });

  return {
    title: item.title || 'Unknown Product',
    price: price || 0,
    regularPrice: regularPrice || 0,
    salePrice: salePrice || 0,
    images: images,
    variants: item.sku?.props || [],
    shipping: {
      time: primaryShipping.shippingTime || delivery.shippingOutDays || 'Unknown',
      cost: parseFloat(primaryShipping.shippingFee) || 0,
      company: primaryShipping.shippingCompany || 'Standard Shipping'
    }
  };
}

/**
 * Fetch product description from RapidAPI
 */
async function fetchProductDescription(itemId: string): Promise<ProductDescription> {
  const response = await fetch(
    `https://${RAPIDAPI_HOST}/item_desc?itemId=${itemId}`,
    {
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch product description: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('[RapidAPI] Description response:', JSON.stringify(data).substring(0, 500));

  // Extract description from the actual API format
  const item = data.result?.item || {};
  const descriptionData = item.description || {};

  // Description can be in text array or images array
  let description = '';
  let descriptionImages: string[] = [];

  if (descriptionData.text && Array.isArray(descriptionData.text)) {
    // Join all text elements with line breaks
    description = descriptionData.text.join('\n').trim();
  }

  // Extract description images and add https: prefix
  if (descriptionData.images && Array.isArray(descriptionData.images)) {
    descriptionImages = descriptionData.images.map((img: string) => {
      return img.startsWith('//') ? `https:${img}` : img;
    });
  }

  // If still no description, try properties
  if (!description && item.properties?.list) {
    const props = item.properties.list.map((prop: any) =>
      `${prop.name}: ${prop.value}`
    ).join('\n');
    if (props) description = props;
  }

  return {
    description: description || 'No description available',
    descriptionImages: descriptionImages
  };
}

/**
 * Fetch product reviews from RapidAPI
 */
async function fetchProductReviews(itemId: string): Promise<ProductReviews> {
  const response = await fetch(
    `https://${RAPIDAPI_HOST}/item_review?itemId=${itemId}&page=1&pageSize=10`,
    {
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY
      }
    }
  );

  if (!response.ok) {
    console.warn('Failed to fetch reviews, continuing without them');
    return {
      rating: 0,
      reviewCount: 0,
      reviews: [],
      reviewStats: {}
    };
  }

  const data = await response.json();
  console.log('[RapidAPI] Reviews response:', JSON.stringify(data).substring(0, 500));

  const result = data.result || {};
  const base = result.base || {};
  const reviewStats = base.reviewStats || {};

  return {
    // Note: API has typo "evarageStar" instead of "averageStar"
    rating: parseFloat(reviewStats.evarageStar || reviewStats.averageStar) || 0,
    reviewCount: parseInt(base.totalResults) || 0,
    reviews: result.resultList || [],
    reviewStats: reviewStats
  };
}
