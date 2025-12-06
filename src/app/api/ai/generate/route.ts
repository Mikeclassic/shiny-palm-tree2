import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { title, aesthetic, price, imageUrl, preferences } = await req.json();

    if (!process.env.OPENROUTER_API_KEY) {
        return NextResponse.json("Error: No OpenRouter API Key found.", { status: 500 });
    }

    // Construct the System Prompt
    const systemPrompt = `
    You are an expert top-rated seller on Depop and Vinted. 
    Your goal is to write a high-converting listing that sells fast.
    
    DETAILS PROVIDED BY USER:
    - Product: ${title}
    - Price: $${price}
    - Condition: ${preferences.condition || "Not specified"}
    - Era: ${preferences.era || "Not specified"}
    - Gender: ${preferences.gender || "Unisex"}
    - Style/Core: ${preferences.style || aesthetic}

    INSTRUCTIONS:
    1. ANALYZE the image provided (describe the color, pattern, material, and fit).
    2. Write a catchy, Gen-Z friendly Title (under 60 chars).
    3. Write a Description (under 800 chars) that is persuasive but honest.
    4. Use bullet points for: 📏 Measurements (leave placeholder), 🧵 Material, 💎 Condition.
    5. Include 15-20 relevant, high-traffic SEO hashtags at the bottom.
    6. Tone: Excited, trendy, professional. Use emojis (✨🦋🧚‍♀️).
    7. NO filler text like "Here is a description". Just give the listing.
    `;

    // Call OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://glowseller.com", // Required by OpenRouter
        "X-Title": "GlowSeller",
      },
      body: JSON.stringify({
        // We use Gemini Flash 2.0 because it is Free, Fast, and has Great Vision
        model: "google/gemini-2.0-flash-001", 
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: systemPrompt },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl, 
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
        const err = await response.text();
        console.error("OpenRouter Error:", err);
        throw new Error("AI Request Failed");
    }

    const data = await response.json();
    const output = data.choices[0].message.content;

    return NextResponse.json(output);
  } catch (error) {
    console.error(error);
    return NextResponse.json("Failed to generate description.", { status: 500 });
  }
}