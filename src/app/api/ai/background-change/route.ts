import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkAIRateLimit } from "@/lib/ratelimit";
import { checkAndDeductCredit } from "@/lib/credits";
import { backgroundChangeSchema } from "@/lib/validators";

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
    const validationResult = backgroundChangeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { productImageUrl, prompt } = validationResult.data;

    // 4. Check and Deduct Credits
    const creditResult = await checkAndDeductCredit(identifier);
    if (!creditResult.success) {
      return NextResponse.json(
        { error: creditResult.error },
        { status: 403 }
      );
    }

    const response = await fetch("https://api.replicate.com/v1/models/prunaai/flux-kontext-fast/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
        "Prefer": "wait",
      },
      body: JSON.stringify({
        input: {
          img_cond_path: productImageUrl,
          prompt: prompt,
          guidance: 2.5,
          speed_mode: "Real Time"
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Replicate Error:", errorText);
      return new NextResponse(`AI Error: ${response.statusText}`, { status: response.status });
    }

    const data = await response.json();
    
    // Output handling for Flux models
    const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;

    return NextResponse.json({ output: outputUrl });

  } catch (error: any) {
    console.error("BG Changer Error:", error);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}