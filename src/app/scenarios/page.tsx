"use client";
import Link from "next/link";
import { SCENARIO_LIST } from "@/data/scenarios";

const THEME_COLORS: Record<string, string> = {
  green:  "from-green-900/60 to-emerald-800/30  border-green-500/30",
  orange: "from-orange-900/60 to-amber-800/30   border-orange-500/30",
  yellow: "from-yellow-900/60 to-amber-800/30   border-yellow-500/30",
  pink:   "from-pink-900/60   to-rose-800/30    border-pink-500/30",
};

export default function ScenariosPage() {
  return (
    <main className="min-h-screen bg-black px-4 pt-14 pb-24">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <p className="text-white/40 text-xs uppercase tracking-[0.2em] font-semibold mb-1">AR Scenarios</p>
          <h1 className="text-white text-3xl font-black leading-tight">Step into a scene</h1>
          <p className="text-white/40 text-sm mt-2 leading-relaxed">
            Real-world conversations overlaid on your camera. Explore, shop, and practice with AI characters speaking your target language.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {SCENARIO_LIST.map(scenario => {
            const colors = THEME_COLORS[scenario.themeColor] ?? THEME_COLORS.green;
            return (
              <Link
                key={scenario.id}
                href={`/scenarios/${scenario.id}`}
                className={`relative bg-gradient-to-br ${colors} border rounded-3xl p-5 flex flex-col gap-3 active:scale-95 transition overflow-hidden`}
              >
                {/* Big emoji */}
                <span className="text-5xl">{scenario.emoji}</span>
                <div>
                  <p className="text-white font-bold text-base leading-tight">{scenario.title}</p>
                  <p className="text-white/40 text-xs mt-1 leading-snug">{scenario.tagline}</p>
                </div>
                {/* Item preview */}
                <div className="flex gap-1 flex-wrap">
                  {scenario.items.slice(0, 4).map(item => (
                    <span key={item.id} className="text-base">{item.emoji}</span>
                  ))}
                  {scenario.items.length > 4 && (
                    <span className="text-white/30 text-xs self-center">+{scenario.items.length - 4}</span>
                  )}
                </div>
                {/* NPC badge */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] bg-white/10 text-white/50 px-2 py-0.5 rounded-full capitalize">
                    {scenario.npcRole}: {scenario.npcName}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* What to expect */}
        <div className="mt-8 bg-white/5 rounded-3xl p-5 space-y-3 border border-white/8">
          <p className="text-white font-semibold text-sm">How it works</p>
          {[
            ["✦", "Glowing dots mark everything in the scene"],
            ["🔊", "Tap any dot to hear the word in your language"],
            ["🛒", "Add items to your cart (grocery & clothing)"],
            ["💬", "Talk with the NPC character — they reply in your language"],
            ["🎯", "Turn on Quiz Mode after exploring"],
          ].map(([icon, text]) => (
            <div key={text as string} className="flex gap-3 items-start">
              <span className="text-sm shrink-0">{icon}</span>
              <p className="text-white/50 text-xs leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
