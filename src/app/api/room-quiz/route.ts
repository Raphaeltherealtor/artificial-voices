import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export type QuizType =
  | "name-it"          // "What is this called in [lang]?" (for a specific object)
  | "sentence-build"   // "Make a sentence in [lang] using the word for [object]"
  | "translate-word"   // Show a foreign word → "What does X mean?"
  | "multi-name"       // "Name 3 objects you can see in [lang]"
  | "scene-question";  // Generated from full scene — any type

export interface RoomQuestion {
  type: QuizType;
  prompt: string;               // question shown to user
  targetObject?: string;        // English label (for name-it questions)
  expectedAnswer: string;       // what we're looking for
  hint?: string;                // optional hint
  acceptVariants?: string[];    // other acceptable answers
}

export async function POST(req: NextRequest) {
  const { action, imageBase64, mimeType, language, objects, targetObject, userAnswer, expectedAnswer, questionType } = await req.json();

  // ── Generate a quiz question from scene ────────────────────────────────────
  if (action === "generate") {
    const objectList = Array.isArray(objects) && objects.length > 0
      ? objects.map((o: { label: string }) => o.label).join(", ")
      : "various objects";

    const type: QuizType = questionType ?? pickType();
    let prompt = "";

    if (type === "name-it" && targetObject) {
      prompt = `Generate a "name it" quiz question for a ${language} learner.
The user's camera can see: ${objectList}
Focus on this specific object: "${targetObject}"

Return ONLY valid JSON:
{
  "type": "name-it",
  "prompt": "What is '${targetObject}' called in ${language}?",
  "targetObject": "${targetObject}",
  "expectedAnswer": "(the word in ${language})",
  "hint": "(a brief hint or memory tip)",
  "acceptVariants": ["(alternate spellings or forms if any)"]
}`;
    } else if (type === "sentence-build") {
      prompt = `Generate a sentence-building challenge for a ${language} learner.
The user's camera can see: ${objectList}
Pick one visible object and ask them to make a sentence in ${language} using that word.

Return ONLY valid JSON:
{
  "type": "sentence-build",
  "prompt": "(instruction in English, e.g. 'Make a sentence in ${language} using the word for [object]')",
  "targetObject": "(the English object name you chose)",
  "expectedAnswer": "(example correct sentence in ${language})",
  "hint": "(the word for that object in ${language})"
}`;
    } else if (type === "translate-word") {
      prompt = `Generate a translation quiz for a ${language} learner.
The user's camera can see: ${objectList}
Pick one visible object. Show its ${language} word and ask what it means in English.

Return ONLY valid JSON:
{
  "type": "translate-word",
  "prompt": "(e.g. 'What does \\"[word in ${language}]\\" mean?')",
  "targetObject": "(the English object name)",
  "expectedAnswer": "(the English word)",
  "hint": "(a short contextual hint)"
}`;
    } else {
      // scene-question: pick any type based on scene
      prompt = `You are generating an interactive ${language} learning quiz question based on what a learner's camera sees.
Visible objects: ${objectList}

Pick the most engaging question type from: name-it, sentence-build, translate-word.
Make it feel like a natural language challenge, not a textbook exercise.

Return ONLY valid JSON:
{
  "type": "(name-it | sentence-build | translate-word)",
  "prompt": "(engaging question in English)",
  "targetObject": "(the English object this question focuses on)",
  "expectedAnswer": "(the expected answer — ${language} word, sentence, or English translation)",
  "hint": "(helpful hint without giving away the answer)",
  "acceptVariants": ["(other acceptable answers if any)"]
}`;
    }

    const imgContent: Anthropic.MessageParam["content"] = imageBase64
      ? [{ type: "image", source: { type: "base64", media_type: mimeType ?? "image/jpeg", data: imageBase64 } },
         { type: "text", text: prompt }]
      : [{ type: "text", text: prompt }];

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: imgContent }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    try {
      const clean = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
      return NextResponse.json(JSON.parse(clean) as RoomQuestion);
    } catch {
      return NextResponse.json({ error: "parse", raw }, { status: 500 });
    }
  }

  // ── Evaluate a user's answer ────────────────────────────────────────────────
  if (action === "evaluate") {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `You are evaluating a ${language} learner's quiz answer.

Question: ${expectedAnswer ? `The correct/expected answer is: "${expectedAnswer}"` : "(open-ended)"}
User's answer: "${userAnswer}"

Is the user's answer correct or acceptable (allow minor spelling errors, accent marks, informal variants)?
For sentence-building questions, accept any grammatically reasonable sentence that uses the target word correctly.

Return ONLY valid JSON:
{"correct": true/false, "feedback": "(1 sentence: why correct/wrong)", "model": "(show the ideal answer if wrong)"}`,
      }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    try {
      const clean = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
      return NextResponse.json(JSON.parse(clean));
    } catch {
      return NextResponse.json({ error: "parse", raw }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

function pickType(): QuizType {
  const types: QuizType[] = ["name-it", "sentence-build", "translate-word"];
  return types[Math.floor(Math.random() * types.length)];
}
