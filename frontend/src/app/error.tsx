"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, Home, MessageCircle, RefreshCw } from "lucide-react";
import { PublicLayout } from "@/components/public/PublicLayout";
import { getWhatsAppClickToChatUrl } from "@/lib/constants";
import { useBranding } from "@/context/BrandingContext";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { displayName, city, getWhatsAppUrl, whatsappEnabled } = useBranding();

  useEffect(() => {
    // Log safe error locally without customer-facing details
    console.error("Public page encounter error:", error.message);
  }, [error]);

  const waUrl = getWhatsAppUrl(
    `Hi ${displayName || "Travel Concierge"}, I encountered a temporary loading issue on your website. Please assist me directly.`
  );

  return (
    <PublicLayout>
      <section className="min-h-[70vh] flex items-center justify-center py-20 px-4">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-full border border-rose-200 bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
            <AlertCircle className="w-8 h-8" />
          </div>

          <span className="text-xs uppercase tracking-[0.25em] text-[#5F6368] font-semibold block">
            Temporary Interruption
          </span>

          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#202124] tracking-tight">
            Unable to Load Travel Information
          </h1>

          <p className="text-[#70757A] text-sm leading-relaxed">
            We encountered a temporary connection issue while retrieving this itinerary. You can reload the page{whatsappEnabled && Boolean(waUrl) ? ` or reach our ${city || "concierge"} team directly on WhatsApp.` : " or return to the home page."}
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-semibold shadow-xs hover:scale-[1.02] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Page</span>
            </button>

            {whatsappEnabled && Boolean(waUrl) && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-3 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs uppercase tracking-widest font-semibold hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp Concierge</span>
              </a>
            )}

            <Link
              href="/"
              className="w-full sm:w-auto px-5 py-3 rounded-full bg-white border border-[#E4E5E7] text-[#202124] text-xs uppercase tracking-widest font-semibold hover:bg-[#F3F4F4] transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4 text-[#3D4450]" />
              <span>Home</span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
