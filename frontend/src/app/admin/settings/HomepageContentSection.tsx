"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Image as ImageIcon,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  ToggleLeft,
  ToggleRight,
  Package as PackageIcon,
  MapPin,
  ExternalLink,
  Percent,
} from "lucide-react";
import Link from "next/link";
import {
  adminApi,
  AdminSiteSettings,
  HomePageContent,
  Destination,
  PackageItem,
} from "@/lib/api";

interface HomepageContentSectionProps {
  settings: AdminSiteSettings;
  canEdit: boolean;
  onSaved: (updated: AdminSiteSettings) => void;
  onDirtyChange: (isDirty: boolean) => void;
}

export default function HomepageContentSection({
  settings,
  canEdit,
  onSaved,
  onDirtyChange,
}: HomepageContentSectionProps) {
  // Hero Section
  const [heroHeadline, setHeroHeadline] = useState(
    settings.hero_headline || "Tailored Journeys, Unforgettable Stories"
  );
  const [heroSubtitle, setHeroSubtitle] = useState(
    settings.hero_subtitle || "Curated luxury holidays and bespoke itineraries originating from Coimbatore."
  );
  const [heroImageUrl, setHeroImageUrl] = useState(
    settings.hero_image_url || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e"
  );
  const [tagline, setTagline] = useState(
    settings.tagline || "Coimbatore • Luxury & Adventure Journeys"
  );

  // Promo / Best Offer Banner
  const [promoBannerActive, setPromoBannerActive] = useState(
    Boolean(settings.promo_banner_active)
  );
  const [promoBannerText, setPromoBannerText] = useState(
    settings.promo_banner_text || "Special Seasonal Offer: Up to 15% off Early Bird Bookings"
  );
  const [promoBannerLink, setPromoBannerLink] = useState(
    settings.promo_banner_link || "/offers"
  );

  // Featured Catalog Curation
  const [featuredDestIds, setFeaturedDestIds] = useState<string[]>(
    settings.featured_destination_ids || []
  );
  const [featuredPkgIds, setFeaturedPkgIds] = useState<string[]>(
    settings.featured_package_ids || []
  );

  // Catalog Loading
  const [availableDestinations, setAvailableDestinations] = useState<Destination[]>([]);
  const [availablePackages, setAvailablePackages] = useState<PackageItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // UI States
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadCatalog() {
      try {
        setCatalogLoading(true);
        const [destRes, pkgRes] = await Promise.all([
          adminApi.getDestinations({ page: 1, page_size: 100 }),
          adminApi.getPackages({ page: 1, page_size: 100 }),
        ]);
        setAvailableDestinations(destRes.items || []);
        setAvailablePackages(pkgRes.items || []);
      } catch {
        // Non-blocking
      } finally {
        setCatalogLoading(false);
      }
    }
    loadCatalog();
  }, []);

  // Track dirty changes
  useEffect(() => {
    const isDirty =
      heroHeadline !== (settings.hero_headline || "Tailored Journeys, Unforgettable Stories") ||
      heroSubtitle !==
        (settings.hero_subtitle ||
          "Curated luxury holidays and bespoke itineraries originating from Coimbatore.") ||
      heroImageUrl !==
        (settings.hero_image_url ||
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e") ||
      tagline !== (settings.tagline || "Coimbatore • Luxury & Adventure Journeys") ||
      promoBannerActive !== Boolean(settings.promo_banner_active) ||
      promoBannerText !==
        (settings.promo_banner_text ||
          "Special Seasonal Offer: Up to 15% off Early Bird Bookings") ||
      promoBannerLink !== (settings.promo_banner_link || "/offers") ||
      JSON.stringify(featuredDestIds.slice().sort()) !==
        JSON.stringify((settings.featured_destination_ids || []).slice().sort()) ||
      JSON.stringify(featuredPkgIds.slice().sort()) !==
        JSON.stringify((settings.featured_package_ids || []).slice().sort());

    onDirtyChange(isDirty);
  }, [
    heroHeadline,
    heroSubtitle,
    heroImageUrl,
    tagline,
    promoBannerActive,
    promoBannerText,
    promoBannerLink,
    featuredDestIds,
    featuredPkgIds,
    settings,
    onDirtyChange,
  ]);

  const handleReset = () => {
    setHeroHeadline(settings.hero_headline || "Tailored Journeys, Unforgettable Stories");
    setHeroSubtitle(
      settings.hero_subtitle ||
        "Curated luxury holidays and bespoke itineraries originating from Coimbatore."
    );
    setHeroImageUrl(
      settings.hero_image_url ||
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e"
    );
    setTagline(settings.tagline || "Coimbatore • Luxury & Adventure Journeys");
    setPromoBannerActive(Boolean(settings.promo_banner_active));
    setPromoBannerText(
      settings.promo_banner_text ||
        "Special Seasonal Offer: Up to 15% off Early Bird Bookings"
    );
    setPromoBannerLink(settings.promo_banner_link || "/offers");
    setFeaturedDestIds(settings.featured_destination_ids || []);
    setFeaturedPkgIds(settings.featured_package_ids || []);
    setErrors({});
  };

  const toggleDestination = (id: string) => {
    setFeaturedDestIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const togglePackage = (id: string) => {
    setFeaturedPkgIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    try {
      setSaving(true);
      setErrors({});

      const payload: Partial<AdminSiteSettings> = {
        hero_headline: heroHeadline.trim(),
        hero_subtitle: heroSubtitle.trim(),
        hero_image_url: heroImageUrl.trim(),
        tagline: tagline.trim(),
        promo_banner_active: promoBannerActive,
        promo_banner_text: promoBannerText.trim() || undefined,
        promo_banner_link: promoBannerLink.trim() || undefined,
        featured_destination_ids: featuredDestIds,
        featured_package_ids: featuredPkgIds,
      };

      const updated = await adminApi.updateSettings(payload);

      // Also synchronize page_content_home draft and published content so both stores stay 100% unified
      try {
        const currentEnvelope = await adminApi.getPageEnvelope<HomePageContent>("home");
        if (currentEnvelope?.draft) {
          const draft = { ...currentEnvelope.draft };
          if (draft.hero) {
            draft.hero.heading = heroHeadline.trim();
            draft.hero.description = heroSubtitle.trim();
            draft.hero.image_url = heroImageUrl.trim();
          }
          if (!draft.featured_content) {
            draft.featured_content = {
              featured_destination_ids: featuredDestIds,
              featured_package_ids: featuredPkgIds,
              promo_banner_active: promoBannerActive,
              promo_banner_text: promoBannerText.trim(),
              promo_banner_link: promoBannerLink.trim(),
              best_offers_enabled: true,
            };
          } else {
            draft.featured_content.promo_banner_active = promoBannerActive;
            draft.featured_content.promo_banner_text = promoBannerText.trim();
            draft.featured_content.promo_banner_link = promoBannerLink.trim();
            draft.featured_content.featured_destination_ids = featuredDestIds;
            draft.featured_content.featured_package_ids = featuredPkgIds;
          }
          await adminApi.updatePageDraft("home", { draft, publish_immediately: true });
        }
      } catch {
        // Graceful non-blocking fallback
      }

      onSaved(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      setErrors({ global: (err as Error).message || "Failed to save Homepage settings." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Authoritative Single Editor Callout Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-stone-50 border border-amber-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#24292F] text-[#DFBA73] flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md mb-1">
              Authoritative Homepage Editor
            </div>
            <h3 className="text-sm font-bold text-[#202124]">
              Website Content → Main Website is the authoritative editor
            </h3>
            <p className="text-xs text-[#5F6368] mt-0.5 max-w-xl">
              All homepage storytelling, section ordering, featured catalog spotlights, agency branding, and preview/publish controls have been unified into <strong>Website Content → Main Website</strong>.
            </p>
          </div>
        </div>
        <Link
          href="/admin/content/main"
          className="h-10 px-5 rounded-xl bg-[#202124] hover:bg-[#3D4450] text-white text-xs font-bold flex items-center gap-2 shrink-0 transition-all shadow-sm"
        >
          <span>Open Main Website Editor</span>
          <ExternalLink className="w-3.5 h-3.5 text-[#DFBA73]" />
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#202124]">
                Homepage Content &amp; Curation
              </h2>
              <p className="text-xs text-[#5F6368] mt-1 max-w-2xl font-light">
                Manage hero storytelling, promotional announcement bar, and featured catalog spotlights.
                All changes reflect dynamically on the public storefront.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#5F6368] text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            {canEdit && (
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-[#202124] hover:bg-[#2F3337] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xs disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? "Saving..." : "Save Configuration"}</span>
              </button>
            )}
          </div>
        </div>

        {saveSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Homepage content saved and synchronized with the public storefront!</span>
          </div>
        )}

        {errors.global && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errors.global}</span>
          </div>
        )}
      </div>

      {/* Hero Showcase Settings */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#202124]">Hero Showcase</h3>
          <p className="text-xs text-[#5F6368] mt-0.5">
            Primary brand statement displayed to first-time visitors on the landing page.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              Hero Headline
            </label>
            <input
              type="text"
              value={heroHeadline}
              onChange={(e) => setHeroHeadline(e.target.value)}
              disabled={!canEdit}
              placeholder="Tailored Journeys, Unforgettable Stories"
              className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              Hero Subtitle
            </label>
            <textarea
              rows={2}
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              disabled={!canEdit}
              placeholder="Curated luxury holidays and bespoke itineraries originating from Coimbatore."
              className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#202124] mb-1.5">
                Hero Image URL
              </label>
              <input
                type="url"
                value={heroImageUrl}
                onChange={(e) => setHeroImageUrl(e.target.value)}
                disabled={!canEdit}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202124] mb-1.5">
                Brand Tagline
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                disabled={!canEdit}
                placeholder="Coimbatore • Luxury &amp; Adventure Journeys"
                className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Promotional / Best Offers Announcement Bar */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E4E5E7]">
          <div>
            <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
              <Percent className="w-4 h-4 text-[#C5A880]" />
              <span>Promotional Announcement Banner</span>
            </h3>
            <p className="text-xs text-[#5F6368] mt-0.5">
              Highlight seasonal campaigns, early-bird deals, or urgent notices across the top of every page.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPromoBannerActive(!promoBannerActive)}
            disabled={!canEdit}
            className={`p-1.5 rounded-xl transition-all ${
              promoBannerActive ? "text-emerald-600 hover:text-emerald-700" : "text-stone-400 hover:text-stone-500"
            }`}
          >
            {promoBannerActive ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              Banner Text
            </label>
            <input
              type="text"
              value={promoBannerText}
              onChange={(e) => setPromoBannerText(e.target.value)}
              disabled={!canEdit}
              placeholder="Special Seasonal Offer: Up to 15% off Early Bird Bookings"
              className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              Banner Target Link
            </label>
            <input
              type="text"
              value={promoBannerLink}
              onChange={(e) => setPromoBannerLink(e.target.value)}
              disabled={!canEdit}
              placeholder="/offers"
              className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50"
            />
          </div>
        </div>

        <div className="p-3 bg-stone-50 rounded-xl text-xs flex items-center justify-between">
          <span className="text-[#5F6368]">
            Manage coupon codes and discounted seasonal packages directly in the Best Offers module.
          </span>
          <Link
            href="/admin/offers"
            className="text-xs font-bold text-[#202124] hover:text-[#C5A880] flex items-center gap-1"
          >
            <span>Manage Best Offers</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Featured Catalog Items */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-5">
        <div>
          <h3 className="text-sm font-bold text-[#202124]">Homepage Featured Curation</h3>
          <p className="text-xs text-[#5F6368] mt-0.5">
            Select items from your active catalog to feature in the homepage carousel sections.
          </p>
        </div>

        {/* Featured Destinations */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#202124] flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>Featured Destinations ({featuredDestIds.length} selected)</span>
          </label>
          <div className="max-h-48 overflow-y-auto p-3 bg-stone-50 rounded-xl border border-[#E4E5E7] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {catalogLoading ? (
              <span className="text-xs text-stone-400">Loading catalog...</span>
            ) : availableDestinations.length === 0 ? (
              <span className="text-xs text-stone-400">No destinations available.</span>
            ) : (
              availableDestinations.map((dest) => (
                <label
                  key={dest.id}
                  className={`p-2 rounded-lg border text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                    featuredDestIds.includes(dest.id)
                      ? "bg-white border-[#202124] font-bold text-[#202124] shadow-2xs"
                      : "bg-white/60 border-stone-200 text-[#5F6368] hover:bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={featuredDestIds.includes(dest.id)}
                    onChange={() => toggleDestination(dest.id)}
                    disabled={!canEdit}
                    className="w-3.5 h-3.5 rounded text-[#202124] focus:ring-[#C5A880]"
                  />
                  <span className="truncate">{dest.name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Featured Packages */}
        <div className="space-y-2 pt-2">
          <label className="block text-xs font-bold text-[#202124] flex items-center gap-1.5">
            <PackageIcon className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>Featured Packages ({featuredPkgIds.length} selected)</span>
          </label>
          <div className="max-h-48 overflow-y-auto p-3 bg-stone-50 rounded-xl border border-[#E4E5E7] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {catalogLoading ? (
              <span className="text-xs text-stone-400">Loading catalog...</span>
            ) : availablePackages.length === 0 ? (
              <span className="text-xs text-stone-400">No packages available.</span>
            ) : (
              availablePackages.map((pkg) => (
                <label
                  key={pkg.id}
                  className={`p-2 rounded-lg border text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                    featuredPkgIds.includes(pkg.id)
                      ? "bg-white border-[#202124] font-bold text-[#202124] shadow-2xs"
                      : "bg-white/60 border-stone-200 text-[#5F6368] hover:bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={featuredPkgIds.includes(pkg.id)}
                    onChange={() => togglePackage(pkg.id)}
                    disabled={!canEdit}
                    className="w-3.5 h-3.5 rounded text-[#202124] focus:ring-[#C5A880]"
                  />
                  <span className="truncate">{pkg.name}</span>
                </label>
              ))
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
