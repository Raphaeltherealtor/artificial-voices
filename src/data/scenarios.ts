import type { TranslationEntry } from "@/app/api/identify/route";

export type ScenarioId = "grocery" | "restaurant" | "bar" | "clothing";

export interface ScenarioItem {
  id: string;
  labelEn: string;
  emoji: string;
  x: number;          // base % left (0–100)
  y: number;          // base % top  (0–100)
  price?: string;
  hasCart: boolean;
  translation?: TranslationEntry;
}

export interface ScenarioDef {
  id: ScenarioId;
  title: string;
  emoji: string;
  tagline: string;
  themeColor: string;      // Tailwind color name for tint accents
  npcName: string;
  npcRole: string;         // "cashier" | "waiter" | "bartender" | "store clerk"
  npcX: number;            // % left
  npcY: number;            // % top
  npcCharDefIdx: number;   // 0=Hiro 1=Luna 2=Marco
  items: ScenarioItem[];
}

export const SCENARIOS: Record<ScenarioId, ScenarioDef> = {
  grocery: {
    id: "grocery",
    title: "Grocery Store",
    emoji: "🛒",
    tagline: "Browse the aisles & check out",
    themeColor: "green",
    npcName: "Yuki",
    npcRole: "cashier",
    npcX: 50,
    npcY: 78,
    npcCharDefIdx: 1,
    items: [
      { id: "apple",    labelEn: "apple",         emoji: "🍎", x: 14, y: 28, price: "$1.29", hasCart: true  },
      { id: "banana",   labelEn: "banana",        emoji: "🍌", x: 28, y: 38, price: "$0.79", hasCart: true  },
      { id: "milk",     labelEn: "milk",          emoji: "🥛", x: 74, y: 30, price: "$3.49", hasCart: true  },
      { id: "cheese",   labelEn: "cheese",        emoji: "🧀", x: 82, y: 42, price: "$4.99", hasCart: true  },
      { id: "bread",    labelEn: "bread",         emoji: "🥖", x: 50, y: 40, price: "$2.99", hasCart: true  },
      { id: "eggs",     labelEn: "eggs",          emoji: "🥚", x: 64, y: 52, price: "$3.99", hasCart: true  },
      { id: "water",    labelEn: "water bottle",  emoji: "💧", x: 20, y: 56, price: "$1.49", hasCart: true  },
      { id: "cart",     labelEn: "shopping cart", emoji: "🛒", x: 48, y: 62,                 hasCart: false },
    ],
  },

  restaurant: {
    id: "restaurant",
    title: "Restaurant",
    emoji: "🍽️",
    tagline: "Order your meal in a new language",
    themeColor: "orange",
    npcName: "Marco",
    npcRole: "waiter",
    npcX: 50,
    npcY: 78,
    npcCharDefIdx: 2,
    items: [
      { id: "menu",      labelEn: "menu",        emoji: "📋", x: 18, y: 28, hasCart: false },
      { id: "table",     labelEn: "table",       emoji: "🪑", x: 50, y: 48, hasCart: false },
      { id: "plate",     labelEn: "plate",       emoji: "🍽️", x: 50, y: 38, hasCart: false },
      { id: "glass",     labelEn: "glass",       emoji: "🥃", x: 78, y: 30, hasCart: false },
      { id: "fork",      labelEn: "fork",        emoji: "🍴", x: 36, y: 52, hasCart: false },
      { id: "knife",     labelEn: "knife",       emoji: "🔪", x: 64, y: 52, hasCart: false },
      { id: "napkin",    labelEn: "napkin",      emoji: "🧻", x: 22, y: 44, hasCart: false },
      { id: "bill",      labelEn: "bill / check", emoji: "🧾", x: 78, y: 55, hasCart: false },
    ],
  },

  bar: {
    id: "bar",
    title: "Bar",
    emoji: "🍺",
    tagline: "Order drinks & chat with the bartender",
    themeColor: "yellow",
    npcName: "Hiro",
    npcRole: "bartender",
    npcX: 50,
    npcY: 25,
    npcCharDefIdx: 0,
    items: [
      { id: "beer",      labelEn: "beer",      emoji: "🍺", x: 16, y: 32, price: "$6",  hasCart: false },
      { id: "cocktail",  labelEn: "cocktail",  emoji: "🍸", x: 34, y: 28, price: "$12", hasCart: false },
      { id: "wine",      labelEn: "wine",      emoji: "🍷", x: 54, y: 30, price: "$9",  hasCart: false },
      { id: "whiskey",   labelEn: "whiskey",   emoji: "🥃", x: 72, y: 32, price: "$10", hasCart: false },
      { id: "stool",     labelEn: "bar stool", emoji: "🪑", x: 20, y: 62, hasCart: false },
      { id: "snacks",    labelEn: "snacks",    emoji: "🍿", x: 42, y: 48, price: "$4",  hasCart: false },
      { id: "coaster",   labelEn: "coaster",   emoji: "⭕", x: 62, y: 50, hasCart: false },
      { id: "counter",   labelEn: "bar counter", emoji: "🪨", x: 50, y: 40, hasCart: false },
    ],
  },

  clothing: {
    id: "clothing",
    title: "Clothing Store",
    emoji: "👕",
    tagline: "Shop for clothes & try the dressing room",
    themeColor: "pink",
    npcName: "Luna",
    npcRole: "store clerk",
    npcX: 50,
    npcY: 78,
    npcCharDefIdx: 1,
    items: [
      { id: "tshirt",   labelEn: "t-shirt",      emoji: "👕", x: 15, y: 28, price: "$19.99", hasCart: true  },
      { id: "jeans",    labelEn: "jeans",         emoji: "👖", x: 32, y: 36, price: "$49.99", hasCart: true  },
      { id: "dress",    labelEn: "dress",         emoji: "👗", x: 56, y: 28, price: "$59.99", hasCart: true  },
      { id: "shoes",    labelEn: "shoes",         emoji: "👟", x: 74, y: 38, price: "$79.99", hasCart: true  },
      { id: "jacket",   labelEn: "jacket",        emoji: "🧥", x: 22, y: 50, price: "$89.99", hasCart: true  },
      { id: "bag",      labelEn: "bag",           emoji: "👜", x: 70, y: 52, price: "$39.99", hasCart: true  },
      { id: "mirror",   labelEn: "mirror",        emoji: "🪞", x: 48, y: 56, hasCart: false },
      { id: "hanger",   labelEn: "hanger",        emoji: "🪝", x: 82, y: 55, hasCart: false },
    ],
  },
};

export const SCENARIO_LIST: ScenarioDef[] = Object.values(SCENARIOS);
