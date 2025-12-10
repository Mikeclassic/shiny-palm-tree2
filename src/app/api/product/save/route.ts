import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    // 1. Check Authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { id, generatedDesc, generatedImage, preferences } = body;

    const updateData: any = {};

    if (generatedDesc !== undefined) updateData.generatedDesc = generatedDesc;
    if (generatedImage !== undefined) updateData.generatedImage = generatedImage;
    
    if (preferences) {
        if (preferences.condition) updateData.condition = preferences.condition;
        if (preferences.era) updateData.era = preferences.era;
        if (preferences.style) updateData.style = preferences.style;
    }

    await db.product.update({
        where: { id },
        data: updateData
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save Error:", error);
    return NextResponse.json("Failed to save.", { status: 500 });
  }
}