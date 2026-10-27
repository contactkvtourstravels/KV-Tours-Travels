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
  ExternalLink,
  MapPin,
  Globe,
  Monitor,
  Smartphone,
  X,
  Sparkles,
  Info,
  Compass,
} from "lucide-react";
import {
  adminApi,
  DestinationsPageContent,
  AdminPageEnvelopeResponse,
} from "@/lib/api";
import { useAdmin } from "../../AdminContext";

export default function AdminDestinationsContentPage() {
  const { hasAnyRole } = useAdmin();
  const canEdit = hasAnyRole(["admin", "super_admin"]);

  const [envelope, setEnvelope] = useState<AdminPageEnvelopeResponse<DestinationsPageContent> | null>(null);
  const [content, setContent] = useState<DestinationsPageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | null>(null);
  const [activeTab, setActiveTab] = useState<"hero" | "intro" | "cta" | "seo">("hero");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const loadPage = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getPageEnvelope<DestinationsPageContent>("destinations");
      setEnvelope(res);
      setContent(res.draft);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load Destinations page content";
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
      const updated = await adminApi.updatePageDraft<DestinationsPageContent>("destinations", {
        draft: content,
        publish_immediately: false,
      });
      setEnvelope(updated);
      setContent(updated.draft);
      showToast("Draft saved successfully. Live page remains unchanged until published.", "success");
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
      await adminApi.updatePageDraft<DestinationsPageContent>("destinations", {
        draft: content,
        publish_immediately: false,
      });
      const published = await adminApi.publishPage<DestinationsPageContent>("destinations");
      setEnvelope(published);
      setContent(published.draft);
      showToast("Destinations hero content published to live website! Public visitors now see this version.", "success");
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
      const reverted = await adminApi.discardPageDraft<DestinationsPageContent>("destinations");
      setEnvelope(reverted);
      setContent(reverted.draft);
      setShowDiscardConfirm(false);
      showToast("Unpublished draft changes discarded. Reverted to live version.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to discard draft";
      showToast(msg, "error");
    } finally {
      setDiscarding(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-[#24292F] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs uppercase tracking-widest text-[#70757A] font-semibold">
          Loading Destinations Page Editor...
        </p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-rose-600 font-medium">Failed to load content for Destinations page.</p>
        <button
          onClick={loadPage}
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
                  This will reset all unsaved edits back to the currently published live version.
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
              <MapPin className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Public Page Content Editor</span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#202124]">
              Destinations Page — Hero &amp; Introduction
            </h1>
            <p className="text-xs text-[#70757A] mt-1 max-w-2xl leading-relaxed">
              Controls the introductory header, description statement, banner background image, and SEO metadata for the public destinations catalog page (<code>/destinations</code>).
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
              <span>Preview</span>
            </button>

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

        {/* Catalog Responsibility Separation Notice */}
        <div className="p-3.5 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#5F6368]">
            <Info className="w-4 h-4 text-[#C5A880] shrink-0" />
            <span>
              <strong>Strict Separation:</strong> Individual destinations, country assignments, and pricing are managed under <strong>Travel Catalog → Destinations</strong>. Changing hero content here never alters catalog records.
            </span>
          </div>
          <Link
            href="/admin/destinations"
            className="inline-flex items-center gap-1 text-[#202124] hover:text-[#C5A880] font-bold shrink-0 underline"
          >
            <span>Manage Travel Catalog</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {/* State Badges Bar */}
        <div className="pt-3 border-t border-[#E4E5E7] flex flex-wrap items-center justify-between gap-3 text-xs text-[#70757A]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${hasUnsavedChanges ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
              <span className="font-medium text-[#202124]">
                {hasUnsavedChanges ? "Draft has unpublished edits" : "Synchronized with live website"}
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

      {/* Editor Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#E4E5E7] pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("hero")}
          className={`px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "hero"
              ? "bg-[#24292F] text-white shadow-sm"
              : "bg-white text-[#5F6368] border border-[#E4E5E7] hover:bg-[#F7F7F5]"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Hero Banner</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("intro")}
          className={`px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "intro"
              ? "bg-[#24292F] text-white shadow-sm"
              : "bg-white text-[#5F6368] border border-[#E4E5E7] hover:bg-[#F7F7F5]"
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          <span>Introductory Text</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cta")}
          className={`px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "cta"
              ? "bg-[#24292F] text-white shadow-sm"
              : "bg-white text-[#5F6368] border border-[#E4E5E7] hover:bg-[#F7F7F5]"
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Call-to-Action (CTA)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("seo")}
          className={`px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "seo"
              ? "bg-[#24292F] text-white shadow-sm"
              : "bg-white text-[#5F6368] border border-[#E4E5E7] hover:bg-[#F7F7F5]"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>SEO Metadata</span>
        </button>
      </div>

      {/* Tab 1: Hero Banner */}
      {activeTab === "hero" && (
        <div className="bg-white rounded-3xl border border-[#E4E5E7] p-6 shadow-xs space-y-5">
          <div>
            <h2 className="text-base font-serif font-bold text-[#202124]">Listing Page Hero Banner</h2>
            <p className="text-xs text-[#70757A] mt-0.5">
              The primary heading statement displayed at the top of <code>/destinations</code>.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Hero Eyebrow Text
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
                disabled={!canEdit}
                placeholder="Worldwide Catalog"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:border-[#24292F]"
              />
              <p className="text-[11px] text-[#70757A] mt-1">Displayed in the small pill badge above the main heading.</p>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Hero Heading (H1)
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
                disabled={!canEdit}
                placeholder="Destinations Beyond the Ordinary"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-sm font-medium text-[#202124] focus:outline-none focus:border-[#24292F]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Hero Description Statement
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
                disabled={!canEdit}
                placeholder="From turquoise island lagoons to dramatic mountain peaks, explore hand-selected destinations curated by our travel specialists."
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:border-[#24292F]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Banner Background Image URL (Optional)
              </label>
              <input
                type="url"
                value={content.hero.banner_image_url || ""}
                onChange={(e) =>
                  setContent({
                    ...content,
                    hero: { ...content.hero, banner_image_url: e.target.value || null },
                  })
                }
                disabled={!canEdit}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:border-[#24292F]"
              />
              <p className="text-[11px] text-[#70757A] mt-1">
                If provided, displays a subtle full-width scenic background image behind the header banner.
              </p>
              {content.hero.banner_image_url && (
                <div className="mt-3 relative h-36 rounded-2xl overflow-hidden border border-[#E4E5E7] bg-stone-100 max-w-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={content.hero.banner_image_url}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Introductory Text */}
      {activeTab === "intro" && (
        <div className="bg-white rounded-3xl border border-[#E4E5E7] p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-serif font-bold text-[#202124]">Introductory Text</h2>
            <p className="text-xs text-[#70757A] mt-0.5">
              Additional contextual intro guidance displayed above destination catalog filter controls.
            </p>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
              Introductory Paragraph
            </label>
            <textarea
              rows={4}
              value={content.introductory_text || ""}
              onChange={(e) =>
                setContent({
                  ...content,
                  introductory_text: e.target.value,
                })
              }
              disabled={!canEdit}
              placeholder="From turquoise island lagoons to dramatic mountain peaks, explore hand-selected destinations curated by our travel specialists."
              className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124] focus:outline-none focus:border-[#24292F]"
            />
          </div>
        </div>
      )}

      {/* Tab 3: Call-to-Action (CTA) */}
      {activeTab === "cta" && (
        <div className="bg-white rounded-3xl border border-[#E4E5E7] p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E4E5E7]">
            <div>
              <h2 className="text-base font-serif font-bold text-[#202124]">Optional Hero Call-to-Action Buttons</h2>
              <p className="text-xs text-[#70757A] mt-0.5">
                Enable optional action buttons below the hero description (e.g. &quot;Plan Custom Trip&quot;).
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(content.cta?.show_cta)}
                onChange={(e) =>
                  setContent({
                    ...content,
                    cta: {
                      show_cta: e.target.checked,
                      primary_button_text: content.cta?.primary_button_text || "Plan Custom Trip",
                      primary_button_link: content.cta?.primary_button_link || "/custom-trip",
                      secondary_button_text: content.cta?.secondary_button_text || null,
                      secondary_button_link: content.cta?.secondary_button_link || null,
                    },
                  })
                }
                disabled={!canEdit}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#D3D8DF] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D3D8DF] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#24292F]" />
            </label>
          </div>

          {content.cta?.show_cta && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Primary Button Label
                </label>
                <input
                  type="text"
                  value={content.cta.primary_button_text}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      cta: { ...content.cta!, primary_button_text: e.target.value },
                    })
                  }
                  disabled={!canEdit}
                  placeholder="Plan Custom Trip"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Primary Button Target URL
                </label>
                <input
                  type="text"
                  value={content.cta.primary_button_link}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      cta: { ...content.cta!, primary_button_link: e.target.value },
                    })
                  }
                  disabled={!canEdit}
                  placeholder="/custom-trip"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Secondary Button Label (Optional)
                </label>
                <input
                  type="text"
                  value={content.cta.secondary_button_text || ""}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      cta: { ...content.cta!, secondary_button_text: e.target.value || null },
                    })
                  }
                  disabled={!canEdit}
                  placeholder="Chat on WhatsApp"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Secondary Button Target URL (Optional)
                </label>
                <input
                  type="text"
                  value={content.cta.secondary_button_link || ""}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      cta: { ...content.cta!, secondary_button_link: e.target.value || null },
                    })
                  }
                  disabled={!canEdit}
                  placeholder="https://wa.me/..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: SEO Metadata */}
      {activeTab === "seo" && (
        <div className="bg-white rounded-3xl border border-[#E4E5E7] p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-serif font-bold text-[#202124]">Search Engine Optimization (SEO)</h2>
            <p className="text-xs text-[#70757A] mt-0.5">
              Customize title tags, meta descriptions, and social share image for the Destinations page.
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
                  setContent({
                    ...content,
                    seo_title: e.target.value || null,
                  })
                }
                disabled={!canEdit}
                placeholder="Destinations Beyond the Ordinary | The Wild Route"
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
                  setContent({
                    ...content,
                    seo_meta_description: e.target.value || null,
                  })
                }
                disabled={!canEdit}
                placeholder="Explore hand-curated destinations by KV Tours Coimbatore. Turquoise lagoons, mountain retreats, and bespoke itineraries."
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
                  setContent({
                    ...content,
                    seo_og_image: e.target.value || null,
                  })
                }
                disabled={!canEdit}
                placeholder="https://..."
                className="w-full px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs text-[#202124]"
              />
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
                <span className="text-xs font-serif font-bold text-[#202124]">Destinations Page Preview</span>
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
                className={`bg-white min-h-full transition-all shadow-lg overflow-y-auto ${
                  previewMode === "mobile"
                    ? "w-[390px] rounded-3xl border-4 border-[#24292F]"
                    : "w-full max-w-5xl rounded-2xl"
                }`}
              >
                {/* Hero Banner Preview */}
                <section
                  className="relative py-16 px-6 text-center border-b border-[#E4E5E7] overflow-hidden"
                  style={{
                    backgroundImage: content.hero.banner_image_url
                      ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.65)), url(${content.hero.banner_image_url})`
                      : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundColor: content.hero.banner_image_url ? "#202124" : "#F7F7F5",
                  }}
                >
                  <div className="max-w-3xl mx-auto space-y-4">
                    <div
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider shadow-2xs ${
                        content.hero.banner_image_url
                          ? "bg-white/20 text-white backdrop-blur-md border border-white/30"
                          : "bg-white text-[#24292F] border border-[#D3D8DF]"
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>{content.hero.eyebrow || "Worldwide Catalog"}</span>
                    </div>

                    <h1
                      className={`text-3xl sm:text-5xl font-serif font-bold tracking-tight ${
                        content.hero.banner_image_url ? "text-white" : "text-[#202124]"
                      }`}
                    >
                      {content.hero.heading}
                    </h1>

                    <p
                      className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${
                        content.hero.banner_image_url ? "text-white/90" : "text-[#70757A]"
                      }`}
                    >
                      {content.hero.description}
                    </p>

                    {content.cta?.show_cta && (
                      <div className="pt-2 flex items-center justify-center gap-3">
                        <span className="px-5 py-2.5 rounded-full bg-[#DFBA73] text-[#1B1E22] text-xs uppercase tracking-wider font-bold">
                          {content.cta.primary_button_text}
                        </span>
                      </div>
                    )}
                  </div>
                </section>

                {/* Simulated Content Filters Below */}
                <div className="p-8 space-y-6">
                  {content.introductory_text && (
                    <p className="text-xs text-[#5F6368] text-center max-w-xl mx-auto italic">
                      &ldquo;{content.introductory_text}&rdquo;
                    </p>
                  )}
                  <div className="max-w-md mx-auto h-10 rounded-full bg-[#F7F7F5] border border-[#E4E5E7] px-4 flex items-center text-xs text-[#70757A]">
                    Search destinations (e.g. Maldives, Kazakhstan, Manali...)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 opacity-50 pointer-events-none">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-44 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] p-3 flex flex-col justify-end">
                        <span className="text-xs font-bold text-[#202124]">Sample Destination #{i}</span>
                      </div>
                    ))}
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
