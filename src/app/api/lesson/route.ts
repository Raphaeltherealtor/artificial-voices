import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { LessonData } from "@/data/curriculum";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { language, topicId, lessonType, unitTitle, langCode } = await req.json();

  const topicHint = getTopicHint(topicId);
  let prompt = "";

  if (lessonType === "vocab") {
    prompt = `Generate a vocabulary lesson for learning ${language} (${langCode}).
Unit: "${unitTitle}" | Topic: ${topicHint}
Create 8 vocabulary items. For each include a natural example sentence.
${language} uses non-Latin script: include romanized/transliterated text in "romanized" field.

Return ONLY valid JSON, no markdown:
{
  "type": "vocab",
  "items": [
    {
      "word": "(word in ${language})",
      "english": "(English meaning)",
      "romanized": "(romanized/transliterated if applicable, else omit)",
      "gender": "(grammatical gender if applicable, else omit)",
      "example": "(natural sentence in ${language} using this word)",
      "exampleEn": "(English translation of that sentence)"
    }
  ],
  "cultureTip": "(1 interesting cultural note about this topic in ${language}-speaking cultures)",
  "quiz": [
    { "type": "mc", "prompt": "(question)", "options": ["A","B","C","D"], "answer": "(correct option text)", "explanation": "(why)" },
    { "type": "mc", "prompt": "...", "options": ["A","B","C","D"], "answer": "...", "explanation": "..." },
    { "type": "mc", "prompt": "...", "options": ["A","B","C","D"], "answer": "...", "explanation": "..." },
    { "type": "fill", "prompt": "(sentence with ___ blank)", "answer": "(word that goes in blank)", "explanation": "..." },
    { "type": "fill", "prompt": "...", "answer": "...", "explanation": "..." }
  ]
}`;
  } else if (lessonType === "grammar") {
    prompt = `Generate a grammar lesson for learning ${language}.
Unit: "${unitTitle}" | Topic: ${topicHint}

Return ONLY valid JSON, no markdown:
{
  "type": "grammar",
  "grammar": {
    "rule": "(the grammar rule name)",
    "explanation": "(clear 2-3 sentence explanation in plain English)",
    "keyPoints": ["(point 1)", "(point 2)", "(point 3)"],
    "examples": [
      { "target": "(sentence in ${language})", "english": "(translation)", "highlight": "(the key word/form being demonstrated)" },
      { "target": "...", "english": "...", "highlight": "..." },
      { "target": "...", "english": "...", "highlight": "..." },
      { "target": "...", "english": "...", "highlight": "..." },
      { "target": "...", "english": "...", "highlight": "..." }
    ]
  },
  "cultureTip": "(1 relevant cultural note)",
  "quiz": [
    { "type": "mc", "prompt": "(question about the grammar rule)", "options": ["A","B","C","D"], "answer": "...", "explanation": "..." },
    { "type": "mc", "prompt": "...", "options": ["A","B","C","D"], "answer": "...", "explanation": "..." },
    { "type": "fill", "prompt": "(sentence with ___ blank)", "answer": "...", "explanation": "..." },
    { "type": "fill", "prompt": "...", "answer": "...", "explanation": "..." },
    { "type": "mc", "prompt": "...", "options": ["A","B","C","D"], "answer": "...", "explanation": "..." }
  ]
}`;
  } else {
    // conjugation
    prompt = `Generate a conjugation lesson for learning ${language}.
Unit: "${unitTitle}" | Topic: ${topicHint}
Pick the most relevant verb for this topic.

Return ONLY valid JSON, no markdown:
{
  "type": "conjugation",
  "conjugation": {
    "verb": "(infinitive in ${language})",
    "verbEnglish": "(English meaning)",
    "tense": "(tense name in English)",
    "table": [
      { "pronoun": "(pronoun in ${language})", "pronounEn": "(English pronoun)", "form": "(conjugated form)" },
      { "pronoun": "...", "pronounEn": "...", "form": "..." },
      { "pronoun": "...", "pronounEn": "...", "form": "..." },
      { "pronoun": "...", "pronounEn": "...", "form": "..." },
      { "pronoun": "...", "pronounEn": "...", "form": "..." },
      { "pronoun": "...", "pronounEn": "...", "form": "..." }
    ],
    "notes": "(any irregular forms or special notes)",
    "examples": [
      { "target": "(sentence in ${language})", "english": "(translation)" },
      { "target": "...", "english": "..." },
      { "target": "...", "english": "..." }
    ]
  },
  "quiz": [
    { "type": "fill", "prompt": "(Conjugate: pronoun + verb = ___ )", "answer": "(correct form)", "explanation": "..." },
    { "type": "fill", "prompt": "...", "answer": "...", "explanation": "..." },
    { "type": "fill", "prompt": "...", "answer": "...", "explanation": "..." },
    { "type": "mc", "prompt": "(which form is correct?)", "options": ["A","B","C","D"], "answer": "...", "explanation": "..." },
    { "type": "mc", "prompt": "...", "options": ["A","B","C","D"], "answer": "...", "explanation": "..." }
  ]
}`;
  }

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  try {
    const clean = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
    const data: LessonData = JSON.parse(clean);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Parse failed", raw }, { status: 500 });
  }
}

function getTopicHint(topicId: string): string {
  const map: Record<string, string> = {
    greetings: "greetings, farewells, hello/goodbye/good morning/good night/please/thank you",
    numbers: "numbers 1 through 20 plus zero",
    tobe: "the verb 'to be' (identity, descriptions, location, states)",
    colors: "basic colors and shapes",
    objects: "common everyday household objects",
    possessives: "possessive adjectives: my, your, his, her, our, their",
    food: "common foods, drinks, and meal-related vocabulary",
    present: "present tense conjugation and usage",
    tohave: "the verb 'to have' (possession, relationships)",
    directions: "directions (left/right/straight), places (bank/store/hospital)",
    transport: "transportation: car, bus, train, plane, bike, walk",
    modals: "modal verbs: can, must, want, need, should",
    family: "family members: mother, father, sibling, grandparent, cousin",
    body: "body parts: head, eyes, hands, feet, etc.",
    adjectives: "descriptive adjectives: big/small, fast/slow, happy/sad, old/young",
    shopping: "shopping vocabulary: store, price, buy, sell, cheap, expensive",
    money: "numbers for money, how to ask prices, currency terms",
    towant: "the verb 'to want' (desires, requests, ordering)",
    time: "telling time: hours, minutes, morning/afternoon/evening",
    weather: "weather vocabulary and seasons",
    future: "future tense: will, going to, plans",
    restaurant: "restaurant vocabulary: menu, waiter, order, bill, reservation",
    ordering: "polite phrases for ordering food and making requests",
    irregular: "the 3-5 most common irregular verbs in this language",
    opinions: "vocabulary for expressing opinions, feelings, and emotions",
    agreement: "phrases for agreeing, disagreeing, and expressing uncertainty",
    past: "past tense: completed actions and recounting events",
    advanced: "advanced vocabulary for nuanced expression and formal contexts",
    complex: "complex sentence structures: subordinate clauses, conditionals",
    review: "comprehensive review of major verb conjugations",
  };
  return map[topicId] ?? topicId;
}
