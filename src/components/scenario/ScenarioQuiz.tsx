"use client";
import { useState, useRef, useEffect } from "react";
import type { ScenarioQuizQuestion } from "@/app/api/scenario/route";
import { startListening, isSpeechSupported, speakText, isSynthesisSupported } from "@/utils/speech";
import type { RecognitionHandle } from "@/utils/speech";

type InputMode = "choice" | "type" | "voice";

interface ScenarioQuizProps {
  question: ScenarioQuizQuestion;
  langName: string;
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
  streak: number;
}

export default function ScenarioQuiz({
  question, langName, onAnswer, onNext, streak,
}: ScenarioQuizProps) {
  const [inputMode, setInputMode] = useState<InputMode>(
    question.type === "mc" && question.options ? "choice" : "type"
  );
  const [typed, setTyped] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<RecognitionHandle | null>(null);

  useEffect(() => {
    // Reset on new question and speak NPC line
    setTyped(""); setSubmitted(false); setCorrect(null);
    setFeedback(""); setSelectedChoice(null); setInterim("");
    if (isSynthesisSupported() && question.npcLine) {
      speakText(question.npcLine, langName).catch(() => {});
    }
  }, [question]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(userAnswer: string) {
    if (submitted) return;
    setSubmitted(true);

    // Evaluate
    const res = await fetch("/api/room-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "evaluate",
        language: langName,
        userAnswer,
        expectedAnswer: question.answer,
      }),
    });
    const data = await res.json();
    const isCorrect = !!data.correct;
    setCorrect(isCorrect);
    setFeedback(data.feedback ?? (isCorrect ? "Correct!" : `Expected: ${question.answer}`));
    onAnswer(isCorrect);
  }

  function submitChoice(opt: string) {
    setSelectedChoice(opt);
    if (isSynthesisSupported()) speakText(opt, langName).catch(() => {});
    submit(opt);
  }

  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      recRef.current = null;
      setListening(false);
      if (interim) submit(interim);
      return;
    }
    const handle = startListening(
      (text, final) => {
        setInterim(text);
        if (final) {
          setListening(false);
          recRef.current = null;
          submit(text);
        }
      },
      (final) => {
        setListening(false);
        recRef.current = null;
        if (final) submit(final);
      },
      langName === "English" ? "en-US" : undefined
    );
    if (handle) { recRef.current = handle; setListening(true); }
  }

  const modeAllowed = (m: InputMode) => {
    if (m === "choice") return question.type === "mc" && !!question.options;
    return true;
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-[#0e0e0e]/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl px-4 pt-4 pb-safe-bottom shadow-2xl">
      {/* Streak */}
      {streak > 0 && (
        <div className="absolute top-4 right-4 bg-orange-500/20 text-orange-300 text-xs font-bold px-2 py-0.5 rounded-full">
          🔥 {streak}
        </div>
      )}

      {/* Prompt */}
      <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">Quiz</p>
      <p className="text-white font-semibold text-base mb-3 leading-snug">{question.prompt}</p>

      {/* Input mode pills */}
      {!submitted && (
        <div className="flex gap-2 mb-3">
          {(["choice", "type", "voice"] as InputMode[]).map(m => (
            <button
              key={m}
              onClick={() => modeAllowed(m) && setInputMode(m)}
              disabled={!modeAllowed(m)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition ${
                inputMode === m
                  ? "bg-white text-black"
                  : modeAllowed(m)
                  ? "bg-white/10 text-white/60"
                  : "bg-white/5 text-white/20 cursor-not-allowed"
              }`}
            >
              {m === "choice" ? "☑ Choice" : m === "type" ? "⌨ Type" : "🎤 Voice"}
            </button>
          ))}
        </div>
      )}

      {/* Multiple choice */}
      {!submitted && inputMode === "choice" && question.options && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {question.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => submitChoice(opt)}
              className="py-3 px-3 rounded-2xl text-sm font-medium text-left bg-white/10 text-white border border-white/10 active:scale-95 transition leading-snug"
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Type input */}
      {!submitted && inputMode === "type" && (
        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 bg-white/8 border border-white/15 rounded-2xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/40 placeholder:text-white/30"
            placeholder={`Answer in ${langName}…`}
            value={typed}
            onChange={e => setTyped(e.target.value)}
            onKeyDown={e => e.key === "Enter" && typed.trim() && submit(typed.trim())}
            autoCapitalize="off"
            autoCorrect="off"
          />
          <button
            onClick={() => typed.trim() && submit(typed.trim())}
            disabled={!typed.trim()}
            className="px-4 py-2.5 bg-white/15 text-white rounded-2xl text-sm font-semibold active:scale-95 transition disabled:opacity-40"
          >
            ✓
          </button>
        </div>
      )}

      {/* Voice input */}
      {!submitted && inputMode === "voice" && isSpeechSupported() && (
        <div className="flex flex-col items-center gap-2 mb-3">
          <button
            onClick={toggleMic}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition active:scale-90 ${
              listening ? "bg-red-500 animate-pulse" : "bg-white/15"
            }`}
          >
            {listening ? "⏹" : "🎤"}
          </button>
          {interim && <p className="text-white/60 text-sm text-center italic">{interim}</p>}
          <p className="text-white/30 text-xs">{listening ? "Listening… tap to stop" : "Tap to speak"}</p>
        </div>
      )}

      {/* Feedback */}
      {submitted && (
        <div className={`rounded-2xl px-4 py-3 mb-3 ${correct ? "bg-green-500/20 border border-green-500/40" : "bg-red-500/20 border border-red-500/40"}`}>
          {/* Show choice result with highlighting */}
          {selectedChoice && question.options && (
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {question.options.map((opt, i) => (
                <div
                  key={i}
                  className={`py-2 px-3 rounded-xl text-xs font-medium ${
                    opt === question.answer ? "bg-green-500/30 text-green-200 border border-green-500/50"
                    : opt === selectedChoice && opt !== question.answer ? "bg-red-500/30 text-red-200 border border-red-500/50"
                    : "bg-white/5 text-white/30"
                  }`}
                >
                  {opt}
                </div>
              ))}
            </div>
          )}
          <p className={`text-sm font-semibold ${correct ? "text-green-300" : "text-red-300"}`}>
            {correct ? "✓ Correct!" : "✗ Not quite"}
          </p>
          <p className="text-white/70 text-xs mt-0.5">{feedback}</p>
        </div>
      )}

      {/* Next */}
      {submitted && (
        <button
          onClick={onNext}
          className="w-full py-3 rounded-2xl bg-white text-black font-bold text-sm active:scale-95 transition"
        >
          Next question →
        </button>
      )}
    </div>
  );
}
