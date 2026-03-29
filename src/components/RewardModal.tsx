"use client";
import { useState } from "react";
import type { UnitDef } from "@/data/curriculum";

interface Props {
  unit: UnitDef;
  onClose: () => void;
  onClaim: () => void;
  claimed: boolean;
}

export default function RewardModal({ unit, onClose, onClaim, claimed }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(unit.reward.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-[#111] rounded-3xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header gradient */}
        <div className={`bg-gradient-to-br ${unit.color} px-6 pt-8 pb-6 text-center`}>
          <p className="text-5xl mb-2">{unit.reward.emoji}</p>
          <h2 className="text-white font-black text-2xl">Unit Complete!</h2>
          <p className="text-white/70 text-sm mt-1">{unit.title}</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="text-center">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Sponsor Reward</p>
            <p className="text-white font-bold text-lg">{unit.reward.sponsor}</p>
            <p className="text-white/70 text-sm">{unit.reward.offer}</p>
          </div>

          {/* Discount code */}
          <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-white/40 text-xs mb-0.5">Your code</p>
              <p className="text-white font-mono font-bold text-base tracking-wider">{unit.reward.code}</p>
            </div>
            <button
              onClick={copy}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                copied ? "bg-green-500 text-white" : "bg-white text-black"
              }`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <p className="text-white/30 text-xs text-center">
            Tap to copy and use at checkout on {unit.reward.sponsor}&apos;s website.
          </p>

          <button
            onClick={() => { if (!claimed) onClaim(); onClose(); }}
            className="w-full bg-white text-black font-bold py-3.5 rounded-2xl active:scale-95 transition"
          >
            {claimed ? "Close" : "Claim & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
