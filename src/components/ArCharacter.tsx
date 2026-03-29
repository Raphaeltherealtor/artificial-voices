"use client";

import { useRef, useState, useEffect, useCallback } from "react";

// ── Character designs ────────────────────────────────────────────────────────

const CHAR_DEFS = [
  { id: "hiro",  name: "Hiro",  skin: "#F5C5A3", shirt: "#3B82F6", hair: "#1C1C1C", pants: "#1E3A5F" },
  { id: "luna",  name: "Luna",  skin: "#C68642", shirt: "#8B5CF6", hair: "#2C1810", pants: "#3B1F6E" },
  { id: "marco", name: "Marco", skin: "#FDDBB4", shirt: "#10B981", hair: "#8B4513", pants: "#065F46" },
];

function CharacterSvg({ def, facingRight, talking }: {
  def: typeof CHAR_DEFS[0];
  facingRight: boolean;
  talking: boolean;
}) {
  return (
    <svg
      width="48" height="72" viewBox="0 0 48 72"
      style={{ transform: facingRight ? "scaleX(-1)" : "none", transition: "transform 0.2s" }}
    >
      {/* Hair */}
      <ellipse cx="24" cy="13" rx="11" ry="7" fill={def.hair} />
      {/* Head */}
      <circle cx="24" cy="18" r="11" fill={def.skin} />
      {/* Eyes */}
      <circle cx="19" cy="16" r="2.5" fill="white" />
      <circle cx="29" cy="16" r="2.5" fill="white" />
      <circle cx={talking ? "19.5" : "19.5"} cy="16.5" r="1.2" fill="#222" />
      <circle cx={talking ? "29.5" : "29.5"} cy="16.5" r="1.2" fill="#222" />
      {/* Eyebrows */}
      <path d="M 16 13 Q 19 11.5 22 13" stroke={def.hair} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M 26 13 Q 29 11.5 32 13" stroke={def.hair} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Mouth */}
      {talking ? (
        <ellipse cx="24" cy="22" rx="3.5" ry="2.5" fill="#C0392B" />
      ) : (
        <path d="M 20 22 Q 24 25.5 28 22" fill="none" stroke="#C0392B" strokeWidth="1.5" strokeLinecap="round" />
      )}
      {/* Ears */}
      <circle cx="13" cy="18" r="2.5" fill={def.skin} />
      <circle cx="35" cy="18" r="2.5" fill={def.skin} />
      {/* Body / shirt */}
      <rect x="14" y="30" width="20" height="20" rx="5" fill={def.shirt} />
      {/* Collar */}
      <path d="M 21 30 L 24 35 L 27 30" fill="white" opacity="0.5" />
      {/* Left arm */}
      <rect x="6" y="30" width="7" height="15" rx="3.5" fill={def.skin} className="char-arm-l" style={{ transformOrigin: "9.5px 30px" }} />
      {/* Right arm */}
      <rect x="35" y="30" width="7" height="15" rx="3.5" fill={def.skin} className="char-arm-r" style={{ transformOrigin: "38.5px 30px" }} />
      {/* Pants */}
      <rect x="14" y="48" width="20" height="4" rx="2" fill={def.pants} />
      {/* Left leg */}
      <rect x="14" y="50" width="8" height="18" rx="4" fill={def.pants} className="char-leg-l" style={{ transformOrigin: "18px 50px" }} />
      {/* Right leg */}
      <rect x="26" y="50" width="8" height="18" rx="4" fill={def.pants} className="char-leg-r" style={{ transformOrigin: "30px 50px" }} />
      {/* Shoes */}
      <ellipse cx="18" cy="68" rx="5.5" ry="2.5" fill="#222" />
      <ellipse cx="30" cy="68" rx="5.5" ry="2.5" fill="#222} " />
    </svg>
  );
}

// ── Companion chat ────────────────────────────────────────────────────────────

interface ChatMsg { role: "user" | "assistant"; text: string; }

function CompanionChat({
  character,
  onClose,
  captureFrame,
  location,
}: {
  character: typeof CHAR_DEFS[0];
  onClose: () => void;
  captureFrame: () => string | null;
  location: { lat: number; lng: number } | null;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Greeting on open
    setMessages([{ role: "assistant", text: `Hey! I'm ${character.name}. What can I help you with? I can give directions, answer questions, or help you learn about what you're looking at!` }]);
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [character.name]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    const base64 = captureFrame();
    const history = messages.map((m) => ({
      role: m.role,
      content: m.text,
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          imageBase64: base64,
          mimeType: "image/jpeg",
          lat: location?.lat,
          lng: location?.lng,
          characterId: character.id,
          history,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Sorry, I couldn't connect right now. Try again!" }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, captureFrame, location, character.id]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={(e) => e.stopPropagation()}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Chat sheet */}
      <div className="relative mt-auto bg-[#111] rounded-t-3xl flex flex-col max-h-[70vh] shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-white/10">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex items-end justify-center">
            <svg width="36" height="36" viewBox="0 0 48 72">
              <circle cx="24" cy="18" r="11" fill={character.skin} />
              <circle cx="19" cy="16" r="2" fill="white" /><circle cx="29" cy="16" r="2" fill="white" />
              <circle cx="19.5" cy="16.5" r="1" fill="#222" /><circle cx="29.5" cy="16.5" r="1" fill="#222" />
              <path d="M 20 22 Q 24 25 28 22" fill="none" stroke="#C0392B" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-sm">{character.name}</p>
            <p className="text-white/40 text-xs">AR Companion</p>
          </div>
          <button onClick={onClose} className="ml-auto text-white/40 text-xl px-2 active:scale-90 transition">✕</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-white text-black rounded-br-sm"
                  : "bg-white/15 text-white rounded-bl-sm"
              }`}>
                {m.text}
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

        {/* Input */}
        <div className="flex gap-2 px-4 py-3 pb-8 border-t border-white/10">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Ask anything…"
            className="flex-1 bg-white/10 text-white placeholder-white/30 rounded-2xl px-4 py-2.5 text-sm outline-none focus:bg-white/15 transition"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center text-lg disabled:opacity-40 active:scale-90 transition shrink-0"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Walking character ─────────────────────────────────────────────────────────

interface CharState {
  defIdx: number;
  x: number;  // vw %
  y: number;  // vh %
  vx: number;
  vy: number;
  facingRight: boolean;
}

function useCharacterPositions(count: number) {
  const [chars, setChars] = useState<CharState[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      defIdx: i % CHAR_DEFS.length,
      x: 10 + (i * 35),
      y: 62 + (i * 5),
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.1,
      facingRight: Math.random() > 0.5,
    }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setChars((prev) => prev.map((c) => {
        let { x, y, vx, vy } = c;
        // Occasionally nudge direction
        if (Math.random() < 0.02) vx += (Math.random() - 0.5) * 0.4;
        if (Math.random() < 0.02) vy += (Math.random() - 0.5) * 0.15;
        // Clamp speed
        vx = Math.max(-0.5, Math.min(0.5, vx));
        vy = Math.max(-0.15, Math.min(0.15, vy));
        // Move
        x += vx;
        y += vy;
        // Bounce off walls (stay in bottom 40% of screen)
        if (x < 5)  { x = 5;  vx = Math.abs(vx); }
        if (x > 88) { x = 88; vx = -Math.abs(vx); }
        if (y < 58) { y = 58; vy = Math.abs(vy); }
        if (y > 85) { y = 85; vy = -Math.abs(vy); }
        return { ...c, x, y, vx, vy, facingRight: vx < 0 };
      }));
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return chars;
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ArCharacters({
  captureFrame,
}: {
  captureFrame: () => string | null;
}) {
  const chars = useCharacterPositions(CHAR_DEFS.length);
  const [chatChar, setChatChar] = useState<typeof CHAR_DEFS[0] | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [walkFrame, setWalkFrame] = useState(0);

  // Walk animation tick
  useEffect(() => {
    const t = setInterval(() => setWalkFrame((f) => (f + 1) % 2), 300);
    return () => clearInterval(t);
  }, []);

  // Get location once
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true }
      );
    }
  }, []);

  return (
    <>
      {chars.map((c, i) => {
        const def = CHAR_DEFS[c.defIdx];
        return (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setChatChar(def); }}
            style={{ left: `${c.x}%`, top: `${c.y}%`, transform: "translateX(-50%)" }}
            className={`absolute z-10 flex flex-col items-center gap-0.5 active:scale-110 transition-transform ${
              walkFrame === 0 ? "char-walk-0" : "char-walk-1"
            }`}
          >
            <CharacterSvg def={def} facingRight={c.facingRight} talking={false} />
            {/* Name tag */}
            <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">
              {def.name}
            </span>
          </button>
        );
      })}

      {chatChar && (
        <CompanionChat
          character={chatChar}
          onClose={() => setChatChar(null)}
          captureFrame={captureFrame}
          location={location}
        />
      )}
    </>
  );
}
