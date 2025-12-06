import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, generatedDesc, preferences } = body;

    await db.product.update({
        where: { id },
        data: {
            generatedDesc: generatedDesc,
            condition: preferences.condition,
            era: preferences.era,
            gender: preferences.gender,
            style: preferences.style
        }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json("Failed to save.", { status: 500 });
  }
}