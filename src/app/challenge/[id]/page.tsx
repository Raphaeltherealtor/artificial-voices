"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { UNITS, LANG_DEFS } from "@/data/curriculum";
import { useProgress } from "@/hooks/useProgress";
import type { DetectedObject } from "@/app/api/identify/route";

export default function ChallengePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { completeChallenge, isChallengeComplete } = useProgress();

  const parts = (id ?? "").split("-");
  const langCode = parts[0];
  const unitId = parseInt(parts[1]);

  const langDef = LANG_DEFS.find(l => l.code === langCode);
  const unit = UNITS.find(u => u.id === unitId);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScanRef = useRef(false);

  const [camState, setCamState] = useState<"idle" | "ready" | "denied">("idle");
  const [found, setFound] = useState<Set<string>>(new Set());
  const [lastFound, setLastFound] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [allObjects, setAllObjects] = useState<DetectedObject[]>([]);

  const targets = unit?.challenge.targets ?? [];
  const isFreeScan = targets.length === 0;

  const alreadyDone = langDef && unit ? isChallengeComplete(langCode, unitId) : false;

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>(res => { videoRef.current!.onloadedmetadata = () => res(); });
      }
      setCamState("ready");
    } catch { setCamState("denied"); }
  }, []);

  const captureFrame = useCallback((): string | null => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c || v.videoWidth === 0) return null;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    return c.toDataURL("image/jpeg", 0.6).split(",")[1];
  }, []);

  const scan = useCallback(async () => {
    const base64 = captureFrame();
    if (!base64) return;
    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: "image/jpeg" }),
      });
      const data: DetectedObject[] = await res.json();
      if (!Array.isArray(data)) return;
      setAllObjects(data);
      if (!isFreeScan) {
        data.forEach(obj => {
          const label = obj.label.toLowerCase();
          targets.forEach(target => {
            if (label.includes(target) || target.includes(label)) {
              setFound(prev => {
                if (prev.has(target)) return prev;
                setLastFound(target);
                setTimeout(() => setLastFound(null), 2000);
                return new Set([...prev, target]);
              });
            }
          });
        });
      }
    } catch { /* silent */ }
  }, [captureFrame, isFreeScan, targets]);

  useEffect(() => {
    if (camState !== "ready") return;
    const tick = async () => {
      if (isScanRef.current) return;
      isScanRef.current = true;
      await scan();
      isScanRef.current = false;
      scanRef.current = setTimeout(tick, 2000);
    };
    scanRef.current = setTimeout(tick, 1000);
    return () => { if (scanRef.current) clearTimeout(scanRef.current); };
  }, [camState, scan]);

  // Check completion
  useEffect(() => {
    if (!isFreeScan && targets.length > 0 && found.size >= targets.length && !done) {
      setDone(true);
      if (scanRef.current) clearTimeout(scanRef.current);
      completeChallenge(langCode, unitId, unit!.challenge.xp);
    }
  }, [found, targets, isFreeScan, done, completeChallenge, langCode, unitId, unit]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (scanRef.current) clearTimeout(scanRef.current);
    };
  }, []);

  const handleFreeScanDone = () => {
    if (scanRef.current) clearTimeout(scanRef.current);
    setDone(true);
    completeChallenge(langCode, unitId, unit!.challenge.xp);
  };

  if (!unit || !langDef) return <div className="min-h-screen bg-black flex items-center justify-center text-white/40">Challenge not found</div>;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3 z-20 bg-black/90">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-white/10 active:scale-90 transition shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-2xl">{unit.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">AR Challenge: {unit.challenge.title}</p>
          <p className="text-white/40 text-xs">{langDef.flag} {langDef.name} · Unit {unit.id} · {unit.challenge.xp} XP</p>
        </div>
      </div>

      {/* Done / already complete */}
      {(done || alreadyDone) ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
          <p className="text-7xl">🏆</p>
          <h2 className="text-white font-black text-3xl">Challenge Complete!</h2>
          <p className="text-white/50 text-sm">+{unit.challenge.xp} XP earned</p>
          <button onClick={() => router.push(`/learn/${langCode}`)}
            className="px-8 py-4 rounded-2xl bg-white text-black font-bold text-sm active:scale-95 transition">
            Back to Course →
          </button>
        </div>
      ) : camState === "idle" ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
          <p className="text-5xl">{unit.icon}</p>
          <h2 className="text-white font-bold text-xl">{unit.challenge.title}</h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">{unit.challenge.instruction}</p>
          {!isFreeScan && (
            <div className="w-full max-w-xs">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Find these {targets.length} things</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {targets.map(t => (
                  <span key={t} className="bg-white/10 text-white/70 text-xs px-3 py-1.5 rounded-full capitalize">{t}</span>
                ))}
              </div>
            </div>
          )}
          <button onClick={startCamera}
            className="px-8 py-4 rounded-2xl bg-white text-black font-bold text-base active:scale-95 transition">
            Start Camera
          </button>
        </div>
      ) : camState === "denied" ? (
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <p className="text-white/50 text-sm">Camera access is required for this challenge. Please allow access and try again.</p>
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden">
          {/* Camera feed */}
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />

          {/* AR object chips */}
          {allObjects.map((obj, i) => (
            <div key={i} style={{ left: `${Math.max(5, Math.min(85, obj.x))}%`, top: `${Math.max(20, Math.min(80, obj.y))}%`, transform: "translate(-50%, -50%)" }}
              className="absolute z-10 bg-black/70 backdrop-blur-sm border border-white/25 text-white text-xs font-semibold px-2.5 py-1 rounded-full pointer-events-none">
              {obj.label}
            </div>
          ))}

          {/* Found flash */}
          {lastFound && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-green-500 text-white font-black text-2xl px-8 py-4 rounded-3xl shadow-2xl animate-bounce">
              ✓ {lastFound}!
            </div>
          )}

          {/* Bottom HUD */}
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-md px-4 pt-4 pb-8">
            {!isFreeScan ? (
              <>
                <div className="flex justify-between text-xs text-white/50 mb-2">
                  <span>Found {found.size} / {targets.length}</span>
                  <span className="text-white/30">Point camera at objects</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {targets.map(t => (
                    <span key={t} className={`text-xs px-3 py-1.5 rounded-full font-semibold capitalize transition ${found.has(t) ? "bg-green-500 text-white" : "bg-white/10 text-white/50"}`}>
                      {found.has(t) ? "✓ " : ""}{t}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-white/60 text-xs text-center">{allObjects.length > 0 ? `${allObjects.length} objects detected` : "Point camera at your surroundings…"}</p>
                <button onClick={handleFreeScanDone}
                  className="w-full py-3.5 rounded-2xl bg-white text-black font-bold text-sm active:scale-95 transition">
                  Complete Challenge ✓
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
