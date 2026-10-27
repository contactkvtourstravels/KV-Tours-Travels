"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Tag,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Globe,
  Package as PackageIcon,
  MapPin,
  Layers,
} from "lucide-react";
import {
  adminApi,
  AddOn,
  PaginatedResponse,
  PackageItem,
  Destination,
} from "@/lib/api";
import { useAdmin } from "../AdminContext";
import { SearchableSelect } from "@/components/admin/SearchableSelect";
import { SearchableMultiSelect } from "@/components/admin/SearchableMultiSelect";

export const isAmbiguousRecord = (addon: AddOn) => {
  if (
    addon.applicability_scope === "selected_packages" &&
    (!addon.package_ids || addon.package_ids.length === 0)
  ) {
    return true;
  }
  if (
    addon.applicability_scope === "selected_destinations" &&
    (!addon.destination_ids || addon.destination_ids.length === 0)
  ) {
    return true;
  }
  if (
    addon.applicability_scope === "single_package" &&
    (!addon.package_ids || addon.package_ids.length === 0)
  ) {
    return true;
  }
  return false;
};

export default function AddOnsAdminPage() {
  const { hasAnyRole } = useAdmin();
  const canEdit = hasAnyRole(["manager", "admin", "super_admin"]);

  const [addOns, setAddOns] = useState<PaginatedResponse<AddOn> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Available catalogs for binding
  const [availablePackages, setAvailablePackages] = useState<PackageItem[]>([]);
  const [availableDestinations, setAvailableDestinations] = useState<Destination[]>([]);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [filterScope, setFilterScope] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modal State
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedAddOn, setSelectedAddOn] = useState<AddOn | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState<number | "">("");
  const [formCurrency, setFormCurrency] = useState("INR");
  const [formActive, setFormActive] = useState(true);
  const [formScope, setFormScope] = useState<
    "all_packages" | "selected_packages" | "selected_destinations" | "single_package"
  >("all_packages");
  const [formPriceType, setFormPriceType] = useState<
    "per_booking" | "per_traveller" | "per_room_night" | "per_unit"
  >("per_booking");
  const [formMinQuantity, setFormMinQuantity] = useState<number>(1);
  const [formMaxQuantity, setFormMaxQuantity] = useState<number | "">("");
  const [formIsMandatory, setFormIsMandatory] = useState<boolean>(false);
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(0);
  const [formPackageIds, setFormPackageIds] = useState<string[]>([]);
  const [formDestinationIds, setFormDestinationIds] = useState<string[]>([]);
  const [packageSearch, setPackageSearch] = useState<string>("");
  const [destinationSearch, setDestinationSearch] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAddOns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const isAct = filterActive === "all" ? undefined : filterActive === "true";
      const data = await adminApi.listAddOns({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        is_active: isAct,
      });
      if (filterScope === "ambiguous") {
        data.items = data.items.filter(isAmbiguousRecord);
      } else if (filterScope !== "all") {
        data.items = data.items.filter((item) => item.applicability_scope === filterScope);
      }
      setAddOns(data);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load optional add-ons.");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterActive, filterScope]);

  useEffect(() => {
    fetchAddOns();
  }, [fetchAddOns]);

  useEffect(() => {
    // Load packages and destinations for scoping selectors
    adminApi
      .getPackages({ page_size: 100, is_active: true })
      .then((res) => setAvailablePackages(res.items))
      .catch(() => {});
    adminApi
      .getDestinations({ page_size: 100, is_active: true })
      .then((res) => setAvailableDestinations(res.items))
      .catch(() => {});
  }, []);

  const loadPackageOptions = useCallback(async (query: string, signal?: AbortSignal) => {
    try {
      const res = await adminApi.getPackages({
        search: query.trim() || undefined,
        page: 1,
        page_size: 25,
      });
      return res.items.map((pkg) => ({
        id: pkg.id,
        label: pkg.name,
        subLabel: `${pkg.destination_name || "Unknown"} • ₹${Number(pkg.base_price).toLocaleString("en-IN")}`,
        badge: !pkg.is_published ? "Unpublished" : undefined,
      }));
    } catch {
      return [];
    }
  }, []);

  const resolvePackageOptions = useCallback(async (ids: string[]) => {
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          const pkg = await adminApi.getPackage(id);
          return {
            id: pkg.id,
            label: pkg.name,
            subLabel: `${pkg.destination_name || "Unknown"} • ₹${Number(pkg.base_price).toLocaleString("en-IN")}`,
            badge: !pkg.is_published ? "Unpublished" : undefined,
          };
        } catch {
          return null;
        }
      })
    );
    return results.filter(Boolean) as { id: string; label: string; subLabel?: string; badge?: string }[];
  }, []);

  const loadDestinationOptions = useCallback(async (query: string, signal?: AbortSignal) => {
    try {
      const res = await adminApi.getDestinations({
        search: query.trim() || undefined,
        page: 1,
        page_size: 25,
        is_active: true,
      });
      return res.items.map((dest) => ({
        id: dest.id,
        label: dest.name,
        subLabel: dest.country,
        badge: !dest.is_published ? "Unpublished" : undefined,
      }));
    } catch {
      return [];
    }
  }, []);

  const resolveDestinationOptions = useCallback(async (ids: string[]) => {
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          const dest = await adminApi.getDestination(id);
          return {
            id: dest.id,
            label: dest.name,
            subLabel: dest.country,
            badge: !dest.is_published ? "Unpublished" : undefined,
          };
        } catch {
          return null;
        }
      })
    );
    return results.filter(Boolean) as { id: string; label: string; subLabel?: string; badge?: string }[];
  }, []);

  // 1-Click Status Toggle
  const handleToggleActive = async (addon: AddOn) => {
    try {
      const updated = await adminApi.updateAddOn(addon.id, {
        is_active: !addon.is_active,
      });
      setSuccessMessage(
        `Add-on "${updated.name}" is now ${updated.is_active ? "ACTIVE" : "DEACTIVATED"}.`
      );
      fetchAddOns();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to toggle add-on status.");
    }
  };

  const handleDelete = async (addon: AddOn) => {
    if (!confirm(`Are you sure you want to deactivate add-on "${addon.name}"?`)) return;
    try {
      await adminApi.deleteAddOn(addon.id);
      setSuccessMessage(`Add-on "${addon.name}" deactivated.`);
      fetchAddOns();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to deactivate add-on.");
    }
  };

  // Create / Edit Modal
  const openCreateModal = () => {
    setSelectedAddOn(null);
    setFormName("");
    setFormDescription("");
    setFormPrice(1500);
    setFormCurrency("INR");
    setFormActive(true);
    setFormScope("all_packages");
    setFormPriceType("per_booking");
    setFormMinQuantity(1);
    setFormMaxQuantity("");
    setFormIsMandatory(false);
    setFormDisplayOrder(0);
    setFormPackageIds([]);
    setFormDestinationIds([]);
    setFormError(null);
    setModalMode("create");
  };

  const openEditModal = (addon: AddOn) => {
    setSelectedAddOn(addon);
    setFormName(addon.name);
    setFormDescription(addon.description || "");
    setFormPrice(Number(addon.price));
    setFormCurrency(addon.currency);
    setFormActive(addon.is_active);
    setFormScope(addon.applicability_scope || "all_packages");
    const safePriceType =
      addon.price_type === "per_person" ? "per_traveller" : (addon.price_type || "per_booking");
    setFormPriceType(safePriceType as "per_booking" | "per_traveller" | "per_room_night" | "per_unit");
    setFormMinQuantity(addon.min_quantity ?? 1);
    setFormMaxQuantity(addon.max_quantity ?? "");
    setFormIsMandatory(addon.is_mandatory ?? false);
    setFormDisplayOrder(addon.display_order ?? 0);
    setFormPackageIds(addon.package_ids || []);
    setFormDestinationIds(addon.destination_ids || []);
    setFormError(null);
    setModalMode("edit");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Add-on name is required.");
      return;
    }
    if (formPrice === "" || Number(formPrice) < 0) {
      setFormError("Valid non-negative price is required.");
      return;
    }
    if (
      (formScope === "selected_packages" || formScope === "single_package") &&
      formPackageIds.length === 0
    ) {
      setFormError("Please select at least one package for this applicability scope.");
      return;
    }
    if (formScope === "selected_destinations" && formDestinationIds.length === 0) {
      setFormError("Please select at least one destination for this applicability scope.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const payload = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        price: Number(formPrice),
        currency: formCurrency.toUpperCase(),
        applicability_scope: formScope,
        price_type: formPriceType,
        min_quantity: Number(formMinQuantity) || 1,
        max_quantity: formMaxQuantity === "" ? undefined : Number(formMaxQuantity),
        is_mandatory: formIsMandatory,
        display_order: Number(formDisplayOrder) || 0,
        is_active: formActive,
        package_ids:
          formScope === "selected_packages" || formScope === "single_package"
            ? formPackageIds
            : [],
        destination_ids:
          formScope === "selected_destinations" ? formDestinationIds : [],
      };

      if (modalMode === "create") {
        await adminApi.createAddOn(payload);
        setSuccessMessage(`Add-on "${formName}" created successfully.`);
      } else if (modalMode === "edit" && selectedAddOn) {
        await adminApi.updateAddOn(selectedAddOn.id, payload);
        setSuccessMessage(`Add-on "${formName}" updated successfully.`);
      }
      setModalMode(null);
      fetchAddOns();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setFormError((err as Error).message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#24292F] text-white">
              <Tag className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#202124]">
              Tour Add-Ons &amp; Upgrades
            </h1>
          </div>
          <p className="text-xs text-[#70757A] mt-1 font-light">
            Manage optional upgrades, activities, and isolated service add-ons per package or destination.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Add-On</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-medium flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-[#E4E5E7] rounded-2xl shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#70757A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search add-on title or description..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#70757A]" />
          <select
            value={filterScope}
            onChange={(e) => {
              setFilterScope(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none"
          >
            <option value="all">All Scopes</option>
            <option value="all_packages">Global (All Packages)</option>
            <option value="selected_packages">Selected Packages</option>
            <option value="selected_destinations">Selected Destinations</option>
            <option value="single_package">Single Package</option>
            <option value="ambiguous">⚠️ Ambiguous (Needs Audit)</option>
          </select>

          <select
            value={filterActive}
            onChange={(e) => {
              setFilterActive(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Deactivated Only</option>
          </select>

          <button
            onClick={fetchAddOns}
            title="Refresh"
            className="p-2 rounded-xl bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#5F6368] hover:text-[#202124] transition-all shadow-2xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add-Ons Table */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-[#70757A]">
            <div className="w-8 h-8 border-4 border-[#24292F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold uppercase tracking-wider">Loading add-ons...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#202124] mb-1">Failed to Load Add-Ons</h3>
            <p className="text-xs text-rose-600 max-w-sm mx-auto mb-4">{error}</p>
            <button
              onClick={fetchAddOns}
              className="px-4 py-2 bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs"
            >
              Retry
            </button>
          </div>
        ) : !addOns || addOns.items.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="w-12 h-12 text-[#D3D8DF] mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#202124] mb-1">No add-ons found</h3>
            <p className="text-xs text-[#70757A] max-w-sm mx-auto mb-4">
              {search || filterActive !== "all"
                ? "No add-ons matched your active query."
                : "Your catalog does not have any optional booking add-ons configured yet."}
            </p>
            {canEdit && (
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs"
              >
                Create First Add-On
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E4E5E7] bg-[#F7F7F5] text-[11px] font-bold uppercase tracking-wider text-[#5F6368]">
                  <th className="py-3.5 px-4">Add-On Item</th>
                  <th className="py-3.5 px-4">Scope &amp; Isolation</th>
                  <th className="py-3.5 px-4">Pricing &amp; Type</th>
                  <th className="py-3.5 px-4">Limits &amp; Rules</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E5E7] text-xs">
                {addOns.items.map((addon) => {
                  const scopeLabel =
                    addon.applicability_scope === "all_packages"
                      ? "All Packages"
                      : addon.applicability_scope === "selected_packages"
                      ? `Selected Packages (${addon.package_ids?.length || 0})`
                      : addon.applicability_scope === "selected_destinations"
                      ? `Selected Destinations (${addon.destination_ids?.length || 0})`
                      : `Single Package`;

                  const priceTypeLabel =
                    addon.price_type === "per_traveller" || (addon.price_type as string) === "per_person"
                      ? "per traveller"
                      : addon.price_type === "per_room_night"
                      ? "per room night"
                      : addon.price_type === "per_unit"
                      ? "per unit"
                      : "per booking";

                  return (
                    <tr key={addon.id} className="hover:bg-[#FDFBF7] transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-bold text-[#202124] text-sm">{addon.name}</div>
                        {addon.description && (
                          <div className="text-[11px] text-[#5F6368] line-clamp-1 max-w-xs mt-0.5">
                            {addon.description}
                          </div>
                        )}
                      </td>

                      {/* Scope Badge */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F3F4F4] text-[#24292F] border border-[#D3D8DF]">
                            {addon.applicability_scope === "all_packages" ? (
                              <Globe className="w-3 h-3 text-[#5F6368]" />
                            ) : addon.applicability_scope === "selected_destinations" ? (
                              <MapPin className="w-3 h-3 text-[#5F6368]" />
                            ) : (
                              <PackageIcon className="w-3 h-3 text-[#5F6368]" />
                            )}
                            <span>{scopeLabel}</span>
                          </span>
                          {isAmbiguousRecord(addon) && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300"
                              title="Scope specifies restrictions but no packages/destinations are attached. Audit required."
                            >
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              <span>Needs Audit</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Pricing Type */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-[#202124]">
                          ₹{Number(addon.price).toLocaleString("en-IN")}
                        </div>
                        <div className="text-[10px] text-[#70757A] uppercase font-semibold">
                          {priceTypeLabel}
                        </div>
                      </td>

                      {/* Limits & Rules */}
                      <td className="py-4 px-4 text-[#5F6368]">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px]">
                            Qty: {addon.min_quantity} - {addon.max_quantity ?? "∞"}
                          </span>
                          {addon.is_mandatory && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#24292F] text-white">
                              Mandatory
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-4 px-4 text-center">
                        {canEdit ? (
                          <button
                            onClick={() => handleToggleActive(addon)}
                            title={`Click to ${addon.is_active ? "deactivate" : "activate"}`}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                              addon.is_active
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                            }`}
                          >
                            {addon.is_active ? "Active" : "Deactivated"}
                          </button>
                        ) : (
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              addon.is_active
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {addon.is_active ? "Active" : "Deactivated"}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(addon)}
                              title="Edit Details & Applicability"
                              className="p-1.5 rounded-lg border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] text-[#5F6368] hover:text-[#202124] transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => handleDelete(addon)}
                              title="Deactivate Add-On"
                              className="p-1.5 rounded-lg border border-[#D3D8DF] bg-white hover:bg-rose-50 text-[#70757A] hover:text-rose-600 transition-colors"
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
        {addOns && addOns.total_pages > 1 && (
          <div className="p-4 border-t border-[#E4E5E7] bg-[#F7F7F5] flex items-center justify-between text-xs text-[#5F6368]">
            <div>
              Showing Page {addOns.page} of {addOns.total_pages} ({addOns.total} total)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#D3D8DF] hover:bg-stone-50 disabled:opacity-40 font-semibold"
              >
                Previous
              </button>
              <button
                disabled={page >= addOns.total_pages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#D3D8DF] hover:bg-stone-50 disabled:opacity-40 font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#E4E5E7] rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#E4E5E7] flex items-center justify-between bg-white">
              <div>
                <h2 className="text-base font-serif font-bold text-[#202124]">
                  {modalMode === "create" ? "Create Tour Add-On" : `Edit Add-On: ${selectedAddOn?.name}`}
                </h2>
                <p className="text-[11px] text-[#70757A]">
                  Configure applicability scope, pricing model, and passenger limits.
                </p>
              </div>
              <button onClick={() => setModalMode(null)} className="p-1 text-[#70757A] hover:text-[#202124]">
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
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  Add-On Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Speedboat Airport Transfer / Travel Insurance"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                />
              </div>

              {/* Price & Price Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    placeholder="e.g. 1500"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Pricing Model <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formPriceType}
                    onChange={(e) =>
                      setFormPriceType(
                        e.target.value as "per_booking" | "per_traveller" | "per_room_night" | "per_unit"
                      )
                    }
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none"
                  >
                    <option value="per_booking">Per Booking (Fixed one-time charge)</option>
                    <option value="per_traveller">Per Traveller (Multiplied by passengers)</option>
                    <option value="per_room_night">Per Room Night (Multiplied by nights)</option>
                    <option value="per_unit">Per Unit (Custom quantity)</option>
                  </select>
                </div>
              </div>

              {/* Scope Selection (Isolation) */}
              <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-3">
                <label className="block text-xs font-bold text-[#202124]">
                  Applicability Scope (Package Isolation) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setFormScope("all_packages")}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2 transition-all ${
                      formScope === "all_packages"
                        ? "bg-[#24292F] text-white border-[#24292F]"
                        : "bg-white text-[#202124] border-[#D3D8DF] hover:bg-[#F3F4F4]"
                    }`}
                  >
                    <Globe className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">All Packages</span>
                      <span className="text-[10px] opacity-80">Global across site</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormScope("selected_packages")}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2 transition-all ${
                      formScope === "selected_packages"
                        ? "bg-[#24292F] text-white border-[#24292F]"
                        : "bg-white text-[#202124] border-[#D3D8DF] hover:bg-[#F3F4F4]"
                    }`}
                  >
                    <PackageIcon className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Selected Packages</span>
                      <span className="text-[10px] opacity-80">Specific package IDs</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormScope("selected_destinations")}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2 transition-all ${
                      formScope === "selected_destinations"
                        ? "bg-[#24292F] text-white border-[#24292F]"
                        : "bg-white text-[#202124] border-[#D3D8DF] hover:bg-[#F3F4F4]"
                    }`}
                  >
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">By Destination</span>
                      <span className="text-[10px] opacity-80">All packages in area</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormScope("single_package")}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2 transition-all ${
                      formScope === "single_package"
                        ? "bg-[#24292F] text-white border-[#24292F]"
                        : "bg-white text-[#202124] border-[#D3D8DF] hover:bg-[#F3F4F4]"
                    }`}
                  >
                    <Layers className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Single Package</span>
                      <span className="text-[10px] opacity-80">Dedicated to 1 tour</span>
                    </div>
                  </button>
                </div>

                {/* Multi-package selection */}
                {formScope === "selected_packages" && (
                  <div className="pt-2 border-t border-[#E4E5E7] space-y-2">
                    <SearchableMultiSelect
                      label="Select Target Packages"
                      required
                      value={formPackageIds}
                      onChange={setFormPackageIds}
                      loadOptions={loadPackageOptions}
                      resolveOptions={resolvePackageOptions}
                      placeholder="Search and select packages (name, destination, country)..."
                      helperText="This add-on will only be available on the selected packages."
                    />
                  </div>
                )}

                {/* Single-package selection */}
                {formScope === "single_package" && (
                  <div className="pt-2 border-t border-[#E4E5E7] space-y-2">
                    <SearchableSelect
                      label="Select Dedicated Package"
                      required
                      value={formPackageIds[0] || null}
                      onChange={(val) => setFormPackageIds(val ? [val] : [])}
                      loadOptions={loadPackageOptions}
                      resolveOption={async (id) => {
                        const opts = await resolvePackageOptions([id]);
                        return opts[0] || null;
                      }}
                      placeholder="Search and select a package..."
                      allowNone={false}
                      helperText="Dedicated exclusively to this single tour package."
                    />
                  </div>
                )}

                {/* Destination selection */}
                {formScope === "selected_destinations" && (
                  <div className="pt-2 border-t border-[#E4E5E7] space-y-2">
                    <SearchableMultiSelect
                      label="Select Target Destinations"
                      required
                      value={formDestinationIds}
                      onChange={setFormDestinationIds}
                      loadOptions={loadDestinationOptions}
                      resolveOptions={resolveDestinationOptions}
                      placeholder="Search and select destinations (name, country)..."
                      helperText="Automatically available on all packages located within these destinations."
                    />
                  </div>
                )}
              </div>

              {/* Quantity Bounds & Mandatory */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#202124] mb-1">
                    Min Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formMinQuantity}
                    onChange={(e) => setFormMinQuantity(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#202124] mb-1">
                    Max Quantity (Optional)
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Unlimited"
                    value={formMaxQuantity}
                    onChange={(e) =>
                      setFormMaxQuantity(e.target.value ? Number(e.target.value) : "")
                    }
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#202124] mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Details of the add-on, vehicle type, insurance coverage..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="p-3 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="w-4 h-4 rounded text-[#24292F]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#202124] block">Active Add-On</span>
                    <span className="text-[10px] text-[#70757A]">Available for checkout selection</span>
                  </div>
                </label>

                <label className="p-3 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsMandatory}
                    onChange={(e) => setFormIsMandatory(e.target.checked)}
                    className="w-4 h-4 rounded text-[#24292F]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#202124] block">Mandatory Item</span>
                    <span className="text-[10px] text-[#70757A]">Automatically added to booking</span>
                  </div>
                </label>
              </div>

              <div className="pt-4 border-t border-[#E4E5E7] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 rounded-xl border border-[#D3D8DF] bg-white text-[#24292F] text-xs font-bold uppercase tracking-wider hover:bg-[#F7F7F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-all shadow-xs"
                >
                  {submitting ? "Saving..." : modalMode === "create" ? "Create Add-On" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
