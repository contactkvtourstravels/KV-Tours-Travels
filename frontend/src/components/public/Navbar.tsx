"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Menu, MessageCircle, Phone, X, User } from "lucide-react";
import { useBranding } from "@/context/BrandingContext";

const NAV_LINKS = [
  { href: "/destinations", label: "Destinations" },
  { href: "/packages", label: "Packages" },
  { href: "/group-trips", label: "Group Trips" },
  { href: "/custom-trip", label: "Custom Trip" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const {
    displayName,
    shortName,
    logoUrl,
    city,
    phone,
    getWhatsAppUrl,
    whatsappEnabled,
    whatsappShowHeaderButton,
  } = useBranding();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close drawer on path navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileMenuOpen]);

  // Handle Escape key to close mobile drawer
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    },
    [mobileMenuOpen]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const waUrl = getWhatsAppUrl();

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
            ? "bg-white/95 backdrop-blur-md border-b border-[#E2E4E8] py-2.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]"
            : "bg-white/90 backdrop-blur-md border-b border-[#E2E4E8]/80 py-3 sm:py-3.5"
          }`}
      >
        <div className="w-full max-w-7xl 2xl:max-w-[1400px] mx-auto px-3.5 sm:px-6">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Brand Logo & Name */}
            <Link href="/" className="group flex items-center gap-2.5 sm:gap-3 shrink-0">
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-[#1B1E22] ring-1 ring-[#DFBA73]/50 group-hover:ring-[#DFBA73] shadow-xs flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl || "/logo.png"}
                  alt={displayName}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-[#202124] font-serif tracking-[0.06em] sm:tracking-[0.10em] text-xs sm:text-sm md:text-base uppercase font-bold leading-tight group-hover:text-[#A88045] transition-colors whitespace-nowrap">
                  {displayName}
                </span>
                <span className="text-[9px] uppercase tracking-[0.18em] sm:tracking-[0.22em] text-[#6B7280] font-semibold leading-none mt-0.5 whitespace-nowrap">
                  {city ? `${city} • Luxury Escapes` : "Luxury Escapes"}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links — Centered Floating Oval Pill Bar */}
            <nav className="hidden xl:flex items-center gap-0.5 bg-[#F0F2F5]/90 h-9 px-1.5 rounded-full border border-[#E2E4E8] shadow-2xs shrink-0">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`h-7 px-2.5 2xl:px-3 rounded-full text-[11px] 2xl:text-xs uppercase tracking-wider font-semibold transition-all inline-flex items-center justify-center whitespace-nowrap ${isActive
                        ? "bg-[#24292F] text-white shadow-xs"
                        : "text-[#5F6368] hover:text-[#202124] hover:bg-white/80"
                      }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop Actions — Standardized Small Oval Pills */}
            <div className="hidden xl:flex items-center gap-2 shrink-0">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 px-3 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] text-[#0D7A53] hover:bg-[#D5F0E5] text-[11px] uppercase tracking-wider font-semibold inline-flex items-center justify-center gap-1.5 transition-all shadow-2xs whitespace-nowrap shrink-0"
                title="Chat on WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#0D7A53] shrink-0" />
                <span className="whitespace-nowrap">WhatsApp</span>
              </a>

              <Link
                href="/dashboard"
                className="h-9 px-3 rounded-full border border-[#D3D8DF] bg-[#F0F2F5] hover:bg-[#E4E7EB] text-[#24292F] text-[11px] uppercase tracking-wider font-semibold inline-flex items-center justify-center gap-1.5 transition-all shadow-2xs whitespace-nowrap shrink-0"
                title="Customer Portal & Bookings"
              >
                <User className="w-3.5 h-3.5 text-[#5F6368] shrink-0" />
                <span className="whitespace-nowrap">My Trips</span>
              </Link>

              <Link
                href="/custom-trip"
                className="h-9 px-4 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-wider font-bold inline-flex items-center justify-center gap-1.5 shadow-xs hover:scale-[1.01] active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
              >
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Plan Your Trip</span>
              </Link>
            </div>

            {/* Mobile & Tablet Actions & Three-Bar Menu Toggle */}
            <div className="flex items-center gap-1.5 sm:gap-2 xl:hidden shrink-0">
              {whatsappEnabled && whatsappShowHeaderButton && Boolean(waUrl) && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 px-2.5 sm:px-3 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] text-[#0D7A53] hover:bg-[#D5F0E5] inline-flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap shrink-0 shadow-2xs"
                  aria-label="WhatsApp Concierge"
                  title="Chat on WhatsApp"
                >
                  <MessageCircle className="w-4 h-4 text-[#0D7A53] shrink-0" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>
              )}

              <Link
                href="/custom-trip"
                className="hidden sm:inline-flex h-9 px-3.5 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-wider font-bold items-center justify-center gap-1.5 shadow-xs hover:scale-[1.01] active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
              >
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span>Plan</span>
              </Link>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="h-9 w-9 sm:h-9 sm:w-9 flex items-center justify-center rounded-full border border-[#D3D8DF] bg-[#F0F2F5] text-[#202124] hover:bg-[#E4E7EB] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#24292F]/20 transition-all shrink-0 shadow-2xs"
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-[#202124]" />
                ) : (
                  <Menu className="w-5 h-5 text-[#202124]" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile & Tablet Slide-over Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="fixed top-0 right-0 bottom-0 w-[85vw] max-w-sm bg-white border-l border-[#E2E4E8] p-5 sm:p-6 flex flex-col justify-between shadow-2xl overflow-y-auto z-10">
            <div>
              <div className="flex items-center justify-between pb-4 sm:pb-5 border-b border-[#E2E4E8]">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 min-w-0"
                >
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt={displayName}
                      className="h-8 w-auto max-w-[100px] object-contain rounded-lg"
                    />
                  ) : (
                    <div className="h-8 px-2.5 rounded-full bg-[#24292F] text-white flex items-center justify-center gap-1.5 shadow-xs border border-[#3D4450] shrink-0">
                      <Compass className="w-3 h-3 text-[#ECEFF3]" />
                      <span className="font-serif font-bold text-xs tracking-wider">
                        {shortName || displayName}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-[#202124] font-serif font-bold text-sm tracking-wider uppercase truncate">
                      {displayName}
                    </div>
                    {city ? (
                      <div className="text-[9px] uppercase tracking-widest text-[#6B7280] font-semibold truncate">
                        {city}
                      </div>
                    ) : null}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-9 w-9 flex items-center justify-center rounded-full text-[#5F6368] hover:text-[#202124] hover:bg-[#F0F2F5] transition-colors shrink-0"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-col gap-1 py-4 sm:py-5" aria-label="Mobile Navigation Links">
                {NAV_LINKS.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-4 py-2.5 rounded-full text-xs uppercase tracking-wider font-semibold transition-colors ${isActive
                          ? "bg-[#24292F] text-white"
                          : "text-[#5F6368] hover:text-[#202124] hover:bg-[#F0F2F5]"
                        }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 sm:pt-5 border-t border-[#E2E4E8] flex flex-col gap-2.5">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-full border border-[#D3D8DF] bg-[#F0F2F5] text-[#202124] text-xs uppercase tracking-wider font-semibold hover:bg-[#E4E7EB] transition-colors"
              >
                <User className="w-3.5 h-3.5 text-[#5F6368]" />
                <span>Customer Portal & My Trips</span>
              </Link>

              <Link
                href="/custom-trip"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold shadow-sm transition-colors"
              >
                <Compass className="w-4 h-4" />
                <span>Plan Your Trip</span>
              </Link>

              {whatsappEnabled && whatsappShowHeaderButton && Boolean(waUrl) && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] text-[#0D7A53] hover:bg-[#D5F0E5] text-xs uppercase tracking-wider font-semibold transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-[#0D7A53]" />
                  <span>WhatsApp Concierge</span>
                </a>
              )}

              {phone && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-[#5F6368] pt-1">
                  <Phone className="w-3 h-3 text-[#24292F]" />
                  <span>{phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
