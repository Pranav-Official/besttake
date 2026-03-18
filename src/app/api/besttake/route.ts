import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";

const systemPrompt = `You are an expert video editor and copywriter.
Your task is to review an unedited, raw video transcript and output a perfectly clean version.
You must STRICTLY adhere to these rules:
1. Remove all filler words (um, uh, ah, like, you know, etc.).
2. Remove all stutters, false starts, and trailing thoughts.
3. Keep the most articulate, clear sections ("best takes").
4. DO NOT rewrite, paraphrase, or add any new words. Only DELETE bad parts. The remaining words must exactly match the original vocabulary and phrasing.
5. Return ONLY the clean text. No intro, no explanation, no formatting other than the text itself.`;

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: "Transcript text is required" },
        { status: 400 },
      );
    }

    const modelId = process.env.MODEL_ID || "openai/gpt-4o-mini";

    const { text: cleanText } = await generateText({
      model: openrouter(modelId),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Raw Transcript:\n\n${text}` },
      ],
    });

    return NextResponse.json({ cleanText });
  } catch (error) {
    console.error("BestTake error:", error);
    return NextResponse.json(
      { error: "Failed to process the transcript" },
      { status: 500 },
    );
  }
}
