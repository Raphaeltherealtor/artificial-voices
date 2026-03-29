"use client";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { UNITS, LANG_DEFS } from "@/data/curriculum";
import { useProgress } from "@/hooks/useProgress";

function XPCounter({ target }: { target: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let current = 0;
    const step = Math.max(1, Math.floor(target / 40));
    const t = setInterval(() => {
      current = Math.min(current + step, target);
      setVal(current);
      if (current >= target) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, [target]);
  return <span>{val.toLocaleString()}</span>;
}

export default function RewardsPage() {
  const { totalXP, rewards, getLangStats, getUnitStats, isChallengeComplete } = useProgress();
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const claimedUnitIds = Object.keys(rewards).filter(k => rewards[k]).map(Number);

  // Calculate level
  const level = Math.floor(totalXP / 500) + 1;
  const xpForNextLevel = level * 500;
  const xpPct = Math.min(100, Math.round(((totalXP % 500) / 500) * 100));

  return (
    <div className="min-h-screen bg-black pb-28">
      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <h1 className="text-2xl font-black text-white">Rewards</h1>
        <p className="text-white/40 text-sm mt-1">Earn XP, collect discount codes from sponsors</p>
      </div>

      {/* XP Card */}
      <div className="mx-4 bg-gradient-to-br from-yellow-600/30 to-amber-800/20 border border-yellow-500/20 rounded-3xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white/40 text-xs uppercase tracking-widest">Total XP</p>
            <p className="text-yellow-400 font-black text-4xl"><XPCounter target={totalXP} /></p>
          </div>
          <div className="text-right">
            <p className="text-white/40 text-xs">Level</p>
            <p className="text-white font-black text-4xl">{level}</p>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-white/40 mb-1">
            <span>{totalXP % 500} / 500 XP</span>
            <span>→ Level {level + 1}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-400 rounded-full transition-all duration-1000" style={{ width: `${xpPct}%` }} />
          </div>
        </div>
      </div>

      {/* Progress across languages */}
      <div className="mx-4 mb-4">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Your Progress</p>
        <div className="space-y-2">
          {LANG_DEFS.map(lang => {
            const stats = getLangStats(lang.code);
            if (stats.done === 0) return null;
            return (
              <div key={lang.code} className="bg-white/5 rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="text-2xl">{lang.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1">
                    <p className="text-white text-sm font-semibold">{lang.name}</p>
                    <p className="text-white/40 text-xs">{stats.done}/{stats.total}</p>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full" style={{ width: `${stats.pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
          {LANG_DEFS.every(l => getLangStats(l.code).done === 0) && (
            <p className="text-white/30 text-sm text-center py-4">Complete lessons to see your progress here</p>
          )}
        </div>
      </div>

      {/* Earned Rewards */}
      <div className="mx-4 mb-4">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3">
          Earned Rewards {claimedUnitIds.length > 0 && `(${claimedUnitIds.length})`}
        </p>
        {claimedUnitIds.length === 0 ? (
          <div className="bg-white/5 rounded-2xl p-6 text-center">
            <p className="text-3xl mb-2">🎁</p>
            <p className="text-white/40 text-sm">Complete all lessons in a unit to unlock sponsor rewards</p>
          </div>
        ) : (
          <div className="space-y-3">
            {claimedUnitIds.map(uid => {
              const unit = UNITS.find(u => u.id === uid);
              if (!unit) return null;
              return (
                <div key={uid} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                  <span className="text-2xl shrink-0">{unit.reward.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">{unit.reward.sponsor}</p>
                    <p className="text-white/50 text-xs">{unit.reward.offer}</p>
                    <p className="text-white/30 font-mono text-xs mt-1">{unit.reward.code}</p>
                  </div>
                  <button
                    onClick={() => copyCode(unit.reward.code)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 shrink-0 ${
                      copied === unit.reward.code ? "bg-green-500 text-white" : "bg-white text-black"
                    }`}
                  >
                    {copied === unit.reward.code ? "✓" : "Copy"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* All possible rewards (locked) */}
      <div className="mx-4">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3">All Rewards to Unlock</p>
        <div className="space-y-2">
          {UNITS.map(unit => {
            const claimed = rewards[`${unit.id}`] ?? false;
            return (
              <div key={unit.id} className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${claimed ? "bg-white/10" : "bg-white/[0.03]"}`}>
                <span className={`text-xl ${claimed ? "" : "grayscale opacity-40"}`}>{unit.reward.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${claimed ? "text-white" : "text-white/40"}`}>{unit.reward.sponsor}</p>
                  <p className={`text-xs ${claimed ? "text-white/50" : "text-white/20"}`}>{unit.reward.value} · Unit {unit.id}: {unit.title}</p>
                </div>
                {claimed ? <span className="text-green-400 text-xs font-bold shrink-0">Claimed ✓</span> : <span className="text-white/20 text-sm shrink-0">🔒</span>}
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
