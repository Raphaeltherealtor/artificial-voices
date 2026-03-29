"use client";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { LANG_DEFS } from "@/data/curriculum";
import { useProgress } from "@/hooks/useProgress";

export default function LearnPage() {
  const { getLangStats } = useProgress();

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <h1 className="text-2xl font-black text-white">Choose a Language</h1>
        <p className="text-white/40 text-sm mt-1">10 languages · 10 units · 30 lessons each</p>
      </div>

      {/* Language grid */}
      <div className="px-4 grid grid-cols-2 gap-3">
        {LANG_DEFS.map(lang => {
          const stats = getLangStats(lang.code);
          return (
            <Link
              key={lang.code}
              href={`/learn/${lang.code}`}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 active:scale-95 transition hover:bg-white/10"
            >
              <div className="flex items-center gap-2">
                <span className="text-3xl">{lang.flag}</span>
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm truncate">{lang.name}</p>
                  <p className="text-white/40 text-xs">{lang.nativeName}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-white/40 text-xs">{stats.done}/{stats.total} lessons</span>
                  <span className="text-white/40 text-xs">{stats.pct}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${stats.pct}%` }}
                  />
                </div>
              </div>

              {stats.done === 0 && (
                <span className="text-xs text-white/50 font-medium">Start →</span>
              )}
              {stats.done > 0 && stats.done < stats.total && (
                <span className="text-xs text-white/70 font-medium">Continue →</span>
              )}
              {stats.done === stats.total && stats.total > 0 && (
                <span className="text-xs text-yellow-400 font-bold">Complete ✓</span>
              )}
            </Link>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
