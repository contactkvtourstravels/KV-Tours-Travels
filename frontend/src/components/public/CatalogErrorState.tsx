"use client";

import React, { useState } from "react";
import { AlertTriangle, RefreshCw, MessageCircle } from "lucide-react";
import { getWhatsAppClickToChatUrl, getCleanWhatsAppNumber } from "@/lib/constants";
import { useBranding } from "@/context/BrandingContext";

interface CatalogErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void | Promise<void>;
  retryLabel?: string;
  className?: string;
}

export function CatalogErrorState({
  title = "Connecting to Travel Services",
  message = "Our cloud backend was resting and is currently waking up (takes ~30s on free hosting). Please wait a moment and click Retry to reconnect.",
  onRetry,
  retryLabel = "Retry Connection",
  className = "",
}: CatalogErrorStateProps) {
  const [retrying, setRetrying] = useState(false);
  const { getWhatsAppUrl, displayName } = useBranding();

  const handleRetry = async () => {
    if (!onRetry) {
      if (typeof window !== "undefined") {
        window.location.reload();
      }
      return;
    }
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  const whatsappUrl = getWhatsAppUrl(
    `Hello ${displayName || "KV Tours & Travels"}, I had an issue loading journeys on your website and would like assistance with an inquiry.`
  );

  return (
    <div
      className={`rounded-3xl border border-red-200 bg-[#FFFDFD] p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-xs my-8 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-7 h-7" />
      </div>

      <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#202124]">
        {title}
      </h3>

      <p className="mt-2 text-sm text-[#5F6368] leading-relaxed max-w-md mx-auto">
        {message}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3.5">
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          className="h-11 px-7 rounded-full bg-[#202124] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold shadow-md hover:scale-[1.02] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`} />
          <span>{retrying ? "Reconnecting..." : retryLabel}</span>
        </button>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="h-11 px-6 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] text-[#0D7A53] text-xs uppercase tracking-widest font-semibold hover:bg-[#DCF3EA] transition-all flex items-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Contact Concierge</span>
        </a>
      </div>
    </div>
  );
}
