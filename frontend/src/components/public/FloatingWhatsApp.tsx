"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { publicCatalogApi, type PublicSiteSettings } from "@/lib/api";
import {
  DEFAULT_BUSINESS_PHONE,
  DEFAULT_WHATSAPP_NUMBER,
  getWhatsAppClickToChatUrl,
} from "@/lib/constants";

export function FloatingWhatsApp() {
  const [settings, setSettings] = useState<PublicSiteSettings | null>(null);

  useEffect(() => {
    publicCatalogApi
      .getSettings()
      .then(setSettings)
      .catch(() => {
        // Fallback default
        setSettings({
          agency_name: "KV Tours & Travels",
          tagline: "Your Journey. Our Expertise.",
          agency_location: "Coimbatore, Tamil Nadu, India",
          office_address: "Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu 641012",
          whatsapp_number: DEFAULT_WHATSAPP_NUMBER,
          whatsapp_enabled: true,
          whatsapp_prefilled_message: "Hi KV Tours & Travels! I would like to enquire about your tour packages.",
          contact_email: "contact@kvtours.in",
          contact_phone: DEFAULT_BUSINESS_PHONE,
          instagram_handle: "@kvtours_travels",
          currency: "INR",
        });
      });
  }, []);

  if (settings && (settings.whatsapp_enabled === false || settings.whatsapp_concierge_floating === false)) {
    return null;
  }

  const waUrl = getWhatsAppClickToChatUrl(
    settings?.whatsapp_number,
    settings?.whatsapp_prefilled_message ||
      "Hi KV Tours & Travels Coimbatore! I would like to enquire about your international and domestic tour packages."
  );

  return (
    <aside aria-label="WhatsApp quick chat" className="fixed bottom-6 right-6 z-40 group print:hidden">
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with KV Tours & Travels on WhatsApp"
        className="relative flex items-center gap-3 bg-white border border-[#A7E2CB] text-[#202124] pl-3.5 pr-4.5 py-2.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.1)] hover:shadow-[0_12px_36px_rgba(13,122,83,0.18)] hover:scale-[1.03] transition-all duration-300"
      >
        {/* Glowing dot */}
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>

        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-xs">
          <MessageCircle className="w-4 h-4 fill-white text-emerald-500" />
        </div>

        <div className="flex flex-col text-left">
          <span className="text-[10px] uppercase tracking-wider text-[#0D7A53] font-bold leading-none">
            WhatsApp Concierge
          </span>
          <span className="text-xs font-semibold text-[#202124] mt-1 leading-none">
            Chat with Experts
          </span>
        </div>
      </a>
    </aside>
  );
}
