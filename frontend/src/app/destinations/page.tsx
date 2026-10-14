"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Compass, Globe, MapPin, Search } from "lucide-react";
import {
  publicCatalogApi,
  type PublicDestinationListItem,
  type DestinationsPageContent,
} from "@/lib/api";
import { PublicLayout } from "@/components/public/PublicLayout";

const DESTINATION_FALLBACKS: Record<string, string> = {
  maldives: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=80",
  lakshadweep: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
  kazakhstan: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=1200&q=80",
  manali: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80",
  default: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80",
};

function DestinationsContent() {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";

  const [destinations, setDestinations] = useState<PublicDestinationListItem[]>([]);
  const [pageContent, setPageContent] = useState<DestinationsPageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");

  useEffect(() => {
    async function fetchDestinations() {
      try {
        const [data, contentRes] = await Promise.all([
          publicCatalogApi.getDestinations(),
          publicCatalogApi.getPageContent<DestinationsPageContent>("destinations", isPreview).catch(() => null),
        ]);
        setDestinations(data);
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

  const countries = useMemo(() => {
    const set = new Set<string>();
    destinations.forEach((d) => {
      if (d.country) set.add(d.country);
    });
    return ["all", ...Array.from(set)];
  }, [destinations]);

  const filteredDestinations = useMemo(() => {
    return destinations.filter((d) => {
      const matchSearch =
        search === "" ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.country.toLowerCase().includes(search.toLowerCase()) ||
        (d.short_description && d.short_description.toLowerCase().includes(search.toLowerCase()));

      const matchCountry = selectedCountry === "all" || d.country.toLowerCase() === selectedCountry.toLowerCase();
      return matchSearch && matchCountry;
    });
  }, [destinations, search, selectedCountry]);

  const getImg = (dest: PublicDestinationListItem) => {
    if (dest.featured_image?.image_url) return dest.featured_image.image_url;
    const key = Object.keys(DESTINATION_FALLBACKS).find((k) =>
      dest.slug.toLowerCase().includes(k)
    );
    return key ? DESTINATION_FALLBACKS[key] : DESTINATION_FALLBACKS.default;
  };

  const heroEyebrow = pageContent?.hero?.eyebrow || "Worldwide Catalog";
  const heroHeading = pageContent?.hero?.heading || "Destinations Beyond the Ordinary";
  const heroDescription =
    pageContent?.hero?.description ||
    "From turquoise island lagoons to dramatic mountain peaks, explore hand-selected destinations curated by KV Tours & Travels Coimbatore.";
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

          {/* Search & Country Filter Controls */}
          <div className="mt-10 max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#70757A] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search destinations (e.g. Maldives, Kazakhstan, Manali...)"
                className="w-full pl-11 pr-4 py-3 rounded-full bg-white border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/60 text-xs sm:text-sm focus:border-[#24292F] focus:outline-none shadow-sm transition-all"
              />
            </div>
            {countries.length > 2 && (
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
                {countries.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedCountry(c)}
                    className={`px-4 py-2.5 rounded-full text-xs uppercase tracking-wider font-semibold whitespace-nowrap transition-all ${
                      selectedCountry === c
                        ? "bg-[#24292F] text-white shadow-xs"
                        : "bg-white border border-[#E4E5E7] text-[#70757A] hover:text-[#202124] hover:bg-[#F3F4F4]"
                    }`}
                  >
                    {c === "all" ? "All Regions" : c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Destinations Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                We are constantly adding new locations. Tell us where you want to travel, and our team will plan it for you.
              </p>
              <Link
                href="/custom-trip"
                className="mt-6 inline-block px-6 py-2.5 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold shadow-xs transition-all"
              >
                Plan Custom Trip Instead
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredDestinations.map((dest) => (
                <Link
                  key={dest.id}
                  href={`/destinations/${dest.slug}`}
                  className="group rounded-3xl overflow-hidden border border-[#E4E5E7] hover:border-[#24292F]/40 bg-white transition-all duration-300 flex flex-col shadow-sm hover:shadow-xl"
                >
                  <div className="relative h-64 overflow-hidden">
                    <Image
                      src={getImg(dest)}
                      alt={dest.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-[#E4E5E7] text-[#202124] text-[11px] uppercase tracking-wider font-semibold shadow-sm">
                        {dest.country}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-[#70757A] mb-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#3D4450]" />
                        <span>{dest.region || dest.country}</span>
                      </div>
                      <h3 className="text-2xl font-serif font-bold text-[#202124] group-hover:text-[#3D4450] transition-colors">
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
                        {dest.package_count} Curated {dest.package_count === 1 ? "Trip" : "Trips"}
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
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

export default function DestinationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F7F5]" />}>
      <DestinationsContent />
    </Suspense>
  );
}

