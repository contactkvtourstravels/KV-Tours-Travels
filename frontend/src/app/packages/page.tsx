"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Clock, Compass, Filter, Search, Sparkles, Users } from "lucide-react";
import {
  publicCatalogApi,
  type PublicDestinationListItem,
  type PublicPackageListItem,
  type PackagesPageContent,
} from "@/lib/api";
import { PublicLayout } from "@/components/public/PublicLayout";
import { QuickInquiryModal } from "@/components/public/QuickInquiryModal";

const DESTINATION_FALLBACKS: Record<string, string> = {
  maldives: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=80",
  lakshadweep: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
  kazakhstan: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=1200&q=80",
  manali: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80",
  default: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80",
};

function PackagesContent() {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";

  const [packages, setPackages] = useState<PublicPackageListItem[]>([]);
  const [destinations, setDestinations] = useState<PublicDestinationListItem[]>([]);
  const [pageContent, setPageContent] = useState<PackagesPageContent | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedDest, setSelectedDest] = useState<string>("all");
  const [selectedDuration, setSelectedDuration] = useState<string>("all");

  // Modal
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const [pkgs, dests, contentRes] = await Promise.all([
          publicCatalogApi.getPackages(),
          publicCatalogApi.getDestinations(),
          publicCatalogApi.getPageContent<PackagesPageContent>("packages", isPreview).catch(() => null),
        ]);
        setPackages(pkgs);
        setDestinations(dests);
        if (contentRes?.content) {
          setPageContent(contentRes.content);
        }
      } catch {
        // Handled silently
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, [isPreview]);

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const matchSearch =
        search === "" ||
        pkg.name.toLowerCase().includes(search.toLowerCase()) ||
        pkg.destination_name.toLowerCase().includes(search.toLowerCase());

      const matchDest =
        selectedDest === "all" ||
        pkg.destination_slug.toLowerCase() === selectedDest.toLowerCase();

      let matchDur = true;
      if (selectedDuration === "short") matchDur = pkg.duration_days <= 4;
      else if (selectedDuration === "medium") matchDur = pkg.duration_days >= 5 && pkg.duration_days <= 7;
      else if (selectedDuration === "long") matchDur = pkg.duration_days >= 8;

      return matchSearch && matchDest && matchDur;
    });
  }, [packages, search, selectedDest, selectedDuration]);

  const getPkgImg = (pkg: PublicPackageListItem) => {
    if (pkg.featured_image?.image_url) return pkg.featured_image.image_url;
    const key = Object.keys(DESTINATION_FALLBACKS).find(
      (k) =>
        pkg.slug.toLowerCase().includes(k) ||
        pkg.destination_slug.toLowerCase().includes(k)
    );
    return key ? DESTINATION_FALLBACKS[key] : DESTINATION_FALLBACKS.default;
  };

  const heroEyebrow = pageContent?.hero?.eyebrow || "Curated Travel Packages";
  const heroHeading = pageContent?.hero?.heading || "Extraordinary Itineraries";
  const heroDescription =
    pageContent?.hero?.description ||
    "Every journey includes curated accommodations, private transfers, and handpicked local experiences designed for discerning travelers.";
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
              {pageContent.cta.secondary_button_text && (
                <Link
                  href={pageContent.cta.secondary_button_link || "/contact"}
                  className={`px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-semibold transition-all ${
                    bannerImg
                      ? "bg-white/20 text-white hover:bg-white/30 backdrop-blur-md"
                      : "bg-white border border-[#D3D8DF] text-[#24292F] hover:bg-[#F7F7F5]"
                  }`}
                >
                  {pageContent.cta.secondary_button_text}
                </Link>
              )}
            </div>
          )}

          {/* Introductory paragraph */}
          {pageContent?.introductory_text && (
            <p className={`mt-6 text-xs max-w-xl mx-auto italic ${bannerImg ? "text-white/80" : "text-[#5F6368]"}`}>
              &ldquo;{pageContent.introductory_text}&rdquo;
            </p>
          )}

          {/* Filter Bar */}
          <div className="mt-10 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#70757A] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search packages..."
                className="w-full pl-11 pr-4 py-3 rounded-full bg-white border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/60 text-xs sm:text-sm focus:border-[#24292F] focus:outline-none shadow-sm transition-all"
              />
            </div>

            <div className="relative">
              <select
                value={selectedDest}
                onChange={(e) => setSelectedDest(e.target.value)}
                className="w-full px-5 py-3 rounded-full bg-white border border-[#E4E5E7] text-[#202124] text-xs sm:text-sm focus:border-[#24292F] focus:outline-none appearance-none shadow-sm transition-all cursor-pointer"
              >
                <option value="all">All Destinations</option>
                {destinations.map((d) => (
                  <option key={d.slug} value={d.slug}>
                    {d.name} ({d.country})
                  </option>
                ))}
              </select>
              <Filter className="w-4 h-4 text-[#70757A] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(e.target.value)}
                className="w-full px-5 py-3 rounded-full bg-white border border-[#E4E5E7] text-[#202124] text-xs sm:text-sm focus:border-[#24292F] focus:outline-none appearance-none shadow-sm transition-all cursor-pointer"
              >
                <option value="all">Any Duration</option>
                <option value="short">1 - 4 Days (Quick Getaway)</option>
                <option value="medium">5 - 7 Days (Signature Week)</option>
                <option value="long">8+ Days (Grand Tour)</option>
              </select>
              <Clock className="w-4 h-4 text-[#70757A] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Packages Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-[460px] rounded-3xl bg-[#F3F4F4] animate-pulse border border-[#E4E5E7]" />
              ))}
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="text-center py-20 px-4 rounded-3xl border border-[#E4E5E7] bg-[#F7F7F5]">
              <Compass className="w-12 h-12 text-[#5F6368]/50 mx-auto mb-3" />
              <h3 className="text-xl font-serif font-bold text-[#202124]">No Matching Packages</h3>
              <p className="text-[#70757A] text-sm mt-1 max-w-md mx-auto">
                No published packages match the selected criteria. Tell us what you have in mind and we will design a custom itinerary for you.
              </p>
              <Link
                href="/custom-trip"
                className="mt-6 inline-block px-6 py-2.5 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold shadow-xs transition-all"
              >
                Plan Custom Trip Instead
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="rounded-3xl overflow-hidden bg-white border border-[#E4E5E7] hover:border-[#24292F]/40 transition-all duration-300 flex flex-col shadow-sm hover:shadow-xl group"
                >
                  <div className="relative h-64 overflow-hidden">
                    <Image
                      src={getPkgImg(pkg)}
                      alt={pkg.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-[#E4E5E7] text-[#202124] text-[11px] uppercase tracking-wider font-semibold shadow-sm">
                        {pkg.destination_name}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                      <span className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-sm">
                        <Clock className="w-3.5 h-3.5 text-[#ECEFF3]" />
                        {pkg.duration_days}D / {pkg.duration_nights}N
                      </span>
                      <span className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-sm">
                        <Users className="w-3.5 h-3.5 text-[#ECEFF3]" />
                        Min {pkg.minimum_travellers}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-xl font-serif font-bold text-[#202124] group-hover:text-[#3D4450] transition-colors line-clamp-2">
                        {pkg.name}
                      </h3>
                      <div className="mt-4 pt-4 border-t border-[#E4E5E7] flex items-baseline justify-between">
                        <div>
                          <span className="text-[11px] uppercase tracking-wider text-[#70757A] block font-medium">Starting from</span>
                          <span className="text-2xl font-serif font-bold text-[#24292F]">
                            ₹{Number(pkg.base_price).toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-[#70757A] ml-1">/ person</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2.5">
                      <Link
                        href={`/packages/${pkg.slug}`}
                        className="flex-1 h-10 rounded-full bg-[#F3F4F4] hover:bg-[#E4E5E7] border border-[#E4E5E7] text-[#202124] text-xs uppercase tracking-widest font-semibold flex items-center justify-center transition-all"
                      >
                        View Journey
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPkg({ id: pkg.id, name: pkg.name });
                          setInquiryModalOpen(true);
                        }}
                        className="h-10 px-5 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold transition-all shadow-xs"
                      >
                        Enquire
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick Inquiry Modal */}
      <QuickInquiryModal
        isOpen={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
        packageId={selectedPkg?.id}
        packageName={selectedPkg?.name}
      />
    </PublicLayout>
  );
}

export default function PackagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F7F5]" />}>
      <PackagesContent />
    </Suspense>
  );
}

