import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { StoryStep } from "@/data/stories";

const client = new Anthropic();

// ── Helpers ───────────────────────────────────────────────────────────────────

function needsRomanized(language: string) {
  return !["Spanish", "French", "Portuguese", "German"].includes(language);
}

function romanField(language: string) {
  return needsRomanized(language) ? ' "roman": "(romanized pronunciation)",' : "";
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, language } = body as { action: string; language: string };

  // ── Generate NPC line for a scene/say/choice/ar-circle step ───────────────
  if (action === "npc-line") {
    const { step, seriesTitle, chapterTitle } = body as {
      step: StoryStep;
      seriesTitle: string;
      chapterTitle: string;
    };

    const roman = romanField(language);
    const isJapanese = language === "Japanese";
    const furiField = isJapanese ? ' "furi": "(hiragana reading for kanji, if any)",' : "";

    const prompt = `You are ${step.npcName}, a character in a language-learning story called "${seriesTitle}" (chapter: "${chapterTitle}").
Context: ${step.sceneContext}
Your intention: ${step.npcIntentEn}
Target language: ${language}

Speak ONLY in ${language}. Keep it short (1–2 sentences). Be warm, natural, and in-character.
Then return a JSON object with ONLY these fields:
{
  "line": "(your ${language} dialogue)",${roman}${furiField}
  "lineEn": "(natural English translation of your line)"
}
Return ONLY the JSON, no other text.`;

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "{}";
    try {
      const clean = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
      return NextResponse.json(JSON.parse(clean));
    } catch {
      return NextResponse.json({ error: "parse", raw }, { status: 500 });
    }
  }

  // ── Translate choices for a quiz/choice step ───────────────────────────────
  if (action === "translate-choices") {
    const { choices, context } = body as {
      choices: { textEn: string; correct: boolean }[];
      context: string;
    };

    const roman = romanField(language);

    const prompt = `Translate these answer options to ${language} for a language-learning quiz.
Context: ${context}

Return ONLY valid JSON — an array in the same order:
[
${choices.map(c => `  { "textEn": ${JSON.stringify(c.textEn)}, "text": "(${language} translation)",${roman} "correct": ${c.correct} }`).join(",\n")}
]
Return ONLY the JSON array, no other text.`;

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "[]";
    try {
      const clean = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
      return NextResponse.json({ choices: JSON.parse(clean) });
    } catch {
      return NextResponse.json({ error: "parse", raw }, { status: 500 });
    }
  }

  // ── Translate target phrase (for "say" steps) ─────────────────────────────
  if (action === "translate-phrase") {
    const { phraseEn, context } = body as { phraseEn: string; context: string };
    const roman = romanField(language);
    const isJapanese = language === "Japanese";
    const furiField = isJapanese ? ' "furi": "(hiragana reading)",' : "";

    const prompt = `Translate this English phrase to ${language} for a language learner.
Context: ${context}
Phrase: "${phraseEn}"

Return ONLY valid JSON:
{ "text": "(natural ${language} translation)",${roman}${furiField} "textEn": "${phraseEn}" }
Return ONLY the JSON, no other text.`;

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "{}";
    try {
      const clean = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
      return NextResponse.json(JSON.parse(clean));
    } catch {
      return NextResponse.json({ error: "parse", raw }, { status: 500 });
    }
  }

  // ── Evaluate user's spoken/typed phrase ───────────────────────────────────
  if (action === "evaluate") {
    const { userInput, targetPhraseEn, targetNative, context } = body as {
      userInput: string;
      targetPhraseEn: string;
      targetNative: string;
      context: string;
    };

    const prompt = `A language learner is trying to say: "${targetPhraseEn}" in ${language} (native: "${targetNative}").
They said or typed: "${userInput}"
Context: ${context}

Evaluate how close they were. Be generous — minor spelling/pronunciation variants are fine.
Return ONLY valid JSON:
{
  "correct": true/false,
  "score": 0-100,
  "feedback": "(1 short encouraging sentence in English)",
  "correction": "(the correct ${language} phrase, only if score < 80)"
}`;

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "{}";
    try {
      const clean = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
      return NextResponse.json(JSON.parse(clean));
    } catch {
      return NextResponse.json({ error: "parse", raw }, { status: 500 });
    }
  }

  // ── Translate vocab words ─────────────────────────────────────────────────
  if (action === "translate-vocab") {
    const { words } = body as { words: string[] };
    const roman = romanField(language);

    const prompt = `Translate these English words/phrases to ${language}.
Return ONLY valid JSON — an object mapping each English word to a translation object:
{
${words.map(w => `  ${JSON.stringify(w)}: { "native": "(${language})",${roman} "en": ${JSON.stringify(w)} }`).join(",\n")}
}
Return ONLY the JSON object, no other text.`;

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "{}";
    try {
      const clean = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
      return NextResponse.json({ translations: JSON.parse(clean) });
    } catch {
      return NextResponse.json({ error: "parse", raw }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
