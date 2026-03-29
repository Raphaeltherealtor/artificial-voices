"use client";

import { useRef, useState, useCallback, useEffect } from "react";

const LANGUAGES = [
  { name: "Spanish",          flag: "🇪🇸", short: "ES" },
  { name: "Mandarin Chinese", flag: "🇨🇳", short: "ZH" },
  { name: "Hindi",            flag: "🇮🇳", short: "HI" },
  { name: "Arabic",           flag: "🇸🇦", short: "AR" },
  { name: "French",           flag: "🇫🇷", short: "FR" },
  { name: "Portuguese",       flag: "🇧🇷", short: "PT" },
  { name: "Russian",          flag: "🇷🇺", short: "RU" },
  { name: "Japanese",         flag: "🇯🇵", short: "JA" },
  { name: "German",           flag: "🇩🇪", short: "DE" },
  { name: "Korean",           flag: "🇰🇷", short: "KO" },
];

const SCAN_INTERVAL = 3000; // ms between scans

type Result = { object: string; translations: Record<string, string> };

// PWA install prompt type
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScanningRef = useRef(false);

  const [cameraState, setCameraState] = useState<"idle" | "requesting" | "ready" | "denied">("idle");
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [result, setResult] = useState<Result | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  // PWA
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // PWA install detection
  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsIOS(!!ios);
    setIsStandalone(standalone);
    if (!standalone) {
      if (!ios) {
        const handler = (e: Event) => {
          e.preventDefault();
          installPromptRef.current = e as BeforeInstallPromptEvent;
          setShowInstallBanner(true);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
      } else {
        setShowInstallBanner(true);
      }
    }
  }, []);

  // ── Camera ──────────────────────────────────────────────────────────────

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    setCameraState("requesting");
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          videoRef.current!.onloadedmetadata = () => resolve();
        });
      }
      setCameraState("ready");
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      setCameraState(name === "NotAllowedError" || name === "PermissionDeniedError" ? "denied" : "denied");
    }
  }, []);

  // Restart on facing mode change
  useEffect(() => {
    if (cameraState === "ready" || cameraState === "requesting") {
      startCamera(facingMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // ── Scan ────────────────────────────────────────────────────────────────

  const captureAndIdentify = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.65).split(",")[1];

    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: "image/jpeg" }),
      });
      const data: Result = await res.json();
      if (data?.object && data?.translations) {
        setResult(data);
        setBannerVisible(false);
        // Small delay so CSS transition re-triggers on each new result
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setBannerVisible(true));
        });
      }
    } catch {
      // silent
    }
  }, []);

  // Live scan loop — runs whenever camera is ready
  useEffect(() => {
    if (cameraState !== "ready") {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      return;
    }

    const tick = async () => {
      if (isScanningRef.current) return;
      isScanningRef.current = true;
      await captureAndIdentify();
      isScanningRef.current = false;
      scanTimerRef.current = setTimeout(tick, SCAN_INTERVAL);
    };

    // First scan after a short warmup so the camera has frames
    scanTimerRef.current = setTimeout(tick, 800);

    return () => {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, [cameraState, captureAndIdentify]);

  // ── Helpers ─────────────────────────────────────────────────────────────

  const handleInstall = async () => {
    if (isIOS) { setShowIOSModal(true); return; }
    if (installPromptRef.current) {
      await installPromptRef.current.prompt();
      const { outcome } = await installPromptRef.current.userChoice;
      if (outcome === "accepted") setShowInstallBanner(false);
    }
  };

  const translation = result?.translations?.[selectedLang.name];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="relative min-h-screen bg-black overflow-hidden select-none">
      <canvas ref={canvasRef} className="hidden" />

      {/* Full-screen camera */}
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />

      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent pt-10 pb-6 px-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xs font-bold tracking-[0.2em] uppercase text-white/60">Artificial Voices</h1>
          {cameraState === "ready" && (
            <button onClick={() => setFacingMode((p) => (p === "environment" ? "user" : "environment"))}
              className="p-2 rounded-full bg-white/15 backdrop-blur-sm active:bg-white/30 transition" aria-label="Flip camera">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>

        {/* Language picker */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.name}
              onClick={() => setSelectedLang(lang)}
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

      {/* ── Camera idle state ── */}
      {cameraState === "idle" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 px-8 text-center bg-black">
          <span className="text-6xl">📷</span>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Point your camera at any object and see its name in {selectedLang.name} — live.
          </p>
          <button onClick={() => startCamera(facingMode)}
            className="px-8 py-4 rounded-full bg-white text-black font-bold text-base active:scale-95 transition shadow-lg">
            Start Camera
          </button>
        </div>
      )}

      {/* ── Requesting ── */}
      {cameraState === "requesting" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black">
          <div className="w-10 h-10 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          <p className="text-white/50 text-sm">Starting camera…</p>
        </div>
      )}

      {/* ── Denied ── */}
      {cameraState === "denied" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black px-8 text-center gap-5">
          <span className="text-5xl">🚫</span>
          <h2 className="text-white font-bold text-xl">Camera Blocked</h2>
          <p className="text-white/50 text-sm leading-relaxed">Allow camera access to use Artificial Voices.</p>
          <div className="bg-white/10 rounded-2xl p-4 text-left text-sm text-white/60 space-y-2 w-full max-w-xs">
            <p><span className="text-white font-semibold">iPhone:</span> Settings → Safari → Camera → Allow</p>
            <p><span className="text-white font-semibold">Android:</span> Tap the lock icon in the address bar → Camera → Allow</p>
            <p><span className="text-white font-semibold">Chrome:</span> Address bar lock icon → Camera → Allow</p>
          </div>
          <button onClick={() => startCamera(facingMode)}
            className="px-8 py-3 rounded-full bg-white text-black font-bold text-sm active:scale-95 transition">
            Try Again
          </button>
        </div>
      )}

      {/* ── Floating translation banner ── */}
      {cameraState === "ready" && result && translation && (
        <div
          className={`absolute left-4 right-4 z-20 transition-all duration-500 ease-out ${
            bannerVisible ? "bottom-28 opacity-100" : "bottom-20 opacity-0"
          }`}
        >
          <div className="bg-black/75 backdrop-blur-xl rounded-3xl px-6 py-5 shadow-2xl border border-white/10 text-center">
            {/* Foreign word — big */}
            <p className="text-4xl font-bold text-white tracking-tight leading-tight">
              {translation}
            </p>
            {/* English label below */}
            <p className="text-sm text-white/40 mt-1 capitalize">{result.object}</p>
            {/* Language badge */}
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className="text-base">{selectedLang.flag}</span>
              <span className="text-xs text-white/40 font-medium">{selectedLang.name}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Live pulse indicator ── */}
      {cameraState === "ready" && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-white/40 font-medium tracking-wide">Live</span>
        </div>
      )}

      {/* ── PWA install banner ── */}
      {showInstallBanner && !isStandalone && cameraState !== "idle" && (
        <div className="absolute top-36 left-4 right-4 z-30">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl">
            <span className="text-xl shrink-0">📲</span>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-xs">Add to Home Screen</p>
              <p className="text-white/50 text-xs">Best experience as an installed app</p>
            </div>
            <button onClick={() => setShowInstallBanner(false)} className="text-white/40 text-xs px-1">✕</button>
            <button onClick={handleInstall} className="bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full active:scale-95 transition shrink-0">
              Install
            </button>
          </div>
        </div>
      )}

      {/* ── iOS install modal ── */}
      {showIOSModal && (
        <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-[#1c1c1e] rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <h2 className="text-white font-bold text-lg text-center">Install on iPhone</h2>
            <ol className="text-white/60 text-sm space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-white/30 font-mono text-xs mt-0.5 w-4 shrink-0">1</span>
                <span>Tap the <strong className="text-white">Share</strong> button <span className="inline-block bg-white/10 rounded px-1 text-white">⎋</span> in Safari</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-white/30 font-mono text-xs mt-0.5 w-4 shrink-0">2</span>
                <span>Tap <strong className="text-white">&ldquo;Add to Home Screen&rdquo;</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-white/30 font-mono text-xs mt-0.5 w-4 shrink-0">3</span>
                <span>Tap <strong className="text-white">Add</strong> in the top-right corner</span>
              </li>
            </ol>
            <button onClick={() => setShowIOSModal(false)}
              className="w-full bg-white text-black font-bold py-3 rounded-2xl active:scale-95 transition">
              Got it
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
