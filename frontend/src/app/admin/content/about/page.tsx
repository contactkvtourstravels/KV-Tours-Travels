"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
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
  ArrowUp,
  ArrowDown,
  Upload,
  Image as ImageIcon,
  Compass,
  ShieldCheck,
  Sparkles,
  HeartHandshake,
  ExternalLink,
  Smartphone,
  Monitor,
  X,
  Building,
  HelpCircle,
  Layers,
  Search,
} from "lucide-react";
import {
  adminApi,
  AboutPageContent,
  AboutPrincipleCard,
  AboutStatItem,
  AboutTeamMember,
  AboutTestimonialItem,
  AdminPageEnvelopeResponse,
} from "@/lib/api";
import { useAdmin } from "../../AdminContext";

export default function AdminAboutContentPage() {
  const { hasAnyRole } = useAdmin();
  const canEdit = hasAnyRole(["admin", "super_admin"]);

  // Envelope state from server
  const [envelope, setEnvelope] = useState<AdminPageEnvelopeResponse<AboutPageContent> | null>(null);
  const [content, setContent] = useState<AboutPageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  // Status message & feedback
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | null>(null);
  type AboutTab = "hero" | "story" | "mission" | "principles" | "stats" | "team" | "testimonials" | "cta" | "office" | "ordering" | "seo";
  const [activeTab, setActiveTab] = useState<AboutTab>("hero");


  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const loadPage = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getPageEnvelope<AboutPageContent>("about");
      setEnvelope(res);
      setContent(res.draft);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load About page content";
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
      const updated = await adminApi.updatePageDraft<AboutPageContent>("about", {
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
      // First save draft, then publish
      await adminApi.updatePageDraft<AboutPageContent>("about", {
        draft: content,
        publish_immediately: false,
      });
      const published = await adminApi.publishPage<AboutPageContent>("about");
      setEnvelope(published);
      setContent(published.draft);
      showToast("About page published to live website! Public visitors now see this version.", "success");
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
      const reverted = await adminApi.discardPageDraft<AboutPageContent>("about");
      setEnvelope(reverted);
      setContent(reverted.draft);
      setShowDiscardConfirm(false);
      showToast("Unpublished draft discarded. Content restored to current live version.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to discard draft";
      showToast(msg, "error");
    } finally {
      setDiscarding(false);
    }
  };

  // Handle Media File Upload
  const handleImageUpload = async (
    file: File,
    onSuccess: (url: string) => void,
    uploadKey: string
  ) => {
    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file (PNG, JPG, WebP)", "error");
      return;
    }
    try {
      setUploadingImage(uploadKey);
      const res = await adminApi.uploadMedia(file, "travelagency/pages");
      onSuccess(res.url);
      showToast("Image uploaded successfully!", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload image";
      showToast(msg, "error");
    } finally {
      setUploadingImage(null);
    }
  };

  if (loading || !content) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center text-[#202124]">
        <div className="w-10 h-10 border-4 border-[#24292F] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold uppercase tracking-widest text-[#70757A]">
          Loading About Page Content...
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
              <h3 className="text-lg font-serif font-bold text-[#202124]">Discard Unpublished Draft?</h3>
              <p className="text-xs sm:text-sm text-[#70757A] mt-2 leading-relaxed">
                All draft edits made since the last published version will be reverted. This action cannot be undone.
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
              <span className="text-[#202124]">About Page</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#202124]">
              About Page Management
            </h1>
            <p className="text-xs sm:text-sm text-[#70757A] mt-1.5 max-w-2xl font-light">
              Edit all narrative text, images, principles, metrics, team profiles, and SEO metadata on{" "}
              <code className="text-[#24292F] bg-[#F7F7F5] px-1.5 py-0.5 rounded-md font-mono text-xs">/about</code>.
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
              href="/about?preview=true"
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
            { id: "hero", label: "Hero & Header" },
            { id: "story", label: "Our Story" },
            { id: "mission", label: "Mission & Vision" },
            { id: "principles", label: "Principles / Why Us" },
            { id: "stats", label: "Statistics" },
            { id: "team", label: "Team Members" },
            { id: "testimonials", label: "Testimonials" },
            { id: "cta", label: "Call to Action" },
            { id: "office", label: "Office Lounge" },
            { id: "ordering", label: "Section Order & Visibility" },
            { id: "seo", label: "SEO & Social" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as AboutTab)}
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
                  Top opening banner shown to visitors on the About page.
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

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-2">
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
                  placeholder="e.g. Coimbatore Born • Worldwide Curated"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A]">
                    Main Heading
                  </label>
                  <span className="text-[11px] text-[#70757A]">
                    Leave blank to use default: &ldquo;About {agencyName}&rdquo;
                  </span>
                </div>
                <input
                  type="text"
                  value={content.hero.heading}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      hero: { ...content.hero, heading: e.target.value },
                    })
                  }
                  placeholder={`About ${agencyName}`}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124] focus:bg-white focus:outline-none font-serif font-bold text-lg"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-2">
                  Hero Subtitle / Description
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
                  placeholder="Crafting bespoke international holidays, domestic expeditions, and signature group escapes..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-2">
                  Optional Hero Background Image
                </label>
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <input
                    type="text"
                    value={content.hero.background_image_url || ""}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        hero: {
                          ...content.hero,
                          background_image_url: e.target.value || null,
                        },
                      })
                    }
                    placeholder="https://images.unsplash.com/photo-..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124] focus:bg-white focus:outline-none"
                  />
                  <label className="px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] text-xs font-semibold text-[#24292F] cursor-pointer flex items-center gap-2 shrink-0">
                    <Upload className="w-4 h-4 text-[#5F6368]" />
                    <span>{uploadingImage === "hero_bg" ? "Uploading..." : "Upload Image"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(
                            file,
                            (url) =>
                              setContent({
                                ...content,
                                hero: { ...content.hero, background_image_url: url },
                              }),
                            "hero_bg"
                          );
                        }
                      }}
                    />
                  </label>
                </div>
                {content.hero.background_image_url && (
                  <div className="mt-3 relative w-48 h-24 rounded-xl overflow-hidden border border-[#E4E5E7]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={content.hero.background_image_url}
                      alt="Hero Background Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setContent({
                          ...content,
                          hero: { ...content.hero, background_image_url: null },
                        })
                      }
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-black"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: OUR STORY */}
        {activeTab === "story" && (
          <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#E4E5E7]">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#202124]">Our Story &amp; Narrative</h3>
                <p className="text-xs text-[#70757A] mt-1 font-light">
                  Tell the founding vision, roots, and personal approach of the agency.
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#202124] cursor-pointer">
                <input
                  type="checkbox"
                  checked={content.story.show_section}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      story: { ...content.story, show_section: e.target.checked },
                    })
                  }
                  className="rounded border-[#D3D8DF] text-[#24292F] focus:ring-0"
                />
                <span>Display Story Section</span>
              </label>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-2">
                    Section Eyebrow
                  </label>
                  <input
                    type="text"
                    value={content.story.eyebrow}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        story: { ...content.story, eyebrow: e.target.value },
                      })
                    }
                    placeholder="Our Origin & Heart"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-2">
                    Section Title (Empty for Default)
                  </label>
                  <input
                    type="text"
                    value={content.story.title}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        story: { ...content.story, title: e.target.value },
                      })
                    }
                    placeholder={`Rooted in ${city}, Inspired by the World`}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124] focus:bg-white focus:outline-none font-serif font-bold"
                  />
                </div>
              </div>

              {/* Story Paragraphs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A]">
                    Story Paragraphs ({content.story.paragraphs.length})
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setContent({
                        ...content,
                        story: {
                          ...content.story,
                          paragraphs: [...content.story.paragraphs, ""],
                        },
                      })
                    }
                    className="text-xs font-semibold text-[#24292F] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Paragraph</span>
                  </button>
                </div>

                {content.story.paragraphs.map((p, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <span className="w-6 text-center text-xs text-[#70757A] font-semibold pt-3">
                      {idx + 1}.
                    </span>
                    <textarea
                      rows={3}
                      value={p}
                      onChange={(e) => {
                        const next = [...content.story.paragraphs];
                        next[idx] = e.target.value;
                        setContent({
                          ...content,
                          story: { ...content.story, paragraphs: next },
                        });
                      }}
                      placeholder={`Paragraph ${idx + 1}...`}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124] focus:bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = content.story.paragraphs.filter((_, i) => i !== idx);
                        setContent({
                          ...content,
                          story: { ...content.story, paragraphs: next },
                        });
                      }}
                      className="p-2.5 rounded-xl text-rose-600 hover:bg-rose-50"
                      title="Remove paragraph"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Supporting Story Image */}
              <div className="pt-4 border-t border-[#E4E5E7] space-y-4">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-[#70757A]">
                  Supporting Story Image &amp; Side Card
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#70757A] mb-1">
                      Story Image URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={content.story.image_url || ""}
                        onChange={(e) =>
                          setContent({
                            ...content,
                            story: {
                              ...content.story,
                              image_url: e.target.value || null,
                            },
                          })
                        }
                        placeholder="https://..."
                        className="flex-1 px-3 py-2 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                      />
                      <label className="px-3 py-2 rounded-xl border border-[#D3D8DF] bg-white text-xs font-semibold cursor-pointer shrink-0">
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(
                                file,
                                (url) =>
                                  setContent({
                                    ...content,
                                    story: { ...content.story, image_url: url },
                                  }),
                                "story_img"
                              );
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#70757A] mb-1">
                      Side Card Badge Title (Optional Custom)
                    </label>
                    <input
                      type="text"
                      value={content.story.office_card_title}
                      onChange={(e) =>
                        setContent({
                          ...content,
                          story: { ...content.story, office_card_title: e.target.value },
                        })
                      }
                      placeholder={`e.g. ${agencyName} Concierge Office`}
                      className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#70757A] mb-1">
                    Side Card Description (Optional Custom)
                  </label>
                  <textarea
                    rows={2}
                    value={content.story.office_card_description}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        story: { ...content.story, office_card_description: e.target.value },
                      })
                    }
                    placeholder="Leave blank to use default headquarters address and face-to-face consultation text..."
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MISSION & VISION */}
        {activeTab === "mission" && (
          <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#E4E5E7]">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#202124]">Mission &amp; Vision</h3>
                <p className="text-xs text-[#70757A] mt-1 font-light">
                  Define your agency’s overarching purpose and long-term commitments.
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#202124] cursor-pointer">
                <input
                  type="checkbox"
                  checked={content.mission_vision.show_section}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      mission_vision: {
                        ...content.mission_vision,
                        show_section: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-[#D3D8DF] text-[#24292F] focus:ring-0"
                />
                <span>Display Mission &amp; Vision</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Mission Title
                  </label>
                  <input
                    type="text"
                    value={content.mission_vision.mission_title}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        mission_vision: {
                          ...content.mission_vision,
                          mission_title: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-white text-sm font-serif font-bold text-[#202124]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Mission Description
                  </label>
                  <textarea
                    rows={4}
                    value={content.mission_vision.mission_description}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        mission_vision: {
                          ...content.mission_vision,
                          mission_description: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-white text-sm text-[#202124]"
                  />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Vision Title
                  </label>
                  <input
                    type="text"
                    value={content.mission_vision.vision_title}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        mission_vision: {
                          ...content.mission_vision,
                          vision_title: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-white text-sm font-serif font-bold text-[#202124]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Vision Description
                  </label>
                  <textarea
                    rows={4}
                    value={content.mission_vision.vision_description}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        mission_vision: {
                          ...content.mission_vision,
                          vision_description: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-white text-sm text-[#202124]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PRINCIPLES / WHY CHOOSE US */}
        {activeTab === "principles" && (
          <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#E4E5E7]">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#202124]">
                  Core Travel Principles (Why Choose Us Cards)
                </h3>
                <p className="text-xs text-[#70757A] mt-1 font-light">
                  Key value propositions displayed on cards (e.g. Vetted Accommodations, Personal Care).
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#202124] cursor-pointer">
                <input
                  type="checkbox"
                  checked={content.principles.show_section}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      principles: {
                        ...content.principles,
                        show_section: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-[#D3D8DF] text-[#24292F] focus:ring-0"
                />
                <span>Display Principles</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                  Section Eyebrow
                </label>
                <input
                  type="text"
                  value={content.principles.eyebrow}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      principles: { ...content.principles, eyebrow: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                  Section Heading
                </label>
                <input
                  type="text"
                  value={content.principles.heading}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      principles: { ...content.principles, heading: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124] font-serif font-bold"
                />
              </div>
            </div>

            {/* Principle Cards list */}
            <div className="space-y-4 pt-4 border-t border-[#E4E5E7]">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#70757A]">
                  Principle Cards ({content.principles.cards.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newCard: AboutPrincipleCard = {
                      id: `principle-${Date.now()}`,
                      title: "New Commitment",
                      description: "Explain why travelers can depend on this service promise.",
                      icon: "ShieldCheck",
                    };
                    setContent({
                      ...content,
                      principles: {
                        ...content.principles,
                        cards: [...content.principles.cards, newCard],
                      },
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl border border-[#D3D8DF] bg-white text-xs font-semibold text-[#24292F] hover:bg-[#F7F7F5] flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Principle Card</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {content.principles.cards.map((card, idx) => (
                  <div
                    key={card.id || idx}
                    className="p-5 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <select
                        value={card.icon}
                        onChange={(e) => {
                          const next = [...content.principles.cards];
                          next[idx] = { ...next[idx], icon: e.target.value };
                          setContent({
                            ...content,
                            principles: { ...content.principles, cards: next },
                          });
                        }}
                        className="px-2 py-1 rounded-lg border border-[#D3D8DF] bg-white text-xs font-medium"
                      >
                        <option value="ShieldCheck">Shield Check</option>
                        <option value="HeartHandshake">Heart Handshake</option>
                        <option value="Sparkles">Sparkles</option>
                        <option value="Compass">Compass</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const next = content.principles.cards.filter((_, i) => i !== idx);
                          setContent({
                            ...content,
                            principles: { ...content.principles, cards: next },
                          });
                        }}
                        className="p-1 rounded-lg text-rose-600 hover:bg-rose-50"
                        title="Delete card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={card.title}
                      onChange={(e) => {
                        const next = [...content.principles.cards];
                        next[idx] = { ...next[idx], title: e.target.value };
                        setContent({
                          ...content,
                          principles: { ...content.principles, cards: next },
                        });
                      }}
                      placeholder="Title"
                      className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-white text-sm font-serif font-bold text-[#202124]"
                    />

                    <textarea
                      rows={3}
                      value={card.description}
                      onChange={(e) => {
                        const next = [...content.principles.cards];
                        next[idx] = { ...next[idx], description: e.target.value };
                        setContent({
                          ...content,
                          principles: { ...content.principles, cards: next },
                        });
                      }}
                      placeholder="Description"
                      className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-white text-xs text-[#70757A]"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: STATISTICS */}
        {activeTab === "stats" && (
          <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#E4E5E7]">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#202124]">
                  Key Statistics &amp; Metrics
                </h3>
                <p className="text-xs text-[#70757A] mt-1 font-light">
                  Showcase accomplishments (e.g. 10,000+ Happy Travelers, 98% 5-Star Reviews).
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#202124] cursor-pointer">
                <input
                  type="checkbox"
                  checked={content.stats.show_section}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      stats: { ...content.stats, show_section: e.target.checked },
                    })
                  }
                  className="rounded border-[#D3D8DF] text-[#24292F] focus:ring-0"
                />
                <span>Display Statistics</span>
              </label>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#70757A]">
                  Stat Counters ({content.stats.items.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newItem: AboutStatItem = {
                      id: `stat-${Date.now()}`,
                      label: "Happy Explorers",
                      value: "5,000+",
                      icon: "Sparkles",
                    };
                    setContent({
                      ...content,
                      stats: {
                        ...content.stats,
                        items: [...content.stats.items, newItem],
                      },
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl border border-[#D3D8DF] bg-white text-xs font-semibold text-[#24292F] hover:bg-[#F7F7F5] flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Counter</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {content.stats.items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-5 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5F6368]">
                        Metric #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = content.stats.items.filter((_, i) => i !== idx);
                          setContent({
                            ...content,
                            stats: { ...content.stats, items: next },
                          });
                        }}
                        className="p-1 rounded-lg text-rose-600 hover:bg-rose-50"
                        title="Delete stat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={item.value}
                      onChange={(e) => {
                        const next = [...content.stats.items];
                        next[idx] = { ...next[idx], value: e.target.value };
                        setContent({
                          ...content,
                          stats: { ...content.stats, items: next },
                        });
                      }}
                      placeholder="e.g. 10,000+"
                      className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-white text-base font-serif font-bold text-[#202124]"
                    />

                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => {
                        const next = [...content.stats.items];
                        next[idx] = { ...next[idx], label: e.target.value };
                        setContent({
                          ...content,
                          stats: { ...content.stats, items: next },
                        });
                      }}
                      placeholder="e.g. Travelers Guided"
                      className="w-full px-3 py-1.5 rounded-xl border border-[#E4E5E7] bg-white text-xs text-[#70757A]"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: TEAM MEMBERS */}
        {activeTab === "team" && (
          <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#E4E5E7]">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#202124]">
                  Team Members &amp; Travel Designers
                </h3>
                <p className="text-xs text-[#70757A] mt-1 font-light">
                  Introduce the travel curators and advisors behind the agency.
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#202124] cursor-pointer">
                <input
                  type="checkbox"
                  checked={content.team.show_section}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      team: { ...content.team, show_section: e.target.checked },
                    })
                  }
                  className="rounded border-[#D3D8DF] text-[#24292F] focus:ring-0"
                />
                <span>Display Team Section</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                  Section Heading
                </label>
                <input
                  type="text"
                  value={content.team.heading}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      team: { ...content.team, heading: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124] font-serif font-bold"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                  Section Description
                </label>
                <input
                  type="text"
                  value={content.team.description}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      team: { ...content.team, description: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                />
              </div>
            </div>

            {/* Team members list */}
            <div className="space-y-4 pt-4 border-t border-[#E4E5E7]">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#70757A]">
                  Team Members ({content.team.members.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newMember: AboutTeamMember = {
                      id: `member-${Date.now()}`,
                      name: "Advisor Name",
                      role: "Senior Travel Curator",
                      bio: "Specializing in luxury holidays and bespoke group expeditions.",
                      photo_url: null,
                      display_order: content.team.members.length,
                    };
                    setContent({
                      ...content,
                      team: {
                        ...content.team,
                        members: [...content.team.members, newMember],
                      },
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl border border-[#D3D8DF] bg-white text-xs font-semibold text-[#24292F] hover:bg-[#F7F7F5] flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Team Member</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {content.team.members.map((member, idx) => (
                  <div
                    key={member.id || idx}
                    className="p-5 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#202124]">
                        Member #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = content.team.members.filter((_, i) => i !== idx);
                          setContent({
                            ...content,
                            team: { ...content.team, members: next },
                          });
                        }}
                        className="p-1 rounded-lg text-rose-600 hover:bg-rose-50"
                        title="Delete member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => {
                          const next = [...content.team.members];
                          next[idx] = { ...next[idx], name: e.target.value };
                          setContent({
                            ...content,
                            team: { ...content.team, members: next },
                          });
                        }}
                        placeholder="Full Name"
                        className="px-3 py-2 rounded-xl border border-[#E4E5E7] bg-white text-sm font-semibold text-[#202124]"
                      />
                      <input
                        type="text"
                        value={member.role}
                        onChange={(e) => {
                          const next = [...content.team.members];
                          next[idx] = { ...next[idx], role: e.target.value };
                          setContent({
                            ...content,
                            team: { ...content.team, members: next },
                          });
                        }}
                        placeholder="Role / Title"
                        className="px-3 py-2 rounded-xl border border-[#E4E5E7] bg-white text-sm text-[#70757A]"
                      />
                    </div>

                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={member.photo_url || ""}
                        onChange={(e) => {
                          const next = [...content.team.members];
                          next[idx] = { ...next[idx], photo_url: e.target.value || null };
                          setContent({
                            ...content,
                            team: { ...content.team, members: next },
                          });
                        }}
                        placeholder="Photo URL"
                        className="flex-1 px-3 py-1.5 rounded-xl border border-[#E4E5E7] bg-white text-xs text-[#202124]"
                      />
                      <label className="px-3 py-1.5 rounded-xl border border-[#D3D8DF] bg-white text-xs font-semibold cursor-pointer shrink-0">
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(
                                file,
                                (url) => {
                                  const next = [...content.team.members];
                                  next[idx] = { ...next[idx], photo_url: url };
                                  setContent({
                                    ...content,
                                    team: { ...content.team, members: next },
                                  });
                                },
                                `member_${idx}`
                              );
                            }
                          }}
                        />
                      </label>
                    </div>

                    <textarea
                      rows={2}
                      value={member.bio}
                      onChange={(e) => {
                        const next = [...content.team.members];
                        next[idx] = { ...next[idx], bio: e.target.value };
                        setContent({
                          ...content,
                          team: { ...content.team, members: next },
                        });
                      }}
                      placeholder="Short Bio..."
                      className="w-full px-3 py-1.5 rounded-xl border border-[#E4E5E7] bg-white text-xs text-[#70757A]"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: TESTIMONIALS */}
        {activeTab === "testimonials" && (
          <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#E4E5E7]">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#202124]">
                  Testimonials &amp; Traveler Reviews
                </h3>
                <p className="text-xs text-[#70757A] mt-1 font-light">
                  Direct client feedback displayed on the About page.
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#202124] cursor-pointer">
                <input
                  type="checkbox"
                  checked={content.testimonials.show_section}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      testimonials: {
                        ...content.testimonials,
                        show_section: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-[#D3D8DF] text-[#24292F] focus:ring-0"
                />
                <span>Display Testimonials</span>
              </label>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#70757A]">
                  Quotes ({content.testimonials.items.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newTestimonial: AboutTestimonialItem = {
                      id: `testimonial-${Date.now()}`,
                      author: "Praveen & Family",
                      location: "Coimbatore",
                      trip_name: "7-Day Kashmir Blossom Holiday",
                      quote: "The personalized attention from booking to our return flights was exceptional.",
                      rating: 5,
                    };
                    setContent({
                      ...content,
                      testimonials: {
                        ...content.testimonials,
                        items: [...content.testimonials.items, newTestimonial],
                      },
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl border border-[#D3D8DF] bg-white text-xs font-semibold text-[#24292F] hover:bg-[#F7F7F5] flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Testimonial</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {content.testimonials.items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-5 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={item.author}
                        onChange={(e) => {
                          const next = [...content.testimonials.items];
                          next[idx] = { ...next[idx], author: e.target.value };
                          setContent({
                            ...content,
                            testimonials: { ...content.testimonials, items: next },
                          });
                        }}
                        placeholder="Author Name"
                        className="px-3 py-1.5 rounded-xl border border-[#E4E5E7] bg-white text-sm font-semibold text-[#202124]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = content.testimonials.items.filter((_, i) => i !== idx);
                          setContent({
                            ...content,
                            testimonials: { ...content.testimonials, items: next },
                          });
                        }}
                        className="p-1 rounded-lg text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item.location}
                        onChange={(e) => {
                          const next = [...content.testimonials.items];
                          next[idx] = { ...next[idx], location: e.target.value };
                          setContent({
                            ...content,
                            testimonials: { ...content.testimonials, items: next },
                          });
                        }}
                        placeholder="Location"
                        className="px-3 py-1.5 rounded-xl border border-[#E4E5E7] bg-white text-xs text-[#70757A]"
                      />
                      <input
                        type="text"
                        value={item.trip_name}
                        onChange={(e) => {
                          const next = [...content.testimonials.items];
                          next[idx] = { ...next[idx], trip_name: e.target.value };
                          setContent({
                            ...content,
                            testimonials: { ...content.testimonials, items: next },
                          });
                        }}
                        placeholder="Trip Name"
                        className="px-3 py-1.5 rounded-xl border border-[#E4E5E7] bg-white text-xs text-[#70757A]"
                      />
                    </div>

                    <textarea
                      rows={3}
                      value={item.quote}
                      onChange={(e) => {
                        const next = [...content.testimonials.items];
                        next[idx] = { ...next[idx], quote: e.target.value };
                        setContent({
                          ...content,
                          testimonials: { ...content.testimonials, items: next },
                        });
                      }}
                      placeholder="Review Quote..."
                      className="w-full px-3 py-1.5 rounded-xl border border-[#E4E5E7] bg-white text-xs text-[#202124]"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: CTA */}
        {activeTab === "cta" && (
          <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#E4E5E7]">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#202124]">
                  Call to Action (CTA) Section
                </h3>
                <p className="text-xs text-[#70757A] mt-1 font-light">
                  Bottom banner encouraging users to plan a custom trip or initiate WhatsApp contact.
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#202124] cursor-pointer">
                <input
                  type="checkbox"
                  checked={content.cta.show_section}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      cta: { ...content.cta, show_section: e.target.checked },
                    })
                  }
                  className="rounded border-[#D3D8DF] text-[#24292F] focus:ring-0"
                />
                <span>Display CTA Section</span>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                  CTA Heading (Empty for Default: &ldquo;Experience the {agencyName} Difference&rdquo;)
                </label>
                <input
                  type="text"
                  value={content.cta.heading}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      cta: { ...content.cta, heading: e.target.value },
                    })
                  }
                  placeholder={`Experience the ${agencyName} Difference`}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124] font-serif font-bold text-lg"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                  CTA Description
                </label>
                <textarea
                  rows={2}
                  value={content.cta.description}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      cta: { ...content.cta, description: e.target.value },
                    })
                  }
                  placeholder={`Let us turn your vacation dreams into a seamless reality. Connect with our ${city} advisors today.`}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Primary Button Label
                  </label>
                  <input
                    type="text"
                    value={content.cta.primary_button_text}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        cta: { ...content.cta, primary_button_text: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                  />
                  <input
                    type="text"
                    value={content.cta.primary_button_link}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        cta: { ...content.cta, primary_button_link: e.target.value },
                      })
                    }
                    placeholder="/custom-trip"
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-xs text-[#70757A] mt-2"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Secondary Button Label
                  </label>
                  <input
                    type="text"
                    value={content.cta.secondary_button_text}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        cta: { ...content.cta, secondary_button_text: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                  />
                  <input
                    type="text"
                    value={content.cta.secondary_button_link || ""}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        cta: { ...content.cta, secondary_button_link: e.target.value || null },
                      })
                    }
                    placeholder="Leave empty for direct WhatsApp click-to-chat"
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-xs text-[#70757A] mt-2"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: OFFICE DETAILS */}
        {activeTab === "office" && (
          <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#E4E5E7]">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#202124]">
                  Office Consultation &amp; Lounge
                </h3>
                <p className="text-xs text-[#70757A] mt-1 font-light">
                  Address and consultation hours rendered on the About page.
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#202124] cursor-pointer">
                <input
                  type="checkbox"
                  checked={content.office.show_section}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      office: { ...content.office, show_section: e.target.checked },
                    })
                  }
                  className="rounded border-[#D3D8DF] text-[#24292F] focus:ring-0"
                />
                <span>Display Office Information</span>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                  Card Heading
                </label>
                <input
                  type="text"
                  value={content.office.heading}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      office: { ...content.office, heading: e.target.value },
                    })
                  }
                  placeholder="Visit Our Travel Lounge"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124] font-serif font-bold"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                  Office Address (Leave empty to use Agency Profile address)
                </label>
                <input
                  type="text"
                  value={content.office.address}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      office: { ...content.office, address: e.target.value },
                    })
                  }
                  placeholder="Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu 641012"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Hours (Leave empty to use Agency Profile hours)
                  </label>
                  <input
                    type="text"
                    value={content.office.hours}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        office: { ...content.office, hours: e.target.value },
                      })
                    }
                    placeholder="Mon – Sat: 09:30 AM – 07:30 PM IST"
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Consultation Guidance
                  </label>
                  <input
                    type="text"
                    value={content.office.guidance}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        office: { ...content.office, guidance: e.target.value },
                      })
                    }
                    placeholder="Walk-ins welcome; appointments recommended for custom itineraries."
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 10: SECTION ORDER & VISIBILITY */}
        {activeTab === "ordering" && (
          <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div>
              <h3 className="text-lg font-serif font-bold text-[#202124]">
                Section Display Order &amp; Global Visibility
              </h3>
              <p className="text-xs text-[#70757A] mt-1 font-light">
                Reorder how sections appear from top to bottom on <code className="font-mono text-xs">/about</code>, or toggle visibility.
              </p>
            </div>

            <div className="space-y-3">
              {(content.sections_order || [
                "hero",
                "story",
                "mission_vision",
                "principles",
                "stats",
                "team",
                "testimonials",
                "cta",
              ]).map((secKey, idx, arr) => {
                const sectionLabels: Record<string, string> = {
                  hero: "1. Hero Banner",
                  story: "2. Our Story & Narrative",
                  mission_vision: "3. Mission & Vision",
                  principles: "4. Core Principles (Why Us Cards)",
                  stats: "5. Statistics & Metrics",
                  team: "6. Team Members",
                  testimonials: "7. Testimonials",
                  cta: "8. Call to Action Banner",
                };

                const isVisible =
                  secKey === "hero"
                    ? content.hero.show_section
                    : secKey === "story"
                    ? content.story.show_section
                    : secKey === "mission_vision"
                    ? content.mission_vision.show_section
                    : secKey === "principles"
                    ? content.principles.show_section
                    : secKey === "stats"
                    ? content.stats.show_section
                    : secKey === "team"
                    ? content.team.show_section
                    : secKey === "testimonials"
                    ? content.testimonials.show_section
                    : secKey === "cta"
                    ? content.cta.show_section
                    : true;

                const moveUp = () => {
                  if (idx === 0) return;
                  const next = [...arr];
                  const temp = next[idx - 1];
                  next[idx - 1] = next[idx];
                  next[idx] = temp;
                  setContent({ ...content, sections_order: next });
                };

                const moveDown = () => {
                  if (idx === arr.length - 1) return;
                  const next = [...arr];
                  const temp = next[idx + 1];
                  next[idx + 1] = next[idx];
                  next[idx] = temp;
                  setContent({ ...content, sections_order: next });
                };

                return (
                  <div
                    key={secKey}
                    className="flex items-center justify-between p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-white border border-[#D3D8DF] flex items-center justify-center font-bold text-xs text-[#202124]">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-[#202124]">
                          {sectionLabels[secKey] || secKey}
                        </h4>
                        <span
                          className={`text-[11px] font-medium ${
                            isVisible ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {isVisible ? "Visible on live page" : "Hidden from live page"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={moveUp}
                        className="p-2 rounded-xl bg-white border border-[#D3D8DF] text-[#24292F] hover:bg-[#F7F7F5] disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === arr.length - 1}
                        onClick={moveDown}
                        className="p-2 rounded-xl bg-white border border-[#D3D8DF] text-[#24292F] hover:bg-[#F7F7F5] disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 11: SEO */}
        {activeTab === "seo" && (
          <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div>
              <h3 className="text-lg font-serif font-bold text-[#202124]">
                Search Engine Optimization &amp; Social Sharing
              </h3>
              <p className="text-xs text-[#70757A] mt-1 font-light">
                Configure browser tab title, Google search description, and OpenGraph preview image for{" "}
                <code className="font-mono text-xs">/about</code>.
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
                  placeholder={`About Us | ${agencyName} - Bespoke Travel Curators`}
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
                  placeholder={`Learn more about ${agencyName}, our bespoke holiday itineraries, transparent standards, and personalized travel curation.`}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                  Social Sharing Card Image (OG Image)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={content.seo_og_image || ""}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        seo_og_image: e.target.value || null,
                      })
                    }
                    placeholder="https://..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[#E4E5E7] bg-[#F7F7F5] text-sm text-[#202124]"
                  />
                  <label className="px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-xs font-semibold cursor-pointer shrink-0">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(
                            file,
                            (url) => setContent({ ...content, seo_og_image: url }),
                            "seo_img"
                          );
                        }
                      }}
                    />
                  </label>
                </div>
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
                  Interactive Draft Preview: /about
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
                  <section
                    className="py-14 sm:py-20 text-center border-b border-[#E4E5E7] px-6 relative overflow-hidden"
                    style={{
                      backgroundImage: content.hero.background_image_url
                        ? `linear-gradient(rgba(247,247,245,0.92), rgba(247,247,245,0.92)), url(${content.hero.background_image_url})`
                        : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#D3D8DF] bg-white text-xs font-semibold uppercase tracking-wider text-[#24292F] mb-4">
                      <Compass className="w-3.5 h-3.5" />
                      <span>{content.hero.eyebrow || `${city} Born • Worldwide Curated`}</span>
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-serif font-bold text-[#202124] tracking-tight">
                      {content.hero.heading || `About ${agencyName}`}
                    </h1>
                    <p className="mt-3 text-xs sm:text-sm text-[#70757A] max-w-xl mx-auto leading-relaxed">
                      {content.hero.description ||
                        "Crafting bespoke international holidays, domestic expeditions, and signature group escapes."}
                    </p>
                  </section>
                )}

                {/* Our Story Render */}
                {content.story.show_section && (
                  <section className="py-16 px-6 max-w-4xl mx-auto">
                    <span className="text-[11px] uppercase tracking-widest text-[#5F6368] font-semibold block mb-1">
                      {content.story.eyebrow}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#202124]">
                      {content.story.title || `Rooted in ${city}, Inspired by the World`}
                    </h2>
                    <div className="mt-4 text-xs sm:text-sm text-[#70757A] space-y-3 leading-relaxed">
                      {content.story.paragraphs.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  </section>
                )}

                {/* Principles Render */}
                {content.principles.show_section && (
                  <section className="py-12 px-6 bg-[#F7F7F5] border-t border-[#E4E5E7]">
                    <div className="max-w-4xl mx-auto text-center mb-8">
                      <span className="text-[11px] uppercase tracking-widest text-[#5F6368] font-semibold block mb-1">
                        {content.principles.eyebrow}
                      </span>
                      <h2 className="text-2xl font-serif font-bold text-[#202124]">
                        {content.principles.heading}
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
                      {content.principles.cards.map((c, i) => (
                        <div
                          key={i}
                          className="p-5 rounded-2xl bg-white border border-[#E4E5E7] space-y-2 shadow-2xs"
                        >
                          <ShieldCheck className="w-5 h-5 text-[#24292F]" />
                          <h3 className="text-sm font-serif font-bold text-[#202124]">
                            {c.title}
                          </h3>
                          <p className="text-xs text-[#70757A] leading-relaxed">
                            {c.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* CTA Render */}
                {content.cta.show_section && (
                  <section className="py-12 px-6 text-center border-t border-[#E4E5E7]">
                    <h3 className="text-2xl font-serif font-bold text-[#202124]">
                      {content.cta.heading || `Experience the ${agencyName} Difference`}
                    </h3>
                    <p className="text-xs text-[#70757A] mt-2 max-w-md mx-auto">
                      {content.cta.description ||
                        `Let us turn your vacation dreams into a seamless reality.`}
                    </p>
                    <div className="mt-5 flex justify-center gap-3">
                      <span className="px-5 py-2 rounded-full bg-[#24292F] text-white text-xs font-bold">
                        {content.cta.primary_button_text}
                      </span>
                      <span className="px-5 py-2 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] text-[#0D7A53] text-xs font-semibold">
                        {content.cta.secondary_button_text}
                      </span>
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
