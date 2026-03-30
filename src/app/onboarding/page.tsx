"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LANGUAGES = [
  { name: "Spanish",          flag: "🇪🇸" },
  { name: "Mandarin Chinese", flag: "🇨🇳" },
  { name: "Hindi",            flag: "🇮🇳" },
  { name: "Arabic",           flag: "🇸🇦" },
  { name: "French",           flag: "🇫🇷" },
  { name: "Portuguese",       flag: "🇧🇷" },
  { name: "Russian",          flag: "🇷🇺" },
  { name: "Japanese",         flag: "🇯🇵" },
  { name: "German",           flag: "🇩🇪" },
  { name: "Korean",           flag: "🇰🇷" },
];

const GOALS = [
  { id: "travel",   label: "Travel",    emoji: "✈️", desc: "Get around, order food, ask directions" },
  { id: "social",   label: "Social",    emoji: "🗣️", desc: "Make friends, small talk, dating" },
  { id: "work",     label: "Work",      emoji: "💼", desc: "Emails, meetings, presentations" },
  { id: "culture",  label: "Culture",   emoji: "🎭", desc: "Movies, music, literature" },
  { id: "survival", label: "Survival",  emoji: "🏥", desc: "Doctor, emergencies, essentials" },
];

const LEVELS = [
  { id: "beginner",     label: "Beginner",     emoji: "🌱", desc: "I know a few words" },
  { id: "intermediate", label: "Intermediate", emoji: "🌿", desc: "I can hold basic conversations" },
  { id: "advanced",     label: "Advanced",     emoji: "🌳", desc: "I'm fairly fluent, want to polish" },
];

type Step = "language" | "goal" | "level" | "saving";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("language");
  const [targetLang, setTargetLang] = useState<{ name: string; flag: string } | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced" | null>(null);
  const [error, setError] = useState("");

  const save = async (chosenLevel: "beginner" | "intermediate" | "advanced") => {
    setStep("saving");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { error } = await supabase
      .from("learner_profiles")
      .upsert({
        user_id: user.id,
        target_language: targetLang!.name,
        target_language_flag: targetLang!.flag,
        current_level: chosenLevel,
        preferred_mode: "adaptive",
        last_active_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (error) { setError(error.message); setStep("level"); return; }
    router.push("/");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-black flex flex-col px-6 pt-16 pb-10">
      <div className="max-w-sm mx-auto w-full flex-1 flex flex-col">

        {/* Progress dots */}
        <div className="flex gap-2 justify-center mb-10">
          {(["language", "goal", "level"] as Step[]).map((s, i) => (
            <div key={s} className={`h-1.5 rounded-full transition-all ${
              s === step ? "w-8 bg-white" :
              ["language","goal","level"].indexOf(s) < ["language","goal","level"].indexOf(step) ? "w-4 bg-white/50" :
              "w-4 bg-white/15"
            }`} />
          ))}
        </div>

        {/* ── Step 1: Language ── */}
        {step === "language" && (
          <div className="flex-1 flex flex-col">
            <div className="mb-8">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Step 1 of 3</p>
              <h2 className="text-white text-3xl font-black leading-tight">What language do you want to learn?</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 flex-1">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.name}
                  onClick={() => { setTargetLang(lang); setStep("goal"); }}
                  className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-4 active:bg-white/10 active:scale-95 transition text-left"
                >
                  <span className="text-3xl">{lang.flag}</span>
                  <span className="text-white font-semibold text-sm">{lang.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Goal ── */}
        {step === "goal" && (
          <div className="flex-1 flex flex-col">
            <div className="mb-8">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Step 2 of 3</p>
              <h2 className="text-white text-3xl font-black leading-tight">What&apos;s your main goal?</h2>
              <p className="text-white/40 text-sm mt-2">Learning {targetLang?.flag} {targetLang?.name}</p>
            </div>
            <div className="space-y-3 flex-1">
              {GOALS.map(g => (
                <button
                  key={g.id}
                  onClick={() => { setGoal(g.id); setStep("level"); }}
                  className="w-full flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 active:bg-white/10 active:scale-98 transition text-left"
                >
                  <span className="text-3xl">{g.emoji}</span>
                  <div>
                    <p className="text-white font-bold">{g.label}</p>
                    <p className="text-white/40 text-xs">{g.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 3: Level ── */}
        {step === "level" && (
          <div className="flex-1 flex flex-col">
            <div className="mb-8">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Step 3 of 3</p>
              <h2 className="text-white text-3xl font-black leading-tight">What&apos;s your current level?</h2>
            </div>
            <div className="space-y-3 flex-1">
              {LEVELS.map(l => (
                <button
                  key={l.id}
                  onClick={() => save(l.id as "beginner" | "intermediate" | "advanced")}
                  className="w-full flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-5 py-5 active:bg-white/10 active:scale-98 transition text-left"
                >
                  <span className="text-4xl">{l.emoji}</span>
                  <div>
                    <p className="text-white font-bold text-lg">{l.label}</p>
                    <p className="text-white/40 text-sm">{l.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}
          </div>
        )}

        {/* ── Saving ── */}
        {step === "saving" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white/60 text-sm">Setting up your profile…</p>
          </div>
        )}

      </div>
    </main>
  );
}
