"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { speakText, stopSpeech, startListening, isSpeechSupported, isSynthesisSupported } from "@/utils/speech";

// ── Character designs ────────────────────────────────────────────────────────

export const CHAR_DEFS = [
  { id: "hiro",  name: "Hiro",  skin: "#F5C5A3", shirt: "#3B82F6", hair: "#1C1C1C", pants: "#1E3A5F" },
  { id: "luna",  name: "Luna",  skin: "#C68642", shirt: "#8B5CF6", hair: "#2C1810", pants: "#3B1F6E" },
  { id: "marco", name: "Marco", skin: "#FDDBB4", shirt: "#10B981", hair: "#8B4513", pants: "#065F46" },
];

export function CharacterSvg({ def, facingRight, talking }: {
  def: typeof CHAR_DEFS[0]; facingRight: boolean; talking: boolean;
}) {
  return (
    <svg width="48" height="72" viewBox="0 0 48 72" style={{ transform: facingRight ? "scaleX(-1)" : "none", transition: "transform 0.2s" }}>
      <ellipse cx="24" cy="13" rx="11" ry="7" fill={def.hair} />
      <circle cx="24" cy="18" r="11" fill={def.skin} />
      <circle cx="19" cy="16" r="2.5" fill="white" />
      <circle cx="29" cy="16" r="2.5" fill="white" />
      <circle cx="19.5" cy="16.5" r="1.2" fill="#222" />
      <circle cx="29.5" cy="16.5" r="1.2" fill="#222" />
      <path d="M 16 13 Q 19 11.5 22 13" stroke={def.hair} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M 26 13 Q 29 11.5 32 13" stroke={def.hair} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {talking
        ? <ellipse cx="24" cy="22" rx="3.5" ry="2.5" fill="#C0392B" />
        : <path d="M 20 22 Q 24 25.5 28 22" fill="none" stroke="#C0392B" strokeWidth="1.5" strokeLinecap="round" />
      }
      <circle cx="13" cy="18" r="2.5" fill={def.skin} />
      <circle cx="35" cy="18" r="2.5" fill={def.skin} />
      <rect x="14" y="30" width="20" height="20" rx="5" fill={def.shirt} />
      <path d="M 21 30 L 24 35 L 27 30" fill="white" opacity="0.5" />
      <rect x="6" y="30" width="7" height="15" rx="3.5" fill={def.skin} className="char-arm-l" style={{ transformOrigin: "9.5px 30px" }} />
      <rect x="35" y="30" width="7" height="15" rx="3.5" fill={def.skin} className="char-arm-r" style={{ transformOrigin: "38.5px 30px" }} />
      <rect x="14" y="48" width="20" height="4" rx="2" fill={def.pants} />
      <rect x="14" y="50" width="8" height="18" rx="4" fill={def.pants} className="char-leg-l" style={{ transformOrigin: "18px 50px" }} />
      <rect x="26" y="50" width="8" height="18" rx="4" fill={def.pants} className="char-leg-r" style={{ transformOrigin: "30px 50px" }} />
      <ellipse cx="18" cy="68" rx="5.5" ry="2.5" fill="#222" />
      <ellipse cx="30" cy="68" rx="5.5" ry="2.5" fill="#222" />
    </svg>
  );
}

// ── Mic Button ───────────────────────────────────────────────────────────────

function MicButton({ onTranscript, disabled }: {
  onTranscript: (text: string) => void;
  disabled: boolean;
}) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const handleRef = useRef<{ stop: () => void } | null>(null);

  const toggle = () => {
    if (listening) {
      handleRef.current?.stop();
      setListening(false);
      setInterim("");
    } else {
      setListening(true);
      handleRef.current = startListening(
        (transcript, isFinal) => { setInterim(isFinal ? "" : transcript); if (isFinal) onTranscript(transcript); },
        (final) => { setListening(false); setInterim(""); if (final) onTranscript(final); },
      );
      if (!handleRef.current) setListening(false);
    }
  };

  if (!isSpeechSupported()) return null;

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={toggle}
        disabled={disabled}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition active:scale-90 disabled:opacity-40 ${
          listening ? "bg-red-500 animate-pulse" : "bg-white/20 hover:bg-white/30"
        }`}
        aria-label={listening ? "Stop recording" : "Start recording"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>
      {interim && <p className="text-white/50 text-[10px] max-w-[80px] text-center truncate">{interim}</p>}
    </div>
  );
}

// ── Companion Chat ────────────────────────────────────────────────────────────

interface ChatMsg {
  role: "user" | "assistant";
  text: string;
  textEnglish?: string;
}

function CompanionChat({
  character, onClose, captureFrame, location, selectedLang,
}: {
  character: typeof CHAR_DEFS[0];
  onClose: () => void;
  captureFrame: () => string | null;
  location: { lat: number; lng: number } | null;
  selectedLang: { name: string; flag: string };
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showTranscription, setShowTranscription] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const synthSupported = isSynthesisSupported();
  const isEnglish = selectedLang.name === "English";

  useEffect(() => {
    // Greeting in target language
    const greetings: Record<string, string> = {
      Spanish: `¡Hola! Soy ${character.name}. ¿En qué te puedo ayudar?`,
      "Mandarin Chinese": `你好！我是${character.name}。我能帮你什么吗？`,
      Hindi: `नमस्ते! मैं ${character.name} हूँ। मैं आपकी कैसे मदद कर सकता/सकती हूँ?`,
      Arabic: `مرحباً! أنا ${character.name}. كيف يمكنني مساعدتك؟`,
      French: `Bonjour! Je suis ${character.name}. Comment puis-je vous aider?`,
      Portuguese: `Olá! Eu sou ${character.name}. Como posso te ajudar?`,
      Russian: `Привет! Я ${character.name}. Чем могу помочь?`,
      Japanese: `こんにちは！${character.name}です。何かお手伝いできますか？`,
      German: `Hallo! Ich bin ${character.name}. Wie kann ich dir helfen?`,
      Korean: `안녕하세요! 저는 ${character.name}입니다. 어떻게 도와드릴까요?`,
    };
    const greeting = greetings[selectedLang.name] ?? `Hey! I'm ${character.name}. How can I help?`;
    const englishGreeting = `Hey! I'm ${character.name}. How can I help?`;

    setMessages([{ role: "assistant", text: greeting, textEnglish: englishGreeting }]);
    if (synthSupported) speakText(greeting, selectedLang.name).catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [character.name, selectedLang.name]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const userText = text.trim();
    if (!userText || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userText }]);
    setLoading(true);

    const base64 = captureFrame();
    const history = messages.map(m => ({ role: m.role, content: m.text }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          imageBase64: base64,
          mimeType: "image/jpeg",
          lat: location?.lat,
          lng: location?.lng,
          characterId: character.id,
          history,
          targetLanguage: selectedLang.name,
        }),
      });
      const data = await res.json();
      const newMsg: ChatMsg = {
        role: "assistant",
        text: data.reply,
        textEnglish: data.replyEnglish ?? undefined,
      };
      setMessages(prev => [...prev, newMsg]);

      // Speak the response in the target language
      if (synthSupported && data.reply) {
        setSpeaking(true);
        await speakText(data.reply, selectedLang.name);
        setSpeaking(false);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: isEnglish ? "Sorry, couldn't connect." : "…", textEnglish: "Sorry, couldn't connect." }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, captureFrame, location, character.id, selectedLang.name, synthSupported, isEnglish]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSpeakMessage = async (text: string) => {
    if (!synthSupported) return;
    stopSpeech();
    setSpeaking(true);
    await speakText(text, selectedLang.name);
    setSpeaking(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative mt-auto bg-[#111] rounded-t-3xl flex flex-col max-h-[72vh] shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-white/10">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-end justify-center overflow-hidden">
            <svg width="36" height="36" viewBox="0 0 48 72">
              <circle cx="24" cy="18" r="11" fill={character.skin} />
              <circle cx="19" cy="16" r="2" fill="white" /><circle cx="29" cy="16" r="2" fill="white" />
              <circle cx="19.5" cy="16.5" r="1" fill="#222" /><circle cx="29.5" cy="16.5" r="1" fill="#222" />
              <path d="M 20 22 Q 24 25 28 22" fill="none" stroke="#C0392B" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">{character.name}</p>
            <p className="text-white/40 text-xs flex items-center gap-1">
              <span>{selectedLang.flag}</span>
              <span>Speaking {selectedLang.name}</span>
              {speaking && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-1" />}
            </p>
          </div>

          {/* Transcription toggle */}
          {!isEnglish && (
            <button
              onClick={() => setShowTranscription(v => !v)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition border ${
                showTranscription ? "bg-white/20 text-white border-white/30" : "bg-transparent text-white/30 border-white/10"
              }`}
            >
              EN
            </button>
          )}
          <button onClick={() => { stopSpeech(); onClose(); }} className="text-white/40 text-xl px-2 active:scale-90 transition">✕</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
              <div className={`max-w-[82%] ${m.role === "user" ? "" : ""}`}>
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-white text-black rounded-br-sm"
                    : "bg-white/15 text-white rounded-bl-sm"
                }`}>
                  {m.text}
                  {/* Replay speech button */}
                  {m.role === "assistant" && synthSupported && (
                    <button onClick={() => handleSpeakMessage(m.text)}
                      className="ml-2 opacity-40 hover:opacity-70 transition text-xs">🔊</button>
                  )}
                </div>
                {/* English transcription */}
                {m.role === "assistant" && !isEnglish && showTranscription && m.textEnglish && (
                  <p className="text-white/30 text-xs mt-1 px-1 italic">{m.textEnglish}</p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/15 rounded-2xl rounded-bl-sm px-4 py-2.5 flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2 px-4 py-3 pb-8 border-t border-white/10">
          <MicButton
            onTranscript={sendMessage}
            disabled={loading}
          />
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") sendMessage(input); }}
            placeholder="Ask anything…"
            className="flex-1 bg-white/10 text-white placeholder-white/30 rounded-2xl px-4 py-2.5 text-sm outline-none focus:bg-white/15 transition"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center text-lg disabled:opacity-40 active:scale-90 transition shrink-0"
          >↑</button>
        </div>
      </div>
    </div>
  );
}

// ── Character positions ───────────────────────────────────────────────────────

interface CharState {
  defIdx: number; x: number; y: number; vx: number; vy: number; facingRight: boolean;
}

function useCharPositions(count: number) {
  const [chars, setChars] = useState<CharState[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      defIdx: i % CHAR_DEFS.length,
      x: 10 + i * 35, y: 62 + i * 4,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.1,
      facingRight: Math.random() > 0.5,
    }))
  );

  useEffect(() => {
    const t = setInterval(() => {
      setChars(prev => prev.map(c => {
        let { x, y, vx, vy } = c;
        if (Math.random() < 0.02) vx += (Math.random() - 0.5) * 0.4;
        if (Math.random() < 0.02) vy += (Math.random() - 0.5) * 0.15;
        vx = Math.max(-0.5, Math.min(0.5, vx));
        vy = Math.max(-0.15, Math.min(0.15, vy));
        x += vx; y += vy;
        if (x < 5)  { x = 5;  vx = Math.abs(vx); }
        if (x > 88) { x = 88; vx = -Math.abs(vx); }
        if (y < 58) { y = 58; vy = Math.abs(vy); }
        if (y > 85) { y = 85; vy = -Math.abs(vy); }
        return { ...c, x, y, vx, vy, facingRight: vx < 0 };
      }));
    }, 80);
    return () => clearInterval(t);
  }, []);

  return chars;
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ArCharacters({
  captureFrame,
  selectedLang,
}: {
  captureFrame: () => string | null;
  selectedLang: { name: string; flag: string };
}) {
  const chars = useCharPositions(CHAR_DEFS.length);
  const [chatChar, setChatChar] = useState<typeof CHAR_DEFS[0] | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [walkFrame, setWalkFrame] = useState(0);
  const [talkingIdx, setTalkingIdx] = useState<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setWalkFrame(f => (f + 1) % 2), 300);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}, { enableHighAccuracy: true }
      );
    }
  }, []);

  // Occasional random "talking" animation
  useEffect(() => {
    const t = setInterval(() => {
      const idx = Math.random() < 0.3 ? Math.floor(Math.random() * CHAR_DEFS.length) : null;
      setTalkingIdx(idx);
      if (idx !== null) setTimeout(() => setTalkingIdx(null), 1500);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      {chars.map((c, i) => {
        const def = CHAR_DEFS[c.defIdx];
        return (
          <button
            key={i}
            onClick={e => { e.stopPropagation(); setChatChar(def); }}
            style={{ left: `${c.x}%`, top: `${c.y}%`, transform: "translateX(-50%)" }}
            className={`absolute z-10 flex flex-col items-center gap-0.5 active:scale-110 transition-transform ${
              walkFrame === 0 ? "char-walk-0" : "char-walk-1"
            }`}
          >
            <CharacterSvg def={def} facingRight={c.facingRight} talking={talkingIdx === i} />
            <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">
              {def.name}
            </span>
          </button>
        );
      })}

      {chatChar && (
        <CompanionChat
          character={chatChar}
          onClose={() => { stopSpeech(); setChatChar(null); }}
          captureFrame={captureFrame}
          location={location}
          selectedLang={selectedLang}
        />
      )}
    </>
  );
}
