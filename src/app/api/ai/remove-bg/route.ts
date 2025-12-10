import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // 1. Check Authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { imageUrl } = await req.json();

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
    return new NextResponse("Internal Error", { status: 500 });
  }
}