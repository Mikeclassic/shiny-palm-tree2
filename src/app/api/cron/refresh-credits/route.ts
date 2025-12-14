import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    // 1. Verify cron secret to prevent unauthorized access (if configured)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, require authentication
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    // If no CRON_SECRET is set, endpoint is accessible without auth (useful for development/manual triggers)

    // 2. Reset credits for all non-Pro users
    const result = await db.user.updateMany({
      where: {
        isPro: false,
      },
      data: {
        credits: 5, // Reset to default 5 credits per day
      },
    });

    console.log(`Credit refresh completed: ${result.count} users updated`);

    return NextResponse.json({
      success: true,
      message: `Credits refreshed for ${result.count} free tier users`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Credit refresh error:", error);
    return NextResponse.json(
      { error: "Failed to refresh credits" },
      { status: 500 }
    );
  }
}

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;
