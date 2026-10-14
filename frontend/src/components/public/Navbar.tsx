"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Menu, MessageCircle, Phone, X, User } from "lucide-react";
import { publicCatalogApi, type PublicSiteSettings } from "@/lib/api";
import {
  DEFAULT_BUSINESS_PHONE,
  DEFAULT_WHATSAPP_NUMBER,
  getWhatsAppClickToChatUrl,
} from "@/lib/constants";

const NAV_LINKS = [
  { href: "/destinations", label: "Destinations" },
  { href: "/packages", label: "Packages" },
  { href: "/cabs", label: "Cabs & Fleet" },
  { href: "/group-trips", label: "Group Trips" },
  { href: "/custom-trip", label: "Custom Trip" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState<PublicSiteSettings | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    publicCatalogApi
      .getSettings()
      .then(setSettings)
      .catch(() => {
        setSettings({
          agency_name: "KV Tours & Travels",
          tagline: "Your Journey. Our Expertise.",
          agency_location: "Coimbatore, Tamil Nadu, India",
          office_address: "Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu 641012",
          whatsapp_number: DEFAULT_WHATSAPP_NUMBER,
          contact_email: "contact@kvtours.in",
          contact_phone: DEFAULT_BUSINESS_PHONE,
          instagram_handle: "@kvtours_travels",
          currency: "INR",
        });
      });
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const waUrl = getWhatsAppClickToChatUrl(
    settings?.whatsapp_number,
    "Hi KV Tours & Travels, I would like to plan a travel trip with you."
  );

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md border-b border-[#E2E4E8] py-2.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]"
            : "bg-white/90 backdrop-blur-md border-b border-[#E2E4E8]/80 py-3.5"
        }`}
      >
        <div className="w-full max-w-7xl 2xl:max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 lg:gap-4">
            {/* Brand Logo with Small Oval Box */}
            <Link href="/" className="group flex items-center gap-2.5 shrink-0">
              {settings?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.logo_url}
                  alt={settings?.public_display_name || settings?.agency_name || "Logo"}
                  className="h-9 w-auto max-w-[120px] object-contain rounded-lg"
                />
              ) : (
                <div className="h-9 px-3 rounded-full bg-[#24292F] text-white flex items-center justify-center gap-1.5 shadow-xs shrink-0 group-hover:bg-[#3D4450] transition-colors border border-[#3D4450]">
                  <Compass className="w-3.5 h-3.5 text-[#ECEFF3]" />
                  <span className="font-serif font-bold text-xs tracking-wider">
                    {settings?.short_name || "KV"}
                  </span>
                </div>
              )}
              <div className="flex flex-col justify-center">
                <span className="text-[#202124] font-serif tracking-[0.14em] text-sm sm:text-base uppercase font-bold leading-none group-hover:text-[#3D4450] transition-colors whitespace-nowrap">
                  {settings?.public_display_name || settings?.agency_name || "KV Tours & Travels"}
                </span>
                <span className="text-[9px] uppercase tracking-[0.26em] text-[#6B7280] font-semibold mt-0.5 leading-none whitespace-nowrap">
                  {settings?.city || "Coimbatore"}
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
                    className={`h-7 px-2.5 2xl:px-3 rounded-full text-[11px] 2xl:text-xs uppercase tracking-wider font-semibold transition-all inline-flex items-center justify-center whitespace-nowrap ${
                      isActive
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

            {/* Mobile & Tablet Actions & Menu Toggle */}
            <div className="flex items-center gap-2 xl:hidden shrink-0">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 px-3 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] text-[#0D7A53] hover:bg-[#D5F0E5] inline-flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap shrink-0 shadow-2xs"
                aria-label="WhatsApp"
                title="Chat on WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>

              <Link
                href="/custom-trip"
                className="h-9 px-3.5 sm:px-4 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-wider font-bold inline-flex items-center justify-center gap-1.5 shadow-xs hover:scale-[1.01] active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
              >
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Plan Your Trip</span>
                <span className="sm:hidden">Plan</span>
              </Link>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="h-9 w-9 flex items-center justify-center rounded-full border border-[#E2E4E8] bg-[#F0F2F5] text-[#202124] hover:bg-[#E4E7EB] focus:outline-none transition-colors shrink-0"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-[#24292F]" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile & Tablet Slide-over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="fixed top-0 right-0 bottom-0 w-4/5 max-w-sm bg-white border-l border-[#E2E4E8] p-6 flex flex-col justify-between shadow-2xl overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-5 border-b border-[#E2E4E8]">
                <div className="flex items-center gap-2.5">
                  {settings?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={settings.logo_url}
                      alt={settings?.public_display_name || settings?.agency_name || "Logo"}
                      className="h-8 w-auto max-w-[100px] object-contain rounded-lg"
                    />
                  ) : (
                    <div className="h-8 px-3 rounded-full bg-[#24292F] text-white flex items-center justify-center gap-1.5 shadow-xs border border-[#3D4450]">
                      <Compass className="w-3 h-3 text-[#ECEFF3]" />
                      <span className="font-serif font-bold text-xs tracking-wider">
                        {settings?.short_name || "KV"}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="text-[#202124] font-serif font-bold text-sm tracking-wider uppercase">
                      {settings?.public_display_name || settings?.agency_name || "KV Tours"}
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-[#6B7280] font-semibold">
                      {settings?.city || "Coimbatore"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-[#5F6368] hover:text-[#202124]"
                  aria-label="Close Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="flex flex-col gap-1.5 py-5">
                {NAV_LINKS.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-4 py-2.5 rounded-full text-xs uppercase tracking-wider font-semibold transition-colors ${
                        isActive
                          ? "bg-[#24292F] text-white"
                          : "text-[#5F6368] hover:text-[#202124] hover:bg-[#F0F2F5]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-5 border-t border-[#E2E4E8] flex flex-col gap-2.5">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-full border border-[#D3D8DF] bg-[#F0F2F5] text-[#202124] text-xs uppercase tracking-wider font-semibold hover:bg-[#E4E7EB]"
              >
                <User className="w-3.5 h-3.5 text-[#5F6368]" />
                <span>Customer Portal & My Trips</span>
              </Link>

              <Link
                href="/custom-trip"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold shadow-sm"
              >
                <Compass className="w-4 h-4" />
                <span>Plan Your Trip</span>
              </Link>

              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 flex items-center justify-center gap-2 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] text-[#0D7A53] text-xs uppercase tracking-wider font-semibold"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Concierge</span>
              </a>

              {settings?.contact_phone && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-[#5F6368] pt-1">
                  <Phone className="w-3 h-3 text-[#24292F]" />
                  <span>{settings.contact_phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
