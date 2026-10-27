"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  MapPin,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  Package as PackageIcon,
  Image as ImageIcon,
  Star,
  Upload,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Sparkles,
  Compass,
  HelpCircle,
  Share2,
} from "lucide-react";
import {
  adminApi,
  Destination,
  DestinationImage,
  DestinationHighlight,
  DestinationTravelGuide,
  DestinationFaq,
  PaginatedResponse,
} from "@/lib/api";
import { useAdmin } from "../AdminContext";
import { CreatableSelect } from "@/components/admin/CreatableSelect";
import { useCatalogOptions } from "@/components/admin/useCatalogOptions";

type DestinationTab = "basic" | "highlights" | "guide" | "faqs" | "seo" | "preview";



const HIGHLIGHT_CATEGORY_PRESETS = [
  "Top Highlights",
  "Famous Attractions",
  "Sightseeing Locations",
  "Local Experiences",
  "Beaches & Nature",
  "Culture & Heritage",
  "Food & Cuisine",
  "Shopping & Nightlife",
  "Adventure Activities",
  "Family-Friendly Experiences",
  "Recommended Places to Visit",
  "Destination Overview Sections",
];

export default function DestinationsAdminPage() {
  const { hasAnyRole } = useAdmin();
  const canEdit = hasAnyRole(["manager", "admin", "super_admin"]);
  const { options: catalogOptions, addCustomCategory } = useCatalogOptions();

  const [destinations, setDestinations] = useState<PaginatedResponse<Destination> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [filterPublished, setFilterPublished] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modal State
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<DestinationTab>("basic");
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields - Basic
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCountry, setFormCountry] = useState("");
  const [formStateOrCity, setFormStateOrCity] = useState("");
  const [formRegion, setFormRegion] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formTravelType, setFormTravelType] = useState("");
  const [formCoverImageUrl, setFormCoverImageUrl] = useState("");
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(0);
  const [formShortDesc, setFormShortDesc] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formFeatured, setFormFeatured] = useState(false);
  const [formPublished, setFormPublished] = useState(true);
  const [formActive, setFormActive] = useState(true);

  // Form Fields - Highlights
  const [formHighlights, setFormHighlights] = useState<DestinationHighlight[]>([]);

  // Form Fields - Travel Guide
  const [formTravelGuide, setFormTravelGuide] = useState<DestinationTravelGuide>({
    best_time_to_visit: "",
    recommended_duration: "",
    seasonal_weather: "",
    local_language: "",
    currency: "",
    time_zone: "",
    visa_entry: "",
    clothing_etiquette: "",
    transport_options: "",
    insider_advice: "",
  });

  // Form Fields - FAQs
  const [formFaqs, setFormFaqs] = useState<DestinationFaq[]>([]);

  // Form Fields - SEO
  const [formSeoTitle, setFormSeoTitle] = useState("");
  const [formSeoDesc, setFormSeoDesc] = useState("");
  const [formSocialImageUrl, setFormSocialImageUrl] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Gallery Modal State
  const [galleryDest, setGalleryDest] = useState<Destination | null>(null);
  const [galleryImages, setGalleryImages] = useState<DestinationImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [newImgUrl, setNewImgUrl] = useState("");
  const [newImgAlt, setNewImgAlt] = useState("");
  const [newImgSort, setNewImgSort] = useState(0);
  const [newImgFeatured, setNewImgFeatured] = useState(false);
  const [uploadingGalleryImage, setUploadingGalleryImage] = useState(false);

  const fetchDestinations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const isPub = filterPublished === "all" ? undefined : filterPublished === "true";
      const isAct = filterActive === "all" ? undefined : filterActive === "true";

      const data = await adminApi.getDestinations({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        is_published: isPub,
        is_active: isAct,
      });
      setDestinations(data);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load destinations.");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterPublished, filterActive]);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  // Gallery Handling
  const openGalleryModal = async (dest: Destination) => {
    setGalleryDest(dest);
    setGalleryLoading(true);
    setNewImgUrl("");
    setNewImgAlt("");
    setNewImgSort(0);
    setNewImgFeatured(false);
    try {
      const imgs = await adminApi.listDestinationImages(dest.id);
      setGalleryImages(imgs);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load destination images.");
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleUploadCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingCover(true);
      const res = await adminApi.uploadMedia(file, "travelagency/destinations");
      setFormCoverImageUrl(res.url);
      setSuccessMessage("Cover photo uploaded successfully.");
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to upload cover photo.");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleUploadHighlightImage = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await adminApi.uploadMedia(file, "travelagency/destinations/highlights");
      const updated = [...formHighlights];
      updated[index].image_url = res.url;
      setFormHighlights(updated);
      setSuccessMessage("Highlight image uploaded.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to upload highlight photo.");
    }
  };

  const handleUploadGalleryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingGalleryImage(true);
      setError(null);
      const res = await adminApi.uploadMedia(file, "travelagency/destinations");
      setNewImgUrl(res.url);
      if (!newImgAlt) {
        setNewImgAlt(file.name.replace(/\.[^/.]+$/, ""));
      }
      setSuccessMessage(`Image uploaded successfully (${res.storage_type}).`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to upload image file.");
    } finally {
      setUploadingGalleryImage(false);
    }
  };

  const handleAddDestImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryDest || !newImgUrl.trim() || !newImgAlt.trim()) return;
    try {
      setGalleryLoading(true);
      await adminApi.addDestinationImage(galleryDest.id, {
        image_url: newImgUrl.trim(),
        alt_text: newImgAlt.trim(),
        sort_order: Number(newImgSort),
        is_featured: newImgFeatured,
      });
      setNewImgUrl("");
      setNewImgAlt("");
      setNewImgSort(0);
      setNewImgFeatured(false);
      const updated = await adminApi.listDestinationImages(galleryDest.id);
      setGalleryImages(updated);
      setSuccessMessage("Destination image attached successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to add image.");
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleDeleteDestImage = async (imgId: string) => {
    if (!galleryDest) return;
    if (!window.confirm("Remove this image from the destination gallery?")) return;
    try {
      setGalleryLoading(true);
      await adminApi.deleteDestinationImage(galleryDest.id, imgId);
      setGalleryImages(galleryImages.filter((img) => img.id !== imgId));
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to delete image.");
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleToggleFeaturedDestImage = async (img: DestinationImage) => {
    if (!galleryDest) return;
    try {
      setGalleryLoading(true);
      await adminApi.updateDestinationImage(galleryDest.id, img.id, {
        is_featured: !img.is_featured,
      });
      const updated = await adminApi.listDestinationImages(galleryDest.id);
      setGalleryImages(updated);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to update image featured status.");
    } finally {
      setGalleryLoading(false);
    }
  };

  // 1-Click Status Toggles with Confirmation
  const handleTogglePublish = async (dest: Destination) => {
    const confirmMsg = dest.is_published
      ? `Are you sure you want to hide destination "${dest.name}" from the public website? Its related packages will also be hidden from public booking while this destination is hidden.`
      : `Are you sure you want to make destination "${dest.name}" visible on the public website?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const updated = await adminApi.toggleDestinationPublish(dest.id, dest.is_published);
      setSuccessMessage(
        `Destination "${updated.name}" is now ${
          updated.is_published ? "VISIBLE on the website" : "HIDDEN from the website"
        }.`
      );
      fetchDestinations();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to toggle visibility status.");
    }
  };

  const handleToggleActive = async (dest: Destination) => {
    try {
      const updated = await adminApi.toggleDestinationActive(dest.id, dest.is_active);
      setSuccessMessage(
        `Destination "${updated.name}" is now ${updated.is_active ? "ACTIVE" : "DEACTIVATED"}.`
      );
      fetchDestinations();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to toggle active status.");
    }
  };

  // Create / Edit Modal openers
  const openCreateModal = () => {
    setSelectedDestination(null);
    setActiveModalTab("basic");
    setFormName("");
    setFormSlug("");
    setFormCountry("India");
    setFormStateOrCity("Tamil Nadu");
    setFormRegion("South India");
    setFormCategory("Hill Station");
    setFormTravelType("Family Holidays");
    setFormCoverImageUrl("");
    setFormDisplayOrder(0);
    setFormShortDesc("");
    setFormDesc("");
    setFormFeatured(false);
    setFormPublished(true);
    setFormActive(true);
    setFormHighlights([]);
    setFormTravelGuide({
      best_time_to_visit: "October to March",
      recommended_duration: "3 Nights / 4 Days",
      seasonal_weather: "Pleasant temperate climate year-round.",
      local_language: "Tamil, English",
      currency: "INR (₹)",
      time_zone: "IST (UTC+5:30)",
      visa_entry: "Standard Indian visa / domestic travel valid ID.",
      clothing_etiquette: "Modest comfortable casuals; light woollens for hill regions.",
      transport_options: "Private chauffeur taxi, local cabs, scenic mountain railway.",
      insider_advice: "Reserve viewpoint transfers and heritage railway tickets in advance.",
    });
    setFormFaqs([
      {
        question: "What is the best time to visit?",
        answer: "The winter and spring months offer crisp, pleasant weather ideal for outdoor sightseeing.",
        display_order: 1,
      },
    ]);
    setFormSeoTitle("");
    setFormSeoDesc("");
    setFormSocialImageUrl("");
    setFormError(null);
    setModalMode("create");
  };

  const openEditModal = (dest: Destination) => {
    setSelectedDestination(dest);
    setActiveModalTab("basic");
    setFormName(dest.name);
    setFormSlug(dest.slug);
    setFormCountry(dest.country);
    setFormStateOrCity(dest.state_or_city || "");
    setFormRegion(dest.region || "");
    setFormCategory(dest.category || "Hill Station");
    setFormTravelType(dest.travel_type || "Family Holidays");
    setFormCoverImageUrl(dest.cover_image_url || "");
    setFormDisplayOrder(dest.display_order ?? 0);
    setFormShortDesc(dest.short_description || "");
    setFormDesc(dest.description || "");
    setFormFeatured(dest.is_featured);
    setFormPublished(dest.is_published);
    setFormActive(dest.is_active);

    setFormHighlights(
      Array.isArray(dest.highlights_json) ? [...dest.highlights_json] : []
    );
    setFormTravelGuide(
      dest.travel_guide_json && typeof dest.travel_guide_json === "object"
        ? { ...dest.travel_guide_json }
        : {
            best_time_to_visit: "",
            recommended_duration: "",
            seasonal_weather: "",
            local_language: "",
            currency: "",
            time_zone: "",
            visa_entry: "",
            clothing_etiquette: "",
            transport_options: "",
            insider_advice: "",
          }
    );
    setFormFaqs(Array.isArray(dest.faqs_json) ? [...dest.faqs_json] : []);

    setFormSeoTitle(dest.seo_title || "");
    setFormSeoDesc(dest.seo_description || "");
    setFormSocialImageUrl(dest.social_image_url || "");
    setFormError(null);
    setModalMode("edit");
  };

  // Highlights manipulation
  const addHighlightItem = () => {
    setFormHighlights([
      ...formHighlights,
      {
        title: "",
        category: "Famous Attraction",
        description: "",
        image_url: "",
        caption: "",
        display_order: formHighlights.length + 1,
      },
    ]);
  };

  const addPresetHighlight = (presetCategory: string) => {
    setFormHighlights([
      ...formHighlights,
      {
        title: "",
        category: presetCategory,
        description: "",
        image_url: "",
        caption: "",
        display_order: formHighlights.length + 1,
      },
    ]);
  };

  const moveHighlightUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...formHighlights];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    updated.forEach((h, i) => {
      h.display_order = i + 1;
    });
    setFormHighlights(updated);
  };

  const moveHighlightDown = (index: number) => {
    if (index >= formHighlights.length - 1) return;
    const updated = [...formHighlights];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    updated.forEach((h, i) => {
      h.display_order = i + 1;
    });
    setFormHighlights(updated);
  };

  const removeHighlightItem = (index: number) => {
    setFormHighlights(formHighlights.filter((_, i) => i !== index));
  };

  const updateHighlightItem = (
    index: number,
    field: keyof DestinationHighlight,
    value: string | number
  ) => {
    const updated = [...formHighlights];
    updated[index] = { ...updated[index], [field]: value };
    setFormHighlights(updated);
  };

  // FAQs manipulation
  const addFaqItem = () => {
    setFormFaqs([
      ...formFaqs,
      {
        question: "",
        answer: "",
        display_order: formFaqs.length + 1,
      },
    ]);
  };

  const moveFaqUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...formFaqs];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    updated.forEach((f, i) => {
      f.display_order = i + 1;
    });
    setFormFaqs(updated);
  };

  const moveFaqDown = (index: number) => {
    if (index >= formFaqs.length - 1) return;
    const updated = [...formFaqs];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    updated.forEach((f, i) => {
      f.display_order = i + 1;
    });
    setFormFaqs(updated);
  };

  const removeFaqItem = (index: number) => {
    setFormFaqs(formFaqs.filter((_, i) => i !== index));
  };

  const updateFaqItem = (index: number, field: keyof DestinationFaq, value: string | number) => {
    const updated = [...formFaqs];
    updated[index] = { ...updated[index], [field]: value };
    setFormFaqs(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCountry.trim()) {
      setFormError("Destination name and country are mandatory.");
      setActiveModalTab("basic");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      // Clean highlights: drop empty entries
      const cleanedHighlights = formHighlights
        .filter((h) => h.title.trim() !== "")
        .map((h, idx) => ({
          ...h,
          title: h.title.trim(),
          description: h.description.trim(),
          category: h.category?.trim() || "Sightseeing",
          image_url: h.image_url?.trim() || undefined,
          caption: h.caption?.trim() || undefined,
          display_order: Number(h.display_order ?? idx + 1),
        }));

      // Clean FAQs: drop empty entries
      const cleanedFaqs = formFaqs
        .filter((f) => f.question.trim() !== "" && f.answer.trim() !== "")
        .map((f, idx) => ({
          question: f.question.trim(),
          answer: f.answer.trim(),
          display_order: Number(f.display_order ?? idx + 1),
        }));

      const payload = {
        name: formName.trim(),
        slug: formSlug.trim() || undefined,
        country: formCountry.trim(),
        state_or_city: formStateOrCity.trim() || undefined,
        region: formRegion.trim() || undefined,
        category: formCategory.trim() || undefined,
        travel_type: formTravelType.trim() || undefined,
        cover_image_url: formCoverImageUrl.trim() || undefined,
        display_order: Number(formDisplayOrder || 0),
        short_description: formShortDesc.trim() || undefined,
        description: formDesc.trim() || undefined,
        highlights_json: cleanedHighlights,
        travel_guide_json: formTravelGuide,
        faqs_json: cleanedFaqs,
        social_image_url: formSocialImageUrl.trim() || undefined,
        is_featured: formFeatured,
        is_published: formPublished,
        seo_title: formSeoTitle.trim() || undefined,
        seo_description: formSeoDesc.trim() || undefined,
      };

      if (modalMode === "create") {
        await adminApi.createDestination(payload);
        setSuccessMessage(`Destination "${formName}" created successfully.`);
      } else if (modalMode === "edit" && selectedDestination) {
        await adminApi.updateDestination(selectedDestination.id, {
          ...payload,
          is_active: formActive,
        });
        setSuccessMessage(`Destination "${formName}" updated successfully.`);
      }
      setModalMode(null);
      fetchDestinations();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setFormError((err as Error).message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (dest: Destination) => {
    if (!window.confirm(`Are you sure you want to deactivate destination "${dest.name}"?`)) {
      return;
    }
    try {
      await adminApi.deleteDestination(dest.id);
      setSuccessMessage(`Destination "${dest.name}" deactivated.`);
      fetchDestinations();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to deactivate destination.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E4E5E7] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A880]">
              Travel Catalog
            </span>
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-[#202124] flex items-center gap-2.5">
            <MapPin className="w-6 h-6 text-[#C5A880]" />
            <span>Destinations Directory</span>
          </h1>
          <p className="text-xs text-[#5F6368] mt-1">
            Manage rich destination portals, travel guides, curated highlights, FAQs, and imagery.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#24292F] hover:bg-[#3D4450] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Destination</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="p-4 bg-white border border-[#E4E5E7] rounded-2xl flex flex-col md:flex-row items-center gap-4 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#70757A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by destination name, country, region, state, or slug..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] placeholder-[#70757A] focus:outline-none focus:border-[#C5A880] focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-[#70757A] shrink-0 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={filterPublished}
            onChange={(e) => {
              setFilterPublished(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs font-medium text-[#202124] focus:outline-none focus:border-[#C5A880]"
          >
            <option value="all">All Visibility</option>
            <option value="true">Published (Public)</option>
            <option value="false">Draft (Internal)</option>
          </select>

          <select
            value={filterActive}
            onChange={(e) => {
              setFilterActive(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs font-medium text-[#202124] focus:outline-none focus:border-[#C5A880]"
          >
            <option value="all">All States</option>
            <option value="true">Active</option>
            <option value="false">Deactivated</option>
          </select>

          <button
            onClick={fetchDestinations}
            title="Refresh"
            className="p-2 rounded-xl bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#5F6368] hover:text-[#202124] transition-all shadow-2xs cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Destinations Table */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-[#70757A]">
            <div className="w-8 h-8 border-4 border-[#24292F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold uppercase tracking-wider">Loading destinations catalog...</p>
          </div>
        ) : !destinations || destinations.items.length === 0 ? (
          <div className="p-12 text-center">
            <MapPin className="w-12 h-12 text-[#D3D8DF] mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#202124] mb-1">No destinations found</h3>
            <p className="text-xs text-[#70757A] max-w-sm mx-auto mb-4">
              {search || filterPublished !== "all" || filterActive !== "all"
                ? "No destinations matched your active search query or status filter."
                : "Your catalog does not have any destinations yet. Create your first destination to start building packages."}
            </p>
            {canEdit && (
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs"
              >
                Add First Destination
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E4E5E7] bg-[#F7F7F5] text-[11px] font-bold uppercase tracking-wider text-[#5F6368]">
                  <th className="py-3.5 px-4">Destination</th>
                  <th className="py-3.5 px-4">Category & Type</th>
                  <th className="py-3.5 px-4">Geography</th>
                  <th className="py-3.5 px-4 text-center">Packages</th>
                  <th className="py-3.5 px-4 text-center">Public Visibility</th>
                  <th className="py-3.5 px-4 text-center">Record State</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E5E7] text-xs">
                {destinations.items.map((dest) => (
                  <tr key={dest.id} className="hover:bg-[#FDFBF7] transition-colors">
                    {/* Destination Name, Thumbnail, Slug */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-10 rounded-lg overflow-hidden bg-[#E4E5E7] shrink-0 border border-[#D3D8DF] flex items-center justify-center">
                          {dest.cover_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={dest.cover_image_url}
                              alt={dest.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <MapPin className="w-4 h-4 text-[#70757A]" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-[#202124] text-sm flex items-center gap-1.5">
                            <span>{dest.name}</span>
                            {dest.is_featured && (
                              <span title="Featured Destination">
                                <Star className="w-3.5 h-3.5 text-[#C5A880] fill-[#C5A880]" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-mono text-[#70757A]">/{dest.slug}</span>
                            <Link
                              href={`/destinations/${dest.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              title="View Live Public Page"
                              className="text-[#C5A880] hover:text-[#A3865F] inline-flex items-center"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category & Travel Type */}
                    <td className="py-4 px-4 text-[#5F6368]">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center w-fit px-2 py-0.5 rounded-md bg-[#F7F7F5] border border-[#E4E5E7] text-[10px] font-bold text-[#202124]">
                          {dest.category || "General"}
                        </span>
                        {dest.travel_type && (
                          <span className="text-[11px] text-[#70757A]">
                            {dest.travel_type}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Geography */}
                    <td className="py-4 px-4 text-[#5F6368]">
                      <div className="font-medium text-[#202124]">{dest.country}</div>
                      <div className="text-[11px] text-[#70757A]">
                        {[dest.state_or_city, dest.region].filter(Boolean).join(" • ") || "—"}
                      </div>
                    </td>

                    {/* Package count */}
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F7F7F5] border border-[#E4E5E7] text-xs font-bold text-[#202124]">
                        <PackageIcon className="w-3 h-3 text-[#70757A]" />
                        {dest.package_count || 0}
                      </span>
                    </td>

                    {/* 1-Click Visibility Toggle */}
                    <td className="py-4 px-4 text-center">
                      {canEdit ? (
                        <button
                          onClick={() => handleTogglePublish(dest)}
                          title={dest.is_published ? "Hide from website" : "Show on website"}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                            dest.is_published
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                          }`}
                        >
                          {dest.is_published ? (
                            <>
                              <Eye className="w-3 h-3 text-emerald-600" />
                              <span>Visible</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 text-amber-600" />
                              <span>Hidden</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            dest.is_published
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {dest.is_published ? (
                            <>
                              <Eye className="w-3 h-3 text-emerald-600" />
                              <span>Visible</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 text-amber-600" />
                              <span>Hidden</span>
                            </>
                          )}
                        </span>
                      )}
                    </td>

                    {/* 1-Click Active Toggle */}
                    <td className="py-4 px-4 text-center">
                      {canEdit ? (
                        <button
                          onClick={() => handleToggleActive(dest)}
                          title={`Click to ${dest.is_active ? "deactivate" : "activate"}`}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                            dest.is_active
                              ? "bg-stone-50 text-[#3D4450] border-[#D3D8DF] hover:bg-stone-100"
                              : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                          }`}
                        >
                          {dest.is_active ? "Active" : "Deactivated"}
                        </button>
                      ) : (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            dest.is_active
                              ? "bg-stone-50 text-[#3D4450] border-[#D3D8DF]"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {dest.is_active ? "Active" : "Deactivated"}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/destinations/${dest.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Preview Public Destination Page"
                          className="p-1.5 rounded-lg border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] text-[#5F6368] hover:text-[#C5A880] transition-colors inline-flex items-center"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => openGalleryModal(dest)}
                          title="Manage Gallery Images"
                          className="p-1.5 rounded-lg border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] text-[#5F6368] hover:text-[#202124] transition-colors cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => openEditModal(dest)}
                            title="Edit Details, Highlights & Guide"
                            className="p-1.5 rounded-lg border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] text-[#5F6368] hover:text-[#202124] transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleTogglePublish(dest)}
                            title={dest.is_published ? "Hide from website" : "Show on website"}
                            className={`p-1.5 rounded-lg border border-[#D3D8DF] bg-white transition-colors cursor-pointer ${
                              dest.is_published
                                ? "hover:bg-amber-50 text-[#70757A] hover:text-amber-700"
                                : "hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800"
                            }`}
                          >
                            {dest.is_published ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleDelete(dest)}
                            title="Deactivate Destination"
                            className="p-1.5 rounded-lg border border-[#D3D8DF] bg-white hover:bg-rose-50 text-[#70757A] hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {destinations && destinations.total_pages > 1 && (
          <div className="p-4 border-t border-[#E4E5E7] flex items-center justify-between text-xs text-[#5F6368] bg-[#F7F7F5]">
            <div>
              Showing page <span className="font-bold text-[#202124]">{destinations.page}</span> of{" "}
              <span className="font-bold text-[#202124]">{destinations.total_pages}</span> (Total{" "}
              <span className="font-bold text-[#202124]">{destinations.total}</span> destinations)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#D3D8DF] hover:bg-stone-50 disabled:opacity-40 font-semibold cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page >= destinations.total_pages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#D3D8DF] hover:bg-stone-50 disabled:opacity-40 font-semibold cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Destination Modal (5 Tabs) */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-[#E4E5E7] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E4E5E7] flex items-center justify-between bg-white shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5A880]">
                  Destination Studio
                </span>
                <h2 className="text-lg font-serif font-bold text-[#202124]">
                  {modalMode === "create"
                    ? "Add New Travel Destination"
                    : `Edit Destination: ${selectedDestination?.name}`}
                </h2>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="p-1.5 rounded-lg text-[#70757A] hover:text-[#202124] hover:bg-[#F7F7F5] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tab Bar */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-[#E4E5E7] bg-[#F7F7F5] overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => setActiveModalTab("basic")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
                  activeModalTab === "basic"
                    ? "border-[#C5A880] text-[#202124] bg-white shadow-2xs"
                    : "border-transparent text-[#70757A] hover:text-[#202124]"
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>1. General & Logistics</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab("highlights")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
                  activeModalTab === "highlights"
                    ? "border-[#C5A880] text-[#202124] bg-white shadow-2xs"
                    : "border-transparent text-[#70757A] hover:text-[#202124]"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>2. Highlights & Attractions</span>
                {formHighlights.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#E4E5E7] text-[10px]">
                    {formHighlights.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab("guide")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
                  activeModalTab === "guide"
                    ? "border-[#C5A880] text-[#202124] bg-white shadow-2xs"
                    : "border-transparent text-[#70757A] hover:text-[#202124]"
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>3. Practical Travel Guide</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab("faqs")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
                  activeModalTab === "faqs"
                    ? "border-[#C5A880] text-[#202124] bg-white shadow-2xs"
                    : "border-transparent text-[#70757A] hover:text-[#202124]"
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>4. Frequently Asked Questions</span>
                {formFaqs.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#E4E5E7] text-[10px]">
                    {formFaqs.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab("seo")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
                  activeModalTab === "seo"
                    ? "border-[#C5A880] text-[#202124] bg-white shadow-2xs"
                    : "border-transparent text-[#70757A] hover:text-[#202124]"
                }`}
              >
                <Share2 className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>5. SEO & Social Meta</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab("preview")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
                  activeModalTab === "preview"
                    ? "border-[#C5A880] text-[#202124] bg-white shadow-2xs"
                    : "border-transparent text-[#70757A] hover:text-[#202124]"
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>6. Live Preview</span>
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* TAB 1: BASIC INFO */}
              {activeModalTab === "basic" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Destination Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ooty, Wayanad, Bali, Maldives"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        URL Slug <span className="text-[#70757A] font-normal">(Auto-generated if empty)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ooty, bali-indonesia"
                        value={formSlug}
                        onChange={(e) => setFormSlug(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Country <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. India, Indonesia, UAE"
                        value={formCountry}
                        onChange={(e) => setFormCountry(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        State or City
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Tamil Nadu, Kerala, Denpasar"
                        value={formStateOrCity}
                        onChange={(e) => setFormStateOrCity(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Region / Sector
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. South India, Southeast Asia"
                        value={formRegion}
                        onChange={(e) => setFormRegion(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <CreatableSelect
                        label="Destination Category"
                        value={formCategory || null}
                        onChange={(val) => setFormCategory(val || "")}
                        options={catalogOptions.destination_categories}
                        placeholder="Select or enter custom category..."
                        allowNone={true}
                        noneLabel="None (Unset Category)"
                        onCustomCreate={(newCat) =>
                          addCustomCategory("destination_categories", newCat)
                        }
                      />
                    </div>

                    <div>
                      <CreatableSelect
                        label="Primary Travel Type"
                        value={formTravelType || null}
                        onChange={(val) => setFormTravelType(val || "")}
                        options={catalogOptions.destination_travel_types}
                        placeholder="Select or enter travel type..."
                        allowNone={true}
                        noneLabel="None (Unset Travel Type)"
                        onCustomCreate={(newType) =>
                          addCustomCategory("destination_travel_types", newType)
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Display Order <span className="text-[#70757A] font-normal">(Sorting index)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formDisplayOrder}
                        onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Cover Photo URL + Upload */}
                  <div>
                    <label className="block text-xs font-bold text-[#202124] mb-1">
                      Hero Cover Image URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="https://... or upload local file"
                        value={formCoverImageUrl}
                        onChange={(e) => setFormCoverImageUrl(e.target.value)}
                        className="flex-1 px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                      />
                      <label className="px-4 py-2 bg-white border border-[#D3D8DF] hover:border-[#C5A880] rounded-xl text-xs font-bold text-[#202124] cursor-pointer flex items-center gap-1.5 shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-[#C5A880]" />
                        <span>{uploadingCover ? "Uploading..." : "Upload Cover"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadCoverFile}
                          disabled={uploadingCover}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {formCoverImageUrl && (
                      <div className="mt-2 w-full h-28 rounded-xl overflow-hidden border border-[#D3D8DF] bg-[#F7F7F5]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={formCoverImageUrl}
                          alt="Cover Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#202124] mb-1">
                      Short Tagline / Catchphrase
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Queen of Nilgiri Hill Stations — Tea plantations, mist-clad peaks and heritage railways"
                      value={formShortDesc}
                      onChange={(e) => setFormShortDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#202124] mb-1">
                      Full Destination Narrative
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Comprehensive overview of geography, cultural significance, climate, and traveller appeal..."
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                    />
                  </div>

                  {/* Status checkboxes */}
                  <div className="bg-[#F7F7F5] border border-[#E4E5E7] rounded-2xl p-4 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#70757A]">
                      Publication & Visibility Settings
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formPublished}
                        onChange={(e) => setFormPublished(e.target.checked)}
                        className="w-4 h-4 rounded text-[#24292F] focus:ring-0 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-[#202124]">
                          Publish to Public Website
                        </span>
                        <p className="text-[11px] text-[#70757A]">
                          When checked, this destination and its published tour packages appear on live website portals.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formFeatured}
                        onChange={(e) => setFormFeatured(e.target.checked)}
                        className="w-4 h-4 rounded text-[#24292F] focus:ring-0 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-[#202124]">
                          Featured Destination Spotlight
                        </span>
                        <p className="text-[11px] text-[#70757A]">
                          Highlights this destination prominently in the homepage luxury carousel.
                        </p>
                      </div>
                    </label>

                    {modalMode === "edit" && (
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formActive}
                          onChange={(e) => setFormActive(e.target.checked)}
                          className="w-4 h-4 rounded text-[#24292F] focus:ring-0 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-[#202124]">Active Record</span>
                          <p className="text-[11px] text-[#70757A]">
                            Soft-deactivation toggle. Uncheck to hide internally from booking assignments.
                          </p>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: HIGHLIGHTS & ATTRACTIONS */}
              {activeModalTab === "highlights" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-bold text-[#202124] uppercase tracking-wider">
                        Curated Highlights & Sightseeing Spots
                      </h3>
                      <p className="text-[11px] text-[#70757A]">
                        Showcase signature attractions, viewpoints, heritage landmarks, nature, nightlife, and culinary experiences.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addHighlightItem}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#24292F] hover:bg-[#3D4450] text-white rounded-xl text-xs font-bold cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Highlight</span>
                    </button>
                  </div>

                  {/* 1-Click Preset Chips */}
                  <div className="p-3 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#70757A]">
                      Quick Add Section / Preset Categories:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {HIGHLIGHT_CATEGORY_PRESETS.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => addPresetHighlight(cat)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#D3D8DF] hover:border-[#C5A880] text-[11px] font-semibold text-[#3D4450] hover:text-[#202124] transition-all cursor-pointer shadow-2xs"
                        >
                          + {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <datalist id="highlight-category-presets">
                    {HIGHLIGHT_CATEGORY_PRESETS.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>

                  {formHighlights.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-[#D3D8DF] rounded-2xl bg-[#F7F7F5]">
                      <Sparkles className="w-8 h-8 text-[#C5A880] mx-auto mb-2" />
                      <p className="text-xs font-bold text-[#202124]">No highlights added yet</p>
                      <p className="text-[11px] text-[#70757A] mt-1 mb-3">
                        Add key attractions like botanical gardens, tea estates, or cultural centers.
                      </p>
                      <button
                        type="button"
                        onClick={addHighlightItem}
                        className="px-3.5 py-1.5 bg-white border border-[#D3D8DF] hover:border-[#C5A880] rounded-xl text-xs font-bold text-[#202124] shadow-2xs cursor-pointer"
                      >
                        + Add First Highlight
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formHighlights.map((item, index) => (
                        <div
                          key={index}
                          className="p-4 bg-[#F7F7F5] border border-[#E4E5E7] rounded-2xl space-y-3 relative"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-[#E4E5E7]">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A880]">
                                Highlight #{index + 1}
                              </span>
                              {formHighlights.length > 1 && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={() => moveHighlightUp(index)}
                                    className="w-5 h-5 flex items-center justify-center rounded bg-white border border-[#D3D8DF] hover:bg-slate-100 disabled:opacity-25 disabled:cursor-not-allowed text-[#5F6368] text-[10px] font-bold cursor-pointer"
                                    title="Move Highlight Up"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    disabled={index === formHighlights.length - 1}
                                    onClick={() => moveHighlightDown(index)}
                                    className="w-5 h-5 flex items-center justify-center rounded bg-white border border-[#D3D8DF] hover:bg-slate-100 disabled:opacity-25 disabled:cursor-not-allowed text-[#5F6368] text-[10px] font-bold cursor-pointer"
                                    title="Move Highlight Down"
                                  >
                                    ▼
                                  </button>
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeHighlightItem(index)}
                              title="Delete this highlight"
                              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-bold uppercase text-[#5F6368] mb-1">
                                Title / Landmark Name *
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Doddabetta Peak, Tea Factory & Museum"
                                value={item.title}
                                onChange={(e) => updateHighlightItem(index, "title", e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-[#D3D8DF] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#5F6368] mb-1">
                                Category Preset
                              </label>
                              <input
                                type="text"
                                list="highlight-category-presets"
                                placeholder="e.g. Top Highlights, Food & Cuisine"
                                value={item.category || ""}
                                onChange={(e) =>
                                  updateHighlightItem(index, "category", e.target.value)
                                }
                                className="w-full px-3 py-1.5 bg-white border border-[#D3D8DF] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-[#5F6368] mb-1">
                              Description
                            </label>
                            <textarea
                              rows={2}
                              placeholder="Brief insight, why travellers should visit, best time of day..."
                              value={item.description}
                              onChange={(e) =>
                                updateHighlightItem(index, "description", e.target.value)
                              }
                              className="w-full px-3 py-1.5 bg-white border border-[#D3D8DF] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-bold uppercase text-[#5F6368] mb-1">
                                Image URL or Upload
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="https://... or upload file"
                                  value={item.image_url || ""}
                                  onChange={(e) =>
                                    updateHighlightItem(index, "image_url", e.target.value)
                                  }
                                  className="flex-1 px-3 py-1.5 bg-white border border-[#D3D8DF] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                                />
                                <label className="px-3 py-1.5 bg-white border border-[#D3D8DF] hover:border-[#C5A880] rounded-lg text-[11px] font-bold text-[#202124] cursor-pointer flex items-center gap-1 shadow-2xs">
                                  <Upload className="w-3 h-3 text-[#C5A880]" />
                                  <span>Upload</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleUploadHighlightImage(index, e)}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#5F6368] mb-1">
                                Order / Caption
                              </label>
                              <input
                                type="text"
                                placeholder="Caption (e.g. Sunset view)"
                                value={item.caption || ""}
                                onChange={(e) =>
                                  updateHighlightItem(index, "caption", e.target.value)
                                }
                                className="w-full px-3 py-1.5 bg-white border border-[#D3D8DF] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PRACTICAL TRAVEL GUIDE */}
              {activeModalTab === "guide" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-[#202124] uppercase tracking-wider">
                      Practical Travel Guide & Logistics
                    </h3>
                    <p className="text-[11px] text-[#70757A]">
                      Provide essential traveller guidance: best season, currency, language, etiquette, and insider tips.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Best Time to Visit
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. October to March (Crisp & Pleasant)"
                        value={formTravelGuide.best_time_to_visit || ""}
                        onChange={(e) =>
                          setFormTravelGuide({
                            ...formTravelGuide,
                            best_time_to_visit: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Recommended Trip Duration
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 3 Nights / 4 Days"
                        value={formTravelGuide.recommended_duration || ""}
                        onChange={(e) =>
                          setFormTravelGuide({
                            ...formTravelGuide,
                            recommended_duration: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Local Language(s)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Tamil, English, Badaga"
                        value={formTravelGuide.local_language || ""}
                        onChange={(e) =>
                          setFormTravelGuide({
                            ...formTravelGuide,
                            local_language: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Currency & Payments
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. INR (₹), Cards & UPI Accepted"
                        value={formTravelGuide.currency || ""}
                        onChange={(e) =>
                          setFormTravelGuide({
                            ...formTravelGuide,
                            currency: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Time Zone
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. IST (UTC+5:30)"
                        value={formTravelGuide.time_zone || ""}
                        onChange={(e) =>
                          setFormTravelGuide({
                            ...formTravelGuide,
                            time_zone: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#202124] mb-1">
                      Seasonal Weather & Climate Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Summer (Mar-May): 15-25°C pleasant. Monsoons (Jun-Sep): Heavy rain with misty foliage. Winter (Oct-Feb): 5-15°C crisp."
                      value={formTravelGuide.seasonal_weather || ""}
                      onChange={(e) =>
                        setFormTravelGuide({
                          ...formTravelGuide,
                          seasonal_weather: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Visa & Entry Documentation
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Domestic tourists: Govt Photo ID. International: Valid passport & Indian e-Visa."
                        value={formTravelGuide.visa_entry || ""}
                        onChange={(e) =>
                          setFormTravelGuide({
                            ...formTravelGuide,
                            visa_entry: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Recommended Clothing & Etiquette
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Woollen wear for evenings, comfortable walking shoes, modest attire for religious shrines."
                        value={formTravelGuide.clothing_etiquette || ""}
                        onChange={(e) =>
                          setFormTravelGuide({
                            ...formTravelGuide,
                            clothing_etiquette: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Transport & Getting Around
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Chauffeur cabs, local bus routes, scenic toy train, rental scooters..."
                        value={formTravelGuide.transport_getting_around || ""}
                        onChange={(e) =>
                          setFormTravelGuide({
                            ...formTravelGuide,
                            transport_getting_around: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Safety, Health & Emergency Advice
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. 24/7 tourist police helpline, mountain driving precautions, altitude guidelines..."
                        value={formTravelGuide.safety_information || ""}
                        onChange={(e) =>
                          setFormTravelGuide({
                            ...formTravelGuide,
                            safety_information: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Packing Tips & Essentials
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Sturdy walking shoes, warm jacket, umbrella, motion sickness tablets..."
                        value={formTravelGuide.packing_tips || ""}
                        onChange={(e) =>
                          setFormTravelGuide({
                            ...formTravelGuide,
                            packing_tips: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Travel Advice & Local Insights
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Book viewpoints tickets beforehand, avoid weekend peak hours..."
                        value={formTravelGuide.travel_advice || ""}
                        onChange={(e) =>
                          setFormTravelGuide({
                            ...formTravelGuide,
                            travel_advice: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Accessibility Information
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Wheelchair accessible pathways at botanical gardens, elevator access in heritage hotels..."
                        value={formTravelGuide.accessibility_information || ""}
                        onChange={(e) =>
                          setFormTravelGuide({
                            ...formTravelGuide,
                            accessibility_information: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Local Transport Advice
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Chauffeur-driven private vehicles recommended for winding mountain roads; toy train requires early bookings."
                        value={formTravelGuide.transport_options || ""}
                        onChange={(e) =>
                          setFormTravelGuide({
                            ...formTravelGuide,
                            transport_options: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Insider Advice from The Wild Route Specialists
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Taste homemade artisanal chocolates from Charing Cross and visit the tea estates in early morning mist."
                        value={formTravelGuide.insider_advice || ""}
                        onChange={(e) =>
                          setFormTravelGuide({
                            ...formTravelGuide,
                            insider_advice: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: FAQS */}
              {activeModalTab === "faqs" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-[#202124] uppercase tracking-wider">
                        Frequently Asked Questions (FAQs)
                      </h3>
                      <p className="text-[11px] text-[#70757A]">
                        Answer common customer questions to boost confidence and reduce repetitive inquiry inquiries.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addFaqItem}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#24292F] hover:bg-[#3D4450] text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add FAQ</span>
                    </button>
                  </div>

                  {formFaqs.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-[#D3D8DF] rounded-2xl bg-[#F7F7F5]">
                      <HelpCircle className="w-8 h-8 text-[#C5A880] mx-auto mb-2" />
                      <p className="text-xs font-bold text-[#202124]">No FAQs added yet</p>
                      <p className="text-[11px] text-[#70757A] mt-1 mb-3">
                        Provide quick answers regarding weather, permits, airport transfers, and luggage advice.
                      </p>
                      <button
                        type="button"
                        onClick={addFaqItem}
                        className="px-3.5 py-1.5 bg-white border border-[#D3D8DF] hover:border-[#C5A880] rounded-xl text-xs font-bold text-[#202124] shadow-2xs cursor-pointer"
                      >
                        + Add First FAQ
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formFaqs.map((faq, index) => (
                        <div
                          key={index}
                          className="p-4 bg-[#F7F7F5] border border-[#E4E5E7] rounded-2xl space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A880]">
                                Question #{index + 1}
                              </span>
                              {formFaqs.length > 1 && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={() => moveFaqUp(index)}
                                    className="w-5 h-5 flex items-center justify-center rounded bg-white border border-[#D3D8DF] hover:bg-slate-100 disabled:opacity-25 disabled:cursor-not-allowed text-[#5F6368] text-[10px] font-bold cursor-pointer"
                                    title="Move FAQ Up"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    disabled={index === formFaqs.length - 1}
                                    onClick={() => moveFaqDown(index)}
                                    className="w-5 h-5 flex items-center justify-center rounded bg-white border border-[#D3D8DF] hover:bg-slate-100 disabled:opacity-25 disabled:cursor-not-allowed text-[#5F6368] text-[10px] font-bold cursor-pointer"
                                    title="Move FAQ Down"
                                  >
                                    ▼
                                  </button>
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFaqItem(index)}
                              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="sm:col-span-3">
                              <label className="block text-[10px] font-bold uppercase text-[#5F6368] mb-1">
                                Question *
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Is an e-pass required to visit Ooty?"
                                value={faq.question}
                                onChange={(e) => updateFaqItem(index, "question", e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-[#D3D8DF] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#5F6368] mb-1">
                                Display Order
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={faq.display_order ?? index + 1}
                                onChange={(e) =>
                                  updateFaqItem(index, "display_order", Number(e.target.value))
                                }
                                className="w-full px-3 py-1.5 bg-white border border-[#D3D8DF] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-[#5F6368] mb-1">
                              Answer *
                            </label>
                            <textarea
                              rows={2}
                              placeholder="Concise, clear answer with current guidelines..."
                              value={faq.answer}
                              onChange={(e) => updateFaqItem(index, "answer", e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-[#D3D8DF] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: SEO & SOCIAL */}
              {activeModalTab === "seo" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-[#202124] uppercase tracking-wider">
                      Search Engine Optimization & Social Sharing
                    </h3>
                    <p className="text-[11px] text-[#70757A]">
                      Configure meta tags, title prefixes, and OpenGraph social banner visuals.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#202124] mb-1">
                      SEO Meta Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ooty Tour Packages & Travel Guide | The Wild Route"
                      value={formSeoTitle}
                      onChange={(e) => setFormSeoTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                    />
                    <p className="text-[11px] text-[#70757A] mt-1">Recommended length: 50–60 characters.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#202124] mb-1">
                      SEO Meta Description
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Discover luxury bespoke holiday packages to Ooty from Palakkad with The Wild Route. Chauffeur transfers, tea estate stays, and sightseeing."
                      value={formSeoDesc}
                      onChange={(e) => setFormSeoDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                    />
                    <p className="text-[11px] text-[#70757A] mt-1">Recommended length: 140–160 characters.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#202124] mb-1">
                      Social Sharing Image URL (Open Graph / WhatsApp preview)
                    </label>
                    <input
                      type="text"
                      placeholder="https://... image banner"
                      value={formSocialImageUrl}
                      onChange={(e) => setFormSocialImageUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {/* TAB 6: LIVE PREVIEW */}
              {activeModalTab === "preview" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#F7F7F5] border border-[#E4E5E7] rounded-2xl">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5A880]">
                        Public Page Simulator
                      </span>
                      <h4 className="text-sm font-bold text-[#202124]">
                        {formName || "Untitled Destination"}
                      </h4>
                      <p className="text-xs text-[#5F6368]">
                        {[formCountry, formStateOrCity, formRegion].filter(Boolean).join(" • ") || "Geography unassigned"}
                      </p>
                    </div>
                    {formSlug && (
                      <Link
                        href={`/destinations/${formSlug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D3D8DF] hover:border-[#C5A880] text-xs font-bold text-[#202124] shadow-2xs self-start sm:self-center"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#C5A880]" />
                        <span>Open Live URL</span>
                      </Link>
                    )}
                  </div>

                  {/* Hero preview */}
                  <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-[#E4E5E7] aspect-21/9 min-h-[180px] flex items-end p-6 text-white shadow-inner">
                    {formCoverImageUrl ? (
                      <img
                        src={formCoverImageUrl}
                        alt={formName}
                        className="absolute inset-0 w-full h-full object-cover opacity-60"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-linear-to-t from-slate-950 to-slate-800" />
                    )}
                    <div className="relative z-10 space-y-1">
                      <div className="flex flex-wrap gap-2">
                        {formCategory && (
                          <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider">
                            {formCategory}
                          </span>
                        )}
                        {formTravelType && (
                          <span className="px-2 py-0.5 rounded-full bg-[#C5A880]/90 text-white text-[10px] font-bold uppercase tracking-wider">
                            {formTravelType}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-serif font-bold text-white drop-shadow">
                        {formName || "Destination Name"}
                      </h2>
                      <p className="text-xs text-white/90 max-w-xl drop-shadow line-clamp-2">
                        {formShortDesc || "Short tagline overview"}
                      </p>
                    </div>
                  </div>

                  {/* Overview description */}
                  {formDesc && (
                    <div className="p-4 bg-white border border-[#E4E5E7] rounded-2xl space-y-1">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#70757A]">
                        Destination Narrative
                      </h4>
                      <p className="text-xs text-[#202124] leading-relaxed whitespace-pre-line">
                        {formDesc}
                      </p>
                    </div>
                  )}

                  {/* Highlights Grid */}
                  {formHighlights.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#70757A]">
                        Configured Highlights ({formHighlights.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {formHighlights.map((h, i) => (
                          <div
                            key={i}
                            className="p-3 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl flex items-start gap-3"
                          >
                            {h.image_url ? (
                              <img
                                src={h.image_url}
                                alt={h.title}
                                className="w-16 h-16 rounded-lg object-cover shrink-0 border border-[#D3D8DF]"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-stone-200 flex items-center justify-center shrink-0 text-[10px] text-[#70757A]">
                                No photo
                              </div>
                            )}
                            <div className="space-y-0.5 min-w-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5A880]">
                                {h.category || "Sightseeing"}
                              </span>
                              <div className="text-xs font-bold text-[#202124] truncate">
                                {h.title || `Highlight #${i + 1}`}
                              </div>
                              <p className="text-[11px] text-[#5F6368] line-clamp-2">
                                {h.description || "No description"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Practical Travel Guide Grid */}
                  <div className="p-4 bg-white border border-[#E4E5E7] rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#70757A]">
                      Travel Guide Summary
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="font-bold text-[#202124] block">Best Season</span>
                        <span className="text-[#5F6368]">{formTravelGuide.best_time_to_visit || "—"}</span>
                      </div>
                      <div>
                        <span className="font-bold text-[#202124] block">Duration</span>
                        <span className="text-[#5F6368]">{formTravelGuide.recommended_duration || "—"}</span>
                      </div>
                      <div>
                        <span className="font-bold text-[#202124] block">Language</span>
                        <span className="text-[#5F6368]">{formTravelGuide.local_language || "—"}</span>
                      </div>
                      <div>
                        <span className="font-bold text-[#202124] block">Currency</span>
                        <span className="text-[#5F6368]">{formTravelGuide.currency || "—"}</span>
                      </div>
                      <div>
                        <span className="font-bold text-[#202124] block">Time Zone</span>
                        <span className="text-[#5F6368]">{formTravelGuide.time_zone || "—"}</span>
                      </div>
                      <div>
                        <span className="font-bold text-[#202124] block">Transport</span>
                        <span className="text-[#5F6368] truncate block">{formTravelGuide.transport_options || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* FAQs accordion preview */}
                  {formFaqs.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#70757A]">
                        Configured FAQs ({formFaqs.length})
                      </h4>
                      <div className="space-y-2">
                        {formFaqs.map((f, i) => (
                          <div
                            key={i}
                            className="p-3 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl space-y-1"
                          >
                            <div className="text-xs font-bold text-[#202124]">
                              Q: {f.question || "Untitled question"}
                            </div>
                            <div className="text-xs text-[#5F6368]">
                              A: {f.answer || "No answer provided"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="pt-4 border-t border-[#E4E5E7] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-5 py-2.5 rounded-xl border border-[#D3D8DF] bg-white text-[#24292F] text-xs font-bold uppercase tracking-wider hover:bg-[#F7F7F5] cursor-pointer"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-all shadow-xs cursor-pointer flex items-center gap-2"
                  >
                    {submitting && (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    <span>
                      {submitting
                        ? "Saving..."
                        : modalMode === "create"
                        ? "Create Destination"
                        : "Save Changes"}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gallery Modal with File Upload */}
      {galleryDest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#E4E5E7] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#E4E5E7] flex items-center justify-between bg-white">
              <div>
                <h2 className="text-base font-bold text-[#202124]">
                  Destination Gallery: {galleryDest.name}
                </h2>
                <p className="text-xs text-[#70757A]">
                  Upload high-resolution photography for public website showcases.
                </p>
              </div>
              <button
                onClick={() => setGalleryDest(null)}
                className="p-1 text-[#70757A] hover:text-[#202124] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Image Upload / Add Form */}
              <form
                onSubmit={handleAddDestImage}
                className="bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl p-4 space-y-3"
              >
                <div className="text-xs font-bold uppercase tracking-wider text-[#202124] flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>Attach New Photo</span>
                </div>

                {/* Direct File Selector */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="w-full sm:w-auto px-4 py-2 bg-white border border-[#D3D8DF] hover:border-[#C5A880] rounded-xl text-xs font-bold text-[#202124] cursor-pointer flex items-center justify-center gap-2 shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-[#C5A880]" />
                    <span>{uploadingGalleryImage ? "Uploading..." : "Select File From Computer"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadGalleryFile}
                      disabled={uploadingGalleryImage}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-[#70757A]">or paste direct image URL below</span>
                </div>

                <div>
                  <input
                    type="text"
                    required
                    placeholder="https://... or uploaded image URL"
                    value={newImgUrl}
                    onChange={(e) => setNewImgUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      required
                      placeholder="Image Alt Description (e.g. Emerald Lake at Dawn)"
                      value={newImgAlt}
                      onChange={(e) => setNewImgAlt(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>

                  <div>
                    <input
                      type="number"
                      min="0"
                      placeholder="Sort Order (0)"
                      value={newImgSort}
                      onChange={(e) => setNewImgSort(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#202124]">
                    <input
                      type="checkbox"
                      checked={newImgFeatured}
                      onChange={(e) => setNewImgFeatured(e.target.checked)}
                      className="w-4 h-4 rounded text-[#24292F] focus:ring-0"
                    />
                    <span>Mark as Primary Hero Image</span>
                  </label>

                  <button
                    type="submit"
                    disabled={galleryLoading || uploadingGalleryImage || !newImgUrl.trim()}
                    className="px-4 py-2 bg-[#24292F] hover:bg-[#3D4450] text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                  >
                    Add to Gallery
                  </button>
                </div>
              </form>

              {/* Existing Gallery Grid */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#70757A] mb-3">
                  Current Gallery Images ({galleryImages.length})
                </h3>

                {galleryLoading && galleryImages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#70757A]">Loading gallery photos...</div>
                ) : galleryImages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#70757A] border border-dashed border-[#D3D8DF] rounded-xl">
                    No images uploaded for this destination yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {galleryImages.map((img) => (
                      <div
                        key={img.id}
                        className="group relative rounded-xl border border-[#E4E5E7] bg-white overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col"
                      >
                        <div className="relative aspect-video bg-[#F7F7F5] overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.image_url}
                            alt={img.alt_text}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {img.is_featured && (
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#24292F] text-[#C5A880] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                              <Star className="w-3 h-3 fill-[#C5A880]" />
                              <span>Hero</span>
                            </div>
                          )}
                        </div>

                        <div className="p-3 text-xs flex-1 flex flex-col justify-between space-y-2">
                          <div>
                            <p className="font-semibold text-[#202124] line-clamp-1">{img.alt_text}</p>
                            <p className="text-[10px] text-[#70757A] font-mono mt-0.5">
                              Order: {img.sort_order}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-[#E4E5E7]">
                            <button
                              onClick={() => handleToggleFeaturedDestImage(img)}
                              title={img.is_featured ? "Unmark hero image" : "Set as primary hero"}
                              className={`p-1 rounded-md text-xs font-medium cursor-pointer ${
                                img.is_featured
                                  ? "text-[#C5A880] bg-amber-50"
                                  : "text-[#70757A] hover:text-[#202124]"
                              }`}
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${img.is_featured ? "fill-[#C5A880]" : ""}`}
                              />
                            </button>

                            <button
                              onClick={() => handleDeleteDestImage(img.id)}
                              title="Delete photo"
                              className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
