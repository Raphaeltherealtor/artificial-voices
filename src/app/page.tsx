"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { DetectedObject } from "./api/identify/route";

const LANGUAGES = [
  { name: "Spanish",          flag: "🇪🇸" },
  { name: "Mandarin Chinese", flag: "🇨🇳" },
  { name: "Hindi",            flag: "🇮🇳" },
  { name: "Arabic",           flag: "🇸🇦" },
  { name: "French",           flag: "🇫🇷" },
  { name: "Portuguese",       flag: "🇧🇷" },
  { name: "Russian",          flag: "🇷🇺" },
  { name: "Japanese",         flag: "🇯🇵" },
  { name: "German",           flag: "🇩🇪" },
  { name: "Korean",           flag: "🇰🇷" },
];

const SCAN_INTERVAL = 4000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Convert a video-frame percentage (x, y) to screen percentage, accounting
 *  for `object-cover` cropping. */
function videoToScreen(
  vx: number,
  vy: number,
  videoW: number,
  videoH: number,
  screenW: number,
  screenH: number,
): { x: number; y: number } {
  const vAspect = videoW / videoH;
  const sAspect = screenW / screenH;
  let sx: number, sy: number;

  if (vAspect > sAspect) {
    // Video wider → height fills screen, sides cropped
    const visibleW = (screenW / screenH) * videoH;
    const cropLeft = (videoW - visibleW) / 2;
    const px = (vx / 100) * videoW;
    sx = ((px - cropLeft) / visibleW) * 100;
    sy = vy;
  } else {
    // Video taller → width fills screen, top/bottom cropped
    const visibleH = (screenH / screenW) * videoW;
    const cropTop = (videoH - visibleH) / 2;
    const py = (vy / 100) * videoH;
    sy = ((py - cropTop) / visibleH) * 100;
    sx = vx;
  }

  return {
    x: Math.max(5, Math.min(92, sx)),
    y: Math.max(18, Math.min(85, sy)),
  };
}

/** Reverse: screen tap % → video frame % */
function screenToVideo(
  sx: number,
  sy: number,
  videoW: number,
  videoH: number,
  screenW: number,
  screenH: number,
): { x: number; y: number } {
  const vAspect = videoW / videoH;
  const sAspect = screenW / screenH;
  let vx: number, vy: number;

  if (vAspect > sAspect) {
    const visibleW = (screenW / screenH) * videoH;
    const cropLeft = (videoW - visibleW) / 2;
    const px = (sx / 100) * visibleW + cropLeft;
    vx = (px / videoW) * 100;
    vy = sy;
  } else {
    const visibleH = (screenH / screenW) * videoW;
    const cropTop = (videoH - visibleH) / 2;
    const py = (sy / 100) * visibleH + cropTop;
    vy = (py / videoH) * 100;
    vx = sx;
  }

  return { x: Math.max(0, Math.min(100, vx)), y: Math.max(0, Math.min(100, vy)) };
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScanningRef = useRef(false);
  const videoDims = useRef({ w: 1280, h: 720 });

  const [cameraState, setCameraState] = useState<"idle" | "requesting" | "ready" | "denied">("idle");
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [objects, setObjects] = useState<DetectedObject[]>([]);
  const [selectedObj, setSelectedObj] = useState<DetectedObject | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [tapping, setTapping] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  // PWA
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsIOS(!!ios);
    setIsStandalone(standalone);
    if (!standalone && !ios) {
      const handler = (e: Event) => {
        e.preventDefault();
        installPromptRef.current = e as BeforeInstallPromptEvent;
        setShowInstallBanner(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    } else if (!standalone && ios) {
      setShowInstallBanner(true);
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
          videoRef.current!.onloadedmetadata = () => {
            videoDims.current = {
              w: videoRef.current!.videoWidth || 1280,
              h: videoRef.current!.videoHeight || 720,
            };
            resolve();
          };
        });
      }
      setCameraState("ready");
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      setCameraState(name === "NotAllowedError" || name === "PermissionDeniedError" ? "denied" : "denied");
    }
  }, []);

  useEffect(() => {
    if (cameraState === "ready" || cameraState === "requesting") startCamera(facingMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // ── Capture helper ───────────────────────────────────────────────────────

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.65).split(",")[1];
  }, []);

  // ── Full-scene scan (background loop) ────────────────────────────────────

  const scanScene = useCallback(async () => {
    const base64 = captureFrame();
    if (!base64) return;
    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: "image/jpeg" }),
      });
      const data: DetectedObject[] = await res.json();
      if (Array.isArray(data)) setObjects(data);
    } catch { /* silent */ }
  }, [captureFrame]);

  useEffect(() => {
    if (cameraState !== "ready") {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      return;
    }
    const tick = async () => {
      if (isScanningRef.current) return;
      isScanningRef.current = true;
      await scanScene();
      isScanningRef.current = false;
      scanTimerRef.current = setTimeout(tick, SCAN_INTERVAL);
    };
    scanTimerRef.current = setTimeout(tick, 900);
    return () => { if (scanTimerRef.current) clearTimeout(scanTimerRef.current); };
  }, [cameraState, scanScene]);

  // ── Tap on camera (tap-to-identify) ──────────────────────────────────────

  const handleCameraTap = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    if (cameraState !== "ready" || tapping) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = ((e.clientX - rect.left) / rect.width) * 100;
    const screenY = ((e.clientY - rect.top) / rect.height) * 100;

    const { x: vx, y: vy } = screenToVideo(
      screenX, screenY,
      videoDims.current.w, videoDims.current.h,
      rect.width, rect.height,
    );

    const base64 = captureFrame();
    if (!base64) return;

    setTapping(true);
    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: "image/jpeg", tapX: vx, tapY: vy }),
      });
      const data: DetectedObject[] = await res.json();
      if (Array.isArray(data) && data[0]) {
        showBanner(data[0]);
      }
    } catch { /* silent */ }
    finally { setTapping(false); }
  }, [cameraState, tapping, captureFrame]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Banner helper ────────────────────────────────────────────────────────

  const showBanner = useCallback((obj: DetectedObject) => {
    setSelectedObj(obj);
    setBannerVisible(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setBannerVisible(true)));
  }, []);

  const handleChipTap = useCallback((e: React.MouseEvent, obj: DetectedObject) => {
    e.stopPropagation();
    showBanner(obj);
  }, [showBanner]);

  // ── PWA install ──────────────────────────────────────────────────────────

  const handleInstall = async () => {
    if (isIOS) { setShowIOSModal(true); return; }
    if (installPromptRef.current) {
      await installPromptRef.current.prompt();
      const { outcome } = await installPromptRef.current.userChoice;
      if (outcome === "accepted") setShowInstallBanner(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const translation = selectedObj?.translations?.[selectedLang.name];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="relative min-h-screen bg-black overflow-hidden select-none">
      <canvas ref={canvasRef} className="hidden" />

      {/* Full-screen camera tap target */}
      <div
        className="absolute inset-0 z-0 cursor-crosshair"
        onClick={handleCameraTap}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover pointer-events-none"
        />
      </div>

      {/* ── Floating object chips ── */}
      {cameraState === "ready" && objects.map((obj, i) => {
        const screen = videoToScreen(
          obj.x, obj.y,
          videoDims.current.w, videoDims.current.h,
          typeof window !== "undefined" ? window.innerWidth : 390,
          typeof window !== "undefined" ? window.innerHeight : 844,
        );
        const isActive = selectedObj?.label === obj.label;
        return (
          <button
            key={`${obj.label}-${i}`}
            onClick={(e) => handleChipTap(e, obj)}
            style={{ left: `${screen.x}%`, top: `${screen.y}%`, transform: "translate(-50%, -50%)" }}
            className={`absolute z-10 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-lg backdrop-blur-md border transition active:scale-95 ${
              isActive
                ? "bg-white text-black border-white/80 shadow-white/20"
                : "bg-black/60 text-white border-white/25 hover:bg-black/80"
            }`}
          >
            {obj.label}
          </button>
        );
      })}

      {/* Tapping spinner overlay */}
      {tapping && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full border-4 border-white/20 border-t-white animate-spin" />
        </div>
      )}

      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent pt-10 pb-5 px-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xs font-bold tracking-[0.2em] uppercase text-white/50">
            Artificial Voices
          </h1>
          {cameraState === "ready" && (
            <button
              onClick={(e) => { e.stopPropagation(); setFacingMode((p) => p === "environment" ? "user" : "environment"); }}
              className="p-2 rounded-full bg-white/15 backdrop-blur-sm active:bg-white/30 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>

        {/* Language picker */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" onClick={(e) => e.stopPropagation()}>
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

      {/* ── Camera idle ── */}
      {cameraState === "idle" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 px-8 text-center bg-black">
          <span className="text-6xl">📷</span>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Objects are labeled live. Tap any label — or tap directly on the scene — to see the name in {selectedLang.name}.
          </p>
          <button onClick={() => startCamera(facingMode)} className="px-8 py-4 rounded-full bg-white text-black font-bold text-base active:scale-95 transition shadow-lg">
            Start Camera
          </button>
        </div>
      )}

      {cameraState === "requesting" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black">
          <div className="w-10 h-10 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          <p className="text-white/50 text-sm">Starting camera…</p>
        </div>
      )}

      {cameraState === "denied" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black px-8 text-center gap-5">
          <span className="text-5xl">🚫</span>
          <h2 className="text-white font-bold text-xl">Camera Blocked</h2>
          <div className="bg-white/10 rounded-2xl p-4 text-left text-sm text-white/60 space-y-2 w-full max-w-xs">
            <p><span className="text-white font-semibold">iPhone:</span> Settings → Safari → Camera → Allow</p>
            <p><span className="text-white font-semibold">Android:</span> Tap lock icon in address bar → Camera → Allow</p>
            <p><span className="text-white font-semibold">Chrome:</span> Address bar lock icon → Camera → Allow</p>
          </div>
          <button onClick={() => startCamera(facingMode)} className="px-8 py-3 rounded-full bg-white text-black font-bold text-sm active:scale-95 transition">
            Try Again
          </button>
        </div>
      )}

      {/* ── Translation banner ── */}
      {selectedObj && translation && (
        <div
          className={`absolute left-4 right-4 z-20 transition-all duration-500 ease-out ${
            bannerVisible ? "bottom-8 opacity-100" : "bottom-0 opacity-0"
          }`}
          onClick={(e) => { e.stopPropagation(); setBannerVisible(false); setTimeout(() => setSelectedObj(null), 400); }}
        >
          <div className="bg-black/80 backdrop-blur-xl rounded-3xl px-6 py-5 shadow-2xl border border-white/10 text-center">
            {/* Foreign word */}
            <p className="text-4xl font-bold text-white tracking-tight leading-tight">
              {translation}
            </p>
            {/* English below */}
            <p className="text-sm text-white/40 mt-1.5 capitalize">{selectedObj.label}</p>
            {/* Language badge */}
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className="text-base">{selectedLang.flag}</span>
              <span className="text-xs text-white/40 font-medium">{selectedLang.name}</span>
            </div>
            <p className="text-[10px] text-white/25 mt-3">Tap to dismiss</p>
          </div>
        </div>
      )}

      {/* ── Live dot ── */}
      {cameraState === "ready" && (
        <div className="absolute bottom-5 right-5 z-10 flex items-center gap-1.5 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-white/30 font-medium tracking-wide">Live</span>
        </div>
      )}

      {/* ── PWA install banner ── */}
      {showInstallBanner && !isStandalone && cameraState === "ready" && (
        <div className="absolute top-36 left-4 right-4 z-30" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl">
            <span className="text-xl shrink-0">📲</span>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-xs">Add to Home Screen</p>
              <p className="text-white/50 text-xs">Best camera experience as an app</p>
            </div>
            <button onClick={() => setShowInstallBanner(false)} className="text-white/40 text-xs px-1">✕</button>
            <button onClick={handleInstall} className="bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full active:scale-95 transition shrink-0">Install</button>
          </div>
        </div>
      )}

      {/* ── iOS install modal ── */}
      {showIOSModal && (
        <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-sm flex items-end justify-center p-4" onClick={() => setShowIOSModal(false)}>
          <div className="bg-[#1c1c1e] rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-white font-bold text-lg text-center">Install on iPhone</h2>
            <ol className="text-white/60 text-sm space-y-3">
              <li className="flex items-start gap-3"><span className="text-white/30 w-4 shrink-0 text-xs mt-0.5">1</span><span>Tap the <strong className="text-white">Share</strong> button <span className="bg-white/10 rounded px-1 text-white">⎋</span> in Safari</span></li>
              <li className="flex items-start gap-3"><span className="text-white/30 w-4 shrink-0 text-xs mt-0.5">2</span><span>Tap <strong className="text-white">&ldquo;Add to Home Screen&rdquo;</strong></span></li>
              <li className="flex items-start gap-3"><span className="text-white/30 w-4 shrink-0 text-xs mt-0.5">3</span><span>Tap <strong className="text-white">Add</strong> in the top-right</span></li>
            </ol>
            <button onClick={() => setShowIOSModal(false)} className="w-full bg-white text-black font-bold py-3 rounded-2xl active:scale-95 transition">Got it</button>
          </div>
        </div>
      )}
    </main>
  );
}
