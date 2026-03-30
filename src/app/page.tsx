"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { DetectedObject, TranslationEntry } from "./api/identify/route";
import SettingsPanel from "@/components/SettingsPanel";
import RoomQuiz from "@/components/RoomQuiz";
import { useSettings } from "@/hooks/useSettings";
import { useProgress } from "@/hooks/useProgress";

// Lazy-load AR characters (they use geolocation + animation — no SSR needed)
const ArCharacters = dynamic(() => import("@/components/ArCharacter"), { ssr: false });

function LearnButton() {
  const { totalXP } = useProgress();
  return (
    <Link href="/learn" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs font-semibold active:scale-95 transition border border-white/20">
      <span>📚</span>
      <span>Learn</span>
      {totalXP > 0 && <span className="bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full">{totalXP}</span>}
    </Link>
  );
}

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

// Languages that always use Latin script — no romanization needed
const LATIN_LANGS = new Set(["Spanish", "French", "Portuguese", "German"]);

const FAST_INTERVAL = 1200;
const NORMAL_INTERVAL = 4000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function videoToScreen(vx: number, vy: number, vW: number, vH: number, sW: number, sH: number) {
  const vA = vW / vH, sA = sW / sH;
  let sx: number, sy: number;
  if (vA > sA) {
    const vis = (sW / sH) * vH;
    const crop = (vW - vis) / 2;
    sx = (((vx / 100) * vW - crop) / vis) * 100;
    sy = vy;
  } else {
    const vis = (sH / sW) * vW;
    const crop = (vH - vis) / 2;
    sy = (((vy / 100) * vH - crop) / vis) * 100;
    sx = vx;
  }
  return { x: Math.max(5, Math.min(92, sx)), y: Math.max(18, Math.min(85, sy)) };
}

function screenToVideo(sx: number, sy: number, vW: number, vH: number, sW: number, sH: number) {
  const vA = vW / vH, sA = sW / sH;
  let vx: number, vy: number;
  if (vA > sA) {
    const vis = (sW / sH) * vH;
    const crop = (vW - vis) / 2;
    vx = (((sx / 100) * vis + crop) / vW) * 100;
    vy = sy;
  } else {
    const vis = (sH / sW) * vW;
    const crop = (vH - vis) / 2;
    vy = (((sy / 100) * vis + crop) / vH) * 100;
    vx = sx;
  }
  return { x: Math.max(0, Math.min(100, vx)), y: Math.max(0, Math.min(100, vy)) };
}

// ── Translation display ───────────────────────────────────────────────────────

function TranslationDisplay({
  entry,
  langName,
  showRomanized,
  showFurigana,
  size = "lg",
}: {
  entry: TranslationEntry;
  langName: string;
  showRomanized: boolean;
  showFurigana: boolean;
  size?: "lg" | "sm";
}) {
  const isLatin = LATIN_LANGS.has(langName);
  const showRoman = showRomanized && !isLatin && entry.roman && entry.roman !== entry.native;
  const showFuri = showFurigana && langName === "Japanese" && entry.furi;

  if (size === "sm") {
    return (
      <div className="min-w-0">
        <p className="text-sm font-bold text-white truncate">{entry.native}</p>
        {showFuri && <p className="text-[10px] text-white/50 truncate">{entry.furi}</p>}
        {showRoman && <p className="text-[10px] text-white/40 truncate italic">{entry.roman}</p>}
      </div>
    );
  }

  return (
    <div className="text-center">
      {showFuri && (
        <p className="text-lg text-white/60 mb-0.5 tracking-widest">{entry.furi}</p>
      )}
      <p className="text-4xl font-bold text-white tracking-tight leading-tight">{entry.native}</p>
      {showRoman && (
        <p className="text-base text-white/50 mt-1 italic">{entry.roman}</p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gestureCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScanningRef = useRef(false);
  const videoDims = useRef({ w: 1280, h: 720 });
  const gesturePoints = useRef<{ x: number; y: number }[]>([]);
  const lastWasTouch = useRef(false);

  const { settings, update: updateSettings } = useSettings();

  const [cameraState, setCameraState] = useState<"idle" | "requesting" | "ready" | "denied">("idle");
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [objects, setObjects] = useState<DetectedObject[]>([]);
  const [selectedObj, setSelectedObj] = useState<DetectedObject | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [tapping, setTapping] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scanActive, setScanActive] = useState(true);
  const [quizMode, setQuizMode] = useState(false);
  const [circleFlash, setCircleFlash] = useState<{ x: number; y: number; r: number } | null>(null);

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
      const h = (e: Event) => { e.preventDefault(); installPromptRef.current = e as BeforeInstallPromptEvent; setShowInstallBanner(true); };
      window.addEventListener("beforeinstallprompt", h);
      return () => window.removeEventListener("beforeinstallprompt", h);
    } else if (!standalone && ios) {
      setShowInstallBanner(true);
    }
  }, []);

  // ── Camera stream cleanup on unmount (releases camera for other pages) ──────
  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  // ── Circle gesture detection ──────────────────────────────────────────────

  function detectCircle(pts: { x: number; y: number }[]) {
    if (pts.length < 18) return null;
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const radii = pts.map(p => Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2));
    const avgR = radii.reduce((s, r) => s + r, 0) / radii.length;
    if (avgR < 25) return null;
    const variance = radii.reduce((s, r) => s + (r - avgR) ** 2, 0) / radii.length;
    const circularity = Math.sqrt(variance) / avgR;
    const startEnd = Math.sqrt((pts[0].x - pts[pts.length - 1].x) ** 2 + (pts[0].y - pts[pts.length - 1].y) ** 2);
    if (circularity < 0.45 && startEnd < avgR * 1.5) return { x: cx, y: cy, r: avgR };
    return null;
  }

  function drawGesture(pts: { x: number; y: number }[]) {
    const canvas = gestureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = "rgba(147,197,253,0.75)";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(99,179,237,0.9)";
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  function clearGesture() {
    const canvas = gestureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }

  // ── Camera ──────────────────────────────────────────────────────────────────

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
        await new Promise<void>((res) => {
          const v = videoRef.current!;
          const finish = () => {
            videoDims.current = { w: v.videoWidth || 1280, h: v.videoHeight || 720 };
            res();
          };
          // Metadata may have already loaded before we subscribed
          if (v.readyState >= 1) { finish(); return; }
          v.addEventListener("loadedmetadata", finish, { once: true });
          // Fallback: don't hang forever on slow devices
          setTimeout(finish, 4000);
        });
        videoRef.current.play().catch(() => {});
      }
      setCameraState("ready");
    } catch (err) {
      const n = err instanceof Error ? err.name : "";
      setCameraState(n === "NotAllowedError" || n === "PermissionDeniedError" ? "denied" : "denied");
    }
  }, []);

  useEffect(() => {
    if (cameraState === "ready" || cameraState === "requesting") startCamera(facingMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // ── Frame capture ──────────────────────────────────────────────────────────

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.65).split(",")[1];
  }, []);

  // ── Scene scan loop ────────────────────────────────────────────────────────

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
    if (cameraState !== "ready" || !scanActive) {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      return;
    }
    const interval = settings.fastScan ? FAST_INTERVAL : NORMAL_INTERVAL;
    const tick = async () => {
      if (isScanningRef.current) return;
      isScanningRef.current = true;
      await scanScene();
      isScanningRef.current = false;
      scanTimerRef.current = setTimeout(tick, interval);
    };
    scanTimerRef.current = setTimeout(tick, 800);
    return () => { if (scanTimerRef.current) clearTimeout(scanTimerRef.current); };
  }, [cameraState, scanScene, settings.fastScan, scanActive]);

  // ── Tap to identify ────────────────────────────────────────────────────────

  const identifyAtScreenPos = useCallback(async (clientX: number, clientY: number, el: Element) => {
    if (cameraState !== "ready" || tapping) return;
    const rect = el.getBoundingClientRect();
    const sx = ((clientX - rect.left) / rect.width) * 100;
    const sy = ((clientY - rect.top) / rect.height) * 100;
    const { x: vx, y: vy } = screenToVideo(sx, sy, videoDims.current.w, videoDims.current.h, rect.width, rect.height);
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
      if (Array.isArray(data) && data[0]) showBanner(data[0]);
    } catch { /* silent */ }
    finally { setTapping(false); }
  }, [cameraState, tapping, captureFrame]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCameraClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (lastWasTouch.current) { lastWasTouch.current = false; return; } // skip if touch fired it
    identifyAtScreenPos(e.clientX, e.clientY, e.currentTarget);
  }, [identifyAtScreenPos]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    lastWasTouch.current = true;
    const t = e.touches[0];
    gesturePoints.current = [{ x: t.clientX, y: t.clientY }];
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const t = e.touches[0];
    gesturePoints.current.push({ x: t.clientX, y: t.clientY });
    drawGesture(gesturePoints.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    clearGesture();
    const pts = gesturePoints.current;
    const circle = detectCircle(pts);
    if (circle) {
      // Circle gesture — identify what's in the center
      setCircleFlash(circle);
      setTimeout(() => setCircleFlash(null), 700);
      identifyAtScreenPos(circle.x, circle.y, e.currentTarget);
    } else if (pts.length <= 5) {
      // Very short path = tap
      const last = pts[pts.length - 1] ?? { x: 0, y: 0 };
      identifyAtScreenPos(last.x, last.y, e.currentTarget);
    }
    gesturePoints.current = [];
  }, [identifyAtScreenPos]); // eslint-disable-line react-hooks/exhaustive-deps

  const showBanner = useCallback((obj: DetectedObject) => {
    setSelectedObj(obj);
    setBannerVisible(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setBannerVisible(true)));
  }, []);

  const handleChipTap = useCallback((e: React.MouseEvent, obj: DetectedObject) => {
    e.stopPropagation();
    showBanner(obj);
  }, [showBanner]);

  const handleInstall = async () => {
    if (isIOS) { setShowIOSModal(true); return; }
    if (installPromptRef.current) {
      await installPromptRef.current.prompt();
      const { outcome } = await installPromptRef.current.userChoice;
      if (outcome === "accepted") setShowInstallBanner(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const selectedEntry = selectedObj?.translations?.[selectedLang.name] as TranslationEntry | undefined;
  const screenSize = typeof window !== "undefined"
    ? { w: window.innerWidth, h: window.innerHeight }
    : { w: 390, h: 844 };

  // Pre-compute screen positions for RoomQuiz chips
  const screenPositions: Record<string, { x: number; y: number }> = {};
  objects.forEach(obj => {
    screenPositions[obj.label] = videoToScreen(obj.x, obj.y, videoDims.current.w, videoDims.current.h, screenSize.w, screenSize.h);
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="relative min-h-screen bg-black overflow-hidden select-none">
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera + gesture layer */}
      <div
        className="absolute inset-0 z-0 cursor-crosshair"
        onClick={handleCameraClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: "none" }}
      >
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover pointer-events-none" />
        {/* Gesture drawing canvas */}
        <canvas ref={gestureCanvasRef} className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }} />
      </div>

      {/* Circle flash animation */}
      {circleFlash && (
        <div
          className="absolute pointer-events-none z-10 rounded-full border-2 border-blue-300/80"
          style={{
            left: circleFlash.x - circleFlash.r,
            top: circleFlash.y - circleFlash.r,
            width: circleFlash.r * 2,
            height: circleFlash.r * 2,
            boxShadow: "0 0 24px rgba(147,197,253,0.8)",
            animation: "av-circle-flash 0.7s ease-out forwards",
          }}
        />
      )}

      {/* ── Room Quiz mode ── */}
      {cameraState === "ready" && quizMode && scanActive && (
        <RoomQuiz
          objects={objects}
          selectedLang={selectedLang}
          captureFrame={captureFrame}
          screenPositions={screenPositions}
        />
      )}

      {/* ── Glowing dots (hidden in quiz mode) ── */}
      {cameraState === "ready" && scanActive && !quizMode && objects.map((obj, i) => {
        const sp = videoToScreen(obj.x, obj.y, videoDims.current.w, videoDims.current.h, screenSize.w, screenSize.h);
        const isActive = selectedObj?.label === obj.label;
        return (
          <button
            key={`${obj.label}-${i}`}
            onClick={(e) => handleChipTap(e, obj)}
            style={{ left: `${sp.x}%`, top: `${sp.y}%`, transform: "translate(-50%, -50%)" }}
            className={`absolute z-10 flex items-center justify-center active:scale-90 transition-all ${isActive ? "scale-110" : ""}`}
          >
            {/* Outer ping ring */}
            <span className={`absolute w-5 h-5 rounded-full animate-ping ${isActive ? "bg-white/50" : "bg-blue-300/40"}`} />
            {/* Solid dot */}
            <span className={`relative w-3.5 h-3.5 rounded-full shadow-lg ${
              isActive ? "bg-white ring-2 ring-white/60" : "bg-blue-300/90 ring-1 ring-white/30"
            }`} />
          </button>
        );
      })}

      {/* AR characters */}
      {cameraState === "ready" && settings.companionsEnabled && (
        <ArCharacters captureFrame={captureFrame} selectedLang={selectedLang} />
      )}

      {/* Tapping spinner */}
      {tapping && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
        </div>
      )}

      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/85 to-transparent pt-10 pb-5 px-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xs font-bold tracking-[0.2em] uppercase text-white/50">Artificial Voices</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-full bg-white/15 backdrop-blur-sm active:bg-white/30 transition"
              aria-label="Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            {cameraState === "ready" && (
              <button
                onClick={() => setFacingMode((p) => p === "environment" ? "user" : "environment")}
                className="p-2 rounded-full bg-white/15 backdrop-blur-sm active:bg-white/30 transition"
                aria-label="Flip camera"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>
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

      {/* ── Camera states ── */}
      {cameraState === "idle" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 px-8 text-center bg-black">
          <span className="text-6xl">📷</span>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Point at anything and <strong className="text-white">draw a circle</strong> around it to identify it in {selectedLang.name}. Glowing dots mark detected objects — tap to reveal.
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
            <p><span className="text-white font-semibold">Android:</span> Tap lock icon → Camera → Allow</p>
            <p><span className="text-white font-semibold">Chrome:</span> Address bar lock → Camera → Allow</p>
          </div>
          <button onClick={() => startCamera(facingMode)} className="px-8 py-3 rounded-full bg-white text-black font-bold text-sm active:scale-95 transition">
            Try Again
          </button>
        </div>
      )}

      {/* ── Translation banner ── */}
      {selectedObj && selectedEntry && (
        <div
          className={`absolute left-4 right-4 z-20 transition-all duration-500 ease-out ${
            bannerVisible ? "bottom-8 opacity-100" : "bottom-0 opacity-0"
          }`}
          onClick={(e) => { e.stopPropagation(); setBannerVisible(false); setTimeout(() => setSelectedObj(null), 400); }}
        >
          <div className="bg-black/85 backdrop-blur-xl rounded-3xl px-6 py-5 shadow-2xl border border-white/10">
            {/* Foreign word */}
            <TranslationDisplay
              entry={selectedEntry}
              langName={selectedLang.name}
              showRomanized={settings.showRomanized}
              showFurigana={settings.showFurigana}
            />
            {/* English */}
            <p className="text-center text-sm text-white/40 mt-2 capitalize">{selectedObj.label}</p>
            {/* Language badge */}
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className="text-base">{selectedLang.flag}</span>
              <span className="text-xs text-white/40 font-medium">{selectedLang.name}</span>
            </div>
            <p className="text-center text-[10px] text-white/20 mt-2">Tap to dismiss</p>
          </div>
        </div>
      )}

      {/* ── Learn button (floating bottom-left) ── */}
      {cameraState === "ready" && (
        <div className="absolute bottom-6 left-4 z-20" onClick={(e) => e.stopPropagation()}>
          <LearnButton />
        </div>
      )}

      {/* ── Scan toggle (floating bottom-right) ── */}
      {cameraState === "ready" && (
        <div className="absolute bottom-6 right-4 z-20 flex flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Fast scan pill */}
          <button
            onClick={() => updateSettings({ fastScan: !settings.fastScan })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition active:scale-95 ${
              settings.fastScan
                ? "bg-yellow-400 text-black"
                : "bg-white/15 text-white/60 backdrop-blur-sm"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${settings.fastScan ? "bg-black animate-pulse" : "bg-white/40"}`} />
            {settings.fastScan ? "Fast" : "Normal"}
          </button>

          {/* Scan on/off */}
          <button
            onClick={() => setScanActive((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition active:scale-95 ${
              scanActive
                ? "bg-green-400 text-black"
                : "bg-white/15 text-white/50 backdrop-blur-sm"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${scanActive ? "bg-black animate-pulse" : "bg-white/40"}`} />
            {scanActive ? "Scanning" : "Paused"}
          </button>

          {/* Quiz mode toggle */}
          <button
            onClick={() => setQuizMode(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition active:scale-95 ${
              quizMode ? "bg-purple-500 text-white" : "bg-white/15 text-white/60 backdrop-blur-sm"
            }`}
          >
            <span>🎯</span>
            {quizMode ? "Quiz On" : "Quiz"}
          </button>
        </div>
      )}

      {/* ── Settings panel ── */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdate={updateSettings}
      />

      {/* ── PWA banner ── */}
      {showInstallBanner && !isStandalone && cameraState === "ready" && (
        <div className="absolute top-36 left-4 right-4 z-30" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl">
            <span className="text-xl shrink-0">📲</span>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-xs">Add to Home Screen</p>
              <p className="text-white/50 text-xs">Best experience as an installed app</p>
            </div>
            <button onClick={() => setShowInstallBanner(false)} className="text-white/40 text-xs px-1">✕</button>
            <button onClick={handleInstall} className="bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full active:scale-95 transition shrink-0">Install</button>
          </div>
        </div>
      )}

      {/* iOS modal */}
      {showIOSModal && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end justify-center p-4" onClick={() => setShowIOSModal(false)}>
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
