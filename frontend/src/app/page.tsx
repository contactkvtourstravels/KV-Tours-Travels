"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Globe,
  MapPin,
  MessageCircle,
  Palmtree,
  Plane,
  ShieldCheck,
  Sparkles,
  Sunrise,
  Users,
  Sparkle,
} from "lucide-react";
import {
  publicCatalogApi,
  type PublicDepartureListItem,
  type PublicDestinationListItem,
  type PublicPackageListItem,
  type PublicSiteSettings,
  type HomePageContent,
} from "@/lib/api";
import { getWhatsAppClickToChatUrl } from "@/lib/constants";
import { getSafeImageUrl, getDestinationFallback, DESTINATION_FALLBACKS } from "@/lib/images";
import { TravelImage } from "@/components/public/TravelImage";
import { PublicLayout } from "@/components/public/PublicLayout";
import { QuickInquiryModal } from "@/components/public/QuickInquiryModal";
import { BestOffersSection } from "@/components/public/BestOffersSection";

function HomeContent() {
  const searchParams = useSearchParams();
  const isPreview = searchParams?.get("preview") === "true";

  const [destinations, setDestinations] = useState<PublicDestinationListItem[]>([]);
  const [packages, setPackages] = useState<PublicPackageListItem[]>([]);
  const [departures, setDepartures] = useState<PublicDepartureListItem[]>([]);
  const [settings, setSettings] = useState<PublicSiteSettings | null>(null);
  const [pageContent, setPageContent] = useState<HomePageContent | null>(null);
  const [loading, setLoading] = useState(true);

  // Trending Destinations Category Filter ("international" | "domestic")
  const [destFilter, setDestFilter] = useState<"international" | "domestic">("domestic");

  // Carousel scroll ref and state
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Quick Inquiry Modal state
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [destsRes, pkgsRes, depsRes, setsRes, contentRes] = await Promise.allSettled([
          publicCatalogApi.getDestinations(),
          publicCatalogApi.getPackages(),
          publicCatalogApi.getAllDepartures(),
          publicCatalogApi.getSettings(),
          publicCatalogApi.getPageContent<HomePageContent>("home", isPreview),
        ]);

        if (destsRes.status === "fulfilled") setDestinations(destsRes.value);
        if (pkgsRes.status === "fulfilled") setPackages(pkgsRes.value);
        if (depsRes.status === "fulfilled") setDepartures(depsRes.value);
        if (setsRes.status === "fulfilled") setSettings(setsRes.value);
        if (contentRes.status === "fulfilled" && contentRes.value?.content) {
          setPageContent(contentRes.value.content);
        }
      } catch {
        // Fallbacks handled gracefully
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isPreview]);

  // Synchronize dynamic SEO metadata from authoritative pageContent or site settings
  useEffect(() => {
    if (pageContent?.seo_title) {
      document.title = pageContent.seo_title;
    } else if (settings?.seo_website_title) {
      document.title = settings.seo_website_title;
    }
    if (pageContent?.seo_meta_description) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute("content", pageContent.seo_meta_description);
      }
    }
  }, [pageContent, settings]);

  const waUrl = getWhatsAppClickToChatUrl(
    settings?.whatsapp_number,
    `Hi ${settings?.public_display_name || "The Wild Root"} ${settings?.city || "Palakkad"}, I am looking to plan a holiday journey. Please assist me.`
  );

  const getDestinationImg = (dest: PublicDestinationListItem) => {
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

  const getPackageImg = (pkg: PublicPackageListItem) => {
    let raw = "";
    if (pkg.cover_image_url) raw = pkg.cover_image_url;
    else if (pkg.featured_image?.image_url) raw = pkg.featured_image.image_url;
    else {
      const key = Object.keys(DESTINATION_FALLBACKS).find(
        (k) =>
          pkg.slug.toLowerCase().includes(k) ||
          pkg.destination_slug.toLowerCase().includes(k)
      );
      raw = key ? DESTINATION_FALLBACKS[key] : DESTINATION_FALLBACKS.default;
    }
    return getSafeImageUrl(raw);
  };

  // Filter destinations based on International vs India & Around
  const isIndia = (d: PublicDestinationListItem) =>
    d.country.toLowerCase().includes("india") ||
    d.country.toLowerCase().includes("domestic");

  // Prioritize featured destinations configured in Main Website / Settings
  const featuredDestIds =
    pageContent?.featured_content?.featured_destination_ids ||
    settings?.featured_destination_ids ||
    [];

  const sortedDestinations = useMemo(() => {
    if (!featuredDestIds || featuredDestIds.length === 0) return destinations;
    return [...destinations].sort((a, b) => {
      const idxA = featuredDestIds.indexOf(a.id);
      const idxB = featuredDestIds.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });
  }, [destinations, featuredDestIds]);

  const filteredDestinations = sortedDestinations.filter((d) =>
    destFilter === "domestic" ? isIndia(d) : !isIndia(d)
  );

  const carouselDestinations = useMemo(() => {
    return filteredDestinations.slice(0, 16);
  }, [filteredDestinations]);

  // Prioritize featured travel packages configured in Main Website / Settings
  const featuredPkgIds =
    pageContent?.featured_content?.featured_package_ids ||
    settings?.featured_package_ids ||
    [];

  const displayedPackages = useMemo(() => {
    if (!featuredPkgIds || featuredPkgIds.length === 0) {
      return packages.slice(0, 6);
    }
    const featuredList = featuredPkgIds
      .map((id) => packages.find((p) => p.id === id))
      .filter((p): p is PublicPackageListItem => Boolean(p));
    const remainder = packages.filter((p) => !featuredPkgIds.includes(p.id));
    return [...featuredList, ...remainder].slice(0, 6);
  }, [packages, featuredPkgIds]);

  // Carousel navigation controls
  const handleScrollUpdate = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const scrollAmount = 360;
    carouselRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const handleTabChange = (tab: "international" | "domestic") => {
    setDestFilter(tab);
    if (carouselRef.current) {
      carouselRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  };

  const showTrendingDestinations = pageContent?.sections_visibility?.trending_destinations ?? true;
  const bestOffersEnabled =
    pageContent?.featured_content?.best_offers_enabled ??
    settings?.best_offers_enabled ??
    true;
  const showBestOffers =
    (pageContent?.sections_visibility?.best_offers ?? true) && bestOffersEnabled;
  const showFeaturedPackages = pageContent?.sections_visibility?.featured_packages ?? true;
  const showTravelInspirations = pageContent?.sections_visibility?.travel_inspirations ?? true;
  const showUpcomingDepartures = pageContent?.sections_visibility?.upcoming_departures ?? true;
  const showCustomCta = pageContent?.sections_visibility?.custom_cta ?? true;

  // Authoritative section ordering derived from CMS page content
  const sectionOrderMap: Record<string, number> = useMemo(() => {
    const defaultOrder = [
      "trending_destinations",
      "best_offers",
      "featured_packages",
      "travel_inspirations",
      "upcoming_departures",
      "custom_cta",
    ];
    const order =
      pageContent?.sections_order && pageContent.sections_order.length > 0
        ? pageContent.sections_order
        : defaultOrder;
    const map: Record<string, number> = {};
    order.forEach((key, idx) => {
      map[key] = idx;
    });
    defaultOrder.forEach((key, idx) => {
      if (map[key] === undefined) {
        map[key] = order.length + idx;
      }
    });
    return map;
  }, [pageContent]);

  // Computed hero elements - empty fields stay empty and hide corresponding elements
  const popularTags = useMemo(() => {
    return (pageContent?.hero?.popular_tags || []).filter(
      (t) => typeof t === "string" && t.trim().length > 0
    );
  }, [pageContent?.hero?.popular_tags]);

  const primaryCtaText = pageContent?.hero?.primary_cta_text?.trim();
  const secondaryCtaText = pageContent?.hero?.secondary_cta_text?.trim();
  const whatsappCtaText = pageContent?.hero?.whatsapp_cta_text?.trim();
  const hasPrimaryCta = Boolean(primaryCtaText);
  const hasSecondaryCta = Boolean(secondaryCtaText);
  const hasWhatsappCta = Boolean(whatsappCtaText) && settings?.whatsapp_enabled !== false;
  const hasAnyCta = hasPrimaryCta || hasSecondaryCta || hasWhatsappCta;

  const activeTrustBadges = useMemo(() => {
    return (pageContent?.trust_indicators || []).filter(
      (ind) => typeof ind?.label === "string" && ind.label.trim().length > 0
    );
  }, [pageContent?.trust_indicators]);

  return (
    <PublicLayout transparentHeader>
      {/* =========================================================================
          1. CINEMATIC HERO SECTION
         ========================================================================= */}
      <section className="relative min-h-[96vh] flex items-center justify-center overflow-hidden bg-black">
        {/* Cinematic Backdrop Image / Video Asset */}
        <div className="absolute inset-0 z-0">
          {pageContent?.hero?.media_type === "video" && pageContent.hero.video_url ? (
            <video
              src={pageContent.hero.video_url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <Image
              src={getSafeImageUrl(pageContent?.hero?.image_url, "/images/hero/hero-4k.webp")}
              alt="KV Tours & Travels luxury destination escape"
              fill
              priority
              quality={90}
              sizes="100vw"
              className="object-cover object-center"
            />
          )}
          {/* Balanced cinematic overlay for pristine text readability without darkening scenic beauty */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black/75" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04)_0%,transparent_75%)] pointer-events-none" />
        </div>

        {/* Promotional Announcement Banner if enabled in admin settings or page content */}
        {((pageContent?.featured_content?.promo_banner_active ?? settings?.promo_banner_active) &&
          (pageContent?.featured_content?.promo_banner_text || settings?.promo_banner_text)) && (
          <div className="absolute top-20 left-0 right-0 z-20 bg-[#DFBA73] text-[#202124] py-2 px-4 text-center text-xs font-bold tracking-wide flex items-center justify-center gap-2 shadow-md">
            <span>{pageContent?.featured_content?.promo_banner_text || settings?.promo_banner_text}</span>
            {(pageContent?.featured_content?.promo_banner_link || settings?.promo_banner_link) && (
              <Link
                href={pageContent?.featured_content?.promo_banner_link || settings?.promo_banner_link || "/offers"}
                className="underline hover:text-black font-semibold text-[11px]"
              >
                Explore Offer &rarr;
              </Link>
            )}
          </div>
        )}

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-28 pb-20">
          {/* Trust Badge / Eyebrow */}
          {pageContent?.hero?.eyebrow?.trim() ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-white/20 bg-black/45 backdrop-blur-md mb-6 shadow-xl">
                <span className="w-2 h-2 rounded-full bg-[#DFBA73] animate-pulse" />
                <span className="text-[#F3E8D6] text-[11px] uppercase tracking-[0.24em] font-semibold">
                  {pageContent.hero.eyebrow}
                </span>
              </div>
            </motion.div>
          ) : null}

          {/* Hero Heading */}
          {pageContent?.hero?.heading?.trim() ? (
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl sm:text-6xl lg:text-7xl font-serif font-bold text-white tracking-tight leading-[1.1] max-w-4xl mx-auto drop-shadow-[0_4px_24px_rgba(0,0,0,0.65)]"
            >
              {pageContent.hero.heading}
            </motion.h1>
          ) : null}

          {/* Hero Description */}
          {pageContent?.hero?.description?.trim() ? (
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-6 text-base sm:text-lg text-white/90 font-light max-w-2xl mx-auto leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]"
            >
              {pageContent.hero.description}
            </motion.p>
          ) : null}

          {/* Quick Destination Pill Tags */}
          {popularTags.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 text-xs tracking-wider"
            >
              <span className="text-white/80 font-medium text-xs uppercase tracking-widest mr-1">
                Popular Escapes:
              </span>
              {popularTags.map((item) => (
                <Link
                  key={item}
                  href={`/destinations?search=${encodeURIComponent(item)}`}
                  className="px-3.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/90 border border-white/15 hover:border-[#DFBA73]/60 transition-all backdrop-blur-sm text-xs font-medium"
                >
                  {item}
                </Link>
              ))}
            </motion.div>
          ) : null}

          {/* Action CTAs */}
          {hasAnyCta ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5"
            >
              {hasPrimaryCta && (
                <Link
                  href={pageContent?.hero?.primary_cta_link?.trim() || "/packages"}
                  className="w-full sm:w-auto h-12 px-8 rounded-full bg-[#DFBA73] hover:bg-[#C5A880] text-[#1B1E22] text-xs uppercase tracking-widest font-bold shadow-lg shadow-black/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-[#DFBA73]/80"
                >
                  <Compass className="w-4 h-4 text-[#1B1E22]" />
                  <span>{primaryCtaText}</span>
                </Link>
              )}

              {hasSecondaryCta && (
                <Link
                  href={pageContent?.hero?.secondary_cta_link?.trim() || "/custom-trip"}
                  className="w-full sm:w-auto h-12 px-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 text-white text-xs uppercase tracking-widest font-semibold backdrop-blur-sm hover:border-white/60 transition-all flex items-center justify-center gap-2"
                >
                  <span>{secondaryCtaText}</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </Link>
              )}

              {hasWhatsappCta && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto h-12 px-6 rounded-full border border-[#A7E2CB]/50 bg-[#0D7A53]/30 hover:bg-[#0D7A53]/45 text-[#A7E2CB] text-xs uppercase tracking-widest font-semibold backdrop-blur-sm transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{whatsappCtaText}</span>
                </a>
              )}
            </motion.div>
          ) : null}
        </div>

        {/* Minimal Bottom Floating Indicators */}
        {activeTrustBadges.length > 0 ? (
          <div className="absolute bottom-6 left-0 right-0 hidden md:flex items-center justify-center gap-12 text-xs uppercase tracking-widest text-white/70 z-10 border-t border-white/10 pt-4 max-w-4xl mx-auto">
            {activeTrustBadges.map((ind, idx) => {
              const Icon =
                ind.icon === "ShieldCheck" ? ShieldCheck : ind.icon === "Plane" ? Plane : Sparkles;
              return (
                <div key={idx} className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[#DFBA73]" />
                  <span>{ind.label}</span>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>


      {/* =========================================================================
          DYNAMIC HOMEPAGE CONTENT SECTIONS (Rendered according to sections_order)
         ========================================================================= */}
      <div className="flex flex-col w-full">
        {/* 2. TRENDING DESTINATIONS CAROUSEL */}
        {showTrendingDestinations && (
        <section
          style={{ order: sectionOrderMap["trending_destinations"] }}
          className="py-24 bg-white border-b border-[#E5E7EB] relative overflow-hidden w-full"
        >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 text-[#C5A880] text-xs uppercase tracking-[0.24em] font-semibold mb-2">
                <Globe className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Discover The World With KV Tours</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#202124] tracking-tight">
                Trending Destinations
              </h2>
              <p className="text-[#5F6368] text-sm mt-2 max-w-xl font-light">
                Handcrafted international gateways and captivating Indian landscapes curated for discerning travelers.
              </p>
            </div>

            {/* Carousel Arrow Controls & View All */}
            <div className="flex items-center gap-3">
              <Link
                href="/destinations"
                className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#E5E7EB] hover:border-[#202124] text-xs uppercase tracking-wider font-semibold text-[#202124] hover:bg-[#F7F7F5] transition-all"
              >
                <span>Explore Destinations</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              {/* Prev / Next Circular Arrows */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollCarousel("left")}
                  disabled={!canScrollLeft}
                  aria-label="Previous destination"
                  className="w-11 h-11 rounded-full border border-[#E5E7EB] bg-white hover:bg-[#F7F7F5] hover:border-[#C5A880] text-[#202124] disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-sm active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCarousel("right")}
                  disabled={!canScrollRight}
                  aria-label="Next destination"
                  className="w-11 h-11 rounded-full border border-[#E5E7EB] bg-white hover:bg-[#F7F7F5] hover:border-[#C5A880] text-[#202124] disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-sm active:scale-95"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Category Toggle Tabs: "International" | "India & Around" */}
          <div className="flex items-center gap-2 mb-8 border-b border-[#E5E7EB] pb-3">
            <button
              type="button"
              onClick={() => handleTabChange("international")}
              className={`px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-semibold transition-all relative ${
                destFilter === "international"
                  ? "bg-[#202124] text-white shadow-md"
                  : "bg-[#F7F7F5] text-[#5F6368] hover:text-[#202124] hover:bg-[#EFEFEA]"
              }`}
            >
              <span>International</span>
              {destFilter === "international" && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-[#DFBA73] text-[#1B1E22] font-bold">
                  {destinations.filter((d) => !isIndia(d)).length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("domestic")}
              className={`px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-semibold transition-all relative ${
                destFilter === "domestic"
                  ? "bg-[#202124] text-white shadow-md"
                  : "bg-[#F7F7F5] text-[#5F6368] hover:text-[#202124] hover:bg-[#EFEFEA]"
              }`}
            >
              <span>India & Around</span>
              {destFilter === "domestic" && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-[#DFBA73] text-[#1B1E22] font-bold">
                  {destinations.filter((d) => isIndia(d)).length}
                </span>
              )}
            </button>
          </div>

          {/* Carousel Slider */}
          {loading ? (
            <div className="flex gap-6 overflow-hidden py-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-[320px] h-[480px] rounded-3xl bg-[#F7F7F5] animate-pulse shrink-0 border border-[#E5E7EB]"
                />
              ))}
            </div>
          ) : filteredDestinations.length === 0 ? (
            <div className="text-center py-16 px-6 rounded-3xl border border-[#E5E7EB] bg-[#F7F7F5] max-w-2xl mx-auto">
              <Compass className="w-10 h-10 text-[#C5A880] mx-auto mb-3" />
              <h3 className="text-lg font-serif font-semibold text-[#202124]">
                Itineraries Being Curated
              </h3>
              <p className="text-[#5F6368] text-sm mt-1">
                Our destination specialists in {settings?.city || "Palakkad"} are currently scheduling new departures for this category. Contact our concierge for bespoke planning.
              </p>
              <Link
                href="/contact"
                className="mt-6 inline-block px-6 py-2.5 rounded-full border border-[#202124] bg-white text-[#202124] hover:bg-[#202124] hover:text-white transition-all text-xs uppercase tracking-widest font-semibold"
              >
                Contact Concierge
              </Link>
            </div>
          ) : (
            <div
              ref={carouselRef}
              onScroll={handleScrollUpdate}
              className="flex gap-6 overflow-x-auto scrollbar-none scroll-smooth pb-4 pt-1 snap-x snap-mandatory"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {carouselDestinations.map((dest) => (
                <Link
                  key={dest.id}
                  href={`/destinations/${dest.slug}`}
                  className="group relative w-[290px] sm:w-[330px] md:w-[350px] h-[470px] sm:h-[490px] rounded-3xl shrink-0 overflow-hidden border border-[#E5E7EB] hover:border-[#C5A880]/70 transition-all duration-500 flex flex-col justify-between p-6 shadow-sm hover:shadow-2xl bg-[#202124] snap-start cursor-pointer"
                >
                  {/* Destination Cover Image */}
                  <TravelImage
                    src={getDestinationImg(dest)}
                    alt={dest.name}
                    fill
                    fallbackSlug={dest.slug}
                    sizes="(max-width: 768px) 290px, (max-width: 1200px) 330px, 350px"
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  />
                  {/* Subtle Dark Vignette Overlay for Readable Contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/20 group-hover:from-black/95 transition-colors duration-500" />

                  {/* Top Badges */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white/95 text-[11px] uppercase tracking-wider font-semibold">
                      {dest.country}
                    </span>
                    {dest.package_count > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-[#DFBA73]/90 text-[#1B1E22] text-[10px] uppercase tracking-wider font-bold">
                        {dest.package_count} {dest.package_count === 1 ? "Trip" : "Trips"}
                      </span>
                    )}
                  </div>

                  {/* Bottom Content Info */}
                  <div className="relative z-10">
                    {dest.region && (
                      <span className="text-[11px] uppercase tracking-widest text-[#DFBA73] font-semibold block mb-1">
                        {dest.region}
                      </span>
                    )}
                    <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white group-hover:text-[#F3E8D6] transition-colors leading-tight">
                      {dest.name}
                    </h3>
                    {dest.short_description && (
                      <p className="text-white/80 text-xs mt-2 line-clamp-2 font-light leading-relaxed">
                        {dest.short_description}
                      </p>
                    )}

                    {/* Interactive Action Bar */}
                    <div className="mt-5 pt-3.5 border-t border-white/15 flex items-center justify-between text-xs text-[#DFBA73] font-semibold">
                      <span>View Itineraries</span>
                      <span className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-[#DFBA73] text-white group-hover:text-[#1B1E22] flex items-center justify-center transition-all group-hover:translate-x-1">
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Mobile Explore Destinations Button */}
          <div className="mt-6 text-center sm:hidden">
            <Link
              href="/destinations"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#202124] text-white text-xs uppercase tracking-wider font-semibold w-full justify-center shadow-md"
            >
              <span>Explore All Destinations</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
      )}

        {/* 3. BEST PROMOTIONAL OFFERS SHOWCASE */}
        {showBestOffers && (
          <div style={{ order: sectionOrderMap["best_offers"] }} className="w-full">
            <BestOffersSection />
          </div>
        )}

        {/* 4. FEATURED TRAVEL PACKAGES SECTION */}
        {showFeaturedPackages && (
        <section
          style={{ order: sectionOrderMap["featured_packages"] }}
          className="py-24 bg-[#F7F7F5] border-b border-[#E5E7EB] relative w-full"
        >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 text-[#C5A880] text-xs uppercase tracking-[0.24em] font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Handcrafted Luxury & Adventure</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#202124] tracking-tight">
                Featured Travel Packages
              </h2>
              <p className="text-[#5F6368] text-sm mt-2 max-w-xl font-light">
                Complete all-inclusive vacation journeys with private transfers, verified boutique stays, and curated excursions.
              </p>
            </div>
            <Link
              href="/packages"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-[#202124] text-xs uppercase tracking-widest font-semibold text-[#202124] hover:bg-[#202124] hover:text-white transition-all self-start md:self-auto"
            >
              <span>View All Packages</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[460px] rounded-3xl bg-white animate-pulse border border-[#E5E7EB]"
                />
              ))}
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-16 px-6 rounded-3xl border border-[#E5E7EB] bg-white max-w-2xl mx-auto">
              <Plane className="w-10 h-10 text-[#C5A880] mx-auto mb-3" />
              <h3 className="text-xl font-serif font-semibold text-[#202124]">
                New Packages Being Published
              </h3>
              <p className="text-[#5F6368] text-sm mt-1">
                Tell us your desired holiday destination and travel dates to receive an instant bespoke quote.
              </p>
              <button
                type="button"
                onClick={() => setInquiryModalOpen(true)}
                className="mt-6 px-6 py-2.5 rounded-full bg-[#202124] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold transition-all shadow-md"
              >
                Enquire Custom Journey
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayedPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="group rounded-3xl overflow-hidden bg-white border border-[#E5E7EB] hover:border-[#C5A880]/70 transition-all duration-300 flex flex-col shadow-sm hover:shadow-xl"
                >
                  {/* Package Cover Image */}
                  <div className="relative h-64 overflow-hidden">
                    <TravelImage
                      src={getPackageImg(pkg)}
                      alt={pkg.name}
                      fill
                      fallbackSlug={pkg.slug || pkg.destination_slug}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />

                    {/* Destination Badge */}
                    <div className="absolute top-4 left-4">
                      <span className="px-3.5 py-1 rounded-full bg-white/95 backdrop-blur-md border border-[#E5E7EB] text-[#202124] text-[11px] uppercase tracking-wider font-semibold shadow-sm">
                        {pkg.destination_name}
                      </span>
                    </div>

                    {/* Duration & Minimum Travellers */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white">
                      <span className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-sm">
                        <Clock className="w-3.5 h-3.5 text-[#DFBA73]" />
                        {pkg.duration_days}D / {pkg.duration_nights}N
                      </span>
                      <span className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-sm">
                        <Users className="w-3.5 h-3.5 text-[#DFBA73]" />
                        Min {pkg.minimum_travellers}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-xl font-serif font-bold text-[#202124] group-hover:text-[#C5A880] transition-colors line-clamp-2">
                        {pkg.name}
                      </h3>
                      <p className="text-[#5F6368] text-xs mt-2 line-clamp-2 font-light">
                        Curated journey in {pkg.destination_name} featuring verified accommodations, sightseeing, and private transfers.
                      </p>

                      {/* Authoritative Pricing */}
                      <div className="mt-4 pt-4 border-t border-[#E5E7EB] flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-[#5F6368] block font-medium">
                            Starting from
                          </span>
                          <span className="text-2xl font-serif font-bold text-[#202124]">
                            ₹{Number(pkg.base_price).toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-[#5F6368] ml-1">/ person</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex items-center gap-2.5">
                      <Link
                        href={`/packages/${pkg.slug}`}
                        className="flex-1 h-10 rounded-full bg-[#F7F7F5] hover:bg-[#EFEFEA] border border-[#E5E7EB] text-[#202124] text-xs uppercase tracking-widest font-semibold flex items-center justify-center transition-all"
                      >
                        View Details
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPkg({ id: pkg.id, name: pkg.name });
                          setInquiryModalOpen(true);
                        }}
                        className="h-10 px-5 rounded-full bg-[#202124] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold transition-all shadow-sm"
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
      )}

        {/* 5. TRAVEL INSPIRATION & EDITORIAL DISCOVERY GRID */}
        {showTravelInspirations && (
        <section
          style={{ order: sectionOrderMap["travel_inspirations"] }}
          className="py-24 bg-white border-b border-[#E5E7EB] relative w-full"
        >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 text-[#C5A880] text-xs uppercase tracking-[0.24em] font-semibold mb-2">
              <Compass className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Travel By Theme & Experience</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#202124] tracking-tight">
              Curated Travel Inspirations
            </h2>
            <p className="text-[#5F6368] text-sm sm:text-base mt-3 font-light leading-relaxed">
              Whether you seek spiritual awakening, secluded tropical serenity, or a bespoke itinerary crafted from scratch, explore signature travel themes curated by our specialists.
            </p>
          </div>

          {/* Asymmetric / Bento Editorial Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Spiritual Journeys (Hero / Wide Card) */}
            <div className="md:col-span-2 relative min-h-[380px] rounded-3xl overflow-hidden group border border-[#E5E7EB] hover:border-[#C5A880]/70 transition-all duration-500 flex flex-col justify-end p-8 bg-[#202124] shadow-sm hover:shadow-xl">
              <TravelImage
                src="https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1600&q=80"
                alt="Sacred Varanasi ghats and temple heritage"
                fill
                fallbackSlug="varanasi"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 66vw"
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

              <div className="relative z-10 max-w-xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DFBA73] text-[#1B1E22] text-[11px] uppercase tracking-wider font-bold mb-3 shadow-md">
                  <Sunrise className="w-3.5 h-3.5" />
                  Cultural Heritage
                </span>
                <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white group-hover:text-[#F3E8D6] transition-colors">
                  Spiritual Journeys
                </h3>
                <p className="text-white/85 text-xs sm:text-sm mt-2 leading-relaxed font-light">
                  Ancient temple architecture, sacred Ganges evening Aarti rituals, and peaceful meditation retreats from Varanasi to Rameshwaram.
                </p>
                <div className="mt-5 flex items-center gap-4">
                  <Link
                    href="/destinations/varanasi"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-[#202124] hover:bg-[#DFBA73] hover:text-[#1B1E22] text-xs uppercase tracking-wider font-semibold transition-all shadow-md"
                  >
                    <span>Explore Spiritual Tours</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href="/custom-trip?destination=Spiritual%20Journeys"
                    className="text-xs uppercase tracking-wider font-semibold text-white/90 hover:text-[#DFBA73] transition-colors"
                  >
                    Plan Custom Pilgrimage
                  </Link>
                </div>
              </div>
            </div>

            {/* Card 2: Beach Escapes */}
            <div className="relative min-h-[380px] rounded-3xl overflow-hidden group border border-[#E5E7EB] hover:border-[#C5A880]/70 transition-all duration-500 flex flex-col justify-end p-8 bg-[#202124] shadow-sm hover:shadow-xl">
              <TravelImage
                src="https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=80"
                alt="Tropical overwater bungalow beach escape"
                fill
                fallbackSlug="maldives"
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

              <div className="relative z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DFBA73] text-[#1B1E22] text-[11px] uppercase tracking-wider font-bold mb-3 shadow-md">
                  <Palmtree className="w-3.5 h-3.5" />
                  Coastal Serenity
                </span>
                <h3 className="text-2xl font-serif font-bold text-white group-hover:text-[#F3E8D6] transition-colors">
                  Beach Escapes
                </h3>
                <p className="text-white/85 text-xs mt-2 leading-relaxed font-light">
                  Crystal azure lagoons, private overwater villas, and barefoot tropical luxury in the Maldives, Lakshadweep, and Andaman.
                </p>
                <div className="mt-5">
                  <Link
                    href="/destinations/maldives"
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white text-[#202124] hover:bg-[#DFBA73] hover:text-[#1B1E22] text-xs uppercase tracking-wider font-semibold transition-all shadow-md"
                  >
                    <span>Discover Beaches</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Card 3: Japan Experiences */}
            <div className="relative min-h-[360px] rounded-3xl overflow-hidden group border border-[#E5E7EB] hover:border-[#C5A880]/70 transition-all duration-500 flex flex-col justify-end p-8 bg-[#202124] shadow-sm hover:shadow-xl">
              <TravelImage
                src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80"
                alt="Mount Fuji and Japanese cultural pagoda"
                fill
                fallbackSlug="japan"
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

              <div className="relative z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DFBA73] text-[#1B1E22] text-[11px] uppercase tracking-wider font-bold mb-3 shadow-md">
                  <Globe className="w-3.5 h-3.5" />
                  Asia Cultural
                </span>
                <h3 className="text-2xl font-serif font-bold text-white group-hover:text-[#F3E8D6] transition-colors">
                  Japan Experiences
                </h3>
                <p className="text-white/85 text-xs mt-2 leading-relaxed font-light">
                  Historic Kyoto shrines, Mount Fuji vistas, bullet train journeys, and seasonal cherry blossom avenues.
                </p>
                <div className="mt-5">
                  <Link
                    href="/destinations/japan"
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white text-[#202124] hover:bg-[#DFBA73] hover:text-[#1B1E22] text-xs uppercase tracking-wider font-semibold transition-all shadow-md"
                  >
                    <span>Explore Japan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Card 4: Escorted Group Tours */}
            <div className="relative min-h-[360px] rounded-3xl overflow-hidden group border border-[#E5E7EB] hover:border-[#C5A880]/70 transition-all duration-500 flex flex-col justify-end p-8 bg-[#202124] shadow-sm hover:shadow-xl">
              <TravelImage
                src="https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&w=1200&q=80"
                alt="Group travellers enjoying mountain adventure"
                fill
                fallbackSlug="manali"
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

              <div className="relative z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DFBA73] text-[#1B1E22] text-[11px] uppercase tracking-wider font-bold mb-3 shadow-md">
                  <Users className="w-3.5 h-3.5" />
                  Fixed Departures
                </span>
                <h3 className="text-2xl font-serif font-bold text-white group-hover:text-[#F3E8D6] transition-colors">
                  Escorted Group Tours
                </h3>
                <p className="text-white/85 text-xs mt-2 leading-relaxed font-light">
                  Travel with like-minded explorers on curated group dates with verified tour directors and group pricing.
                </p>
                <div className="mt-5">
                  <Link
                    href="/group-trips"
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white text-[#202124] hover:bg-[#DFBA73] hover:text-[#1B1E22] text-xs uppercase tracking-wider font-semibold transition-all shadow-md"
                  >
                    <span>View Group Departures</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Card 5: Build Your Own Itinerary (Interactive Bespoke Card) */}
            <div className="rounded-3xl p-8 bg-gradient-to-br from-[#202124] via-[#2A2E36] to-[#1C1F24] border border-[#3D4450] text-white flex flex-col justify-between shadow-lg relative overflow-hidden group">
              {/* Subtle gold decorative glow */}
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#DFBA73]/10 rounded-full blur-2xl pointer-events-none" />

              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[#DFBA73] text-[11px] uppercase tracking-wider font-bold mb-4 backdrop-blur-sm">
                  <Sparkle className="w-3.5 h-3.5" />
                  Bespoke Planning
                </span>
                <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white leading-tight">
                  Build Your Own Itinerary
                </h3>
                <p className="text-white/80 text-xs sm:text-sm mt-3 leading-relaxed font-light">
                  Have a specific route, family celebration, or custom dates? Our {settings?.city || "Palakkad"} travel specialists customize every detail.
                </p>

                <div className="mt-6 space-y-2 text-xs text-white/90">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-[#DFBA73]" />
                    <span>Personalized resort selection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-[#DFBA73]" />
                    <span>Private airport & speedboat transfers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-[#DFBA73]" />
                    <span>Dedicated WhatsApp travel coordinator</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-white/15">
                <Link
                  href="/custom-trip"
                  className="w-full h-11 rounded-full bg-[#DFBA73] hover:bg-[#C5A880] text-[#1B1E22] text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                >
                  <span>Start Custom Plan</span>
                  <ArrowRight className="w-4 h-4 text-[#1B1E22]" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

        {/* 6. UPCOMING GROUP DEPARTURES */}
        {showUpcomingDepartures && departures.length > 0 && (
          <section
            style={{ order: sectionOrderMap["upcoming_departures"] }}
            className="py-24 bg-[#F7F7F5] border-b border-[#E5E7EB] relative w-full"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 text-[#C5A880] text-xs uppercase tracking-[0.24em] font-semibold mb-2">
                    <Calendar className="w-3.5 h-3.5 text-[#C5A880]" />
                    <span>Fixed Dates & Escorted Travel</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#202124] tracking-tight">
                    Upcoming Group Journeys
                  </h2>
                  <p className="text-[#5F6368] text-sm mt-2 max-w-xl font-light">
                    Lock in guaranteed departure dates with limited group capacity and verified tour management.
                  </p>
                </div>
                <Link
                  href="/group-trips"
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-[#202124] hover:text-[#C5A880] transition-colors"
                >
                  <span>Explore All Departures</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {departures.slice(0, 3).map((dep) => {
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

                  return (
                    <div
                      key={dep.id}
                      className="p-4 sm:p-6 rounded-3xl bg-white border border-[#E5E7EB] hover:border-[#C5A880]/70 transition-all flex flex-col justify-between shadow-sm hover:shadow-xl"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs mb-3 gap-2">
                          <span className="px-2.5 sm:px-3 py-1 rounded-full bg-[#F7F7F5] border border-[#E5E7EB] text-[#202124] uppercase tracking-wider font-semibold truncate max-w-[150px] sm:max-w-none">
                            {dep.destination_name}
                          </span>
                          <span className="text-[#C5A880] flex items-center gap-1 font-semibold text-xs shrink-0">
                            <Users className="w-3.5 h-3.5 text-[#C5A880]" />
                            {dep.available_capacity} seats left
                          </span>
                        </div>

                        <h3 className="text-lg font-serif font-bold text-[#202124] line-clamp-2">
                          {dep.package_name}
                        </h3>

                        {/* Dates row */}
                        <div className="mt-4 p-3.5 rounded-2xl bg-[#F7F7F5] border border-[#E5E7EB] space-y-1.5 text-xs">
                          <div className="flex items-center justify-between text-[#202124] gap-2">
                            <span className="text-[#5F6368] shrink-0">Departure:</span>
                            <span className="font-semibold truncate text-right">{depDate}</span>
                          </div>
                          {retDate && (
                            <div className="flex items-center justify-between text-[#202124] gap-2">
                              <span className="text-[#5F6368] shrink-0">Return:</span>
                              <span className="font-semibold truncate text-right">{retDate}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-[#202124] gap-2">
                            <span className="text-[#5F6368] shrink-0">Duration:</span>
                            <span className="font-semibold text-[#202124]">
                              {dep.duration_days}D / {dep.duration_nights}N
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-[#E5E7EB] flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase text-[#5F6368] block font-medium">
                            Package Price
                          </span>
                          <span className="text-lg sm:text-xl font-serif font-bold text-[#202124] truncate block">
                            ₹{Number(price).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <Link
                          href={`/packages/${dep.package_slug}`}
                          className="h-9 px-3.5 sm:px-4 rounded-full bg-[#202124] hover:bg-[#3D4450] text-white text-xs uppercase tracking-wider font-semibold flex items-center justify-center transition-all shadow-sm shrink-0 whitespace-nowrap"
                        >
                          View Trip
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* 7. CUSTOM ITINERARY CALL-TO-ACTION */}
        {showCustomCta && (
        <section
          style={{ order: sectionOrderMap["custom_cta"] }}
          className="py-24 bg-white border-b border-[#E5E7EB] relative w-full"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-[#E5E7EB] bg-[#F7F7F5] p-8 sm:p-14 relative overflow-hidden shadow-lg">
              {/* Subtle champagne accent glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#DFBA73]/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-2xl">
                <span className="text-[#C5A880] text-xs uppercase tracking-[0.24em] font-semibold block mb-3">
                  Bespoke Travel Concierge
                </span>
                <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#202124] tracking-tight">
                  Your Trip. <span className="text-[#C5A880] italic font-normal">Your Way.</span>
                </h2>
                <p className="mt-4 text-[#5F6368] text-sm sm:text-base leading-relaxed font-light">
                  No rigid schedules or cookie-cutter templates. Whether you are designing an intimate honeymoon in the Maldives, an adventurous expedition through Kazakhstan, or a private family retreat to Manali, our {settings?.city || "Palakkad"} concierge crafts an itinerary tailored entirely to your desires.
                </p>

                {/* 4 Pillars of Custom Planning */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-[#E5E7EB] text-xs">
                  <div>
                    <span className="text-[#202124] font-serif font-bold text-sm block">01. Dream</span>
                    <span className="text-[#5F6368] text-[11px]">Share your vision & budget</span>
                  </div>
                  <div>
                    <span className="text-[#202124] font-serif font-bold text-sm block">02. Curate</span>
                    <span className="text-[#5F6368] text-[11px]">Handpicked stays & routes</span>
                  </div>
                  <div>
                    <span className="text-[#202124] font-serif font-bold text-sm block">03. Refine</span>
                    <span className="text-[#5F6368] text-[11px]">Adjust until perfection</span>
                  </div>
                  <div>
                    <span className="text-[#202124] font-serif font-bold text-sm block">04. Embark</span>
                    <span className="text-[#5F6368] text-[11px]">Travel with full support</span>
                  </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row items-center gap-3.5">
                  <Link
                    href="/custom-trip"
                    className="w-full sm:w-auto h-12 px-8 rounded-full bg-[#202124] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold shadow-md hover:scale-[1.01] transition-all text-center flex items-center justify-center"
                  >
                    Plan My Custom Trip
                  </Link>
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto h-12 px-6 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] text-[#0D7A53] text-xs uppercase tracking-widest font-semibold hover:bg-[#DCF3EA] transition-all text-center flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Discuss on WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
        )}
      </div>



      {/* =========================================================================
          7. WHY KV TOURS (Verified Business Trust Indicators)
         ========================================================================= */}
      <section className="py-24 bg-[#F7F7F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[#C5A880] text-xs uppercase tracking-[0.24em] font-semibold block mb-2">
              The KV Standard
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#202124] tracking-tight">
              Why Travel With KV Tours?
            </h2>
            <p className="mt-4 text-[#5F6368] text-sm font-light">
              We focus on meticulous planning, genuine human support, and extraordinary travel memories.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-8 rounded-3xl bg-white border border-[#E5E7EB] hover:border-[#C5A880]/70 transition-all shadow-sm hover:shadow-md">
              <div className="w-12 h-12 rounded-2xl bg-[#F7F7F5] border border-[#E5E7EB] text-[#202124] flex items-center justify-center mb-6">
                <MapPin className="w-6 h-6 text-[#C5A880]" />
              </div>
              <h3 className="text-lg font-serif font-bold text-[#202124] mb-2">
                {settings?.city || "Palakkad"} Based
              </h3>
              <p className="text-[#5F6368] text-xs sm:text-sm leading-relaxed font-light">
                Direct, accessible travel consultations right here in {settings?.city || "Palakkad"}. You have a dedicated travel planner to coordinate your entire journey.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-[#E5E7EB] hover:border-[#C5A880]/70 transition-all shadow-sm hover:shadow-md">
              <div className="w-12 h-12 rounded-2xl bg-[#F7F7F5] border border-[#E5E7EB] text-[#202124] flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-[#C5A880]" />
              </div>
              <h3 className="text-lg font-serif font-bold text-[#202124] mb-2">
                Handpicked Stays
              </h3>
              <p className="text-[#5F6368] text-xs sm:text-sm leading-relaxed font-light">
                We partner only with vetted boutique resorts, premium hotels, and trusted local activity operators across international & domestic hubs.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-[#E5E7EB] hover:border-[#C5A880]/70 transition-all shadow-sm hover:shadow-md">
              <div className="w-12 h-12 rounded-2xl bg-[#F7F7F5] border border-[#E5E7EB] text-[#202124] flex items-center justify-center mb-6">
                <CheckCircle className="w-6 h-6 text-[#C5A880]" />
              </div>
              <h3 className="text-lg font-serif font-bold text-[#202124] mb-2">
                Complete Transparency
              </h3>
              <p className="text-[#5F6368] text-xs sm:text-sm leading-relaxed font-light">
                Clear day-by-day itineraries with explicit lists of included meals, private transfers, and activities with zero hidden surprises.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-[#E5E7EB] hover:border-[#C5A880]/70 transition-all shadow-sm hover:shadow-md">
              <div className="w-12 h-12 rounded-2xl bg-[#F7F7F5] border border-[#E5E7EB] text-[#202124] flex items-center justify-center mb-6">
                <MessageCircle className="w-6 h-6 text-[#C5A880]" />
              </div>
              <h3 className="text-lg font-serif font-bold text-[#202124] mb-2">
                Dedicated Concierge
              </h3>
              <p className="text-[#5F6368] text-xs sm:text-sm leading-relaxed font-light">
                From departure day to your safe return back home, our concierge team remains accessible on WhatsApp to ensure your vacation is seamless.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Inquiry Modal */}
      <QuickInquiryModal
        isOpen={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
        packageId={selectedPkg?.id}
        packageName={selectedPkg?.name}
      />
    </PublicLayout>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <PublicLayout transparentHeader>
          <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-[#DFBA73] border-t-transparent animate-spin" />
          </div>
        </PublicLayout>
      }
    >
      <HomeContent />
    </Suspense>
  );
}