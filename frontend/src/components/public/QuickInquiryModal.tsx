"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Compass, Loader2, MessageCircle, Send, X } from "lucide-react";
import { publicCatalogApi, type PublicInquiryCreate } from "@/lib/api";
import { useBranding } from "@/context/BrandingContext";
import { getWhatsAppClickToChatUrl } from "@/lib/constants";

export interface QuickInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageId?: string;
  packageName?: string;
  destinationId?: string;
  destinationName?: string;
  initialMessage?: string;
}

export function QuickInquiryModal({
  isOpen,
  onClose,
  packageId,
  packageName,
  destinationId,
  destinationName,
  initialMessage,
}: QuickInquiryModalProps) {
  const { displayName, shortName, city, whatsapp, whatsappCountryCode, whatsappEnabled } = useBranding();
  const [mounted, setMounted] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Ensure portal target (document.body) is available on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update default message when package or destination context changes
  useEffect(() => {
    if (initialMessage) {
      setMessage(initialMessage);
    } else if (packageName) {
      setMessage(
        `Hello ${displayName}, I am interested in booking the "${packageName}" tour package. Please share detailed itinerary, available dates, and pricing options.`
      );
    } else if (destinationName) {
      setMessage(
        `Hello ${displayName}, I am planning a holiday to ${destinationName}. Please suggest custom itinerary options and departure dates.`
      );
    } else {
      setMessage(
        `Hello ${displayName}, I would like to plan a custom travel journey. Please get in touch with available options.`
      );
    }
  }, [packageName, destinationName, initialMessage, displayName]);

  // Accessibility: Lock background scrolling and prevent page shift
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
    document.body.style.overflow = "hidden";

    // Auto-focus the first field after render
    const timer = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 50);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);

  // Accessibility: Support Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setErrorMessage(null);
    setSubmitting(true);

    try {
      const payload: PublicInquiryCreate = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        package_id: packageId,
        destination_id: destinationId,
        message: message.trim(),
        source: packageName ? "package" : destinationName ? "destination" : "contact_form",
      };

      const res = await publicCatalogApi.submitInquiry(payload);
      setSuccessMessage(
        res.message ||
          "Thank you! Your enquiry has been received by our travel concierge. We will get back to you shortly."
      );
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Failed to submit enquiry. Please try again or contact our concierge via WhatsApp.";
      setErrorMessage(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setSuccessMessage(null);
    setErrorMessage(null);
    onClose();
  };

  // WhatsApp concierge prefilled link
  const waPreMessage = packageName
    ? `Hi ${displayName}, I am interested in the "${packageName}" package. Please share itinerary details and available dates.`
    : destinationName
    ? `Hi ${displayName}, I would like to plan a trip to ${destinationName}. Please share details.`
    : `Hi ${displayName}, I would like to enquire about bespoke travel packages.`;

  const waUrl =
    whatsappEnabled && Boolean(whatsapp)
      ? getWhatsAppClickToChatUrl(whatsapp, waPreMessage, whatsappCountryCode || "+91")
      : "";

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-hidden"
      aria-labelledby="inquiry-modal-title"
      aria-describedby="inquiry-modal-desc"
      role="dialog"
      aria-modal="true"
    >
      {/* 1. Full Viewport Fixed Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={handleModalClose}
        aria-hidden="true"
      />

      {/* 2. Modal Dialog Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white border border-[#E4E5E7] rounded-3xl shadow-2xl flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] overflow-hidden z-10 transition-all duration-200 animate-in zoom-in-95"
      >
        {/* Sticky Header with Close Button */}
        <div className="px-6 pt-6 pb-4 sm:px-8 sm:pt-7 sm:pb-5 border-b border-[#E4E5E7] bg-white flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1 pr-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#5F6368] uppercase tracking-widest">
              <Compass className="w-3.5 h-3.5 text-[#24292F]" />
              <span>{shortName || displayName} Concierge Desk</span>
            </div>
            <h3
              id="inquiry-modal-title"
              className="text-xl sm:text-2xl font-serif font-bold text-[#202124] tracking-tight"
            >
              {packageName ? `Enquire for ${packageName}` : destinationName ? `Explore ${destinationName}` : "Plan Your Travel Journey"}
            </h3>
            <p
              id="inquiry-modal-desc"
              className="text-xs sm:text-sm text-[#70757A] font-light leading-relaxed"
            >
              Share your details below. Our {city || "Coimbatore"} destination specialists will curate an exclusive itinerary.
            </p>
          </div>

          <button
            type="button"
            onClick={handleModalClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#F7F7F5] border border-[#E4E5E7] text-[#5F6368] hover:text-[#202124] hover:bg-[#E4E5E7] flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto overscroll-contain px-6 py-5 sm:px-8 sm:py-6">
          {successMessage ? (
            <div className="text-center py-6 sm:py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-2xl font-serif font-bold text-[#202124]">
                Enquiry Dispatched
              </h4>
              <p className="text-[#70757A] text-xs sm:text-sm leading-relaxed max-w-sm mx-auto font-light">
                {successMessage}
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                {Boolean(waUrl) && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto h-11 px-6 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] hover:bg-[#DCF3EA] text-[#0D7A53] text-xs uppercase tracking-widest font-bold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Follow Up on WhatsApp</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="w-full sm:w-auto h-11 px-8 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold shadow-xs transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium">
                  {errorMessage}
                </div>
              )}

              {/* Name Field */}
              <div>
                <label
                  htmlFor="inquiry-full-name"
                  className="block text-[11px] uppercase tracking-wider font-semibold text-[#5F6368] mb-1.5"
                >
                  Your Full Name *
                </label>
                <input
                  ref={nameInputRef}
                  id="inquiry-full-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Anandha Kumar"
                  className="w-full px-4 py-3 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/60 text-sm focus:border-[#24292F] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#24292F] transition-all"
                />
              </div>

              {/* Email & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="inquiry-email-address"
                    className="block text-[11px] uppercase tracking-wider font-semibold text-[#5F6368] mb-1.5"
                  >
                    Email Address *
                  </label>
                  <input
                    id="inquiry-email-address"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="anand@example.com"
                    className="w-full px-4 py-3 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/60 text-sm focus:border-[#24292F] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#24292F] transition-all"
                  />
                </div>

                <div>
                  <label
                    htmlFor="inquiry-phone-number"
                    className="block text-[11px] uppercase tracking-wider font-semibold text-[#5F6368] mb-1.5"
                  >
                    Phone / WhatsApp Number
                  </label>
                  <input
                    id="inquiry-phone-number"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-4 py-3 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/60 text-sm focus:border-[#24292F] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#24292F] transition-all"
                  />
                </div>
              </div>

              {/* Message Field */}
              <div>
                <label
                  htmlFor="inquiry-travel-notes"
                  className="block text-[11px] uppercase tracking-wider font-semibold text-[#5F6368] mb-1.5"
                >
                  Trip Details &amp; Custom Requests *
                </label>
                <textarea
                  id="inquiry-travel-notes"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share your travel dates, passenger count, or specific customization requests..."
                  className="w-full px-4 py-3 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/60 text-sm focus:border-[#24292F] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#24292F] resize-none transition-all font-light"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:flex-1 h-12 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold shadow-xs hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Enquiry...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Trip Enquiry</span>
                    </>
                  )}
                </button>

                {Boolean(waUrl) && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto h-12 px-6 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] hover:bg-[#DCF3EA] text-[#0D7A53] text-xs uppercase tracking-widest font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <MessageCircle className="w-4 h-4 text-[#0D7A53]" />
                    <span>Chat on WhatsApp</span>
                  </a>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
