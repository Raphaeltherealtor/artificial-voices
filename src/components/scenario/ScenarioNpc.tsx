"use client";
import { useState, useEffect } from "react";
import { CharacterSvg, CHAR_DEFS } from "@/components/ArCharacter";
import { speakText, isSynthesisSupported } from "@/utils/speech";

interface ScenarioNpcProps {
  charDefIdx: number;
  npcName: string;
  npcRole: string;
  x: number;      // % left
  y: number;      // % top
  bubble?: string;
  bubbleEn?: string;
  langName?: string;
  quizMode?: boolean;
  onTap: () => void;
}

export default function ScenarioNpc({
  charDefIdx, npcName, npcRole, x, y,
  bubble, bubbleEn, langName, quizMode, onTap,
}: ScenarioNpcProps) {
  const def = CHAR_DEFS[charDefIdx % CHAR_DEFS.length];
  const [showEn, setShowEn] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (bubble) {
      setVisible(true);
      setShowEn(false);
      if (isSynthesisSupported() && langName) speakText(bubble, langName).catch(() => {});
      const t = setTimeout(() => setVisible(false), 6000);
      return () => clearTimeout(t);
    }
  }, [bubble]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="absolute flex flex-col items-center cursor-pointer"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)", zIndex: 25 }}
      onClick={(e) => { e.stopPropagation(); onTap(); }}
    >
      {/* Speech bubble */}
      {visible && bubble && (
        <div
          className="mb-1 max-w-[180px] bg-white/95 text-black rounded-2xl px-3 py-2 text-xs shadow-lg relative cursor-pointer active:scale-95 transition"
          onClick={(e) => { e.stopPropagation(); setShowEn(v => !v); }}
        >
          <p className="font-medium leading-snug">{showEn && bubbleEn ? bubbleEn : bubble}</p>
          {bubbleEn && (
            <p className="text-[9px] text-black/40 mt-0.5">{showEn ? "← original" : "tap for EN"}</p>
          )}
          {/* Triangle pointer */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/95 rotate-45 rounded-sm" />
        </div>
      )}

      {/* Character */}
      <div className={`relative transition ${quizMode ? "ring-4 ring-purple-500 rounded-full ring-offset-2 ring-offset-transparent animate-pulse" : ""}`}>
        <CharacterSvg def={def} facingRight={false} talking={visible} />
        {/* Tap hint badge */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white/15 backdrop-blur-sm text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap border border-white/20">
          {npcName}
        </div>
        {quizMode && (
          <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            Quiz
          </div>
        )}
      </div>

      <p className="text-[9px] text-white/30 mt-3">{npcRole}</p>
    </div>
  );
}
