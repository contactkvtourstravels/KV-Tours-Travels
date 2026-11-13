"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Compass, Globe, MapPin, Search } from "lucide-react";
import {
  publicCatalogApi,
  type PublicDestinationListItem,
  type DestinationsPageContent,
} from "@/lib/api";
import { INITIAL_DESTINATIONS } from "@/lib/initialCatalog";
import { PublicLayout } from "@/components/public/PublicLayout";
import { TravelImage } from "@/components/public/TravelImage";
import { getSafeImageUrl, getDestinationFallback, DESTINATION_FALLBACKS } from "@/lib/images";
import { useBranding } from "@/context/BrandingContext";

const ITEMS_PER_PAGE = 12;

export interface DestinationsClientProps {
  initialDestinations?: PublicDestinationListItem[];
  initialContent?: DestinationsPageContent | null;
}

export function DestinationsClient({
  initialDestinations,
  initialContent,
}: DestinationsClientProps) {
  const { displayName } = useBranding();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";

  // Pre-hydrated with live database destinations for instant 0ms first paint
  const [destinations, setDestinations] = useState<PublicDestinationListItem[]>(
    initialDestinations?.length ? initialDestinations : INITIAL_DESTINATIONS
  );
  const [pageContent, setPageContent] = useState<DestinationsPageContent | null>(
    initialContent || null
  );
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [classificationTab, setClassificationTab] = useState<"all" | "domestic" | "international">("all");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (initialDestinations?.length && !isPreview) {
      return;
    }

    async function fetchDestinations() {
      try {
        const [data, contentRes] = await Promise.all([
          publicCatalogApi.getDestinations(),
          publicCatalogApi.getPageContent<DestinationsPageContent>("destinations", isPreview).catch(() => null),
        ]);
        if (Array.isArray(data) && data.length > 0) setDestinations(data);
        if (contentRes?.content) {
          setPageContent(contentRes.content);
        }
      } catch {
        // Fallback gracefully
      } finally {
        setLoading(false);
      }
    }
    fetchDestinations();
  }, [isPreview]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, classificationTab, selectedCountry]);

  // Counts
  const counts = useMemo(() => {
    const domestic = destinations.filter((d) => d.country.toLowerCase() === "india").length;
    const international = destinations.filter((d) => d.country.toLowerCase() !== "india").length;
    return { all: destinations.length, domestic, international };
  }, [destinations]);

  // Countries for country filter dropdown/pills
  const countries = useMemo(() => {
    const set = new Set<string>();
    destinations.forEach((d) => {
      if (classificationTab === "domestic" && d.country.toLowerCase() !== "india") return;
      if (classificationTab === "international" && d.country.toLowerCase() === "india") return;
      if (d.country) set.add(d.country);
    });
    return ["all", ...Array.from(set).sort()];
  }, [destinations, classificationTab]);

  const filteredDestinations = useMemo(() => {
    return destinations.filter((d) => {
      const isDomestic = d.country.toLowerCase() === "india";
      const matchClassification =
        classificationTab === "all" ||
        (classificationTab === "domestic" && isDomestic) ||
        (classificationTab === "international" && !isDomestic);

      const matchSearch =
        search === "" ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.country.toLowerCase().includes(search.toLowerCase()) ||
        (d.region && d.region.toLowerCase().includes(search.toLowerCase())) ||
        (d.short_description && d.short_description.toLowerCase().includes(search.toLowerCase()));

      const matchCountry = selectedCountry === "all" || d.country.toLowerCase() === selectedCountry.toLowerCase();
      return matchClassification && matchSearch && matchCountry;
    });
  }, [destinations, search, classificationTab, selectedCountry]);

  // Pagination
  const totalPages = Math.ceil(filteredDestinations.length / ITEMS_PER_PAGE) || 1;
  const paginatedDestinations = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDestinations.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDestinations, currentPage]);

  const getImg = (dest: PublicDestinationListItem) => {
    let raw = "";
    if (dest.cover_image_url) raw = dest.cover_image_url;
    else if (dest.featured_image?.image_url) raw = dest.featured_image.image_url;
    else {
      const key = Object.keys(DESTINATION_FALLBACKS).find((k) =>
        dest.slug.toLowerCase().includes(k)
      );
      raw = key ? DESTINATION_FALLBACKS[key] : DESTINATION_FALLBACKS.default;
    }
    return getSafeImageUrl(raw);
  };

  const heroEyebrow = pageContent?.hero?.eyebrow || "Worldwide Travel Catalog";
  const heroHeading = pageContent?.hero?.heading || "Destinations Beyond the Ordinary";
  const heroDescription =
    pageContent?.hero?.description ||
    `Explore curated destinations across India domestic hill stations and global international regions with ${displayName}.`;
  const bannerImg = pageContent?.hero?.banner_image_url;

  return (
    <PublicLayout>
      {/* Header Banner */}
      <section
        className="relative py-16 sm:py-20 border-b border-[#E4E5E7] overflow-hidden"
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
            <Globe className={`w-3.5 h-3.5 ${bannerImg ? "text-white" : "text-[#5F6368]"}`} />
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

          {/* Classification Filter Tabs */}
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setClassificationTab("all");
                setSelectedCountry("all");
              }}
              className={`px-5 py-2.5 rounded-full text-xs uppercase tracking-wider font-bold transition-all shadow-xs ${
                classificationTab === "all"
                  ? "bg-[#24292F] text-white"
                  : "bg-white text-[#5F6368] hover:text-[#202124] hover:bg-[#F3F4F4] border border-[#E4E5E7]"
              }`}
            >
              All Destinations ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => {
                setClassificationTab("domestic");
                setSelectedCountry("all");
              }}
              className={`px-5 py-2.5 rounded-full text-xs uppercase tracking-wider font-bold transition-all shadow-xs ${
                classificationTab === "domestic"
                  ? "bg-[#DFBA73] text-[#1B1E22]"
                  : "bg-white text-[#5F6368] hover:text-[#202124] hover:bg-[#F3F4F4] border border-[#E4E5E7]"
              }`}
            >
              India Domestic ({counts.domestic})
            </button>
            <button
              type="button"
              onClick={() => {
                setClassificationTab("international");
                setSelectedCountry("all");
              }}
              className={`px-5 py-2.5 rounded-full text-xs uppercase tracking-wider font-bold transition-all shadow-xs ${
                classificationTab === "international"
                  ? "bg-[#DFBA73] text-[#1B1E22]"
                  : "bg-white text-[#5F6368] hover:text-[#202124] hover:bg-[#F3F4F4] border border-[#E4E5E7]"
              }`}
            >
              International ({counts.international})
            </button>
          </div>

          {/* Search Controls */}
          <div className="mt-6 max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#70757A] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search destinations (e.g. Munnar, Bali, Paris, Kashmir...)"
                className="w-full pl-11 pr-4 py-3 rounded-full bg-white border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/60 text-xs sm:text-sm focus:border-[#24292F] focus:outline-none shadow-sm transition-all"
              />
            </div>
            {countries.length > 2 && (
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="px-4 py-3 rounded-full bg-white border border-[#E4E5E7] text-[#202124] text-xs sm:text-sm focus:border-[#24292F] focus:outline-none shadow-sm transition-all"
              >
                <option value="all">All Countries ({countries.length - 1})</option>
                {countries.filter((c) => c !== "all").map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </section>

      {/* Destinations Grid & Pagination */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Results Summary */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#E4E5E7] text-xs text-[#70757A]">
            <span>
              Showing <strong className="text-[#202124]">{filteredDestinations.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> to <strong className="text-[#202124]">{Math.min(currentPage * ITEMS_PER_PAGE, filteredDestinations.length)}</strong> of <strong className="text-[#202124]">{filteredDestinations.length}</strong> destinations
            </span>
            {totalPages > 1 && (
              <span>Page {currentPage} of {totalPages}</span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-96 rounded-3xl bg-[#F3F4F4] animate-pulse border border-[#E4E5E7]" />
              ))}
            </div>
          ) : filteredDestinations.length === 0 ? (
            <div className="text-center py-20 px-4 rounded-3xl border border-[#E4E5E7] bg-[#F7F7F5]">
              <Compass className="w-12 h-12 text-[#5F6368]/50 mx-auto mb-3" />
              <h3 className="text-xl font-serif font-bold text-[#202124]">No Matching Destinations Found</h3>
              <p className="text-[#70757A] text-sm mt-1 max-w-md mx-auto">
                Try refining your search keyword or switching between India Domestic and International tabs.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setClassificationTab("all");
                  setSelectedCountry("all");
                }}
                className="mt-6 inline-block px-6 py-2.5 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold shadow-xs transition-all"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {paginatedDestinations.map((dest) => (
                  <Link
                    key={dest.id}
                    href={`/destinations/${dest.slug}`}
                    className="group rounded-3xl overflow-hidden border border-[#E4E5E7] hover:border-[#24292F]/40 bg-white transition-all duration-300 flex flex-col shadow-sm hover:shadow-xl"
                  >
                    <div className="relative h-64 overflow-hidden">
                      <TravelImage
                        src={getImg(dest)}
                        alt={dest.name}
                        fallbackSlug={dest.slug}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                      <div className="absolute top-4 left-4 flex items-center gap-1.5">
                        <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-[#E4E5E7] text-[#202124] text-[11px] uppercase tracking-wider font-semibold shadow-sm">
                          {dest.country}
                        </span>
                        {dest.category && (
                          <span className="px-2.5 py-1 rounded-full bg-[#24292F]/80 backdrop-blur-md text-white text-[10px] font-medium shadow-sm">
                            {dest.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-[#70757A] mb-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-[#3D4450]" />
                          <span>{dest.region || dest.country}</span>
                        </div>
                        <h3 className="text-xl font-serif font-bold text-[#202124] group-hover:text-[#3D4450] transition-colors line-clamp-1">
                          {dest.name}
                        </h3>
                        {dest.short_description && (
                          <p className="mt-2 text-xs sm:text-sm text-[#70757A] line-clamp-2 leading-relaxed">
                            {dest.short_description}
                          </p>
                        )}
                      </div>

                      <div className="pt-4 border-t border-[#E4E5E7] flex items-center justify-between text-xs font-semibold">
                        <span className="text-[#3D4450]">
                          {dest.package_count || 1} Curated {dest.package_count === 1 ? "Trip" : "Trips"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[#202124] group-hover:text-[#3D4450] group-hover:translate-x-1 transition-all">
                          <span>Explore</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#3D4450]" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-2.5 rounded-full border border-[#E4E5E7] text-[#202124] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#F3F4F4] transition-all"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pageNum = i + 1;
                      // Display first, last, and window around current page
                      if (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                      ) {
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-9 h-9 rounded-full text-xs font-semibold transition-all ${
                              currentPage === pageNum
                                ? "bg-[#24292F] text-white shadow-xs"
                                : "text-[#70757A] hover:bg-[#F3F4F4] hover:text-[#202124]"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      if (pageNum === currentPage - 3 || pageNum === currentPage + 3) {
                        return <span key={pageNum} className="text-[#70757A] px-1">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-2.5 rounded-full border border-[#E4E5E7] text-[#202124] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#F3F4F4] transition-all"
                    aria-label="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

