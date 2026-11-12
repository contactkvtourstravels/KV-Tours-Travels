"use client";

import Image from "next/image";
import Link from "next/link";
import { Compass, Sparkles, ShieldCheck, Headphones, MapPin } from "lucide-react";
import { useBranding } from "@/context/BrandingContext";

interface AuthBrandingPanelProps {
  title?: string;
  tagline?: string;
  badgeLabel?: string;
  supportingDescription?: string;
  className?: string;
  showPillars?: boolean;
}

export function AuthBrandingPanel({
  title,
  tagline,
  badgeLabel,
  supportingDescription,
  className = "",
  showPillars = true,
}: AuthBrandingPanelProps) {
  const {
    settings,
    displayName,
    shortName,
    initials,
    city,
    state,
    logoUrl,
    tagline: brandTagline,
    heroHeadline,
    heroSubtitle,
    conciergeLabel,
    phone,
    email,
  } = useBranding();

  // Dynamic content resolution with graceful fallbacks
  const resolvedBrandName = displayName || settings?.agency_name || "Luxury Travel Concierge";
  const locationText = [city, state].filter(Boolean).join(", ") || settings?.agency_location || "";
  const resolvedBadgeLabel =
    badgeLabel ||
    conciergeLabel ||
    settings?.pdf_badge_label ||
    settings?.contact_cta_text ||
    "Private Concierge";
  const resolvedTitle = title || heroHeadline || settings?.hero_headline || "Every journey, thoughtfully designed.";
  const resolvedTagline = tagline || brandTagline || settings?.tagline || "Curated bespoke journeys & private expeditions.";
  const resolvedDescription =
    supportingDescription ||
    heroSubtitle ||
    settings?.hero_subtitle ||
    settings?.business_description ||
    resolvedTagline;

  const bgImageUrl =
    settings?.hero_image_url ||
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80";

  return (
    <aside
      aria-label={`${resolvedBrandName} Brand Overview`}
      className={`relative w-full lg:w-[42%] min-h-[260px] lg:min-h-full bg-[#131A17] text-[#FAF9F5] flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-hidden select-none border-b lg:border-b-0 lg:border-r border-[#FAF9F5]/10 ${className}`}
    >
      {/* Background Hero Image with Deep Forest & Soft Gold Atmospheric Overlays */}
      <div className="absolute inset-0 z-0">
        <Image
          src={bgImageUrl}
          alt={`${resolvedBrandName} Bespoke Travel`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 42vw"
          className="object-cover object-center opacity-30 mix-blend-luminosity scale-105 motion-safe:transition-transform motion-safe:duration-1000 motion-reduce:transform-none"
        />
        {/* Layered luxury lighting gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#101613] via-[#131A17]/85 to-[#101613]/90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(197,168,128,0.18)_0%,transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(88,104,81,0.15)_0%,transparent_60%)]" />
      </div>

      {/* Top Brand Header */}
      <div className="relative z-10 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A880] rounded-xl p-1 -m-1 transition-all"
        >
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-[#1B1E22] ring-1 ring-[#DFBA73]/60 group-hover:ring-[#DFBA73] shadow-md flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl || "/logo.png"}
              alt={resolvedBrandName}
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-serif font-bold text-base sm:text-lg tracking-wider text-[#FAF9F5] block leading-tight group-hover:text-[#E5D3B3] transition-colors">
              {resolvedBrandName}
            </span>
            {locationText && (
              <span className="text-[10px] tracking-[0.25em] text-[#C5A880] font-medium block uppercase mt-0.5 leading-none">
                {locationText}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* Middle Statement & Trust Pillars */}
      <div className="relative z-10 my-auto py-8 lg:py-10 max-w-lg">
        {/* Dynamic Concierge Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C5A880]/15 border border-[#C5A880]/30 backdrop-blur-md mb-5 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#E5D3B3]" />
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#E5D3B3] font-semibold">
            {resolvedBadgeLabel}
          </span>
        </div>

        {/* Editorial Serif Heading */}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-normal text-[#FAF9F5] tracking-tight leading-[1.2]">
          {resolvedTitle}
        </h2>

        {/* Dynamic Supporting Description */}
        <p className="mt-3.5 text-xs sm:text-sm text-[#FAF9F5]/75 font-light leading-relaxed">
          {resolvedDescription}
        </p>

        {/* Luxury Trust Micro-Pillars */}
        {showPillars && (
          <div className="mt-8 pt-6 border-t border-white/10 hidden sm:grid grid-cols-1 gap-3.5 text-xs text-[#FAF9F5]/85">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-[#C5A880]">
                <Compass className="w-3.5 h-3.5" />
              </div>
              <span className="font-light tracking-wide">
                Bespoke itineraries, luxury stays & private expeditions
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-[#C5A880]">
                <Headphones className="w-3.5 h-3.5" />
              </div>
              <span className="font-light tracking-wide">
                Dedicated travel host & 24/7 personal concierge coordination
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-[#C5A880]">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span className="font-light tracking-wide">
                Encrypted private member portal & verified reservation access
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Accents */}
      <div className="relative z-10 hidden lg:flex flex-col gap-2 pt-6 border-t border-white/10 text-[11px] text-[#FAF9F5]/60">
        <div className="flex items-center justify-between">
          <span>© {new Date().getFullYear()} {resolvedBrandName}. All rights reserved.</span>
          {locationText && (
            <span className="flex items-center gap-1.5 text-[#E5D3B3]">
              <MapPin className="w-3.5 h-3.5 text-[#C5A880]" />
              {locationText}
            </span>
          )}
        </div>
        {(phone || email) && (
          <div className="flex items-center gap-3 text-[10px] text-[#FAF9F5]/45">
            {phone && <span>Concierge: {phone}</span>}
            {phone && email && <span>•</span>}
            {email && <span>{email}</span>}
          </div>
        )}
      </div>
    </aside>
  );
}
