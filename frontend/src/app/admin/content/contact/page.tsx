"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Save,
  Send,
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  Compass,
  Monitor,
  Smartphone,
  X,
  Upload,
  Navigation,
} from "lucide-react";
import {
  adminApi,
  ContactPageContent,
  AdminPageEnvelopeResponse,
} from "@/lib/api";
import { useAdmin } from "../../AdminContext";

export default function AdminContactContentPage() {
  const { hasAnyRole } = useAdmin();
  const canEdit = hasAnyRole(["admin", "super_admin"]);

  const [envelope, setEnvelope] = useState<AdminPageEnvelopeResponse<ContactPageContent> | null>(null);
  const [content, setContent] = useState<ContactPageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | null>(null);
  type ContactTab = "hero" | "cards" | "form" | "map" | "seo";
  const [activeTab, setActiveTab] = useState<ContactTab>("hero");





  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const loadPage = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getPageEnvelope<ContactPageContent>("contact");
      setEnvelope(res);
      setContent(res.draft);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load Contact page content";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  // Handle Save Draft
  const handleSaveDraft = async () => {
    if (!content) return;
    try {
      setSaving(true);
      const updated = await adminApi.updatePageDraft<ContactPageContent>("contact", {
        draft: content,
        publish_immediately: false,
      });
      setEnvelope(updated);
      setContent(updated.draft);
      showToast("Contact draft saved successfully. Live page remains unchanged until published.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save draft";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  // Handle Publish Live
  const handlePublish = async () => {
    if (!content) return;
    try {
      setPublishing(true);
      await adminApi.updatePageDraft<ContactPageContent>("contact", {
        draft: content,
        publish_immediately: false,
      });
      const published = await adminApi.publishPage<ContactPageContent>("contact");
      setEnvelope(published);
      setContent(published.draft);
      showToast("Contact page published to live website! Public visitors now see this version.", "success");
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
      const reverted = await adminApi.discardPageDraft<ContactPageContent>("contact");
      setEnvelope(reverted);
      setContent(reverted.draft);
      setShowDiscardConfirm(false);
      showToast("Unpublished contact draft discarded. Content restored to live version.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to discard draft";
      showToast(msg, "error");
    } finally {
      setDiscarding(false);
    }
  };

  // Auto-clean iframe embed paste
  const handleEmbedUrlChange = (raw: string) => {
    if (!content) return;
    let clean = raw.trim();
    if (clean.includes("<iframe") && clean.includes('src="')) {
      const match = clean.match(/src=["']([^"']+)["']/i);
      if (match && match[1]) {
        clean = match[1].trim();
      }
    }
    setContent({
      ...content,
      map: { ...content.map, embed_url: clean || null },
    });
  };

  if (loading || !content) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center text-[#202124]">
        <div className="w-10 h-10 border-4 border-[#24292F] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold uppercase tracking-widest text-[#70757A]">
          Loading Contact Page Content...
        </p>
      </div>
    );
  }

  const agencyName = envelope?.agency_context?.agency_name || "KV Tours & Travels";
  const city = envelope?.agency_context?.city || "Coimbatore";

  return (
    <div className="space-y-8 pb-20">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl border flex items-center gap-3 transition-all transform animate-in slide-in-from-bottom-5 ${
            toast.type === "success"
              ? "bg-[#EBF7F2] border-[#A7E2CB] text-[#0D7A53]"
              : "bg-rose-50 border-rose-200 text-rose-700"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Discard Confirmation Modal */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E4E5E7] p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in-50 zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-[#202124]">Discard Contact Draft?</h3>
              <p className="text-xs sm:text-sm text-[#70757A] mt-2 leading-relaxed">
                All changes made since the last published version will be reverted to the live version.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-4 py-2.5 rounded-xl border border-[#D3D8DF] text-xs font-semibold text-[#70757A] hover:bg-[#F7F7F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={discarding}
                onClick={handleDiscard}
                className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 shadow-sm disabled:opacity-50"
              >
                {discarding ? "Discarding..." : "Yes, Discard Draft"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Sticky Actions Bar */}
      <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#5F6368] font-semibold mb-2">
              <span>Website Content</span>
              <span>/</span>
              <span className="text-[#202124]">Contact Page</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#202124]">
              Contact Page Management
            </h1>
            <p className="text-xs sm:text-sm text-[#70757A] mt-1.5 max-w-2xl font-light">
              Manage office coordinates, phone/email contact details, inquiry topics, Google Maps embed &amp; directions on{" "}
              <code className="text-[#24292F] bg-[#F7F7F5] px-1.5 py-0.5 rounded-md font-mono text-xs">/contact</code>.
            </p>
            {/* Status pills */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              {envelope?.has_unpublished_changes ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Unpublished Draft Saved {envelope.draft_saved_at ? `(${new Date(envelope.draft_saved_at).toLocaleTimeString()})` : ""}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Live &amp; Synchronized
                </span>
              )}
              {envelope?.published_at && (
                <span className="text-xs text-[#70757A]">
                  Last published: {new Date(envelope.published_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setPreviewMode("desktop")}
              className="px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-[#24292F] text-xs font-semibold hover:bg-[#F7F7F5] transition-all flex items-center gap-2 shadow-2xs"
            >
              <Eye className="w-4 h-4 text-[#5F6368]" />
              <span>Preview</span>
            </button>

            <Link
              href="/contact?preview=true"
              target="_blank"
              className="px-3.5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-[#5F6368] hover:text-[#202124] text-xs font-semibold hover:bg-[#F7F7F5] transition-all flex items-center gap-1.5 shadow-2xs"
              title="Open preview in a new tab"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">New Tab</span>
            </Link>

            {envelope?.has_unpublished_changes && (
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(true)}
                className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Discard</span>
              </button>
            )}

            <button
              type="button"
              disabled={saving || !canEdit}
              onClick={handleSaveDraft}
              className="px-5 py-2.5 rounded-xl border border-[#24292F] bg-white hover:bg-[#F7F7F5] text-[#24292F] text-xs font-bold transition-all shadow-2xs flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving Draft..." : "Save Draft"}</span>
            </button>

            <button
              type="button"
              disabled={publishing || !canEdit}
              onClick={handlePublish}
              className="px-6 py-2.5 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{publishing ? "Publishing..." : "Publish to Live"}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-6 mt-6 border-t border-[#E4E5E7] no-scrollbar">
          {[
            { id: "hero", label: "Hero Banner" },
            { id: "cards", label: "Office & Contact Cards" },
            { id: "form", label: "Inquiry Form & Topics" },
            { id: "map", label: "Google Maps & Directions" },
            { id: "seo", label: "SEO & Social" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ContactTab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-[#24292F] text-white shadow-2xs"
                  : "bg-[#F7F7F5] text-[#5F6368] hover:text-[#202124] hover:bg-[#ECEFF3]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Editor Body */}
      <div className="space-y-8">
        {/* TAB 1: HERO */}
        {activeTab === "hero" && (
          <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#E4E5E7]">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#202124]">Hero Banner Section</h3>
                <p className="text-xs text-[#70757A] mt-1 font-light">
                  Header section rendered at the top of the Contact page.
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#202124] cursor-pointer">
                <input
                  type="checkbox"
                  checked={content.hero.show_section}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      hero: { ...content.hero, show_section: e.target.checked },
                    })
                  }
                  className="rounded border-[#D3D8DF] text-[#24292F] focus:ring-0"
                />
                <span>Display Hero Section</span>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                  Eyebrow Pill Text
                </label>
                <input
                  type="text"
                  value={content.hero.eyebrow}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      hero: { ...content.hero, eyebrow: e.target.value },
                    })
                  }
                  placeholder="e.g. Concierge Desk"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                  Hero Main Heading
                </label>
                <input
                  type="text"
                  value={content.hero.heading}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      hero: { ...content.hero, heading: e.target.value },
                    })
                  }
                  placeholder="Connect With Our Travel Experts"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124] font-serif font-bold text-lg"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                  Hero Description / Subtitle
                </label>
                <textarea
                  rows={3}
                  value={content.hero.description}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      hero: { ...content.hero, description: e.target.value },
                    })
                  }
                  placeholder="Have questions regarding upcoming departures, custom itineraries, or visa requirements? We are here to guide you every step of the way."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: OFFICE & CONTACT CARDS */}
        {activeTab === "cards" && (
          <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 space-y-8 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#E4E5E7]">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#202124]">
                  Office, Phone &amp; WhatsApp Cards
                </h3>
                <p className="text-xs text-[#70757A] mt-1 font-light">
                  Card information displayed alongside the contact form. Empty fields cleanly fall back to Agency Profile settings.
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#202124] cursor-pointer">
                <input
                  type="checkbox"
                  checked={content.cards.show_section}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      cards: { ...content.cards, show_section: e.target.checked },
                    })
                  }
                  className="rounded border-[#D3D8DF] text-[#24292F] focus:ring-0"
                />
                <span>Display Cards Section</span>
              </label>
            </div>

            {/* Card 1: Office Address Card */}
            <div className="p-6 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#202124] uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-[#3D4450]" />
                <span>Office Location Card</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Card Eyebrow
                  </label>
                  <input
                    type="text"
                    value={content.cards.office_card_title}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        cards: { ...content.cards, office_card_title: e.target.value },
                      })
                    }
                    placeholder="Visit Our Office"
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-white text-sm text-[#202124]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Card Subheading (City / Region)
                  </label>
                  <input
                    type="text"
                    value={content.cards.office_card_heading}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        cards: { ...content.cards, office_card_heading: e.target.value },
                      })
                    }
                    placeholder={`e.g. ${city}, Tamil Nadu`}
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-white text-sm text-[#202124]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                  Full Physical Address
                </label>
                <textarea
                  rows={2}
                  value={content.cards.office_address}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      cards: { ...content.cards, office_address: e.target.value },
                    })
                  }
                  placeholder="Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu 641012"
                  className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-white text-sm text-[#202124]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                  Operating Hours
                </label>
                <input
                  type="text"
                  value={content.cards.operating_hours}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      cards: { ...content.cards, operating_hours: e.target.value },
                    })
                  }
                  placeholder="Mon – Sat: 09:30 AM – 07:30 PM IST"
                  className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-white text-sm text-[#202124]"
                />
              </div>
            </div>

            {/* Card 2: Phone & Email Card */}
            <div className="p-6 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#202124] uppercase tracking-wider">
                <Phone className="w-4 h-4 text-[#3D4450]" />
                <span>Call &amp; Email Inquiries Card</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Card Title
                  </label>
                  <input
                    type="text"
                    value={content.cards.phone_card_title}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        cards: { ...content.cards, phone_card_title: e.target.value },
                      })
                    }
                    placeholder="Direct Inquiries"
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-white text-sm text-[#202124]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Primary Phone Number
                  </label>
                  <input
                    type="text"
                    value={content.cards.primary_phone}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        cards: { ...content.cards, primary_phone: e.target.value },
                      })
                    }
                    placeholder="+91 94420 00000"
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-white text-sm text-[#202124]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Secondary Office Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={content.cards.secondary_phone || ""}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        cards: { ...content.cards, secondary_phone: e.target.value || null },
                      })
                    }
                    placeholder="0422 2490000"
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-white text-sm text-[#202124]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Emergency 24/7 Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={content.cards.emergency_phone || ""}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        cards: { ...content.cards, emergency_phone: e.target.value || null },
                      })
                    }
                    placeholder="+91 98422 00000"
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-white text-sm text-[#202124]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                  Contact &amp; Inquiries Email
                </label>
                <input
                  type="email"
                  value={content.cards.contact_email}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      cards: { ...content.cards, contact_email: e.target.value },
                    })
                  }
                  placeholder="contact@agency.in"
                  className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-white text-sm text-[#202124]"
                />
              </div>
            </div>

            {/* Card 3: WhatsApp Concierge Card */}
            <div className="p-6 rounded-2xl bg-[#EBF7F2] border border-[#A7E2CB] space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0D7A53] uppercase tracking-wider">
                <MessageCircle className="w-4 h-4" />
                <span>Fast WhatsApp Concierge Card</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#0D7A53] mb-1">
                    Card Title
                  </label>
                  <input
                    type="text"
                    value={content.cards.whatsapp_card_title}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        cards: { ...content.cards, whatsapp_card_title: e.target.value },
                      })
                    }
                    placeholder="Fast WhatsApp Assistance"
                    className="w-full px-3 py-2 rounded-xl border border-[#A7E2CB] bg-white text-sm text-[#202124]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#0D7A53] mb-1">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={content.cards.whatsapp_button_text}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        cards: { ...content.cards, whatsapp_button_text: e.target.value },
                      })
                    }
                    placeholder="Chat on WhatsApp"
                    className="w-full px-3 py-2 rounded-xl border border-[#A7E2CB] bg-white text-sm text-[#202124]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#0D7A53] mb-1">
                  Card Description
                </label>
                <textarea
                  rows={2}
                  value={content.cards.whatsapp_card_description}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      cards: { ...content.cards, whatsapp_card_description: e.target.value },
                    })
                  }
                  placeholder={`Need quick departure availability, brochure PDFs, or urgent quotes? Our ${city} team is active on WhatsApp daily.`}
                  className="w-full px-3 py-2 rounded-xl border border-[#A7E2CB] bg-white text-sm text-[#202124]"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CONTACT FORM & INQUIRY TOPICS */}
        {activeTab === "form" && (
          <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#E4E5E7]">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#202124]">
                  Contact Form &amp; Topic Options
                </h3>
                <p className="text-xs text-[#70757A] mt-1 font-light">
                  Submitted inquiries automatically route to the admin Inquiries desk and database.
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#202124] cursor-pointer">
                <input
                  type="checkbox"
                  checked={content.form.show_section}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      form: { ...content.form, show_section: e.target.checked },
                    })
                  }
                  className="rounded border-[#D3D8DF] text-[#24292F] focus:ring-0"
                />
                <span>Display Form Section</span>
              </label>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Form Eyebrow
                  </label>
                  <input
                    type="text"
                    value={content.form.eyebrow}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        form: { ...content.form, eyebrow: e.target.value },
                      })
                    }
                    placeholder="Send a Message"
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Form Heading
                  </label>
                  <input
                    type="text"
                    value={content.form.heading}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        form: { ...content.form, heading: e.target.value },
                      })
                    }
                    placeholder="How Can We Assist Your Travels?"
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124] font-serif font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                  Success Message (Shown after successful submission)
                </label>
                <textarea
                  rows={2}
                  value={content.form.success_message}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      form: { ...content.form, success_message: e.target.value },
                    })
                  }
                  placeholder="Thank you! Our travel concierge has received your message and will reach out shortly."
                  className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                />
              </div>

              {/* Inquiry Topics list */}
              <div className="pt-4 border-t border-[#E4E5E7] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-[#70757A]">
                      Inquiry Topic Options ({content.form.topics.length})
                    </span>
                    <p className="text-[11px] text-[#70757A]">
                      Shown in the dropdown select menu of the public contact form.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setContent({
                        ...content,
                        form: {
                          ...content.form,
                          topics: [...content.form.topics, "New Topic Option"],
                        },
                      })
                    }
                    className="px-3 py-1.5 rounded-xl border border-[#D3D8DF] bg-white text-xs font-semibold text-[#24292F] hover:bg-[#F7F7F5] flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Topic Option</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {content.form.topics.map((topic, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="w-6 text-center text-xs font-bold text-[#70757A]">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => {
                          const next = [...content.form.topics];
                          next[idx] = e.target.value;
                          setContent({
                            ...content,
                            form: { ...content.form, topics: next },
                          });
                        }}
                        className="flex-1 px-3 py-2 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = content.form.topics.filter((_, i) => i !== idx);
                          setContent({
                            ...content,
                            form: { ...content.form, topics: next },
                          });
                        }}
                        className="p-2 rounded-xl text-rose-600 hover:bg-rose-50"
                        title="Delete topic"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: GOOGLE MAPS & DIRECTIONS */}
        {activeTab === "map" && (
          <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#E4E5E7]">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#202124]">
                  Google Maps Location &amp; Directions
                </h3>
                <p className="text-xs text-[#70757A] mt-1 font-light">
                  Embed interactive office map, pin location, and direct Google Maps navigation button.
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#202124] cursor-pointer">
                <input
                  type="checkbox"
                  checked={content.map.show_map}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      map: { ...content.map, show_map: e.target.checked },
                    })
                  }
                  className="rounded border-[#D3D8DF] text-[#24292F] focus:ring-0"
                />
                <span>Display Google Map on Page</span>
              </label>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Map Section Title
                  </label>
                  <input
                    type="text"
                    value={content.map.map_title}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        map: { ...content.map, map_title: e.target.value },
                      })
                    }
                    placeholder="Find Our Office Location"
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124] font-serif font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Location Pin Label
                  </label>
                  <input
                    type="text"
                    value={content.map.office_location_label}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        map: { ...content.map, office_location_label: e.target.value },
                      })
                    }
                    placeholder={`e.g. ${agencyName} Headquarters`}
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A]">
                    Google Maps Embed URL or Full &lt;iframe&gt; Embed Code
                  </label>
                  <span className="text-[11px] text-[#70757A]">
                    Paste the raw &lt;iframe&gt; code directly; the system automatically cleans and extracts the URL.
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={content.map.embed_url || ""}
                  onChange={(e) => handleEmbedUrlChange(e.target.value)}
                  placeholder="https://www.google.com/maps/embed?pb=... or <iframe src='https://www.google.com/maps/embed?...' ...></iframe>"
                  className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-xs font-mono text-[#202124]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Google Maps Pin / Place Link
                  </label>
                  <input
                    type="text"
                    value={content.map.location_url || ""}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        map: { ...content.map, location_url: e.target.value || null },
                      })
                    }
                    placeholder="https://maps.google.com/?q=..."
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    &ldquo;Get Directions&rdquo; Navigation Link
                  </label>
                  <input
                    type="text"
                    value={content.map.directions_url || ""}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        map: { ...content.map, directions_url: e.target.value || null },
                      })
                    }
                    placeholder="https://www.google.com/maps/dir/?api=1&destination=..."
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                  />
                </div>
              </div>

              {/* Map Zoom */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A]">
                    Default Map Zoom Level: {content.map.zoom || 15}
                  </label>
                </div>
                <input
                  type="range"
                  min="1"
                  max="21"
                  value={content.map.zoom || 15}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      map: { ...content.map, zoom: parseInt(e.target.value, 10) || 15 },
                    })
                  }
                  className="w-full accent-[#24292F]"
                />
              </div>

              {/* Live Admin Map Preview */}
              {content.map.embed_url && (
                <div className="pt-4 border-t border-[#E4E5E7]">
                  <span className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-2">
                    Live Map Preview
                  </span>
                  <div className="w-full h-64 rounded-2xl overflow-hidden border border-[#E4E5E7] bg-[#ECEFF3]">
                    <iframe
                      src={content.map.embed_url}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Google Map Preview"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: SEO */}
        {activeTab === "seo" && (
          <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div>
              <h3 className="text-lg font-serif font-bold text-[#202124]">
                Search Engine Optimization &amp; Social Sharing
              </h3>
              <p className="text-xs text-[#70757A] mt-1 font-light">
                Configure browser tab title, Google search description, and OpenGraph preview image for{" "}
                <code className="font-mono text-xs">/contact</code>.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                  SEO Page Title
                </label>
                <input
                  type="text"
                  value={content.seo_title || ""}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      seo_title: e.target.value || null,
                    })
                  }
                  placeholder={`Contact Concierge Desk | ${agencyName}`}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A]">
                    Meta Description
                  </label>
                  <span className="text-[11px] text-[#70757A]">
                    {(content.seo_meta_description || "").length} / 160 characters recommended
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={content.seo_meta_description || ""}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      seo_meta_description: e.target.value || null,
                    })
                  }
                  placeholder={`Connect with ${agencyName} concierge team in ${city} for holiday planning, departure bookings, and fast WhatsApp advice.`}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive In-Modal Preview */}
      {previewMode && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col p-4 sm:p-8 animate-in fade-in-50">
          <div className="bg-white rounded-3xl border border-[#E4E5E7] flex-1 flex flex-col overflow-hidden shadow-2xl max-w-6xl mx-auto w-full">
            {/* Preview Toolbar */}
            <div className="px-6 py-4 border-b border-[#E4E5E7] flex items-center justify-between bg-[#F7F7F5]">
              <div className="flex items-center gap-3">
                <span className="text-xs font-serif font-bold text-[#202124]">
                  Interactive Draft Preview: /contact
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-semibold uppercase tracking-wider">
                  Draft Mode
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white border border-[#D3D8DF] rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("desktop")}
                    className={`p-1.5 rounded-lg transition-all ${
                      previewMode === "desktop"
                        ? "bg-[#24292F] text-white"
                        : "text-[#70757A] hover:text-[#202124]"
                    }`}
                    title="Desktop Preview"
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("mobile")}
                    className={`p-1.5 rounded-lg transition-all ${
                      previewMode === "mobile"
                        ? "bg-[#24292F] text-white"
                        : "text-[#70757A] hover:text-[#202124]"
                    }`}
                    title="Mobile Viewport Preview"
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewMode(null)}
                  className="p-2 rounded-xl text-[#70757A] hover:text-[#202124] hover:bg-[#ECEFF3]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Simulated Public Render */}
            <div className="flex-1 overflow-y-auto bg-[#ECEFF3] p-4 flex justify-center">
              <div
                className={`bg-white min-h-full transition-all shadow-lg overflow-y-auto ${
                  previewMode === "mobile"
                    ? "w-[390px] rounded-3xl border-4 border-[#24292F]"
                    : "w-full max-w-5xl rounded-2xl"
                }`}
              >
                {/* Hero Banner Render */}
                {content.hero.show_section && (
                  <section className="py-12 sm:py-16 text-center border-b border-[#E4E5E7] px-6 bg-[#F7F7F5]">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#D3D8DF] bg-white text-xs font-semibold uppercase tracking-wider text-[#24292F] mb-4">
                      <Compass className="w-3.5 h-3.5" />
                      <span>{content.hero.eyebrow}</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#202124]">
                      {content.hero.heading}
                    </h1>
                    <p className="mt-3 text-xs sm:text-sm text-[#70757A] max-w-xl mx-auto leading-relaxed">
                      {content.hero.description}
                    </p>
                  </section>
                )}

                {/* Main Section */}
                <div className="p-6 sm:p-12 space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Cards */}
                    {content.cards.show_section && (
                      <div className="space-y-4">
                        <div className="p-6 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-2">
                          <MapPin className="w-5 h-5 text-[#24292F]" />
                          <h4 className="text-sm font-serif font-bold text-[#202124]">
                            {content.cards.office_card_heading || `${city}, Tamil Nadu`}
                          </h4>
                          <p className="text-xs text-[#70757A]">
                            {content.cards.office_address || "Office Address"}
                          </p>
                          <p className="text-[11px] text-[#5F6368] pt-2 border-t border-[#E4E5E7]">
                            {content.cards.operating_hours}
                          </p>
                        </div>

                        <div className="p-6 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-2">
                          <Phone className="w-5 h-5 text-[#24292F]" />
                          <h4 className="text-sm font-serif font-bold text-[#202124]">
                            {content.cards.phone_card_heading || "Call & Email"}
                          </h4>
                          <p className="text-xs font-medium text-[#202124]">
                            {content.cards.primary_phone}
                          </p>
                          <p className="text-xs font-medium text-[#202124]">
                            {content.cards.contact_email}
                          </p>
                        </div>

                        <div className="p-6 rounded-2xl bg-[#EBF7F2] border border-[#A7E2CB] space-y-2">
                          <MessageCircle className="w-5 h-5 text-[#0D7A53]" />
                          <h4 className="text-sm font-serif font-bold text-[#0D7A53]">
                            {content.cards.whatsapp_card_title}
                          </h4>
                          <p className="text-xs text-[#0D7A53]/80">
                            {content.cards.whatsapp_card_description}
                          </p>
                          <div className="pt-2">
                            <span className="inline-block px-4 py-2 rounded-full bg-[#0D7A53] text-white text-xs font-bold">
                              {content.cards.whatsapp_button_text}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Right Form Preview */}
                    {content.form.show_section && (
                      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#E4E5E7] shadow-sm space-y-4">
                        <span className="text-[11px] uppercase tracking-widest text-[#5F6368] font-semibold block">
                          {content.form.eyebrow}
                        </span>
                        <h3 className="text-xl font-serif font-bold text-[#202124]">
                          {content.form.heading}
                        </h3>
                        <div className="space-y-3 pt-2">
                          <div className="h-9 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] px-3 flex items-center text-xs text-[#70757A]">
                            Your Full Name *
                          </div>
                          <div className="h-9 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] px-3 flex items-center text-xs text-[#70757A]">
                            Email Address *
                          </div>
                          <div className="h-9 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] px-3 flex items-center text-xs text-[#70757A]">
                            Topic: {content.form.topics[0] || "General Enquiry"}
                          </div>
                          <div className="h-20 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] p-3 text-xs text-[#70757A]">
                            Your Travel Message / Query *
                          </div>
                          <span className="inline-block px-6 py-2.5 rounded-full bg-[#24292F] text-white text-xs font-bold">
                            Submit Message
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Google Map Section Preview */}
                  {content.map.show_map && content.map.embed_url && (
                    <div className="pt-8 border-t border-[#E4E5E7] space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-serif font-bold text-[#202124]">
                          {content.map.map_title}
                        </h4>
                        {content.map.directions_url && (
                          <span className="text-xs text-[#0D7A53] font-semibold flex items-center gap-1">
                            <Navigation className="w-3.5 h-3.5" />
                            Get Directions
                          </span>
                        )}
                      </div>
                      <div className="w-full h-56 rounded-2xl overflow-hidden border border-[#E4E5E7]">
                        <iframe
                          src={content.map.embed_url}
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          allowFullScreen
                          loading="lazy"
                          title="Contact Map Preview"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
