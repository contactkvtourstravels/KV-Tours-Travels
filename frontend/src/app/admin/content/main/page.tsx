"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Save,
  Send,
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Globe,
  Monitor,
  Smartphone,
  X,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Layers,
  Compass,
  Plane,
  ShieldCheck,
  Video,
  Image as ImageIcon,
  Building,
  Phone,
  Mail,
  MapPin,
  Palette,
  Package as PackageIcon,
  Search,
  Check,
  Clock,
  MessageCircle,
  Share2,
  Printer,
} from "lucide-react";
import {
  adminApi,
  HomePageContent,
  AdminPageEnvelopeResponse,
  AdminSiteSettings,
  Destination,
  PackageItem,
} from "@/lib/api";
import { useAdmin } from "../../AdminContext";
import { useBranding } from "@/context/BrandingContext";

const SECTION_LABELS: Record<string, string> = {
  hero: "Cinematic Hero Showcase",
  trending_destinations: "Trending Destinations Carousel",
  best_offers: "Best Promotional Offers Showcase",
  featured_packages: "Featured Travel Packages Grid",
  travel_inspirations: "Curated Travel Inspirations (Themes)",
  upcoming_departures: "Upcoming Fixed Group Departures",
  custom_cta: "Custom Bespoke Itinerary CTA Banner",
};

type MainTab = "hero" | "sections" | "featured" | "branding" | "contact" | "seo";

const BRAND_PALETTES = [
  {
    name: "Royal Charcoal & Warm Gold",
    badge: "Default Heritage",
    primary: "#24292F",
    secondary: "#C5A880",
    accent: "#D4AF37",
    description: "Refined luxury, timeless architectural tone",
  },
  {
    name: "Imperial Emerald & Champagne",
    badge: "Eco & Wildlife",
    primary: "#0D3B2E",
    secondary: "#C5A880",
    accent: "#E5BA73",
    description: "Serene rainforests, nature safaris, eco-luxury",
  },
  {
    name: "Aegean Azure & Bronze",
    badge: "Coastal & Island",
    primary: "#0F2C59",
    secondary: "#C5A880",
    accent: "#38B6FF",
    description: "Maritime cruises, island hopping, sapphire horizons",
  },
  {
    name: "Velvet Espresso & Ochre",
    badge: "Desert & Boutique",
    primary: "#2C1810",
    secondary: "#C5A880",
    accent: "#E0A96D",
    description: "Warm desert glamping, boutique lodge heritage",
  },
  {
    name: "Midnight Sapphire & Rose Gold",
    badge: "Romance & Honeymoon",
    primary: "#1B263B",
    secondary: "#B76E79",
    accent: "#E0A96D",
    description: "Modern romantic journeys, private luxury villas",
  },
];

const PRIMARY_FONTS = [
  { value: "Playfair Display", label: "Playfair Display (Luxury Serif - Recommended)" },
  { value: "Cinzel", label: "Cinzel (Classic Roman Heritage Serif)" },
  { value: "Outfit", label: "Outfit (Modern Geometric Sans)" },
  { value: "Montserrat", label: "Montserrat (Architectural Premium Sans)" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans (Contemporary Editorial Sans)" },
  { value: "Inter", label: "Inter (Neutral Precision Sans)" },
];

const SECONDARY_FONTS = [
  { value: "Inter", label: "Inter (Crisp Legibility - Recommended)" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans (Modern Clean Sans)" },
  { value: "Outfit", label: "Outfit (Clean Geometric Sans)" },
  { value: "Roboto", label: "Roboto (Neutral Standard Sans)" },
  { value: "system-ui", label: "System UI (Native OS Font)" },
];

export default function AdminMainContentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasAnyRole } = useAdmin();
  const { updateBranding } = useBranding();
  const canEdit = hasAnyRole(["admin", "super_admin"]);

  // Core CMS state
  const [envelope, setEnvelope] = useState<AdminPageEnvelopeResponse<HomePageContent> | null>(null);
  const [content, setContent] = useState<HomePageContent | null>(null);
  const [settings, setSettings] = useState<AdminSiteSettings | null>(null);

  // Agency branding & contact local form state
  const [agencyName, setAgencyName] = useState("");
  const [publicDisplayName, setPublicDisplayName] = useState("");
  const [shortName, setShortName] = useState("");
  const [tagline, setTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [secondaryLogoUrl, setSecondaryLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState("#24292F");
  const [brandSecondaryColor, setBrandSecondaryColor] = useState("#C5A880");
  const [brandAccentColor, setBrandAccentColor] = useState("#D4AF37");
  const [primaryFont, setPrimaryFont] = useState("Playfair Display");
  const [secondaryFont, setSecondaryFont] = useState("Inter");

  // Contact & Business Local State
  const [contactPhone, setContactPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [supportWhatsapp, setSupportWhatsapp] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [generalInquiryEmail, setGeneralInquiryEmail] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [legalBusinessName, setLegalBusinessName] = useState("");
  const [customerSupportEmail, setCustomerSupportEmail] = useState("");
  const [bookingEmail, setBookingEmail] = useState("");
  const [registeredOfficeAddress, setRegisteredOfficeAddress] = useState("");
  const [operatingHours, setOperatingHours] = useState("");
  const [officeLocationLabel, setOfficeLocationLabel] = useState("");
  const [googleMapsEmbedUrl, setGoogleMapsEmbedUrl] = useState("");

  // Catalog items for curation
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [destSearch, setDestSearch] = useState("");
  const [pkgSearch, setPkgSearch] = useState("");

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>("hero");
  const [popularTagsInput, setPopularTagsInput] = useState("");

  // Read URL query parameter tab
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "pdf" || tabParam === "voucher") {
      router.replace("/admin/settings?tab=pdf");
      return;
    }
    if (tabParam && ["hero", "sections", "featured", "branding", "contact", "seo"].includes(tabParam)) {
      setActiveTab(tabParam as MainTab);
    }
  }, [searchParams, router]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [envelopeRes, settingsRes, destsRes, pkgsRes] = await Promise.all([
        adminApi.getPageEnvelope<HomePageContent>("home"),
        adminApi.getSettings(),
        adminApi.getDestinations({ page: 1, page_size: 100 }),
        adminApi.getPackages({ page: 1, page_size: 100 }),
      ]);

      setEnvelope(envelopeRes);
      setContent(envelopeRes.draft);
      setPopularTagsInput((envelopeRes.draft.hero?.popular_tags || []).join(", "));

      setSettings(settingsRes);
      setAgencyName(settingsRes.agency_name || "");
      setPublicDisplayName(settingsRes.public_display_name || settingsRes.agency_name || "");
      setShortName(settingsRes.short_name || "");
      setTagline(settingsRes.tagline || "Luxury & Adventure Journeys");
      setLogoUrl(settingsRes.logo_url || "");
      setSecondaryLogoUrl(settingsRes.secondary_logo_url || "");
      setFaviconUrl(settingsRes.favicon_url || "");
      setBrandPrimaryColor(settingsRes.brand_primary_color || "#24292F");
      setBrandSecondaryColor(settingsRes.brand_secondary_color || "#C5A880");
      setBrandAccentColor(settingsRes.brand_accent_color || "#D4AF37");
      setPrimaryFont(settingsRes.primary_font || "Playfair Display");
      setSecondaryFont(settingsRes.secondary_font || "Inter");

      setContactPhone(settingsRes.contact_phone || "");
      setSecondaryPhone(settingsRes.secondary_phone || "");
      setSupportWhatsapp(settingsRes.support_whatsapp || "");
      setEmergencyPhone(settingsRes.emergency_phone || "");
      setContactEmail(settingsRes.contact_email || "");
      setGeneralInquiryEmail(settingsRes.general_inquiry_email || "");
      setOfficeAddress(settingsRes.office_address || "");
      setCity(settingsRes.city || "");
      setState(settingsRes.state || "");
      setPostalCode(settingsRes.postal_code || "");
      setCountry(settingsRes.country || "");
      setInstagramUrl(settingsRes.instagram_url || "");
      setFacebookUrl(settingsRes.facebook_url || "");
      setYoutubeUrl(settingsRes.youtube_url || "");
      setLinkedinUrl(settingsRes.linkedin_url || "");
      setTwitterUrl(settingsRes.twitter_url || "");
      setGoogleMapsUrl(settingsRes.google_maps_url || "");
      setLegalBusinessName(settingsRes.legal_business_name || "");
      setCustomerSupportEmail(settingsRes.customer_support_email || "");
      setBookingEmail(settingsRes.booking_email || "");
      setRegisteredOfficeAddress(settingsRes.registered_office_address || "");
      setOperatingHours(settingsRes.operating_hours || settingsRes.business_hours || "Mon - Sat: 9:00 AM - 7:00 PM");
      setOfficeLocationLabel(settingsRes.office_location_label || "");
      setGoogleMapsEmbedUrl(settingsRes.google_maps_embed_url || "");

      setDestinations(destsRes.items || []);
      setPackages(pkgsRes.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load Main Website content and settings";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTabChange = (targetTab: MainTab) => {
    setActiveTab(targetTab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", targetTab);
    window.history.pushState({}, "", url.toString());
  };

  // Build authoritative Agency Profile & Branding update payload
  const getAgencyProfilePayload = (): Partial<AdminSiteSettings> => {
    return {
      agency_name: agencyName,
      public_display_name: publicDisplayName,
      short_name: shortName,
      legal_business_name: legalBusinessName,
      tagline,
      logo_url: logoUrl,
      secondary_logo_url: secondaryLogoUrl,
      favicon_url: faviconUrl,
      brand_primary_color: brandPrimaryColor,
      brand_secondary_color: brandSecondaryColor,
      brand_accent_color: brandAccentColor,
      primary_font: primaryFont,
      secondary_font: secondaryFont,
      contact_phone: contactPhone,
      secondary_phone: secondaryPhone,
      support_whatsapp: supportWhatsapp,
      emergency_phone: emergencyPhone,
      contact_email: contactEmail,
      general_inquiry_email: generalInquiryEmail,
      customer_support_email: customerSupportEmail,
      booking_email: bookingEmail,
      office_address: officeAddress,
      registered_office_address: registeredOfficeAddress,
      city,
      state,
      postal_code: postalCode,
      country,
      operating_hours: operatingHours,
      office_location_label: officeLocationLabel,
      google_maps_embed_url: googleMapsEmbedUrl,
      instagram_url: instagramUrl,
      facebook_url: facebookUrl,
      youtube_url: youtubeUrl,
      linkedin_url: linkedinUrl,
      twitter_url: twitterUrl,
      google_maps_url: googleMapsUrl,
    };
  };

  // Handle direct save of Agency Profile & Branding without altering homepage draft
  const handleSaveAgencyProfile = async () => {
    try {
      setSaving(true);
      const updatedSettings = await adminApi.updateSettings(getAgencyProfilePayload());
      setSettings(updatedSettings);
      updateBranding(updatedSettings as any);
      showToast("Agency Identity & Branding settings successfully saved and updated globally!", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save agency profile";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  // Handle Save Draft (Homepage content draft is saved strictly in CMS draft envelope)
  const handleSaveDraft = async () => {
    if (!content) return;
    try {
      setSaving(true);
      const [updatedPage, updatedSettings] = await Promise.all([
        adminApi.updatePageDraft<HomePageContent>("home", {
          draft: content,
          publish_immediately: false,
        }),
        adminApi.updateSettings(getAgencyProfilePayload()),
      ]);

      setEnvelope(updatedPage);
      setContent(updatedPage.draft);
      setSettings(updatedSettings);
      updateBranding(updatedSettings as any);
      showToast("Draft saved successfully. Live homepage remains unchanged until published.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save draft";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  // Handle Publish Live (Promotes draft to live published page and syncs database settings)
  const handlePublish = async () => {
    if (!content) return;
    try {
      setPublishing(true);
      // 1. Update draft
      await adminApi.updatePageDraft<HomePageContent>("home", {
        draft: content,
        publish_immediately: false,
      });
      // 2. Publish live (promotes draft -> published and backend syncs site settings)
      const publishedPage = await adminApi.publishPage<HomePageContent>("home");
      // 3. Update agency profile settings
      const updatedSettings = await adminApi.updateSettings(getAgencyProfilePayload());

      setEnvelope(publishedPage);
      setContent(publishedPage.draft);
      setSettings(updatedSettings);
      updateBranding(updatedSettings as any);
      showToast("Main Website content & Agency Identity published to live homepage! Public visitors now see this version.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to publish page";
      showToast(msg, "error");
    } finally {
      setPublishing(false);
    }
  };


  // Handle Discard Draft
  const handleDiscard = async () => {
    try {
      setDiscarding(true);
      const reverted = await adminApi.discardPageDraft<HomePageContent>("home");
      setEnvelope(reverted);
      setContent(reverted.draft);
      setPopularTagsInput((reverted.draft.hero.popular_tags || []).join(", "));
      await loadData();
      setShowDiscardConfirm(false);
      showToast("Unpublished draft changes discarded. Reverted to live version.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to discard draft";
      showToast(msg, "error");
    } finally {
      setDiscarding(false);
    }
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    if (!content || !content.sections_order) return;
    const order = [...content.sections_order];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= order.length) return;
    const temp = order[index];
    order[index] = order[targetIdx];
    order[targetIdx] = temp;
    setContent({ ...content, sections_order: order });
  };

  // Toggle destination in featured list
  const toggleFeaturedDestination = (destId: string) => {
    if (!content) return;
    const currentList = content.featured_content?.featured_destination_ids || [];
    const exists = currentList.includes(destId);
    const updated = exists ? currentList.filter((id) => id !== destId) : [...currentList, destId];
    setContent({
      ...content,
      featured_content: {
        ...content.featured_content,
        featured_destination_ids: updated,
      },
    });
  };

  // Toggle package in featured list
  const toggleFeaturedPackage = (pkgId: string) => {
    if (!content) return;
    const currentList = content.featured_content?.featured_package_ids || [];
    const exists = currentList.includes(pkgId);
    const updated = exists ? currentList.filter((id) => id !== pkgId) : [...currentList, pkgId];
    setContent({
      ...content,
      featured_content: {
        ...content.featured_content,
        featured_package_ids: updated,
      },
    });
  };

  // Filtered lists for selectors
  const filteredDestinations = useMemo(() => {
    if (!destSearch) return destinations;
    return destinations.filter(
      (d) =>
        d.name.toLowerCase().includes(destSearch.toLowerCase()) ||
        d.country.toLowerCase().includes(destSearch.toLowerCase())
    );
  }, [destinations, destSearch]);

  const filteredPackages = useMemo(() => {
    if (!pkgSearch) return packages;
    return packages.filter(
      (p) =>
        p.name.toLowerCase().includes(pkgSearch.toLowerCase()) ||
        (p.destination_name || "").toLowerCase().includes(pkgSearch.toLowerCase())
    );
  }, [packages, pkgSearch]);

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-[#24292F] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs uppercase tracking-widest text-[#70757A] font-semibold">
          Loading Main Website Editor...
        </p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-rose-600 font-medium">Failed to load content for Main Website.</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-[#24292F] text-white rounded-xl text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  const hasUnsavedChanges = envelope?.has_unpublished_changes;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2.5 animate-fadeIn ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Discard Confirmation Modal */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#E4E5E7] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-[#202124]">Discard Draft Changes?</h3>
                <p className="text-xs text-[#70757A]">
                  This will reset all unsaved edits back to the currently published live homepage version.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-4 py-2 rounded-xl border border-[#D3D8DF] text-xs font-semibold text-[#5F6368] hover:bg-[#F7F7F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                disabled={discarding}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                {discarding ? "Discarding..." : "Discard All Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-[#E4E5E7] p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F7F7F5] border border-[#E4E5E7] text-xs text-[#5F6368] font-semibold mb-2">
              <Globe className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Unified Homepage &amp; Agency Identity</span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#202124]">
              Main Website — Authoritative Homepage Editor
            </h1>
            <p className="text-xs text-[#70757A] mt-1 max-w-2xl leading-relaxed">
              Consolidated control center for the public homepage hero, sections, featured catalog curation,
              agency identity branding, and business contact channels.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(true)}
                disabled={saving || publishing || discarding}
                className="h-10 px-3.5 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Discard Draft</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setPreviewMode("desktop")}
              className="h-10 px-4 rounded-full border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] text-[#24292F] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5 text-[#5F6368]" />
              <span>Preview Draft</span>
            </button>

            <a
              href="/?preview=true"
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 px-4 rounded-full border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] text-[#24292F] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#5F6368]" />
              <span>Open Live Preview</span>
            </a>

            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving || publishing}
                  className="h-10 px-5 rounded-full border border-[#24292F] bg-white hover:bg-[#F7F7F5] text-[#24292F] text-xs font-bold flex items-center gap-2 transition-all shadow-2xs disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : "Save Draft"}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={saving || publishing}
                  className="h-10 px-6 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-[#DFBA73]" />
                  <span>{publishing ? "Publishing..." : "Publish Live"}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* State Badges Bar */}
        <div className="pt-3 border-t border-[#E4E5E7] flex flex-wrap items-center justify-between gap-3 text-xs text-[#70757A]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${hasUnsavedChanges ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
              <span className="font-medium text-[#202124]">
                {hasUnsavedChanges ? "Draft has unpublished edits" : "Synchronized with live homepage"}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            {envelope?.draft_saved_at && (
              <span>Draft saved: {new Date(envelope.draft_saved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            )}
            {envelope?.published_at && (
              <span>Published: {new Date(envelope.published_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>

      {/* Editor Tabs Navigation (6 Consolidated Sub-Nav Tabs) */}
      <div className="flex items-center gap-2 border-b border-[#E4E5E7] pb-3 overflow-x-auto text-xs">
        {[
          { id: "hero", label: "Homepage Hero", icon: Sparkles },
          { id: "sections", label: "Homepage Sections", icon: Layers },
          { id: "featured", label: "Featured Content", icon: PackageIcon },
          { id: "branding", label: "Agency Branding", icon: Palette },
          { id: "contact", label: "Contact & Business", icon: Phone },
          { id: "seo", label: "SEO & Social Sharing", icon: Globe },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id as MainTab)}
              className={`px-4 py-2.5 rounded-full font-bold uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
                isActive
                  ? "bg-[#24292F] text-white shadow-sm"
                  : "bg-white text-[#5F6368] border border-[#E4E5E7] hover:bg-[#F7F7F5] hover:text-[#202124]"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#DFBA73]" : ""}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          TAB 1: HOMEPAGE HERO
         ========================================================================= */}
      {activeTab === "hero" && (
        <div className="bg-white rounded-3xl border border-[#E4E5E7] p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-serif font-bold text-[#202124]">Cinematic Hero Showcase</h2>
            <p className="text-xs text-[#70757A] mt-0.5">
              The authoritative hero visual storytelling seen when visitors land on the homepage.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Hero Eyebrow Text (Trust Badge)
                </label>
                <input
                  type="text"
                  value={content.hero.eyebrow ?? ""}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      hero: { ...content.hero, eyebrow: e.target.value },
                    })
                  }
                  disabled={!canEdit}
                  placeholder="KV TOURS & TRAVELS • COIMBATORE"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Hero Heading (Headline)
                </label>
                <input
                  type="text"
                  value={content.hero.heading ?? ""}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      hero: { ...content.hero, heading: e.target.value },
                    })
                  }
                  disabled={!canEdit}
                  placeholder="Your Journey. Our Expertise."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-sm font-medium text-[#202124]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Hero Description Statement
                </label>
                <textarea
                  rows={3}
                  value={content.hero.description ?? ""}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      hero: { ...content.hero, description: e.target.value },
                    })
                  }
                  disabled={!canEdit}
                  placeholder="Curating bespoke international escapes, breathtaking domestic expeditions, and signature group departures from Coimbatore."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>
            </div>


            {/* Media Settings */}
            <div className="pt-4 border-t border-[#E4E5E7] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs uppercase tracking-wider font-bold text-[#202124]">Hero Media Asset</h3>
                  <p className="text-[11px] text-[#70757A]">Choose high-resolution image or cinematic video backdrop.</p>
                </div>
                <div className="flex items-center gap-1.5 bg-[#F7F7F5] p-1 rounded-xl border border-[#E4E5E7]">
                  <button
                    type="button"
                    onClick={() =>
                      setContent({
                        ...content,
                        hero: { ...content.hero, media_type: "image" },
                      })
                    }
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      (content.hero.media_type || "image") === "image"
                        ? "bg-[#24292F] text-white shadow-2xs"
                        : "text-[#5F6368] hover:text-[#202124]"
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setContent({
                        ...content,
                        hero: { ...content.hero, media_type: "video" },
                      })
                    }
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      content.hero.media_type === "video"
                        ? "bg-[#24292F] text-white shadow-2xs"
                        : "text-[#5F6368] hover:text-[#202124]"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Video</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Hero Image URL (or Video Poster)
                </label>
                <input
                  type="text"
                  value={content.hero.image_url}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      hero: { ...content.hero, image_url: e.target.value },
                    })
                  }
                  disabled={!canEdit}
                  placeholder="/images/hero/hero-4k.webp"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>

              {content.hero.media_type === "video" && (
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                    Hero Video MP4 / WebM URL
                  </label>
                  <input
                    type="url"
                    value={content.hero.video_url || ""}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        hero: { ...content.hero, video_url: e.target.value || null },
                      })
                    }
                    disabled={!canEdit}
                    placeholder="https://assets.mixkit.co/videos/preview/..."
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                  />
                </div>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="pt-4 border-t border-[#E4E5E7] space-y-4">
              <h3 className="text-xs uppercase tracking-wider font-bold text-[#202124]">Hero Action Buttons</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                    Primary Button Label
                  </label>
                  <input
                    type="text"
                    value={content.hero.primary_cta_text ?? ""}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        hero: { ...content.hero, primary_cta_text: e.target.value },
                      })
                    }
                    disabled={!canEdit}
                    placeholder="Explore Curated Journeys"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                    Primary Button Target Link
                  </label>
                  <input
                    type="text"
                    value={content.hero.primary_cta_link ?? ""}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        hero: { ...content.hero, primary_cta_link: e.target.value },
                      })
                    }
                    disabled={!canEdit}
                    placeholder="/packages"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                    Secondary Button Label
                  </label>
                  <input
                    type="text"
                    value={content.hero.secondary_cta_text ?? ""}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        hero: { ...content.hero, secondary_cta_text: e.target.value },
                      })
                    }
                    disabled={!canEdit}
                    placeholder="Plan Custom Trip"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                    Secondary Button Target Link
                  </label>
                  <input
                    type="text"
                    value={content.hero.secondary_cta_link ?? ""}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        hero: { ...content.hero, secondary_cta_link: e.target.value },
                      })
                    }
                    disabled={!canEdit}
                    placeholder="/custom-trip"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                    WhatsApp Button Label
                  </label>
                  <input
                    type="text"
                    value={content.hero.whatsapp_cta_text ?? ""}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        hero: { ...content.hero, whatsapp_cta_text: e.target.value },
                      })
                    }
                    disabled={!canEdit}
                    placeholder="WhatsApp Us"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                  />
                </div>
              </div>
            </div>

            {/* Popular Destination Tags */}
            <div className="pt-4 border-t border-[#E4E5E7] space-y-2">
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A]">
                Popular Destination Pills (Comma Separated)
              </label>
              <input
                type="text"
                value={popularTagsInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setPopularTagsInput(val);
                  const parsed = val
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  setContent({
                    ...content,
                    hero: { ...content.hero, popular_tags: parsed },
                  });
                }}
                disabled={!canEdit}
                placeholder="Maldives, Lakshadweep, Bali, Manali, Kazakhstan, Japan"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              />
              <p className="text-[11px] text-[#70757A]">
                Displayed directly beneath the hero description as quick clickable chips. Clear field to hide chips completely.
              </p>
            </div>

            {/* Floating Trust Indicators (Hero Base) */}
            <div className="pt-4 border-t border-[#E4E5E7] space-y-3">
              <div>
                <h3 className="text-xs uppercase tracking-wider font-bold text-[#202124]">
                  Floating Trust Indicators (Hero Base)
                </h3>
                <p className="text-[11px] text-[#70757A]">
                  Three editable badge labels displayed along the base of the homepage hero. Clear a field to hide that badge.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[0, 1, 2].map((idx) => {
                  const defaultIcons = ["ShieldCheck", "Sparkles", "Plane"];
                  const ti = (content.trust_indicators && content.trust_indicators[idx]) || {
                    icon: defaultIcons[idx] || "Sparkles",
                    label: "",
                  };
                  return (
                    <div key={idx} className="p-3.5 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#70757A]">
                        Badge #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={ti.label ?? ""}
                        onChange={(e) => {
                          const updated = [...(content.trust_indicators || [])];
                          while (updated.length <= idx) {
                            updated.push({
                              icon: defaultIcons[updated.length] || "Sparkles",
                              label: "",
                            });
                          }
                          updated[idx] = { ...updated[idx], label: e.target.value };
                          setContent({ ...content, trust_indicators: updated });
                        }}
                        disabled={!canEdit}
                        placeholder={`Badge #${idx + 1} Label`}
                        className="w-full px-3 py-1.5 rounded-xl border border-[#D3D8DF] bg-white text-xs font-semibold text-[#202124]"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: HOMEPAGE SECTIONS
         ========================================================================= */}
      {activeTab === "sections" && (
        <div className="bg-white rounded-3xl border border-[#E4E5E7] p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-serif font-bold text-[#202124]">Homepage Section Visibility &amp; Ordering</h2>
            <p className="text-xs text-[#70757A] mt-0.5">
              Toggle visibility and arrange the vertical sequence of public homepage content sections.
            </p>
          </div>

          {/* Section Visibility Switches */}
          <div className="space-y-3 pb-6 border-b border-[#E4E5E7]">
            <h3 className="text-xs uppercase tracking-wider font-bold text-[#202124]">Section Visibility Toggles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: "trending_destinations", label: "Trending Destinations Carousel" },
                { key: "best_offers", label: "Best Promotional Offers Showcase" },
                { key: "featured_packages", label: "Featured Travel Packages Grid" },
                { key: "travel_inspirations", label: "Curated Travel Inspirations (Themes)" },
                { key: "upcoming_departures", label: "Upcoming Fixed Group Departures" },
                { key: "custom_cta", label: "Custom Bespoke Itinerary CTA Banner" },
              ].map(({ key, label }) => {
                const isVisible =
                  content.sections_visibility?.[key as keyof typeof content.sections_visibility] ?? true;

                return (
                  <div
                    key={key}
                    className="p-3.5 rounded-2xl border border-[#E4E5E7] bg-[#F7F7F5] flex items-center justify-between"
                  >
                    <span className="text-xs font-semibold text-[#202124]">{label}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(isVisible)}
                        onChange={(e) =>
                          setContent({
                            ...content,
                            sections_visibility: {
                              ...content.sections_visibility,
                              [key]: e.target.checked,
                            },
                          })
                        }
                        disabled={!canEdit}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#D3D8DF] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D3D8DF] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#24292F]" />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section Ordering List */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider font-bold text-[#202124]">Section Vertical Hierarchy</h3>
            <div className="space-y-2">
              {(content.sections_order || []).map((secKey, idx) => (
                <div
                  key={secKey}
                  className="p-3.5 rounded-2xl border border-[#E4E5E7] bg-white flex items-center justify-between shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#F7F7F5] border border-[#E4E5E7] text-[11px] font-bold text-[#5F6368] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-[#202124]">
                      {SECTION_LABELS[secKey] || secKey}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveSection(idx, "up")}
                      disabled={idx === 0 || !canEdit}
                      className="p-1.5 rounded-lg border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] disabled:opacity-30 disabled:cursor-not-allowed text-[#202124]"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(idx, "down")}
                      disabled={idx === (content.sections_order?.length || 0) - 1 || !canEdit}
                      className="p-1.5 rounded-lg border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] disabled:opacity-30 disabled:cursor-not-allowed text-[#202124]"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* =========================================================================
          TAB 3: FEATURED CONTENT CURATION
         ========================================================================= */}
      {activeTab === "featured" && (
        <div className="bg-white rounded-3xl border border-[#E4E5E7] p-6 shadow-xs space-y-8">
          <div>
            <h2 className="text-base font-serif font-bold text-[#202124]">Featured Content Curation</h2>
            <p className="text-xs text-[#70757A] mt-0.5">
              Select specific destinations, packages, promotional banners, and offers showcased on the homepage.
            </p>
          </div>

          {/* Promotional Announcement Banner */}
          <div className="p-5 rounded-2xl bg-[#FDFBF7] border border-[#EFE5D0] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs uppercase tracking-wider font-bold text-[#202124]">
                  Top Hero Promotional Announcement Banner
                </h3>
                <p className="text-[11px] text-[#70757A]">
                  Renders an eye-catching gold announcement ribbon at the top of the homepage hero.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(content.featured_content?.promo_banner_active)}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      featured_content: {
                        ...content.featured_content,
                        promo_banner_active: e.target.checked,
                      },
                    })
                  }
                  disabled={!canEdit}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-[#D3D8DF] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D3D8DF] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#DFBA73]" />
              </label>
            </div>

            {content.featured_content?.promo_banner_active && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                    Banner Announcement Text
                  </label>
                  <input
                    type="text"
                    value={content.featured_content?.promo_banner_text || ""}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        featured_content: {
                          ...content.featured_content,
                          promo_banner_text: e.target.value,
                        },
                      })
                    }
                    disabled={!canEdit}
                    placeholder="Special Seasonal Offer: Up to 15% off Early Bird Bookings"
                    className="w-full px-4 py-2 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                    Target Link / URL
                  </label>
                  <input
                    type="text"
                    value={content.featured_content?.promo_banner_link || ""}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        featured_content: {
                          ...content.featured_content,
                          promo_banner_link: e.target.value,
                        },
                      })
                    }
                    disabled={!canEdit}
                    placeholder="/offers or /packages"
                    className="w-full px-4 py-2 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Best Offers Showcase Toggle */}
          <div className="p-5 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] flex items-center justify-between">
            <div>
              <h3 className="text-xs uppercase tracking-wider font-bold text-[#202124]">
                Best Promotional Offers Feature
              </h3>
              <p className="text-[11px] text-[#70757A]">
                Displays active discounted holiday offers directly on the homepage.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={content.featured_content?.best_offers_enabled !== false}
                onChange={(e) =>
                  setContent({
                    ...content,
                    featured_content: {
                      ...content.featured_content,
                      best_offers_enabled: e.target.checked,
                    },
                  })
                }
                disabled={!canEdit}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-[#D3D8DF] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D3D8DF] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#24292F]" />
            </label>
          </div>

          {/* Curated Featured Destinations */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs uppercase tracking-wider font-bold text-[#202124]">
                  Curated Featured Destinations (Trending Carousel)
                </h3>
                <p className="text-[11px] text-[#70757A]">
                  Selected destinations are prioritized first in the carousel on the public homepage.
                </p>
              </div>
              <span className="text-xs font-bold text-[#C5A880]">
                {content.featured_content?.featured_destination_ids?.length || 0} Destinations Selected
              </span>
            </div>

            {/* Selected Pills */}
            {(content.featured_content?.featured_destination_ids || []).length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7]">
                {(content.featured_content?.featured_destination_ids || []).map((id) => {
                  const dest = destinations.find((d) => d.id === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#D3D8DF] text-xs font-semibold text-[#202124] shadow-2xs"
                    >
                      <span>{dest ? dest.name : id}</span>
                      <button
                        type="button"
                        onClick={() => toggleFeaturedDestination(id)}
                        className="text-[#70757A] hover:text-rose-600 ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Destination Search & Grid */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-[#70757A] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={destSearch}
                  onChange={(e) => setDestSearch(e.target.value)}
                  placeholder="Search destinations to feature..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>

              <div className="max-h-56 overflow-y-auto border border-[#E4E5E7] rounded-2xl divide-y divide-[#E4E5E7]">
                {filteredDestinations.map((dest) => {
                  const isSelected = (content.featured_content?.featured_destination_ids || []).includes(dest.id);
                  return (
                    <div
                      key={dest.id}
                      onClick={() => toggleFeaturedDestination(dest.id)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? "bg-amber-50/60" : "hover:bg-[#F7F7F5]"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold text-[#202124]">{dest.name}</div>
                        <div className="text-[11px] text-[#70757A]">{dest.country} {dest.region ? `• ${dest.region}` : ""}</div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-[#24292F] border-[#24292F] text-white"
                            : "border-[#D3D8DF] bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Curated Featured Packages */}
          <div className="space-y-4 pt-4 border-t border-[#E4E5E7]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs uppercase tracking-wider font-bold text-[#202124]">
                  Curated Featured Travel Packages (Packages Grid)
                </h3>
                <p className="text-[11px] text-[#70757A]">
                  Selected packages are prioritized first in the Featured Travel Packages section.
                </p>
              </div>
              <span className="text-xs font-bold text-[#C5A880]">
                {content.featured_content?.featured_package_ids?.length || 0} Packages Selected
              </span>
            </div>

            {/* Selected Pills */}
            {(content.featured_content?.featured_package_ids || []).length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7]">
                {(content.featured_content?.featured_package_ids || []).map((id) => {
                  const pkg = packages.find((p) => p.id === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#D3D8DF] text-xs font-semibold text-[#202124] shadow-2xs"
                    >
                      <span>{pkg ? pkg.name : id}</span>
                      <button
                        type="button"
                        onClick={() => toggleFeaturedPackage(id)}
                        className="text-[#70757A] hover:text-rose-600 ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Package Search & Grid */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-[#70757A] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={pkgSearch}
                  onChange={(e) => setPkgSearch(e.target.value)}
                  placeholder="Search packages to feature..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>

              <div className="max-h-56 overflow-y-auto border border-[#E4E5E7] rounded-2xl divide-y divide-[#E4E5E7]">
                {filteredPackages.map((pkg) => {
                  const isSelected = (content.featured_content?.featured_package_ids || []).includes(pkg.id);
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => toggleFeaturedPackage(pkg.id)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? "bg-amber-50/60" : "hover:bg-[#F7F7F5]"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold text-[#202124]">{pkg.name}</div>
                        <div className="text-[11px] text-[#70757A]">
                          {pkg.destination_name ? `${pkg.destination_name} • ` : ""}₹{Number(pkg.base_price).toLocaleString("en-IN")} • {pkg.duration_days}D/{pkg.duration_nights}N
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-[#24292F] border-[#24292F] text-white"
                            : "border-[#D3D8DF] bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: AGENCY BRANDING & IDENTITY
         ========================================================================= */}
      {activeTab === "branding" && (
        <div className="bg-white rounded-3xl border border-[#E4E5E7] p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-serif font-bold text-[#202124]">Agency Branding &amp; Identity</h2>
            <p className="text-xs text-[#70757A] mt-0.5">
              Authoritative business identity, typography, logos, and global brand color scheme.
            </p>
          </div>

          {/* Quick Access to Travel Voucher & PDF Letterhead Settings */}
          <div className="p-4 rounded-2xl bg-[#FBFBFA] border border-[#C5A880]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#8C6D3B] shrink-0">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-[#202124] font-semibold block">Official Travel Voucher &amp; PDF Letterhead</strong>
                <span className="text-[#5F6368] text-[11px]">
                  Customize print vouchers, arrival briefing guidelines, emergency concierge helpline, and digital authenticity seal.
                </span>
              </div>
            </div>
            <Link
              href="/admin/settings?tab=pdf"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white font-semibold text-xs transition-colors shrink-0 shadow-2xs cursor-pointer"
            >
              <span>Edit PDF Details</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Agency Name
              </label>
              <input
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                disabled={!canEdit}
                placeholder="e.g. KV Tours & Travels"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Public Display Name
              </label>
              <input
                type="text"
                value={publicDisplayName}
                onChange={(e) => setPublicDisplayName(e.target.value)}
                disabled={!canEdit}
                placeholder="e.g. KV Tours & Travels"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Legal Registered Entity Name
              </label>
              <input
                type="text"
                value={legalBusinessName}
                onChange={(e) => setLegalBusinessName(e.target.value)}
                disabled={!canEdit}
                placeholder="e.g. KV Tours & Travels Private Limited"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Short Name (Compact Header &amp; Mobile)
              </label>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                disabled={!canEdit}
                placeholder="e.g. KV Tours"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Brand Tagline
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                disabled={!canEdit}
                placeholder="Luxury & Adventure Journeys"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Primary Logo URL
              </label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                disabled={!canEdit}
                placeholder="https://..."
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Favicon URL (.ico, .png)
              </label>
              <input
                type="text"
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                disabled={!canEdit}
                placeholder="https://..."
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              />
            </div>
          </div>

          {/* Color Palettes */}
          <div className="pt-4 border-t border-[#E4E5E7] space-y-4">
            <h3 className="text-xs uppercase tracking-wider font-bold text-[#202124]">
              Signature Luxury Palettes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {BRAND_PALETTES.map((pal) => (
                <div
                  key={pal.name}
                  onClick={() => {
                    setBrandPrimaryColor(pal.primary);
                    setBrandSecondaryColor(pal.secondary);
                    setBrandAccentColor(pal.accent);
                  }}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    brandPrimaryColor === pal.primary && brandSecondaryColor === pal.secondary
                      ? "border-[#24292F] bg-[#F7F7F5] shadow-xs"
                      : "border-[#E4E5E7] bg-white hover:border-[#D3D8DF]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full border shadow-2xs" style={{ backgroundColor: pal.primary }} />
                    <span className="w-5 h-5 rounded-full border shadow-2xs" style={{ backgroundColor: pal.secondary }} />
                    <span className="w-5 h-5 rounded-full border shadow-2xs" style={{ backgroundColor: pal.accent }} />
                    <span className="ml-auto text-[10px] font-bold text-[#70757A] uppercase">{pal.badge}</span>
                  </div>
                  <div className="text-xs font-bold text-[#202124]">{pal.name}</div>
                  <div className="text-[11px] text-[#70757A] mt-0.5">{pal.description}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Primary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandPrimaryColor}
                    onChange={(e) => setBrandPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-[#D3D8DF]"
                  />
                  <input
                    type="text"
                    value={brandPrimaryColor}
                    onChange={(e) => setBrandPrimaryColor(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-[#D3D8DF] text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Secondary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandSecondaryColor}
                    onChange={(e) => setBrandSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-[#D3D8DF]"
                  />
                  <input
                    type="text"
                    value={brandSecondaryColor}
                    onChange={(e) => setBrandSecondaryColor(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-[#D3D8DF] text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandAccentColor}
                    onChange={(e) => setBrandAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-[#D3D8DF]"
                  />
                  <input
                    type="text"
                    value={brandAccentColor}
                    onChange={(e) => setBrandAccentColor(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-[#D3D8DF] text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Typography */}
          <div className="pt-4 border-t border-[#E4E5E7] grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Primary Headings Font
              </label>
              <select
                value={primaryFont}
                onChange={(e) => setPrimaryFont(e.target.value)}
                disabled={!canEdit}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              >
                {PRIMARY_FONTS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Secondary Body Font
              </label>
              <select
                value={secondaryFont}
                onChange={(e) => setSecondaryFont(e.target.value)}
                disabled={!canEdit}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              >
                {SECONDARY_FONTS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E4E5E7] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[#70757A]">
              Changes to Agency Identity update navigation logos, short names, and colors across the website.
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={handleSaveAgencyProfile}
                disabled={saving || publishing}
                className="px-5 py-2.5 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 shrink-0"
              >
                <Save className="w-3.5 h-3.5 text-[#DFBA73]" />
                <span>{saving ? "Saving Branding..." : "Save Agency Branding"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: CONTACT & BUSINESS DETAILS
         ========================================================================= */}
      {activeTab === "contact" && (
        <div className="bg-white rounded-3xl border border-[#E4E5E7] p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-serif font-bold text-[#202124]">Contact &amp; Business Details</h2>
            <p className="text-xs text-[#70757A] mt-0.5">
              Direct inquiry phones, WhatsApp click-to-chat channels, office lounge address, and social links.
            </p>
          </div>

          {/* Direct Inquiries & Phones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Primary Phone
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                disabled={!canEdit}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Secondary Phone
              </label>
              <input
                type="text"
                value={secondaryPhone}
                onChange={(e) => setSecondaryPhone(e.target.value)}
                disabled={!canEdit}
                placeholder="+91 422 123456"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Support WhatsApp Number
              </label>
              <input
                type="text"
                value={supportWhatsapp}
                onChange={(e) => setSupportWhatsapp(e.target.value)}
                disabled={!canEdit}
                placeholder="+919876543210"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Emergency 24x7 Phone
              </label>
              <input
                type="text"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                disabled={!canEdit}
                placeholder="+91 98765 00000"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Primary Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={!canEdit}
                placeholder="info@kvtours.in"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                General Inquiries Email
              </label>
              <input
                type="email"
                value={generalInquiryEmail}
                onChange={(e) => setGeneralInquiryEmail(e.target.value)}
                disabled={!canEdit}
                placeholder="concierge@kvtours.in"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Customer Support Email
              </label>
              <input
                type="email"
                value={customerSupportEmail}
                onChange={(e) => setCustomerSupportEmail(e.target.value)}
                disabled={!canEdit}
                placeholder="support@kvtours.in"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Direct Booking Email
              </label>
              <input
                type="email"
                value={bookingEmail}
                onChange={(e) => setBookingEmail(e.target.value)}
                disabled={!canEdit}
                placeholder="bookings@kvtours.in"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Operating Business Hours
              </label>
              <input
                type="text"
                value={operatingHours}
                onChange={(e) => setOperatingHours(e.target.value)}
                disabled={!canEdit}
                placeholder="Mon - Sat: 9:00 AM - 7:00 PM"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              />
            </div>
          </div>

          {/* Physical Address */}
          <div className="pt-4 border-t border-[#E4E5E7] space-y-4">
            <h3 className="text-xs uppercase tracking-wider font-bold text-[#202124]">Physical Office &amp; Lounge Address</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Office Street Address
                </label>
                <input
                  type="text"
                  value={officeAddress}
                  onChange={(e) => setOfficeAddress(e.target.value)}
                  disabled={!canEdit}
                  placeholder="123 Luxury Boulevard, Race Course Road"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Coimbatore"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  State / Province
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Tamil Nadu"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  disabled={!canEdit}
                  placeholder="641018"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Country
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={!canEdit}
                  placeholder="India"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="pt-4 border-t border-[#E4E5E7] space-y-4">
            <h3 className="text-xs uppercase tracking-wider font-bold text-[#202124]">Social Media Channels &amp; Maps</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Instagram URL
                </label>
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://instagram.com/..."
                  className="w-full px-4 py-2 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Facebook URL
                </label>
                <input
                  type="url"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://facebook.com/..."
                  className="w-full px-4 py-2 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  YouTube URL
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://youtube.com/..."
                  className="w-full px-4 py-2 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://linkedin.com/..."
                  className="w-full px-4 py-2 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Twitter / X URL
                </label>
                <input
                  type="url"
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://x.com/..."
                  className="w-full px-4 py-2 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Google Maps Location URL
                </label>
                <input
                  type="url"
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-4 py-2 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Office Location Label / Milestone
                </label>
                <input
                  type="text"
                  value={officeLocationLabel}
                  onChange={(e) => setOfficeLocationLabel(e.target.value)}
                  disabled={!canEdit}
                  placeholder="KV Luxury Travel Lounge, Race Course Road"
                  className="w-full px-4 py-2 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Google Maps Embed Iframe URL
                </label>
                <input
                  type="url"
                  value={googleMapsEmbedUrl}
                  onChange={(e) => setGoogleMapsEmbedUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://www.google.com/maps/embed?pb=..."
                  className="w-full px-4 py-2 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E4E5E7] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[#70757A]">
              Contact and office address changes synchronize across the public footer, contact page, and WhatsApp channels.
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={handleSaveAgencyProfile}
                disabled={saving || publishing}
                className="px-5 py-2.5 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 shrink-0"
              >
                <Save className="w-3.5 h-3.5 text-[#DFBA73]" />
                <span>{saving ? "Saving Contact Details..." : "Save Contact & Business Details"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: SEO & SOCIAL SHARING
         ========================================================================= */}
      {activeTab === "seo" && (
        <div className="bg-white rounded-3xl border border-[#E4E5E7] p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-serif font-bold text-[#202124]">Homepage SEO &amp; Social Sharing</h2>
            <p className="text-xs text-[#70757A] mt-0.5">
              Customize title tags, meta description, and OpenGraph social thumbnail for the homepage.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                SEO Meta Title
              </label>
              <input
                type="text"
                value={content.seo_title || ""}
                onChange={(e) =>
                  setContent({ ...content, seo_title: e.target.value || null })
                }
                disabled={!canEdit}
                placeholder="KV Tours & Travels | Luxury & Adventure Journeys Coimbatore"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                SEO Meta Description
              </label>
              <textarea
                rows={2}
                value={content.seo_meta_description || ""}
                onChange={(e) =>
                  setContent({ ...content, seo_meta_description: e.target.value || null })
                }
                disabled={!canEdit}
                placeholder="Curated international holidays, private expeditions, and bespoke vacations by KV Tours & Travels."
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Social Share Image URL (OG Image)
              </label>
              <input
                type="url"
                value={content.seo_og_image || ""}
                onChange={(e) =>
                  setContent({ ...content, seo_og_image: e.target.value || null })
                }
                disabled={!canEdit}
                placeholder="/images/hero/hero-4k.webp"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Social Title (OpenGraph)
                </label>
                <input
                  type="text"
                  value={content.seo_social_title || ""}
                  onChange={(e) =>
                    setContent({ ...content, seo_social_title: e.target.value || null })
                  }
                  disabled={!canEdit}
                  placeholder="KV Tours & Travels | Bespoke Luxury Escapes"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Social Description (OpenGraph)
                </label>
                <input
                  type="text"
                  value={content.seo_social_description || ""}
                  onChange={(e) =>
                    setContent({ ...content, seo_social_description: e.target.value || null })
                  }
                  disabled={!canEdit}
                  placeholder="Explore world-class holidays and signature departures crafted from Coimbatore."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {previewMode && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col p-4 sm:p-8">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-[#E4E5E7] flex flex-col flex-1 max-w-6xl mx-auto w-full">
            <div className="px-6 py-4 border-b border-[#E4E5E7] flex items-center justify-between bg-[#F7F7F5]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-serif font-bold text-[#202124]">Homepage Hero Preview</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] uppercase font-bold tracking-wider">
                  Draft Mode
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center bg-[#E4E5E7] p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("desktop")}
                    className={`p-1.5 rounded-lg transition-all ${
                      previewMode === "desktop" ? "bg-[#24292F] text-white" : "text-[#70757A] hover:text-[#202124]"
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("mobile")}
                    className={`p-1.5 rounded-lg transition-all ${
                      previewMode === "mobile" ? "bg-[#24292F] text-white" : "text-[#70757A] hover:text-[#202124]"
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>

                <a
                  href="/?preview=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] text-xs font-semibold text-[#202124] flex items-center gap-1.5 shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Page</span>
                </a>

                <button
                  type="button"
                  onClick={() => setPreviewMode(null)}
                  className="p-1.5 rounded-xl text-[#70757A] hover:text-[#202124]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#ECEFF3] p-4 flex justify-center">
              <div
                className={`bg-black text-white min-h-full transition-all shadow-lg overflow-y-auto relative ${
                  previewMode === "mobile"
                    ? "w-[390px] rounded-3xl border-4 border-[#24292F]"
                    : "w-full max-w-5xl rounded-2xl"
                }`}
              >
                {/* Simulated Hero */}
                <div className="relative py-24 px-6 text-center overflow-hidden min-h-[460px] flex flex-col justify-center items-center">
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-40"
                    style={{ backgroundImage: `url(${content.hero.image_url || "/images/hero/hero-4k.webp"})` }}
                  />
                  <div className="relative z-10 max-w-2xl mx-auto space-y-4">
                    {content.hero.eyebrow?.trim() && (
                      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/20 bg-black/40 text-[10px] tracking-widest font-semibold uppercase text-[#F3E8D6]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#DFBA73]" />
                        <span>{content.hero.eyebrow}</span>
                      </div>
                    )}
                    {content.hero.heading?.trim() && (
                      <h1 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-tight">
                        {content.hero.heading}
                      </h1>
                    )}
                    {content.hero.description?.trim() && (
                      <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-light">
                        {content.hero.description}
                      </p>
                    )}

                    {/* Tags */}
                    {content.hero.popular_tags &&
                      content.hero.popular_tags.filter((t) => t && t.trim().length > 0).length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                          {content.hero.popular_tags
                            .filter((t) => t && t.trim().length > 0)
                            .map((tag) => (
                              <span key={tag} className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[10px]">
                                {tag}
                              </span>
                            ))}
                        </div>
                      )}

                    {/* CTAs */}
                    {(content.hero.primary_cta_text?.trim() ||
                      content.hero.secondary_cta_text?.trim() ||
                      content.hero.whatsapp_cta_text?.trim()) && (
                      <div className="pt-4 flex flex-wrap items-center justify-center gap-2.5">
                        {content.hero.primary_cta_text?.trim() && (
                          <span className="h-10 px-6 rounded-full bg-[#DFBA73] text-[#1B1E22] text-xs font-bold uppercase tracking-wider flex items-center justify-center">
                            {content.hero.primary_cta_text}
                          </span>
                        )}
                        {content.hero.secondary_cta_text?.trim() && (
                          <span className="h-10 px-5 rounded-full bg-white/15 text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center">
                            {content.hero.secondary_cta_text}
                          </span>
                        )}
                        {content.hero.whatsapp_cta_text?.trim() && (
                          <span className="h-10 px-5 rounded-full border border-[#A7E2CB]/50 bg-[#0D7A53]/30 text-[#A7E2CB] text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5">
                            <span>{content.hero.whatsapp_cta_text}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Floating Trust Indicators */}
                    {content.trust_indicators &&
                      content.trust_indicators.some((t) => t.label?.trim()) && (
                        <div className="pt-6 flex flex-wrap items-center justify-center gap-6 border-t border-white/10 text-[10px] uppercase tracking-wider text-white/80">
                          {content.trust_indicators
                            .filter((t) => t.label?.trim())
                            .map((t, i) => (
                              <span key={i} className="flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-[#DFBA73]" />
                                <span>{t.label}</span>
                              </span>
                            ))}
                        </div>
                      )}
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
