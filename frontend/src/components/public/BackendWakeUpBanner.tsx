"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Cloud, Loader2, RefreshCw, X } from "lucide-react";
import { subscribeToBackendWakeUp, type BackendWakeUpState } from "@/lib/api";

export function BackendWakeUpBanner() {
  const pathname = usePathname();
  const [state, setState] = useState<BackendWakeUpState>({ isWakingUp: false });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToBackendWakeUp((newState) => {
      setState(newState);
      if (newState.isWakingUp) {
        setDismissed(false);
      }
    });
    return unsubscribe;
  }, []);

  // Suppress small popup notification on the public home screen ("/") per design requirement
  const isHome =
    !pathname ||
    pathname === "/" ||
    pathname === "" ||
    (typeof window !== "undefined" && (window.location.pathname === "/" || window.location.pathname === ""));

  if (isHome || !state.isWakingUp || dismissed) {
    return null;
  }

  const attemptText =
    state.attempt && state.maxRetries
      ? ` (Connecting ${state.attempt}/${state.maxRetries + 1})`
      : "";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[9999] max-w-md w-[calc(100vw-3rem)] animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="rounded-2xl border border-[#DFBA73]/50 bg-[#1B1E22]/95 backdrop-blur-md p-4 shadow-2xl text-white flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-full bg-[#DFBA73]/15 border border-[#DFBA73]/40 flex items-center justify-center shrink-0 mt-0.5">
          <Loader2 className="w-4 h-4 text-[#DFBA73] animate-spin" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-serif font-bold text-[#F3E8D6] tracking-wide">
              Waking Up Cloud Services{attemptText}
            </h4>
            <span className="inline-block w-2 h-2 rounded-full bg-[#DFBA73] animate-ping" />
          </div>
          <p className="text-[11px] text-white/70 leading-relaxed mt-1 font-light">
            {state.message ||
              "Cloud compute was resting and is spinning up (takes ~30s on free hosting). Your request is establishing a secure live connection..."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-white/40 hover:text-white p-1 transition-colors"
          title="Dismiss notification"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

