"use client";
import Link from "next/link";
import { STORY_LIST } from "@/data/stories";

const SERIES_COLORS: Record<string, string> = {
  cooking:    "from-orange-900/70 to-amber-800/40 border-orange-500/30",
  bar:        "from-violet-900/70 to-purple-800/40 border-violet-500/30",
  doctor:     "from-blue-900/70 to-cyan-800/40 border-blue-500/30",
  restaurant: "from-rose-900/70 to-pink-800/40 border-rose-500/30",
  clothes:    "from-fuchsia-900/70 to-pink-800/40 border-fuchsia-500/30",
};

export default function StoryPage() {
  return (
    <main className="min-h-screen bg-black px-4 pt-14 pb-24">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <p className="text-white/40 text-xs uppercase tracking-[0.2em] font-semibold mb-1">Story Mode</p>
          <h1 className="text-white text-3xl font-black leading-tight">Choose your adventure</h1>
          <p className="text-white/40 text-sm mt-2 leading-relaxed">
            Follow a story from start to finish — real conversations, AR challenges, and vocabulary that builds naturally.
          </p>
        </div>

        <div className="space-y-3">
          {STORY_LIST.map(series => {
            const colors = SERIES_COLORS[series.id] ?? "from-white/10 to-white/5 border-white/10";
            return (
              <Link
                key={series.id}
                href={`/story/${series.id}/1`}
                className={`flex items-center gap-4 bg-gradient-to-br ${colors} border rounded-3xl p-5 active:scale-98 transition`}
              >
                <span className="text-5xl shrink-0">{series.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-lg leading-tight">{series.title}</p>
                  <p className="text-white/40 text-xs mt-0.5 leading-snug">{series.tagline}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="text-[10px] bg-white/10 text-white/50 px-2 py-0.5 rounded-full">
                      {series.chapters.length} chapters
                    </span>
                    <span className="text-[10px] bg-white/10 text-white/50 px-2 py-0.5 rounded-full">
                      {series.chapters.reduce((n, c) => n + c.steps.length, 0)} steps
                    </span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-white/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            );
          })}
        </div>

        {/* Info */}
        <div className="mt-8 bg-white/5 rounded-3xl p-5 space-y-3 border border-white/8">
          <p className="text-white font-semibold text-sm">How story mode works</p>
          {[
            ["📖", "Follow a real-life narrative across multiple chapters"],
            ["💬", "NPC characters speak entirely in your target language"],
            ["📱", "AR challenges ask you to find real objects with your camera"],
            ["🎤", "Practice speaking — the app listens and gives feedback"],
            ["📈", "Difficulty increases naturally as the story progresses"],
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
