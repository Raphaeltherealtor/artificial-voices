import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

const CHARACTERS = [
  { id: "hiro",  name: "Hiro",  personality: "energetic and enthusiastic, loves pointing things out" },
  { id: "luna",  name: "Luna",  personality: "calm and knowledgeable, gives precise directions" },
  { id: "marco", name: "Marco", personality: "friendly and funny, uses light humor" },
];

export async function POST(req: NextRequest) {
  const { message, imageBase64, mimeType, lat, lng, characterId, history, targetLanguage } = await req.json();

  const char = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
  const lang = targetLanguage ?? "English";
  const locationCtx = lat != null && lng != null
    ? `The user's GPS location is approximately ${lat.toFixed(5)}, ${lng.toFixed(5)}.`
    : "GPS unavailable.";

  const isEnglish = lang === "English";

  const systemPrompt = `You are ${char.name}, a friendly AR guide character. You are ${char.personality}.
${locationCtx}
You can see what the user's camera sees in attached images (if provided).
You help with directions, translation, language learning, and anything the user asks.

IMPORTANT: Respond ONLY in ${lang}${isEnglish ? "" : ` — not in English, only in ${lang}`}.
Keep your response to 2-3 short sentences. Be warm, direct, and helpful.
When giving directions, be specific — use street names, landmarks, distances.`;

  const contentBlocks: Anthropic.MessageParam["content"] = [];
  if (imageBase64) {
    contentBlocks.push({ type: "image", source: { type: "base64", media_type: mimeType ?? "image/jpeg", data: imageBase64 } });
  }
  contentBlocks.push({ type: "text", text: message });

  const messages: Anthropic.MessageParam[] = [
    ...(history ?? []),
    { role: "user", content: contentBlocks },
  ];

  // Main response in target language
  const [mainRes, transRes] = await Promise.all([
    client.messages.create({ model: "claude-haiku-4-5-20251001", max_tokens: 300, system: systemPrompt, messages }),
    // Only get English translation if not already English
    !isEnglish
      ? client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 300,
          messages: [
            ...messages,
            { role: "assistant", content: "" }, // placeholder, overridden below
          ],
          system: `You are a translator. The user will give you a ${lang} text. Translate it to natural English in 1-3 sentences. Return ONLY the English translation, nothing else.`,
        })
      : Promise.resolve(null),
  ]);

  const reply = mainRes.content[0].type === "text" ? mainRes.content[0].text : "";

  let replyEnglish: string | null = null;
  if (!isEnglish && reply) {
    // Get English translation of the reply
    const translateMsg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: "Translate the following text to natural English. Return ONLY the English translation.",
      messages: [{ role: "user", content: reply }],
    });
    replyEnglish = translateMsg.content[0].type === "text" ? translateMsg.content[0].text : null;
  }

  // Avoid unused variable warning
  void transRes;

  return NextResponse.json({ reply, replyEnglish, characterName: char.name });
}
