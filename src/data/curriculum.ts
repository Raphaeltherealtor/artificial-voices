export type LessonType = "vocab" | "grammar" | "conjugation";

export interface LessonDef {
  id: string;       // topicId, used in route: /lesson/{lang}-{unitId}-{id}
  title: string;
  type: LessonType;
  xp: number;
}

export interface UnitDef {
  id: number;
  title: string;
  icon: string;
  description: string;
  color: string;
  lessons: LessonDef[];
  challenge: {
    title: string;
    instruction: string;
    targets: string[];   // objects for camera to find
    xp: number;
  };
  reward: {
    sponsor: string;
    offer: string;
    code: string;
    value: string;
    emoji: string;
  };
}

export const UNITS: UnitDef[] = [
  {
    id: 1, title: "First Steps", icon: "👋", description: "Greetings, numbers & the verb 'to be'",
    color: "from-blue-600 to-blue-800",
    lessons: [
      { id: "greetings", title: "Greetings & Farewells", type: "vocab", xp: 50 },
      { id: "numbers", title: "Numbers 1–20", type: "vocab", xp: 50 },
      { id: "tobe", title: "The Verb 'To Be'", type: "grammar", xp: 75 },
    ],
    challenge: { title: "Count It!", instruction: "Find and count 5 everyday objects — say each one aloud in the target language.", targets: ["chair", "table", "door", "window", "phone"], xp: 100 },
    reward: { sponsor: "Rosetta Stone", offer: "20% off your first month", code: "VOICES-RS20", value: "20% off", emoji: "🌹" },
  },
  {
    id: 2, title: "Your World", icon: "🌍", description: "Colors, objects & possessives",
    color: "from-emerald-600 to-emerald-800",
    lessons: [
      { id: "colors", title: "Colors & Shapes", type: "vocab", xp: 50 },
      { id: "objects", title: "Everyday Objects", type: "vocab", xp: 50 },
      { id: "possessives", title: "My, Your, His, Her", type: "grammar", xp: 75 },
    ],
    challenge: { title: "Color Hunt", instruction: "Spot 4 objects and describe each one: its color + its name in the target language.", targets: ["red", "blue", "green", "white"], xp: 100 },
    reward: { sponsor: "italki", offer: "$10 off your first tutoring session", code: "VOICES-ITK10", value: "$10 off", emoji: "👩‍🏫" },
  },
  {
    id: 3, title: "Daily Life", icon: "☀️", description: "Food, present tense & 'to have'",
    color: "from-orange-600 to-orange-800",
    lessons: [
      { id: "food", title: "Food & Drinks", type: "vocab", xp: 50 },
      { id: "present", title: "Present Tense", type: "grammar", xp: 75 },
      { id: "tohave", title: "Conjugating 'To Have'", type: "conjugation", xp: 100 },
    ],
    challenge: { title: "Food Finder", instruction: "Use the camera to find 3 food or drink items and name them in the target language.", targets: ["apple", "bottle", "cup", "bowl", "food"], xp: 100 },
    reward: { sponsor: "Babbel", offer: "50% off a 3-month subscription", code: "VOICES-BBL50", value: "50% off", emoji: "🗣️" },
  },
  {
    id: 4, title: "On the Move", icon: "🚗", description: "Directions, transport & modal verbs",
    color: "from-violet-600 to-violet-800",
    lessons: [
      { id: "directions", title: "Directions & Places", type: "vocab", xp: 50 },
      { id: "transport", title: "Transportation", type: "vocab", xp: 50 },
      { id: "modals", title: "Can, Must, Want", type: "grammar", xp: 75 },
    ],
    challenge: { title: "Navigate!", instruction: "Ask an AR companion for directions to a nearby place — entirely in the target language.", targets: ["street", "road", "car", "door", "sign"], xp: 150 },
    reward: { sponsor: "Pimsleur", offer: "7-day free audio lessons trial", code: "VOICES-PIM7", value: "1 week free", emoji: "🎧" },
  },
  {
    id: 5, title: "People", icon: "👥", description: "Family, body parts & adjectives",
    color: "from-pink-600 to-pink-800",
    lessons: [
      { id: "family", title: "Family Members", type: "vocab", xp: 50 },
      { id: "body", title: "Body Parts", type: "vocab", xp: 50 },
      { id: "adjectives", title: "Adjectives & Agreement", type: "grammar", xp: 75 },
    ],
    challenge: { title: "Describe It", instruction: "Point at 3 different things around you and describe each using adjectives from this unit.", targets: ["person", "face", "hand", "bag", "clothing"], xp: 100 },
    reward: { sponsor: "FluentU", offer: "1 month free immersion lessons", code: "VOICES-FLU30", value: "1 month free", emoji: "📺" },
  },
  {
    id: 6, title: "Shopping", icon: "🛍️", description: "Stores, prices & 'to want'",
    color: "from-yellow-600 to-yellow-800",
    lessons: [
      { id: "shopping", title: "Shops & Products", type: "vocab", xp: 50 },
      { id: "money", title: "Money & Prices", type: "vocab", xp: 50 },
      { id: "towant", title: "Conjugating 'To Want'", type: "conjugation", xp: 100 },
    ],
    challenge: { title: "Shop Scan", instruction: "Find 4 items you'd find in a store and name each one with an imaginary price in the target language.", targets: ["bag", "book", "phone", "box", "label"], xp: 100 },
    reward: { sponsor: "Preply", offer: "$20 off your first live lesson", code: "VOICES-PRE20", value: "$20 off", emoji: "💻" },
  },
  {
    id: 7, title: "Time & Weather", icon: "🌤️", description: "Telling time, weather & future tense",
    color: "from-sky-600 to-sky-800",
    lessons: [
      { id: "time", title: "Telling Time", type: "vocab", xp: 50 },
      { id: "weather", title: "Weather & Seasons", type: "vocab", xp: 50 },
      { id: "future", title: "Future Tense", type: "grammar", xp: 75 },
    ],
    challenge: { title: "Weather Report", instruction: "Look outside or at the sky and give a live weather report in the target language.", targets: ["sky", "window", "light", "shadow", "plant"], xp: 100 },
    reward: { sponsor: "Language Transfer", offer: "Share & unlock premium access", code: "VOICES-LT100", value: "Free access", emoji: "🎓" },
  },
  {
    id: 8, title: "At the Table", icon: "🍽️", description: "Restaurant vocab, ordering & irregular verbs",
    color: "from-red-600 to-red-800",
    lessons: [
      { id: "restaurant", title: "Restaurant Vocabulary", type: "vocab", xp: 50 },
      { id: "ordering", title: "Ordering Politely", type: "grammar", xp: 75 },
      { id: "irregular", title: "Irregular Verbs", type: "conjugation", xp: 100 },
    ],
    challenge: { title: "Table Scan", instruction: "Find 5 items on a table or in a kitchen and name them like a restaurant server would.", targets: ["cup", "plate", "spoon", "glass", "food"], xp: 100 },
    reward: { sponsor: "Clozemaster", offer: "1 month Pro free", code: "VOICES-CLZ30", value: "1 month free", emoji: "🧩" },
  },
  {
    id: 9, title: "Conversations", icon: "💬", description: "Opinions, feelings & past tense",
    color: "from-teal-600 to-teal-800",
    lessons: [
      { id: "opinions", title: "Opinions & Feelings", type: "vocab", xp: 75 },
      { id: "agreement", title: "Agreeing & Disagreeing", type: "grammar", xp: 75 },
      { id: "past", title: "Past Tense", type: "grammar", xp: 100 },
    ],
    challenge: { title: "Full Conversation", instruction: "Have a 5-exchange conversation with an AR companion entirely in the target language.", targets: [], xp: 200 },
    reward: { sponsor: "Anki", offer: "Premium language deck bundle", code: "VOICES-ANKI", value: "Free decks", emoji: "📚" },
  },
  {
    id: 10, title: "Mastery", icon: "🏆", description: "Advanced vocab, complex grammar & full review",
    color: "from-amber-500 to-amber-700",
    lessons: [
      { id: "advanced", title: "Advanced Vocabulary", type: "vocab", xp: 100 },
      { id: "complex", title: "Complex Sentences", type: "grammar", xp: 100 },
      { id: "review", title: "Full Conjugation Review", type: "conjugation", xp: 150 },
    ],
    challenge: { title: "Master Scan", instruction: "Walk through your space and name everything your camera sees in the target language.", targets: [], xp: 300 },
    reward: { sponsor: "Artificial Voices", offer: "Lifetime Premium — all languages unlocked", code: "VOICES-PREMIUM", value: "Lifetime", emoji: "🏅" },
  },
];

export const LANG_DEFS = [
  { code: "es", name: "Spanish",          flag: "🇪🇸", nativeName: "Español" },
  { code: "zh", name: "Mandarin Chinese", flag: "🇨🇳", nativeName: "普通话" },
  { code: "hi", name: "Hindi",            flag: "🇮🇳", nativeName: "हिन्दी" },
  { code: "ar", name: "Arabic",           flag: "🇸🇦", nativeName: "العربية" },
  { code: "fr", name: "French",           flag: "🇫🇷", nativeName: "Français" },
  { code: "pt", name: "Portuguese",       flag: "🇧🇷", nativeName: "Português" },
  { code: "ru", name: "Russian",          flag: "🇷🇺", nativeName: "Русский" },
  { code: "ja", name: "Japanese",         flag: "🇯🇵", nativeName: "日本語" },
  { code: "de", name: "German",           flag: "🇩🇪", nativeName: "Deutsch" },
  { code: "ko", name: "Korean",           flag: "🇰🇷", nativeName: "한국어" },
];

// Types for lesson content returned by /api/lesson
export interface VocabItem {
  word: string; english: string; romanized?: string; gender?: string;
  example: string; exampleEn: string;
}
export interface GrammarExample { target: string; english: string; highlight: string; }
export interface GrammarContent { rule: string; explanation: string; keyPoints: string[]; examples: GrammarExample[]; }
export interface ConjugationRow { pronoun: string; pronounEn: string; form: string; }
export interface ConjugationContent { verb: string; verbEnglish: string; tense: string; table: ConjugationRow[]; notes: string; examples: { target: string; english: string }[]; }
export interface QuizQuestion { type: "mc" | "fill"; prompt: string; options?: string[]; answer: string; explanation: string; }
export type LessonData =
  | { type: "vocab"; items: VocabItem[]; cultureTip: string; quiz: QuizQuestion[] }
  | { type: "grammar"; grammar: GrammarContent; cultureTip: string; quiz: QuizQuestion[] }
  | { type: "conjugation"; conjugation: ConjugationContent; quiz: QuizQuestion[] };
