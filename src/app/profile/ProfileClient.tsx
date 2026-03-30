"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { LearnerProfile } from "@/lib/supabase/types";
import type { User } from "@supabase/supabase-js";
import BottomNav from "@/components/BottomNav";

const LEVEL_EMOJI: Record<string, string> = {
  beginner: "🌱", intermediate: "🌿", advanced: "🌳",
};

export default function ProfileClient({ user, profile }: { user: User; profile: LearnerProfile }) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const stats = [
    { label: "Total XP",   value: profile.total_xp.toLocaleString(), emoji: "⚡" },
    { label: "Streak",     value: `${profile.streak_days}d`,          emoji: "🔥" },
    { label: "Scenarios",  value: profile.completed_scenarios.length,  emoji: "🎭" },
    { label: "Chapters",   value: profile.completed_story_chapters.length, emoji: "📖" },
  ];

  return (
    <main className="min-h-screen bg-black px-4 pt-14 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-3xl">
            {profile.target_language_flag}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-lg truncate">{user.email}</p>
            <p className="text-white/40 text-sm">
              {LEVEL_EMOJI[profile.current_level]} {profile.current_level} · {profile.target_language}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map(s => (
            <div key={s.label} className="bg-white/5 border border-white/8 rounded-2xl p-4">
              <p className="text-2xl mb-1">{s.emoji}</p>
              <p className="text-white text-2xl font-black">{s.value}</p>
              <p className="text-white/40 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Language */}
        <div className="bg-white/5 border border-white/8 rounded-2xl p-5 space-y-3">
          <p className="text-white font-semibold text-sm">Language Settings</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/40 text-xs">Learning</p>
              <p className="text-white font-bold">{profile.target_language_flag} {profile.target_language}</p>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-xs">Level</p>
              <p className="text-white font-bold capitalize">{profile.current_level}</p>
            </div>
          </div>
          <a href="/onboarding" className="block w-full text-center py-2.5 bg-white/8 rounded-xl text-white/60 text-sm active:bg-white/15 transition">
            Change language or level →
          </a>
        </div>

        {/* Weak vocab */}
        {profile.weak_vocabulary.length > 0 && (
          <div className="bg-white/5 border border-white/8 rounded-2xl p-5 space-y-3">
            <p className="text-white font-semibold text-sm">Words to Practice</p>
            <div className="flex flex-wrap gap-2">
              {profile.weak_vocabulary.slice(0, 12).map(w => (
                <span key={w} className="bg-orange-500/15 text-orange-300 text-xs px-3 py-1 rounded-full border border-orange-500/20">
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Account */}
        <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-5 py-4 text-red-400 active:bg-white/5 transition"
          >
            <span className="text-lg">🚪</span>
            <span className="font-semibold text-sm">Sign Out</span>
          </button>
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
