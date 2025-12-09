import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { productImageUrl, prompt } = await req.json();

    if (!productImageUrl || !prompt) {
      return new NextResponse("Missing image or prompt", { status: 400 });
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
    return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
  }
}