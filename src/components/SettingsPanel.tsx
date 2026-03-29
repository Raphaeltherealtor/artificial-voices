"use client";

import type { Settings } from "@/hooks/useSettings";

interface Props {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdate: (patch: Partial<Settings>) => void;
}

function Toggle({ label, description, value, onChange }: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-white/10 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold">{label}</p>
        <p className="text-white/40 text-xs mt-0.5 leading-snug">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0 ${
          value ? "bg-white" : "bg-white/20"
        }`}
      >
        <span className={`absolute top-1 w-5 h-5 rounded-full shadow transition-all duration-200 ${
          value ? "left-6 bg-black" : "left-1 bg-white/60"
        }`} />
      </button>
    </div>
  );
}

export default function SettingsPanel({ open, onClose, settings, onUpdate }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed left-0 right-0 bottom-0 z-50 bg-[#111] rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

        <h2 className="text-white font-bold text-lg mb-1">Settings</h2>
        <p className="text-white/30 text-xs mb-5 uppercase tracking-widest">Artificial Voices</p>

        <div className="space-y-0">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Language Display</p>

          <Toggle
            label="Show Romanized Text"
            description="Pinyin, romaji, transliteration under native script"
            value={settings.showRomanized}
            onChange={(v) => onUpdate({ showRomanized: v })}
          />
          <Toggle
            label="Show Furigana"
            description="Hiragana reading above Japanese kanji"
            value={settings.showFurigana}
            onChange={(v) => onUpdate({ showFurigana: v })}
          />
        </div>

        <div className="mt-5 space-y-0">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Scanning</p>
          <Toggle
            label="Fast Scan"
            description="Identify objects every 1.5s instead of 4s (uses more data)"
            value={settings.fastScan}
            onChange={(v) => onUpdate({ fastScan: v })}
          />
        </div>

        <div className="mt-5 space-y-0">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">AR Companions</p>
          <Toggle
            label="Show AR Companions"
            description="Cartoon characters roam the scene. Tap one to chat — they can give directions, answer questions, and use your camera."
            value={settings.companionsEnabled}
            onChange={(v) => onUpdate({ companionsEnabled: v })}
          />
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full bg-white text-black font-bold py-3.5 rounded-2xl active:scale-95 transition"
        >
          Done
        </button>
      </div>
    </>
  );
}
