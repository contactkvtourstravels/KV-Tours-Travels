"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Printer,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  ShieldCheck,
  Building,
  MapPin,
  Phone,
  Mail,
  Compass,
  FileCheck,
  Check,
  ExternalLink,
} from "lucide-react";
import { adminApi, AdminSiteSettings } from "@/lib/api";

interface PdfVoucherSettingsSectionProps {
  settings: AdminSiteSettings;
  canEdit: boolean;
  onSaved: (updated: AdminSiteSettings) => void;
  onDirtyChange: (isDirty: boolean) => void;
}

export default function PdfVoucherSettingsSection({
  settings,
  canEdit,
  onSaved,
  onDirtyChange,
}: PdfVoucherSettingsSectionProps) {
  // Form fields
  const [headerTitle, setHeaderTitle] = useState(
    settings.pdf_header_title ||
      settings.legal_business_name ||
      settings.public_display_name ||
      settings.agency_name ||
      "KV TOURS & TRAVELS"
  );

  const [headerSubtitle, setHeaderSubtitle] = useState(
    settings.pdf_header_subtitle ||
      (settings.tagline
        ? `${settings.tagline} • ${settings.agency_location || "OPERATIONS HUB"}`
        : "BESPOKE LUXURY & ADVENTURE JOURNEYS • OPERATIONS HUB")
  );

  const [officeAddress, setOfficeAddress] = useState(
    settings.pdf_office_address ||
      settings.office_address ||
      settings.registered_office_address ||
      "Headquarters, India"
  );

  const [contactInfo, setContactInfo] = useState(
    settings.pdf_contact_info ||
      `Concierge Desk: ${settings.contact_phone || "+91 94420 00000"} | ${settings.contact_email || "contact.kvtourstravels@gmail.com"} | ${settings.website_url || "www.kvtours.in"}`
  );

  const [badgeLabel, setBadgeLabel] = useState(
    settings.pdf_badge_label || "Official Travel Voucher & Receipt"
  );

  const [logoUrl, setLogoUrl] = useState(
    settings.pdf_logo_url || settings.logo_url || ""
  );

  const [checkinInstructions, setCheckinInstructions] = useState(
    settings.pdf_checkin_instructions ||
      "Please present this official electronic voucher along with original government photo identification (or passport for international travel) during hotel check-in and departure assembly."
  );

  const [logisticsNotice, setLogisticsNotice] = useState(
    settings.pdf_logistics_notice ||
      "Scheduled chauffeured transfers and curated excursions are confirmed as per the booked itinerary. Your travel host details will be notified 24 hours prior to departure."
  );

  const [helplineInfo, setHelplineInfo] = useState(
    settings.pdf_helpline_info ||
      `${settings.agency_location || "Operations"} Desk: ${settings.contact_phone || "+91 94420 00000"} | Priority WhatsApp Desk: ${settings.whatsapp_number || "+91 94420 00000"} | ${settings.contact_email || "contact.kvtourstravels@gmail.com"}`
  );

  const [footerDeclaration, setFooterDeclaration] = useState(
    settings.pdf_footer_declaration ||
      `${settings.legal_business_name || settings.public_display_name || settings.agency_name || "KV Tours & Travels"} Operations • Official Travel Voucher\nComputer-generated authoritative travel document • Valid without physical signature`
  );

  // UI state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<"screen" | "print">("screen");

  // Track dirty changes
  useEffect(() => {
    const isDirty =
      headerTitle !== (settings.pdf_header_title || settings.legal_business_name || settings.public_display_name || settings.agency_name || "KV TOURS & TRAVELS") ||
      headerSubtitle !== (settings.pdf_header_subtitle || "") ||
      officeAddress !== (settings.pdf_office_address || settings.office_address || "") ||
      contactInfo !== (settings.pdf_contact_info || "") ||
      badgeLabel !== (settings.pdf_badge_label || "Official Travel Voucher & Receipt") ||
      logoUrl !== (settings.pdf_logo_url || "") ||
      checkinInstructions !== (settings.pdf_checkin_instructions || "") ||
      logisticsNotice !== (settings.pdf_logistics_notice || "") ||
      helplineInfo !== (settings.pdf_helpline_info || "") ||
      footerDeclaration !== (settings.pdf_footer_declaration || "");

    onDirtyChange(isDirty);
  }, [
    headerTitle,
    headerSubtitle,
    officeAddress,
    contactInfo,
    badgeLabel,
    logoUrl,
    checkinInstructions,
    logisticsNotice,
    helplineInfo,
    footerDeclaration,
    settings,
    onDirtyChange,
  ]);

  const handleAutoPopulate = () => {
    const agencyName =
      settings.legal_business_name ||
      settings.public_display_name ||
      settings.agency_name ||
      "KV TOURS & TRAVELS";

    setHeaderTitle(agencyName);
    setHeaderSubtitle(
      settings.tagline
        ? `${settings.tagline.toUpperCase()} • ${(settings.agency_location || "OPERATIONS HUB").toUpperCase()}`
        : "BESPOKE LUXURY & ADVENTURE JOURNEYS • OPERATIONS HUB"
    );
    setOfficeAddress(
      settings.office_address ||
        settings.registered_office_address ||
        settings.public_office_address ||
        "Headquarters, India"
    );

    const deskPhone = settings.contact_phone || "+91 94420 00000";
    const deskEmail = settings.booking_email || settings.contact_email || "contact.kvtourstravels@gmail.com";
    const deskWeb = settings.website_url || "www.kvtours.in";
    setContactInfo(`Concierge Desk: ${deskPhone} | ${deskEmail} | ${deskWeb}`);

    setBadgeLabel("Official Travel Voucher & Receipt");
    setLogoUrl(settings.logo_url || "");

    setCheckinInstructions(
      "Please present this official electronic voucher along with original government photo identification (or passport for international travel) during hotel check-in and departure assembly."
    );
    setLogisticsNotice(
      "Scheduled chauffeured transfers and curated excursions are confirmed as per the booked itinerary. Your travel host details will be notified 24 hours prior to departure."
    );

    const waNum = settings.whatsapp_number || settings.support_whatsapp || "+91 94420 00000";
    const loc = settings.agency_location || "Operations";
    setHelplineInfo(
      `${loc} Desk: ${deskPhone} | Priority WhatsApp: ${waNum} | ${deskEmail}`
    );

    setFooterDeclaration(
      `${agencyName} Operations • Official Travel Voucher\nComputer-generated authoritative travel document • Valid without physical signature`
    );
  };

  const handleResetDefaults = () => {
    setHeaderTitle("KV TOURS & TRAVELS");
    setHeaderSubtitle("BESPOKE LUXURY & ADVENTURE JOURNEYS • OPERATIONS HUB");
    setOfficeAddress("Headquarters, India");
    setContactInfo("Concierge Desk: +91 94420 00000 | contact.kvtourstravels@gmail.com | www.kvtours.in");
    setBadgeLabel("Official Travel Voucher & Receipt");
    setLogoUrl("");
    setCheckinInstructions(
      "Please present this official electronic voucher along with original government photo identification (or passport for international travel) during hotel check-in and departure assembly."
    );
    setLogisticsNotice(
      "Scheduled chauffeured transfers and curated excursions are confirmed as per the booked itinerary. Your travel host details will be notified 24 hours prior to departure."
    );
    setHelplineInfo(
      "Operations Desk: +91 94420 00000 | Priority WhatsApp: +91 94420 00000 | contact.kvtourstravels@gmail.com"
    );
    setFooterDeclaration(
      "KV TOURS & TRAVELS OPERATIONS • OFFICIAL TRAVEL VOUCHER\nComputer-generated authoritative travel document • Valid without physical signature"
    );
  };

  const handleSave = async () => {
    if (!canEdit) return;
    try {
      setSaving(true);
      setErrorMessage(null);

      const payload: Partial<AdminSiteSettings> = {
        pdf_header_title: headerTitle.trim() || null,
        pdf_header_subtitle: headerSubtitle.trim() || null,
        pdf_office_address: officeAddress.trim() || null,
        pdf_contact_info: contactInfo.trim() || null,
        pdf_badge_label: badgeLabel.trim() || null,
        pdf_logo_url: logoUrl.trim() || null,
        pdf_checkin_instructions: checkinInstructions.trim() || null,
        pdf_logistics_notice: logisticsNotice.trim() || null,
        pdf_helpline_info: helplineInfo.trim() || null,
        pdf_footer_declaration: footerDeclaration.trim() || null,
      };

      const updated = await adminApi.updateSettings(payload);
      onSaved(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: unknown) {
      setErrorMessage(
        (err as Error).message || "Failed to update PDF voucher document details."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Intro Header */}
      <div className="p-6 rounded-2xl bg-white border border-[#E4E5E7] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-[#8C6D3B]">
              <Printer className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-[#202124]">
              Official Travel Voucher &amp; PDF Letterhead Configuration
            </h2>
          </div>
          <p className="text-xs text-[#5F6368] max-w-2xl font-light">
            Customize authoritative letterhead styling, operations hub address, emergency concierge helpline,
            traveler arrival briefing, and digital authenticity seal rendered on customer vouchers and printable
            PDF documents.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleAutoPopulate}
            className="px-3.5 py-2 rounded-xl bg-[#F7F7F5] border border-[#D3D8DF] hover:bg-[#EAEAEA] text-[#202124] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Populate fields from active Agency Profile and Contact Details"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#8C6D3B]" />
            <span>Auto-Fill from Agency Profile</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-xl bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#5F6368] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reset to recommended luxury travel agency defaults"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Save Success & Error Notifications */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Travel Voucher settings successfully updated!</strong> Changes are live on customer booking
            confirmations, voucher modals, and printable PDFs.
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-800 text-xs shadow-xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ===================================================================== */}
        {/* LEFT COLUMN: EDIT CONTROLS                                            */}
        {/* ===================================================================== */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Letterhead & Organization Header */}
          <div className="bg-white rounded-2xl border border-[#E4E5E7] p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E4E5E7]">
              <Building className="w-4 h-4 text-[#8C6D3B]" />
              <h3 className="text-sm font-bold text-[#202124] uppercase tracking-wide">
                1. Letterhead &amp; Brand Header
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Letterhead Company / Legal Title
                </label>
                <input
                  type="text"
                  value={headerTitle}
                  onChange={(e) => setHeaderTitle(e.target.value)}
                  placeholder="e.g. KV TOURS & TRAVELS"
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] text-xs font-semibold text-[#202124] focus:outline-hidden focus:ring-2 focus:ring-[#8C6D3B]/20 focus:border-[#8C6D3B] transition-all"
                />
                <span className="text-[10px] text-[#5F6368] mt-1 block">
                  Prominently rendered in bold serif at the top-left of the official travel voucher.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Operations Subtitle / Regional Hub Label
                </label>
                <input
                  type="text"
                  value={headerSubtitle}
                  onChange={(e) => setHeaderSubtitle(e.target.value)}
                  placeholder="e.g. BESPOKE LUXURY & ADVENTURE JOURNEYS • COIMBATORE OPERATIONS HUB"
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] text-xs text-[#202124] focus:outline-hidden focus:ring-2 focus:ring-[#8C6D3B]/20 focus:border-[#8C6D3B] transition-all font-mono"
                />
                <span className="text-[10px] text-[#5F6368] mt-1 block">
                  Golden uppercase subline under company title specifying agency operations and regional hub.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#202124] mb-1">
                    Document Badge Label
                  </label>
                  <input
                    type="text"
                    value={badgeLabel}
                    onChange={(e) => setBadgeLabel(e.target.value)}
                    placeholder="e.g. Official Travel Voucher & Receipt"
                    disabled={!canEdit}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] text-xs text-[#202124] focus:outline-hidden focus:ring-2 focus:ring-[#8C6D3B]/20 focus:border-[#8C6D3B] transition-all"
                  />
                  <span className="text-[10px] text-[#5F6368] mt-1 block">
                    Bordered pill badge in the top-right corner.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#202124] mb-1">
                    Custom Letterhead Logo URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://... (Leave blank to use default logo)"
                    disabled={!canEdit}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] text-xs text-[#202124] focus:outline-hidden focus:ring-2 focus:ring-[#8C6D3B]/20 focus:border-[#8C6D3B] transition-all"
                  />
                  <span className="text-[10px] text-[#5F6368] mt-1 block">
                    High-resolution transparent PNG/SVG for letterhead.
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Official Office / Operations Hub Address
                </label>
                <input
                  type="text"
                  value={officeAddress}
                  onChange={(e) => setOfficeAddress(e.target.value)}
                  placeholder="e.g. Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu 641012, India"
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] text-xs text-[#202124] focus:outline-hidden focus:ring-2 focus:ring-[#8C6D3B]/20 focus:border-[#8C6D3B] transition-all"
                />
                <span className="text-[10px] text-[#5F6368] mt-1 block">
                  Official physical address displayed on customer receipts and print vouchers.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Contact Line (Phone, Email, Web)
                </label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="e.g. Concierge Desk: +91 98422 12345 | contact.kvtourstravels@gmail.com"
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] text-xs text-[#202124] focus:outline-hidden focus:ring-2 focus:ring-[#8C6D3B]/20 focus:border-[#8C6D3B] transition-all font-mono"
                />
                <span className="text-[10px] text-[#5F6368] mt-1 block">
                  Pipe-delimited contact desk line rendered beneath the office address.
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Traveler Guidelines & Logistics Briefing */}
          <div className="bg-white rounded-2xl border border-[#E4E5E7] p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E4E5E7]">
              <FileCheck className="w-4 h-4 text-[#8C6D3B]" />
              <h3 className="text-sm font-bold text-[#202124] uppercase tracking-wide">
                2. Traveler Guidelines &amp; Arrival Briefing
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Check-in Requirement Notice
                </label>
                <textarea
                  rows={2}
                  value={checkinInstructions}
                  onChange={(e) => setCheckinInstructions(e.target.value)}
                  placeholder="Official ID check and voucher presentation guidelines..."
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] text-xs text-[#202124] focus:outline-hidden focus:ring-2 focus:ring-[#8C6D3B]/20 focus:border-[#8C6D3B] transition-all resize-y"
                />
                <span className="text-[10px] text-[#5F6368] mt-1 block">
                  Briefs travellers on government ID requirements, hotel check-in assembly, and passport validity.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Private Logistics &amp; Host Notice
                </label>
                <textarea
                  rows={2}
                  value={logisticsNotice}
                  onChange={(e) => setLogisticsNotice(e.target.value)}
                  placeholder="Chauffeured transfers and travel host notification timeframe..."
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] text-xs text-[#202124] focus:outline-hidden focus:ring-2 focus:ring-[#8C6D3B]/20 focus:border-[#8C6D3B] transition-all resize-y"
                />
                <span className="text-[10px] text-[#5F6368] mt-1 block">
                  Explains vehicle dispatch, curated excursions timing, and chauffeur contact disclosure.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  24/7 Dedicated Concierge Helpline Details
                </label>
                <textarea
                  rows={2}
                  value={helplineInfo}
                  onChange={(e) => setHelplineInfo(e.target.value)}
                  placeholder="Operations desk phone, priority WhatsApp number, and concierge email..."
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] text-xs text-[#202124] focus:outline-hidden focus:ring-2 focus:ring-[#8C6D3B]/20 focus:border-[#8C6D3B] transition-all font-mono resize-y"
                />
                <span className="text-[10px] text-[#5F6368] mt-1 block">
                  Immediate emergency escalation channels printed for guests on tour.
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Official Authenticity Stamp & Footer */}
          <div className="bg-white rounded-2xl border border-[#E4E5E7] p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E4E5E7]">
              <ShieldCheck className="w-4 h-4 text-[#8C6D3B]" />
              <h3 className="text-sm font-bold text-[#202124] uppercase tracking-wide">
                3. Authenticity Stamp &amp; Document Footer
              </h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202124] mb-1">
                Authenticity &amp; Operations Portal Declaration
              </label>
              <textarea
                rows={2}
                value={footerDeclaration}
                onChange={(e) => setFooterDeclaration(e.target.value)}
                placeholder="Operations portal title and computer-generated non-signature notice..."
                disabled={!canEdit}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] text-xs text-[#202124] focus:outline-hidden focus:ring-2 focus:ring-[#8C6D3B]/20 focus:border-[#8C6D3B] transition-all resize-y leading-relaxed"
              />
              <span className="text-[10px] text-[#5F6368] mt-1 block">
                Printed in the footer seal alongside the Tamper-Proof Electronic Seal and authorization token.
              </span>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-between pt-2">
            <a
              href="/booking/confirmation/WR-2026-AL24S6"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#8C6D3B] font-semibold hover:underline"
            >
              <span>View Sample Customer Confirmation Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !canEdit}
              className="px-6 py-2.5 rounded-full bg-[#202124] hover:bg-[#3D4450] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Settings...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save PDF Details</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* RIGHT COLUMN: INTERACTIVE LIVE VOUCHER PREVIEW                       */}
        {/* ===================================================================== */}
        <div className="lg:col-span-5 sticky top-20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#8C6D3B]" />
              <span className="text-xs font-bold text-[#202124] uppercase tracking-wider">
                Live Voucher Preview
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#5F6368] bg-[#F7F7F5] border border-[#E4E5E7] px-2 py-0.5 rounded-md">
              Real-Time Rendering
            </span>
          </div>

          {/* Luxury Paper Card Replica */}
          <div className="bg-white rounded-2xl border-2 border-[#E4E5E7] p-5 shadow-lg space-y-4 text-[#111827]">
            {/* 1. Letterhead */}
            <div className="pb-4 border-b-2 border-[#C5A880] space-y-2">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt={headerTitle}
                      className="h-7 max-w-[120px] object-contain mb-1"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  )}
                  <div className="text-base font-serif font-black tracking-tight text-[#111827] truncate">
                    {headerTitle || "KV TOURS & TRAVELS"}
                  </div>
                  <div className="text-[8.5px] uppercase tracking-[0.2em] text-[#8C6D3B] font-bold mt-0.5 line-clamp-1">
                    {headerSubtitle || "BESPOKE LUXURY & ADVENTURE JOURNEYS • OPERATIONS HUB"}
                  </div>
                  <div className="text-[8px] text-[#4B5563] mt-1.5 space-y-0.5 leading-tight">
                    <div className="line-clamp-1">{officeAddress}</div>
                    <div className="line-clamp-1">{contactInfo}</div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="inline-block px-2 py-0.5 bg-[#F9FAFB] border border-[#C5A880] rounded text-[8px] uppercase tracking-widest font-bold text-[#8C6D3B]">
                    {badgeLabel || "Official Travel Voucher & Receipt"}
                  </div>
                  <div className="mt-1 font-mono text-xs font-extrabold tracking-wider text-[#111827]">
                    WR-2026-AL24S6
                  </div>
                  <div className="text-[8px] text-[#4B5563]">
                    Issued: 21 Oct 2026
                  </div>
                  <div className="mt-0.5 text-[8px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-end gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 inline" />
                    Verified &amp; Paid
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Sample Journey Spec Box */}
            <div className="p-3 rounded-xl bg-[#FBFBFA] border border-[#E5E7EB] space-y-1.5">
              <div className="text-[8px] font-bold uppercase tracking-wider text-[#8C6D3B]">
                Sample Journey Specifications
              </div>
              <div className="font-serif font-bold text-xs text-[#202124]">
                Rameshwaram &amp; Madurai — Sacred Teertham &amp; Temple Grandeur
              </div>
              <div className="grid grid-cols-3 gap-2 text-[8px] pt-1 border-t border-[#E5E7EB] text-[#5F6368]">
                <div>
                  <span className="block font-semibold text-[#111827]">Departure:</span>
                  Thu, 5 Nov 2026
                </div>
                <div>
                  <span className="block font-semibold text-[#111827]">Return:</span>
                  Sun, 8 Nov 2026
                </div>
                <div>
                  <span className="block font-semibold text-[#111827]">Travellers:</span>
                  1 Registered Guest
                </div>
              </div>
            </div>

            {/* 3. Traveler Guidelines Box */}
            <div className="p-3 rounded-xl bg-white border border-[#E5E7EB] space-y-1.5 text-[9px] leading-relaxed text-[#4B5563]">
              <div className="font-bold uppercase tracking-wider text-[8px] text-[#8C6D3B]">
                Important Traveler Guidelines &amp; Arrival Briefing
              </div>
              <ul className="list-disc list-inside space-y-1 text-[#374151]">
                <li className="line-clamp-2">
                  <strong>Check-in Requirement:</strong> {checkinInstructions}
                </li>
                <li className="line-clamp-2">
                  <strong>Private Logistics:</strong> {logisticsNotice}
                </li>
                <li className="line-clamp-2">
                  <strong>24/7 Helpline:</strong> {helplineInfo}
                </li>
              </ul>
            </div>

            {/* 4. Footer Authenticity Seal */}
            <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-[7.5px] text-[#6B7280]">
              <div className="min-w-0 pr-2">
                <div className="font-bold text-[#111827] uppercase tracking-wider whitespace-pre-line leading-tight">
                  {footerDeclaration}
                </div>
              </div>
              <div className="text-right font-mono shrink-0">
                <div className="font-bold text-[#111827]">AUTH-VERIFIED-WR-2026-AL24S6</div>
                <div className="text-[7px] text-[#9CA3AF]">Tamper-Proof Electronic Seal</div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 text-[11px] text-[#8C6D3B] space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5" />
              <span>Print &amp; PDF Formatting Note</span>
            </div>
            <p className="text-[10px] leading-relaxed text-[#5F6368]">
              When customers click <em>Save as PDF</em> or <em>Print Voucher</em>, Chrome/Safari renders this
              exact letterhead without navigation chrome or browser headers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
