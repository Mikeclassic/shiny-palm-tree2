import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkAIRateLimit } from "@/lib/ratelimit";
import { checkAndDeductCredit } from "@/lib/credits";
import { removeBgSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    // 1. Check Authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Rate Limiting
    const identifier = session.user.email;
    const { success: rateLimitSuccess } = await checkAIRateLimit(identifier);
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // 3. Validate Input
    const body = await req.json();
    const validationResult = removeBgSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { imageUrl } = validationResult.data;

    // 4. Check and Deduct Credits
    const creditResult = await checkAndDeductCredit(identifier, 'bgRemoval');
    if (!creditResult.success) {
      return NextResponse.json(
        { error: creditResult.error },
        { status: 403 }
      );
    }

    const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
        "Authorization": `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
        "Prefer": "wait",
        },
        body: JSON.stringify({
        version: "a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc",
        input: { image: imageUrl }
        }),
    });

    const data = await response.json();
    return NextResponse.json({ output: data.output });
  } catch (error) {
    console.error("BG Remove Error:", error);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}