// Speech synthesis + recognition utilities

export const LANG_SPEECH_CODES: Record<string, string> = {
  "Spanish":          "es-ES",
  "Mandarin Chinese": "zh-CN",
  "Hindi":            "hi-IN",
  "Arabic":           "ar-SA",
  "French":           "fr-FR",
  "Portuguese":       "pt-BR",
  "Russian":          "ru-RU",
  "Japanese":         "ja-JP",
  "German":           "de-DE",
  "Korean":           "ko-KR",
};

// ── Speech Synthesis ─────────────────────────────────────────────────────────

export function speakText(text: string, langName: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = LANG_SPEECH_CODES[langName] ?? "en-US";
    utter.rate = 0.85;
    utter.pitch = 1.0;

    // Try to find a matching voice
    const voices = window.speechSynthesis.getVoices();
    const code = LANG_SPEECH_CODES[langName]?.split("-")[0] ?? "";
    const match = voices.find(v => v.lang === LANG_SPEECH_CODES[langName])
      ?? voices.find(v => v.lang.startsWith(code))
      ?? null;
    if (match) utter.voice = match;

    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    // Chrome bug: sometimes needs a small delay
    setTimeout(() => window.speechSynthesis.speak(utter), 50);
  });
}

export function stopSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// ── Speech Recognition ───────────────────────────────────────────────────────

type SpeechResultCb = (transcript: string, isFinal: boolean) => void;
type SpeechEndCb = (finalTranscript: string) => void;

export interface RecognitionHandle {
  stop: () => void;
}

export function startListening(
  onResult: SpeechResultCb,
  onEnd: SpeechEndCb,
  lang = "en-US"
): RecognitionHandle | null {
  if (typeof window === "undefined") return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;

  const recognition = new SR();
  recognition.lang = lang;
  recognition.continuous = false;
  recognition.interimResults = true;

  let accumulated = "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onresult = (e: any) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) {
        accumulated += r[0].transcript + " ";
        onResult(accumulated.trim(), true);
      } else {
        interim += r[0].transcript;
        onResult((accumulated + interim).trim(), false);
      }
    }
  };

  recognition.onerror = () => onEnd(accumulated.trim());
  recognition.onend = () => onEnd(accumulated.trim());

  try { recognition.start(); } catch { return null; }
  return { stop: () => { try { recognition.stop(); } catch {} } };
}

export function isSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

export function isSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
