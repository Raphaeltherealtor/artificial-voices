"use client";

import { useState, useCallback, useRef } from "react";
import type { DetectedObject } from "@/app/api/identify/route";
import type { RoomQuestion } from "@/app/api/room-quiz/route";
import { startListening, isSpeechSupported } from "@/utils/speech";

interface Props {
  objects: DetectedObject[];
  selectedLang: { name: string; flag: string };
  captureFrame: () => string | null;
  screenPositions: Record<string, { x: number; y: number }>;
}

type AnswerState = "idle" | "correct" | "wrong";

interface ObjectStatus {
  state: AnswerState;
  shownWord?: string;
}

// ── Answer Modal ──────────────────────────────────────────────────────────────

function AnswerModal({
  question,
  langName,
  langFlag,
  onClose,
  onResult,
}: {
  question: RoomQuestion;
  langName: string;
  langFlag: string;
  onClose: () => void;
  onResult: (correct: boolean, model?: string) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean; feedback: string; model?: string } | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const submit = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || evaluating) return;
    setEvaluating(true);
    try {
      const res = await fetch("/api/room-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate",
          language: langName,
          expectedAnswer: question.expectedAnswer,
          userAnswer: trimmed,
        }),
      });
      const data = await res.json();
      setFeedback(data);
      setTimeout(() => onResult(data.correct, data.model), 1200);
    } catch {
      setFeedback({ correct: false, feedback: "Couldn't check your answer. Try again!", model: question.expectedAnswer });
    } finally {
      setEvaluating(false);
    }
  }, [question.expectedAnswer, langName, evaluating, onResult]);

  const toggleMic = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      setInterimText("");
    } else {
      setListening(true);
      recognitionRef.current = startListening(
        (t, isFinal) => {
          if (isFinal) { setAnswer(t); setInterimText(""); submit(t); }
          else setInterimText(t);
        },
        (final) => {
          setListening(false);
          setInterimText("");
          if (final && !answer) { setAnswer(final); submit(final); }
        }
      );
      if (!recognitionRef.current) setListening(false);
    }
  };

  const typeLabel = question.type === "name-it" ? `Name this in ${langName}` : question.type === "sentence-build" ? `Answer in ${langName}` : "Type your answer";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={e => { e.stopPropagation(); if (!feedback) onClose(); }}>
      <div className="w-full max-w-sm bg-[#111] rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Question header */}
        <div className="bg-white/10 px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{langFlag}</span>
            <span className="text-white/40 text-xs uppercase tracking-widest">{langName} Quiz</span>
          </div>
          <p className="text-white font-bold text-base leading-snug">{question.prompt}</p>
          {question.hint && (
            <p className="text-white/40 text-xs mt-1.5">💡 {question.hint}</p>
          )}
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Feedback overlay */}
          {feedback ? (
            <div className={`rounded-2xl p-4 text-center ${feedback.correct ? "bg-green-500/20 border border-green-500/40" : "bg-red-500/20 border border-red-500/40"}`}>
              <p className="text-2xl mb-1">{feedback.correct ? "✅" : "❌"}</p>
              <p className={`font-bold text-sm ${feedback.correct ? "text-green-300" : "text-red-300"}`}>{feedback.correct ? "Correct!" : "Not quite"}</p>
              <p className="text-white/60 text-xs mt-1">{feedback.feedback}</p>
              {!feedback.correct && feedback.model && (
                <p className="text-white font-bold mt-2 text-sm">Correct: {feedback.model}</p>
              )}
            </div>
          ) : (
            <>
              {/* Voice / Text toggle area */}
              {interimText && (
                <p className="text-white/50 text-xs italic px-1">{interimText}…</p>
              )}
              <div className="flex items-center gap-2">
                {isSpeechSupported() && (
                  <button
                    onClick={toggleMic}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-90 shrink-0 ${
                      listening ? "bg-red-500 animate-pulse" : "bg-white/20"
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                )}
                <input
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submit(answer)}
                  placeholder={typeLabel + "…"}
                  disabled={evaluating || listening}
                  className="flex-1 bg-white/10 text-white placeholder-white/30 rounded-2xl px-4 py-2.5 text-sm outline-none focus:bg-white/15 transition disabled:opacity-50"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={onClose}
                  className="flex-1 py-3 rounded-2xl bg-white/10 text-white/60 text-sm font-semibold active:scale-95 transition">
                  Skip
                </button>
                <button
                  onClick={() => submit(answer)}
                  disabled={!answer.trim() || evaluating}
                  className="flex-1 py-3 rounded-2xl bg-white text-black text-sm font-bold active:scale-95 transition disabled:opacity-40"
                >
                  {evaluating ? "Checking…" : "Submit"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Scene Quiz Banner ─────────────────────────────────────────────────────────

function SceneQuizBanner({
  question,
  langName,
  langFlag,
  onClose,
  onCorrect,
}: {
  question: RoomQuestion;
  langName: string;
  langFlag: string;
  onClose: () => void;
  onCorrect: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean; feedback: string; model?: string } | null>(null);
  const recRef = useRef<{ stop: () => void } | null>(null);

  const submit = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || evaluating) return;
    setEvaluating(true);
    try {
      const res = await fetch("/api/room-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "evaluate", language: langName, expectedAnswer: question.expectedAnswer, userAnswer: trimmed }),
      });
      const data = await res.json();
      setFeedback(data);
      if (data.correct) setTimeout(onCorrect, 1500);
    } catch {
      setFeedback({ correct: false, feedback: "Couldn't check. Try again!", model: question.expectedAnswer });
    } finally { setEvaluating(false); }
  }, [question.expectedAnswer, langName, evaluating, onCorrect]);

  const toggleMic = () => {
    if (listening) { recRef.current?.stop(); setListening(false); setInterimText(""); return; }
    setListening(true);
    recRef.current = startListening(
      (t, fin) => { if (fin) { setAnswer(t); setInterimText(""); submit(t); } else setInterimText(t); },
      (final) => { setListening(false); setInterimText(""); if (final && !answer) { setAnswer(final); submit(final); } }
    );
    if (!recRef.current) setListening(false);
  };

  return (
    <div className="absolute left-4 right-4 bottom-36 z-20" onClick={e => e.stopPropagation()}>
      <div className="bg-black/90 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-white/10">
          <span>{langFlag}</span>
          <p className="text-white font-bold text-sm flex-1">{question.prompt}</p>
          <button onClick={onClose} className="text-white/30 text-lg active:scale-90 transition">✕</button>
        </div>
        {question.hint && <p className="text-white/30 text-xs px-4 pt-2">💡 {question.hint}</p>}

        {feedback ? (
          <div className={`mx-4 my-3 rounded-2xl p-3 text-center ${feedback.correct ? "bg-green-500/20" : "bg-red-500/20"}`}>
            <p className={`font-bold text-sm ${feedback.correct ? "text-green-300" : "text-red-300"}`}>
              {feedback.correct ? "✅ Correct!" : "❌ " + feedback.feedback}
            </p>
            {!feedback.correct && feedback.model && <p className="text-white text-xs mt-1">Answer: {feedback.model}</p>}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-3">
            {interimText && <p className="absolute -top-6 left-4 text-white/50 text-xs italic">{interimText}…</p>}
            {isSpeechSupported() && (
              <button onClick={toggleMic}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition active:scale-90 shrink-0 ${listening ? "bg-red-500 animate-pulse" : "bg-white/20"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            )}
            <input
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit(answer)}
              placeholder="Type your answer…"
              disabled={evaluating || listening}
              className="flex-1 bg-white/10 text-white placeholder-white/30 rounded-2xl px-4 py-2 text-sm outline-none focus:bg-white/15 transition disabled:opacity-50"
            />
            <button
              onClick={() => submit(answer)}
              disabled={!answer.trim() || evaluating}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center font-bold text-sm disabled:opacity-40 active:scale-90 transition shrink-0"
            >↑</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main RoomQuiz export ──────────────────────────────────────────────────────

export default function RoomQuiz({ objects, selectedLang, captureFrame, screenPositions }: Props) {
  const [objectStatus, setObjectStatus] = useState<Record<string, ObjectStatus>>({});
  const [activeObject, setActiveObject] = useState<{ obj: DetectedObject; question: RoomQuestion } | null>(null);
  const [sceneQuestion, setSceneQuestion] = useState<RoomQuestion | null>(null);
  const [loadingScene, setLoadingScene] = useState(false);

  // Generate a "name-it" question for a specific object
  const handleQuestionMark = useCallback(async (e: React.MouseEvent, obj: DetectedObject) => {
    e.stopPropagation();
    if (objectStatus[obj.label]?.state !== "idle" && objectStatus[obj.label] !== undefined) return;

    try {
      const res = await fetch("/api/room-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          language: selectedLang.name,
          objects: [{ label: obj.label }],
          targetObject: obj.label,
          questionType: "name-it",
        }),
      });
      const q: RoomQuestion = await res.json();
      setActiveObject({ obj, question: q });
    } catch { /* silent */ }
  }, [objectStatus, selectedLang.name]);

  // Generate a scene-wide question
  const generateSceneQuestion = useCallback(async () => {
    if (loadingScene || objects.length === 0) return;
    setLoadingScene(true);
    setSceneQuestion(null);
    try {
      const base64 = captureFrame();
      const res = await fetch("/api/room-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          imageBase64: base64,
          mimeType: "image/jpeg",
          language: selectedLang.name,
          objects,
          questionType: "scene-question",
        }),
      });
      const q: RoomQuestion = await res.json();
      setSceneQuestion(q);
    } catch { /* silent */ }
    finally { setLoadingScene(false); }
  }, [loadingScene, objects, captureFrame, selectedLang.name]);

  const handleAnswer = (objLabel: string, correct: boolean, model?: string) => {
    setObjectStatus(prev => ({
      ...prev,
      [objLabel]: { state: correct ? "correct" : "wrong", shownWord: model },
    }));
    setActiveObject(null);
  };

  return (
    <>
      {/* ? chips over objects */}
      {objects.map((obj) => {
        const pos = screenPositions[obj.label];
        if (!pos) return null;
        const status = objectStatus[obj.label];

        return (
          <button
            key={obj.label}
            onClick={(e) => {
              if (!status || status.state === "idle") handleQuestionMark(e, obj);
              else e.stopPropagation();
            }}
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}
            className={`absolute z-10 flex flex-col items-center gap-0.5 active:scale-95 transition`}
          >
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-lg backdrop-blur-md border transition ${
              !status || status.state === "idle"
                ? "bg-yellow-400/90 text-black border-yellow-300 animate-pulse-slow"
                : status.state === "correct"
                ? "bg-green-500/80 text-white border-green-400"
                : "bg-red-500/80 text-white border-red-400"
            }`}>
              {!status || status.state === "idle"
                ? `❓ ${obj.label}`
                : status.state === "correct"
                ? `✅ ${obj.label}`
                : `❌ ${status.shownWord ?? obj.label}`
              }
            </span>
          </button>
        );
      })}

      {/* New Challenge button */}
      <button
        onClick={e => { e.stopPropagation(); generateSceneQuestion(); }}
        disabled={loadingScene}
        className="absolute bottom-36 left-4 z-20 flex items-center gap-1.5 px-3 py-2 rounded-full bg-purple-600/90 backdrop-blur-sm text-white text-xs font-bold active:scale-95 transition disabled:opacity-60 shadow-lg"
      >
        {loadingScene
          ? <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          : <span>🎯</span>
        }
        New Challenge
      </button>

      {/* Object-specific answer modal */}
      {activeObject && (
        <AnswerModal
          question={activeObject.question}
          langName={selectedLang.name}
          langFlag={selectedLang.flag}
          onClose={() => setActiveObject(null)}
          onResult={(correct, model) => handleAnswer(activeObject.obj.label, correct, model)}
        />
      )}

      {/* Scene-wide question banner */}
      {sceneQuestion && !activeObject && (
        <SceneQuizBanner
          question={sceneQuestion}
          langName={selectedLang.name}
          langFlag={selectedLang.flag}
          onClose={() => setSceneQuestion(null)}
          onCorrect={() => setSceneQuestion(null)}
        />
      )}
    </>
  );
}
