import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, generatedDesc, generatedImage, preferences } = body;

    // Construct update data dynamically so we don't overwrite existing data with nulls
    const updateData: any = {};

    if (generatedDesc !== undefined) updateData.generatedDesc = generatedDesc;
    if (generatedImage !== undefined) updateData.generatedImage = generatedImage;
    
    // Flatten preferences if they exist
    if (preferences) {
        if (preferences.condition) updateData.condition = preferences.condition;
        if (preferences.era) updateData.era = preferences.era; // This maps to Category in UI
        if (preferences.style) updateData.style = preferences.style; // This maps to Tone in UI
        // We use 'gender' field for extra metadata if needed, or ignore
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