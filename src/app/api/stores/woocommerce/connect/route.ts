import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const wooConnectSchema = z.object({
  storeName: z.string().min(1, "Store name required"),
  storeUrl: z.string().url("Invalid store URL"),
  consumerKey: z.string().min(1, "Consumer key required"),
  consumerSecret: z.string().min(1, "Consumer secret required"),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validationResult = wooConnectSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { storeName, storeUrl, consumerKey, consumerSecret } = validationResult.data;

    // Test WooCommerce API connection
    const apiUrl = storeUrl.endsWith("/") ? `${storeUrl}wp-json/wc/v3` : `${storeUrl}/wp-json/wc/v3`;
    const testResponse = await fetch(`${apiUrl}/system_status`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`,
      },
    });

    if (!testResponse.ok) {
      return NextResponse.json(
        { error: "Failed to connect to WooCommerce. Please check your API credentials." },
        { status: 400 }
      );
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Save store connection
    const store = await db.store.create({
      data: {
        userId: user.id,
        platform: "woocommerce",
        storeName,
        storeUrl,
        wooApiUrl: apiUrl,
        wooConsumerKey: consumerKey,
        wooConsumerSecret: consumerSecret,
      },
    });

    return NextResponse.json({
      success: true,
      store: {
        id: store.id,
        name: store.storeName,
        platform: store.platform,
      },
    });
  } catch (error) {
    console.error("WooCommerce connect error:", error);
    return NextResponse.json({ error: "Failed to connect WooCommerce store" }, { status: 500 });
  }
}
