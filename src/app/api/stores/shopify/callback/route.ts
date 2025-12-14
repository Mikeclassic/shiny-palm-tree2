import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/sign-in`);
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const shop = searchParams.get("shop");
    const hmac = searchParams.get("hmac");

    if (!code || !shop) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=shopify_auth_failed`);
    }

    // Exchange code for access token
    const accessTokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    });

    if (!accessTokenResponse.ok) {
      throw new Error("Failed to exchange code for access token");
    }

    const { access_token } = await accessTokenResponse.json();

    // Get shop details
    const shopDetailsResponse = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: {
        "X-Shopify-Access-Token": access_token,
      },
    });

    const { shop: shopDetails } = await shopDetailsResponse.json();

    // Find user
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/sign-in`);
    }

    // Save or update store connection
    await db.store.upsert({
      where: {
        shopifyDomain: shop,
      },
      create: {
        userId: user.id,
        platform: "shopify",
        storeName: shopDetails.name || shop,
        storeUrl: `https://${shop}`,
        shopifyDomain: shop,
        shopifyAccessToken: access_token,
      },
      update: {
        shopifyAccessToken: access_token,
        storeName: shopDetails.name || shop,
        isActive: true,
      },
    });

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/stores?success=shopify_connected`);
  } catch (error) {
    console.error("Shopify callback error:", error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=shopify_connection_failed`);
  }
}
