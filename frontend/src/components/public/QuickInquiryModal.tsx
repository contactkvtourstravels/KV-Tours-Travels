"use client";

import { useState } from "react";
import { CheckCircle2, Compass, Loader2, MessageCircle, Send, X } from "lucide-react";
import { publicCatalogApi, type PublicInquiryCreate } from "@/lib/api";
import { useBranding } from "@/context/BrandingContext";

interface QuickInquiryModalProps {
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
  const { displayName, shortName, city, getWhatsAppUrl } = useBranding();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(
    initialMessage ||
      (packageName
        ? `Hello ${displayName}, I am interested in the "${packageName}" tour package. Please share detailed itinerary and pricing options.`
        : destinationName
        ? `Hello ${displayName}, I am planning a holiday to ${destinationName}. Please suggest custom itinerary options.`
        : `Hello ${displayName}, I would like to plan a travel trip with you.`)
  );
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const payload: PublicInquiryCreate = {
        name,
        email,
        phone: phone || undefined,
        package_id: packageId,
        destination_id: destinationId,
        message,
        source: packageName ? "package" : destinationName ? "destination" : "contact_form",
      };

      const res = await publicCatalogApi.submitInquiry(payload);
      setSuccessMessage(res.message);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to submit enquiry. Please try again or WhatsApp us.";
      setErrorMessage(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const waUrl = getWhatsAppUrl(
    packageName
      ? `Hi ${displayName}, I am interested in the ${packageName} package. Please share details.`
      : `Hi ${displayName}, I would like to plan a trip with you.`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#F3F4F4] text-[#70757A] hover:text-[#202124] hover:bg-[#E4E5E7] flex items-center justify-center transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {successMessage ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-serif font-bold text-[#202124]">Enquiry Received</h3>
            <p className="text-[#70757A] text-sm leading-relaxed max-w-md mx-auto">
              {successMessage}
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] text-[#0D7A53] text-xs uppercase tracking-widest font-semibold hover:bg-[#DCF3EA] transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Follow up on WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-[#F3F4F4] text-[#202124] text-xs uppercase tracking-widest font-semibold hover:bg-[#E4E5E7] transition-all"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 text-[#3D4450] text-xs uppercase tracking-widest font-semibold mb-2">
              <Compass className="w-4 h-4" />
              <span>{shortName || displayName} Travel Concierge</span>
            </div>

            <h3 className="text-2xl font-serif font-bold text-[#202124]">
              {packageName ? `Enquire for ${packageName}` : "Plan Your Travel Journey"}
            </h3>
            <p className="text-[#70757A] text-xs sm:text-sm mt-1 mb-6">
              Share your trip ideas below. Our travel experts in {city || "our concierge office"} will curate a bespoke proposal.
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="inquiry-name" className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Your Full Name *
                </label>
                <input
                  id="inquiry-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Krishnan"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/60 text-sm focus:border-[#24292F] focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="inquiry-email" className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                    Email Address *
                  </label>
                  <input
                    id="inquiry-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/60 text-sm focus:border-[#24292F] focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="inquiry-phone" className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                    Phone / WhatsApp Number
                  </label>
                  <input
                    id="inquiry-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/60 text-sm focus:border-[#24292F] focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="inquiry-message" className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Trip Details & Preferences *
                </label>
                <textarea
                  id="inquiry-message"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about your expected dates, traveller count, and special requests..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/60 text-sm focus:border-[#24292F] focus:bg-white focus:outline-none resize-none transition-all"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:flex-1 h-11 rounded-full bg-[#24292F] text-white hover:bg-[#3D4450] text-xs uppercase tracking-widest font-bold shadow-md shadow-[#24292F]/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Trip Enquiry</span>
                    </>
                  )}
                </button>

                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 h-11 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] text-[#0D7A53] text-xs uppercase tracking-widest font-semibold hover:bg-[#DCF3EA] flex items-center justify-center gap-2 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Instead</span>
                </a>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
