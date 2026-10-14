"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Building2,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  Star,
  MapPin,
  ExternalLink,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { adminApi, Hotel, Destination, PaginatedResponse } from "@/lib/api";
import { useAdmin } from "../AdminContext";
import { SearchableSelect } from "@/components/admin/SearchableSelect";

export default function HotelsAdminPage() {
  const { hasAnyRole } = useAdmin();
  const canEdit = hasAnyRole(["manager", "admin", "super_admin"]);

  const [hotels, setHotels] = useState<PaginatedResponse<Hotel> | null>(null);
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
  const [filterActive, setFilterActive] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modal State
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formDestinationId, setFormDestinationId] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formStarRating, setFormStarRating] = useState<number | "">("");
  const [formWebsiteUrl, setFormWebsiteUrl] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formActive, setFormActive] = useState(true);
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

  const fetchHotels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const isAct = filterActive === "all" ? undefined : filterActive === "true";
      const destId = filterDestination === "all" ? undefined : filterDestination;
      const data = await adminApi.listHotels({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        destination_id: destId,
        is_active: isAct,
      });
      setHotels(data);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load hotels directory.");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterDestination, filterActive]);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  // 1-Click Status Toggle
  const handleToggleActive = async (hotel: Hotel) => {
    try {
      const updated = await adminApi.toggleHotelActive(hotel.id, hotel.is_active);
      setSuccessMessage(
        `Hotel "${updated.name}" is now ${updated.is_active ? "ACTIVE" : "DEACTIVATED"}.`
      );
      fetchHotels();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to toggle hotel status.");
    }
  };

  // Create / Edit Modal
  const openCreateModal = () => {
    setSelectedHotel(null);
    setFormDestinationId(destinations[0]?.id || "");
    setFormName("");
    setFormDescription("");
    setFormAddress("");
    setFormStarRating("");
    setFormWebsiteUrl("");
    setFormPhone("");
    setFormEmail("");
    setFormActive(true);
    setFormError(null);
    setModalMode("create");
  };

  const openEditModal = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    setFormDestinationId(hotel.destination_id);
    setFormName(hotel.name);
    setFormDescription(hotel.description || "");
    setFormAddress(hotel.address || "");
    setFormStarRating(hotel.star_rating ?? "");
    setFormWebsiteUrl(hotel.website_url || "");
    setFormPhone(hotel.contact_phone || "");
    setFormEmail(hotel.contact_email || "");
    setFormActive(hotel.is_active);
    setFormError(null);
    setModalMode("edit");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDestinationId) {
      setFormError("Please select a destination for this hotel property.");
      return;
    }
    if (!formName.trim()) {
      setFormError("Hotel property name is required.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const rating = formStarRating !== "" ? Number(formStarRating) : undefined;

      if (modalMode === "create") {
        await adminApi.createHotel({
          destination_id: formDestinationId,
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          address: formAddress.trim() || undefined,
          star_rating: rating,
          website_url: formWebsiteUrl.trim() || undefined,
          contact_phone: formPhone.trim() || undefined,
          contact_email: formEmail.trim() || undefined,
          is_active: formActive,
        });
        setSuccessMessage(`Hotel "${formName}" created successfully.`);
      } else if (modalMode === "edit" && selectedHotel) {
        await adminApi.updateHotel(selectedHotel.id, {
          destination_id: formDestinationId,
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          address: formAddress.trim() || undefined,
          star_rating: rating,
          website_url: formWebsiteUrl.trim() || undefined,
          contact_phone: formPhone.trim() || undefined,
          contact_email: formEmail.trim() || undefined,
          is_active: formActive,
        });
        setSuccessMessage(`Hotel "${formName}" updated successfully.`);
      }
      setModalMode(null);
      fetchHotels();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setFormError((err as Error).message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (hotel: Hotel) => {
    if (!window.confirm(`Are you sure you want to deactivate "${hotel.name}"?`)) {
      return;
    }
    try {
      await adminApi.deleteHotel(hotel.id);
      setSuccessMessage(`Hotel "${hotel.name}" deactivated.`);
      fetchHotels();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to deactivate hotel.");
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
            <Building2 className="w-6 h-6 text-[#C5A880]" />
            <span>Hotels & Accommodations</span>
          </h1>
          <p className="text-xs text-[#5F6368] mt-1">
            Manage verified hotel partners, destination linkings, star ratings, and contact details.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#24292F] hover:bg-[#3D4450] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Hotel</span>
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
            placeholder="Search by hotel name, address, or phone..."
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
            onClick={fetchHotels}
            title="Refresh"
            className="p-2 rounded-xl bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#5F6368] hover:text-[#202124] transition-all shadow-2xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hotels Table */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-[#70757A]">
            <div className="w-8 h-8 border-4 border-[#24292F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold uppercase tracking-wider">Loading hotels directory...</p>
          </div>
        ) : !hotels || hotels.items.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-[#D3D8DF] mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#202124] mb-1">No hotels found</h3>
            <p className="text-xs text-[#70757A] max-w-sm mx-auto mb-4">
              {search || filterDestination !== "all" || filterActive !== "all"
                ? "No hotels matched your active search query or filter."
                : "Your catalog does not have any partner hotels registered yet."}
            </p>
            {canEdit && (
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs"
              >
                Add First Hotel
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E4E5E7] bg-[#F7F7F5] text-[11px] font-bold uppercase tracking-wider text-[#5F6368]">
                  <th className="py-3.5 px-4">Hotel Property</th>
                  <th className="py-3.5 px-4">Destination</th>
                  <th className="py-3.5 px-4">Rating & Address</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E5E7] text-xs">
                {hotels.items.map((hotel) => (
                  <tr key={hotel.id} className="hover:bg-[#FDFBF7] transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-[#202124] text-sm flex items-center gap-1.5">
                        <span>{hotel.name}</span>
                        {hotel.star_rating && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-[#8C6D37] font-semibold bg-[#FDFBF7] border border-[#C5A880]/30 px-1.5 py-0.5 rounded-full">
                            <Star className="w-3 h-3 fill-[#C5A880] text-[#C5A880]" />
                            {hotel.star_rating}★
                          </span>
                        )}
                      </div>
                      {hotel.website_url && (
                        <a
                          href={hotel.website_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-[#70757A] hover:text-[#202124] flex items-center gap-1 mt-0.5"
                        >
                          <span>Visit Website</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </td>

                    <td className="py-4 px-4 text-[#5F6368]">
                      <div className="font-medium text-[#202124] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#C5A880]" />
                        <span>{hotel.destination_name || "—"}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-[#5F6368] max-w-xs truncate">
                      <span>{hotel.address || "Address not provided"}</span>
                    </td>

                    <td className="py-4 px-4 text-[#5F6368]">
                      {hotel.contact_phone && (
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-[#70757A]" />
                          <span>{hotel.contact_phone}</span>
                        </div>
                      )}
                      {hotel.contact_email && (
                        <div className="flex items-center gap-1 text-[11px]">
                          <Mail className="w-3 h-3 text-[#70757A]" />
                          <span>{hotel.contact_email}</span>
                        </div>
                      )}
                      {!hotel.contact_phone && !hotel.contact_email && <span>—</span>}
                    </td>

                    {/* 1-Click Status Toggle */}
                    <td className="py-4 px-4 text-center">
                      {canEdit ? (
                        <button
                          onClick={() => handleToggleActive(hotel)}
                          title={`Click to ${hotel.is_active ? "deactivate" : "activate"}`}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                            hotel.is_active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                          }`}
                        >
                          {hotel.is_active ? "Active" : "Deactivated"}
                        </button>
                      ) : (
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            hotel.is_active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {hotel.is_active ? "Active" : "Deactivated"}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canEdit && (
                          <button
                            onClick={() => openEditModal(hotel)}
                            title="Edit Details"
                            className="p-1.5 rounded-lg border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] text-[#5F6368] hover:text-[#202124] transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleDelete(hotel)}
                            title="Deactivate Hotel"
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
        {hotels && hotels.total_pages > 1 && (
          <div className="p-4 border-t border-[#E4E5E7] bg-[#F7F7F5] flex items-center justify-between text-xs text-[#5F6368]">
            <div>
              Showing Page {hotels.page} of {hotels.total_pages} ({hotels.total} total)
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
                disabled={page >= hotels.total_pages}
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
                {modalMode === "create" ? "Register Partner Hotel" : `Edit Hotel: ${selectedHotel?.name}`}
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
                    Hotel Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sterling Ooty Fern Hill"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Star Rating (1 - 5)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    placeholder="e.g. 4 or 5"
                    value={formStarRating}
                    onChange={(e) => setFormStarRating(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fern Hill Road, Nilgiris, Ooty, Tamil Nadu"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98422 12345"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    placeholder="reservations@hotel.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formWebsiteUrl}
                  onChange={(e) => setFormWebsiteUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  Description / Amenities
                </label>
                <textarea
                  rows={2}
                  placeholder="Hotel amenities, room categories, dining highlights..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                />
              </div>

              <div className="bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl p-4">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="w-4 h-4 rounded text-[#24292F] focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#202124]">Active Partner Property</span>
                    <p className="text-[11px] text-[#70757A]">
                      Allows staff to link this hotel to package itineraries.
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
                  {submitting ? "Saving..." : modalMode === "create" ? "Register Hotel" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
