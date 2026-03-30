"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { STORIES, type StoryStep, type StorySeries, type StoryChapter } from "@/data/stories";
import { speakText, startListening, isSpeechSupported, isSynthesisSupported, LANG_SPEECH_CODES } from "@/utils/speech";
import type { RecognitionHandle } from "@/utils/speech";

// ── Language list ─────────────────────────────────────────────────────────────

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

// ── Types ─────────────────────────────────────────────────────────────────────

interface NpcLineData {
  line: string;
  roman?: string;
  furi?: string;
  lineEn: string;
}

interface PhraseData {
  text: string;
  roman?: string;
  furi?: string;
  textEn: string;
}

interface TranslatedChoice {
  textEn: string;
  text: string;
  roman?: string;
  correct: boolean;
}

interface EvalResult {
  correct: boolean;
  score: number;
  feedback: string;
  correction?: string;
}

type StepPhase = "loading" | "ready" | "listening" | "evaluating" | "result" | "ar";

// ── Small UI components ───────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full bg-white/60 rounded-full transition-all duration-500"
        style={{ width: `${(current / total) * 100}%` }}
      />
    </div>
  );
}

function NpcBubble({
  npcName, line, roman, furi, lineEn, loading, showEn,
}: {
  npcName: string; line: string; roman?: string; furi?: string;
  lineEn: string; loading: boolean; showEn: boolean;
}) {
  return (
    <div className="bg-white/8 border border-white/10 rounded-3xl p-5 space-y-2">
      <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">{npcName}</p>
      {loading ? (
        <div className="flex gap-1.5 py-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      ) : (
        <>
          <p className="text-white text-xl font-semibold leading-snug">{line}</p>
          {roman && <p className="text-white/40 text-sm italic">{roman}</p>}
          {furi && <p className="text-white/30 text-xs">{furi}</p>}
          {showEn && lineEn && (
            <p className="text-white/40 text-sm border-t border-white/10 pt-2 mt-2 italic">{lineEn}</p>
          )}
        </>
      )}
    </div>
  );
}

function VocabPills({ words, translations }: {
  words: string[];
  translations: Record<string, { native: string; roman?: string }>;
}) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  return (
    <div className="flex flex-wrap gap-2">
      {words.map(w => {
        const t = translations[w];
        const isRevealed = revealed.has(w);
        return (
          <button
            key={w}
            onClick={() => setRevealed(prev => { const s = new Set(prev); s.add(w); return s; })}
            className="bg-white/8 border border-white/10 rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-95"
          >
            {isRevealed && t ? (
              <span className="text-white">{t.native}{t.roman ? ` · ${t.roman}` : ""}</span>
            ) : (
              <span className="text-white/60">{w}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Camera AR view for ar-circle steps ────────────────────────────────────────

function ArCircleView({
  arItem, npcName, npcLine, onCircled, onSkip,
}: {
  arItem: string; npcName: string; npcLine: string;
  onCircled: () => void; onSkip: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const gestureRef = useRef<{ x: number; y: number }[]>([]);
  const lastWasTouchRef = useRef(false);
  const [camState, setCamState] = useState<"idle" | "requesting" | "ready" | "denied">("idle");
  const [circled, setCircled] = useState(false);

  const startCamera = useCallback(async () => {
    setCamState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      const v = videoRef.current;
      if (!v) return;
      v.srcObject = stream;
      const finish = () => { v.play().catch(() => {}); setCamState("ready"); };
      if (v.readyState >= 1) { finish(); }
      else { v.addEventListener("loadedmetadata", finish, { once: true }); setTimeout(finish, 4000); }
    } catch {
      setCamState("denied");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [startCamera]);

  // Circle detection
  function detectCircle(pts: { x: number; y: number }[]): boolean {
    if (pts.length < 18) return false;
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const radii = pts.map(p => Math.hypot(p.x - cx, p.y - cy));
    const avg = radii.reduce((s, r) => s + r, 0) / radii.length;
    if (avg < 25) return false;
    const variance = radii.reduce((s, r) => s + (r - avg) ** 2, 0) / radii.length;
    if (Math.sqrt(variance) / avg > 0.45) return false;
    const d = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y);
    return d < avg * 1.5;
  }

  function drawGesture(pts: { x: number; y: number }[]) {
    const c = canvasRef.current;
    if (!c || pts.length < 2) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = "rgba(99,179,237,0.9)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "#63b3ed";
    ctx.shadowBlur = 12;
    ctx.stroke();
  }

  function handleTouchStart(e: React.TouchEvent) {
    lastWasTouchRef.current = true;
    const t = e.touches[0];
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    gestureRef.current = [{ x: t.clientX - rect.left, y: t.clientY - rect.top }];
  }

  function handleTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    const t = e.touches[0];
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    gestureRef.current.push({ x: t.clientX - rect.left, y: t.clientY - rect.top });
    drawGesture(gestureRef.current);
  }

  function handleTouchEnd() {
    const pts = gestureRef.current;
    gestureRef.current = [];
    const c = canvasRef.current;
    if (c) c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    if (detectCircle(pts)) {
      setCircled(true);
      setTimeout(onCircled, 800);
    }
  }

  if (camState === "denied") {
    return (
      <div className="rounded-3xl bg-white/5 border border-white/10 p-8 flex flex-col items-center gap-4 text-center">
        <span className="text-5xl">📷</span>
        <p className="text-white font-semibold">Camera access needed</p>
        <p className="text-white/40 text-sm">Allow camera access to do the AR challenge.</p>
        <button onClick={onSkip} className="mt-2 px-6 py-2 bg-white/10 rounded-full text-white text-sm active:scale-95">
          Skip this step
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="relative rounded-3xl overflow-hidden bg-black"
        style={{ aspectRatio: "9/16", maxHeight: "50vh", touchAction: "none" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover" />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          width={390} height={700}
        />
        {camState !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white/60 text-sm">Starting camera…</p>
            </div>
          </div>
        )}
        {circled && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 backdrop-blur-sm">
            <div className="text-center">
              <span className="text-6xl">✅</span>
              <p className="text-white font-bold text-xl mt-2">Found it!</p>
            </div>
          </div>
        )}
        {/* Target item hint */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur rounded-full px-4 py-1.5">
          <p className="text-white text-xs font-medium">Find: <span className="text-yellow-300">{arItem}</span> — draw a circle around it</p>
        </div>
      </div>

      {/* NPC hint */}
      <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
        <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">{npcName}</p>
        <p className="text-white text-base">{npcLine}</p>
      </div>

      <button onClick={onSkip} className="w-full py-2.5 bg-white/5 rounded-full text-white/40 text-sm active:scale-95">
        Skip AR challenge
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StoryChapterPage() {
  const { series: seriesId, chapter: chapterParam } = useParams<{ series: string; chapter: string }>();
  const router = useRouter();

  const series: StorySeries | undefined = STORIES[seriesId];
  const chapterNum = parseInt(chapterParam, 10);
  const chapter: StoryChapter | undefined = series?.chapters.find(c => c.chapterNum === chapterNum);

  // Language
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [showLangPicker, setShowLangPicker] = useState(false);

  // Step navigation
  const [stepIdx, setStepIdx] = useState(0);
  const step: StoryStep | undefined = chapter?.steps[stepIdx];

  // Generated content
  const [npcLine, setNpcLine] = useState<NpcLineData | null>(null);
  const [phraseData, setPhraseData] = useState<PhraseData | null>(null);
  const [translatedChoices, setTranslatedChoices] = useState<TranslatedChoice[] | null>(null);
  const [vocabTranslations, setVocabTranslations] = useState<Record<string, { native: string; roman?: string }>>({});

  // UI state
  const [phase, setPhase] = useState<StepPhase>("loading");
  const [showEn, setShowEn] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Speech
  const recogRef = useRef<RecognitionHandle | null>(null);
  const synthSupported = isSynthesisSupported();
  const speechSupported = isSpeechSupported();

  // Load step content whenever step or language changes
  useEffect(() => {
    if (!step || !series || !chapter) return;

    setPhase("loading");
    setNpcLine(null);
    setPhraseData(null);
    setTranslatedChoices(null);
    setEvalResult(null);
    setSelectedChoice(null);
    setIsCorrect(null);
    setUserInput("");
    setShowEn(false);

    const lang = selectedLang.name;

    async function loadStep() {
      try {
        const promises: Promise<void>[] = [];

        // Always load NPC line
        promises.push(
          fetch("/api/story", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "npc-line",
              language: lang,
              step,
              seriesTitle: series!.title,
              chapterTitle: chapter!.title,
            }),
          })
            .then(r => r.json())
            .then((d: NpcLineData) => setNpcLine(d))
        );

        // Load translated choices for quiz/choice steps
        if ((step!.type === "quiz" || step!.type === "choice") && step!.choices) {
          promises.push(
            fetch("/api/story", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "translate-choices",
                language: lang,
                choices: step!.choices,
                context: step!.sceneContext,
              }),
            })
              .then(r => r.json())
              .then((d: { choices: TranslatedChoice[] }) => setTranslatedChoices(d.choices))
          );
        }

        // Load phrase translation for "say" steps
        if (step!.type === "say" && step!.targetPhraseEn) {
          promises.push(
            fetch("/api/story", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "translate-phrase",
                language: lang,
                phraseEn: step!.targetPhraseEn,
                context: step!.sceneContext,
              }),
            })
              .then(r => r.json())
              .then((d: PhraseData) => setPhraseData(d))
          );
        }

        // Load vocab translations
        if (step!.vocabEn.length > 0) {
          promises.push(
            fetch("/api/story", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "translate-vocab",
                language: lang,
                words: step!.vocabEn,
              }),
            })
              .then(r => r.json())
              .then((d: { translations: Record<string, { native: string; roman?: string }> }) =>
                setVocabTranslations(d.translations)
              )
          );
        }

        await Promise.all(promises);
        setPhase(step!.type === "ar-circle" ? "ar" : "ready");
      } catch (e) {
        console.error("step load failed", e);
        setPhase("ready"); // proceed with fallback
      }
    }

    loadStep();
  }, [step, selectedLang.name, series, chapter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-speak NPC line when it arrives (scene steps)
  useEffect(() => {
    if (npcLine?.line && step?.type === "scene" && synthSupported && phase === "ready") {
      speakText(npcLine.line, selectedLang.name).catch(() => {});
    }
  }, [npcLine, step?.type, selectedLang.name, synthSupported, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const goNext = useCallback(() => {
    if (!chapter) return;
    recogRef.current?.stop();
    if (stepIdx < chapter.steps.length - 1) {
      setStepIdx(i => i + 1);
    } else {
      // End of chapter — go to next chapter or back to series list
      const nextChapter = series?.chapters.find(c => c.chapterNum === chapterNum + 1);
      if (nextChapter) {
        router.push(`/story/${seriesId}/${chapterNum + 1}`);
      } else {
        router.push("/story");
      }
    }
  }, [chapter, stepIdx, series, chapterNum, router, seriesId]);

  const handleSpeak = useCallback(() => {
    if (!npcLine?.line) return;
    speakText(npcLine.line, selectedLang.name).catch(() => {});
  }, [npcLine, selectedLang.name]);

  const handleListen = useCallback(() => {
    if (!speechSupported) return;
    setPhase("listening");
    setUserInput("");
    const langCode = LANG_SPEECH_CODES[selectedLang.name] ?? "en-US";
    recogRef.current = startListening(
      (text) => { setUserInput(text); },
      (final) => { setUserInput(final); setPhase("evaluating"); },
      langCode
    );
  }, [speechSupported, selectedLang.name]);

  const handleStopListening = useCallback(() => {
    recogRef.current?.stop();
    recogRef.current = null;
    setPhase("evaluating");
  }, []);

  // Evaluate spoken/typed input
  useEffect(() => {
    if (phase !== "evaluating" || !step || !phraseData) return;
    if (!userInput.trim()) { setPhase("ready"); return; }

    fetch("/api/story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "evaluate",
        language: selectedLang.name,
        userInput,
        targetPhraseEn: step.targetPhraseEn,
        targetNative: phraseData.text,
        context: step.sceneContext,
      }),
    })
      .then(r => r.json())
      .then((d: EvalResult) => { setEvalResult(d); setPhase("result"); })
      .catch(() => { setPhase("ready"); });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChoiceTap = useCallback((idx: number, choices: TranslatedChoice[]) => {
    if (selectedChoice !== null) return;
    setSelectedChoice(idx);
    setIsCorrect(choices[idx].correct);
    setTimeout(() => {
      if (choices[idx].correct) goNext();
    }, 800);
  }, [selectedChoice, goNext]);

  if (!series || !chapter || !step) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-5xl">📚</span>
        <p className="text-white text-xl font-bold">Story not found</p>
        <button onClick={() => router.push("/story")} className="px-6 py-2.5 bg-white/10 rounded-full text-white text-sm">
          Back to Stories
        </button>
      </main>
    );
  }

  const isLastStep = stepIdx === chapter.steps.length - 1;

  return (
    <main className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-3 border-b border-white/8">
        <button onClick={() => router.push("/story")} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/8 active:bg-white/15">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white/40 text-[10px] uppercase tracking-widest truncate">{series.emoji} {series.title}</p>
          <p className="text-white text-sm font-semibold truncate">Ch.{chapterNum} · {chapter.title}</p>
        </div>
        <ProgressBar current={stepIdx + 1} total={chapter.steps.length} />
        {/* Language picker button */}
        <button
          onClick={() => setShowLangPicker(v => !v)}
          className="flex items-center gap-1.5 bg-white/8 rounded-full px-3 py-1.5 active:bg-white/15 shrink-0"
        >
          <span className="text-base">{selectedLang.flag}</span>
          <span className="text-white/60 text-xs">{selectedLang.name.split(" ")[0]}</span>
        </button>
      </div>

      {/* Language picker dropdown */}
      {showLangPicker && (
        <div className="absolute top-24 right-4 z-50 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden w-52">
          {LANGUAGES.map(lang => (
            <button
              key={lang.name}
              onClick={() => { setSelectedLang(lang); setShowLangPicker(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition active:bg-white/10 ${lang.name === selectedLang.name ? "bg-white/10" : ""}`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="text-white text-sm">{lang.name}</span>
              {lang.name === selectedLang.name && <span className="ml-auto text-white/40 text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}

      {/* Step progress dots */}
      <div className="flex gap-1.5 justify-center px-4 py-2">
        {chapter.steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${i === stepIdx ? "w-6 bg-white" : i < stepIdx ? "w-3 bg-white/40" : "w-3 bg-white/10"}`}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-4 pb-32 space-y-4 pt-3">
        {/* Scene emoji + context */}
        <div className="text-center">
          <span className="text-6xl">{step.sceneEmoji}</span>
          <p className="text-white/30 text-xs mt-2 leading-relaxed">{step.userTaskEn}</p>
        </div>

        {/* NPC speech bubble */}
        {step.type !== "ar-circle" && (
          <NpcBubble
            npcName={step.npcName}
            line={npcLine?.line ?? ""}
            roman={npcLine?.roman}
            furi={npcLine?.furi}
            lineEn={npcLine?.lineEn ?? ""}
            loading={phase === "loading"}
            showEn={showEn}
          />
        )}

        {/* Vocab pills */}
        {step.vocabEn.length > 0 && phase !== "loading" && (
          <div className="space-y-2">
            <p className="text-white/30 text-[10px] uppercase tracking-wider">Key words — tap to reveal</p>
            <VocabPills words={step.vocabEn} translations={vocabTranslations} />
          </div>
        )}

        {/* ── SCENE step: listen button + next ─────────────────────────── */}
        {step.type === "scene" && phase === "ready" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              {synthSupported && (
                <button
                  onClick={handleSpeak}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/8 border border-white/10 rounded-2xl text-white/70 text-sm active:bg-white/15"
                >
                  <span className="text-lg">🔊</span> Hear it again
                </button>
              )}
              <button
                onClick={() => setShowEn(v => !v)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/8 border border-white/10 rounded-2xl text-white/70 text-sm active:bg-white/15"
              >
                <span className="text-lg">🇬🇧</span> {showEn ? "Hide" : "Show"} English
              </button>
            </div>
          </div>
        )}

        {/* ── SAY step ─────────────────────────────────────────────────── */}
        {step.type === "say" && (
          <div className="space-y-3">
            {/* Target phrase */}
            {phraseData ? (
              <div className="bg-white/8 border border-white/10 rounded-2xl p-4 text-center">
                <p className="text-white/40 text-xs mb-2">Say this:</p>
                <p className="text-white text-2xl font-bold">{phraseData.text}</p>
                {phraseData.roman && <p className="text-white/40 text-sm italic mt-1">{phraseData.roman}</p>}
                <p className="text-white/30 text-xs mt-2">{phraseData.textEn}</p>
              </div>
            ) : phase === "loading" ? (
              <div className="bg-white/5 rounded-2xl p-6 text-center">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
              </div>
            ) : null}

            {/* Speak/type input */}
            {phase === "ready" && phraseData && (
              <div className="space-y-2">
                {speechSupported && (
                  <button
                    onClick={handleListen}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 rounded-2xl text-white font-semibold active:bg-blue-700"
                  >
                    <span className="text-xl">🎤</span> Speak
                  </button>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    placeholder="Or type it…"
                    className="flex-1 bg-white/8 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none"
                    onKeyDown={e => { if (e.key === "Enter" && userInput.trim()) setPhase("evaluating"); }}
                  />
                  <button
                    onClick={() => { if (userInput.trim()) setPhase("evaluating"); }}
                    disabled={!userInput.trim()}
                    className="px-4 py-2.5 bg-white/10 rounded-xl text-white/60 text-sm active:bg-white/20 disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
              </div>
            )}

            {/* Listening state */}
            {phase === "listening" && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-3 py-5">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                  <p className="text-white/70 text-sm">Listening…</p>
                </div>
                {userInput && <p className="text-center text-white/50 text-sm italic">{userInput}</p>}
                <button onClick={handleStopListening} className="w-full py-3 bg-white/8 rounded-2xl text-white/50 text-sm active:bg-white/15">
                  Done speaking
                </button>
              </div>
            )}

            {/* Evaluating */}
            {phase === "evaluating" && (
              <div className="flex items-center justify-center gap-3 py-5">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <p className="text-white/50 text-sm">Checking…</p>
              </div>
            )}

            {/* Eval result */}
            {phase === "result" && evalResult && (
              <div className={`rounded-2xl p-4 border ${evalResult.correct ? "bg-green-500/15 border-green-500/30" : "bg-red-500/10 border-red-500/20"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{evalResult.correct ? "✅" : "💪"}</span>
                  <p className="text-white font-semibold text-sm">{evalResult.feedback}</p>
                </div>
                {evalResult.correction && (
                  <p className="text-white/50 text-xs">Correct: <span className="text-white/80">{evalResult.correction}</span></p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── QUIZ / CHOICE steps ──────────────────────────────────────── */}
        {(step.type === "quiz" || step.type === "choice") && (
          <div className="space-y-2">
            {translatedChoices ? (
              <div className="grid grid-cols-2 gap-2">
                {translatedChoices.map((choice, i) => {
                  const isSelected = selectedChoice === i;
                  const correct = isSelected && isCorrect;
                  const wrong = isSelected && !isCorrect;
                  return (
                    <button
                      key={i}
                      onClick={() => handleChoiceTap(i, translatedChoices)}
                      className={`p-4 rounded-2xl border text-left transition active:scale-95 ${
                        correct ? "bg-green-500/20 border-green-500/40" :
                        wrong ? "bg-red-500/10 border-red-500/20" :
                        "bg-white/5 border-white/10 active:bg-white/10"
                      }`}
                    >
                      <p className="text-white font-semibold text-sm leading-snug">{choice.text}</p>
                      {choice.roman && <p className="text-white/40 text-xs italic mt-0.5">{choice.roman}</p>}
                      <p className="text-white/30 text-xs mt-1">{choice.textEn}</p>
                    </button>
                  );
                })}
              </div>
            ) : phase === "loading" ? (
              <div className="py-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            ) : null}

            {selectedChoice !== null && !isCorrect && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3">
                <p className="text-white/60 text-xs">
                  Correct: <span className="text-white">{translatedChoices?.find(c => c.correct)?.text}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── AR-CIRCLE step ───────────────────────────────────────────── */}
        {step.type === "ar-circle" && (
          <ArCircleView
            arItem={step.arItem ?? "the object"}
            npcName={step.npcName}
            npcLine={npcLine?.line ?? step.npcIntentEn}
            onCircled={goNext}
            onSkip={goNext}
          />
        )}
      </div>

      {/* Bottom action bar */}
      {step.type !== "ar-circle" && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/8 px-4 pt-3 pb-safe-bottom" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          {/* Show/hide English toggle */}
          {step.type === "scene" && (
            <div className="flex gap-2 mb-2">
              {synthSupported && (
                <button onClick={handleSpeak} className="flex-1 py-2 bg-white/8 rounded-xl text-white/50 text-xs flex items-center justify-center gap-1.5 active:bg-white/15">
                  🔊 Hear
                </button>
              )}
              <button onClick={() => setShowEn(v => !v)} className="flex-1 py-2 bg-white/8 rounded-xl text-white/50 text-xs flex items-center justify-center gap-1.5 active:bg-white/15">
                🇬🇧 {showEn ? "Hide EN" : "Show EN"}
              </button>
            </div>
          )}

          <button
            onClick={goNext}
            disabled={phase === "loading" || phase === "evaluating" || phase === "listening"}
            className={`w-full py-4 rounded-2xl font-bold text-base transition active:scale-98 ${
              isLastStep
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                : "bg-white text-black"
            } disabled:opacity-30`}
          >
            {isLastStep ? `Finish Chapter ${chapterNum} →` : "Next →"}
          </button>
        </div>
      )}
    </main>
  );
}
