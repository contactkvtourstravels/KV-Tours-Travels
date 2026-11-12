"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";
import {
  publicCatalogApi,
  type PublicDepartureListItem,
  type GroupTripsPageContent,
} from "@/lib/api";
import { INITIAL_DEPARTURES } from "@/lib/initialCatalog";
import { PublicLayout } from "@/components/public/PublicLayout";
import { TravelImage } from "@/components/public/TravelImage";
import { getSafeImageUrl } from "@/lib/images";
import { QuickInquiryModal } from "@/components/public/QuickInquiryModal";
import { useBranding } from "@/context/BrandingContext";

const DESTINATION_FALLBACKS: Record<string, string> = {
  maldives: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=80",
  lakshadweep: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
  kazakhstan: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=1200&q=80",
  manali: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80",
  default: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80",
};

function GroupTripsContent() {
  const { displayName, getWhatsAppUrl, whatsappEnabled } = useBranding();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";

  // Pre-populated with official departures for instant 0ms first paint
  const [departures, setDepartures] = useState<PublicDepartureListItem[]>(INITIAL_DEPARTURES);
  const [pageContent, setPageContent] = useState<GroupTripsPageContent | null>(null);
  const [loading, setLoading] = useState(false);

  // Inquiry modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [data, contentRes] = await Promise.all([
          publicCatalogApi.getAllDepartures(),
          publicCatalogApi.getPageContent<GroupTripsPageContent>("group-trips", isPreview).catch(() => null),
        ]);
        if (Array.isArray(data) && data.length > 0) setDepartures(data);
        if (contentRes?.content) {
          setPageContent(contentRes.content);
        }
      } catch {
        // Handled silently
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isPreview]);

  const getImg = (dep: PublicDepartureListItem) => {
    let raw = "";
    if (dep.featured_image?.image_url) raw = dep.featured_image.image_url;
    else {
      const key = Object.keys(DESTINATION_FALLBACKS).find(
        (k) =>
          dep.package_slug.toLowerCase().includes(k) ||
          dep.destination_slug.toLowerCase().includes(k)
      );
      raw = key ? DESTINATION_FALLBACKS[key] : DESTINATION_FALLBACKS.default;
    }
    return getSafeImageUrl(raw);
  };

  const heroEyebrow = pageContent?.hero?.eyebrow || `${displayName} Signature Departures`;
  const heroHeading = pageContent?.hero?.heading || "Upcoming Group Journeys";
  const heroDescription =
    pageContent?.hero?.description ||
    "Travel together with fellow adventurers. Fixed departure dates with guaranteed small-group dynamics and transparent inclusions.";
  const bannerImg = pageContent?.hero?.banner_image_url;

  return (
    <PublicLayout>
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
            <Sparkles className={`w-3.5 h-3.5 ${bannerImg ? "text-white" : "text-[#5F6368]"}`} />
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

          {/* Optional CTA buttons */}
          {pageContent?.cta?.show_cta && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {pageContent.cta.primary_button_text && (
                <Link
                  href={pageContent.cta.primary_button_link || "/custom-trip"}
                  className="px-6 py-2.5 rounded-full bg-[#DFBA73] hover:bg-[#C5A880] text-[#1B1E22] text-xs uppercase tracking-widest font-bold shadow-md transition-all"
                >
                  {pageContent.cta.primary_button_text}
                </Link>
              )}
              {pageContent.cta.secondary_button_text && pageContent.cta.secondary_button_link && (
                <Link
                  href={pageContent.cta.secondary_button_link}
                  className={`px-6 py-2.5 rounded-full border text-xs uppercase tracking-widest font-semibold transition-all ${
                    bannerImg
                      ? "border-white/40 text-white hover:bg-white/10"
                      : "border-[#D3D8DF] bg-white text-[#202124] hover:bg-[#F3F4F4]"
                  }`}
                >
                  {pageContent.cta.secondary_button_text}
                </Link>
              )}
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

      {/* Departures Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[480px] rounded-3xl bg-[#F3F4F4] animate-pulse border border-[#E4E5E7]" />
              ))}
            </div>
          ) : departures.length === 0 ? (
            <div className="text-center py-20 px-4 rounded-3xl border border-[#E4E5E7] bg-[#F7F7F5]">
              <Calendar className="w-12 h-12 text-[#24292F]/60 mx-auto mb-3" />
              <h3 className="text-2xl font-serif font-bold text-[#202124]">Next Group Dates Being Scheduled</h3>
              <p className="text-[#70757A] text-sm mt-2 max-w-md mx-auto leading-relaxed">
                {pageContent?.empty_state_note ||
                  "We frequently run promotional group tours to Manali, Maldives, Lakshadweep, and Kazakhstan. Register your interest below to receive priority access to new batch dates."}
              </p>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="mt-6 px-8 py-3.5 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold shadow-md shadow-[#24292F]/10 transition-all"
              >
                Join Departure Waitlist
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {departures.map((dep) => {
                const depDate = new Date(dep.departure_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                const retDate = dep.return_date
                  ? new Date(dep.return_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : null;
                const price = dep.special_price ?? dep.base_price;
                const capacityPercentage = Math.round(
                  ((dep.total_capacity - dep.available_capacity) / dep.total_capacity) * 100
                );

                const waDirect = getWhatsAppUrl(
                  `Hi ${displayName}, I am interested in reserving seats for the ${dep.package_name} group departure on ${depDate}. Please confirm availability.`
                );

                return (
                  <div
                    key={dep.id}
                    className="group rounded-3xl overflow-hidden bg-white border border-[#E4E5E7] hover:border-[#24292F]/40 transition-all duration-300 flex flex-col shadow-sm hover:shadow-xl"
                  >
                    {/* Visual Card Top */}
                    <div className="relative h-56 sm:h-60 overflow-hidden">
                      <TravelImage
                        src={getImg(dep)}
                        alt={dep.package_name}
                        fill
                        fallbackSlug={dep.package_slug || dep.destination_slug}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                      <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
                        <span className="px-2.5 sm:px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-[#E4E5E7] text-[#202124] text-[11px] sm:text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                          <MapPin className="w-3.5 h-3.5 text-[#24292F]" />
                          <span className="truncate max-w-[140px] sm:max-w-none">{dep.destination_name}</span>
                        </span>
                      </div>

                      {/* Status indicator */}
                      <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                        {dep.status === "sold_out" || dep.available_capacity <= 0 ? (
                          <span className="px-2.5 sm:px-3 py-1 rounded-full bg-red-600/90 text-white text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider shadow-sm backdrop-blur-sm">
                            Sold Out
                          </span>
                        ) : (
                          <span className="px-2.5 sm:px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider shadow-sm">
                            Open Batch
                          </span>
                        )}
                      </div>

                      {/* Bottom Info Bar inside image */}
                      <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-4 flex flex-wrap items-center justify-between gap-1.5 text-xs text-white">
                        <span className="flex items-center gap-1.5 bg-black/65 px-2.5 py-1 rounded-full backdrop-blur-sm text-[11px] sm:text-xs">
                          <Clock className="w-3.5 h-3.5 text-white/80 shrink-0" />
                          <span>{dep.duration_days}D / {dep.duration_nights}N</span>
                        </span>
                        <span className="flex items-center gap-1 bg-black/65 px-2.5 py-1 rounded-full backdrop-blur-sm text-white font-semibold text-[11px] sm:text-xs">
                          ₹{Number(price).toLocaleString("en-IN")} / person
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between space-y-5 sm:space-y-6">
                      <div className="space-y-3 sm:space-y-4">
                        <h3 className="text-lg sm:text-xl font-serif font-bold text-[#202124] group-hover:text-[#24292F] transition-colors break-words">
                          {dep.package_name}
                        </h3>

                        {/* Date schedule breakdown */}
                        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-2 text-xs">
                          <div className="flex items-center justify-between text-[#202124] gap-2">
                            <span className="text-[#70757A] flex items-center gap-1.5 shrink-0">
                              <Calendar className="w-3.5 h-3.5 text-[#24292F]" />
                              Departure:
                            </span>
                            <span className="font-bold truncate text-right">{depDate}</span>
                          </div>
                          {retDate && (
                            <div className="flex items-center justify-between text-[#202124] gap-2">
                              <span className="text-[#70757A] flex items-center gap-1.5 shrink-0">
                                <Calendar className="w-3.5 h-3.5 text-[#24292F]" />
                                Return:
                              </span>
                              <span className="font-bold truncate text-right">{retDate}</span>
                            </div>
                          )}
                        </div>

                        {/* Capacity / Availability Progress Meter */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs gap-2">
                            <span className="text-[#70757A] flex items-center gap-1 font-medium shrink-0">
                              <Users className="w-3.5 h-3.5 text-[#24292F]" />
                              <span>Live Availability</span>
                            </span>
                            {dep.status === "sold_out" || dep.available_capacity <= 0 ? (
                              <span className="font-bold text-red-600 truncate text-right">Sold Out (Waitlist Open)</span>
                            ) : (
                              <span className="font-bold text-emerald-600 truncate text-right">
                                {dep.available_capacity} {dep.available_capacity === 1 ? "seat" : "seats"} left
                              </span>
                            )}
                          </div>
                          <div className="w-full h-2 rounded-full bg-[#E4E5E7] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                dep.status === "sold_out" || dep.available_capacity <= 0 ? "bg-red-400" : "bg-[#24292F]"
                              }`}
                              style={{ width: dep.status === "sold_out" || dep.available_capacity <= 0 ? "100%" : `${Math.min(100, Math.max(15, capacityPercentage))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 flex flex-wrap items-center gap-2 sm:gap-2.5">
                        <Link
                          href={`/packages/${dep.package_slug}`}
                          className="flex-1 min-w-[85px] sm:min-w-[90px] h-10 px-2 sm:px-3 rounded-full bg-[#F3F4F4] hover:bg-[#E4E5E7] border border-[#E4E5E7] text-[#202124] text-xs uppercase tracking-wider font-semibold text-center flex items-center justify-center transition-all whitespace-nowrap"
                        >
                          Itinerary
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPkg({ id: dep.package_id, name: dep.package_name });
                            setModalOpen(true);
                          }}
                          className={`flex-1 min-w-[85px] sm:min-w-[90px] h-10 px-2 sm:px-5 rounded-full text-xs uppercase tracking-wider font-bold transition-all shadow-sm whitespace-nowrap ${
                            dep.status === "sold_out" || dep.available_capacity <= 0
                              ? "bg-stone-700 hover:bg-stone-800 text-white"
                              : "bg-[#24292F] hover:bg-[#3D4450] text-white"
                          }`}
                        >
                          {dep.status === "sold_out" || dep.available_capacity <= 0 ? "Waitlist" : "Enquire"}
                        </button>
                        {whatsappEnabled && Boolean(waDirect) && (
                          <a
                            href={waDirect}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-10 w-10 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] text-[#0D7A53] hover:bg-[#DCF3EA] flex items-center justify-center transition-all shrink-0"
                            title="Reserve on WhatsApp"
                            aria-label="Reserve seats on WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Inquiry modal */}
      <QuickInquiryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        packageId={selectedPkg?.id}
        packageName={selectedPkg?.name}
      />
    </PublicLayout>
  );
}

export default function GroupTripsPage() {
  return (
    <Suspense
      fallback={
        <PublicLayout>
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-[#24292F] border-t-transparent animate-spin" />
          </div>
        </PublicLayout>
      }
    >
      <GroupTripsContent />
    </Suspense>
  );
}
