import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { title, price, imageUrl, preferences } = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();

    if (!apiKey) {
        return NextResponse.json({ error: "Configuration Error: No OpenRouter API Key set." }, { status: 500 });
    }

    const systemPrompt = `
    You are an expert top-rated seller on Depop and Vinted.
    Your goal is to MAXIMIZE CONVERSION and sell this item immediately.

    USER SETTINGS:
    - Condition: ${preferences?.condition || "Infer from image"}
    - Era: ${preferences?.era || "Modern"}
    - Style: ${preferences?.style || "Trendy"}
    - Gender: ${preferences?.gender || "Unisex"}

    ITEM:
    - Title: ${title}
    - Price: $${price}

    INSTRUCTIONS:
    1. ANALYZE the image.
    2. Write a viral description (under 1000 chars).
    3. Use bullet points for Measurements, Material, Condition.
    4. End with 20 SEO hashtags.
    `;

    // Using your specific requested model
    const payload = {
      model: "x-ai/grok-4.1-fast", 
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Write the listing description based on this image." },
            {
              type: "image_url",
              image_url: { url: imageUrl }
            }
          ]
        }
      ]
    };

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://glowseller.com",
        "X-Title": "GlowSeller",
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("OpenRouter API Error:", response.status, errorBody);
        return NextResponse.json({ error: `Provider Error (${response.status}): ${errorBody}` }, { status: response.status });
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content;

    if (!output) {
        return NextResponse.json({ error: "AI returned empty response." }, { status: 500 });
    }

    return NextResponse.json(output);

  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: `Server Error: ${error.message}` }, { status: 500 });
  }
}