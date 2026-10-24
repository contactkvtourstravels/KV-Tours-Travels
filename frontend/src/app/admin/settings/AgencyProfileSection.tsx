"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Building,
  Phone,
  Mail,
  MapPin,
  Globe,
  Clock,
  Save,
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
  ExternalLink,
  Palette,
  Type,
  Upload,
  ImageIcon,
  Sparkles,
  Share2,
  Search,
  Navigation,
  Check,
  Compass,
} from "lucide-react";
import { adminApi, AdminSiteSettings } from "@/lib/api";
import { useBranding } from "@/context/BrandingContext";

interface AgencyProfileSectionProps {
  settings: AdminSiteSettings;
  canEdit: boolean;
  onSaved: (updated: AdminSiteSettings) => void;
  onDirtyChange: (isDirty: boolean) => void;
}

type ProfileSubTab = "identity" | "contact" | "social" | "maps" | "seo";

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

export default function AgencyProfileSection({
  settings,
  canEdit,
  onSaved,
  onDirtyChange,
}: AgencyProfileSectionProps) {
  const { updateBranding } = useBranding();
  const [activeSubTab, setActiveSubTab] = useState<ProfileSubTab>("identity");

  // 1. Business Identity
  const [legalName, setLegalName] = useState(settings.legal_business_name || "");
  const [displayName, setDisplayName] = useState(settings.public_display_name || settings.agency_name || "");
  const [shortName, setShortName] = useState(settings.short_name || "");
  const [tagline, setTagline] = useState(settings.tagline || "");
  const [logoUrl, setLogoUrl] = useState(settings.logo_url || "");
  const [secondaryLogoUrl, setSecondaryLogoUrl] = useState(settings.secondary_logo_url || "");
  const [faviconUrl, setFaviconUrl] = useState(settings.favicon_url || "");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState(settings.brand_primary_color || "#24292F");
  const [brandSecondaryColor, setBrandSecondaryColor] = useState(settings.brand_secondary_color || "#C5A880");
  const [brandAccentColor, setBrandAccentColor] = useState(settings.brand_accent_color || "#D4AF37");
  const [primaryFont, setPrimaryFont] = useState(settings.primary_font || "Playfair Display");
  const [secondaryFont, setSecondaryFont] = useState(settings.secondary_font || "Inter");
  const [yearEstablished, setYearEstablished] = useState(settings.year_established?.toString() || "");
  const [registrationNumber, setRegistrationNumber] = useState(settings.registration_number || "");
  const [taxId, setTaxId] = useState(settings.tax_id || "");
  const [description, setDescription] = useState(settings.business_description || "");
  const [registeredAddress, setRegisteredAddress] = useState(settings.registered_office_address || "");
  const [officeAddress, setOfficeAddress] = useState(settings.office_address || "");
  const [city, setCity] = useState(settings.city || "Coimbatore");
  const [state, setState] = useState(settings.state || "Tamil Nadu");
  const [postalCode, setPostalCode] = useState(settings.postal_code || "641012");
  const [country, setCountry] = useState(settings.country || "India");
  const [timeZone, setTimeZone] = useState(settings.time_zone || "Asia/Kolkata");
  const [currency, setCurrency] = useState(settings.currency || "INR");

  // 2. Contact Information
  const [contactPhone, setContactPhone] = useState(settings.contact_phone || "");
  const [secondaryPhone, setSecondaryPhone] = useState(settings.secondary_phone || "");
  const [supportWhatsapp, setSupportWhatsapp] = useState(settings.support_whatsapp || settings.whatsapp_number || "");
  const [emergencyPhone, setEmergencyPhone] = useState(settings.emergency_phone || "");
  const [contactEmail, setContactEmail] = useState(settings.contact_email || "");
  const [supportEmail, setSupportEmail] = useState(settings.customer_support_email || "");
  const [bookingEmail, setBookingEmail] = useState(settings.booking_email || "");
  const [inquiryEmail, setInquiryEmail] = useState(settings.general_inquiry_email || "");
  const [replyToEmail, setReplyToEmail] = useState(settings.reply_to_email || "");
  const [operatingHours, setOperatingHours] = useState(settings.operating_hours || settings.business_hours || "Mon - Sat: 9:00 AM - 7:00 PM");
  const [holidayNotice, setHolidayNotice] = useState(settings.holiday_notice || "");
  const [contactInstructions, setContactInstructions] = useState(settings.office_contact_instructions || "");

  // 3. Social Media
  const [instagramHandle, setInstagramHandle] = useState(settings.instagram_handle || "");
  const [instagramUrl, setInstagramUrl] = useState(settings.instagram_url || "");
  const [facebookUrl, setFacebookUrl] = useState(settings.facebook_url || "");
  const [youtubeUrl, setYoutubeUrl] = useState(settings.youtube_url || "");
  const [linkedinUrl, setLinkedinUrl] = useState(settings.linkedin_url || "");
  const [twitterUrl, setTwitterUrl] = useState(settings.twitter_url || "");
  const [websiteUrl, setWebsiteUrl] = useState(settings.website_url || "");

  // 4. Google Maps & Office Location
  const [googleMapsUrl, setGoogleMapsUrl] = useState(settings.google_maps_url || "");
  const [googleMapsEmbedUrl, setGoogleMapsEmbedUrl] = useState(settings.google_maps_embed_url || "");
  const [officeLocationLabel, setOfficeLocationLabel] = useState(settings.office_location_label || "");
  const [googleMapsDirectionsUrl, setGoogleMapsDirectionsUrl] = useState(settings.google_maps_directions_url || "");
  const [googleMapsLatitude, setGoogleMapsLatitude] = useState(settings.google_maps_latitude?.toString() || "");
  const [googleMapsLongitude, setGoogleMapsLongitude] = useState(settings.google_maps_longitude?.toString() || "");
  const [googleMapsZoom, setGoogleMapsZoom] = useState(settings.google_maps_zoom?.toString() || "15");
  const [googleMapsDisplayEnabled, setGoogleMapsDisplayEnabled] = useState(settings.google_maps_display_enabled ?? true);

  // 5. SEO & Social Sharing
  const [seoWebsiteTitle, setSeoWebsiteTitle] = useState(settings.seo_website_title || "");
  const [seoMetaDescription, setSeoMetaDescription] = useState(settings.seo_meta_description || "");
  const [seoOgImageUrl, setSeoOgImageUrl] = useState(settings.seo_og_image_url || "");
  const [seoSocialTitle, setSeoSocialTitle] = useState(settings.seo_social_title || "");
  const [seoSocialDescription, setSeoSocialDescription] = useState(settings.seo_social_description || "");

  // UI States
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // File Input References
  const logoInputRef = useRef<HTMLInputElement>(null);
  const secondaryLogoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const ogImageInputRef = useRef<HTMLInputElement>(null);

  // Synchronize state when settings prop updates
  useEffect(() => {
    setLegalName(settings.legal_business_name || "");
    setDisplayName(settings.public_display_name || settings.agency_name || "");
    setShortName(settings.short_name || "");
    setTagline(settings.tagline || "");
    setLogoUrl(settings.logo_url || "");
    setSecondaryLogoUrl(settings.secondary_logo_url || "");
    setFaviconUrl(settings.favicon_url || "");
    setBrandPrimaryColor(settings.brand_primary_color || "#24292F");
    setBrandSecondaryColor(settings.brand_secondary_color || "#C5A880");
    setBrandAccentColor(settings.brand_accent_color || "#D4AF37");
    setPrimaryFont(settings.primary_font || "Playfair Display");
    setSecondaryFont(settings.secondary_font || "Inter");
    setYearEstablished(settings.year_established?.toString() || "");
    setRegistrationNumber(settings.registration_number || "");
    setTaxId(settings.tax_id || "");
    setDescription(settings.business_description || "");
    setOfficeAddress(settings.office_address || "");
    setRegisteredAddress(settings.registered_office_address || "");
    setCity(settings.city || "Coimbatore");
    setState(settings.state || "Tamil Nadu");
    setPostalCode(settings.postal_code || "641012");
    setCountry(settings.country || "India");
    setTimeZone(settings.time_zone || "Asia/Kolkata");
    setCurrency(settings.currency || "INR");

    setContactPhone(settings.contact_phone || "");
    setSecondaryPhone(settings.secondary_phone || "");
    setSupportWhatsapp(settings.support_whatsapp || settings.whatsapp_number || "");
    setEmergencyPhone(settings.emergency_phone || "");
    setContactEmail(settings.contact_email || "");
    setSupportEmail(settings.customer_support_email || "");
    setBookingEmail(settings.booking_email || "");
    setInquiryEmail(settings.general_inquiry_email || "");
    setReplyToEmail(settings.reply_to_email || "");
    setOperatingHours(settings.operating_hours || settings.business_hours || "Mon - Sat: 9:00 AM - 7:00 PM");
    setHolidayNotice(settings.holiday_notice || "");
    setContactInstructions(settings.office_contact_instructions || "");

    setInstagramHandle(settings.instagram_handle || "");
    setInstagramUrl(settings.instagram_url || "");
    setFacebookUrl(settings.facebook_url || "");
    setYoutubeUrl(settings.youtube_url || "");
    setLinkedinUrl(settings.linkedin_url || "");
    setTwitterUrl(settings.twitter_url || "");
    setWebsiteUrl(settings.website_url || "");

    setGoogleMapsUrl(settings.google_maps_url || "");
    setGoogleMapsEmbedUrl(settings.google_maps_embed_url || "");
    setOfficeLocationLabel(settings.office_location_label || "");
    setGoogleMapsDirectionsUrl(settings.google_maps_directions_url || "");
    setGoogleMapsLatitude(settings.google_maps_latitude?.toString() || "");
    setGoogleMapsLongitude(settings.google_maps_longitude?.toString() || "");
    setGoogleMapsZoom(settings.google_maps_zoom?.toString() || "15");
    setGoogleMapsDisplayEnabled(settings.google_maps_display_enabled ?? true);

    setSeoWebsiteTitle(settings.seo_website_title || "");
    setSeoMetaDescription(settings.seo_meta_description || "");
    setSeoOgImageUrl(settings.seo_og_image_url || "");
    setSeoSocialTitle(settings.seo_social_title || "");
    setSeoSocialDescription(settings.seo_social_description || "");
  }, [settings]);

  // Track Unsaved Changes
  useEffect(() => {
    const isDirty =
      legalName !== (settings.legal_business_name || "") ||
      displayName !== (settings.public_display_name || settings.agency_name || "") ||
      shortName !== (settings.short_name || "") ||
      tagline !== (settings.tagline || "") ||
      logoUrl !== (settings.logo_url || "") ||
      secondaryLogoUrl !== (settings.secondary_logo_url || "") ||
      faviconUrl !== (settings.favicon_url || "") ||
      brandPrimaryColor !== (settings.brand_primary_color || "#24292F") ||
      brandSecondaryColor !== (settings.brand_secondary_color || "#C5A880") ||
      brandAccentColor !== (settings.brand_accent_color || "#D4AF37") ||
      primaryFont !== (settings.primary_font || "Playfair Display") ||
      secondaryFont !== (settings.secondary_font || "Inter") ||
      yearEstablished !== (settings.year_established?.toString() || "") ||
      registrationNumber !== (settings.registration_number || "") ||
      taxId !== (settings.tax_id || "") ||
      description !== (settings.business_description || "") ||
      registeredAddress !== (settings.registered_office_address || "") ||
      officeAddress !== (settings.office_address || "") ||
      city !== (settings.city || "Coimbatore") ||
      state !== (settings.state || "Tamil Nadu") ||
      postalCode !== (settings.postal_code || "641012") ||
      country !== (settings.country || "India") ||
      timeZone !== (settings.time_zone || "Asia/Kolkata") ||
      currency !== (settings.currency || "INR") ||
      contactPhone !== (settings.contact_phone || "") ||
      secondaryPhone !== (settings.secondary_phone || "") ||
      supportWhatsapp !== (settings.support_whatsapp || settings.whatsapp_number || "") ||
      emergencyPhone !== (settings.emergency_phone || "") ||
      contactEmail !== (settings.contact_email || "") ||
      supportEmail !== (settings.customer_support_email || "") ||
      bookingEmail !== (settings.booking_email || "") ||
      inquiryEmail !== (settings.general_inquiry_email || "") ||
      replyToEmail !== (settings.reply_to_email || "") ||
      operatingHours !== (settings.operating_hours || settings.business_hours || "Mon - Sat: 9:00 AM - 7:00 PM") ||
      holidayNotice !== (settings.holiday_notice || "") ||
      contactInstructions !== (settings.office_contact_instructions || "") ||
      instagramHandle !== (settings.instagram_handle || "") ||
      instagramUrl !== (settings.instagram_url || "") ||
      facebookUrl !== (settings.facebook_url || "") ||
      youtubeUrl !== (settings.youtube_url || "") ||
      linkedinUrl !== (settings.linkedin_url || "") ||
      twitterUrl !== (settings.twitter_url || "") ||
      websiteUrl !== (settings.website_url || "") ||
      googleMapsUrl !== (settings.google_maps_url || "") ||
      googleMapsEmbedUrl !== (settings.google_maps_embed_url || "") ||
      officeLocationLabel !== (settings.office_location_label || "") ||
      googleMapsDirectionsUrl !== (settings.google_maps_directions_url || "") ||
      googleMapsLatitude !== (settings.google_maps_latitude?.toString() || "") ||
      googleMapsLongitude !== (settings.google_maps_longitude?.toString() || "") ||
      googleMapsZoom !== (settings.google_maps_zoom?.toString() || "15") ||
      googleMapsDisplayEnabled !== (settings.google_maps_display_enabled ?? true) ||
      seoWebsiteTitle !== (settings.seo_website_title || "") ||
      seoMetaDescription !== (settings.seo_meta_description || "") ||
      seoOgImageUrl !== (settings.seo_og_image_url || "") ||
      seoSocialTitle !== (settings.seo_social_title || "") ||
      seoSocialDescription !== (settings.seo_social_description || "");

    onDirtyChange(isDirty);
  }, [
    legalName,
    displayName,
    shortName,
    tagline,
    logoUrl,
    secondaryLogoUrl,
    faviconUrl,
    brandPrimaryColor,
    brandSecondaryColor,
    brandAccentColor,
    primaryFont,
    secondaryFont,
    yearEstablished,
    registrationNumber,
    taxId,
    description,
    registeredAddress,
    officeAddress,
    city,
    state,
    postalCode,
    country,
    timeZone,
    currency,
    contactPhone,
    secondaryPhone,
    supportWhatsapp,
    emergencyPhone,
    contactEmail,
    supportEmail,
    bookingEmail,
    inquiryEmail,
    replyToEmail,
    operatingHours,
    holidayNotice,
    contactInstructions,
    instagramHandle,
    instagramUrl,
    facebookUrl,
    youtubeUrl,
    linkedinUrl,
    twitterUrl,
    websiteUrl,
    googleMapsUrl,
    googleMapsEmbedUrl,
    officeLocationLabel,
    googleMapsDirectionsUrl,
    googleMapsLatitude,
    googleMapsLongitude,
    googleMapsZoom,
    googleMapsDisplayEnabled,
    seoWebsiteTitle,
    seoMetaDescription,
    seoOgImageUrl,
    seoSocialTitle,
    seoSocialDescription,
    settings,
    onDirtyChange,
  ]);

  const handleReset = () => {
    setLegalName(settings.legal_business_name || "");
    setDisplayName(settings.public_display_name || settings.agency_name || "");
    setShortName(settings.short_name || "");
    setTagline(settings.tagline || "");
    setLogoUrl(settings.logo_url || "");
    setSecondaryLogoUrl(settings.secondary_logo_url || "");
    setFaviconUrl(settings.favicon_url || "");
    setBrandPrimaryColor(settings.brand_primary_color || "#24292F");
    setBrandSecondaryColor(settings.brand_secondary_color || "#C5A880");
    setBrandAccentColor(settings.brand_accent_color || "#D4AF37");
    setPrimaryFont(settings.primary_font || "Playfair Display");
    setSecondaryFont(settings.secondary_font || "Inter");
    setYearEstablished(settings.year_established?.toString() || "");
    setRegistrationNumber(settings.registration_number || "");
    setTaxId(settings.tax_id || "");
    setDescription(settings.business_description || "");
    setOfficeAddress(settings.office_address || "");
    setRegisteredAddress(settings.registered_office_address || "");
    setCity(settings.city || "Coimbatore");
    setState(settings.state || "Tamil Nadu");
    setPostalCode(settings.postal_code || "641012");
    setCountry(settings.country || "India");
    setTimeZone(settings.time_zone || "Asia/Kolkata");
    setCurrency(settings.currency || "INR");

    setContactPhone(settings.contact_phone || "");
    setSecondaryPhone(settings.secondary_phone || "");
    setSupportWhatsapp(settings.support_whatsapp || settings.whatsapp_number || "");
    setEmergencyPhone(settings.emergency_phone || "");
    setContactEmail(settings.contact_email || "");
    setSupportEmail(settings.customer_support_email || "");
    setBookingEmail(settings.booking_email || "");
    setInquiryEmail(settings.general_inquiry_email || "");
    setReplyToEmail(settings.reply_to_email || "");
    setOperatingHours(settings.operating_hours || settings.business_hours || "Mon - Sat: 9:00 AM - 7:00 PM");
    setHolidayNotice(settings.holiday_notice || "");
    setContactInstructions(settings.office_contact_instructions || "");

    setInstagramHandle(settings.instagram_handle || "");
    setInstagramUrl(settings.instagram_url || "");
    setFacebookUrl(settings.facebook_url || "");
    setYoutubeUrl(settings.youtube_url || "");
    setLinkedinUrl(settings.linkedin_url || "");
    setTwitterUrl(settings.twitter_url || "");
    setWebsiteUrl(settings.website_url || "");

    setGoogleMapsUrl(settings.google_maps_url || "");
    setGoogleMapsEmbedUrl(settings.google_maps_embed_url || "");
    setOfficeLocationLabel(settings.office_location_label || "");
    setGoogleMapsDirectionsUrl(settings.google_maps_directions_url || "");
    setGoogleMapsLatitude(settings.google_maps_latitude?.toString() || "");
    setGoogleMapsLongitude(settings.google_maps_longitude?.toString() || "");
    setGoogleMapsZoom(settings.google_maps_zoom?.toString() || "15");
    setGoogleMapsDisplayEnabled(settings.google_maps_display_enabled ?? true);

    setSeoWebsiteTitle(settings.seo_website_title || "");
    setSeoMetaDescription(settings.seo_meta_description || "");
    setSeoOgImageUrl(settings.seo_og_image_url || "");
    setSeoSocialTitle(settings.seo_social_title || "");
    setSeoSocialDescription(settings.seo_social_description || "");
    setErrors({});
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void,
    fieldName: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingField(fieldName);
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
      const res = await adminApi.uploadMedia(file, "travelagency/branding");
      if (res && res.url) {
        setter(res.url);
      }
    } catch (err: unknown) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: (err as Error).message || "Failed to upload image file.",
      }));
    } finally {
      setUploadingField(null);
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  const applyBrandPalette = (palette: (typeof BRAND_PALETTES)[number]) => {
    setBrandPrimaryColor(palette.primary);
    setBrandSecondaryColor(palette.secondary);
    setBrandAccentColor(palette.accent);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!displayName.trim()) {
      newErrors.displayName = "Agency display name is required.";
    }
    if (!contactPhone.trim()) {
      newErrors.contactPhone = "Primary contact phone is required.";
    } else if (!/^[\d\+\-\s\(\)\.]{7,25}$/.test(contactPhone.trim())) {
      newErrors.contactPhone = "Please enter a valid phone number (7-25 digits).";
    }

    if (secondaryPhone.trim() && !/^[\d\+\-\s\(\)\.]{7,25}$/.test(secondaryPhone.trim())) {
      newErrors.secondaryPhone = "Invalid secondary phone format.";
    }
    if (supportWhatsapp.trim() && !/^[\d\+\-\s\(\)\.]{7,25}$/.test(supportWhatsapp.trim())) {
      newErrors.supportWhatsapp = "Invalid support WhatsApp format.";
    }
    if (emergencyPhone.trim() && !/^[\d\+\-\s\(\)\.]{7,25}$/.test(emergencyPhone.trim())) {
      newErrors.emergencyPhone = "Invalid emergency contact number format.";
    }

    if (!contactEmail.trim()) {
      newErrors.contactEmail = "Official contact email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      newErrors.contactEmail = "Please enter a valid email address.";
    }

    if (supportEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail.trim())) {
      newErrors.supportEmail = "Invalid email format.";
    }
    if (bookingEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingEmail.trim())) {
      newErrors.bookingEmail = "Invalid booking email format.";
    }
    if (replyToEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyToEmail.trim())) {
      newErrors.replyToEmail = "Invalid reply-to email format.";
    }

    if (!officeAddress.trim()) {
      newErrors.officeAddress = "Office address is required.";
    }

    if (googleMapsLatitude.trim()) {
      const lat = parseFloat(googleMapsLatitude.trim());
      if (isNaN(lat) || lat < -90 || lat > 90) {
        newErrors.googleMapsLatitude = "Latitude must be a valid number between -90 and 90.";
      }
    }

    if (googleMapsLongitude.trim()) {
      const lng = parseFloat(googleMapsLongitude.trim());
      if (isNaN(lng) || lng < -180 || lng > 180) {
        newErrors.googleMapsLongitude = "Longitude must be a valid number between -180 and 180.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSaving(true);
      setSaveSuccess(false);

      const payload: Partial<AdminSiteSettings> = {
        legal_business_name: legalName.trim() || undefined,
        agency_name: displayName.trim(),
        public_display_name: displayName.trim(),
        short_name: shortName.trim() || undefined,
        tagline: tagline.trim(),
        logo_url: logoUrl.trim() || undefined,
        secondary_logo_url: secondaryLogoUrl.trim() || undefined,
        favicon_url: faviconUrl.trim() || undefined,
        brand_primary_color: brandPrimaryColor.trim() || undefined,
        brand_secondary_color: brandSecondaryColor.trim() || undefined,
        brand_accent_color: brandAccentColor.trim() || undefined,
        primary_font: primaryFont.trim() || undefined,
        secondary_font: secondaryFont.trim() || undefined,
        year_established: yearEstablished.trim() ? parseInt(yearEstablished.trim(), 10) : undefined,
        registration_number: registrationNumber.trim() || undefined,
        tax_id: taxId.trim() || undefined,
        business_description: description.trim() || undefined,
        registered_office_address: registeredAddress.trim() || undefined,
        office_address: officeAddress.trim(),
        public_office_address: officeAddress.trim(),
        agency_location: `${city.trim()}, ${state.trim()}, ${country.trim()}`,
        city: city.trim(),
        state: state.trim(),
        postal_code: postalCode.trim(),
        country: country.trim(),
        time_zone: timeZone.trim(),
        currency: currency.trim().toUpperCase(),

        contact_phone: contactPhone.trim(),
        secondary_phone: secondaryPhone.trim() || undefined,
        support_whatsapp: supportWhatsapp.trim() || undefined,
        emergency_phone: emergencyPhone.trim() || undefined,
        contact_email: contactEmail.trim(),
        customer_support_email: supportEmail.trim() || undefined,
        booking_email: bookingEmail.trim() || undefined,
        general_inquiry_email: inquiryEmail.trim() || undefined,
        reply_to_email: replyToEmail.trim() || undefined,

        operating_hours: operatingHours.trim(),
        business_hours: operatingHours.trim(),
        holiday_notice: holidayNotice.trim() || undefined,
        office_contact_instructions: contactInstructions.trim() || undefined,

        instagram_handle: instagramHandle.trim() || undefined,
        instagram_url: instagramUrl.trim() || undefined,
        facebook_url: facebookUrl.trim() || undefined,
        youtube_url: youtubeUrl.trim() || undefined,
        linkedin_url: linkedinUrl.trim() || undefined,
        twitter_url: twitterUrl.trim() || undefined,
        website_url: websiteUrl.trim() || undefined,

        google_maps_url: googleMapsUrl.trim() || undefined,
        google_maps_embed_url: googleMapsEmbedUrl.trim() || undefined,
        office_location_label: officeLocationLabel.trim() || undefined,
        google_maps_directions_url: googleMapsDirectionsUrl.trim() || undefined,
        google_maps_latitude: googleMapsLatitude.trim() ? parseFloat(googleMapsLatitude.trim()) : undefined,
        google_maps_longitude: googleMapsLongitude.trim() ? parseFloat(googleMapsLongitude.trim()) : undefined,
        google_maps_zoom: googleMapsZoom.trim() ? parseInt(googleMapsZoom.trim(), 10) : undefined,
        google_maps_display_enabled: googleMapsDisplayEnabled,

        seo_website_title: seoWebsiteTitle.trim() || undefined,
        seo_meta_description: seoMetaDescription.trim() || undefined,
        seo_og_image_url: seoOgImageUrl.trim() || undefined,
        seo_social_title: seoSocialTitle.trim() || undefined,
        seo_social_description: seoSocialDescription.trim() || undefined,
      };

      const updated = await adminApi.updateSettings(payload);
      onSaved(updated);
      updateBranding(updated as any);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      setErrors({ form: (err as Error).message || "Failed to update agency profile." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Hidden File Upload Inputs */}
      <input
        type="file"
        ref={logoInputRef}
        onChange={(e) => handleFileUpload(e, setLogoUrl, "logoUrl")}
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
      />
      <input
        type="file"
        ref={secondaryLogoInputRef}
        onChange={(e) => handleFileUpload(e, setSecondaryLogoUrl, "secondaryLogoUrl")}
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
      />
      <input
        type="file"
        ref={faviconInputRef}
        onChange={(e) => handleFileUpload(e, setFaviconUrl, "faviconUrl")}
        accept="image/png,image/x-icon,image/svg+xml,image/webp"
        className="hidden"
      />
      <input
        type="file"
        ref={ogImageInputRef}
        onChange={(e) => handleFileUpload(e, setSeoOgImageUrl, "seoOgImageUrl")}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
      />

      {/* Informative Link to Consolidated Main Website Editor */}
      <div className="p-4 rounded-2xl bg-stone-50 border border-[#E4E5E7] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Palette className="w-4 h-4 text-[#C5A880] shrink-0" />
          <p className="text-xs text-[#5F6368]">
            Agency Branding and Business Details can also be edited alongside homepage content in{" "}
            <strong className="text-[#202124]">Website Content → Main Website</strong>.
          </p>
        </div>
        <Link
          href="/admin/content/main?tab=branding"
          className="px-3.5 py-1.5 rounded-xl border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] text-xs font-semibold text-[#202124] shrink-0 flex items-center gap-1.5 transition-all"
        >
          <span>Open Main Website Editor</span>
          <ExternalLink className="w-3.5 h-3.5 text-[#5F6368]" />
        </Link>
      </div>

      {/* Top Controls & Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E4E5E7] shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div
              className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
              style={{ backgroundColor: brandPrimaryColor }}
            />
            <h2 className="text-base font-bold text-[#202124] flex items-center gap-2">
              <span>Authoritative Agency Profile &amp; Rebranding</span>
            </h2>
          </div>
          <p className="text-xs text-[#5F6368] mt-1">
            Single authoritative source of truth. Instant rebrand propagates across navigation, homepage, vouchers, footer, and receipts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F7F7F5] border border-[#D3D8DF] hover:bg-[#EAEAEA] text-[#202124] transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Eye className="w-4 h-4 text-[#5F6368]" />
            <span>Brand Preview</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#5F6368] transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>

          {canEdit && (
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
              style={{ backgroundColor: brandPrimaryColor }}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save Rebranding</span>
            </button>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium flex items-center gap-2 shadow-2xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Agency profile saved and globally synchronized across all public routes, PDFs, and notification channels.</span>
        </div>
      )}

      {errors.form && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-medium flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errors.form}</span>
        </div>
      )}

      {/* Profile Section Internal Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-[#F7F7F5] p-1.5 rounded-2xl border border-[#E4E5E7] text-xs">
        <button
          type="button"
          onClick={() => setActiveSubTab("identity")}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
            activeSubTab === "identity"
              ? "bg-white text-[#202124] shadow-xs"
              : "text-[#5F6368] hover:text-[#202124] hover:bg-white/60"
          }`}
        >
          <Building className="w-4 h-4 text-[#C5A880]" />
          <span>Identity &amp; Brand Styling</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("contact")}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
            activeSubTab === "contact"
              ? "bg-white text-[#202124] shadow-xs"
              : "text-[#5F6368] hover:text-[#202124] hover:bg-white/60"
          }`}
        >
          <Phone className="w-4 h-4 text-[#C5A880]" />
          <span>Contact &amp; Physical Premises</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("social")}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
            activeSubTab === "social"
              ? "bg-white text-[#202124] shadow-xs"
              : "text-[#5F6368] hover:text-[#202124] hover:bg-white/60"
          }`}
        >
          <Globe className="w-4 h-4 text-[#C5A880]" />
          <span>Social Media Channels</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("maps")}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
            activeSubTab === "maps"
              ? "bg-white text-[#202124] shadow-xs"
              : "text-[#5F6368] hover:text-[#202124] hover:bg-white/60"
          }`}
        >
          <MapPin className="w-4 h-4 text-[#C5A880]" />
          <span>Google Maps &amp; Directions</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("seo")}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
            activeSubTab === "seo"
              ? "bg-white text-[#202124] shadow-xs"
              : "text-[#5F6368] hover:text-[#202124] hover:bg-white/60"
          }`}
        >
          <Search className="w-4 h-4 text-[#C5A880]" />
          <span>SEO &amp; Social Sharing</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. IDENTITY & BRAND STYLING */}
      {/* ========================================================================= */}
      {activeSubTab === "identity" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Business Identity */}
          <div className="bg-white p-6 rounded-2xl border border-[#E4E5E7] shadow-2xs space-y-6">
            <div className="border-b border-[#F0F1F3] pb-3">
              <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
                <Building className="w-4 h-4 text-[#C5A880]" />
                <span>Business Identity</span>
              </h3>
              <p className="text-xs text-[#5F6368] mt-0.5">
                Primary agency titles, short name for badges, and legal incorporation data.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">
                  Full Agency Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. KV TOURS & TRAVELS or ABC Holidays"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F] ${
                    errors.displayName ? "border-red-500 bg-red-50/20" : "border-[#D3D8DF] bg-white"
                  }`}
                />
                {errors.displayName && <p className="text-[11px] text-red-600 mt-1">{errors.displayName}</p>}
                <p className="text-[11px] text-gray-400 mt-1">Appears in header, hero titles, travel vouchers, and receipts.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">
                  Short Business Name <span className="text-gray-400 font-normal">(for mobile badges &amp; compact tags)</span>
                </label>
                <input
                  type="text"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. KV Tours or ABC"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
                <p className="text-[11px] text-gray-400 mt-1">Used in responsive mobile navbars and micro-cards.</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Brand Tagline</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. Coimbatore • Luxury & Adventure Journeys"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">
                  Legal Business Name <span className="text-gray-400 font-normal">(for GST invoices &amp; legal footers)</span>
                </label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. KV Tours & Travels Private Limited"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Year Established</label>
                <input
                  type="number"
                  value={yearEstablished}
                  onChange={(e) => setYearEstablished(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. 2018"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Registration / License Number</label>
                <input
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. TN-CBE-TRV-2018-994"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Tax ID / GSTIN</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. 33AAAAA0000A1Z5"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Business Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Brief overview of agency specialties, destinations, and heritage..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Default Time Zone</label>
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT +8:00)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Default Currency</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs font-mono font-bold text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>
            </div>
          </div>

          {/* Logo & Asset Uploads */}
          <div className="bg-white p-6 rounded-2xl border border-[#E4E5E7] shadow-2xs space-y-6">
            <div className="border-b border-[#F0F1F3] pb-3">
              <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#C5A880]" />
                <span>Logos &amp; Brand Assets</span>
              </h3>
              <p className="text-xs text-[#5F6368] mt-0.5">
                Upload primary agency logo, secondary light/dark variant, and browser favicon.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Primary Logo */}
              <div className="space-y-3 p-4 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5]/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#202124]">Primary Brand Logo</label>
                    <span className="text-[10px] text-gray-500">Header &amp; PDFs</span>
                  </div>
                  <p className="text-[11px] text-[#5F6368] mt-0.5">Recommended: Transparent PNG/SVG, 400x120px</p>

                  <div className="mt-3 h-20 w-full rounded-xl border border-dashed border-[#D3D8DF] bg-white flex items-center justify-center p-2 overflow-hidden">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Primary Logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-xs text-gray-400 italic">No logo uploaded</span>
                    )}
                  </div>

                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    disabled={!canEdit}
                    placeholder="https://... or upload"
                    className="w-full mt-2 px-3 py-1.5 rounded-lg border border-[#D3D8DF] bg-white text-[11px] text-[#202124]"
                  />
                  {errors.logoUrl && <p className="text-[11px] text-red-600 mt-1">{errors.logoUrl}</p>}
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingField === "logoUrl"}
                    className="w-full mt-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#202124] transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    {uploadingField === "logoUrl" ? (
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-[#5F6368]" />
                    )}
                    <span>{logoUrl ? "Replace Logo" : "Upload Logo"}</span>
                  </button>
                )}
              </div>

              {/* Secondary Logo */}
              <div className="space-y-3 p-4 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5]/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#202124]">Secondary Logo (Light)</label>
                    <span className="text-[10px] text-gray-500">Dark Backgrounds</span>
                  </div>
                  <p className="text-[11px] text-[#5F6368] mt-0.5">Recommended: White/Monochrome SVG</p>

                  <div className="mt-3 h-20 w-full rounded-xl border border-[#24292F] bg-[#24292F] flex items-center justify-center p-2 overflow-hidden">
                    {secondaryLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={secondaryLogoUrl} alt="Secondary Logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-xs text-gray-400 italic">No secondary logo</span>
                    )}
                  </div>

                  <input
                    type="text"
                    value={secondaryLogoUrl}
                    onChange={(e) => setSecondaryLogoUrl(e.target.value)}
                    disabled={!canEdit}
                    placeholder="https://... or upload"
                    className="w-full mt-2 px-3 py-1.5 rounded-lg border border-[#D3D8DF] bg-white text-[11px] text-[#202124]"
                  />
                  {errors.secondaryLogoUrl && <p className="text-[11px] text-red-600 mt-1">{errors.secondaryLogoUrl}</p>}
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => secondaryLogoInputRef.current?.click()}
                    disabled={uploadingField === "secondaryLogoUrl"}
                    className="w-full mt-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#202124] transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    {uploadingField === "secondaryLogoUrl" ? (
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-[#5F6368]" />
                    )}
                    <span>{secondaryLogoUrl ? "Replace Secondary Logo" : "Upload Secondary Logo"}</span>
                  </button>
                )}
              </div>

              {/* Favicon */}
              <div className="space-y-3 p-4 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5]/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#202124]">Favicon / App Icon</label>
                    <span className="text-[10px] text-gray-500">Browser Tabs</span>
                  </div>
                  <p className="text-[11px] text-[#5F6368] mt-0.5">Recommended: Square 64x64px or SVG</p>

                  <div className="mt-3 h-20 w-full rounded-xl border border-dashed border-[#D3D8DF] bg-white flex items-center justify-center p-2 overflow-hidden">
                    {faviconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={faviconUrl} alt="Favicon" className="w-10 h-10 object-contain" />
                    ) : (
                      <span className="text-xs text-gray-400 italic">No favicon uploaded</span>
                    )}
                  </div>

                  <input
                    type="text"
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                    disabled={!canEdit}
                    placeholder="https://... or upload"
                    className="w-full mt-2 px-3 py-1.5 rounded-lg border border-[#D3D8DF] bg-white text-[11px] text-[#202124]"
                  />
                  {errors.faviconUrl && <p className="text-[11px] text-red-600 mt-1">{errors.faviconUrl}</p>}
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => faviconInputRef.current?.click()}
                    disabled={uploadingField === "faviconUrl"}
                    className="w-full mt-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#202124] transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    {uploadingField === "faviconUrl" ? (
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-[#5F6368]" />
                    )}
                    <span>{faviconUrl ? "Replace Favicon" : "Upload Favicon"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Brand Colors & Luxury Palettes */}
          <div className="bg-white p-6 rounded-2xl border border-[#E4E5E7] shadow-2xs space-y-6">
            <div className="border-b border-[#F0F1F3] pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#C5A880]" />
                  <span>Brand Color System &amp; Presets</span>
                </h3>
                <p className="text-xs text-[#5F6368] mt-0.5">
                  Select a curated luxury travel agency color scheme or customize individual hexadecimal tokens.
                </p>
              </div>
              <Sparkles className="w-5 h-5 text-[#C5A880]" />
            </div>

            {/* Presets */}
            <div>
              <label className="block text-xs font-bold text-[#202124] mb-2.5">
                Quick Luxury Color Palettes <span className="text-gray-400 font-normal">(1-click apply)</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {BRAND_PALETTES.map((palette) => {
                  const isCurrent =
                    brandPrimaryColor.toLowerCase() === palette.primary.toLowerCase() &&
                    brandSecondaryColor.toLowerCase() === palette.secondary.toLowerCase();
                  return (
                    <button
                      key={palette.name}
                      type="button"
                      onClick={() => applyBrandPalette(palette)}
                      disabled={!canEdit}
                      className={`p-3.5 rounded-xl border text-left transition-all relative ${
                        isCurrent
                          ? "border-[#202124] bg-[#F7F7F5] ring-2 ring-[#202124]/20"
                          : "border-[#E4E5E7] bg-white hover:border-[#D3D8DF] hover:bg-[#F7F7F5]/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#202124]">{palette.name}</span>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-6 h-6 rounded-lg border border-black/10 shadow-2xs"
                          style={{ backgroundColor: palette.primary }}
                          title={`Primary: ${palette.primary}`}
                        />
                        <div
                          className="w-6 h-6 rounded-lg border border-black/10 shadow-2xs"
                          style={{ backgroundColor: palette.secondary }}
                          title={`Secondary: ${palette.secondary}`}
                        />
                        <div
                          className="w-6 h-6 rounded-lg border border-black/10 shadow-2xs"
                          style={{ backgroundColor: palette.accent }}
                          title={`Accent: ${palette.accent}`}
                        />
                        <span className="text-[10px] text-gray-400 font-mono ml-auto">{palette.badge}</span>
                      </div>
                      <p className="text-[11px] text-[#5F6368]">{palette.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Color Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-3 border-t border-[#F0F1F3]">
              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Primary Brand Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandPrimaryColor}
                    onChange={(e) => setBrandPrimaryColor(e.target.value)}
                    disabled={!canEdit}
                    className="w-10 h-10 p-1 rounded-xl border border-[#D3D8DF] cursor-pointer bg-white"
                  />
                  <input
                    type="text"
                    value={brandPrimaryColor}
                    onChange={(e) => setBrandPrimaryColor(e.target.value)}
                    disabled={!canEdit}
                    placeholder="#24292F"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs font-mono font-bold text-[#202124]"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Main buttons, navigation background, and strong headings.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Secondary Brand Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandSecondaryColor}
                    onChange={(e) => setBrandSecondaryColor(e.target.value)}
                    disabled={!canEdit}
                    className="w-10 h-10 p-1 rounded-xl border border-[#D3D8DF] cursor-pointer bg-white"
                  />
                  <input
                    type="text"
                    value={brandSecondaryColor}
                    onChange={(e) => setBrandSecondaryColor(e.target.value)}
                    disabled={!canEdit}
                    placeholder="#C5A880"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs font-mono font-bold text-[#202124]"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Heritage gold accent, iconography, and section highlights.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandAccentColor}
                    onChange={(e) => setBrandAccentColor(e.target.value)}
                    disabled={!canEdit}
                    className="w-10 h-10 p-1 rounded-xl border border-[#D3D8DF] cursor-pointer bg-white"
                  />
                  <input
                    type="text"
                    value={brandAccentColor}
                    onChange={(e) => setBrandAccentColor(e.target.value)}
                    disabled={!canEdit}
                    placeholder="#D4AF37"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs font-mono font-bold text-[#202124]"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Vip badges, star ratings, and interactive borders.</p>
              </div>
            </div>
          </div>

          {/* Typography System */}
          <div className="bg-white p-6 rounded-2xl border border-[#E4E5E7] shadow-2xs space-y-6">
            <div className="border-b border-[#F0F1F3] pb-3">
              <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
                <Type className="w-4 h-4 text-[#C5A880]" />
                <span>Typography Configuration</span>
              </h3>
              <p className="text-xs text-[#5F6368] mt-0.5">
                Safe Google Fonts loaded by the Next.js font pipeline for crisp cross-device rendering.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Primary Display / Heading Font</label>
                <select
                  value={primaryFont}
                  onChange={(e) => setPrimaryFont(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                >
                  {PRIMARY_FONTS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">Applied to page titles, hero headers, and package names.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Secondary Body / Text Font</label>
                <select
                  value={secondaryFont}
                  onChange={(e) => setSecondaryFont(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                >
                  {SECONDARY_FONTS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">Applied to descriptions, itinerary notes, and administrative UI.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CONTACT & PHYSICAL PREMISES */}
      {/* ========================================================================= */}
      {activeSubTab === "contact" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Office Address & Location */}
          <div className="bg-white p-6 rounded-2xl border border-[#E4E5E7] shadow-2xs space-y-6">
            <div className="border-b border-[#F0F1F3] pb-3">
              <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#C5A880]" />
                <span>Physical Office Addresses</span>
              </h3>
              <p className="text-xs text-[#5F6368] mt-0.5">
                Addresses for customer walk-in appointments, voucher headers, and invoices.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#202124] mb-1.5">
                  Public Office Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={officeAddress}
                  onChange={(e) => setOfficeAddress(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. 124 Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu 641012"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F] ${
                    errors.officeAddress ? "border-red-500 bg-red-50/20" : "border-[#D3D8DF] bg-white"
                  }`}
                />
                {errors.officeAddress && <p className="text-[11px] text-red-600 mt-1">{errors.officeAddress}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#202124] mb-1.5">
                  Registered Legal Corporate Address <span className="text-gray-400 font-normal">(if different)</span>
                </label>
                <input
                  type="text"
                  value={registeredAddress}
                  onChange={(e) => setRegisteredAddress(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. Registered Corporate Office Address"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">State / Province</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Postal Code</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>
            </div>
          </div>

          {/* Telephony & Direct Contact */}
          <div className="bg-white p-6 rounded-2xl border border-[#E4E5E7] shadow-2xs space-y-6">
            <div className="border-b border-[#F0F1F3] pb-3">
              <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#C5A880]" />
                <span>Contact Telephony &amp; Concierge Numbers</span>
              </h3>
              <p className="text-xs text-[#5F6368] mt-0.5">
                Primary hotline, secondary phone, WhatsApp concierge, and 24/7 emergency dispatch.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">
                  Primary Concierge Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  disabled={!canEdit}
                  placeholder="+91 94420 00000"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F] ${
                    errors.contactPhone ? "border-red-500 bg-red-50/20" : "border-[#D3D8DF] bg-white"
                  }`}
                />
                {errors.contactPhone && <p className="text-[11px] text-red-600 mt-1">{errors.contactPhone}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Secondary Office Landline / Phone</label>
                <input
                  type="text"
                  value={secondaryPhone}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                  disabled={!canEdit}
                  placeholder="+91 422 2220000"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F] ${
                    errors.secondaryPhone ? "border-red-500 bg-red-50/20" : "border-[#D3D8DF] bg-white"
                  }`}
                />
                {errors.secondaryPhone && <p className="text-[11px] text-red-600 mt-1">{errors.secondaryPhone}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">WhatsApp Concierge Number</label>
                <input
                  type="text"
                  value={supportWhatsapp}
                  onChange={(e) => setSupportWhatsapp(e.target.value)}
                  disabled={!canEdit}
                  placeholder="+91 94420 00000"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F] ${
                    errors.supportWhatsapp ? "border-red-500 bg-red-50/20" : "border-[#D3D8DF] bg-white"
                  }`}
                />
                {errors.supportWhatsapp && <p className="text-[11px] text-red-600 mt-1">{errors.supportWhatsapp}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">
                  24/7 Emergency Tour Contact <span className="text-gray-400 font-normal">(printed on vouchers)</span>
                </label>
                <input
                  type="text"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  disabled={!canEdit}
                  placeholder="+91 94420 99999"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F] ${
                    errors.emergencyPhone ? "border-red-500 bg-red-50/20" : "border-[#D3D8DF] bg-white"
                  }`}
                />
                {errors.emergencyPhone && <p className="text-[11px] text-red-600 mt-1">{errors.emergencyPhone}</p>}
              </div>
            </div>
          </div>

          {/* Email Routing */}
          <div className="bg-white p-6 rounded-2xl border border-[#E4E5E7] shadow-2xs space-y-6">
            <div className="border-b border-[#F0F1F3] pb-3">
              <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#C5A880]" />
                <span>Email Routing &amp; Inquiries</span>
              </h3>
              <p className="text-xs text-[#5F6368] mt-0.5">
                Official agency addresses for customer service, automated booking receipts, and general inquiries.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">
                  General Customer Support Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  disabled={!canEdit}
                  placeholder="contact@youragency.com"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F] ${
                    errors.contactEmail ? "border-red-500 bg-red-50/20" : "border-[#D3D8DF] bg-white"
                  }`}
                />
                {errors.contactEmail && <p className="text-[11px] text-red-600 mt-1">{errors.contactEmail}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Booking Notifications Email</label>
                <input
                  type="email"
                  value={bookingEmail}
                  onChange={(e) => setBookingEmail(e.target.value)}
                  disabled={!canEdit}
                  placeholder="bookings@youragency.com"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F] ${
                    errors.bookingEmail ? "border-red-500 bg-red-50/20" : "border-[#D3D8DF] bg-white"
                  }`}
                />
                {errors.bookingEmail && <p className="text-[11px] text-red-600 mt-1">{errors.bookingEmail}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">General Inquiry Email</label>
                <input
                  type="email"
                  value={inquiryEmail}
                  onChange={(e) => setInquiryEmail(e.target.value)}
                  disabled={!canEdit}
                  placeholder="info@youragency.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Reply-To Header Address</label>
                <input
                  type="email"
                  value={replyToEmail}
                  onChange={(e) => setReplyToEmail(e.target.value)}
                  disabled={!canEdit}
                  placeholder="concierge@youragency.com"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F] ${
                    errors.replyToEmail ? "border-red-500 bg-red-50/20" : "border-[#D3D8DF] bg-white"
                  }`}
                />
                {errors.replyToEmail && <p className="text-[11px] text-red-600 mt-1">{errors.replyToEmail}</p>}
              </div>
            </div>
          </div>

          {/* Operating Hours & Schedule */}
          <div className="bg-white p-6 rounded-2xl border border-[#E4E5E7] shadow-2xs space-y-6">
            <div className="border-b border-[#F0F1F3] pb-3">
              <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#C5A880]" />
                <span>Operating Schedule &amp; Visitor Guidance</span>
              </h3>
              <p className="text-xs text-[#5F6368] mt-0.5">
                Office working hours, holiday closure advisories, and branch consultation directions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Operating Days &amp; Hours</label>
                <input
                  type="text"
                  value={operatingHours}
                  onChange={(e) => setOperatingHours(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. Mon - Sat: 9:00 AM - 7:00 PM IST"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Holiday or Closure Notice</label>
                <input
                  type="text"
                  value={holidayNotice}
                  onChange={(e) => setHolidayNotice(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. Office open on all national holidays for active trip emergencies"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Office Contact &amp; Appointment Guidance</label>
                <textarea
                  rows={2}
                  value={contactInstructions}
                  onChange={(e) => setContactInstructions(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. Parking available on-premises. Walk-in consultations welcome without prior appointment."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SOCIAL MEDIA CHANNELS */}
      {/* ========================================================================= */}
      {activeSubTab === "social" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white p-6 rounded-2xl border border-[#E4E5E7] shadow-2xs space-y-6">
            <div className="border-b border-[#F0F1F3] pb-3">
              <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#C5A880]" />
                <span>Social Media Channels &amp; Digital Presence</span>
              </h3>
              <p className="text-xs text-[#5F6368] mt-0.5">
                Links displayed across the public footer, contact page, trip vouchers, and social sharing embeds.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Instagram Handle</label>
                <input
                  type="text"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  disabled={!canEdit}
                  placeholder="@youragency"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Instagram Profile Link</label>
                <input
                  type="text"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://instagram.com/youragency"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Facebook Page URL</label>
                <input
                  type="text"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://facebook.com/youragency"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">YouTube Channel URL</label>
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://youtube.com/@youragency"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">LinkedIn Company URL</label>
                <input
                  type="text"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://linkedin.com/company/youragency"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Twitter / X URL</label>
                <input
                  type="text"
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://x.com/youragency"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Public Website Canonical URL</label>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://youragency.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. GOOGLE MAPS & OFFICE LOCATION */}
      {/* ========================================================================= */}
      {activeSubTab === "maps" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white p-6 rounded-2xl border border-[#E4E5E7] shadow-2xs space-y-6">
            <div className="border-b border-[#F0F1F3] pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#C5A880]" />
                  <span>Google Maps &amp; Navigation Configuration</span>
                </h3>
                <p className="text-xs text-[#5F6368] mt-0.5">
                  Configure the responsive Google Map rendered on the Contact page and directions links.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#202124]">Display Map on Contact Page</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={googleMapsDisplayEnabled}
                    onChange={(e) => setGoogleMapsDisplayEnabled(e.target.checked)}
                    disabled={!canEdit}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#202124]" />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#202124] mb-1.5">
                  Google Maps Embed URL or iframe code
                </label>
                <textarea
                  rows={2}
                  value={googleMapsEmbedUrl}
                  onChange={(e) => setGoogleMapsEmbedUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder='https://www.google.com/maps/embed?pb=... or paste the full <iframe src="..."></iframe> code'
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs font-mono text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Tip: In Google Maps, click &quot;Share&quot; &gt; &quot;Embed a map&quot; and paste the URL or the entire &lt;iframe&gt; code here. The backend automatically extracts and validates the secure HTTPS embed URL.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Office Location Label</label>
                <input
                  type="text"
                  value={officeLocationLabel}
                  onChange={(e) => setOfficeLocationLabel(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. Headquarters & Travel Lounge"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Google Maps Pin / Web URL</label>
                <input
                  type="text"
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">
                  Get Directions URL <span className="text-gray-400 font-normal">(opens turn-by-turn navigation)</span>
                </label>
                <input
                  type="text"
                  value={googleMapsDirectionsUrl}
                  onChange={(e) => setGoogleMapsDirectionsUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://www.google.com/maps/dir/?api=1&destination=..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Map Zoom Level</label>
                <input
                  type="number"
                  min={1}
                  max={21}
                  value={googleMapsZoom}
                  onChange={(e) => setGoogleMapsZoom(e.target.value)}
                  disabled={!canEdit}
                  placeholder="15"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Latitude (Optional)</label>
                <input
                  type="text"
                  value={googleMapsLatitude}
                  onChange={(e) => setGoogleMapsLatitude(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. 11.0168"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F] ${
                    errors.googleMapsLatitude ? "border-red-500 bg-red-50/20" : "border-[#D3D8DF] bg-white"
                  }`}
                />
                {errors.googleMapsLatitude && <p className="text-[11px] text-red-600 mt-1">{errors.googleMapsLatitude}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Longitude (Optional)</label>
                <input
                  type="text"
                  value={googleMapsLongitude}
                  onChange={(e) => setGoogleMapsLongitude(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. 76.9558"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F] ${
                    errors.googleMapsLongitude ? "border-red-500 bg-red-50/20" : "border-[#D3D8DF] bg-white"
                  }`}
                />
                {errors.googleMapsLongitude && <p className="text-[11px] text-red-600 mt-1">{errors.googleMapsLongitude}</p>}
              </div>
            </div>

            {/* Interactive Map Live Preview Box */}
            <div className="pt-4 border-t border-[#F0F1F3]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#202124] flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>Map Rendering Preview</span>
                </span>
                {googleMapsDirectionsUrl && (
                  <a
                    href={googleMapsDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-[#202124] hover:underline flex items-center gap-1"
                  >
                    <span>Test Directions Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="rounded-2xl border border-[#E4E5E7] overflow-hidden bg-[#F7F7F5] h-64 relative flex items-center justify-center">
                {googleMapsEmbedUrl && googleMapsDisplayEnabled ? (
                  <iframe
                    title="Google Maps Office Location"
                    src={
                      googleMapsEmbedUrl.includes("<iframe")
                        ? (googleMapsEmbedUrl.match(/src=["'](.*?)["']/)?.[1] || googleMapsEmbedUrl)
                        : googleMapsEmbedUrl
                    }
                    className="w-full h-full border-0"
                    loading="lazy"
                    allowFullScreen
                  />
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <Compass className="w-8 h-8 text-[#C5A880] mx-auto opacity-70" />
                    <p className="text-xs font-bold text-[#202124]">
                      {googleMapsDisplayEnabled ? "No Google Maps Embed URL Configured" : "Map Display is Currently Disabled"}
                    </p>
                    <p className="text-[11px] text-[#5F6368] max-w-sm mx-auto">
                      {googleMapsDisplayEnabled
                        ? "Paste a Google Maps embed URL above to render a live interactive preview."
                        : "Toggle 'Display Map on Contact Page' above to show the interactive office locator."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SEO & SOCIAL SHARING */}
      {/* ========================================================================= */}
      {activeSubTab === "seo" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white p-6 rounded-2xl border border-[#E4E5E7] shadow-2xs space-y-6">
            <div className="border-b border-[#F0F1F3] pb-3">
              <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
                <Search className="w-4 h-4 text-[#C5A880]" />
                <span>Search Engine Optimization &amp; Social Previews</span>
              </h3>
              <p className="text-xs text-[#5F6368] mt-0.5">
                Default metadata, social sharing cards (Open Graph), and search engine indexing information.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#202124] mb-1.5">
                  Default Website Title <span className="text-gray-400 font-normal">(browser title &amp; search snippet)</span>
                </label>
                <input
                  type="text"
                  value={seoWebsiteTitle}
                  onChange={(e) => setSeoWebsiteTitle(e.target.value)}
                  disabled={!canEdit}
                  placeholder={`e.g. ${displayName || "KV TOURS & TRAVELS"} | Luxury Journeys & Bespoke Holidays`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Default Meta Description</label>
                <textarea
                  rows={3}
                  value={seoMetaDescription}
                  onChange={(e) => setSeoMetaDescription(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. Discover hand-crafted luxury holiday packages, international departures, and bespoke travel concierge services..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Social Sharing Title (Open Graph)</label>
                <input
                  type="text"
                  value={seoSocialTitle}
                  onChange={(e) => setSeoSocialTitle(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. Luxury Holidays Crafted with Passion"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1.5">Social Sharing Description</label>
                <input
                  type="text"
                  value={seoSocialDescription}
                  onChange={(e) => setSeoSocialDescription(e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. Tailored tours, exclusive resort privileges, and 24/7 travel care."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              {/* OG Image Upload */}
              <div className="md:col-span-2 p-4 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5]/50 flex flex-col md:flex-row gap-5 items-center justify-between">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#202124] flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-[#C5A880]" />
                    <span>Default Social Sharing Image (1200x630px)</span>
                  </label>
                  <p className="text-[11px] text-[#5F6368]">
                    Displayed on WhatsApp, Facebook, LinkedIn, and Twitter when links to your site are shared.
                  </p>
                  <input
                    type="text"
                    value={seoOgImageUrl}
                    onChange={(e) => setSeoOgImageUrl(e.target.value)}
                    disabled={!canEdit}
                    placeholder="https://... or upload"
                    className="w-full max-w-md px-3 py-1.5 rounded-lg border border-[#D3D8DF] bg-white text-[11px] text-[#202124] mt-2"
                  />
                  {errors.seoOgImageUrl && <p className="text-[11px] text-red-600 mt-1">{errors.seoOgImageUrl}</p>}
                </div>

                <div className="flex items-center gap-4">
                  {seoOgImageUrl && (
                    <div className="w-24 h-14 rounded-lg border border-[#D3D8DF] overflow-hidden bg-white shadow-2xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={seoOgImageUrl} alt="Social Preview" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => ogImageInputRef.current?.click()}
                      disabled={uploadingField === "seoOgImageUrl"}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#202124] transition-all flex items-center gap-1.5 shadow-2xs"
                    >
                      {uploadingField === "seoOgImageUrl" ? (
                        <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-[#5F6368]" />
                      )}
                      <span>{seoOgImageUrl ? "Replace Image" : "Upload Social Banner"}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Live Branding Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl border border-[#D3D8DF] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E4E5E7] pb-4">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-[#C5A880]" />
                <div>
                  <h3 className="font-bold text-base text-[#202124]">White-Label Branding Live Preview</h3>
                  <p className="text-xs text-[#5F6368]">Simulated customer-facing navigation header and travel voucher card.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>

            {/* Simulated Public Navbar */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Public Navbar Simulation</span>
              <div className="bg-white rounded-2xl p-4 border border-[#E4E5E7] shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Logo" className="h-8 max-w-[140px] object-contain" />
                  ) : (
                    <span className="text-base font-bold text-[#202124]" style={{ fontFamily: primaryFont }}>
                      {displayName || "KV TOURS & TRAVELS"}
                    </span>
                  )}
                  {shortName && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#F7F7F5] border border-[#E4E5E7] text-[#5F6368]">
                      {shortName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="text-[#5F6368] hidden sm:inline">Destinations</span>
                  <span className="text-[#5F6368] hidden sm:inline">About</span>
                  <span className="text-[#5F6368] hidden sm:inline">Contact</span>
                  <button
                    type="button"
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-2xs"
                    style={{ backgroundColor: brandPrimaryColor }}
                  >
                    Inquire Now
                  </button>
                </div>
              </div>
            </div>

            {/* Simulated Luxury Voucher Card */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Travel Voucher &amp; Invoice Header Simulation</span>
              <div
                className="text-white p-6 rounded-2xl border space-y-4 shadow-md"
                style={{ backgroundColor: brandPrimaryColor, borderColor: brandSecondaryColor }}
              >
                <div className="flex justify-between items-start border-b border-white/10 pb-4">
                  <div>
                    <h4
                      className="font-extrabold text-xl tracking-wider uppercase"
                      style={{ color: brandSecondaryColor, fontFamily: primaryFont }}
                    >
                      {displayName || "KV TOURS & TRAVELS"}
                    </h4>
                    <p className="text-xs text-white/80 mt-0.5">{tagline || "Your Journey. Our Expertise."}</p>
                    {legalName && <p className="text-[11px] text-white/60 mt-0.5">{legalName}</p>}
                  </div>
                  <span
                    className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full border"
                    style={{
                      backgroundColor: `${brandSecondaryColor}20`,
                      color: brandSecondaryColor,
                      borderColor: `${brandSecondaryColor}40`,
                    }}
                  >
                    Authorized Agency
                  </span>
                </div>

                <div className="text-xs text-white/90 space-y-2" style={{ fontFamily: secondaryFont }}>
                  <p className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: brandSecondaryColor }} />
                    <span>{officeAddress || "Cross Cut Road, Gandhipuram, Coimbatore"}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: brandSecondaryColor }} />
                    <span>{contactPhone || "+91 94420 00000"} {secondaryPhone ? `• ${secondaryPhone}` : ""}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: brandSecondaryColor }} />
                    <span>{contactEmail || "contact@kvtours.in"}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: brandSecondaryColor }} />
                    <span>{operatingHours}</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/60">
                  <span>Currency: {currency} • Timezone: {timeZone}</span>
                  <span>Emergency 24/7: {emergencyPhone || contactPhone || "Available"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#E4E5E7]">
              <span className="text-xs text-[#5F6368]">
                Colors: Primary <code className="font-mono text-[#202124]">{brandPrimaryColor}</code>, Secondary <code className="font-mono text-[#202124]">{brandSecondaryColor}</code>
              </span>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-5 py-2 rounded-xl bg-[#24292F] text-white text-xs font-bold hover:bg-[#3D4450]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
