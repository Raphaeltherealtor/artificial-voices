import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

const LANGUAGES = [
  { name: "Spanish", code: "es" },
  { name: "Mandarin Chinese", code: "zh" },
  { name: "Hindi", code: "hi" },
  { name: "Arabic", code: "ar" },
  { name: "French", code: "fr" },
  { name: "Portuguese", code: "pt" },
  { name: "Russian", code: "ru" },
  { name: "Japanese", code: "ja" },
  { name: "German", code: "de" },
  { name: "Korean", code: "ko" },
];

export async function POST(req: NextRequest) {
  const { imageBase64, mimeType } = await req.json();

  if (!imageBase64) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const langList = LANGUAGES.map((l) => l.name).join(", ");

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType || "image/jpeg",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: `Identify the single most prominent object or subject in this image. Then provide its name in these 10 languages: ${langList}.

Respond ONLY with valid JSON in this exact format, no markdown, no explanation:
{
  "object": "the object name in English",
  "translations": {
    "Spanish": "...",
    "Mandarin Chinese": "...",
    "Hindi": "...",
    "Arabic": "...",
    "French": "...",
    "Portuguese": "...",
    "Russian": "...",
    "Japanese": "...",
    "German": "...",
    "Korean": "..."
  }
}`,
          },
        ],
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const result = JSON.parse(text);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to parse response", raw: text }, { status: 500 });
  }
}
