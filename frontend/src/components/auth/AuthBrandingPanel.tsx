"use client";

import Image from "next/image";
import Link from "next/link";
import { Compass, Sparkles } from "lucide-react";
import { useBranding } from "@/context/BrandingContext";

interface AuthBrandingPanelProps {
  title?: string;
  tagline?: string;
}

export function AuthBrandingPanel({
  title = "Every journey, thoughtfully designed.",
  tagline,
}: AuthBrandingPanelProps) {
  const { displayName, shortName, initials, city, state, logoUrl, tagline: brandTagline } = useBranding();
  const resolvedTagline = tagline || brandTagline || "Curated travel experiences & bespoke expeditions.";

  return (
    <div className="relative w-full lg:w-[38%] min-h-[220px] lg:min-h-full bg-[#18191B] text-white flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-hidden select-none">
      {/* Background Travel Image with Refined Luxury Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80"
          alt={`${displayName} Luxury Travel`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 40vw"
          className="object-cover object-center opacity-40 mix-blend-luminosity scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111213] via-[#111213]/80 to-[#111213]/90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(198,161,91,0.15)_0%,transparent_70%)]" />
      </div>

      {/* Top Brand Header */}
      <div className="relative z-10 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={displayName}
              className="h-9 w-auto max-w-[100px] object-contain rounded-lg"
            />
          ) : (
            <div className="h-9 px-3.5 rounded-full border border-white/25 bg-white/10 backdrop-blur-md text-white flex items-center justify-center gap-1.5 shadow-sm group-hover:bg-white/20 transition-all">
              <Compass className="w-3.5 h-3.5 text-white/90" />
              <span className="font-serif font-bold text-xs tracking-wider text-white">
                {shortName || initials}
              </span>
            </div>
          )}
          <div className="flex flex-col justify-center">
            <span className="font-serif font-bold text-sm sm:text-base tracking-widest text-white block leading-none">
              {displayName}
            </span>
            {city && (
              <span className="text-[9px] tracking-[0.28em] text-[#D3D8DF] font-semibold block uppercase mt-1 leading-none">
                {city}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* Middle/Bottom Statement */}
      <div className="relative z-10 my-auto py-8 lg:py-0">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm mb-4">
          <Sparkles className="w-3.5 h-3.5 text-[#D3D8DF]" />
          <span className="text-[11px] uppercase tracking-widest text-white/90 font-medium">
            Signature Concierge
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-white tracking-tight leading-snug">
          {title}
        </h2>
        <p className="mt-3 text-xs sm:text-sm text-white/70 font-light leading-relaxed max-w-sm">
          {resolvedTagline}
        </p>
      </div>

      {/* Footer Accents */}
      <div className="relative z-10 hidden lg:flex items-center justify-between pt-6 border-t border-white/10 text-[11px] text-white/60">
        <span>© {new Date().getFullYear()} {displayName}</span>
        <span className="flex items-center gap-1.5 text-[#D3D8DF]">
          <Compass className="w-3.5 h-3.5" />
          {[city, state].filter(Boolean).join(", ") || "India"}
        </span>
      </div>
    </div>
  );
}
