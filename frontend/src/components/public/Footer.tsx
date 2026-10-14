"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Compass, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { publicCatalogApi, type PublicSiteSettings } from "@/lib/api";
import {
  DEFAULT_BUSINESS_PHONE,
  DEFAULT_WHATSAPP_NUMBER,
  getWhatsAppClickToChatUrl,
} from "@/lib/constants";

export function Footer() {
  const [settings, setSettings] = useState<PublicSiteSettings | null>(null);

  useEffect(() => {
    publicCatalogApi
      .getSettings()
      .then(setSettings)
      .catch(() => {
        // Fallback default
        setSettings({
          agency_name: "KV Tours & Travels",
          tagline: "Coimbatore • Luxury & Adventure Journeys",
          agency_location: "Coimbatore, Tamil Nadu, India",
          office_address: "124 Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu 641012",
          whatsapp_number: DEFAULT_WHATSAPP_NUMBER,
          contact_email: "contact@kvtours.in",
          contact_phone: DEFAULT_BUSINESS_PHONE,
          instagram_handle: "@kvtours_travels",
          currency: "INR",
        });
      });
  }, []);

  const whatsappNumber = settings?.whatsapp_number || DEFAULT_WHATSAPP_NUMBER;
  const waUrl = getWhatsAppClickToChatUrl(
    whatsappNumber,
    settings?.whatsapp_prefilled_message ||
      "Hi KV Tours & Travels, I would like to enquire about your upcoming tours."
  );

  const agencyName = settings?.public_display_name || settings?.agency_name || "KV Tours & Travels";
  const city = settings?.city || "Coimbatore";
  const address = settings?.office_address || settings?.public_office_address || "Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu 641012";
  const phone = settings?.contact_phone || DEFAULT_BUSINESS_PHONE;
  const email = settings?.contact_email || "contact@kvtours.in";
  const instagramHandle = settings?.instagram_handle || "@kv_tours_travels";
  const instagramUrl = settings?.instagram_url || `https://www.instagram.com/${instagramHandle.replace("@", "")}`;

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
            {settings?.whatsapp_enabled !== false && (
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
                  <span>{settings?.short_name || "KV"}</span>
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
                <Link href="/cabs" className="hover:text-[#202124] transition-colors">
                  Cabs & Fleet Rentals
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

        {/* Bottom Bar */}
        <div className="border-t border-[#E4E5E7] mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#70757A]">
          <div>
            © {new Date().getFullYear()} {agencyName}, {city}. All rights reserved.
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
    </footer>
  );
}
