import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

const CHARACTERS = [
  { id: "hiro", name: "Hiro", personality: "energetic and enthusiastic, loves pointing things out" },
  { id: "luna", name: "Luna", personality: "calm and knowledgeable, gives precise directions" },
  { id: "marco", name: "Marco", personality: "friendly and funny, uses light humor" },
];

export async function POST(req: NextRequest) {
  const { message, imageBase64, mimeType, lat, lng, characterId, history } = await req.json();

  const char = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];

  const locationContext = lat != null && lng != null
    ? `The user's current GPS location is approximately ${lat.toFixed(5)}, ${lng.toFixed(5)}.`
    : "GPS location is unavailable.";

  const systemPrompt = `You are ${char.name}, a friendly AR guide character. You are ${char.personality}.
${locationContext}
You can see what the user's camera is looking at in the attached image (if provided).
Help with directions, translations, or anything the user asks.
When giving directions, be specific — reference street names, landmarks, and distances.
Keep responses to 2-3 short sentences max. Be warm and direct.`;

  const contentBlocks: Anthropic.MessageParam["content"] = [];

  if (imageBase64) {
    contentBlocks.push({
      type: "image",
      source: { type: "base64", media_type: mimeType ?? "image/jpeg", data: imageBase64 },
    });
  }
  contentBlocks.push({ type: "text", text: message });

  const messages: Anthropic.MessageParam[] = [
    ...(history ?? []),
    { role: "user", content: contentBlocks },
  ];

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system: systemPrompt,
    messages,
  });

  const reply = response.content[0].type === "text" ? response.content[0].text : "";
  return NextResponse.json({ reply, characterName: char.name });
}
