import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter required" }, { status: 400 });
    }

    // Validate shop domain format
    if (!shop.endsWith(".myshopify.com")) {
      return NextResponse.json({ error: "Invalid Shopify domain" }, { status: 400 });
    }

    const clientId = process.env.SHOPIFY_API_KEY;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/stores/shopify/callback`;
    const scopes = "write_products,read_products,write_inventory,read_inventory";
    const nonce = Math.random().toString(36).substring(7);

    // Build Shopify OAuth URL
    const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${nonce}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Shopify connect error:", error);
    return NextResponse.json({ error: "Failed to initiate Shopify connection" }, { status: 500 });
  }
}
