"use client";

import { useRef, useState, useCallback, useEffect } from "react";

const LANGUAGES = [
  { name: "Spanish", flag: "🇪🇸" },
  { name: "Mandarin Chinese", flag: "🇨🇳" },
  { name: "Hindi", flag: "🇮🇳" },
  { name: "Arabic", flag: "🇸🇦" },
  { name: "French", flag: "🇫🇷" },
  { name: "Portuguese", flag: "🇧🇷" },
  { name: "Russian", flag: "🇷🇺" },
  { name: "Japanese", flag: "🇯🇵" },
  { name: "German", flag: "🇩🇪" },
  { name: "Korean", flag: "🇰🇷" },
];

type Result = { object: string; translations: Record<string, string> };

// How often to grab a new frame in live mode (ms)
const LIVE_INTERVAL = 3500;

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLiveFetchingRef = useRef(false);

  const [cameraState, setCameraState] = useState<"idle" | "requesting" | "ready" | "denied">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [liveMode, setLiveMode] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  // PWA install prompt
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const installPromptRef = useRef<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);

  // PWA install prompt detection
  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsIOS(ios);
    setIsStandalone(standalone);

    if (!standalone) {
      if (!ios) {
        // Android/Chrome: listen for beforeinstallprompt
        const handler = (e: Event) => {
          e.preventDefault();
          installPromptRef.current = e;
          setShowInstallBanner(true);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
      } else {
        // iOS: always show the add-to-home-screen tip
        setShowInstallBanner(true);
      }
    }
  }, []);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    setCameraState("requesting");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((res) => {
          videoRef.current!.onloadedmetadata = () => res();
        });
      }
      setCameraState("ready");
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setCameraState("denied");
      } else {
        setCameraState("denied");
      }
    }
  }, []);

  // Capture one frame and send to API
  const captureAndIdentify = useCallback(async (): Promise<void> => {
    if (!videoRef.current || !canvasRef.current || cameraState !== "ready") return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];

    setScanning(true);
    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: "image/jpeg" }),
      });
      const data = await res.json();
      if (!data.error) setResult(data);
    } catch {
      // silent fail in live mode
    } finally {
      setScanning(false);
    }
  }, [cameraState]);

  // Live mode loop
  useEffect(() => {
    if (liveMode && cameraState === "ready") {
      const tick = async () => {
        if (isLiveFetchingRef.current) return;
        isLiveFetchingRef.current = true;
        await captureAndIdentify();
        isLiveFetchingRef.current = false;
        liveTimerRef.current = setTimeout(tick, LIVE_INTERVAL);
      };
      tick();
    } else {
      if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
    }
    return () => {
      if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
    };
  }, [liveMode, cameraState, captureAndIdentify]);

  // Restart camera when facing mode changes
  useEffect(() => {
    if (cameraState === "ready" || cameraState === "requesting") {
      startCamera(facingMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const flipCamera = () => {
    setFacingMode((p) => (p === "environment" ? "user" : "environment"));
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }
    if (installPromptRef.current) {
      installPromptRef.current.prompt();
      const { outcome } = await installPromptRef.current.userChoice;
      if (outcome === "accepted") setShowInstallBanner(false);
    }
  };

  // ─── Render states ────────────────────────────────────────────────────────

  return (
    <main className="relative min-h-screen bg-black overflow-hidden select-none">
      {/* Service worker + canvas (hidden) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Camera feed ── */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-safe-top pt-10 pb-4 bg-gradient-to-b from-black/70 to-transparent z-20">
        <h1 className="text-base font-bold tracking-widest uppercase text-white/90">
          Artificial Voices
        </h1>
        {cameraState === "ready" && (
          <button onClick={flipCamera} className="p-2 rounded-full bg-white/20 backdrop-blur-sm active:bg-white/40 transition" aria-label="Flip camera">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Camera idle / requesting ── */}
      {(cameraState === "idle" || cameraState === "requesting") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black">
          {cameraState === "idle" ? (
            <div className="flex flex-col items-center gap-6 px-8 text-center">
              <div className="text-6xl">📷</div>
              <p className="text-white/70 text-sm leading-relaxed">
                Point your camera at any object and see its name in 10 languages instantly.
              </p>
              <button
                onClick={() => startCamera(facingMode)}
                className="px-8 py-4 rounded-full bg-white text-black font-bold text-base active:scale-95 transition"
              >
                Start Camera
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-full border-4 border-white/20 border-t-white animate-spin" />
              <p className="text-white/60 text-sm">Starting camera…</p>
            </div>
          )}
        </div>
      )}

      {/* ── Camera denied ── */}
      {cameraState === "denied" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black px-8 text-center gap-6">
          <div className="text-5xl">🚫</div>
          <h2 className="text-white font-bold text-lg">Camera Access Blocked</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            To use Artificial Voices, allow camera access:
          </p>
          <div className="bg-white/10 rounded-2xl p-4 text-left text-sm text-white/70 leading-relaxed space-y-2 w-full max-w-xs">
            <p><span className="text-white font-semibold">iPhone/iPad:</span> Settings → Safari → Camera → Allow</p>
            <p><span className="text-white font-semibold">Android:</span> Browser address bar → lock icon → Camera → Allow</p>
            <p><span className="text-white font-semibold">Chrome desktop:</span> Address bar → lock icon → Camera → Allow</p>
          </div>
          <button onClick={() => startCamera(facingMode)} className="px-8 py-3 rounded-full bg-white text-black font-bold text-sm active:scale-95 transition">
            Try Again
          </button>
        </div>
      )}

      {/* ── Live scanning pulse ring ── */}
      {liveMode && cameraState === "ready" && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${scanning ? "bg-yellow-400 animate-pulse" : "bg-green-400 animate-pulse"}`} />
          <span className="text-xs text-white/70 font-medium">{scanning ? "Identifying…" : "Live"}</span>
        </div>
      )}

      {/* ── Results panel ── */}
      {result && cameraState === "ready" && (
        <div className="absolute bottom-32 left-0 right-0 z-10 px-4">
          <div className="bg-black/80 backdrop-blur-md rounded-3xl p-4 max-h-64 overflow-y-auto">
            <p className="text-center text-xs text-white/40 uppercase tracking-widest mb-1">Detected</p>
            <p className="text-center text-xl font-bold text-white capitalize mb-3">{result.object}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {LANGUAGES.map(({ name, flag }) => {
                const t = result.translations?.[name];
                if (!t) return null;
                return (
                  <div key={name} className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                    <span className="text-lg leading-none">{flag}</span>
                    <div className="min-w-0">
                      <p className="text-[10px] text-white/40 leading-none">{name}</p>
                      <p className="text-sm font-semibold text-white truncate">{t}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom controls ── */}
      {cameraState === "ready" && (
        <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-6 pb-10 pt-4 bg-gradient-to-t from-black/60 to-transparent">
          {/* Snap button */}
          {!liveMode && (
            <button
              onClick={captureAndIdentify}
              disabled={scanning}
              className="w-18 h-18 w-[72px] h-[72px] rounded-full bg-white flex items-center justify-center disabled:opacity-50 active:scale-90 transition shadow-lg"
              aria-label="Identify"
            >
              <div className="w-[60px] h-[60px] rounded-full border-4 border-black/20 bg-white" />
            </button>
          )}

          {/* Live toggle */}
          <button
            onClick={() => setLiveMode((v) => !v)}
            className={`px-5 py-2.5 rounded-full text-sm font-bold transition active:scale-95 ${
              liveMode
                ? "bg-green-400 text-black"
                : "bg-white/20 backdrop-blur-sm text-white"
            }`}
          >
            {liveMode ? "⏹ Stop Live" : "▶ Live"}
          </button>
        </div>
      )}

      {/* ── PWA Install Banner ── */}
      {showInstallBanner && !isStandalone && (
        <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-6 pt-2">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 flex items-center gap-3 shadow-xl">
            <span className="text-2xl">📲</span>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">Add to Home Screen</p>
              <p className="text-white/60 text-xs">Install for the best camera experience</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setShowInstallBanner(false)} className="text-white/50 text-xs px-2 py-1">
                Not now
              </button>
              <button onClick={handleInstall} className="bg-white text-black text-xs font-bold px-4 py-2 rounded-full active:scale-95 transition">
                Install
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── iOS install instructions modal ── */}
      {showIOSInstructions && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-[#1c1c1e] rounded-3xl p-6 w-full max-w-sm text-center space-y-4 shadow-2xl">
            <h2 className="text-white font-bold text-lg">Install on iPhone</h2>
            <ol className="text-white/70 text-sm text-left space-y-3 list-none">
              <li className="flex items-start gap-3">
                <span className="text-white/40 font-mono text-xs mt-0.5">1</span>
                <span>Tap the <strong className="text-white">Share</strong> button <span className="inline-block bg-white/10 rounded px-1">⎋</span> in Safari&apos;s toolbar</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-white/40 font-mono text-xs mt-0.5">2</span>
                <span>Scroll down and tap <strong className="text-white">&ldquo;Add to Home Screen&rdquo;</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-white/40 font-mono text-xs mt-0.5">3</span>
                <span>Tap <strong className="text-white">Add</strong> in the top-right corner</span>
              </li>
            </ol>
            <p className="text-white/40 text-xs">The app will appear on your home screen and use your full screen.</p>
            <button onClick={() => setShowIOSInstructions(false)} className="w-full bg-white text-black font-bold py-3 rounded-2xl active:scale-95 transition">
              Got it
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
