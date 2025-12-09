import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { title, originalDesc, tone } = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();

    if (!apiKey) return NextResponse.json({ error: "Configuration Error: No OpenRouter API Key set." }, { status: 500 });

    const systemPrompt = `
    You are an expert e-commerce copywriter.
    Your task is to take a raw product description and rewrite it to be HIGHLY ENGAGING and OPTIMIZED FOR CONVERSION.
    
    TONE: ${tone || "Persuasive"}
    
    INSTRUCTIONS:
    1. Analyze the original text to extract key features, materials, and benefits.
    2. Remove boring manufacturer jargon or technical codes.
    3. Write a catchy hook.
    4. Use bullet points for features.
    5. Add 15-20 relevant hashtags at the bottom.
    6. Return ONLY the new description.
    `;

    const payload = {
      model: "x-ai/grok-4.1-fast", 
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Product Title: ${title}\n\nOriginal Text Context:\n${originalDesc}` 
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
        return NextResponse.json({ error: `Provider Error (${response.status})` }, { status: response.status });
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