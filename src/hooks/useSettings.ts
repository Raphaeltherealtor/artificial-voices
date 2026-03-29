"use client";

import { useState, useEffect } from "react";

export type Settings = {
  showRomanized: boolean;
  showFurigana: boolean;
  companionsEnabled: boolean;
  fastScan: boolean;
};

const DEFAULTS: Settings = {
  showRomanized: true,
  showFurigana: true,
  companionsEnabled: false,
  fastScan: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("av-settings");
      if (stored) setSettings({ ...DEFAULTS, ...JSON.parse(stored) });
    } catch { /* ignore */ }
  }, []);

  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem("av-settings", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  return { settings, update };
}
