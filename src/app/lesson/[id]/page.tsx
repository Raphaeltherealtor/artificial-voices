"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { UNITS, LANG_DEFS, type LessonData, type QuizQuestion } from "@/data/curriculum";
import LessonScene from "@/components/LessonScene";
import { useProgress } from "@/hooks/useProgress";
import { speakText, isSynthesisSupported } from "@/utils/speech";

type Phase = "loading" | "content" | "quiz" | "results";

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3].map(s => (
        <span key={s} className={`text-4xl transition-all duration-300 ${s <= count ? "text-yellow-400 scale-110" : "text-white/15"}`}>★</span>
      ))}
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${(current / total) * 100}%` }} />
    </div>
  );
}

// ── Content Cards ─────────────────────────────────────────────────────────────

function SpeakBtn({ text, langName, size = "sm" }: { text: string; langName: string; size?: "sm" | "lg" }) {
  const [speaking, setSpeaking] = useState(false);
  if (!isSynthesisSupported()) return null;
  const handle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSpeaking(true);
    speakText(text, langName).finally(() => setSpeaking(false));
  };
  return (
    <button
      onClick={handle}
      className={`flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 transition shrink-0 ${size === "lg" ? "w-12 h-12" : "w-8 h-8"}`}
    >
      <span className={speaking ? "animate-pulse" : ""}>{size === "lg" ? "🔊" : "🔈"}</span>
    </button>
  );
}

function VocabCard({ item, flipped, onFlip, langName }: { item: NonNullable<Extract<LessonData, {type:"vocab"}>["items"]>[0]; flipped: boolean; onFlip: () => void; langName: string }) {
  // Auto-speak the word as soon as the card appears
  useEffect(() => {
    speakText(item.word, langName).catch(() => {});
  }, [item.word, langName]);

  return (
    <button onClick={onFlip} className="w-full min-h-[280px] bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 active:scale-98 transition text-center">
      {!flipped ? (
        <>
          <p className="text-5xl font-black text-white">{item.word}</p>
          {item.romanized && <p className="text-lg text-white/50 italic">{item.romanized}</p>}
          {item.gender && <span className="text-xs bg-white/10 text-white/50 px-3 py-1 rounded-full">{item.gender}</span>}
          <p className="text-white/30 text-sm mt-2">Tap to reveal →</p>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-bold text-white">{item.english}</p>
            <SpeakBtn text={item.word} langName={langName} size="lg" />
          </div>
          <div className="w-full bg-white/10 rounded-2xl p-4 text-left space-y-2">
            <div className="flex items-start gap-2">
              <p className="text-white/70 text-sm flex-1">{item.example}</p>
              <SpeakBtn text={item.example} langName={langName} />
            </div>
            <p className="text-white/40 text-xs italic">{item.exampleEn}</p>
          </div>
        </>
      )}
    </button>
  );
}

function GrammarCard({ data, langName }: { data: Extract<LessonData, {type:"grammar"}>; langName: string }) {
  const [cardIdx, setCardIdx] = useState(0);
  const total = 1 + data.grammar.examples.length;
  const isLast = cardIdx >= total - 1;

  // Auto-speak example sentence when it appears
  useEffect(() => {
    if (cardIdx > 0) {
      const target = data.grammar.examples[cardIdx - 1]?.target;
      if (target) speakText(target, langName).catch(() => {});
    }
  }, [cardIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <ProgressBar current={cardIdx + 1} total={total} />
      {cardIdx === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
          <h3 className="text-white font-black text-xl">{data.grammar.rule}</h3>
          <p className="text-white/70 text-sm leading-relaxed">{data.grammar.explanation}</p>
          <div className="space-y-2">
            {data.grammar.keyPoints.map((pt, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-white/30 text-xs mt-1">•</span>
                <p className="text-white/60 text-sm">{pt}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3">
          <p className="text-white/40 text-xs uppercase tracking-widest">Example {cardIdx}</p>
          <div className="flex items-start gap-2">
            <p className="text-white text-xl font-semibold flex-1">{data.grammar.examples[cardIdx - 1]?.target}</p>
            {data.grammar.examples[cardIdx - 1]?.target && (
              <SpeakBtn text={data.grammar.examples[cardIdx - 1]!.target} langName={langName} size="lg" />
            )}
          </div>
          <p className="text-white/50 text-sm">{data.grammar.examples[cardIdx - 1]?.english}</p>
          <span className="inline-block bg-white/15 text-white/70 text-xs px-3 py-1 rounded-full">
            Key: {data.grammar.examples[cardIdx - 1]?.highlight}
          </span>
        </div>
      )}
      <button
        onClick={() => !isLast && setCardIdx(c => c + 1)}
        disabled={isLast}
        className={`w-full py-4 rounded-2xl font-bold text-sm transition active:scale-95 ${isLast ? "opacity-30" : "bg-white text-black"}`}
      >
        {isLast ? "Ready for quiz →" : "Next →"}
      </button>
    </div>
  );
}

function ConjugationCard({ data, langName }: { data: Extract<LessonData, {type:"conjugation"}>; langName: string }) {
  const c = data.conjugation;

  // Auto-speak the verb when the card first appears
  useEffect(() => {
    speakText(c.verb, langName).catch(() => {});
  }, [c.verb, langName]);

  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Verb</p>
        <div className="flex items-center gap-3">
          <p className="text-white text-3xl font-black">{c.verb}</p>
          <SpeakBtn text={c.verb} langName={langName} size="lg" />
        </div>
        <p className="text-white/50 text-base">"{c.verbEnglish}" — {c.tense}</p>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
        {c.table.map((row, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i % 2 === 0 ? "" : "bg-white/[0.03]"}`}>
            <div className="w-24 shrink-0">
              <p className="text-white/60 text-sm">{row.pronoun}</p>
              <p className="text-white/30 text-xs">{row.pronounEn}</p>
            </div>
            <p className="text-white font-bold text-base flex-1">{row.form}</p>
            <SpeakBtn text={`${row.pronoun} ${row.form}`} langName={langName} />
          </div>
        ))}
      </div>
      {c.notes && <p className="text-white/40 text-xs px-2">⚠ {c.notes}</p>}
      <div className="space-y-2">
        {c.examples.map((ex, i) => (
          <div key={i} className="bg-white/5 rounded-2xl px-4 py-3">
            <div className="flex items-start gap-2">
              <p className="text-white text-sm flex-1">{ex.target}</p>
              <SpeakBtn text={ex.target} langName={langName} />
            </div>
            <p className="text-white/40 text-xs">{ex.english}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Quiz ──────────────────────────────────────────────────────────────────────

function QuizCard({ q, onAnswer, langName }: { q: QuizQuestion; onAnswer: (correct: boolean) => void; langName: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState(false);

  const pick = (opt: string) => {
    if (feedback) return;
    if (isSynthesisSupported()) speakText(opt, langName).catch(() => {});
    setSelected(opt);
    setFeedback(true);
    setTimeout(() => onAnswer(opt === q.answer), 1000);
  };

  if (q.type === "mc") {
    return (
      <div className="space-y-4">
        <p className="text-white font-bold text-lg">{q.prompt}</p>
        <div className="space-y-2">
          {q.options?.map(opt => {
            let cls = "bg-white/10 text-white border-white/15";
            if (feedback) {
              if (opt === q.answer) cls = "bg-green-500/30 text-green-300 border-green-500";
              else if (opt === selected) cls = "bg-red-500/30 text-red-300 border-red-500";
            }
            return (
              <button key={opt} onClick={() => pick(opt)}
                className={`w-full text-left px-4 py-3 rounded-2xl border text-sm font-medium transition active:scale-98 ${cls}`}>
                {opt}
              </button>
            );
          })}
        </div>
        {feedback && <p className="text-white/50 text-xs bg-white/5 rounded-xl px-4 py-2">{q.explanation}</p>}
      </div>
    );
  }

  // fill
  return <FillCard q={q} onAnswer={onAnswer} langName={langName} />;
}

function FillCard({ q, onAnswer, langName }: { q: QuizQuestion; onAnswer: (correct: boolean) => void; langName: string }) {
  const [val, setVal] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const correct = val.trim().toLowerCase() === q.answer.toLowerCase();

  const submit = () => {
    if (submitted || !val.trim()) return;
    if (isSynthesisSupported()) speakText(val.trim(), langName).catch(() => {});
    setSubmitted(true);
    setTimeout(() => onAnswer(correct), 1000);
  };

  return (
    <div className="space-y-4">
      <p className="text-white font-bold text-lg">{q.prompt}</p>
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()}
        disabled={submitted}
        placeholder="Type your answer…"
        className={`w-full rounded-2xl px-4 py-3 text-sm outline-none transition border ${
          submitted
            ? correct ? "bg-green-500/20 border-green-500 text-green-300" : "bg-red-500/20 border-red-500 text-red-300"
            : "bg-white/10 border-white/20 text-white placeholder-white/30 focus:border-white/40"
        }`}
      />
      {submitted && !correct && <p className="text-white/60 text-sm">Correct answer: <strong className="text-white">{q.answer}</strong></p>}
      {submitted && <p className="text-white/40 text-xs bg-white/5 rounded-xl px-4 py-2">{q.explanation}</p>}
      {!submitted && (
        <button onClick={submit} disabled={!val.trim()}
          className="w-full bg-white text-black font-bold py-3.5 rounded-2xl disabled:opacity-40 active:scale-95 transition text-sm">
          Check Answer
        </button>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { completeLesson } = useProgress();

  // Parse id: {lang}-{unitId}-{topicId}
  const parts = (id ?? "").split("-");
  const langCode = parts[0];
  const unitId = parseInt(parts[1]);
  const topicId = parts.slice(2).join("-");

  const langDef = LANG_DEFS.find(l => l.code === langCode);
  const unit = UNITS.find(u => u.id === unitId);
  const lesson = unit?.lessons.find(l => l.id === topicId);

  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<LessonData | null>(null);
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [qIdx, setQIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [stars, setStars] = useState(0);

  const cacheKey = `av-content-${langCode}-${unitId}-${topicId}`;

  useEffect(() => {
    if (!lesson || !langDef || !unit) return;
    // Try cache first
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) { setData(JSON.parse(cached)); setPhase("content"); return; }
    } catch {}

    // Fetch from API
    fetch("/api/lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: langDef.name, langCode, topicId, lessonType: lesson.type, unitTitle: unit.title }),
    })
      .then(r => r.json())
      .then((d: LessonData) => {
        try { localStorage.setItem(cacheKey, JSON.stringify(d)); } catch {}
        setData(d);
        setPhase("content");
      })
      .catch(() => setPhase("content")); // show error state
  }, [lesson, langDef, unit, langCode, unitId, topicId, cacheKey]);

  const handleAnswer = useCallback((isCorrect: boolean) => {
    if (isCorrect) setCorrect(c => c + 1);
    if (qIdx < (data?.quiz?.length ?? 1) - 1) {
      setQIdx(q => q + 1);
    } else {
      // Finished quiz
      const total = data?.quiz?.length ?? 5;
      const score = (isCorrect ? correct + 1 : correct);
      const pct = score / total;
      const s = pct === 1 ? 3 : pct >= 0.7 ? 2 : pct >= 0.4 ? 1 : 0;
      const xp = s === 3 ? (lesson?.xp ?? 50) : s === 2 ? Math.round((lesson?.xp ?? 50) * 0.7) : s === 1 ? Math.round((lesson?.xp ?? 50) * 0.4) : 0;
      setStars(s);
      setXpEarned(xp);
      if (s > 0 && langDef && unit && lesson) {
        completeLesson(langCode, unitId, topicId, s, xp);
      }
      setPhase("results");
    }
  }, [correct, qIdx, data, lesson, langDef, unit, langCode, unitId, topicId, completeLesson]);

  if (!lesson || !langDef || !unit) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white/40">Lesson not found</div>;
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-white/10 active:scale-90 transition shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">{lesson.title}</p>
          <p className="text-white/40 text-xs">{langDef.flag} {langDef.name} · Unit {unit.id}: {unit.title}</p>
        </div>
        <span className="text-white/40 text-xs shrink-0">{lesson.xp} XP</span>
      </div>

      <div className="flex-1 px-4 pb-10 space-y-5 overflow-y-auto">
        {/* Loading */}
        {phase === "loading" && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-white/20 border-t-white animate-spin" />
            <p className="text-white/40 text-sm">Preparing your lesson…</p>
          </div>
        )}

        {/* Content phase */}
        {phase === "content" && data && (
          <>
            {/* Animated scene illustration */}
            <LessonScene topicId={topicId} />

            {data.type === "vocab" && (
              <div className="space-y-4">
                <ProgressBar current={cardIdx + 1} total={data.items.length} />
                <p className="text-white/40 text-xs text-center">{cardIdx + 1} / {data.items.length}</p>
                <VocabCard item={data.items[cardIdx]} flipped={flipped} onFlip={() => setFlipped(f => !f)} langName={langDef.name} />
                <div className="flex gap-3">
                  <button
                    disabled={cardIdx === 0}
                    onClick={() => { setCardIdx(c => c - 1); setFlipped(false); }}
                    className="flex-1 py-3 rounded-2xl bg-white/10 text-white text-sm font-semibold disabled:opacity-30 active:scale-95 transition"
                  >← Back</button>
                  {cardIdx < data.items.length - 1 ? (
                    <button onClick={() => { setCardIdx(c => c + 1); setFlipped(false); }}
                      className="flex-1 py-3 rounded-2xl bg-white text-black text-sm font-bold active:scale-95 transition">
                      Next →
                    </button>
                  ) : (
                    <button onClick={() => setPhase("quiz")}
                      className="flex-1 py-3 rounded-2xl bg-green-500 text-white text-sm font-bold active:scale-95 transition animate-pulse">
                      Take Quiz →
                    </button>
                  )}
                </div>
                {data.cultureTip && (
                  <div className="bg-white/5 rounded-2xl px-4 py-3 flex gap-2">
                    <span>💡</span>
                    <p className="text-white/50 text-xs leading-relaxed">{data.cultureTip}</p>
                  </div>
                )}
              </div>
            )}

            {data.type === "grammar" && (
              <>
                <GrammarCard data={data} langName={langDef.name} />
                {data.cultureTip && (
                  <div className="bg-white/5 rounded-2xl px-4 py-3 flex gap-2">
                    <span>💡</span>
                    <p className="text-white/50 text-xs leading-relaxed">{data.cultureTip}</p>
                  </div>
                )}
                <button onClick={() => setPhase("quiz")}
                  className="w-full py-4 rounded-2xl bg-green-500 text-white font-bold text-sm active:scale-95 transition">
                  Take Quiz →
                </button>
              </>
            )}

            {data.type === "conjugation" && (
              <>
                <ConjugationCard data={data} langName={langDef.name} />
                <button onClick={() => setPhase("quiz")}
                  className="w-full py-4 rounded-2xl bg-green-500 text-white font-bold text-sm active:scale-95 transition">
                  Take Quiz →
                </button>
              </>
            )}
          </>
        )}

        {/* Quiz phase */}
        {phase === "quiz" && data?.quiz && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-white/40 text-xs uppercase tracking-widest">Quiz</p>
              <p className="text-white/40 text-xs">{qIdx + 1} / {data.quiz.length}</p>
            </div>
            <ProgressBar current={qIdx + 1} total={data.quiz.length} />
            <QuizCard key={qIdx} q={data.quiz[qIdx]} onAnswer={handleAnswer} langName={langDef.name} />
          </div>
        )}

        {/* Results phase */}
        {phase === "results" && (
          <div className="flex flex-col items-center gap-6 py-8 text-center">
            <div className="text-6xl">{stars === 3 ? "🎉" : stars >= 1 ? "👍" : "😅"}</div>
            <div>
              <p className="text-white/40 text-sm uppercase tracking-widest mb-3">
                {stars === 3 ? "Perfect!" : stars === 2 ? "Great job!" : stars === 1 ? "Good start!" : "Keep trying!"}
              </p>
              <Stars count={stars} />
            </div>

            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-3xl font-black text-white">+{xpEarned}</p>
                <p className="text-white/40 text-xs">XP earned</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black text-white">{correct}/{data?.quiz?.length ?? 5}</p>
                <p className="text-white/40 text-xs">Correct</p>
              </div>
            </div>

            <div className="w-full space-y-3 mt-4">
              {stars === 0 && (
                <button onClick={() => { setPhase("content"); setQIdx(0); setCorrect(0); setFlipped(false); setCardIdx(0); }}
                  className="w-full py-4 rounded-2xl bg-white/15 text-white font-bold text-sm active:scale-95 transition">
                  Try Again
                </button>
              )}
              <button onClick={() => router.push(`/learn/${langCode}`)}
                className="w-full py-4 rounded-2xl bg-white text-black font-bold text-sm active:scale-95 transition">
                Back to Course →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
