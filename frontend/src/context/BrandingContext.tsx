"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { publicCatalogApi, type PublicSiteSettings } from "@/lib/api";
import {
  DEFAULT_BUSINESS_PHONE,
  DEFAULT_WHATSAPP_NUMBER,
  getCleanWhatsAppNumber,
  getWhatsAppClickToChatUrl,
} from "@/lib/constants";

export interface BrandingContextValue {
  settings: PublicSiteSettings | null;
  loading: boolean;
  displayName: string;
  agencyName: string;
  shortName: string;
  legalName: string;
  tagline: string;
  logoUrl: string | null;
  secondaryLogoUrl: string | null;
  faviconUrl: string | null;
  initials: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  pdfHeaderTitle: string;
  pdfHeaderSubtitle: string;
  pdfOfficeAddress: string;
  pdfContactInfo: string;
  pdfCheckinInstructions: string;
  pdfLogisticsNotice: string;
  pdfHelplineInfo: string;
  pdfFooterDeclaration: string;
  pdfBadgeLabel: string;
  pdfLogoUrl: string | null;
  heroHeadline: string;
  heroSubtitle: string;
  businessDescription: string;
  conciergeLabel: string;
  whatsappEnabled: boolean;
  whatsappCountryCode: string;
  whatsappShowFloatingConcierge: boolean;
  whatsappShowHeaderButton: boolean;
  whatsappShowOnHomepage: boolean;
  whatsappShowOnFooter: boolean;
  whatsappShowOnPackagePages: boolean;
  whatsappShowOnContactPage: boolean;
  getWhatsAppUrl: (prefilledMessage?: string) => string;
  updateBranding: (partial: Partial<PublicSiteSettings>) => void;
  refresh: () => Promise<PublicSiteSettings | null>;
}

const DEFAULT_SETTINGS: PublicSiteSettings = {
  agency_name: "Luxury Travel Concierge",
  public_display_name: "Luxury Travel Concierge",
  short_name: "Travel Concierge",
  tagline: "Curated Journeys & Bespoke Expeditions",
  agency_location: "Private Client Lounge",
  office_address: "",
  city: "",
  state: "",
  contact_email: "",
  contact_phone: "",
  whatsapp_number: "",
  currency: "INR",
  instagram_handle: "",
};

const BROADCAST_CHANNEL_NAME = "agency_branding_sync_channel";

// Module-level in-flight request deduplicator to prevent concurrent calls
let inFlightSettingsPromise: Promise<PublicSiteSettings> | null = null;
let inMemoryCachedSettings: PublicSiteSettings | null = null;

function computeInitials(name?: string | null): string {
  if (!name || !name.trim()) return "TA";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

function applyThemeTokens(primary?: string | null, secondary?: string | null, accent?: string | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (primary && primary.trim()) {
    root.style.setProperty("--smoke-primary", primary.trim());
    root.style.setProperty("--brand-primary", primary.trim());
    root.style.setProperty("--color-smoke-primary", primary.trim());
  }
  if (secondary && secondary.trim()) {
    root.style.setProperty("--brand-secondary", secondary.trim());
  }
  if (accent && accent.trim()) {
    root.style.setProperty("--brand-accent", accent.trim());
    root.style.setProperty("--smoke-accent", accent.trim());
  }
}

function applyFavicon(faviconUrl?: string | null) {
  if (typeof document === "undefined" || !faviconUrl) return;
  try {
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "shortcut icon";
      document.getElementsByTagName("head")[0].appendChild(link);
    }
    link.href = faviconUrl;
  } catch (err) {
    console.warn("Could not update favicon:", err);
  }
}

function applyDocumentTitle(name?: string | null, tagline?: string | null) {
  if (typeof document === "undefined" || !name) return;
  const current = document.title;
  if (!current || !current.includes("|")) {
    document.title = tagline ? `${name} | ${tagline}` : name;
    return;
  }
  const parts = current.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    document.title = tagline ? `${name} | ${tagline}` : name;
    return;
  }

  // Known root/tagline patterns or if parts[0] was the old agency name
  const knownPageNames = [
    "overview",
    "dashboard",
    "my bookings",
    "bookings",
    "saved travellers",
    "travellers",
    "profile",
    "profile & security",
    "about",
    "about us",
    "contact",
    "contact us",
    "packages",
    "package details",
    "destinations",
    "destination",
    "custom trip",
    "group trips",
    "inquiries",
    "admin",
    "admin portal",
    "login",
    "register",
    "checkout",
    "payment",
    "booking confirmation",
  ];

  const firstPartLower = parts[0].toLowerCase();
  const isFirstPartPageName = knownPageNames.some((k) => firstPartLower.includes(k));

  if (isFirstPartPageName) {
    // e.g. "My Bookings | Old Brand" -> "My Bookings | New Brand"
    document.title = `${parts[0]} | ${name}`;
  } else {
    // e.g. "Old Brand | Tagline" or "Old Brand | New Brand" -> "New Brand | Tagline"
    const resolvedTagline = tagline || (parts.length > 1 ? parts[1] : "");
    document.title = resolvedTagline ? `${name} | ${resolvedTagline}` : name;
  }
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

export function BrandingProvider({
  children,
  initialSettings,
}: {
  children: ReactNode;
  initialSettings?: PublicSiteSettings | null;
}) {
  const [settings, setSettings] = useState<PublicSiteSettings | null>(
    () => initialSettings || inMemoryCachedSettings
  );
  const [loading, setLoading] = useState<boolean>(!initialSettings && !inMemoryCachedSettings);

  const fetchBranding = useCallback(async (): Promise<PublicSiteSettings | null> => {
    if (inFlightSettingsPromise) {
      return await inFlightSettingsPromise;
    }
    try {
      inFlightSettingsPromise = publicCatalogApi.getSettings();
      const res = await inFlightSettingsPromise;
      inMemoryCachedSettings = res;
      setSettings(res);
      return res;
    } catch (err) {
      console.warn("Failed to fetch public site branding settings:", err);
      return null;
    } finally {
      inFlightSettingsPromise = null;
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!settings) {
      fetchBranding();
    } else {
      setLoading(false);
    }
  }, [settings, fetchBranding]);

  // Synchronize dynamic tokens, favicon, and tab title on settings change
  useEffect(() => {
    if (!settings) return;
    applyThemeTokens(
      settings.brand_primary_color,
      settings.brand_secondary_color,
      settings.brand_accent_color
    );
    if (settings.favicon_url) {
      applyFavicon(settings.favicon_url);
    }
    const name = settings.public_display_name || settings.agency_name;
    if (name) {
      applyDocumentTitle(name, settings.tagline);
    }
  }, [settings]);

  // Cross-tab broadcast channel listener
  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
      return;
    }

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent) => {
        if (event.data?.type === "BRANDING_UPDATED" && event.data?.settings) {
          const updated = event.data.settings as PublicSiteSettings;
          inMemoryCachedSettings = updated;
          setSettings(updated);
        }
      };
    } catch {
      // Fallback if BroadcastChannel unavailable in browser
    }

    return () => {
      channel?.close();
    };
  }, []);

  const updateBranding = useCallback(
    (partial: Partial<PublicSiteSettings>) => {
      setSettings((prev) => {
        const next: PublicSiteSettings = {
          ...(prev || DEFAULT_SETTINGS),
          ...partial,
        };
        inMemoryCachedSettings = next;

        // Apply immediately
        applyThemeTokens(
          next.brand_primary_color,
          next.brand_secondary_color,
          next.brand_accent_color
        );
        if (next.favicon_url) {
          applyFavicon(next.favicon_url);
        }
        const name = next.public_display_name || next.agency_name;
        if (name) {
          applyDocumentTitle(name, next.tagline);
        }

        // Broadcast to other tabs
        try {
          if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
            const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
            channel.postMessage({ type: "BRANDING_UPDATED", settings: next });
            channel.close();
          }
        } catch {
          // ignore broadcast errors
        }

        return next;
      });
    },
    []
  );

  const displayName = useMemo(() => {
    return (
      settings?.public_display_name ||
      settings?.agency_name ||
      "Travel Agency"
    );
  }, [settings?.public_display_name, settings?.agency_name]);

  const agencyName = useMemo(() => {
    return settings?.agency_name || displayName;
  }, [settings?.agency_name, displayName]);

  const shortName = useMemo(() => {
    // If short_name was explicitly set to empty string, distinguish from unconfigured
    if (settings?.short_name !== undefined && settings.short_name !== null) {
      return settings.short_name;
    }
    return displayName;
  }, [settings?.short_name, displayName]);

  const legalName = useMemo(() => {
    return settings?.legal_business_name || displayName;
  }, [settings?.legal_business_name, displayName]);

  const tagline = useMemo(() => {
    return settings?.tagline ?? "";
  }, [settings?.tagline]);

  const logoUrl = useMemo(() => {
    return settings?.logo_url || null;
  }, [settings?.logo_url]);

  const secondaryLogoUrl = useMemo(() => {
    return settings?.secondary_logo_url || null;
  }, [settings?.secondary_logo_url]);

  const faviconUrl = useMemo(() => {
    return settings?.favicon_url || null;
  }, [settings?.favicon_url]);

  const initials = useMemo(() => {
    return computeInitials(shortName || displayName);
  }, [shortName, displayName]);

  const phone = useMemo(() => {
    return settings?.contact_phone || DEFAULT_BUSINESS_PHONE;
  }, [settings?.contact_phone]);

  const whatsapp = useMemo(() => {
    return (
      settings?.whatsapp_number ||
      settings?.support_whatsapp ||
      DEFAULT_WHATSAPP_NUMBER
    );
  }, [settings?.whatsapp_number, settings?.support_whatsapp]);

  const whatsappCountryCode = useMemo(() => {
    return settings?.whatsapp_country_code || "+91";
  }, [settings?.whatsapp_country_code]);

  const whatsappEnabled = useMemo(() => {
    return settings?.whatsapp_enabled !== false;
  }, [settings?.whatsapp_enabled]);

  const whatsappShowFloatingConcierge = useMemo(() => {
    return (
      settings?.whatsapp_show_floating_concierge ??
      settings?.whatsapp_concierge_floating ??
      true
    );
  }, [settings?.whatsapp_show_floating_concierge, settings?.whatsapp_concierge_floating]);

  const whatsappShowHeaderButton = useMemo(() => {
    return settings?.whatsapp_show_header_button !== false;
  }, [settings?.whatsapp_show_header_button]);

  const whatsappShowOnHomepage = useMemo(() => {
    return settings?.whatsapp_show_on_homepage !== false;
  }, [settings?.whatsapp_show_on_homepage]);

  const whatsappShowOnFooter = useMemo(() => {
    return settings?.whatsapp_show_on_footer !== false;
  }, [settings?.whatsapp_show_on_footer]);

  const whatsappShowOnPackagePages = useMemo(() => {
    return settings?.whatsapp_show_on_package_pages !== false;
  }, [settings?.whatsapp_show_on_package_pages]);

  const whatsappShowOnContactPage = useMemo(() => {
    return settings?.whatsapp_show_on_contact_page !== false;
  }, [settings?.whatsapp_show_on_contact_page]);

  const email = useMemo(() => {
    return settings?.contact_email || "contact@travelagency.com";
  }, [settings?.contact_email]);

  const address = useMemo(() => {
    return settings?.office_address || settings?.public_office_address || "";
  }, [settings?.office_address, settings?.public_office_address]);

  const city = useMemo(() => {
    return settings?.city || "";
  }, [settings?.city]);

  const state = useMemo(() => {
    return settings?.state || "";
  }, [settings?.state]);

  const country = useMemo(() => {
    return settings?.country || "India";
  }, [settings?.country]);

  const primaryColor = useMemo(() => {
    return settings?.brand_primary_color || "#24292F";
  }, [settings?.brand_primary_color]);

  const secondaryColor = useMemo(() => {
    return settings?.brand_secondary_color || "#C5A880";
  }, [settings?.brand_secondary_color]);

  const accentColor = useMemo(() => {
    return settings?.brand_accent_color || "#D4AF37";
  }, [settings?.brand_accent_color]);

  const pdfHeaderTitle = useMemo(() => {
    return settings?.pdf_header_title?.trim() || legalName || displayName;
  }, [settings?.pdf_header_title, legalName, displayName]);

  const pdfHeaderSubtitle = useMemo(() => {
    if (settings?.pdf_header_subtitle?.trim()) {
      return settings.pdf_header_subtitle.trim();
    }
    const locationPart = settings?.agency_location || city || "Operations Hub";
    return tagline
      ? `${tagline} • ${locationPart}`
      : `Bespoke Luxury & Adventure Journeys • ${locationPart}`;
  }, [settings?.pdf_header_subtitle, settings?.agency_location, city, tagline]);

  const pdfOfficeAddress = useMemo(() => {
    return (
      settings?.pdf_office_address?.trim() ||
      address ||
      "Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu 641012, India"
    );
  }, [settings?.pdf_office_address, address]);

  const pdfContactInfo = useMemo(() => {
    if (settings?.pdf_contact_info?.trim()) {
      return settings.pdf_contact_info.trim();
    }
    const parts = [
      phone ? `Concierge Desk: ${phone}` : null,
      email ? email : null,
      settings?.website_url ? settings.website_url : null,
    ].filter(Boolean);
    return parts.length > 0
      ? parts.join(" | ")
      : `Concierge Desk: ${phone} | ${email}`;
  }, [settings?.pdf_contact_info, phone, email, settings?.website_url]);

  const pdfCheckinInstructions = useMemo(() => {
    return (
      settings?.pdf_checkin_instructions?.trim() ||
      "Please present this official electronic voucher along with original government photo identification (or passport for international travel) during hotel check-in and departure assembly."
    );
  }, [settings?.pdf_checkin_instructions]);

  const pdfLogisticsNotice = useMemo(() => {
    return (
      settings?.pdf_logistics_notice?.trim() ||
      "Scheduled chauffeured transfers and curated excursions are confirmed as per the booked itinerary. Your travel host details will be notified 24 hours prior to departure."
    );
  }, [settings?.pdf_logistics_notice]);

  const pdfHelplineInfo = useMemo(() => {
    if (settings?.pdf_helpline_info?.trim()) {
      return settings.pdf_helpline_info.trim();
    }
    const location = settings?.agency_location || city || "Operations";
    return `${location} Operations Desk: ${phone} | Priority WhatsApp Desk: ${whatsapp} | ${email}`;
  }, [settings?.pdf_helpline_info, settings?.agency_location, city, phone, whatsapp, email]);

  const pdfFooterDeclaration = useMemo(() => {
    if (settings?.pdf_footer_declaration?.trim()) {
      return settings.pdf_footer_declaration.trim();
    }
    const title = legalName || displayName;
    const location = settings?.agency_location || city || "Portal";
    return `${title} Operations • ${location}\nComputer-generated authoritative travel document • Valid without physical signature`;
  }, [settings?.pdf_footer_declaration, legalName, displayName, settings?.agency_location, city]);

  const pdfBadgeLabel = useMemo(() => {
    return settings?.pdf_badge_label?.trim() || "Official Travel Voucher & Receipt";
  }, [settings?.pdf_badge_label]);

  const pdfLogoUrl = useMemo(() => {
    return settings?.pdf_logo_url?.trim() || logoUrl || null;
  }, [settings?.pdf_logo_url, logoUrl]);

  const heroHeadline = useMemo(() => {
    return settings?.hero_headline?.trim() || "Every journey, thoughtfully designed.";
  }, [settings?.hero_headline]);

  const heroSubtitle = useMemo(() => {
    return (
      settings?.hero_subtitle?.trim() ||
      settings?.business_description?.trim() ||
      tagline ||
      "Sign in to manage your bookings, download luxury travel itineraries, and contact your dedicated concierge."
    );
  }, [settings?.hero_subtitle, settings?.business_description, tagline]);

  const businessDescription = useMemo(() => {
    return settings?.business_description?.trim() || "";
  }, [settings?.business_description]);

  const conciergeLabel = useMemo(() => {
    return (
      settings?.pdf_badge_label?.trim() ||
      settings?.contact_cta_text?.trim() ||
      "Signature Concierge"
    );
  }, [settings?.pdf_badge_label, settings?.contact_cta_text]);

  const getWhatsAppUrl = useCallback(
    (prefilledMessage?: string) => {
      if (settings?.whatsapp_enabled === false) {
        return "";
      }
      const msg =
        prefilledMessage ||
        settings?.whatsapp_prefilled_message ||
        `Hi ${displayName}, I would like to enquire about your travel packages.`;
      return getWhatsAppClickToChatUrl(whatsapp, msg, whatsappCountryCode);
    },
    [whatsapp, whatsappCountryCode, settings?.whatsapp_enabled, settings?.whatsapp_prefilled_message, displayName]
  );

  const value = useMemo<BrandingContextValue>(
    () => ({
      settings,
      loading,
      displayName,
      agencyName,
      shortName,
      legalName,
      tagline,
      logoUrl,
      secondaryLogoUrl,
      faviconUrl,
      initials,
      phone,
      whatsapp,
      email,
      address,
      city,
      state,
      country,
      primaryColor,
      secondaryColor,
      accentColor,
      pdfHeaderTitle,
      pdfHeaderSubtitle,
      pdfOfficeAddress,
      pdfContactInfo,
      pdfCheckinInstructions,
      pdfLogisticsNotice,
      pdfHelplineInfo,
      pdfFooterDeclaration,
      pdfBadgeLabel,
      pdfLogoUrl,
      heroHeadline,
      heroSubtitle,
      businessDescription,
      conciergeLabel,
      whatsappEnabled,
      whatsappCountryCode,
      whatsappShowFloatingConcierge,
      whatsappShowHeaderButton,
      whatsappShowOnHomepage,
      whatsappShowOnFooter,
      whatsappShowOnPackagePages,
      whatsappShowOnContactPage,
      getWhatsAppUrl,
      updateBranding,
      refresh: fetchBranding,
    }),
    [
      settings,
      loading,
      displayName,
      agencyName,
      shortName,
      legalName,
      tagline,
      logoUrl,
      secondaryLogoUrl,
      faviconUrl,
      initials,
      phone,
      whatsapp,
      email,
      address,
      city,
      state,
      country,
      primaryColor,
      secondaryColor,
      accentColor,
      pdfHeaderTitle,
      pdfHeaderSubtitle,
      pdfOfficeAddress,
      pdfContactInfo,
      pdfCheckinInstructions,
      pdfLogisticsNotice,
      pdfHelplineInfo,
      pdfFooterDeclaration,
      pdfBadgeLabel,
      pdfLogoUrl,
      heroHeadline,
      heroSubtitle,
      businessDescription,
      conciergeLabel,
      whatsappEnabled,
      whatsappCountryCode,
      whatsappShowFloatingConcierge,
      whatsappShowHeaderButton,
      whatsappShowOnHomepage,
      whatsappShowOnFooter,
      whatsappShowOnPackagePages,
      whatsappShowOnContactPage,
      getWhatsAppUrl,
      updateBranding,
      fetchBranding,
    ]
  );

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): BrandingContextValue {
  const context = useContext(BrandingContext);
  if (!context) {
    // If rendered outside provider (e.g. tests or isolated components), return graceful defaults
    return {
      settings: DEFAULT_SETTINGS,
      loading: false,
      displayName: DEFAULT_SETTINGS.public_display_name || "Luxury Travel Concierge",
      agencyName: DEFAULT_SETTINGS.agency_name,
      shortName: DEFAULT_SETTINGS.short_name || "Concierge",
      legalName: DEFAULT_SETTINGS.agency_name,
      tagline: DEFAULT_SETTINGS.tagline,
      logoUrl: null,
      secondaryLogoUrl: null,
      faviconUrl: null,
      initials: "TC",
      phone: DEFAULT_BUSINESS_PHONE,
      whatsapp: DEFAULT_WHATSAPP_NUMBER,
      email: DEFAULT_SETTINGS.contact_email,
      address: DEFAULT_SETTINGS.office_address,
      city: "",
      state: "",
      country: "India",
      primaryColor: "#1C2420",
      secondaryColor: "#C5A880",
      accentColor: "#D4AF37",
      pdfHeaderTitle: DEFAULT_SETTINGS.public_display_name || "LUXURY TRAVEL CONCIERGE",
      pdfHeaderSubtitle: "BESPOKE LUXURY & ADVENTURE JOURNEYS",
      pdfOfficeAddress: "",
      pdfContactInfo: "",
      pdfCheckinInstructions:
        "Please present this official electronic voucher along with original government photo identification during check-in.",
      pdfLogisticsNotice:
        "Scheduled transfers and curated excursions are confirmed as per the booked itinerary.",
      pdfHelplineInfo: "Operations Desk & Concierge Support",
      pdfFooterDeclaration:
        "Computer-generated authoritative travel document • Valid without physical signature",
      pdfBadgeLabel: "Signature Concierge",
      pdfLogoUrl: null,
      heroHeadline: "Every journey, thoughtfully designed.",
      heroSubtitle: "Sign in to manage your bookings, download luxury travel itineraries, and contact your dedicated concierge.",
      businessDescription: "",
      conciergeLabel: "Signature Concierge",
      whatsappEnabled: true,
      whatsappCountryCode: "+91",
      whatsappShowFloatingConcierge: true,
      whatsappShowHeaderButton: true,
      whatsappShowOnHomepage: true,
      whatsappShowOnFooter: true,
      whatsappShowOnPackagePages: true,
      whatsappShowOnContactPage: true,
      getWhatsAppUrl: (msg?: string) =>
        getWhatsAppClickToChatUrl(
          DEFAULT_WHATSAPP_NUMBER,
          msg || "Hi, I would like to enquire about your travel packages.",
          "+91"
        ),
      updateBranding: () => {},
      refresh: async () => DEFAULT_SETTINGS,
    };
  }
  return context;
}
