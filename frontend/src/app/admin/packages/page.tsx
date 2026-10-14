"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Package as PackageIcon,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  MapPin,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  ChevronRight,
  ExternalLink,
  Upload,
  Star,
} from "lucide-react";
import { adminApi, Destination, PackageItem, PaginatedResponse } from "@/lib/api";
import { useAdmin } from "../AdminContext";
import { CreatableSelect } from "@/components/admin/CreatableSelect";
import { SearchableSelect } from "@/components/admin/SearchableSelect";
import { useCatalogOptions } from "@/components/admin/useCatalogOptions";



export default function PackagesAdminPage() {
  const { hasAnyRole } = useAdmin();
  const canEdit = hasAnyRole(["manager", "admin", "super_admin"]);
  const { options: catalogOptions, addCustomCategory } = useCatalogOptions();

  const [packages, setPackages] = useState<PaginatedResponse<PackageItem> | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  const destinationOptions = useMemo(
    () =>
      destinations.map((d) => ({
        id: d.id,
        label: d.name,
        subLabel: d.country,
        badge: d.is_published ? undefined : "Draft",
      })),
    [destinations]
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [filterDestination, setFilterDestination] = useState<string>("all");
  const [filterPublished, setFilterPublished] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modal State
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Form Fields
  const [formDestId, setFormDestId] = useState("");
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCategory, setFormCategory] = useState("Family Vacation");
  const [formTravelType, setFormTravelType] = useState("Private Guided Tour");
  const [formDepartureLocation, setFormDepartureLocation] = useState("Coimbatore");
  const [formCoverImageUrl, setFormCoverImageUrl] = useState("");
  const [formShortDesc, setFormShortDesc] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formBasePrice, setFormBasePrice] = useState<number>(10000);
  const [formCurrency, setFormCurrency] = useState("INR");
  const [formDays, setFormDays] = useState<number>(3);
  const [formNights, setFormNights] = useState<number>(2);
  const [formMinTravellers, setFormMinTravellers] = useState<number>(1);
  const [formMaxTravellers, setFormMaxTravellers] = useState<string>("");
  const [formFeatured, setFormFeatured] = useState(false);
  const [formPublished, setFormPublished] = useState(true);
  const [formActive, setFormActive] = useState(true);
  const [formSeoTitle, setFormSeoTitle] = useState("");
  const [formSeoDesc, setFormSeoDesc] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const fetchDestinations = useCallback(async () => {
    try {
      const res = await adminApi.getDestinations({ page: 1, page_size: 100, is_active: true });
      setDestinations(res.items);
      if (res.items.length > 0 && !formDestId) {
        setFormDestId(res.items[0].id);
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load destination options.");
    }
  }, [formDestId]);

  const loadDestinationOptions = useCallback(async (query: string, signal?: AbortSignal) => {
    try {
      const res = await adminApi.getDestinations({
        search: query.trim() || undefined,
        page: 1,
        page_size: 25,
        is_active: true,
      });
      return res.items.map((d) => ({
        id: d.id,
        label: d.name,
        subLabel: d.country,
        badge: d.is_published ? undefined : "Draft",
      }));
    } catch {
      return [];
    }
  }, []);

  const resolveDestinationOption = useCallback(async (id: string) => {
    try {
      const d = await adminApi.getDestination(id);
      return {
        id: d.id,
        label: d.name,
        subLabel: d.country,
        badge: d.is_published ? undefined : "Draft",
      };
    } catch {
      return null;
    }
  }, []);

  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const isPub = filterPublished === "all" ? undefined : filterPublished === "true";
      const isAct = filterActive === "all" ? undefined : filterActive === "true";
      const destId = filterDestination === "all" ? undefined : filterDestination;

      const data = await adminApi.getPackages({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        destination_id: destId,
        is_published: isPub,
        is_active: isAct,
      });
      setPackages(data);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load packages.");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterDestination, filterPublished, filterActive]);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleUploadCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingCover(true);
      const res = await adminApi.uploadMedia(file, "travelagency/packages");
      setFormCoverImageUrl(res.url);
      setSuccessMessage("Cover photo uploaded successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to upload cover photo.");
    } finally {
      setUploadingCover(false);
    }
  };

  // 1-Click Status Toggles with Confirmation
  const handleTogglePublish = async (pkg: PackageItem) => {
    const confirmMsg = pkg.is_published
      ? `Are you sure you want to hide package "${pkg.name}" from the public website? Customers will not be able to view or book this package.`
      : `Are you sure you want to make package "${pkg.name}" visible on the public website?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const updated = await adminApi.togglePackagePublish(pkg.id, pkg.is_published);
      setSuccessMessage(
        `Package "${updated.name}" is now ${
          updated.is_published ? "VISIBLE on the website" : "HIDDEN from the website"
        }.`
      );
      fetchPackages();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to toggle visibility status.");
    }
  };

  const handleToggleActive = async (pkg: PackageItem) => {
    try {
      const updated = await adminApi.togglePackageActive(pkg.id, pkg.is_active);
      setSuccessMessage(
        `Package "${updated.name}" is now ${updated.is_active ? "ACTIVE" : "DEACTIVATED"}.`
      );
      fetchPackages();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to toggle active status.");
    }
  };

  // Create / Edit Modal
  const openCreateModal = () => {
    setSelectedPackage(null);
    setFormDestId(destinations.length > 0 ? destinations[0].id : "");
    setFormName("");
    setFormSlug("");
    setFormCategory("Family Vacation");
    setFormTravelType("Private Guided Tour");
    setFormDepartureLocation("Coimbatore");
    setFormCoverImageUrl("");
    setFormShortDesc("");
    setFormDesc("");
    setFormBasePrice(10000);
    setFormCurrency("INR");
    setFormDays(3);
    setFormNights(2);
    setFormMinTravellers(1);
    setFormMaxTravellers("");
    setFormFeatured(false);
    setFormPublished(true);
    setFormActive(true);
    setFormSeoTitle("");
    setFormSeoDesc("");
    setFormError(null);
    setModalMode("create");
  };

  const openEditModal = (pkg: PackageItem) => {
    setSelectedPackage(pkg);
    setFormDestId(pkg.destination_id);
    setFormName(pkg.name);
    setFormSlug(pkg.slug);
    setFormCategory(pkg.category || "Family Vacation");
    setFormTravelType(pkg.travel_type || "Private Guided Tour");
    setFormDepartureLocation(pkg.departure_location || "Coimbatore");
    setFormCoverImageUrl(pkg.cover_image_url || "");
    setFormShortDesc(pkg.short_description || "");
    setFormDesc(pkg.description || "");
    setFormBasePrice(Number(pkg.base_price));
    setFormCurrency(pkg.currency);
    setFormDays(pkg.duration_days);
    setFormNights(pkg.duration_nights);
    setFormMinTravellers(pkg.minimum_travellers);
    setFormMaxTravellers(pkg.maximum_travellers ? String(pkg.maximum_travellers) : "");
    setFormFeatured(pkg.is_featured);
    setFormPublished(pkg.is_published);
    setFormActive(pkg.is_active);
    setFormSeoTitle(pkg.seo_title || "");
    setFormSeoDesc(pkg.seo_description || "");
    setFormError(null);
    setModalMode("edit");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDestId) {
      setFormError("Package title and destination are required.");
      return;
    }
    if (formBasePrice <= 0) {
      setFormError("Base price must be greater than zero.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const maxTravellers = formMaxTravellers.trim() ? Number(formMaxTravellers) : undefined;

      const payload = {
        destination_id: formDestId,
        name: formName.trim(),
        slug: formSlug.trim() || undefined,
        category: formCategory.trim() || undefined,
        travel_type: formTravelType.trim() || undefined,
        departure_location: formDepartureLocation.trim() || undefined,
        cover_image_url: formCoverImageUrl.trim() || undefined,
        short_description: formShortDesc.trim() || undefined,
        description: formDesc.trim() || undefined,
        base_price: Number(formBasePrice),
        currency: formCurrency.toUpperCase(),
        duration_days: Number(formDays),
        duration_nights: Number(formNights),
        minimum_travellers: Number(formMinTravellers),
        maximum_travellers: maxTravellers,
        is_featured: formFeatured,
        is_published: formPublished,
        seo_title: formSeoTitle.trim() || undefined,
        seo_description: formSeoDesc.trim() || undefined,
      };

      if (modalMode === "create") {
        await adminApi.createPackage(payload);
        setSuccessMessage(`Package "${formName}" created successfully.`);
      } else if (modalMode === "edit" && selectedPackage) {
        await adminApi.updatePackage(selectedPackage.id, {
          ...payload,
          is_active: formActive,
        });
        setSuccessMessage(`Package "${formName}" updated successfully.`);
      }
      setModalMode(null);
      fetchPackages();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setFormError((err as Error).message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (pkg: PackageItem) => {
    if (!window.confirm(`Are you sure you want to deactivate package "${pkg.name}"?`)) {
      return;
    }
    try {
      await adminApi.deletePackage(pkg.id);
      setSuccessMessage(`Package "${pkg.name}" deactivated.`);
      fetchPackages();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to deactivate package.");
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
            <PackageIcon className="w-6 h-6 text-[#C5A880]" />
            <span>Tour Packages & Itineraries</span>
          </h1>
          <p className="text-xs text-[#5F6368] mt-1">
            Manage multi-day travel packages, daily itineraries, pricing tiers, and public visibility.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#24292F] hover:bg-[#3D4450] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Package</span>
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
            placeholder="Search by package name, slug, or keywords..."
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
            value={filterDestination}
            onChange={(e) => {
              setFilterDestination(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs font-medium text-[#202124] focus:outline-none focus:border-[#C5A880]"
          >
            <option value="all">All Destinations</option>
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

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
            onClick={fetchPackages}
            title="Refresh"
            className="p-2 rounded-xl bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#5F6368] hover:text-[#202124] transition-all shadow-2xs cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Packages Table */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-[#70757A]">
            <div className="w-8 h-8 border-4 border-[#24292F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold uppercase tracking-wider">Loading tour packages...</p>
          </div>
        ) : !packages || packages.items.length === 0 ? (
          <div className="p-12 text-center">
            <PackageIcon className="w-12 h-12 text-[#D3D8DF] mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#202124] mb-1">No tour packages found</h3>
            <p className="text-xs text-[#70757A] max-w-sm mx-auto mb-4">
              {search || filterDestination !== "all" || filterPublished !== "all"
                ? "No packages matched your active search filters."
                : "Your catalog does not have any packages yet. Create your first itinerary to publish."}
            </p>
            {canEdit && (
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Create Tour Package
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E4E5E7] bg-[#F7F7F5] text-[11px] font-bold uppercase tracking-wider text-[#5F6368]">
                  <th className="py-3.5 px-4">Package</th>
                  <th className="py-3.5 px-4">Category & Style</th>
                  <th className="py-3.5 px-4">Destination</th>
                  <th className="py-3.5 px-4">Duration & Price</th>
                  <th className="py-3.5 px-4 text-center">Public Visibility</th>
                  <th className="py-3.5 px-4 text-center">Record State</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E5E7] text-xs">
                {packages.items.map((pkg) => {
                  const isParentDraft = pkg.destination_is_published === false;

                  return (
                    <tr key={pkg.id} className="hover:bg-[#FDFBF7] transition-colors">
                      {/* Package Name, Thumbnail, Slug */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-10 rounded-lg overflow-hidden bg-[#E4E5E7] shrink-0 border border-[#D3D8DF] flex items-center justify-center">
                            {pkg.cover_image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={pkg.cover_image_url}
                                alt={pkg.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <PackageIcon className="w-4 h-4 text-[#70757A]" />
                            )}
                          </div>
                          <div>
                            <Link
                              href={`/admin/packages/${pkg.id}`}
                              className="font-bold text-[#202124] text-sm hover:text-[#C5A880] transition-colors flex items-center gap-1.5"
                            >
                              <span>{pkg.name}</span>
                              {pkg.is_featured && (
                                <Star className="w-3.5 h-3.5 text-[#C5A880] fill-[#C5A880]" />
                              )}
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] font-mono text-[#70757A]">/{pkg.slug}</span>
                              <Link
                                href={`/packages/${pkg.slug}`}
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
                            {pkg.category || "General Tour"}
                          </span>
                          {pkg.travel_type && (
                            <span className="text-[11px] text-[#70757A]">
                              {pkg.travel_type}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Destination */}
                      <td className="py-4 px-4 text-[#5F6368]">
                        <div className="font-semibold text-[#202124] flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-[#C5A880]" />
                          <span>{pkg.destination_name || "Destination"}</span>
                        </div>
                        {isParentDraft && (
                          <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <AlertTriangle className="w-3 h-3 text-amber-700" />
                            <span>Destination is Draft</span>
                          </div>
                        )}
                      </td>

                      {/* Duration & Price */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-[#202124]">
                          ₹{Number(pkg.base_price).toLocaleString("en-IN")}
                        </div>
                        <div className="text-[11px] text-[#70757A]">
                          {pkg.duration_days}D / {pkg.duration_nights}N
                        </div>
                      </td>

                      {/* 1-Click Visibility Toggle */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {canEdit ? (
                            <button
                              onClick={() => handleTogglePublish(pkg)}
                              title={pkg.is_published ? "Hide from website" : "Show on website"}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                                pkg.is_published
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                              }`}
                            >
                              {pkg.is_published ? (
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
                                pkg.is_published
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {pkg.is_published ? (
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

                          {pkg.is_published && isParentDraft && (
                            <span className="text-[10px] text-amber-700 font-medium text-center">
                              (Hidden publicly until destination is published)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 1-Click Active Toggle */}
                      <td className="py-4 px-4 text-center">
                        {canEdit ? (
                          <button
                            onClick={() => handleToggleActive(pkg)}
                            title={`Click to ${pkg.is_active ? "deactivate" : "activate"}`}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                              pkg.is_active
                                ? "bg-stone-50 text-[#3D4450] border-[#D3D8DF] hover:bg-stone-100"
                                : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                            }`}
                          >
                            {pkg.is_active ? "Active" : "Deactivated"}
                          </button>
                        ) : (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              pkg.is_active
                                ? "bg-stone-50 text-[#3D4450] border-[#D3D8DF]"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {pkg.is_active ? "Active" : "Deactivated"}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/packages/${pkg.id}`}
                            title="Open Full 9-Tab Studio (Itinerary, Images, Hotels)"
                            className="px-2.5 py-1.5 rounded-lg border border-[#24292F] bg-[#24292F] text-white hover:bg-[#3D4450] text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 shadow-2xs"
                          >
                            <span>Studio</span>
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(pkg)}
                              title="Quick Edit"
                              className="p-1.5 rounded-lg border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] text-[#5F6368] hover:text-[#202124] transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => handleTogglePublish(pkg)}
                              title={pkg.is_published ? "Hide from website" : "Show on website"}
                              className={`p-1.5 rounded-lg border border-[#D3D8DF] bg-white transition-colors cursor-pointer ${
                                pkg.is_published
                                  ? "hover:bg-amber-50 text-[#70757A] hover:text-amber-700"
                                  : "hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800"
                              }`}
                            >
                              {pkg.is_published ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => handleDelete(pkg)}
                              title="Deactivate Package"
                              className="p-1.5 rounded-lg border border-[#D3D8DF] bg-white hover:bg-rose-50 text-[#70757A] hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {packages && packages.total_pages > 1 && (
          <div className="p-4 border-t border-[#E4E5E7] bg-[#F7F7F5] flex items-center justify-between text-xs text-[#5F6368]">
            <div>
              Showing Page {packages.page} of {packages.total_pages} ({packages.total} total)
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
                disabled={page >= packages.total_pages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#D3D8DF] hover:bg-stone-50 disabled:opacity-40 font-semibold cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Add / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#E4E5E7] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#E4E5E7] flex items-center justify-between bg-white">
              <h2 className="text-base font-bold text-[#202124]">
                {modalMode === "create" ? "Create Tour Package" : `Edit Package: ${selectedPackage?.name}`}
              </h2>
              <button
                onClick={() => setModalMode(null)}
                className="p-1 text-[#70757A] hover:text-[#202124] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <SearchableSelect
                  label="Destination"
                  required={true}
                  value={formDestId || null}
                  onChange={(val) => setFormDestId(val || "")}
                  options={destinationOptions}
                  loadOptions={loadDestinationOptions}
                  resolveOption={resolveDestinationOption}
                  placeholder="Search and select destination..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Package Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 3D2N Ooty Tea & Nilgiri Experience"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    URL Slug <span className="text-[#70757A] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="auto-generated from title"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <CreatableSelect
                    label="Category"
                    value={formCategory || null}
                    onChange={(val) => setFormCategory(val || "")}
                    options={catalogOptions.package_categories}
                    placeholder="Select or enter custom category..."
                    allowNone={true}
                    noneLabel="None (Unset Category)"
                    onCustomCreate={(newCat) =>
                      addCustomCategory("package_categories", newCat)
                    }
                  />
                </div>

                <div>
                  <CreatableSelect
                    label="Travel Type"
                    value={formTravelType || null}
                    onChange={(val) => setFormTravelType(val || "")}
                    options={catalogOptions.package_travel_types}
                    placeholder="Select or enter travel type..."
                    allowNone={true}
                    noneLabel="None (Unset Travel Type)"
                    onCustomCreate={(newType) =>
                      addCustomCategory("package_travel_types", newType)
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Departure City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Coimbatore"
                    value={formDepartureLocation}
                    onChange={(e) => setFormDepartureLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>

              {/* Cover Photo */}
              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  Cover Photo URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://... or upload local file"
                    value={formCoverImageUrl}
                    onChange={(e) => setFormCoverImageUrl(e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                  />
                  <label className="px-3.5 py-2 bg-white border border-[#D3D8DF] hover:border-[#C5A880] rounded-xl text-xs font-bold text-[#202124] cursor-pointer flex items-center gap-1 shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-[#C5A880]" />
                    <span>{uploadingCover ? "Uploading..." : "Upload"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadCoverFile}
                      disabled={uploadingCover}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Base Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formBasePrice}
                    onChange={(e) => setFormBasePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Days <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formDays}
                    onChange={(e) => setFormDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Nights
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formNights}
                    onChange={(e) => setFormNights(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  Short Tagline
                </label>
                <input
                  type="text"
                  placeholder="e.g. Scenic mountain retreat with private toy train ride"
                  value={formShortDesc}
                  onChange={(e) => setFormShortDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                />
              </div>

              {/* Status checkboxes */}
              <div className="bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#70757A]">
                  Publication Settings
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPublished}
                    onChange={(e) => setFormPublished(e.target.checked)}
                    className="w-4 h-4 rounded text-[#24292F] focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#202124]">Publish to Public Website</span>
                    <p className="text-[11px] text-[#70757A]">
                      Enables travellers to see and book this package immediately.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                    className="w-4 h-4 rounded text-[#24292F] focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#202124]">Featured Package</span>
                    <p className="text-[11px] text-[#70757A]">Highlights package in homepage trending sections.</p>
                  </div>
                </label>

                {modalMode === "edit" && (
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="w-4 h-4 rounded text-[#24292F] focus:ring-0"
                    />
                    <div>
                      <span className="text-xs font-bold text-[#202124]">Active Record</span>
                      <p className="text-[11px] text-[#70757A]">Soft-deactivate record.</p>
                    </div>
                  </label>
                )}
              </div>

              <div className="pt-4 border-t border-[#E4E5E7] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 rounded-xl border border-[#D3D8DF] bg-white text-[#24292F] text-xs font-bold uppercase tracking-wider hover:bg-[#F7F7F5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                >
                  {submitting ? "Saving..." : modalMode === "create" ? "Create Package" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
