"use client";
import { useState, useEffect, useCallback } from "react";

export interface TiltState {
  beta: number;   // forward/back tilt, degrees; 0=flat, ~45=upright
  gamma: number;  // left/right tilt, degrees; 0=upright portrait
}

export type PermissionState = "unknown" | "granted" | "denied" | "unsupported";

export interface DeviceOrientationResult {
  tilt: TiltState;
  permissionState: PermissionState;
  requestPermission: () => void;
}

export function useDeviceOrientation(): DeviceOrientationResult {
  const [tilt, setTilt] = useState<TiltState>({ beta: 45, gamma: 0 });
  const [permissionState, setPermissionState] = useState<PermissionState>("unknown");

  const subscribe = useCallback(() => {
    const handler = (e: DeviceOrientationEvent) => {
      setTilt({
        beta:  Math.max(-90, Math.min(90, e.beta  ?? 45)),
        gamma: Math.max(-90, Math.min(90, e.gamma ?? 0)),
      });
    };
    window.addEventListener("deviceorientation", handler, { passive: true });
    setPermissionState("granted");
    return () => window.removeEventListener("deviceorientation", handler);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      setPermissionState("unsupported");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DOE = DeviceOrientationEvent as any;
    if (typeof DOE.requestPermission === "function") {
      // iOS 13+ — needs explicit permission click; don't auto-request
      setPermissionState("unknown");
    } else if ("DeviceOrientationEvent" in window) {
      // Android / desktop — fires automatically
      return subscribe();
    } else {
      setPermissionState("unsupported");
    }
  }, [subscribe]);

  const requestPermission = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DOE = DeviceOrientationEvent as any;
    if (typeof DOE.requestPermission === "function") {
      DOE.requestPermission()
        .then((state: string) => {
          if (state === "granted") subscribe();
          else setPermissionState("denied");
        })
        .catch(() => setPermissionState("denied"));
    } else {
      subscribe();
    }
  }, [subscribe]);

  return { tilt, permissionState, requestPermission };
}

// Apply parallax shift to a base position based on device tilt
export function applyParallax(
  baseX: number,
  baseY: number,
  tilt: TiltState,
  strength = 4
): { x: number; y: number } {
  const dx = (tilt.gamma / 90) * -strength;
  const dy = ((tilt.beta - 45) / 90) * -strength;
  return {
    x: Math.max(5, Math.min(92, baseX + dx)),
    y: Math.max(15, Math.min(85, baseY + dy)),
  };
}
