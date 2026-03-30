"use client";
import { useState } from "react";
import type { ScenarioItem } from "@/data/scenarios";
import type { TranslationEntry } from "@/app/api/identify/route";
import { speakText } from "@/utils/speech";

const LATIN_LANGS = new Set(["Spanish", "French", "Portuguese", "German"]);

interface HotspotDotProps {
  item: ScenarioItem;
  position: { x: number; y: number };
  translation?: TranslationEntry;
  langName: string;
  langFlag: string;
  showRomanized: boolean;
  showFurigana: boolean;
  inCart: boolean;
  onAddToCart: (item: ScenarioItem) => void;
}

export default function HotspotDot({
  item, position, translation, langName, langFlag,
  showRomanized, showFurigana, inCart, onAddToCart,
}: HotspotDotProps) {
  const [open, setOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const isLatin = LATIN_LANGS.has(langName);
  const showRoman = showRomanized && !isLatin && translation?.roman && translation.roman !== translation.native;
  const showFuri  = showFurigana && langName === "Japanese" && translation?.furi;

  const handleSpeak = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!translation?.native) return;
    setSpeaking(true);
    await speakText(translation.native, langName);
    setSpeaking(false);
  };

  const handleCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(item);
  };

  return (
    <div
      className="absolute"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: "translate(-50%, -50%)",
        transition: "left 0.15s ease-out, top 0.15s ease-out",
        zIndex: open ? 30 : 20,
      }}
      onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
    >
      {/* Dot */}
      {!open && (
        <div className="relative flex items-center justify-center">
          <span className="absolute w-8 h-8 rounded-full bg-white/30 animate-ping" />
          <div className={`relative w-7 h-7 rounded-full flex items-center justify-center text-base shadow-lg border-2 cursor-pointer active:scale-90 transition ${
            inCart ? "bg-green-400 border-green-200" : "bg-white/90 border-white/60"
          }`}>
            {item.emoji}
          </div>
        </div>
      )}

      {/* Card */}
      {open && (
        <div
          className="bg-black/90 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-2xl w-48"
          style={{ transform: "translateY(-110%)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            className="absolute top-2 right-2 text-white/40 text-sm leading-none"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          >✕</button>

          {/* Emoji + native word */}
          <div className="text-center space-y-1 mb-3">
            <div className="text-3xl">{item.emoji}</div>
            {showFuri && translation?.furi && (
              <p className="text-xs text-white/50 tracking-widest">{translation.furi}</p>
            )}
            {translation?.native ? (
              <p className="text-xl font-bold text-white leading-tight">{translation.native}</p>
            ) : (
              <p className="text-white/40 text-sm italic">Loading…</p>
            )}
            {showRoman && translation?.roman && (
              <p className="text-xs text-white/40 italic">{translation.roman}</p>
            )}
            <p className="text-xs text-white/30">{item.labelEn}</p>
            {item.price && (
              <p className="text-xs font-semibold text-yellow-400">{item.price}</p>
            )}
            <div className="flex items-center justify-center gap-1 text-[10px] text-white/30">
              <span>{langFlag}</span><span>{langName}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {translation?.native && (
              <button
                onClick={handleSpeak}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 ${
                  speaking ? "bg-blue-500/30 text-blue-300" : "bg-white/10 text-white/60"
                }`}
              >
                {speaking ? "🔊…" : "🔊 Hear it"}
              </button>
            )}
            {item.hasCart && (
              <button
                onClick={handleCart}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 ${
                  inCart ? "bg-green-500/30 text-green-300" : "bg-white/15 text-white/80"
                }`}
              >
                {inCart ? "✓ Added" : "🛒 Cart"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
