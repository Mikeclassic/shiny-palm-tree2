import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { title, price, imageUrl, preferences } = await req.json();

    if (!process.env.OPENROUTER_API_KEY) {
        // Log this to Vercel logs so you can see if the key is missing
        console.error("Missing OPENROUTER_API_KEY");
        return NextResponse.json("Error: No OpenRouter API Key found.", { status: 500 });
    }

    const systemPrompt = `
    You are an expert top-rated seller on Depop and Vinted.
    Your goal is to MAXIMIZE CONVERSION and sell this item immediately.

    USER SETTINGS (Respect these strictly):
    - Condition: ${preferences?.condition || "Infer from image"}
    - Era: ${preferences?.era || "Modern/Y2K"}
    - Gender: ${preferences?.gender || "Unisex"}
    - Aesthetic: ${preferences?.style || "Trendy"}

    ITEM DETAILS:
    - Title: ${title}
    - Market Price: $${price}

    INSTRUCTIONS:
    1. ANALYZE the image. Describe the specific color, fit, and texture.
    2. Write a high-converting description using Gen-Z slang (slay, rare, grail) but keep it professional.
    3. Respect Depop character limits (under 1000 chars).
    4. Include bullet points for: 📏 Measurements, 🧵 Material, 💎 Condition.
    5. GENERATE 15-20 viral SEO hashtags at the bottom.
    `;

    // Construct the message payload
    const messages = [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Here is the product image. Write the listing description." },
            ...(imageUrl ? [{
              type: "image_url",
              image_url: { url: imageUrl }
            }] : [])
          ]
        }
    ];

    // Standard Fetch Request
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://glowseller.com", 
        "X-Title": "GlowSeller",
      },
      body: JSON.stringify({
        model: "x-ai/grok-4.1-fast", // Keeping your model choice
        messages: messages
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter API Error:", errorText);
        throw new Error(`OpenRouter Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const output = data.choices[0]?.message?.content || "";

    if (!output) throw new Error("No output from AI");

    return NextResponse.json(output);

  } catch (error) {
    console.error("Generation Failed:", error);
    return NextResponse.json("Failed to generate description. Check Vercel Logs.", { status: 500 });
  }
}