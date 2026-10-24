"use client";

import { MessageCircle } from "lucide-react";
import { useBranding } from "@/context/BrandingContext";

export function FloatingWhatsApp() {
  const { displayName, getWhatsAppUrl } = useBranding();

  const waUrl = getWhatsAppUrl(
    `Hi ${displayName}! I would like to enquire about your international and domestic tour packages.`
  );

  return (
    <aside aria-label="WhatsApp quick chat" className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 group print:hidden">
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Chat with ${displayName} on WhatsApp`}
        className="relative flex items-center justify-center sm:justify-start gap-2.5 sm:gap-3 bg-white border border-[#A7E2CB] text-[#202124] p-2.5 sm:pl-3.5 sm:pr-4.5 sm:py-2.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_36px_rgba(13,122,83,0.2)] hover:scale-[1.03] active:scale-95 transition-all duration-300"
      >
        {/* Online status indicator dot */}
        <span className="absolute -top-0.5 -right-0.5 sm:static sm:top-auto sm:right-auto flex h-2.5 w-2.5">
          <span className="inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>

        <div className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-xs">
          <MessageCircle className="w-5 h-5 sm:w-4 sm:h-4 fill-white text-emerald-500" />
        </div>

        <div className="hidden sm:flex flex-col text-left">
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
