import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkAIRateLimit } from "@/lib/ratelimit";
import { checkAndDeductCredit } from "@/lib/credits";
import { generateDescriptionSchema } from "@/lib/validators";

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
    const validationResult = generateDescriptionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { title, originalDesc, tone } = validationResult.data;

    // 4. Check and Deduct Credits
    const creditResult = await checkAndDeductCredit(identifier, 'description');
    if (!creditResult.success) {
      return NextResponse.json(
        { error: creditResult.error },
        { status: 403 }
      );
    }
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();

    if (!apiKey) return NextResponse.json({ error: "Configuration Error: No OpenRouter API Key set." }, { status: 500 });

    const systemPrompt = `
    You are an expert e-commerce copywriter who creates rich HTML product descriptions.
    Your task is to take a raw product description and rewrite it to be HIGHLY ENGAGING and OPTIMIZED FOR CONVERSION.

    TONE: ${tone || "Persuasive"}

    INSTRUCTIONS:
    1. Analyze the original text to extract key features, materials, and benefits.
    2. Remove boring manufacturer jargon or technical codes.
    3. Format your response using HTML tags for rich text:
       - Use <h2> for main headings
       - Use <h3> for subheadings
       - Use <strong> or <b> for bold emphasis
       - Use <em> or <i> for italic emphasis
       - Use <ul> and <li> for bullet point lists
       - Use <p> for paragraphs
    4. Structure the description with:
       - A catchy opening hook in <p> tags with <strong> for emphasis
       - Key features in a <ul> list with bold feature names
       - A compelling call-to-action at the end
    5. Add 15-20 relevant hashtags at the bottom in a <p> tag.
    6. Return ONLY the HTML formatted description (no markdown, no code blocks).

    EXAMPLE FORMAT:
    <p><strong>Transform Your Space with This Stunning Product!</strong></p>
    <p>Here's why you'll love it...</p>
    <h3>Key Features:</h3>
    <ul>
      <li><strong>Feature Name:</strong> Description of benefit</li>
      <li><strong>Another Feature:</strong> More benefits</li>
    </ul>
    <p>Get yours today!</p>
    <p>#hashtag1 #hashtag2 #hashtag3</p>
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
        "HTTP-Referer": "https://clearseller.com",
        "X-Title": "ClearSeller",
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
    console.error("AI Generate Error:", error);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}