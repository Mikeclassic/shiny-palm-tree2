import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { productImageUrl, backgroundImageUrl } = await req.json();

    if (!productImageUrl || !backgroundImageUrl) {
      return new NextResponse("Missing images", { status: 400 });
    }

    const response = await fetch("https://api.replicate.com/v1/models/prunaai/p-image-edit/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
        "Prefer": "wait", // Important: waits for the result
      },
      body: JSON.stringify({
        input: {
          images: [productImageUrl, backgroundImageUrl], // Image 1 (Main), Image 2 (Bg)
          prompt: "change the background of image 1 with image 2",
          aspect_ratio: "1:1"
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Replicate Error:", errorText);
      return new NextResponse(`AI Error: ${response.statusText}`, { status: response.status });
    }

    const data = await response.json();
    
    // The output from this specific model is usually a URL or an array of URLs
    const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;

    return NextResponse.json({ output: outputUrl });

  } catch (error: any) {
    console.error("BG Changer Error:", error);
    return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
  }
}