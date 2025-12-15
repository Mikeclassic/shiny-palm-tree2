import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const publishSchema = z.object({
  productId: z.string().min(1),
  storeId: z.string().min(1),
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

    const { productId, storeId } = validationResult.data;

    // Get product
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
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

    // Check if already published
    const existingPublish = await db.publishedProduct.findUnique({
      where: {
        productId_storeId: {
          productId,
          storeId,
        },
      },
    });

    if (existingPublish) {
      return NextResponse.json({ error: "Product already published to this store" }, { status: 400 });
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

  const shopifyProduct = {
    product: {
      title: product.title,
      body_html: formattedDescription,
      vendor: product.vendor || "ClearSeller",
      product_type: product.productType || "General",
      tags: product.tags?.join(", ") || "",
      images: [
        {
          src: product.generatedImage || product.imageUrl,
        },
      ],
      variants: [
        {
          price: product.price.toString(),
          inventory_management: null,
        },
      ],
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
