"use client";

import React, { useState, useEffect } from "react";
import {
  MessageCircle,
  Phone,
  Save,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  Copy,
  Check,
  Smartphone,
  ToggleLeft,
  ToggleRight,
  Info,
} from "lucide-react";
import { adminApi, AdminSiteSettings } from "@/lib/api";
import { normalizeWhatsAppNumber } from "@/lib/constants";

interface WhatsAppClickToChatSectionProps {
  settings: AdminSiteSettings;
  canEdit: boolean;
  onSaved: (updated: AdminSiteSettings) => void;
  onDirtyChange: (isDirty: boolean) => void;
}

export default function WhatsAppClickToChatSection({
  settings,
  canEdit,
  onSaved,
  onDirtyChange,
}: WhatsAppClickToChatSectionProps) {
  // Click-to-Chat States
  const [waCountryCode, setWaCountryCode] = useState(settings.whatsapp_country_code || "+91");
  const [waNumber, setWaNumber] = useState(
    settings.whatsapp_number || settings.support_whatsapp || "9842212345"
  );
  const [waPrefilledMessage, setWaPrefilledMessage] = useState(
    settings.whatsapp_prefilled_message ||
      "Namaste The Wild Route Palakkad, please assist me with holiday packages."
  );
  const [packageInquiryMessage, setPackageInquiryMessage] = useState(
    settings.whatsapp_package_message ||
      "Hello The Wild Route, I am interested in booking the {package_name} package. Please share details and availability."
  );
  const [destinationInquiryMessage, setDestinationInquiryMessage] = useState(
    settings.whatsapp_destination_message ||
      "Hi The Wild Route, I would like to explore custom itineraries for {destination_name}."
  );
  const [customTripMessage, setCustomTripMessage] = useState(
    settings.whatsapp_custom_trip_message ||
      "Namaste, I would like to plan a bespoke luxury holiday with The Wild Route."
  );
  const [bookingSupportMessage, setBookingSupportMessage] = useState(
    settings.whatsapp_booking_support_message ||
      "Hello The Wild Route Concierge, I need assistance with my booking {booking_reference}."
  );

  // Visibility & Feature Toggles
  const [waEnabled, setWaEnabled] = useState(settings.whatsapp_enabled ?? true);
  const [waShowOnHomepage, setWaShowOnHomepage] = useState(settings.whatsapp_show_on_homepage ?? true);
  const [waShowOnFooter, setWaShowOnFooter] = useState(settings.whatsapp_show_on_footer ?? true);
  const [waShowOnPackagePages, setWaShowOnPackagePages] = useState(settings.whatsapp_show_on_package_pages ?? true);
  const [waShowOnContactPage, setWaShowOnContactPage] = useState(settings.whatsapp_show_on_contact_page ?? true);
  const [waConciergeFloating, setWaConciergeFloating] = useState(
    settings.whatsapp_concierge_floating ??
    settings.whatsapp_show_floating_concierge ??
    true
  );

  // UI States
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copiedLink, setCopiedLink] = useState(false);
  const [numberValidationResult, setNumberValidationResult] = useState<string | null>(null);

  // Track dirty changes
  useEffect(() => {
    const isDirty =
      waCountryCode !== (settings.whatsapp_country_code || "+91") ||
      waNumber !== (settings.whatsapp_number || settings.support_whatsapp || "9842212345") ||
      waPrefilledMessage !==
        (settings.whatsapp_prefilled_message ||
          "Namaste The Wild Route Palakkad, please assist me with holiday packages.") ||
      packageInquiryMessage !==
        (settings.whatsapp_package_message ||
          "Hello The Wild Route, I am interested in booking the {package_name} package. Please share details and availability.") ||
      destinationInquiryMessage !==
        (settings.whatsapp_destination_message ||
          "Hi The Wild Route, I would like to explore custom itineraries for {destination_name}.") ||
      customTripMessage !==
        (settings.whatsapp_custom_trip_message ||
          "Namaste, I would like to plan a bespoke luxury holiday with The Wild Route.") ||
      bookingSupportMessage !==
        (settings.whatsapp_booking_support_message ||
          "Hello The Wild Route Concierge, I need assistance with my booking {booking_reference}.") ||
      waEnabled !== (settings.whatsapp_enabled ?? true) ||
      waShowOnHomepage !== (settings.whatsapp_show_on_homepage ?? true) ||
      waShowOnFooter !== (settings.whatsapp_show_on_footer ?? true) ||
      waShowOnPackagePages !== (settings.whatsapp_show_on_package_pages ?? true) ||
      waShowOnContactPage !== (settings.whatsapp_show_on_contact_page ?? true) ||
      waConciergeFloating !==
        (settings.whatsapp_concierge_floating ??
          settings.whatsapp_show_floating_concierge ??
          true);

    onDirtyChange(isDirty);
  }, [
    waCountryCode,
    waNumber,
    waPrefilledMessage,
    packageInquiryMessage,
    destinationInquiryMessage,
    customTripMessage,
    bookingSupportMessage,
    waEnabled,
    waShowOnHomepage,
    waShowOnFooter,
    waShowOnPackagePages,
    waShowOnContactPage,
    waConciergeFloating,
    settings,
    onDirtyChange,
  ]);

  // Clean formatted phone for wa.me link with safe deduplicated normalization
  const fullIntlDigits = normalizeWhatsAppNumber(waNumber, waCountryCode);
  const generatedWaUrl = fullIntlDigits
    ? `https://wa.me/${fullIntlDigits}${waPrefilledMessage ? `?text=${encodeURIComponent(waPrefilledMessage)}` : ""}`
    : "";

  const validatePhoneNumber = () => {
    if (!waNumber.trim()) {
      setNumberValidationResult("Error: WhatsApp number cannot be empty.");
      return;
    }
    const cleanOnly = waNumber.replace(/\D/g, "");
    if (cleanOnly.length < 7 || cleanOnly.length > 15) {
      setNumberValidationResult(
        `Invalid length: Phone number contains ${cleanOnly.length} digits. Standard numbers have 7-15 digits.`
      );
      return;
    }
    if (!fullIntlDigits || fullIntlDigits.length < 8) {
      setNumberValidationResult("Error: Could not parse a valid international phone number.");
      return;
    }
    setNumberValidationResult(
      `✓ Valid International E.164: +${fullIntlDigits} (Ready for WhatsApp links)`
    );
  };

  const handleCopyLink = () => {
    if (!generatedWaUrl) return;
    navigator.clipboard.writeText(generatedWaUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleReset = () => {
    setWaCountryCode(settings.whatsapp_country_code || "+91");
    setWaNumber(settings.whatsapp_number || settings.support_whatsapp || "9842212345");
    setWaPrefilledMessage(
      settings.whatsapp_prefilled_message ||
        "Namaste The Wild Route Palakkad, please assist me with holiday packages."
    );
    setPackageInquiryMessage(
      settings.whatsapp_package_message ||
        "Hello The Wild Route, I am interested in booking the {package_name} package. Please share details and availability."
    );
    setDestinationInquiryMessage(
      settings.whatsapp_destination_message ||
        "Hi The Wild Route, I would like to explore custom itineraries for {destination_name}."
    );
    setCustomTripMessage(
      settings.whatsapp_custom_trip_message ||
        "Namaste, I would like to plan a bespoke luxury holiday with The Wild Route."
    );
    setBookingSupportMessage(
      settings.whatsapp_booking_support_message ||
        "Hello The Wild Route Concierge, I need assistance with my booking {booking_reference}."
    );
    setWaEnabled(settings.whatsapp_enabled ?? true);
    setWaShowOnHomepage(settings.whatsapp_show_on_homepage ?? true);
    setWaShowOnFooter(settings.whatsapp_show_on_footer ?? true);
    setWaShowOnPackagePages(settings.whatsapp_show_on_package_pages ?? true);
    setWaShowOnContactPage(settings.whatsapp_show_on_contact_page ?? true);
    setWaConciergeFloating(
      settings.whatsapp_concierge_floating ??
      settings.whatsapp_show_floating_concierge ??
      true
    );
    setErrors({});
    setNumberValidationResult(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    const validationErrors: Record<string, string> = {};
    const cleanOnly = waNumber.replace(/\D/g, "");
    if (!waNumber.trim()) {
      validationErrors.whatsapp_number = "WhatsApp number is required.";
    } else if (cleanOnly.length < 7 || cleanOnly.length > 15) {
      validationErrors.whatsapp_number = "WhatsApp number must be 7 to 15 digits.";
    } else if (!fullIntlDigits) {
      validationErrors.whatsapp_number = "Invalid WhatsApp number format.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setSaving(true);
      setErrors({});

      const payload: Partial<AdminSiteSettings> = {
        whatsapp_country_code: waCountryCode.trim(),
        whatsapp_number: waNumber.trim(),
        whatsapp_prefilled_message: waPrefilledMessage.trim(),
        whatsapp_package_message: packageInquiryMessage.trim(),
        whatsapp_destination_message: destinationInquiryMessage.trim(),
        whatsapp_custom_trip_message: customTripMessage.trim(),
        whatsapp_booking_support_message: bookingSupportMessage.trim(),
        whatsapp_enabled: waEnabled,
        whatsapp_show_on_homepage: waShowOnHomepage,
        whatsapp_show_on_footer: waShowOnFooter,
        whatsapp_show_on_package_pages: waShowOnPackagePages,
        whatsapp_show_on_contact_page: waShowOnContactPage,
        whatsapp_show_floating_concierge: waConciergeFloating,
      };

      const updated = await adminApi.updateSettings(payload);
      onSaved(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      setErrors({ global: (err as Error).message || "Failed to save WhatsApp Click-to-Chat settings." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <MessageCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif font-bold text-[#202124]">
                  WhatsApp Click-to-Chat Concierge
                </h2>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    waEnabled
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {waEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <p className="text-xs text-[#5F6368] mt-1 max-w-2xl font-light">
                Configure direct chat links for travelers on WhatsApp Web or mobile apps. When travelers click
                any inquiry button, they are instantly redirected to your agency chat with prefilled context.
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
            <span>WhatsApp Click-to-Chat settings saved and updated across all public buttons!</span>
          </div>
        )}

        {errors.global && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errors.global}</span>
          </div>
        )}
      </div>

      {/* Master Toggle & Master Phone Card */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-[#E4E5E7]">
          <div>
            <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>Master Click-to-Chat Switch</span>
            </h3>
            <p className="text-xs text-[#5F6368] mt-0.5">
              Turn off all public WhatsApp chat links instantly across the entire website if your agency is offline.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setWaEnabled(!waEnabled)}
            disabled={!canEdit}
            className={`p-1.5 rounded-xl transition-all ${
              waEnabled ? "text-emerald-600 hover:text-emerald-700" : "text-stone-400 hover:text-stone-500"
            }`}
          >
            {waEnabled ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              Country Calling Code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={waCountryCode}
              onChange={(e) => setWaCountryCode(e.target.value)}
              disabled={!canEdit}
              placeholder="+91"
              className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50 font-mono"
            />
            <p className="text-[10px] text-[#5F6368] mt-1">E.g., +91 for India, +1 for USA</p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              Business WhatsApp Number <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={waNumber}
                onChange={(e) => setWaNumber(e.target.value)}
                disabled={!canEdit}
                placeholder="9842212345"
                className={`flex-1 px-3 py-2 bg-white border rounded-xl text-xs focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50 font-mono ${
                  errors.whatsapp_number ? "border-rose-400 bg-rose-50/30" : "border-[#D3D8DF]"
                }`}
              />
              <button
                type="button"
                onClick={validatePhoneNumber}
                className="px-3.5 py-2 bg-[#F7F7F5] border border-[#D3D8DF] hover:bg-stone-200 text-[#202124] text-xs font-semibold rounded-xl transition-all shadow-2xs whitespace-nowrap"
              >
                Validate Number
              </button>
            </div>
            {errors.whatsapp_number && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.whatsapp_number}</p>
            )}
            {numberValidationResult && (
              <p
                className={`text-[11px] mt-1 font-mono ${
                  numberValidationResult.startsWith("✓") ? "text-emerald-700" : "text-rose-600"
                }`}
              >
                {numberValidationResult}
              </p>
            )}
          </div>
        </div>

        {/* Live Test & Preview URL Box */}
        <div className="p-4 bg-[#F9F9F8] border border-[#E4E5E7] rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#C5A880]" />
              Generated Click-to-Chat URL
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-[11px] font-semibold text-[#5F6368] hover:text-[#202124] flex items-center gap-1 transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? "Copied Link" : "Copy URL"}</span>
              </button>
              <a
                href={generatedWaUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!generatedWaUrl) e.preventDefault();
                }}
                className={`text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  generatedWaUrl
                    ? "text-emerald-700 hover:text-emerald-800 cursor-pointer"
                    : "text-stone-400 pointer-events-none"
                }`}
                aria-disabled={!generatedWaUrl}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Test Chat</span>
              </a>
            </div>
          </div>
          <div className="p-2.5 bg-white border border-[#D3D8DF] rounded-lg text-xs font-mono text-[#202124] break-all select-all">
            {generatedWaUrl}
          </div>
        </div>
      </div>

      {/* Prefilled Messages Configuration */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-5">
        <div>
          <h3 className="text-sm font-bold text-[#202124]">Contextual Prefilled Messages</h3>
          <p className="text-xs text-[#5F6368] mt-0.5">
            Customize what message opens in WhatsApp when a user inquires from different touchpoints.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              General Inquiries (Default / Floating Concierge) <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={waPrefilledMessage}
              onChange={(e) => setWaPrefilledMessage(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              Package Detail Page Inquiries
            </label>
            <input
              type="text"
              value={packageInquiryMessage}
              onChange={(e) => setPackageInquiryMessage(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50"
            />
            <p className="text-[10px] text-[#5F6368] mt-1 font-mono">
              Tokens: {"{package_name}"}, {"{destination}"}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              Destination Page Inquiries
            </label>
            <input
              type="text"
              value={destinationInquiryMessage}
              onChange={(e) => setDestinationInquiryMessage(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50"
            />
            <p className="text-[10px] text-[#5F6368] mt-1 font-mono">
              Tokens: {"{destination_name}"}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              Custom Luxury Itinerary Requests
            </label>
            <input
              type="text"
              value={customTripMessage}
              onChange={(e) => setCustomTripMessage(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              Customer Booking Support (Booking Confirmation &amp; Dashboard)
            </label>
            <input
              type="text"
              value={bookingSupportMessage}
              onChange={(e) => setBookingSupportMessage(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50"
            />
            <p className="text-[10px] text-[#5F6368] mt-1 font-mono">
              Tokens: {"{booking_reference}"}
            </p>
          </div>
        </div>
      </div>

      {/* Button Placements & Visibility Toggles */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#202124]">Touchpoint &amp; Button Visibility</h3>
          <p className="text-xs text-[#5F6368] mt-0.5">
            Control exactly where WhatsApp CTAs appear on the public storefront.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <label className="p-3 bg-[#F9F9F8] border border-[#E4E5E7] rounded-xl flex items-center justify-between cursor-pointer hover:bg-stone-100 transition-colors">
            <div>
              <span className="text-xs font-bold text-[#202124] block">Floating Concierge Widget</span>
              <span className="text-[11px] text-[#5F6368]">Floating chat bubble on bottom-right of pages</span>
            </div>
            <input
              type="checkbox"
              checked={waConciergeFloating}
              onChange={(e) => setWaConciergeFloating(e.target.checked)}
              disabled={!canEdit}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
          </label>

          <label className="p-3 bg-[#F9F9F8] border border-[#E4E5E7] rounded-xl flex items-center justify-between cursor-pointer hover:bg-stone-100 transition-colors">
            <div>
              <span className="text-xs font-bold text-[#202124] block">Homepage Hero &amp; Bar</span>
              <span className="text-[11px] text-[#5F6368]">Top navigation CTA &amp; hero banner button</span>
            </div>
            <input
              type="checkbox"
              checked={waShowOnHomepage}
              onChange={(e) => setWaShowOnHomepage(e.target.checked)}
              disabled={!canEdit}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
          </label>

          <label className="p-3 bg-[#F9F9F8] border border-[#E4E5E7] rounded-xl flex items-center justify-between cursor-pointer hover:bg-stone-100 transition-colors">
            <div>
              <span className="text-xs font-bold text-[#202124] block">Global Footer Contact</span>
              <span className="text-[11px] text-[#5F6368]">Direct WhatsApp link in footer columns</span>
            </div>
            <input
              type="checkbox"
              checked={waShowOnFooter}
              onChange={(e) => setWaShowOnFooter(e.target.checked)}
              disabled={!canEdit}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
          </label>

          <label className="p-3 bg-[#F9F9F8] border border-[#E4E5E7] rounded-xl flex items-center justify-between cursor-pointer hover:bg-stone-100 transition-colors">
            <div>
              <span className="text-xs font-bold text-[#202124] block">Package Details Pages</span>
              <span className="text-[11px] text-[#5F6368]">&quot;Inquire on WhatsApp&quot; on itineraries</span>
            </div>
            <input
              type="checkbox"
              checked={waShowOnPackagePages}
              onChange={(e) => setWaShowOnPackagePages(e.target.checked)}
              disabled={!canEdit}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
          </label>

          <label className="p-3 bg-[#F9F9F8] border border-[#E4E5E7] rounded-xl flex items-center justify-between cursor-pointer hover:bg-stone-100 transition-colors sm:col-span-2">
            <div>
              <span className="text-xs font-bold text-[#202124] block">Contact &amp; About Pages</span>
              <span className="text-[11px] text-[#5F6368]">Interactive WhatsApp card on /contact &amp; /about</span>
            </div>
            <input
              type="checkbox"
              checked={waShowOnContactPage}
              onChange={(e) => setWaShowOnContactPage(e.target.checked)}
              disabled={!canEdit}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
          </label>
        </div>
      </div>
    </form>
  );
}
