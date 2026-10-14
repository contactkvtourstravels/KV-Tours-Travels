"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  Percent,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Eye,
  ArrowRight,
  MapPin,
  Tag,
  Power,
} from "lucide-react";
import {
  adminOffersApi,
  adminApi,
  AdminOfferItem,
  AdminOfferCreate,
  AdminOfferUpdate,
  PackageItem,
  PaginatedResponse,
} from "@/lib/api";
import { useAdmin } from "../AdminContext";
import { SearchableSelect } from "@/components/admin/SearchableSelect";

const PRESET_LABELS = [
  "Limited-Time Deal",
  "Early Bird",
  "Season Special",
  "Weekend Flash Deal",
  "Festive Exclusive",
  "Monsoon Special",
  "Summer Escape",
];

export default function BestOffersAdminPage() {
  const { hasAnyRole } = useAdmin();
  const canEdit = hasAnyRole(["staff", "manager", "admin", "super_admin"]);

  // Master Toggle State
  const [masterEnabled, setMasterEnabled] = useState<boolean>(true);
  const [togglingMaster, setTogglingMaster] = useState(false);

  // Offers Data
  const [offers, setOffers] = useState<AdminOfferItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Available Packages for dropdown binding
  const [packages, setPackages] = useState<PackageItem[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Modals
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<AdminOfferItem | null>(null);
  const [previewOffer, setPreviewOffer] = useState<AdminOfferItem | null>(null);
  const [deleteOfferTarget, setDeleteOfferTarget] = useState<AdminOfferItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formPackageId, setFormPackageId] = useState("");
  const [formPackageSearch, setFormPackageSearch] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formShortDescription, setFormShortDescription] = useState("");
  const [formDiscountType, setFormDiscountType] = useState<"percentage" | "fixed_amount">("percentage");
  const [formDiscountValue, setFormDiscountValue] = useState<number | "">("");
  const [formMaxDiscount, setFormMaxDiscount] = useState<number | "">("");
  const [formMinBookingAmount, setFormMinBookingAmount] = useState<number | "">("");
  const [formOfferLabel, setFormOfferLabel] = useState("");
  const [formBadgeText, setFormBadgeText] = useState("");
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formStatus, setFormStatus] = useState<"active" | "draft" | "disabled">("active");
  const [formStartAt, setFormStartAt] = useState("");
  const [formEndAt, setFormEndAt] = useState("");
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(0);
  const [formError, setFormError] = useState<string | null>(null);

  // Selected package object for live calculations in the modal
  const selectedPackageObj = useMemo(() => {
    return packages.find((p) => p.id === formPackageId) || null;
  }, [packages, formPackageId]);

  // Reactive price calculations in the form
  const formCalculations = useMemo(() => {
    if (!selectedPackageObj || formDiscountValue === "" || formDiscountValue <= 0) {
      return null;
    }
    const orig = Number(selectedPackageObj.base_price);
    const dVal = Number(formDiscountValue);
    let rawDisc = 0;

    if (formDiscountType === "percentage") {
      rawDisc = (orig * dVal) / 100;
      if (formMaxDiscount !== "" && Number(formMaxDiscount) > 0) {
        rawDisc = Math.min(rawDisc, Number(formMaxDiscount));
      }
    } else {
      rawDisc = dVal;
    }

    const disc = Math.max(0, Math.min(rawDisc, orig));
    const finalPrice = Math.max(0, orig - disc);
    const savings = disc;

    const badge =
      formBadgeText.trim() ||
      (formDiscountType === "percentage"
        ? `${dVal % 1 === 0 ? dVal : dVal.toFixed(1)}% OFF`
        : `Save ₹${Math.round(disc).toLocaleString("en-IN")}`);

    return {
      originalPrice: orig,
      discountAmount: disc,
      discountedPrice: finalPrice,
      savings,
      badge,
    };
  }, [selectedPackageObj, formDiscountType, formDiscountValue, formMaxDiscount, formBadgeText]);

  // Load packages catalog
  const loadPackages = useCallback(async () => {
    try {
      const res: PaginatedResponse<PackageItem> = await adminApi.getPackages({
        page: 1,
        page_size: 100,
      });
      setPackages(res.items || []);
    } catch {
      // Ignore or retry silently
    }
  }, []);

  const loadPackageOptions = useCallback(async (query: string, signal?: AbortSignal) => {
    try {
      const res = await adminApi.getPackages({
        search: query.trim() || undefined,
        page: 1,
        page_size: 25,
      });
      // Store in packages list so selectedPackageObj calculations work
      setPackages((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        res.items.forEach((p) => map.set(p.id, p));
        return Array.from(map.values());
      });
      return res.items.map((pkg) => ({
        id: pkg.id,
        label: pkg.name,
        subLabel: `${pkg.destination_name || "Unknown"} • ₹${Number(pkg.base_price).toLocaleString("en-IN")} • ${pkg.duration_days}D/${pkg.duration_nights}N`,
        badge: !pkg.is_published ? "Unpublished" : undefined,
      }));
    } catch {
      return [];
    }
  }, []);

  const resolvePackageOption = useCallback(async (id: string) => {
    try {
      const pkg = await adminApi.getPackage(id);
      setPackages((prev) => (prev.some((p) => p.id === pkg.id) ? prev : [...prev, pkg]));
      return {
        id: pkg.id,
        label: pkg.name,
        subLabel: `${pkg.destination_name || "Unknown"} • ₹${Number(pkg.base_price).toLocaleString("en-IN")} • ${pkg.duration_days}D/${pkg.duration_nights}N`,
        badge: !pkg.is_published ? "Unpublished" : undefined,
      };
    } catch {
      return null;
    }
  }, []);

  // Fetch offers list & master toggle
  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminOffersApi.list({
        page,
        page_size: pageSize,
        status: statusFilter === "all" ? undefined : statusFilter,
        search: search.trim() || undefined,
      });
      setOffers(res.items || []);
      setTotalCount(res.total);
      setMasterEnabled(res.section_enabled);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load best offers list.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchOffers();
    loadPackages();
  }, [fetchOffers, loadPackages]);

  // Toggle Master Section Setting
  const handleToggleMaster = async () => {
    if (!canEdit) return;
    try {
      setTogglingMaster(true);
      const newStatus = !masterEnabled;
      const res = await adminOffersApi.updateMasterToggle(newStatus);
      setMasterEnabled(res.enabled);
      setSuccessMessage(res.message);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to update master toggle.");
    } finally {
      setTogglingMaster(false);
    }
  };

  // Quick Status Toggle for Individual Offer
  const handleToggleOfferStatus = async (offer: AdminOfferItem) => {
    if (!canEdit) return;
    const nextStatus = offer.status === "active" ? "disabled" : "active";
    try {
      await adminOffersApi.update(offer.id, { status: nextStatus });
      setSuccessMessage(`Offer "${offer.title}" set to ${nextStatus}.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchOffers();
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to update offer status.");
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setSelectedOffer(null);
    setFormPackageId(packages[0]?.id || "");
    setFormPackageSearch("");
    setFormTitle("");
    setFormShortDescription("");
    setFormDiscountType("percentage");
    setFormDiscountValue(15);
    setFormMaxDiscount("");
    setFormMinBookingAmount("");
    setFormOfferLabel("Limited-Time Deal");
    setFormBadgeText("");
    setFormIsFeatured(false);
    setFormStatus("active");
    setFormStartAt("");
    setFormEndAt("");
    setFormDisplayOrder(0);
    setFormError(null);
    setModalMode("create");
  };

  // Open Edit Modal
  const handleOpenEdit = (offer: AdminOfferItem) => {
    setSelectedOffer(offer);
    setFormPackageId(offer.package_id);
    setFormPackageSearch("");
    setFormTitle(offer.title);
    setFormShortDescription(offer.short_description || "");
    setFormDiscountType(
      offer.discount_type === "fixed" ? "fixed_amount" : (offer.discount_type as "percentage" | "fixed_amount")
    );
    setFormDiscountValue(Number(offer.discount_value));
    setFormMaxDiscount(offer.maximum_discount_amount ? Number(offer.maximum_discount_amount) : "");
    setFormMinBookingAmount(offer.minimum_booking_amount ? Number(offer.minimum_booking_amount) : "");
    setFormOfferLabel(offer.offer_label || "");
    setFormBadgeText(offer.badge_text || "");
    setFormIsFeatured(offer.is_featured);
    setFormStatus(offer.status === "archived" ? "disabled" : (offer.status as "active" | "draft" | "disabled"));
    setFormStartAt(offer.start_at ? offer.start_at.slice(0, 16) : "");
    setFormEndAt(offer.end_at ? offer.end_at.slice(0, 16) : "");
    setFormDisplayOrder(offer.display_order);
    setFormError(null);
    setModalMode("edit");
  };

  // Submit Form (Create / Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPackageId) {
      setFormError("Please select a package from the catalog.");
      return;
    }
    if (!formTitle.trim()) {
      setFormError("Offer title is required.");
      return;
    }
    if (formDiscountValue === "" || Number(formDiscountValue) <= 0) {
      setFormError("Please enter a valid positive discount value.");
      return;
    }

    if (formDiscountType === "percentage" && Number(formDiscountValue) > 100) {
      setFormError("Percentage discount cannot exceed 100%.");
      return;
    }

    if (selectedPackageObj && formDiscountType === "fixed_amount") {
      if (Number(formDiscountValue) > Number(selectedPackageObj.base_price)) {
        setFormError(
          `Fixed discount (₹${Number(formDiscountValue).toLocaleString("en-IN")}) cannot exceed package price (₹${Number(selectedPackageObj.base_price).toLocaleString("en-IN")}).`
        );
        return;
      }
    }

    if (formStartAt && formEndAt && new Date(formEndAt) <= new Date(formStartAt)) {
      setFormError("Offer end date must be after start date.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const payloadBase = {
        package_id: formPackageId,
        title: formTitle.trim(),
        short_description: formShortDescription.trim() || null,
        discount_type: formDiscountType,
        discount_value: Number(formDiscountValue),
        maximum_discount_amount: formMaxDiscount !== "" ? Number(formMaxDiscount) : null,
        minimum_booking_amount: formMinBookingAmount !== "" ? Number(formMinBookingAmount) : null,
        offer_label: formOfferLabel.trim() || null,
        badge_text: formBadgeText.trim() || null,
        is_featured: formIsFeatured,
        status: formStatus,
        start_at: formStartAt ? new Date(formStartAt).toISOString() : null,
        end_at: formEndAt ? new Date(formEndAt).toISOString() : null,
        display_order: Number(formDisplayOrder) || 0,
      };

      if (modalMode === "create") {
        await adminOffersApi.create(payloadBase as AdminOfferCreate);
        setSuccessMessage("Promotional offer created successfully!");
      } else if (modalMode === "edit" && selectedOffer) {
        await adminOffersApi.update(selectedOffer.id, payloadBase as AdminOfferUpdate);
        setSuccessMessage("Promotional offer updated successfully!");
      }

      setModalMode(null);
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchOffers();
    } catch (err: unknown) {
      setFormError((err as Error).message || "An error occurred while saving the offer.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete / Archive Action
  const handleConfirmDelete = async () => {
    if (!deleteOfferTarget || !canEdit) return;
    try {
      setSubmitting(true);
      await adminOffersApi.delete(deleteOfferTarget.id);
      setSuccessMessage(`Offer "${deleteOfferTarget.title}" deleted or archived successfully.`);
      setDeleteOfferTarget(null);
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchOffers();
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to remove offer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* =========================================================================
          1. HEADER & MASTER TOGGLE BANNER
         ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E5E7EB]">
        <div>
          <div className="inline-flex items-center gap-2 text-[#C5A880] text-xs uppercase tracking-[0.24em] font-semibold mb-1">
            <Percent className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>Promotion & Campaign Suite</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#202124]">
            Dynamic Best Offers
          </h1>
          <p className="text-xs sm:text-sm text-[#5F6368] mt-1">
            Publish verified discounts, limited-time deals, and prominent homepage campaign badges.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#202124] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-semibold shadow-sm transition-all self-start md:self-auto"
          >
            <Plus className="w-4 h-4 text-[#DFBA73]" />
            <span>New Best Offer</span>
          </button>
        )}
      </div>

      {/* Persistent Master Showcase Banner */}
      <div
        className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          masterEnabled
            ? "bg-[#F4F9F5] border-[#A7E2CB] text-[#1B1E22]"
            : "bg-[#FFF9F2] border-[#F2C99D] text-[#1B1E22]"
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              masterEnabled ? "bg-[#0D7A53] text-white" : "bg-[#D97706] text-white"
            }`}
          >
            <Power className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold uppercase tracking-wider">
                Homepage Best Offers Showcase:{" "}
                <span className={masterEnabled ? "text-[#0D7A53]" : "text-[#D97706]"}>
                  {masterEnabled ? "ACTIVE (ON)" : "HIDDEN (OFF)"}
                </span>
              </h2>
            </div>
            <p className="text-xs text-[#5F6368] mt-1 max-w-2xl leading-relaxed">
              When <strong>ON</strong>, all active and unexpired offers are displayed on the public
              homepage. When <strong>OFF</strong>, the entire Best Offers section is completely hidden
              from website visitors without deleting your offers or changing package statuses.
            </p>
          </div>
        </div>

        {canEdit && (
          <button
            type="button"
            disabled={togglingMaster}
            onClick={handleToggleMaster}
            className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-xs flex items-center gap-2 shrink-0 ${
              masterEnabled
                ? "bg-[#D97706] hover:bg-[#B45309] text-white"
                : "bg-[#0D7A53] hover:bg-[#0A6343] text-white"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{togglingMaster ? "Updating..." : masterEnabled ? "Turn OFF Section" : "Turn ON Section"}</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* =========================================================================
          2. METRICS & KPI STRIP
         ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] uppercase tracking-wider text-[#5F6368] font-semibold block mb-1">
            Total Offers
          </span>
          <p className="text-2xl font-serif font-bold text-[#202124]">{totalCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] uppercase tracking-wider text-[#0D7A53] font-semibold block mb-1">
            Active / Live
          </span>
          <p className="text-2xl font-serif font-bold text-[#0D7A53]">
            {offers.filter((o) => o.status === "active" && !o.is_expired).length}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] uppercase tracking-wider text-[#D97706] font-semibold block mb-1">
            Draft / Disabled
          </span>
          <p className="text-2xl font-serif font-bold text-[#D97706]">
            {offers.filter((o) => o.status === "draft" || o.status === "disabled").length}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] uppercase tracking-wider text-rose-600 font-semibold block mb-1">
            Expired
          </span>
          <p className="text-2xl font-serif font-bold text-rose-600">
            {offers.filter((o) => o.is_expired).length}
          </p>
        </div>
      </div>

      {/* =========================================================================
          3. CONTROLS, SEARCH & STATUS TABS
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E5E7EB] shadow-xs">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: "all", label: "All Offers" },
            { id: "active", label: "Active" },
            { id: "draft", label: "Draft" },
            { id: "disabled", label: "Disabled" },
            { id: "expired", label: "Expired" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
                statusFilter === tab.id
                  ? "bg-[#202124] text-white shadow-xs"
                  : "bg-neutral-100 text-[#5F6368] hover:bg-neutral-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#5F6368] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search offers or packages..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-full border border-[#E5E7EB] bg-neutral-50 focus:bg-white focus:outline-none focus:border-[#C5A880]"
          />
        </div>
      </div>

      {/* =========================================================================
          4. OFFERS LIST TABLE
         ========================================================================= */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-[#E5E7EB] flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#C5A880]" />
          <p className="text-xs uppercase tracking-widest text-[#5F6368] font-semibold">
            Loading Best Offers Catalog...
          </p>
        </div>
      ) : offers.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-[#E5E7EB] max-w-xl mx-auto shadow-xs">
          <Percent className="w-10 h-10 text-[#C5A880] mx-auto mb-3" />
          <h3 className="text-lg font-serif font-bold text-[#202124]">No Offers Found</h3>
          <p className="text-xs text-[#5F6368] mt-1 max-w-sm mx-auto leading-relaxed">
            {search || statusFilter !== "all"
              ? "No offers match your selected filter criteria. Try clearing your search."
              : "No best offers have been configured yet. Create your first promotional deal to highlight on the homepage."}
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-5 px-5 py-2.5 rounded-full bg-[#202124] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-semibold transition-all inline-flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5 text-[#DFBA73]" />
              <span>Create First Offer</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-[#E5E7EB] text-[#5F6368] uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3 px-4">Package & Deal</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Original → Discounted</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {offers.map((offer) => {
                  const origPrice = Number(offer.current_package_price);
                  const discPrice = Number(offer.calculated_discounted_price);
                  const savings = Number(offer.savings);

                  return (
                    <tr
                      key={offer.id}
                      className="hover:bg-neutral-50/50 transition-colors group"
                    >
                      {/* Package & Deal */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 shrink-0 border border-[#E5E7EB]">
                            {offer.cover_image_url ? (
                              <Image
                                src={offer.cover_image_url}
                                alt={offer.package_name}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                <Percent className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-neutral-900 group-hover:text-[#C5A880] transition-colors line-clamp-1">
                                {offer.title}
                              </span>
                              {offer.is_featured && (
                                <span className="px-1.5 py-0.5 rounded-sm bg-[#DFBA73]/30 text-[#8B6E30] text-[9px] font-bold uppercase tracking-wider">
                                  Featured
                                </span>
                              )}
                            </div>
                            <p className="text-[#5F6368] text-[11px] line-clamp-1">
                              {offer.package_name} • {offer.destination_name} ({offer.duration_days}D)
                            </p>
                            {offer.offer_label && (
                              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-neutral-100 text-[#5F6368] text-[10px] font-medium">
                                {offer.offer_label}
                              </span>
                            )}
                            {offer.price_changed_warning && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-sm border border-amber-200">
                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>Package base price changed since offer snapshot.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Discount Badge */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#DFBA73]/20 border border-[#DFBA73]/60 text-[#1B1E22] font-bold text-xs tracking-wider">
                          <Tag className="w-3 h-3 text-[#B08D46]" />
                          <span>{offer.discount_badge}</span>
                        </span>
                        <p className="text-[10px] text-[#5F6368] mt-0.5">
                          {offer.discount_type === "percentage"
                            ? `${offer.discount_value}% off package price`
                            : `₹${Number(offer.discount_value).toLocaleString("en-IN")} flat off`}
                        </p>
                      </td>

                      {/* Original vs Discounted */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#5F6368] line-through text-[11px]">
                              ₹{origPrice.toLocaleString("en-IN")}
                            </span>
                            <span className="font-bold text-neutral-900 text-xs">
                              ₹{discPrice.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <p className="text-emerald-700 font-semibold text-[10px]">
                            Save ₹{savings.toLocaleString("en-IN")} per traveller
                          </p>
                        </div>
                      </td>

                      {/* Validity */}
                      <td className="py-3 px-4">
                        {offer.start_at || offer.end_at ? (
                          <div className="space-y-0.5 text-[11px] text-[#5F6368]">
                            {offer.start_at && (
                              <p>From: {new Date(offer.start_at).toLocaleDateString("en-IN")}</p>
                            )}
                            {offer.end_at && (
                              <p>Until: {new Date(offer.end_at).toLocaleDateString("en-IN")}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">Always Active</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {offer.is_expired ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] uppercase tracking-wider">
                              Expired
                            </span>
                          ) : offer.status === "active" ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
                              Active
                            </span>
                          ) : offer.status === "draft" ? (
                            <span className="px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700 font-bold text-[10px] uppercase tracking-wider">
                              Draft
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] uppercase tracking-wider">
                              Disabled
                            </span>
                          )}

                          {canEdit && !offer.is_expired && (
                            <button
                              type="button"
                              onClick={() => handleToggleOfferStatus(offer)}
                              title={offer.status === "active" ? "Disable Offer" : "Activate Offer"}
                              className="p-1 rounded hover:bg-neutral-200 text-[#5F6368] transition-colors"
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewOffer(offer)}
                            title="Preview Homepage Card"
                            className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-[#5F6368] hover:text-neutral-900 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(offer)}
                                title="Edit Offer"
                                className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-[#5F6368] hover:text-neutral-900 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeleteOfferTarget(offer)}
                                title="Delete / Archive Offer"
                                className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          5. ADD / EDIT OFFER MODAL
         ========================================================================= */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-2xl max-w-3xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#DFBA73]/30 text-[#1B1E22] flex items-center justify-center font-bold">
                  <Percent className="w-4 h-4 text-[#8B6E30]" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#202124]">
                    {modalMode === "create" ? "Create Best Offer" : "Edit Best Offer"}
                  </h3>
                  <p className="text-[11px] text-[#5F6368]">
                    Bind promotional terms to an authoritative catalog package.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="p-1.5 rounded-full hover:bg-neutral-200 text-[#5F6368] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Package Selection */}
              <div>
                <SearchableSelect
                  label="1. Select Catalog Package"
                  required
                  value={formPackageId || null}
                  onChange={(val) => {
                    const newId = val || "";
                    setFormPackageId(newId);
                    const p = packages.find((pkg) => pkg.id === newId);
                    if (p && !formTitle) {
                      setFormTitle(`${p.name} Special`);
                    }
                  }}
                  loadOptions={loadPackageOptions}
                  resolveOption={resolvePackageOption}
                  placeholder="Search package by name, destination, or country..."
                  allowNone={false}
                />

                {/* Selected Package Details Pill */}
                {selectedPackageObj && (
                  <div className="mt-2.5 p-3 rounded-xl bg-neutral-50 border border-[#E5E7EB] flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-200 shrink-0">
                      {selectedPackageObj.cover_image_url ? (
                        <Image
                          src={selectedPackageObj.cover_image_url}
                          alt={selectedPackageObj.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400">
                          <MapPin className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs text-[#202124] truncate">
                        {selectedPackageObj.name}
                      </p>
                      <p className="text-[11px] text-[#5F6368]">
                        Authoritative Base Price:{" "}
                        <strong className="text-neutral-900">
                          ₹{Number(selectedPackageObj.base_price).toLocaleString("en-IN")}
                        </strong>{" "}
                        • {selectedPackageObj.destination_name} ({selectedPackageObj.duration_days} Days)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Offer Headline & Label */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1.5">
                    Offer Headline / Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bali Summer Special"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1.5">
                    Offer Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Limited-Time Deal"
                    value={formOfferLabel}
                    onChange={(e) => setFormOfferLabel(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] focus:outline-none focus:border-[#C5A880]"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {PRESET_LABELS.slice(0, 4).map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setFormOfferLabel(lbl)}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-[#5F6368]"
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1.5">
                  Short Offer Teaser / Terms (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Complimentary airport pickup and private speedboat transfers included."
                  value={formShortDescription}
                  onChange={(e) => setFormShortDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              {/* Discount Engine Configuration */}
              <div className="p-4 rounded-2xl bg-neutral-50/70 border border-[#E5E7EB] space-y-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#C5A880]" />
                  <h4 className="text-xs font-bold text-[#202124] uppercase tracking-wider">
                    2. Discount Calculation Engine
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Discount Type */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5F6368] mb-1">
                      Discount Type
                    </label>
                    <select
                      value={formDiscountType}
                      onChange={(e) =>
                        setFormDiscountType(e.target.value as "percentage" | "fixed_amount")
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#C5A880]"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed_amount">Fixed Amount (₹)</option>
                    </select>
                  </div>

                  {/* Discount Value */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5F6368] mb-1">
                      Discount Value {formDiscountType === "percentage" ? "(%)" : "(₹)"} *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={formDiscountType === "percentage" ? 100 : undefined}
                      step={formDiscountType === "percentage" ? "0.5" : "100"}
                      placeholder={formDiscountType === "percentage" ? "15" : "2000"}
                      value={formDiscountValue}
                      onChange={(e) =>
                        setFormDiscountValue(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>

                  {/* Custom Badge Text */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5F6368] mb-1">
                      Badge Text (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 15% OFF or Save ₹2,000"
                      value={formBadgeText}
                      onChange={(e) => setFormBadgeText(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                </div>

                {/* Optional Caps */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E5E7EB]">
                  {formDiscountType === "percentage" && (
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5F6368] mb-1">
                        Max Discount Cap (₹ Optional)
                      </label>
                      <input
                        type="number"
                        min={0}
                        placeholder="e.g. 5000"
                        value={formMaxDiscount}
                        onChange={(e) =>
                          setFormMaxDiscount(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#C5A880]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-[#5F6368] mb-1">
                      Minimum Booking Amount (₹ Optional)
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="e.g. 25000"
                      value={formMinBookingAmount}
                      onChange={(e) =>
                        setFormMinBookingAmount(
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                </div>

                {/* Reactive Live Pricing Box */}
                {formCalculations && (
                  <div className="p-3.5 rounded-xl bg-white border border-[#DFBA73]/60 shadow-xs space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#5F6368]">Original Package Price:</span>
                      <span className="font-semibold text-neutral-900">
                        ₹{formCalculations.originalPrice.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#5F6368]">Authoritative Discount:</span>
                      <span className="font-semibold text-rose-600">
                        - ₹{formCalculations.discountAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-100">
                      <span className="font-bold text-neutral-900">Discounted Client Price:</span>
                      <span className="font-bold text-base text-[#202124]">
                        ₹{formCalculations.discountedPrice.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-emerald-700 font-semibold pt-0.5">
                      <span>Total Savings Badge:</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#DFBA73]/30 text-[#1B1E22] font-bold">
                        {formCalculations.badge}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Dates & Scheduling */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1.5">
                    Start Date & Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formStartAt}
                    onChange={(e) => setFormStartAt(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] focus:outline-none focus:border-[#C5A880]"
                  />
                  <span className="text-[10px] text-[#5F6368]">Leave empty to activate immediately.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1.5">
                    End Date & Time (Optional Expiry)
                  </label>
                  <input
                    type="datetime-local"
                    value={formEndAt}
                    onChange={(e) => setFormEndAt(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] focus:outline-none focus:border-[#C5A880]"
                  />
                  <span className="text-[10px] text-[#5F6368]">
                    Offer will automatically hide after this time.
                  </span>
                </div>
              </div>

              {/* Display Order & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1.5">
                    Display Priority Order
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] focus:outline-none focus:border-[#C5A880]"
                  />
                  <span className="text-[10px] text-[#5F6368]">Lower numbers appear first.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) =>
                      setFormStatus(e.target.value as "active" | "draft" | "disabled")
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#C5A880]"
                  >
                    <option value="active">Active (Published)</option>
                    <option value="draft">Draft (Unpublished)</option>
                    <option value="disabled">Disabled (Hidden)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="formIsFeatured"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                    className="rounded border-[#E5E7EB] text-[#C5A880] focus:ring-[#C5A880]"
                  />
                  <label
                    htmlFor="formIsFeatured"
                    className="text-xs font-semibold text-[#202124] cursor-pointer"
                  >
                    Featured Badge
                  </label>
                </div>
              </div>

              {/* Live Homepage Card Preview in Modal */}
              {selectedPackageObj && formCalculations && (
                <div className="pt-4 border-t border-[#E5E7EB]">
                  <p className="text-xs font-bold text-[#5F6368] uppercase tracking-wider mb-3">
                    Homepage Card Visual Preview
                  </p>
                  <div className="max-w-sm mx-auto rounded-3xl overflow-hidden bg-white border border-[#E5E7EB] shadow-md">
                    <div className="relative h-48 overflow-hidden bg-neutral-200">
                      {selectedPackageObj.cover_image_url && (
                        <Image
                          src={selectedPackageObj.cover_image_url}
                          alt={selectedPackageObj.name}
                          fill
                          sizes="300px"
                          className="object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-full bg-white/95 text-[#202124] text-[10px] uppercase tracking-wider font-semibold shadow-xs">
                          {selectedPackageObj.destination_name}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-1 rounded-full bg-[#DFBA73] text-[#1B1E22] text-[10px] uppercase tracking-wider font-bold shadow-xs">
                          {formCalculations.badge}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      <span className="text-[10px] font-bold text-[#C5A880] uppercase tracking-widest block">
                        {formOfferLabel || "Exclusive Deal"}
                      </span>
                      <h5 className="font-serif font-bold text-sm text-[#202124] line-clamp-1">
                        {formTitle || selectedPackageObj.name}
                      </h5>
                      <div className="flex items-baseline gap-2 pt-1 border-t border-neutral-100">
                        <span className="text-[#5F6368] line-through text-xs">
                          ₹{formCalculations.originalPrice.toLocaleString("en-IN")}
                        </span>
                        <span className="text-base font-bold text-[#202124]">
                          ₹{formCalculations.discountedPrice.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold block">
                        Save ₹{formCalculations.savings.toLocaleString("en-IN")} per traveller
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Buttons */}
              <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-5 py-2.5 rounded-full border border-neutral-300 text-xs font-semibold text-[#5F6368] hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-full bg-[#202124] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-semibold transition-all shadow-xs"
                >
                  {submitting ? "Saving..." : modalMode === "create" ? "Create Offer" : "Update Offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. CARD PREVIEW MODAL
         ========================================================================= */}
      {previewOffer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-2xl max-w-md w-full p-6 relative">
            <button
              type="button"
              onClick={() => setPreviewOffer(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral-100 text-[#5F6368]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#C5A880] block mb-0.5">
                Live Homepage Card Preview
              </span>
              <h4 className="font-serif font-bold text-lg text-[#202124]">
                {previewOffer.title}
              </h4>
            </div>

            <div className="rounded-2xl overflow-hidden bg-white border border-[#E5E7EB] shadow-md">
              <div className="relative h-56 overflow-hidden bg-neutral-200">
                {previewOffer.cover_image_url && (
                  <Image
                    src={previewOffer.cover_image_url}
                    alt={previewOffer.package_name}
                    fill
                    sizes="400px"
                    className="object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 rounded-full bg-white/95 text-[#202124] text-[10px] uppercase tracking-wider font-semibold shadow-xs">
                    {previewOffer.destination_name}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <span className="px-3 py-1 rounded-full bg-[#DFBA73] text-[#1B1E22] text-[10px] uppercase tracking-wider font-bold shadow-xs">
                    {previewOffer.discount_badge}
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-2.5">
                {previewOffer.offer_label && (
                  <span className="text-[10px] font-bold text-[#C5A880] uppercase tracking-widest block">
                    {previewOffer.offer_label}
                  </span>
                )}
                <h5 className="font-serif font-bold text-base text-[#202124]">
                  {previewOffer.title}
                </h5>
                <p className="text-xs text-[#5F6368] line-clamp-2">
                  {previewOffer.short_description || `${previewOffer.duration_days} Days / ${previewOffer.duration_nights} Nights package to ${previewOffer.destination_name}.`}
                </p>
                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                  <div>
                    <span className="text-[#5F6368] line-through text-xs block">
                      ₹{Number(previewOffer.current_package_price).toLocaleString("en-IN")}
                    </span>
                    <span className="text-lg font-bold text-[#202124]">
                      ₹{Number(previewOffer.calculated_discounted_price).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold block">
                      Save ₹{Number(previewOffer.savings).toLocaleString("en-IN")} per traveller
                    </span>
                  </div>
                  <div className="px-4 py-2 rounded-full bg-[#202124] text-white text-xs font-semibold flex items-center gap-1.5">
                    <span>View Deal</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#DFBA73]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. DELETE / ARCHIVE CONFIRMATION MODAL
         ========================================================================= */}
      {deleteOfferTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-2xl max-w-md w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#202124]">
                Remove Offer?
              </h3>
              <p className="text-xs text-[#5F6368] mt-1.5 leading-relaxed">
                Are you sure you want to remove <strong>&quot;{deleteOfferTarget.title}&quot;</strong>? If this offer
                has existing historical bookings, it will be safely archived to preserve customer records
                and financial audits.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteOfferTarget(null)}
                className="px-5 py-2.5 rounded-full border border-neutral-300 text-xs font-semibold text-[#5F6368] hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDelete}
                className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-xs"
              >
                {submitting ? "Processing..." : "Confirm Removal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
