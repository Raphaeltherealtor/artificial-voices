"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { SCENARIOS, SCENARIO_LIST, type ScenarioItem } from "@/data/scenarios";
import type { TranslationEntry } from "@/app/api/identify/route";
import type { ScenarioQuizQuestion } from "@/app/api/scenario/route";
import { useSettings } from "@/hooks/useSettings";
import { useDeviceOrientation, applyParallax } from "@/hooks/useDeviceOrientation";
import { speakText, startListening, isSpeechSupported } from "@/utils/speech";
import type { RecognitionHandle } from "@/utils/speech";
import HotspotDot from "@/components/scenario/HotspotDot";
import ScenarioNpc from "@/components/scenario/ScenarioNpc";
import ScenarioQuiz from "@/components/scenario/ScenarioQuiz";

const CartSheet = dynamic(() => import("@/components/scenario/CartSheet"), { ssr: false });

// ── Constants ─────────────────────────────────────────────────────────────────

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

type LoadState = "idle" | "loading" | "ready" | "error";
type CamState = "idle" | "requesting" | "ready" | "denied";

interface CartEntry { item: ScenarioItem; translation?: TranslationEntry; }
interface NpcBubble { reply: string; replyEnglish: string; }

// ── Chat sheet (NPC dialogue) ─────────────────────────────────────────────────

function NpcChatSheet({
  npcName, npcRole, langName, langFlag, onClose,
  scenarioId, revealedLabels, onCheckoutRequest,
}: {
  npcName: string; npcRole: string; langName: string; langFlag: string;
  onClose: () => void; scenarioId: string; revealedLabels: string[];
  onCheckoutRequest: () => void;
}) {
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEn, setShowEn] = useState<Record<number, boolean>>({});
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<RecognitionHandle | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [enMap, setEnMap] = useState<Record<number, string>>({});

  // Greet on mount
  useEffect(() => {
    fetchGreeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchGreeting() {
    setLoading(true);
    const res = await fetch("/api/scenario", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "greet", language: langName, scenarioId, npcRole, npcName }),
    });
    const data = await res.json();
    if (data.reply) {
      const idx = 0;
      setHistory([{ role: "assistant", content: data.reply }]);
      setEnMap({ [idx]: data.replyEnglish });
      speakText(data.reply, langName);
    }
    setLoading(false);
  }

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setTyped("");
    const context = `[Scenario: ${scenarioId}, I'm a ${npcRole} named ${npcName}. Customer has seen: ${revealedLabels.join(", ") || "nothing yet"}.]`;
    const userMsg = text.trim();
    const newHistory = [...history, { role: "user" as const, content: userMsg }];
    setHistory(newHistory);
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `${context}\n${userMsg}`,
        characterId: npcName.toLowerCase(),
        history: newHistory.slice(-8).map(m => ({ role: m.role, content: m.content })),
        targetLanguage: langName,
      }),
    });
    const data = await res.json();
    if (data.reply) {
      const idx = newHistory.length;
      setHistory(prev => [...prev, { role: "assistant", content: data.reply }]);
      setEnMap(prev => ({ ...prev, [idx]: data.replyEnglish }));
      speakText(data.reply, langName);
    }
    setLoading(false);
  }

  function toggleMic() {
    if (listening) {
      recRef.current?.stop(); recRef.current = null; setListening(false);
      if (interim) send(interim);
      return;
    }
    const handle = startListening(
      (t, final) => { setInterim(t); if (final) { setListening(false); recRef.current = null; send(t); } },
      (t) => { setListening(false); recRef.current = null; if (t) send(t); }
    );
    if (handle) { recRef.current = handle; setListening(true); }
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);

  return (
    <div className="fixed inset-0 z-40 flex items-end" onClick={onClose}>
      <div className="w-full bg-[#111] rounded-t-3xl border-t border-white/10 max-h-[75vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/10">
          <div>
            <p className="text-white font-semibold">{npcName}</p>
            <p className="text-white/40 text-xs">{npcRole} · {langFlag} {langName}</p>
          </div>
          <div className="flex gap-2">
            {npcRole !== "waiter" && npcRole !== "bartender" && (
              <button onClick={onCheckoutRequest} className="text-xs bg-green-500/20 text-green-300 px-3 py-1 rounded-full font-semibold active:scale-95 transition">
                🛒 Checkout
              </button>
            )}
            <button onClick={onClose} className="text-white/40 text-sm px-2">✕</button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {history.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm cursor-pointer ${
                  msg.role === "user"
                    ? "bg-white/15 text-white rounded-br-sm"
                    : "bg-white/8 text-white rounded-bl-sm"
                }`}
                onClick={() => msg.role === "assistant" && setShowEn(prev => ({ ...prev, [i]: !prev[i] }))}
              >
                <p>{showEn[i] && enMap[i] ? enMap[i] : msg.content}</p>
                {msg.role === "assistant" && enMap[i] && (
                  <p className="text-[9px] text-white/30 mt-0.5">{showEn[i] ? "← original" : "tap for EN"}</p>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/8 rounded-2xl px-4 py-2.5">
                <div className="flex gap-1">
                  {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 pb-6 pt-2 border-t border-white/10">
          {listening && interim && (
            <p className="text-white/50 text-xs italic mb-2 px-1">{interim}</p>
          )}
          <div className="flex gap-2 items-center">
            {isSpeechSupported() && (
              <button
                onClick={toggleMic}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 transition ${listening ? "bg-red-500 animate-pulse" : "bg-white/15"}`}
              >
                {listening ? "⏹" : "🎤"}
              </button>
            )}
            <input
              className="flex-1 bg-white/8 border border-white/15 rounded-2xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/40 placeholder:text-white/30"
              placeholder={`Ask ${npcName} something…`}
              value={typed}
              onChange={e => setTyped(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send(typed)}
            />
            <button
              onClick={() => send(typed)}
              disabled={!typed.trim() || loading}
              className="w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center shrink-0 active:scale-90 transition disabled:opacity-40"
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main scenario page ────────────────────────────────────────────────────────

export default function ScenarioPage() {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const scenario = SCENARIOS[params.type as keyof typeof SCENARIOS];

  // Redirect if invalid
  useEffect(() => {
    if (!scenario) router.replace("/scenarios");
  }, [scenario, router]);

  const { settings } = useSettings();
  const { tilt, permissionState, requestPermission } = useDeviceOrientation();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [camState, setCamState] = useState<CamState>("idle");
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [translations, setTranslations] = useState<Record<string, TranslationEntry>>({});

  const [cartEntries, setCartEntries] = useState<CartEntry[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutReply, setCheckoutReply] = useState<{ reply: string; replyEnglish: string; totalLine: string } | undefined>();
  const [checkingOut, setCheckingOut] = useState(false);

  const [npcChatOpen, setNpcChatOpen] = useState(false);
  const [npcBubble, setNpcBubble] = useState<NpcBubble | undefined>();
  const [greetedOnce, setGreetedOnce] = useState(false);

  const [quizActive, setQuizActive] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState<ScenarioQuizQuestion | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizStreak, setQuizStreak] = useState(0);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const screenSize = typeof window !== "undefined"
    ? { w: window.innerWidth, h: window.innerHeight }
    : { w: 390, h: 844 };

  if (!scenario) return null;

  // ── Camera ────────────────────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const startCamera = useCallback(async () => {
    setCamState("requesting");
    streamRef.current?.getTracks().forEach(t => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>(res => { videoRef.current!.onloadedmetadata = () => res(); });
      }
      setCamState("ready");
    } catch { setCamState("denied"); }
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { startCamera(); }, [startCamera]);

  // ── Translation pre-load ──────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (loadState !== "idle") return;
    setLoadState("loading");
    fetch("/api/scenario", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "translate-items",
        language: selectedLang.name,
        items: scenario.items.map(i => ({ id: i.id, labelEn: i.labelEn })),
      }),
    })
      .then(r => r.json())
      .then(data => { setTranslations(data.translations ?? {}); setLoadState("ready"); })
      .catch(() => setLoadState("error"));
  }, [loadState, selectedLang, scenario]);

  function handleLangChange(lang: typeof LANGUAGES[0]) {
    setSelectedLang(lang);
    setLoadState("idle");
    setTranslations({});
    setCheckoutReply(undefined);
  }

  // ── Cart ──────────────────────────────────────────────────────────────────

  function addToCart(item: ScenarioItem) {
    if (cartEntries.find(e => e.item.id === item.id)) return;
    setCartEntries(prev => [...prev, { item, translation: translations[item.id] }]);
  }

  function removeFromCart(id: string) {
    setCartEntries(prev => prev.filter(e => e.item.id !== id));
  }

  async function handleCheckout() {
    setCheckingOut(true);
    const res = await fetch("/api/scenario", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "checkout",
        language: selectedLang.name,
        scenarioId: scenario.id,
        npcRole: scenario.npcRole,
        npcName: scenario.npcName,
        cartItems: cartEntries.map(e => ({
          labelEn: e.item.labelEn,
          translatedName: e.translation?.native ?? e.item.labelEn,
          price: e.item.price ?? "",
        })),
      }),
    });
    const data = await res.json();
    setCheckoutReply(data);
    if (data.reply) speakText(data.reply, selectedLang.name);
    setCheckingOut(false);
  }

  // ── NPC ───────────────────────────────────────────────────────────────────

  async function handleNpcTap() {
    if (npcChatOpen) return;
    if (!greetedOnce) {
      setGreetedOnce(true);
      const res = await fetch("/api/scenario", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "greet", language: selectedLang.name, scenarioId: scenario.id, npcRole: scenario.npcRole, npcName: scenario.npcName }),
      });
      const data = await res.json();
      if (data.reply) {
        setNpcBubble({ reply: data.reply, replyEnglish: data.replyEnglish });
        speakText(data.reply, selectedLang.name);
      }
    }
    setTimeout(() => setNpcChatOpen(true), greetedOnce ? 0 : 1200);
  }

  // ── Quiz ──────────────────────────────────────────────────────────────────

  async function fetchQuizQuestion() {
    setQuizLoading(true);
    const revealed = scenario.items
      .filter(i => revealedIds.has(i.id) && translations[i.id])
      .map(i => ({ labelEn: i.labelEn, nativeWord: translations[i.id]!.native }));

    if (revealed.length === 0) {
      setQuizLoading(false);
      return;
    }

    const res = await fetch("/api/scenario", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "quiz", language: selectedLang.name, scenarioId: scenario.id, revealedItems: revealed, questionType: "mc" }),
    });
    const data = await res.json();
    if (!data.error) {
      setQuizQuestion(data);
      if (data.npcLine) {
        setNpcBubble({ reply: data.npcLine, replyEnglish: data.prompt });
        speakText(data.npcLine, selectedLang.name);
      }
    }
    setQuizLoading(false);
  }

  function handleQuizToggle() {
    if (quizActive) {
      setQuizActive(false);
      setQuizQuestion(null);
      setQuizStreak(0);
    } else {
      setQuizActive(true);
      fetchQuizQuestion();
    }
  }

  function handleAnswer(correct: boolean) {
    setQuizStreak(prev => correct ? prev + 1 : 0);
  }

  function handleNextQuestion() {
    setQuizQuestion(null);
    fetchQuizQuestion();
  }

  // ── Track revealed items ──────────────────────────────────────────────────

  function handleHotspotReveal(id: string) {
    setRevealedIds(prev => new Set([...prev, id]));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const inCartIds = new Set(cartEntries.map(e => e.item.id));
  const hasCart = scenario.items.some(i => i.hasCart);

  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden select-none">
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera or gradient background */}
      <div className="absolute inset-0 z-0">
        {camState === "ready" ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover pointer-events-none" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black`} />
        )}
        {/* Scene tint overlay */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* ── Hotspot dots ── */}
      {loadState === "ready" && scenario.items.map(item => {
        const base = { x: item.x, y: item.y };
        const pos = applyParallax(base.x, base.y, tilt);
        return (
          <div key={item.id} onClick={() => handleHotspotReveal(item.id)}>
            <HotspotDot
              item={item}
              position={pos}
              translation={translations[item.id]}
              langName={selectedLang.name}
              langFlag={selectedLang.flag}
              showRomanized={settings.showRomanized}
              showFurigana={settings.showFurigana}
              inCart={inCartIds.has(item.id)}
              onAddToCart={addToCart}
            />
          </div>
        );
      })}

      {/* Loading dots indicator */}
      {loadState === "loading" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-6 py-4 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-white/60 text-sm">Loading {selectedLang.name}…</p>
          </div>
        </div>
      )}

      {/* ── NPC Character ── */}
      <ScenarioNpc
        charDefIdx={scenario.npcCharDefIdx}
        npcName={scenario.npcName}
        npcRole={scenario.npcRole}
        x={scenario.npcX}
        y={scenario.npcY}
        bubble={npcBubble?.reply}
        bubbleEn={npcBubble?.replyEnglish}
        quizMode={quizActive}
        onTap={handleNpcTap}
      />

      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/85 to-transparent pt-10 pb-5 px-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link href="/scenarios" className="p-2 rounded-full bg-white/15 backdrop-blur-sm active:bg-white/30 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className="text-base">{scenario.emoji}</span>
            <span className="text-white font-semibold text-sm">{scenario.title}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Cart button */}
            {hasCart && (
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2 rounded-full bg-white/15 backdrop-blur-sm active:bg-white/30 transition"
              >
                <span className="text-base">🛒</span>
                {cartEntries.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-green-400 text-black text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {cartEntries.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Language picker */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {LANGUAGES.map(lang => (
            <button
              key={lang.name}
              onClick={() => handleLangChange(lang)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                selectedLang.name === lang.name
                  ? "bg-white text-black shadow-lg"
                  : "bg-white/15 text-white/80 backdrop-blur-sm"
              }`}
            >
              <span className="text-base leading-none">{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Bottom controls ── */}
      <div className="absolute bottom-6 right-4 z-20 flex flex-col items-end gap-2" onClick={e => e.stopPropagation()}>
        {/* Parallax permission (iOS) */}
        {permissionState === "unknown" && (
          <button
            onClick={requestPermission}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/15 text-white/60 backdrop-blur-sm active:scale-95 transition"
          >
            📐 Enable AR parallax
          </button>
        )}

        {/* Quiz toggle */}
        <button
          onClick={handleQuizToggle}
          disabled={quizLoading || loadState !== "ready"}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition active:scale-95 disabled:opacity-50 ${
            quizActive ? "bg-purple-500 text-white" : "bg-white/15 text-white/60 backdrop-blur-sm"
          }`}
        >
          {quizLoading ? <span className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" /> : <span>🎯</span>}
          {quizActive ? "Quiz On" : "Quiz Mode"}
        </button>

        {/* Chat NPC */}
        <button
          onClick={() => setNpcChatOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/15 text-white/60 backdrop-blur-sm active:scale-95 transition"
        >
          💬 Talk to {scenario.npcName}
        </button>
      </div>

      {/* Hint bar (revealed count) */}
      {loadState === "ready" && revealedIds.size === 0 && (
        <div className="absolute bottom-24 left-0 right-0 z-10 flex justify-center pointer-events-none">
          <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-white/50 text-xs">
            Tap the glowing dots to explore ✦
          </div>
        </div>
      )}

      {/* ── Quiz overlay ── */}
      {quizActive && quizQuestion && !quizLoading && (
        <ScenarioQuiz
          question={quizQuestion}
          langName={selectedLang.name}
          onAnswer={handleAnswer}
          onNext={handleNextQuestion}
          streak={quizStreak}
        />
      )}

      {/* ── NPC chat sheet ── */}
      {npcChatOpen && (
        <NpcChatSheet
          npcName={scenario.npcName}
          npcRole={scenario.npcRole}
          langName={selectedLang.name}
          langFlag={selectedLang.flag}
          onClose={() => setNpcChatOpen(false)}
          scenarioId={scenario.id}
          revealedLabels={[...revealedIds].map(id => scenario.items.find(i => i.id === id)?.labelEn ?? "")}
          onCheckoutRequest={() => { setNpcChatOpen(false); setCartOpen(true); }}
        />
      )}

      {/* ── Cart sheet ── */}
      {cartOpen && (
        <CartSheet
          entries={cartEntries}
          langName={selectedLang.name}
          langFlag={selectedLang.flag}
          onRemove={removeFromCart}
          onCheckout={handleCheckout}
          onClose={() => setCartOpen(false)}
          checkoutReply={checkoutReply}
          checkingOut={checkingOut}
        />
      )}
    </main>
  );
}
