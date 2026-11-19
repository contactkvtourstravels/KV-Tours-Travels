import React from "react";
import { Sparkles, ShieldCheck, Globe } from "lucide-react";

export default function RootLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[99999] bg-[#0B0C0E]/94 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300"
    >
      {/* Ambient Radial Golden Glow */}
      <div className="absolute w-[440px] h-[440px] rounded-full bg-[#DFBA73]/12 blur-[100px] pointer-events-none" />

      {/* Centerpiece Luxury Medallion */}
      <div className="relative flex items-center justify-center">
        {/* Outer Orbit Ring with Rotating Gold Indicator */}
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border border-[#DFBA73]/30 flex items-center justify-center relative animate-spin-slow">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#DFBA73] shadow-[0_0_12px_#DFBA73]" />
        </div>

        {/* Inner Emblem Disc */}
        <div className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-[#DFBA73]/60 bg-[#16181B] shadow-[0_0_45px_rgba(223,186,115,0.25)] flex items-center justify-center p-3 animate-pulse-subtle overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="KV Tours & Travels"
            className="w-full h-full object-contain rounded-full drop-shadow-md"
          />
        </div>
      </div>

      {/* Brand Identity Headings */}
      <div className="mt-7 max-w-lg mx-auto">
        <h2 className="text-base sm:text-lg font-serif font-bold text-[#F3E8D6] tracking-[0.24em] uppercase">
          KV Tours & Travels
        </h2>
        <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.32em] text-[#DFBA73] font-semibold mt-1">
          Bespoke Luxury Escapes
        </p>

        {/* Dynamic Status Headline */}
        <h3 className="text-sm sm:text-base font-serif font-semibold text-white/95 mt-5">
          Curating Your Travel Experience
        </h3>

        {/* Status Description */}
        <p className="text-xs sm:text-sm text-white/70 font-light mt-2 leading-relaxed max-w-md mx-auto">
          Securing live departures, authentic itineraries, and luxury privileges. Thank you for your patience.
        </p>
      </div>

      {/* Luxury Metallic Gold Shimmer Progress Bar */}
      <div className="w-64 sm:w-72 h-1 bg-white/10 rounded-full overflow-hidden relative mt-6 shadow-inner">
        <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-[#DFBA73] via-[#F3E8D6] to-transparent animate-shimmer-slide rounded-full" />
      </div>

      {/* Trust Micro Badges */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[11px] text-white/50 font-light mt-8">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#DFBA73]/80" />
          <span>Bank-Grade Encryption</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#DFBA73]/80" />
          <span>Authoritative Live Catalog</span>
        </span>
      </div>
    </div>
  );
}

