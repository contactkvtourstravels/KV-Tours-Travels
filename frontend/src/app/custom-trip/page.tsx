"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Compass,
  DollarSign,
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  Plane,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import {
  publicCatalogApi,
  type PublicInquiryCreate,
  type CustomTripPageContent,
} from "@/lib/api";
import { PublicLayout } from "@/components/public/PublicLayout";
import { useBranding } from "@/context/BrandingContext";

const TRIP_TYPES = [
  { id: "honeymoon", label: "Honeymoon & Romance", icon: Heart },
  { id: "family", label: "Family Vacation", icon: Users },
  { id: "adventure", label: "Adventure & Thrill", icon: Compass },
  { id: "luxury", label: "Luxury Leisure", icon: Sparkles },
  { id: "friends", label: "Friends Group Trip", icon: Plane },
];

function CustomTripPlanner() {
  const { displayName, city, getWhatsAppUrl } = useBranding();
  const searchParams = useSearchParams();
  const prefilledDest = searchParams?.get("destination") || "";
  const isPreview = searchParams?.get("preview") === "true";

  const [pageContent, setPageContent] = useState<CustomTripPageContent | null>(null);
  const [destination, setDestination] = useState(prefilledDest);
  const [dates, setDates] = useState("");
  const [duration, setDuration] = useState("5-7 Days");
  const [travellers, setTravellers] = useState("2 Adults");
  const [tripType, setTripType] = useState("honeymoon");
  const [budget, setBudget] = useState("₹50,000 - ₹1,00,000 per person");
  const [preferences, setPreferences] = useState("");

  // Contact
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prefilledDest) setDestination(prefilledDest);
  }, [prefilledDest]);

  useEffect(() => {
    publicCatalogApi
      .getPageContent<CustomTripPageContent>("custom-trip", isPreview)
      .then((res) => {
        if (res?.content) setPageContent(res.content);
      })
      .catch(() => null);
  }, [isPreview]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const compiledMessage = `
[CUSTOM TRIP PLANNER ENQUIRY]
Destination Desired: ${destination}
Preferred Travel Dates: ${dates || "Flexible"}
Approx Duration: ${duration}
Traveller Count: ${travellers}
Trip Category: ${tripType}
Estimated Budget: ${budget}
Special Preferences: ${preferences || "None specified"}
    `.trim();

    startTransition(async () => {
      try {
        const payload: PublicInquiryCreate = {
          name,
          email,
          phone: phone || undefined,
          message: compiledMessage,
          source: "other",
        };

        const res = await publicCatalogApi.submitInquiry(payload);
        setSuccess(res.message);
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Failed to submit custom trip enquiry. Please try again or WhatsApp our concierge.";
        setError(errorMsg);
      }
    });
  };

  const waUrl = getWhatsAppUrl(
    `Hi ${displayName}! I would like to design a custom trip to ${destination || "a holiday destination"}. Please assist me.`
  );

  const heroEyebrow = pageContent?.hero?.eyebrow || `${city || "Private"} Concierge Service`;
  const heroHeading = pageContent?.hero?.heading || "Design Your Bespoke Journey";
  const heroDescription =
    pageContent?.hero?.description ||
    `Every vacation should be as unique as you are. Share your travel wishes below and let our ${city || displayName} specialists curate an extraordinary, personalized itinerary.`;
  const bannerImg = pageContent?.hero?.banner_image_url;

  const submitButtonLabel = pageContent?.cta_labels?.submit_button_label || "Request Custom Itinerary";
  const whatsappButtonLabel = pageContent?.cta_labels?.whatsapp_button_label || "Plan on WhatsApp Directly";
  const successTitle = pageContent?.cta_labels?.success_title || "Trip Request Registered";
  const successMessage = pageContent?.cta_labels?.success_message || success;

  return (
    <>
      {/* Header Banner */}
      <section
        className="relative py-20 border-b border-[#E4E5E7] overflow-hidden"
        style={{
          backgroundImage: bannerImg
            ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.65)), url(${bannerImg})`
            : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: bannerImg ? "#202124" : "#F7F7F5",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs uppercase tracking-widest font-semibold mb-4 shadow-2xs ${
              bannerImg
                ? "bg-white/20 text-white border-white/30 backdrop-blur-md"
                : "bg-white text-[#24292F] border-[#D3D8DF]"
            }`}
          >
            <Compass className={`w-3.5 h-3.5 ${bannerImg ? "text-white" : "text-[#5F6368]"}`} />
            <span>{heroEyebrow}</span>
          </div>
          <h1
            className={`text-3xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight ${
              bannerImg ? "text-white drop-shadow-sm" : "text-[#202124]"
            }`}
          >
            {heroHeading}
          </h1>
          <p
            className={`mt-4 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${
              bannerImg ? "text-white/90 drop-shadow-xs" : "text-[#70757A]"
            }`}
          >
            {heroDescription}
          </p>

          {/* Optional Secondary CTA button if specified */}
          {pageContent?.cta_labels?.secondary_cta_text && pageContent?.cta_labels?.secondary_cta_link && (
            <div className="mt-6 flex justify-center">
              <Link
                href={pageContent.cta_labels.secondary_cta_link}
                className={`px-6 py-2.5 rounded-full border text-xs uppercase tracking-widest font-semibold transition-all ${
                  bannerImg
                    ? "border-white/40 text-white hover:bg-white/10"
                    : "border-[#D3D8DF] bg-white text-[#202124] hover:bg-[#F3F4F4]"
                }`}
              >
                {pageContent.cta_labels.secondary_cta_text}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Optional Editorial Intro */}
      {pageContent?.introductory_text && (
        <section className="py-8 bg-[#FBFBFA] border-b border-[#E4E5E7]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm sm:text-base text-[#5F6368] leading-relaxed italic">
              {pageContent.introductory_text}
            </p>
          </div>
        </section>
      )}

      {/* Form Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {success ? (
            <div className="p-10 rounded-3xl bg-white border border-[#E4E5E7] text-center space-y-6 shadow-xl">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h2 className="text-3xl font-serif font-bold text-[#202124]">
                {successTitle}
              </h2>
              <p className="text-[#70757A] text-base max-w-lg mx-auto leading-relaxed font-light">
                {successMessage}
              </p>
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-11 px-6 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] text-[#0D7A53] text-xs uppercase tracking-widest font-semibold hover:bg-[#DCF3EA] transition-all flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{whatsappButtonLabel}</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSuccess(null)}
                  className="h-11 px-6 rounded-full bg-[#F3F4F4] text-[#202124] text-xs uppercase tracking-widest font-semibold hover:bg-[#E4E5E7] transition-all"
                >
                  Submit Another Enquiry
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl bg-white border border-[#E4E5E7] p-6 sm:p-12 shadow-xl space-y-10">
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-10">
                {/* 1. Trip Style Selection */}
                <div className="space-y-4">
                  <span className="text-xs uppercase tracking-widest font-bold text-[#5F6368] block">
                    Step 1: Choose Your Travel Style
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {TRIP_TYPES.map((t) => {
                      const Icon = t.icon;
                      const selected = tripType === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTripType(t.id)}
                          className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                            selected
                              ? "bg-[#24292F] border-[#24292F] text-white shadow-xs font-semibold"
                              : "bg-[#F7F7F5] border-[#E4E5E7] text-[#70757A] hover:text-[#202124] hover:bg-white"
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${selected ? "text-white" : "text-[#70757A]"}`} />
                          <span className="text-xs">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Key Itinerary Parameters */}
                <div className="space-y-4">
                  <span className="text-xs uppercase tracking-widest font-bold text-[#5F6368] block">
                    Step 2: Basic Trip Parameters
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#202124] block mb-1.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#5F6368]" />
                        <span>Dream Destination</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="e.g. Maldives, Switzerland, Bali, Kashmir"
                        className="w-full h-11 px-4 rounded-xl border border-[#D3D8DF] bg-white text-sm text-[#202124] focus:outline-hidden focus:border-[#24292F] transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#202124] block mb-1.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#5F6368]" />
                        <span>Target Travel Dates</span>
                      </label>
                      <input
                        type="text"
                        value={dates}
                        onChange={(e) => setDates(e.target.value)}
                        placeholder="e.g. October 2026 / Diwali Week / Flexible"
                        className="w-full h-11 px-4 rounded-xl border border-[#D3D8DF] bg-white text-sm text-[#202124] focus:outline-hidden focus:border-[#24292F] transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#202124] block mb-1.5 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-[#5F6368]" />
                        <span>Trip Duration</span>
                      </label>
                      <select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-[#D3D8DF] bg-white text-sm text-[#202124] focus:outline-hidden focus:border-[#24292F] transition-all"
                      >
                        <option value="3-4 Days">3 - 4 Days (Quick Escape)</option>
                        <option value="5-7 Days">5 - 7 Days (Standard Week)</option>
                        <option value="8-10 Days">8 - 10 Days (Comprehensive)</option>
                        <option value="11-14 Days">11 - 14 Days (Extended Journey)</option>
                        <option value="15+ Days">15+ Days (Grand Tour)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#202124] block mb-1.5 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#5F6368]" />
                        <span>Number of Travellers</span>
                      </label>
                      <select
                        value={travellers}
                        onChange={(e) => setTravellers(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-[#D3D8DF] bg-white text-sm text-[#202124] focus:outline-hidden focus:border-[#24292F] transition-all"
                      >
                        <option value="Solo Traveller">Solo Adventurer</option>
                        <option value="Couple (2 Adults)">Couple (2 Adults)</option>
                        <option value="Family (2 Adults + 1 Kid)">Family (2 Adults + 1 Kid)</option>
                        <option value="Family (2 Adults + 2 Kids)">Family (2 Adults + 2 Kids)</option>
                        <option value="Small Group (4-6 Pax)">Small Group (4-6 Pax)</option>
                        <option value="Large Group (7+ Pax)">Large Group (7+ Pax)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. Budget & Notes */}
                <div className="space-y-4">
                  <span className="text-xs uppercase tracking-widest font-bold text-[#5F6368] block">
                    Step 3: Budget & Tailored Preferences
                  </span>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-[#202124] block mb-1.5 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-[#5F6368]" />
                        <span>Estimated Budget Preference</span>
                      </label>
                      <select
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-[#D3D8DF] bg-white text-sm text-[#202124] focus:outline-hidden focus:border-[#24292F] transition-all"
                      >
                        <option value="Comfort Value (₹35,000 - ₹50,000 / person)">
                          Comfort Value (₹35,000 - ₹50,000 / person)
                        </option>
                        <option value="Premium Quality (₹50,000 - ₹1,00,000 / person)">
                          Premium Quality (₹50,000 - ₹1,00,000 / person)
                        </option>
                        <option value="Luxury Signature (₹1,00,000 - ₹2,00,000 / person)">
                          Luxury Signature (₹1,00,000 - ₹2,00,000 / person)
                        </option>
                        <option value="Ultra Ultra Luxury (₹2,00,000+ / person)">
                          Ultra Luxury (₹2,00,000+ / person)
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#202124] block mb-1.5">
                        Specific Requests or Bucket-List Activities
                      </label>
                      <textarea
                        rows={3}
                        value={preferences}
                        onChange={(e) => setPreferences(e.target.value)}
                        placeholder="e.g. Vegetarian dining preference, water villa with pool, scuba diving certification, direct flights from Coimbatore or Bangalore..."
                        className="w-full p-4 rounded-xl border border-[#D3D8DF] bg-white text-sm text-[#202124] focus:outline-hidden focus:border-[#24292F] transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Contact Details */}
                <div className="space-y-4 pt-4 border-t border-[#E4E5E7]">
                  <span className="text-xs uppercase tracking-widest font-bold text-[#5F6368] block">
                    Step 4: Where Should We Send Your Proposal?
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#202124] block mb-1.5">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full h-11 px-4 rounded-xl border border-[#D3D8DF] bg-white text-sm text-[#202124] focus:outline-hidden focus:border-[#24292F] transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#202124] block mb-1.5">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full h-11 px-4 rounded-xl border border-[#D3D8DF] bg-white text-sm text-[#202124] focus:outline-hidden focus:border-[#24292F] transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#202124] block mb-1.5">
                        Phone / WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full h-11 px-4 rounded-xl border border-[#D3D8DF] bg-white text-sm text-[#202124] focus:outline-hidden focus:border-[#24292F] transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Action CTA */}
                <div className="pt-6 border-t border-[#E4E5E7] flex flex-col sm:flex-row items-center gap-3.5">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full sm:flex-1 h-12 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold shadow-xs hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating Your Proposal...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{submitButtonLabel}</span>
                      </>
                    )}
                  </button>

                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-6 h-12 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] text-[#0D7A53] text-xs uppercase tracking-widest font-semibold hover:bg-[#DCF3EA] transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{whatsappButtonLabel}</span>
                  </a>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default function CustomTripPage() {
  return (
    <PublicLayout>
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center text-[#70757A]">
            <Loader2 className="w-8 h-8 animate-spin text-[#24292F]" />
          </div>
        }
      >
        <CustomTripPlanner />
      </Suspense>
    </PublicLayout>
  );
}
