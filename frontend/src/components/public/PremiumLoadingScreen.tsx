"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Loader2,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Maximize2,
  Minimize2,
  Globe,
  X,
} from "lucide-react";
import { subscribeToBackendWakeUp, type BackendWakeUpState } from "@/lib/api";
import { useBranding } from "@/context/BrandingContext";

export function PremiumLoadingScreen({
  hideMinimizedPill = false,
}: {
  hideMinimizedPill?: boolean;
} = {}) {
  const pathname = usePathname();
  const { displayName, tagline, logoUrl } = useBranding();
  const [state, setState] = useState<BackendWakeUpState>({ isWakingUp: false });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToBackendWakeUp((newState) => {
      setState(newState);
      if (newState.source === "lag" || newState.isLagging || newState.source === "initial") {
        setIsMinimized(true);
      } else if (newState.isWakingUp) {
        setIsMinimized(false);
        setDismissed(false);
      }
    });
    return unsubscribe;
  }, []);

  // Timer counter while loading is active
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (state.isWakingUp || state.isLagging) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [state.isWakingUp, state.isLagging]);

  // Guaranteed 10-second ceiling: Automatically reveal website within 10 seconds
  // so the user is never blocked, even if cloud database/backend is still warming up
  useEffect(() => {
    if (elapsedSeconds >= 10 && !isMinimized) {
      setIsMinimized(true);
    }
  }, [elapsedSeconds, isMinimized]);

  const isVisible = state.isWakingUp || state.isLagging;

  if (!isVisible || dismissed) {
    return null;
  }

  // Minimized floating pill mode
  if (isMinimized) {
    const isHome =
      hideMinimizedPill ||
      !pathname ||
      pathname === "/" ||
      pathname === "" ||
      (typeof window !== "undefined" && (window.location.pathname === "/" || window.location.pathname === ""));

    // Suppress small popup loading pill on public home screen ("/") per design requirement
    if (isHome) {
      return null;
    }

    return (
      <aside
        aria-label="Cloud connection status"
        className="fixed bottom-6 right-6 z-[99999] animate-in fade-in slide-in-from-bottom-4 duration-300 select-none"
      >
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#121417]/95 border border-[#DFBA73]/50 shadow-2xl backdrop-blur-md text-white">
          <div className="w-6 h-6 rounded-full bg-[#DFBA73]/15 border border-[#DFBA73]/40 flex items-center justify-center shrink-0">
            <Loader2 className="w-3.5 h-3.5 text-[#DFBA73] animate-spin" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-serif font-bold text-[#F3E8D6]">
              Connecting Cloud Services
            </span>
            <span className="text-[10px] text-white/60">
              Active • {elapsedSeconds}s elapsed
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="ml-1 p-1 text-white/50 hover:text-white transition-colors cursor-pointer"
            title="Expand to full loading screen"
            aria-label="Expand"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer"
            title="Dismiss notification"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    );
  }

  // Determine dynamic message copy
  const isColdStart = Boolean(state.attempt && state.maxRetries);
  const headline = isColdStart
    ? `Resuming Cloud Services (Attempt ${state.attempt}/${state.maxRetries! + 1})`
    : state.isLagging
    ? "Curating Live Travel Experience"
    : "Connecting to KV Tours Concierge";

  const description =
    state.message ||
    (isColdStart
      ? "Cloud compute was resting and is spinning up (~15–30s on free tier). Your request is establishing an authoritative live database connection."
      : "Securing live flight, departure, and itinerary pricing from our private cloud service. Thank you for your patience.");

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[99999] bg-[#0B0C0E] flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300 overflow-hidden transform-gpu"
    >
      {/* Ambient Radial Golden Glow */}
      <div className="absolute w-[440px] h-[440px] rounded-full bg-[#DFBA73]/12 blur-[100px] pointer-events-none" />

      {/* Centerpiece Luxury Medallion */}
      <div className="relative flex items-center justify-center">
        {/* Outer Orbit Ring with Rotating Indicator */}
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border border-[#DFBA73]/30 flex items-center justify-center relative animate-spin-slow">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#DFBA73] shadow-[0_0_12px_#DFBA73]" />
        </div>

        {/* Inner Emblem Disc */}
        <div className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-[#DFBA73]/60 bg-[#16181B] shadow-[0_0_45px_rgba(223,186,115,0.25)] flex items-center justify-center p-3 animate-pulse-subtle overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl || "/logo.png"}
            alt={displayName || "KV Tours & Travels"}
            className="w-full h-full object-contain rounded-full drop-shadow-md"
          />
        </div>
      </div>

      {/* Brand Identity Headings */}
      <div className="mt-7 max-w-lg mx-auto">
        <h2 className="text-base sm:text-lg font-serif font-bold text-[#F3E8D6] tracking-[0.24em] uppercase">
          {displayName || "KV Tours & Travels"}
        </h2>
        <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.32em] text-[#DFBA73] font-semibold mt-1">
          {tagline || "Bespoke Luxury Escapes"}
        </p>

        {/* Dynamic Status Headline */}
        <h3 className="text-sm sm:text-base font-serif font-semibold text-white/95 mt-5">
          {headline}
        </h3>

        {/* Status Description */}
        <p className="text-xs sm:text-sm text-white/70 font-light mt-2 leading-relaxed max-w-md mx-auto">
          {description}
        </p>
      </div>

      {/* Luxury Metallic Gold Shimmer Progress Bar */}
      <div className="w-64 sm:w-72 h-1 bg-white/10 rounded-full overflow-hidden relative mt-6 shadow-inner transform-gpu">
        <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-[#DFBA73] via-[#F3E8D6] to-transparent animate-shimmer-slide rounded-full" />
      </div>

      {/* Elapsed Time & Active Badge - Solid containment prevents mobile compositor tile bugs */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#16181B] border border-[#DFBA73]/30 text-xs text-[#DFBA73] font-medium mt-5 shadow-sm">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DFBA73] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#DFBA73]" />
        </span>
        <span>Active Connection • {elapsedSeconds}s elapsed</span>
      </div>

      {/* Micro Trust Badges */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[11px] text-white/50 font-light mt-8">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#DFBA73]/80" />
          <span>Bank-Grade Encryption</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#DFBA73]/80" />
          <span>Authoritative Live Catalog</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 text-[#DFBA73]/80" />
          <span>Automatic Fault Recovery</span>
        </span>
      </div>

      {/* Minimize Button Option */}
      <div className="mt-8">
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-[#DFBA73] transition-colors py-1 px-3 rounded-full hover:bg-white/5"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          <span>Minimize to background</span>
        </button>
      </div>
    </div>
  );
}

