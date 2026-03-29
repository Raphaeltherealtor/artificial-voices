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

type Result = {
  object: string;
  translations: Record<string, string>;
};

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setCameraReady(false);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch (err) {
      setCameraError("Camera access denied. Please allow camera permissions and refresh.");
      console.error(err);
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode, startCamera]);

  const capture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const base64 = dataUrl.split(",")[1];
    setCapturedImage(dataUrl);
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: "image/jpeg" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      console.error(err);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [cameraReady]);

  const reset = useCallback(() => {
    setResult(null);
    setCapturedImage(null);
    setLoading(false);
  }, []);

  const flipCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    reset();
  }, [reset]);

  return (
    <main className="relative min-h-screen bg-black overflow-hidden">
      {/* Camera / Captured image */}
      <div className="relative w-full h-screen">
        {capturedImage ? (
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-10 pb-4 bg-gradient-to-b from-black/60 to-transparent">
          <h1 className="text-lg font-bold tracking-widest uppercase text-white/90">
            Artificial Voices
          </h1>
          <button
            onClick={flipCamera}
            className="p-2 rounded-full bg-white/20 backdrop-blur-sm active:bg-white/40 transition"
            aria-label="Flip camera"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Camera error */}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <p className="text-center text-red-400 text-sm">{cameraError}</p>
          </div>
        )}

        {/* Results overlay */}
        {(result || loading) && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm overflow-y-auto">
            <div className="min-h-full flex flex-col px-5 pt-16 pb-32">
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
                  <p className="text-white/60 text-sm">Identifying...</p>
                </div>
              ) : result ? (
                <>
                  <div className="text-center mb-8">
                    <p className="text-xs uppercase tracking-widest text-white/40 mb-1">You&apos;re looking at</p>
                    <h2 className="text-3xl font-bold text-white capitalize">{result.object}</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {LANGUAGES.map(({ name, flag }) => {
                      const translation = result.translations?.[name];
                      if (!translation) return null;
                      return (
                        <div
                          key={name}
                          className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3"
                        >
                          <span className="text-2xl">{flag}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white/40 leading-none mb-0.5">{name}</p>
                            <p className="text-base font-semibold text-white truncate">{translation}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-8 px-8 pb-12 pt-6 bg-gradient-to-t from-black/70 to-transparent">
          {result ? (
            <button
              onClick={reset}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-semibold text-sm active:scale-95 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Scan Again
            </button>
          ) : (
            <button
              onClick={capture}
              disabled={!cameraReady || loading}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition shadow-lg"
              aria-label="Capture"
            >
              <div className="w-16 h-16 rounded-full border-4 border-black/20 bg-white" />
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
