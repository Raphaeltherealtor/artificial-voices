import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export type DetectedObject = {
  label: string;
  x: number; // 0–100 % from left in video frame
  y: number; // 0–100 % from top  in video frame
  translations: Record<string, string>;
};

const TRANSLATIONS_SCHEMA = `"Spanish":"...","Mandarin Chinese":"...","Hindi":"...","Arabic":"...","French":"...","Portuguese":"...","Russian":"...","Japanese":"...","German":"...","Korean":"..."`;

export async function POST(req: NextRequest) {
  const { imageBase64, mimeType, tapX, tapY } = await req.json();

  if (!imageBase64) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  let prompt: string;

  if (tapX != null && tapY != null) {
    // User tapped a specific spot – identify just that object
    prompt = `The user tapped at roughly ${Math.round(tapX)}% from the left and ${Math.round(tapY)}% from the top of this image. Identify the object the user is most likely pointing at.

Respond ONLY with a JSON array containing one object, no markdown:
[{"label":"object name (1-3 words, lowercase, English)","x":${Math.round(tapX)},"y":${Math.round(tapY)},"translations":{${TRANSLATIONS_SCHEMA}}}]`;
  } else {
    // Full-scene scan – label every visible object
    prompt = `Examine this image carefully and identify EVERY distinct visible object — include furniture, rugs, flooring, walls, plants, curtains, electronics, decor, clothing, food, and anything else you can see. Be thorough; do not skip background items like rugs or floors.

For each object provide:
• label: English name, 1–3 words, lowercase
• x: approximate horizontal center, 0 (left edge) to 100 (right edge)
• y: approximate vertical center, 0 (top edge) to 100 (bottom edge)
• translations: name in all 10 languages

Respond ONLY with a JSON array of up to 8 objects, no markdown, no explanation:
[{"label":"rug","x":50,"y":80,"translations":{${TRANSLATIONS_SCHEMA}}},...]`;
  }

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1200,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType ?? "image/jpeg",
              data: imageBase64,
            },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";

  try {
    // Strip any accidental markdown code fences
    const clean = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(clean);
    const arr: DetectedObject[] = Array.isArray(parsed) ? parsed : [parsed];
    return NextResponse.json(arr);
  } catch {
    return NextResponse.json({ error: "Parse failed", raw }, { status: 500 });
  }
}
