"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Compass,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { adminApi, Activity, Destination, PaginatedResponse } from "@/lib/api";
import { useAdmin } from "../AdminContext";
import { CreatableSelect } from "@/components/admin/CreatableSelect";
import { SearchableSelect } from "@/components/admin/SearchableSelect";
import { useCatalogOptions } from "@/components/admin/useCatalogOptions";

const ACTIVITY_CATEGORIES = [
  "Water Sports",
  "Adventure & Trekking",
  "Sightseeing & Heritage",
  "Cultural & Local Life",
  "Wildlife & Nature",
  "Culinary & Dining",
  "Wellness & Spa",
  "Cruises & Sailing",
];

export default function ActivitiesAdminPage() {
  const { hasAnyRole } = useAdmin();
  const canEdit = hasAnyRole(["manager", "admin", "super_admin"]);
  const { options: catalogOptions, addCustomCategory } = useCatalogOptions();

  const [activities, setActivities] = useState<PaginatedResponse<Activity> | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const destinationOptions = useMemo(
    () =>
      destinations.map((d) => ({
        id: d.id,
        label: d.name,
        subLabel: d.country,
      })),
    [destinations]
  );

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [filterDestination, setFilterDestination] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modal State
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formDestinationId, setFormDestinationId] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDurationMinutes, setFormDurationMinutes] = useState<number | "">("");
  const [formPrice, setFormPrice] = useState<number | "">("");
  const [formCurrency, setFormCurrency] = useState("INR");
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");
  const [formError, setFormError] = useState<string | null>(null);

  const fetchDestinations = useCallback(async () => {
    try {
      const res = await adminApi.getDestinations({ page: 1, page_size: 100 });
      setDestinations(res.items);
      if (res.items.length > 0 && !formDestinationId) {
        setFormDestinationId(res.items[0].id);
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load destination choices.");
    }
  }, [formDestinationId]);

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
      };
    } catch {
      return null;
    }
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const destId = filterDestination === "all" ? undefined : filterDestination;
      const cat = filterCategory === "all" ? undefined : filterCategory;
      const stat = filterStatus === "all" ? undefined : filterStatus;

      const data = await adminApi.listActivities({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        destination_id: destId,
        category: cat,
        status: stat,
      });
      setActivities(data);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load activities directory.");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterDestination, filterCategory, filterStatus]);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // 1-Click Status Toggle
  const handleToggleStatus = async (activity: Activity) => {
    try {
      const updated = await adminApi.toggleActivityStatus(activity.id, activity.status);
      setSuccessMessage(
        `Activity "${updated.name}" is now ${updated.status.toUpperCase()}.`
      );
      fetchActivities();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to toggle activity status.");
    }
  };

  // Create / Edit Modal
  const openCreateModal = () => {
    setSelectedActivity(null);
    setFormDestinationId(destinations[0]?.id || "");
    setFormName("");
    setFormDescription("");
    setFormCategory(ACTIVITY_CATEGORIES[0]);
    setFormDurationMinutes(60);
    setFormPrice(1500);
    setFormCurrency("INR");
    setFormStatus("active");
    setFormError(null);
    setModalMode("create");
  };

  const openEditModal = (activity: Activity) => {
    setSelectedActivity(activity);
    setFormDestinationId(activity.destination_id);
    setFormName(activity.name);
    setFormDescription(activity.description || "");
    setFormCategory(activity.category || ACTIVITY_CATEGORIES[0]);
    setFormDurationMinutes(activity.duration_minutes ?? "");
    setFormPrice(activity.price !== null ? Number(activity.price) : "");
    setFormCurrency(activity.currency || "INR");
    setFormStatus(activity.status === "active" ? "active" : "inactive");
    setFormError(null);
    setModalMode("edit");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDestinationId) {
      setFormError("Please select a destination for this activity.");
      return;
    }
    if (!formName.trim()) {
      setFormError("Activity title is required.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const duration = formDurationMinutes !== "" ? Number(formDurationMinutes) : undefined;
      const price = formPrice !== "" ? Number(formPrice) : undefined;

      if (modalMode === "create") {
        await adminApi.createActivity({
          destination_id: formDestinationId,
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          category: formCategory.trim() || undefined,
          duration_minutes: duration,
          price: price,
          currency: formCurrency.toUpperCase(),
          status: formStatus,
        });
        setSuccessMessage(`Activity "${formName}" created successfully.`);
      } else if (modalMode === "edit" && selectedActivity) {
        await adminApi.updateActivity(selectedActivity.id, {
          destination_id: formDestinationId,
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          category: formCategory.trim() || undefined,
          duration_minutes: duration,
          price: price,
          currency: formCurrency.toUpperCase(),
          status: formStatus,
        });
        setSuccessMessage(`Activity "${formName}" updated successfully.`);
      }
      setModalMode(null);
      fetchActivities();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setFormError((err as Error).message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (activity: Activity) => {
    if (!window.confirm(`Are you sure you want to delete activity "${activity.name}"?`)) {
      return;
    }
    try {
      await adminApi.deleteActivity(activity.id);
      setSuccessMessage(`Activity "${activity.name}" removed.`);
      fetchActivities();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to delete activity.");
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
            <Compass className="w-6 h-6 text-[#C5A880]" />
            <span>Activities & Experiences</span>
          </h1>
          <p className="text-xs text-[#5F6368] mt-1">
            Manage day activities, adventure treks, guided sightseeing tours, and pricing.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#24292F] hover:bg-[#3D4450] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Activity</span>
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
            placeholder="Search by activity name or description..."
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
                {d.name} ({d.country})
              </option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs font-medium text-[#202124] focus:outline-none focus:border-[#C5A880]"
          >
            <option value="all">All Categories</option>
            {ACTIVITY_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs font-medium text-[#202124] focus:outline-none focus:border-[#C5A880]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button
            onClick={fetchActivities}
            title="Refresh"
            className="p-2 rounded-xl bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#5F6368] hover:text-[#202124] transition-all shadow-2xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Activities Table */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-[#70757A]">
            <div className="w-8 h-8 border-4 border-[#24292F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold uppercase tracking-wider">Loading activities...</p>
          </div>
        ) : !activities || activities.items.length === 0 ? (
          <div className="p-12 text-center">
            <Compass className="w-12 h-12 text-[#D3D8DF] mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#202124] mb-1">No activities found</h3>
            <p className="text-xs text-[#70757A] max-w-sm mx-auto mb-4">
              {search || filterDestination !== "all" || filterCategory !== "all"
                ? "No activities matched your search criteria."
                : "Your catalog does not have any experiences registered yet."}
            </p>
            {canEdit && (
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs"
              >
                Add First Activity
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E4E5E7] bg-[#F7F7F5] text-[11px] font-bold uppercase tracking-wider text-[#5F6368]">
                  <th className="py-3.5 px-4">Activity</th>
                  <th className="py-3.5 px-4">Destination</th>
                  <th className="py-3.5 px-4">Duration & Pricing</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E5E7] text-xs">
                {activities.items.map((act) => (
                  <tr key={act.id} className="hover:bg-[#FDFBF7] transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-[#202124] text-sm">{act.name}</div>
                      {act.category && (
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F7F7F5] border border-[#E4E5E7] text-[#5F6368]">
                          {act.category}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-[#5F6368]">
                      <div className="font-medium text-[#202124] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#C5A880]" />
                        <span>{act.destination_name || "—"}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-[#5F6368]">
                      <div className="font-bold text-[#202124]">
                        {act.price !== null ? `₹${Number(act.price).toLocaleString("en-IN")}` : "Included in Package"}
                      </div>
                      {act.duration_minutes && (
                        <div className="text-[11px] text-[#70757A] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{act.duration_minutes} mins</span>
                        </div>
                      )}
                    </td>

                    {/* 1-Click Status Toggle */}
                    <td className="py-4 px-4 text-center">
                      {canEdit ? (
                        <button
                          onClick={() => handleToggleStatus(act)}
                          title={`Click to ${act.status === "active" ? "deactivate" : "activate"}`}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                            act.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                          }`}
                        >
                          {act.status === "active" ? "Active" : "Inactive"}
                        </button>
                      ) : (
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            act.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {act.status}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canEdit && (
                          <button
                            onClick={() => openEditModal(act)}
                            title="Edit Details"
                            className="p-1.5 rounded-lg border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] text-[#5F6368] hover:text-[#202124] transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleDelete(act)}
                            title="Delete Activity"
                            className="p-1.5 rounded-lg border border-[#D3D8DF] bg-white hover:bg-rose-50 text-[#70757A] hover:text-rose-600 transition-colors"
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
        {activities && activities.total_pages > 1 && (
          <div className="p-4 border-t border-[#E4E5E7] bg-[#F7F7F5] flex items-center justify-between text-xs text-[#5F6368]">
            <div>
              Showing Page {activities.page} of {activities.total_pages} ({activities.total} total)
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
                disabled={page >= activities.total_pages}
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
          <div className="bg-white border border-[#E4E5E7] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#E4E5E7] flex items-center justify-between bg-white">
              <h2 className="text-base font-bold text-[#202124]">
                {modalMode === "create" ? "Add Activity / Experience" : `Edit Activity: ${selectedActivity?.name}`}
              </h2>
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
                <SearchableSelect
                  label="Destination"
                  required={true}
                  options={destinationOptions}
                  loadOptions={loadDestinationOptions}
                  resolveOption={resolveDestinationOption}
                  value={formDestinationId}
                  onChange={(val) => setFormDestinationId(val || "")}
                  placeholder="Select Destination..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Activity Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Doddabetta Peak Sunset Trek"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                  />
                </div>

                <div>
                  <CreatableSelect
                    label="Category"
                    value={formCategory || null}
                    onChange={(val) => setFormCategory(val || "")}
                    options={catalogOptions.activity_categories}
                    placeholder="Select or enter custom category..."
                    allowNone={true}
                    noneLabel="None (Unset Category)"
                    onCustomCreate={(newCat) =>
                      addCustomCategory("activity_categories", newCat)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 120"
                    value={formDurationMinutes}
                    onChange={(e) => setFormDurationMinutes(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Base Price (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 1500"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value ? Number(e.target.value) : "")}
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
                    onChange={(e) => setFormCurrency(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  Description & Highlights
                </label>
                <textarea
                  rows={2}
                  placeholder="Itinerary highlights, inclusions, equipment provided..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                />
              </div>

              <div className="bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl p-4">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formStatus === "active"}
                    onChange={(e) => setFormStatus(e.target.checked ? "active" : "inactive")}
                    className="w-4 h-4 rounded text-[#24292F] focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#202124]">Active Experience</span>
                    <p className="text-[11px] text-[#70757A]">
                      Allows binding this activity to daily package itineraries.
                    </p>
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
                  {submitting ? "Saving..." : modalMode === "create" ? "Add Activity" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
