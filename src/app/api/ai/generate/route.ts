import { NextResponse } from "next/server";
import { OpenRouter } from "@openrouter/sdk";

export async function POST(req: Request) {
  try {
    const { title, price, imageUrl, preferences } = await req.json();

    if (!process.env.OPENROUTER_API_KEY) {
        return NextResponse.json("Error: No OpenRouter API Key found.", { status: 500 });
    }

    const client = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    // 1. Build the prompt based on User Preferences (avoiding misunderstanding)
    const systemPrompt = `
    You are an expert top-rated seller on Depop and Vinted.
    Your goal is to MAXIMIZE CONVERSION and sell this item immediately.

    USER SETTINGS (Respect these strictly):
    - Condition: ${preferences.condition || "Not specified (Infer from image)"}
    - Era: ${preferences.era || "Modern/Y2K"}
    - Gender: ${preferences.gender || "Unisex"}
    - Aesthetic: ${preferences.style || "Trendy"}

    ITEM DETAILS:
    - Title: ${title}
    - Market Price: $${price}

    INSTRUCTIONS:
    1. ANALYZE the image. Describe the specific color, fit, and texture you see.
    2. Write a high-converting description using Gen-Z slang (slay, rare, grail) but keep it professional.
    3. Respect Depop character limits (keep it concise, under 1000 chars).
    4. Include bullet points for: 📏 Measurements (leave placeholder), 🧵 Material, 💎 Condition.
    5. GENERATE 15-20 viral SEO hashtags at the bottom.
    `;

    // 2. Send to OpenRouter using your specific model
    const completion = await client.chat.send({
      model: "x-ai/grok-4.1-fast", // Using the specific model you requested
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Here is the product image. Write the listing description." 
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl // Passing the image for context
              }
            }
          ]
        }
      ],
      // We disable streaming here to keep the frontend simple (JSON response)
      stream: false 
    });

    // 3. Extract content
    // @ts-ignore - The SDK types might differ slightly based on version, trusting the response structure.
    const output = completion.choices[0]?.message?.content || "";

    if (!output) {
        throw new Error("No output from Grok.");
    }

    return NextResponse.json(output);

  } catch (error) {
    console.error("AI Generation Error:", error);
    return NextResponse.json("Failed to generate description.", { status: 500 });
  }
}