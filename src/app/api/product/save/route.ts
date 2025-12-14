import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/ratelimit";
import { saveProductSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    // 1. Check Authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Rate Limiting
    const identifier = session.user.email;
    const { success: rateLimitSuccess } = await checkRateLimit(identifier);
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // 3. Validate Input
    const body = await req.json();
    const validationResult = saveProductSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { id, generatedDesc, generatedImage, preferences } = validationResult.data;

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
    return NextResponse.json({ error: "Failed to save product. Please try again." }, { status: 500 });
  }
}