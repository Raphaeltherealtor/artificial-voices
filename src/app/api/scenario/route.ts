import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { TranslationEntry } from "@/app/api/identify/route";

const client = new Anthropic();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScenarioQuizQuestion {
  type: "mc" | "fill";
  prompt: string;             // NPC says this to introduce the question
  npcLine: string;            // NPC line in target language
  targetWord?: string;        // the English word being quizzed
  answer: string;             // correct answer in target language (or English for translate-back)
  options?: string[];         // always 4 when type === "mc"
  explanation: string;        // shown after answering
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, language } = body;

  // ── Translate all items in one shot ────────────────────────────────────────
  if (action === "translate-items") {
    const { items }: { items: { id: string; labelEn: string }[] } = body;
    const isJapanese  = language === "Japanese";
    const isChinese   = language === "Mandarin Chinese";
    const needsRoman  = !["Spanish", "French", "Portuguese", "German"].includes(language);
    const furiNote    = isJapanese ? ' "furi": "(hiragana reading if kanji present, else omit)",' : "";
    const romanNote   = needsRoman ? ' "roman": "(romanized pronunciation)",' : "";

    const prompt = `Translate these English words to ${language} for a language-learning app.
Return ONLY valid JSON — an object mapping each id to a translation object:
{
  ${items.map(i => `"${i.id}": { "native": "(word in ${language})",${romanNote}${furiNote} }`).join(",\n  ")}
}

Items to translate:
${items.map(i => `"${i.id}": "${i.labelEn}"`).join("\n")}

Rules:
- native: the natural word/phrase in ${language} script
${needsRoman ? `- roman: romanized pronunciation (pinyin for Mandarin, romaji for Japanese, IAST for Hindi, etc.)` : ""}
${isJapanese || isChinese ? "- furi: hiragana reading above kanji (Japanese only)" : ""}
- Return ONLY the JSON object, no other text`;

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "{}";
    try {
      const clean = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(clean) as Record<string, TranslationEntry>;
      return NextResponse.json({ translations: parsed });
    } catch {
      return NextResponse.json({ error: "parse", raw }, { status: 500 });
    }
  }

  // ── NPC greeting ───────────────────────────────────────────────────────────
  if (action === "greet") {
    const { scenarioId, npcRole, npcName } = body;
    const scenarioContext: Record<string, string> = {
      grocery:    "a busy grocery store. Greet the customer warmly and offer to help them find items or check out.",
      restaurant: "a cozy restaurant. Welcome the guest, tell them about the specials, and offer to take their order.",
      bar:        "a lively bar. Greet the customer and ask what they'd like to drink.",
      clothing:   "a clothing store. Welcome the shopper and offer to help them find their size or style.",
    };
    const context = scenarioContext[scenarioId] ?? "a shop.";

    const [mainRes, transRes] = await Promise.all([
      client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: `You are ${npcName}, a ${npcRole} at ${context}
Respond ONLY in ${language}. Keep it to 1-2 short sentences. Be warm and in-character.`,
        messages: [{ role: "user", content: "The customer just walked in." }],
      }),
      client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: "Translate the following to natural English. Return ONLY the translation.",
        messages: [{ role: "user", content: "The customer just walked in." }],
      }),
    ]);

    const reply = mainRes.content[0].type === "text" ? mainRes.content[0].text.trim() : "";
    let replyEnglish = "";
    if (reply) {
      const t = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: "Translate to natural English. Return ONLY the translation.",
        messages: [{ role: "user", content: reply }],
      });
      replyEnglish = t.content[0].type === "text" ? t.content[0].text.trim() : "";
    }
    void transRes;
    return NextResponse.json({ reply, replyEnglish, npcName });
  }

  // ── Checkout dialogue ──────────────────────────────────────────────────────
  if (action === "checkout") {
    const { scenarioId, npcRole, npcName, cartItems } = body as {
      scenarioId: string; npcRole: string; npcName: string;
      cartItems: { labelEn: string; translatedName: string; price: string }[];
    };
    void scenarioId;

    const itemList = cartItems.map(i => `${i.translatedName} (${i.labelEn}) — ${i.price || "?"}`).join(", ");
    const total = cartItems.reduce((sum, i) => {
      const n = parseFloat((i.price || "0").replace(/[^0-9.]/g, ""));
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
    const totalLine = `Total: $${total.toFixed(2)}`;

    const prompt = `The customer is checking out with: ${itemList}. Total is ${totalLine}.
As ${npcName} the ${npcRole}, process their checkout in ${language} (1-2 sentences). Tell them the total and thank them.`;

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: `You are ${npcName}. Respond ONLY in ${language}.`,
      messages: [{ role: "user", content: prompt }],
    });
    const reply = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";

    const t = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: "Translate to natural English. Return ONLY the translation.",
      messages: [{ role: "user", content: reply }],
    });
    const replyEnglish = t.content[0].type === "text" ? t.content[0].text.trim() : "";

    return NextResponse.json({ reply, replyEnglish, npcName, totalLine });
  }

  // ── Generate a quiz question ───────────────────────────────────────────────
  if (action === "quiz") {
    const { scenarioId, revealedItems, questionType = "mc" } = body as {
      scenarioId: string;
      revealedItems: { labelEn: string; nativeWord: string }[];
      questionType: "mc" | "fill";
    };
    void scenarioId;

    if (!revealedItems || revealedItems.length === 0) {
      return NextResponse.json({ error: "no items" }, { status: 400 });
    }

    const itemList = revealedItems.map(i => `"${i.labelEn}" → "${i.nativeWord}"`).join(", ");
    const isMC = questionType === "mc";

    const prompt = `Create a ${isMC ? "multiple-choice" : "fill-in-the-blank"} quiz question for a ${language} learner.
They have been looking at these items: ${itemList}

Return ONLY valid JSON:
{
  "type": "${questionType}",
  "prompt": "(question in English, e.g. 'How do you say apple in ${language}?')",
  "npcLine": "(how the NPC would ask this in ${language} — 1 short sentence)",
  "targetWord": "(the English word being quizzed)",
  "answer": "(correct answer in ${language})",
  ${isMC ? '"options": ["(correct answer)", "(wrong 1)", "(wrong 2)", "(wrong 3)"],' : ""}
  "explanation": "(1 sentence explaining the answer)"
}
${isMC ? "Shuffle the options array so the correct answer is not always first." : ""}`;

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    try {
      const clean = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
      return NextResponse.json(JSON.parse(clean) as ScenarioQuizQuestion);
    } catch {
      return NextResponse.json({ error: "parse", raw }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
