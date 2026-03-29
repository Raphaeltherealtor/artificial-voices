"use client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import RewardModal from "@/components/RewardModal";
import { UNITS, LANG_DEFS } from "@/data/curriculum";
import { useProgress } from "@/hooks/useProgress";
import { useState } from "react";

export default function LangPage() {
  const { lang } = useParams<{ lang: string }>();
  const router = useRouter();
  const langDef = LANG_DEFS.find(l => l.code === lang);
  const { getUnitStats, isUnitUnlocked, isLessonUnlocked, isChallengeUnlocked, getLessonRecord, isChallengeComplete, isRewardReady, claimReward, rewards } = useProgress();
  const [rewardUnit, setRewardUnit] = useState<typeof UNITS[0] | null>(null);

  if (!langDef) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Language not found</div>;

  return (
    <div className="min-h-screen bg-black pb-28">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-white/10 active:scale-90 transition">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-3xl">{langDef.flag}</span>
        <div>
          <h1 className="text-xl font-black text-white">{langDef.name}</h1>
          <p className="text-white/40 text-xs">{langDef.nativeName}</p>
        </div>
      </div>

      {/* Units */}
      <div className="px-4 space-y-4">
        {UNITS.map(unit => {
          const unlocked = isUnitUnlocked(lang, unit.id);
          const stats = getUnitStats(lang, unit.id);
          const challengeUnlocked = isChallengeUnlocked(lang, unit.id);
          const challengeDone = isChallengeComplete(lang, unit.id);
          const rewardReady = isRewardReady(lang, unit.id);
          const rewardClaimed = rewards[`${unit.id}`] ?? false;

          return (
            <div key={unit.id} className={`rounded-2xl overflow-hidden border ${unlocked ? "border-white/10" : "border-white/5"}`}>
              {/* Unit header */}
              <div className={`bg-gradient-to-r ${unlocked ? unit.color : "from-white/5 to-white/5"} px-4 py-3 flex items-center gap-3`}>
                <span className="text-2xl">{unit.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${unlocked ? "text-white" : "text-white/30"}`}>Unit {unit.id}: {unit.title}</p>
                  <p className={`text-xs ${unlocked ? "text-white/70" : "text-white/25"}`}>{unit.description}</p>
                </div>
                {!unlocked && <span className="text-white/30 text-lg">🔒</span>}
                {unlocked && <span className="text-white/60 text-xs font-medium">{stats.done}/{stats.total}</span>}
              </div>

              {/* Lessons */}
              {unlocked && (
                <div className="bg-white/[0.03] divide-y divide-white/5">
                  {unit.lessons.map((lesson, idx) => {
                    const rec = getLessonRecord(lang, unit.id, lesson.id);
                    const lessonUnlocked = isLessonUnlocked(lang, unit.id, idx);
                    const typeIcon = lesson.type === "vocab" ? "📖" : lesson.type === "grammar" ? "✏️" : "🔄";
                    return (
                      <button
                        key={lesson.id}
                        disabled={!lessonUnlocked}
                        onClick={() => lessonUnlocked && router.push(`/lesson/${lang}-${unit.id}-${lesson.id}`)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left disabled:opacity-40 active:bg-white/5 transition"
                      >
                        <span className="text-lg w-7 text-center">{rec.completed ? "✅" : lessonUnlocked ? typeIcon : "🔒"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{lesson.title}</p>
                          <p className="text-white/40 text-xs capitalize">{lesson.type} · {lesson.xp} XP</p>
                        </div>
                        {rec.completed && (
                          <div className="flex gap-0.5 shrink-0">
                            {[1,2,3].map(s => <span key={s} className={`text-xs ${s <= rec.stars ? "text-yellow-400" : "text-white/15"}`}>★</span>)}
                          </div>
                        )}
                        {lessonUnlocked && !rec.completed && <span className="text-white/30 text-sm shrink-0">→</span>}
                      </button>
                    );
                  })}

                  {/* AR Challenge */}
                  <Link
                    href={challengeUnlocked ? `/challenge/${lang}-${unit.id}` : "#"}
                    onClick={e => !challengeUnlocked && e.preventDefault()}
                    className={`flex items-center gap-3 px-4 py-3 ${challengeUnlocked ? "active:bg-white/5" : "opacity-40 pointer-events-none"} transition`}
                  >
                    <span className="text-lg w-7 text-center">{challengeDone ? "🏆" : challengeUnlocked ? "📷" : "🔒"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold">{unit.challenge.title} <span className="text-white/40 font-normal">(AR Challenge)</span></p>
                      <p className="text-white/40 text-xs">Complete all lessons to unlock · {unit.challenge.xp} XP</p>
                    </div>
                    {challengeDone && <span className="text-yellow-400 text-xs font-bold shrink-0">Done!</span>}
                    {challengeUnlocked && !challengeDone && <span className="text-white/30 text-sm shrink-0">→</span>}
                  </Link>

                  {/* Reward row */}
                  <button
                    onClick={() => setRewardUnit(unit)}
                    disabled={!rewardReady && !rewardClaimed}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${(rewardReady || rewardClaimed) ? "active:bg-white/5" : "opacity-30"}`}
                  >
                    <span className="text-lg w-7 text-center">{rewardClaimed ? unit.reward.emoji : rewardReady ? "🎁" : "🔒"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold">{unit.reward.sponsor} Reward</p>
                      <p className="text-white/40 text-xs">{rewardClaimed ? unit.reward.code : unit.reward.offer}</p>
                    </div>
                    {rewardReady && !rewardClaimed && <span className="text-yellow-400 text-xs font-bold animate-pulse shrink-0">Claim!</span>}
                    {rewardClaimed && <span className="text-green-400 text-xs font-bold shrink-0">Claimed ✓</span>}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {rewardUnit && (
        <RewardModal
          unit={rewardUnit}
          onClose={() => setRewardUnit(null)}
          onClaim={() => claimReward(rewardUnit.id)}
          claimed={rewards[`${rewardUnit.id}`] ?? false}
        />
      )}

      <BottomNav />
    </div>
  );
}
