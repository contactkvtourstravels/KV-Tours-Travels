"use client";

import Link from "next/link";
import { ArrowUpRight, Compass, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useBranding } from "@/context/BrandingContext";

export function Footer() {
  const {
    settings,
    displayName,
    city,
    phone,
    email,
    address,
    getWhatsAppUrl,
    whatsappEnabled,
    whatsappShowOnFooter,
  } = useBranding();

  const waUrl = getWhatsAppUrl();
  const agencyName = displayName;
  const instagramHandle = settings?.instagram_handle || "";
  const instagramUrl =
    settings?.instagram_url ||
    (instagramHandle ? `https://www.instagram.com/${instagramHandle.replace("@", "")}` : "#");

  return (
    <footer className="bg-[#F7F7F5] border-t border-[#E4E5E7] text-[#70757A] text-sm">
      {/* Top Banner: Invitation */}
      <div className="border-b border-[#E4E5E7] bg-[#F3F4F4] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-serif text-[#202124] font-semibold">
              Ready to embark on an extraordinary journey?
            </h3>
            <p className="text-[#70757A] mt-2 text-sm sm:text-base">
              Speak with our {city} travel concierge today for bespoke international and domestic itineraries.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/custom-trip"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Compass className="w-4 h-4" />
              <span>Plan Custom Trip</span>
            </Link>
            {whatsappEnabled && whatsappShowOnFooter && Boolean(waUrl) && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] text-[#0D7A53] hover:bg-[#DCF3E9] text-xs uppercase tracking-widest font-semibold transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Us</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              {settings?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.logo_url}
                  alt={agencyName}
                  className="h-9 w-auto max-w-[120px] object-contain rounded-lg"
                />
              ) : (
                <div className="h-9 px-3.5 rounded-full bg-[#24292F] text-white flex items-center justify-center gap-1.5 border border-[#3D4450] shadow-2xs font-serif font-bold text-xs tracking-wider">
                  <Compass className="w-3.5 h-3.5 text-[#ECEFF3]" />
                  <span>{settings?.short_name || agencyName}</span>
                </div>
              )}
              <div>
                <span className="text-[#202124] font-serif tracking-[0.12em] text-lg uppercase font-bold block leading-tight">
                  {agencyName}
                </span>
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#6B7280] font-semibold">
                  {city}, India
                </span>
              </div>
            </div>
            <p className="text-[#70757A] text-sm leading-relaxed max-w-sm">
              {settings?.business_description ||
                "Dedicated travel curator specializing in bespoke international getaways, breathtaking domestic expeditions, and signature group departures. Seamless logistics, handpicked hotels, and personal care."}
            </p>
            <div className="flex items-center gap-4 pt-1">
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs uppercase tracking-wider text-[#24292F] hover:text-[#3D4450] flex items-center gap-1 font-semibold transition-colors"
              >
                <span>Instagram {instagramHandle}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-4">
            <h4 className="text-[#202124] text-xs uppercase tracking-widest font-bold font-serif">
              Explore
            </h4>
            <ul className="space-y-2.5 text-xs uppercase tracking-wider">
              <li>
                <Link href="/destinations" className="hover:text-[#202124] transition-colors">
                  All Destinations
                </Link>
              </li>
              <li>
                <Link href="/packages" className="hover:text-[#202124] transition-colors">
                  Curated Packages
                </Link>
              </li>

              <li>
                <Link href="/group-trips" className="hover:text-[#202124] transition-colors">
                  Group Departures
                </Link>
              </li>
              <li>
                <Link href="/custom-trip" className="hover:text-[#202124] transition-colors">
                  Custom Trip Planner
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#202124] transition-colors">
                  About {agencyName}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#202124] transition-colors">
                  Contact Concierge
                </Link>
              </li>
            </ul>
          </div>

          {/* Travel Styles */}
          <div className="space-y-4">
            <h4 className="text-[#202124] text-xs uppercase tracking-widest font-bold font-serif">
              Travel Styles
            </h4>
            <ul className="space-y-2.5 text-xs uppercase tracking-wider">
              <li>
                <Link href="/packages" className="hover:text-[#202124] transition-colors">
                  International Holidays
                </Link>
              </li>
              <li>
                <Link href="/packages" className="hover:text-[#202124] transition-colors">
                  Domestic Explorations
                </Link>
              </li>
              <li>
                <Link href="/group-trips" className="hover:text-[#202124] transition-colors">
                  Fixed Date Group Tours
                </Link>
              </li>
              <li>
                <Link href="/custom-trip" className="hover:text-[#202124] transition-colors">
                  Honeymoon Escapes
                </Link>
              </li>
              <li>
                <Link href="/custom-trip" className="hover:text-[#202124] transition-colors">
                  Adventure Expeditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Office & Concierge */}
          <div className="space-y-4">
            <h4 className="text-[#202124] text-xs uppercase tracking-widest font-bold font-serif">
              {city} Office
            </h4>
            <div className="space-y-3 text-xs leading-relaxed">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#3D4450] shrink-0 mt-0.5" />
                <span>{address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#3D4450] shrink-0" />
                <a href={`tel:${phone}`} className="hover:text-[#202124] transition-colors">
                  {phone}
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#3D4450] shrink-0" />
                <a href={`mailto:${email}`} className="hover:text-[#202124] transition-colors">
                  {email}
                </a>
              </div>
              {settings?.operating_hours && (
                <div className="text-[11px] text-[#5F6368] pt-0.5">
                  Hours: {settings.operating_hours}
                </div>
              )}
              {settings?.whatsapp_enabled !== false && (
                <div className="flex items-center gap-2.5 text-[#0D7A53] font-medium">
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>WhatsApp Available Daily</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar & Developer Credits */}
        <div className="border-t border-[#E4E5E7] mt-12 pt-8 space-y-6 text-xs text-[#70757A]">
          {/* Developer Attribution Card */}
          <div className="rounded-xl border border-[#E4E5E7] bg-white/70 backdrop-blur-xs p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs hover:border-[#D1D5DB] transition-all">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[#202124] flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Designed &amp; Developed by Athul Suresh
                </span>
                <span className="hidden sm:inline text-[#D1D5DB]">|</span>
                <span className="text-[#5F6368] font-medium">
                  Full Stack Developer | React &middot; Next.js &middot; TypeScript &middot; Python &middot; FastAPI
                </span>
              </div>
              <p className="text-[11px] text-[#70757A]">
                Building modern, responsive, and scalable web applications.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <a
                href="https://github.com/athulsuresh4466-coder"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E4E5E7] hover:border-[#24292F] bg-white hover:bg-[#24292F] text-[#3D4450] hover:text-white text-xs font-semibold transition-all duration-200 shadow-2xs"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>GitHub</span>
              </a>
              <a
                href="https://www.linkedin.com/in/athul-s4466"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#0A66C2]/30 hover:border-[#0A66C2] bg-white hover:bg-[#0A66C2] text-[#0A66C2] hover:text-white text-xs font-semibold transition-all duration-200 shadow-2xs"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.79v8.37H6.46v-8.37M7.86 6.55a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z" />
                </svg>
                <span>LinkedIn</span>
              </a>
            </div>
          </div>

          {/* Copyright Bar & Navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
            <div className="text-center sm:text-left">
              &copy; {new Date().getFullYear()} The Wild Root. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <Link href="/about" className="hover:text-[#202124] transition-colors">
                About
              </Link>
              <Link href="/contact" className="hover:text-[#202124] transition-colors">
                Contact
              </Link>
              <Link href="/admin" className="text-[#70757A] hover:text-[#202124] transition-colors font-medium">
                Agency Staff Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
