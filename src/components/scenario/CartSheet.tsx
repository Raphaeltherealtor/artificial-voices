"use client";
import { useState } from "react";
import type { ScenarioItem } from "@/data/scenarios";
import type { TranslationEntry } from "@/app/api/identify/route";

interface CartEntry {
  item: ScenarioItem;
  translation?: TranslationEntry;
}

interface CartSheetProps {
  entries: CartEntry[];
  langName: string;
  langFlag: string;
  onRemove: (id: string) => void;
  onCheckout: () => void;
  onClose: () => void;
  checkoutReply?: { reply: string; replyEnglish: string; totalLine: string };
  checkingOut: boolean;
}

export default function CartSheet({
  entries, langName, langFlag, onRemove, onCheckout, onClose,
  checkoutReply, checkingOut,
}: CartSheetProps) {
  const [showEn, setShowEn] = useState(false);

  const total = entries.reduce((sum, e) => {
    const n = parseFloat((e.item.price || "0").replace(/[^0-9.]/g, ""));
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  return (
    <div className="fixed inset-0 z-40 flex items-end" onClick={onClose}>
      <div className="w-full bg-[#111] rounded-t-3xl border-t border-white/10 max-h-[75vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10">
          <h2 className="text-white font-bold text-base flex items-center gap-2">
            🛒 Your Cart
            {entries.length > 0 && (
              <span className="bg-white/15 text-white/80 text-xs px-2 py-0.5 rounded-full">{entries.length}</span>
            )}
          </h2>
          <button onClick={onClose} className="text-white/40 text-sm px-2">✕</button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {entries.length === 0 && (
            <p className="text-white/30 text-sm text-center py-6">Cart is empty — tap any item dot then 🛒</p>
          )}
          {entries.map(({ item, translation }) => (
            <div key={item.id} className="flex items-center gap-3 bg-white/5 rounded-2xl px-3 py-2.5">
              <span className="text-2xl">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">{translation?.native ?? item.labelEn}</p>
                {translation?.roman && (
                  <p className="text-white/40 text-xs italic">{translation.roman}</p>
                )}
                <p className="text-white/30 text-xs">{item.labelEn}</p>
              </div>
              {item.price && (
                <p className="text-yellow-400 text-xs font-semibold">{item.price}</p>
              )}
              <button
                onClick={() => onRemove(item.id)}
                className="text-white/30 text-xs px-1 active:text-red-400 transition"
              >✕</button>
            </div>
          ))}
        </div>

        {/* Checkout area */}
        <div className="px-4 pb-6 pt-3 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-sm">Total</span>
            <span className="text-white font-bold">${total.toFixed(2)}</span>
          </div>

          {checkoutReply && (
            <div
              className="bg-white/8 rounded-2xl p-3 cursor-pointer active:bg-white/12 transition"
              onClick={() => setShowEn(v => !v)}
            >
              <p className="text-white text-sm leading-snug">
                {showEn ? checkoutReply.replyEnglish : checkoutReply.reply}
              </p>
              <p className="text-white/30 text-xs mt-1">
                {langFlag} {showEn ? "← original" : "tap for EN"}
              </p>
            </div>
          )}

          <button
            onClick={onCheckout}
            disabled={entries.length === 0 || checkingOut}
            className="w-full py-3.5 rounded-2xl font-bold text-sm transition active:scale-95 disabled:opacity-40 bg-green-500 text-black"
          >
            {checkingOut ? "Processing…" : `Checkout in ${langName} ${langFlag}`}
          </button>
        </div>
      </div>
    </div>
  );
}
