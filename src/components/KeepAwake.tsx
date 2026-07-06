"use client";

import { useEffect } from "react";

const SERVER_PING_MS = 4 * 60 * 1000;
const ACTIVITY_PING_MS = 30 * 1000;

export default function KeepAwake() {
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    async function requestWakeLock() {
      if (!("wakeLock" in navigator)) return;

      try {
        if (wakeLock && !wakeLock.released) {
          await wakeLock.release();
        }
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => {
          wakeLock = null;
        });
      } catch {
        // Wake lock can fail if page is hidden or unsupported.
      }
    }

    function pingServer() {
      fetch("/api/health", { cache: "no-store" }).catch(() => {
        // ignore ping failures
      });
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        requestWakeLock();
        pingServer();
      }
    }

    function onUserActivity() {
      pingServer();
    }

    requestWakeLock();
    pingServer();

    const serverInterval = window.setInterval(pingServer, SERVER_PING_MS);
    const activityInterval = window.setInterval(onUserActivity, ACTIVITY_PING_MS);

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pointerdown", onUserActivity);
    window.addEventListener("keydown", onUserActivity);

    return () => {
      window.clearInterval(serverInterval);
      window.clearInterval(activityInterval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pointerdown", onUserActivity);
      window.removeEventListener("keydown", onUserActivity);
      wakeLock?.release().catch(() => {
        // ignore release errors
      });
    };
  }, []);

  return null;
}
