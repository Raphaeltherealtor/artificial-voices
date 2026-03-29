import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export type TranslationEntry = {
  native: string;
  roman?: string;  // romanized / transliterated (pinyin, romaji, etc.)
  furi?: string;   // furigana — hiragana reading, Japanese only
};

export type DetectedObject = {
  label: string;
  x: number;
  y: number;
  translations: Record<string, TranslationEntry>;
};

const LANG_SCHEMA = `"Spanish":{"native":"...","roman":"..."},"Mandarin Chinese":{"native":"...","roman":"(pinyin with tone marks)"},"Hindi":{"native":"...","roman":"(IAST transliteration)"},"Arabic":{"native":"...","roman":"(transliteration)"},"French":{"native":"...","roman":"..."},"Portuguese":{"native":"...","roman":"..."},"Russian":{"native":"...","roman":"(transliteration)"},"Japanese":{"native":"...","roman":"(romaji)","furi":"(hiragana reading if native has kanji, else omit furi)"},"German":{"native":"...","roman":"..."},"Korean":{"native":"...","roman":"(Revised Romanization)"}`;

export async function POST(req: NextRequest) {
  const { imageBase64, mimeType, tapX, tapY } = await req.json();
  if (!imageBase64) return NextResponse.json({ error: "No image" }, { status: 400 });

  let prompt: string;

  if (tapX != null && tapY != null) {
    prompt = `The user tapped at ${Math.round(tapX)}% from left, ${Math.round(tapY)}% from top. Identify the single object at that spot.

Return ONLY a JSON array with one item, no markdown:
[{"label":"name (1-3 words lowercase English)","x":${Math.round(tapX)},"y":${Math.round(tapY)},"translations":{${LANG_SCHEMA}}}]`;
  } else {
    prompt = `Identify EVERY distinct visible object in this image — furniture, rugs, flooring, walls, plants, curtains, electronics, clothing, food, decor. Include background items.

For each, return:
- label: English name 1-3 words lowercase
- x/y: % position (0=left/top, 100=right/bottom)
- translations: each language with native script, roman (romanized/transliterated), and furi (hiragana reading, Japanese only when native contains kanji)

Return ONLY a JSON array of up to 8 objects, no markdown:
[{"label":"rug","x":50,"y":80,"translations":{${LANG_SCHEMA}}}]`;
  }

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2400,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mimeType ?? "image/jpeg", data: imageBase64 } },
        { type: "text", text: prompt },
      ],
    }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";
  try {
    const clean = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(clean);
    return NextResponse.json(Array.isArray(parsed) ? parsed : [parsed]);
  } catch {
    return NextResponse.json({ error: "Parse failed", raw }, { status: 500 });
  }
}
