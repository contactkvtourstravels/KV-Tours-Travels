"use client";

import { useEffect } from "react";

/**
 * BackendKeepAliveBeacon
 * Periodically pings /api/keep-alive to keep the Render backend container
 * and Neon PostgreSQL database warm and active while any tab is open.
 * Pings every 4 minutes (Render idle timeout is 15m; Neon idle timeout is 5m).
 */
export function BackendKeepAliveBeacon() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Send immediate background wake-up ping on initial load
    fetch("/api/keep-alive", { cache: "no-store" }).catch(() => {});

    // Ping every 4 minutes (240,000ms)
    const interval = setInterval(() => {
      fetch("/api/keep-alive", { cache: "no-store" }).catch(() => {});
    }, 4 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
