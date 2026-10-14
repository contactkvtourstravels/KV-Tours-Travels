"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  CalendarCheck,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  Users,
  Calendar,
  Package as PackageIcon,
  FileText,
  Printer,
  Download,
  CheckCircle2,
  AlertCircle,
  Filter,
} from "lucide-react";
import {
  adminApi,
  adminOperationsApi,
  adminNotesApi,
  adminExportsApi,
  DepartureManifestResponse,
  PackageDeparture,
  PackageItem,
  PaginatedResponse,
} from "@/lib/api";
import { useAdmin } from "../AdminContext";
import { SearchableSelect } from "@/components/admin/SearchableSelect";

export default function DeparturesAdminPage() {
  const { hasAnyRole } = useAdmin();
  const canEdit = hasAnyRole(["manager", "admin", "super_admin"]);

  const [departures, setDepartures] = useState<PaginatedResponse<PackageDeparture> | null>(null);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const packageOptions = useMemo(
    () =>
      packages.map((p) => ({
        id: p.id,
        label: p.name,
        subLabel: p.destination_name || undefined,
        badge: p.is_published ? undefined : "Draft",
      })),
    [packages]
  );

  // Filters & Pagination
  const [filterPackage, setFilterPackage] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Manifest Modal State
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const [manifestData, setManifestData] = useState<DepartureManifestResponse | null>(null);
  const [manifestLoading, setManifestLoading] = useState(false);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [manifestNote, setManifestNote] = useState("");
  const [savingManifestNote, setSavingManifestNote] = useState(false);

  // Modal State
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedDeparture, setSelectedDeparture] = useState<PackageDeparture | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formPackageId, setFormPackageId] = useState("");
  const [formDepartureDate, setFormDepartureDate] = useState("");
  const [formReturnDate, setFormReturnDate] = useState("");
  const [formBookingCutoffDate, setFormBookingCutoffDate] = useState("");
  const [formTotalCapacity, setFormTotalCapacity] = useState<number | "">(20);
  const [formReservedCapacity, setFormReservedCapacity] = useState<number | "">(0);
  const [formSpecialPrice, setFormSpecialPrice] = useState<number | "">("");
  const [formCurrency, setFormCurrency] = useState("INR");
  const [formStatus, setFormStatus] = useState<"draft" | "open" | "closed" | "cancelled" | "sold_out">("open");
  const [formError, setFormError] = useState<string | null>(null);

  const fetchPackages = useCallback(async () => {
    try {
      const res = await adminApi.getPackages({ page: 1, page_size: 100 });
      setPackages(res.items);
      if (res.items.length > 0 && !formPackageId) {
        setFormPackageId(res.items[0].id);
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load package choices.");
    }
  }, [formPackageId]);

  const loadPackageOptions = useCallback(async (query: string, signal?: AbortSignal) => {
    try {
      const res = await adminApi.getPackages({
        search: query.trim() || undefined,
        page: 1,
        page_size: 25,
      });
      return res.items.map((p) => ({
        id: p.id,
        label: p.name,
        subLabel: `${p.destination_name || "Unknown"} • ${p.duration_days}D/${p.duration_nights}N`,
        badge: p.is_published ? undefined : "Draft",
      }));
    } catch {
      return [];
    }
  }, []);

  const resolvePackageOption = useCallback(async (id: string) => {
    try {
      const p = await adminApi.getPackage(id);
      return {
        id: p.id,
        label: p.name,
        subLabel: `${p.destination_name || "Unknown"} • ${p.duration_days}D/${p.duration_nights}N`,
        badge: p.is_published ? undefined : "Draft",
      };
    } catch {
      return null;
    }
  }, []);

  const fetchDepartures = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const pkgId = filterPackage === "all" ? undefined : filterPackage;
      const stat = filterStatus === "all" ? undefined : filterStatus;
      const data = await adminApi.listDepartures({
        page,
        page_size: pageSize,
        package_id: pkgId,
        status: stat,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setDepartures(data);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load departures.");
    } finally {
      setLoading(false);
    }
  }, [page, filterPackage, filterStatus, fromDate, toDate]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  useEffect(() => {
    fetchDepartures();
  }, [fetchDepartures]);

  // Manifest modal
  const openManifestModal = async (departureId: string) => {
    setManifestModalOpen(true);
    setManifestLoading(true);
    setManifestError(null);
    try {
      const data = await adminOperationsApi.getManifest(departureId);
      setManifestData(data);
    } catch (err: unknown) {
      setManifestError((err as Error).message || "Failed to load manifest.");
    } finally {
      setManifestLoading(false);
    }
  };

  const handleAddManifestNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manifestData || !manifestNote.trim()) return;
    try {
      setSavingManifestNote(true);
      const note = await adminNotesApi.create("departure", manifestData.departure_id, manifestNote.trim());
      setManifestData((prev) => (prev ? { ...prev, internal_notes: [note, ...prev.internal_notes] } : prev));
      setManifestNote("");
    } catch (err: unknown) {
      setManifestError((err as Error).message || "Failed to save internal note.");
    } finally {
      setSavingManifestNote(false);
    }
  };

  // Create / Edit modal
  const openCreateModal = () => {
    setSelectedDeparture(null);
    setFormPackageId(packages[0]?.id || "");
    const today = new Date();
    today.setDate(today.getDate() + 14);
    setFormDepartureDate(today.toISOString().split("T")[0]);
    today.setDate(today.getDate() + 4);
    setFormReturnDate(today.toISOString().split("T")[0]);
    setFormBookingCutoffDate("");
    setFormTotalCapacity(20);
    setFormReservedCapacity(0);
    setFormSpecialPrice("");
    setFormCurrency("INR");
    setFormStatus("open");
    setFormError(null);
    setModalMode("create");
  };

  const openEditModal = (dep: PackageDeparture) => {
    setSelectedDeparture(dep);
    setFormPackageId(dep.package_id);
    setFormDepartureDate(dep.departure_date);
    setFormReturnDate(dep.return_date || "");
    setFormBookingCutoffDate(dep.booking_cutoff_date || "");
    setFormTotalCapacity(dep.total_capacity);
    setFormReservedCapacity(dep.reserved_capacity);
    setFormSpecialPrice(dep.special_price !== null ? Number(dep.special_price) : "");
    setFormCurrency(dep.currency || "INR");
    setFormStatus(dep.status as "draft" | "open" | "closed" | "cancelled" | "sold_out");
    setFormError(null);
    setModalMode("edit");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPackageId) {
      setFormError("Please select a package.");
      return;
    }
    if (!formDepartureDate) {
      setFormError("Departure date is required.");
      return;
    }
    const capNum = Number(formTotalCapacity);
    if (formTotalCapacity === "" || isNaN(capNum) || capNum < 1 || capNum > 100) {
      setFormError("Total capacity must be between 1 and 100 travellers.");
      return;
    }

    if (modalMode === "edit" && selectedDeparture) {
      const bookedSeats = Math.max(
        0,
        selectedDeparture.total_capacity - selectedDeparture.available_capacity,
      );
      if (capNum < bookedSeats) {
        setFormError(
          `Cannot reduce departure capacity to ${capNum}. There are already ${bookedSeats} confirmed travellers booked on this departure.`,
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      setFormError(null);
      const splPrice = formSpecialPrice !== "" ? Number(formSpecialPrice) : undefined;
      const cutoff = formBookingCutoffDate.trim() || undefined;

      if (modalMode === "create") {
        await adminApi.createDeparture({
          package_id: formPackageId,
          departure_date: formDepartureDate,
          return_date: formReturnDate.trim() || undefined,
          booking_cutoff_date: cutoff,
          total_capacity: capNum,
          special_price: splPrice,
          currency: formCurrency.toUpperCase(),
          status: formStatus,
        });
        setSuccessMessage("New departure scheduled successfully.");
      } else if (modalMode === "edit" && selectedDeparture) {
        await adminApi.updateDeparture(selectedDeparture.id, {
          departure_date: formDepartureDate,
          return_date: formReturnDate.trim() || undefined,
          booking_cutoff_date: cutoff,
          total_capacity: capNum,
          reserved_capacity: Number(formReservedCapacity),
          special_price: splPrice,
          currency: formCurrency.toUpperCase(),
          status: formStatus,
        });
        setSuccessMessage("Departure schedule updated successfully.");
      }
      setModalMode(null);
      fetchDepartures();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setFormError((err as Error).message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelDeparture = async (dep: PackageDeparture) => {
    if (!window.confirm(`Are you sure you want to cancel departure on ${dep.departure_date}?`)) {
      return;
    }
    try {
      await adminApi.cancelOrDeleteDeparture(dep.id);
      setSuccessMessage("Departure cancelled.");
      fetchDepartures();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to cancel departure.");
    }
  };

  const statusBadges: Record<string, string> = {
    open: "bg-emerald-50 text-emerald-700 border-emerald-200",
    closed: "bg-stone-50 text-[#5F6368] border-[#D3D8DF]",
    sold_out: "bg-purple-50 text-purple-700 border-purple-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
    draft: "bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E4E5E7] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A880]">
              Travel Catalog & Operations
            </span>
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-[#202124] flex items-center gap-2.5">
            <CalendarCheck className="w-6 h-6 text-[#C5A880]" />
            <span>Group Trips & Departures</span>
          </h1>
          <p className="text-xs text-[#5F6368] mt-1">
            Manage scheduled group departures, seat capacities, special seasonal rates, and passenger manifests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={adminExportsApi.getDeparturesUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] text-[#24292F] text-xs font-bold uppercase tracking-wider transition-all shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#5F6368]" />
            <span>Export Manifests CSV</span>
          </a>

          {canEdit && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#24292F] hover:bg-[#3D4450] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Departure</span>
            </button>
          )}
        </div>
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

      {/* Filters Bar */}
      <div className="p-4 bg-white border border-[#E4E5E7] rounded-2xl flex flex-col md:flex-row items-center gap-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="flex items-center gap-1.5 text-xs text-[#70757A] shrink-0 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={filterPackage}
            onChange={(e) => {
              setFilterPackage(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs font-medium text-[#202124] focus:outline-none focus:border-[#C5A880] max-w-xs truncate"
          >
            <option value="all">All Packages</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
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
            <option value="open">Open</option>
            <option value="sold_out">Sold Out</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
            <option value="draft">Draft</option>
          </select>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#70757A]">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2.5 py-1.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#70757A]">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2.5 py-1.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124]"
            />
          </div>

          <button
            onClick={fetchDepartures}
            title="Refresh"
            className="p-2 rounded-xl bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#5F6368] hover:text-[#202124] transition-all shadow-2xs ml-auto"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Departures Table */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-[#70757A]">
            <div className="w-8 h-8 border-4 border-[#24292F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold uppercase tracking-wider">Loading departures manifest...</p>
          </div>
        ) : !departures || departures.items.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarCheck className="w-12 h-12 text-[#D3D8DF] mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#202124] mb-1">No group departures found</h3>
            <p className="text-xs text-[#70757A] max-w-sm mx-auto mb-4">
              {filterPackage !== "all" || filterStatus !== "all" || fromDate || toDate
                ? "No departures match your filter parameters."
                : "Schedule your first group departure date to enable instant seat bookings."}
            </p>
            {canEdit && (
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs"
              >
                Schedule Departure
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E4E5E7] bg-[#F7F7F5] text-[11px] font-bold uppercase tracking-wider text-[#5F6368]">
                  <th className="py-3.5 px-4">Departure Date</th>
                  <th className="py-3.5 px-4">Tour Package</th>
                  <th className="py-3.5 px-4">Capacity & Bookings</th>
                  <th className="py-3.5 px-4">Rate</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E5E7] text-xs">
                {departures.items.map((dep) => {
                  const availableSeats = dep.total_capacity - dep.reserved_capacity;
                  const pctFilled = Math.min(
                    100,
                    Math.round((dep.reserved_capacity / dep.total_capacity) * 100)
                  );

                  return (
                    <tr key={dep.id} className="hover:bg-[#FDFBF7] transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-bold text-[#202124] text-sm flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#C5A880]" />
                          <span>{new Date(dep.departure_date).toLocaleDateString("en-IN", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}</span>
                        </div>
                        {dep.return_date && (
                          <div className="text-[11px] text-[#70757A]">
                            Return: {dep.return_date}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 text-[#5F6368]">
                        <div className="font-semibold text-[#202124] flex items-center gap-1.5">
                          <PackageIcon className="w-3 h-3 text-[#70757A]" />
                          <span>{dep.package_name || "Package"}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-[#5F6368]">
                        <div className="flex items-center justify-between text-[11px] font-medium mb-1">
                          <span className="text-[#202124] font-bold">
                            {dep.reserved_capacity} / {dep.total_capacity} booked
                          </span>
                          <span className="text-[#70757A]">({availableSeats} left)</span>
                        </div>
                        <div className="w-36 h-1.5 bg-[#E4E5E7] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pctFilled >= 100
                                ? "bg-rose-500"
                                : pctFilled >= 75
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${pctFilled}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        {dep.special_price !== null ? (
                          <div className="font-bold text-[#202124]">
                            ₹{Number(dep.special_price).toLocaleString("en-IN")}
                            <span className="text-[10px] text-amber-700 font-normal ml-1">Special</span>
                          </div>
                        ) : (
                          <span className="text-[#70757A] text-[11px]">Standard rate</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            statusBadges[dep.status] || "bg-[#F7F7F5] text-[#5F6368] border-[#E4E5E7]"
                          }`}
                        >
                          {dep.status.replace("_", " ")}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openManifestModal(dep.id)}
                            title="View Passenger Manifest"
                            className="px-2.5 py-1.5 rounded-lg border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] text-[#24292F] text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 shadow-2xs"
                          >
                            <Users className="w-3 h-3 text-[#5F6368]" />
                            <span>Manifest</span>
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(dep)}
                              title="Edit Capacity & Pricing"
                              className="p-1.5 rounded-lg border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] text-[#5F6368] hover:text-[#202124] transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => handleCancelDeparture(dep)}
                              title="Cancel Departure"
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
        {departures && departures.total_pages > 1 && (
          <div className="p-4 border-t border-[#E4E5E7] bg-[#F7F7F5] flex items-center justify-between text-xs text-[#5F6368]">
            <div>
              Showing Page {departures.page} of {departures.total_pages} ({departures.total} total)
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
                disabled={page >= departures.total_pages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#D3D8DF] hover:bg-stone-50 disabled:opacity-40 font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Passenger Manifest Modal */}
      {manifestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#E4E5E7] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#E4E5E7] flex items-center justify-between bg-white">
              <div>
                <h2 className="text-base font-bold text-[#202124] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#C5A880]" />
                  <span>Departure Manifest & Passenger List</span>
                </h2>
                {manifestData && (
                  <p className="text-xs text-[#70757A]">
                    {manifestData.package_name} • {manifestData.departure_date}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-1.5 rounded-lg border border-[#D3D8DF] bg-white text-[#5F6368] hover:text-[#202124] transition-colors"
                  title="Print Manifest"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button onClick={() => setManifestModalOpen(false)} className="p-1 text-[#70757A] hover:text-[#202124]">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {manifestLoading ? (
                <div className="p-12 text-center text-xs text-[#70757A]">Loading passenger manifest...</div>
              ) : manifestError ? (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                  {manifestError}
                </div>
              ) : manifestData ? (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl text-center">
                      <div className="text-[10px] uppercase font-bold text-[#70757A]">Total Capacity</div>
                      <div className="text-lg font-bold text-[#202124]">{manifestData.total_capacity}</div>
                    </div>
                    <div className="p-3 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl text-center">
                      <div className="text-[10px] uppercase font-bold text-[#70757A]">Reserved Capacity</div>
                      <div className="text-lg font-bold text-emerald-700">{manifestData.reserved_capacity}</div>
                    </div>
                    <div className="p-3 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl text-center">
                      <div className="text-[10px] uppercase font-bold text-[#70757A]">Available Seats</div>
                      <div className="text-lg font-bold text-[#202124]">{manifestData.available_capacity}</div>
                    </div>
                    <div className="p-3 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl text-center">
                      <div className="text-[10px] uppercase font-bold text-[#70757A]">Manifest State</div>
                      <div className="text-xs font-bold uppercase text-[#C5A880] mt-1">{manifestData.status}</div>
                    </div>
                  </div>

                  {/* Passengers Table */}
                  <div className="border border-[#E4E5E7] rounded-xl overflow-hidden">
                    <div className="p-3 bg-[#F7F7F5] border-b border-[#E4E5E7] text-xs font-bold text-[#202124] uppercase tracking-wider">
                      Confirmed Bookings ({manifestData.bookings.length})
                    </div>
                    {manifestData.bookings.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#70757A]">
                        No guest bookings confirmed for this departure date yet.
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#E4E5E7] bg-white text-[10px] font-bold uppercase text-[#70757A]">
                            <th className="py-2.5 px-3">Traveller Name</th>
                            <th className="py-2.5 px-3">Booking Ref</th>
                            <th className="py-2.5 px-3">Contact</th>
                            <th className="py-2.5 px-3">Nationality</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E4E5E7]">
                          {manifestData.bookings.flatMap((booking) =>
                            booking.travellers.map((traveller) => (
                              <tr key={traveller.id} className="hover:bg-[#FDFBF7]">
                                <td className="py-2.5 px-3 font-semibold text-[#202124]">
                                  {traveller.first_name} {traveller.last_name} {traveller.is_primary ? "(Lead)" : ""}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-[11px] text-[#70757A]">
                                  {booking.booking_reference}
                                </td>
                                <td className="py-2.5 px-3 text-[#5F6368]">
                                  {booking.lead_traveller_phone || booking.lead_traveller_email || "—"}
                                </td>
                                <td className="py-2.5 px-3 text-[#70757A]">{traveller.nationality || "India"}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Internal Operational Notes */}
                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#202124]">
                      Internal Tour Operator Notes
                    </div>
                    <form onSubmit={handleAddManifestNote} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add note for driver, tour guide, or operations staff..."
                        value={manifestNote}
                        onChange={(e) => setManifestNote(e.target.value)}
                        className="flex-1 px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                      />
                      <button
                        type="submit"
                        disabled={savingManifestNote || !manifestNote.trim()}
                        className="px-4 py-2 bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider rounded-xl disabled:opacity-40"
                      >
                        {savingManifestNote ? "Saving..." : "Add Note"}
                      </button>
                    </form>

                    <div className="space-y-2">
                      {manifestData.internal_notes.map((n) => (
                        <div key={n.id} className="p-3 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl text-xs space-y-1">
                          <div className="text-[#202124]">{n.note}</div>
                          <div className="text-[10px] text-[#70757A] flex items-center justify-between">
                            <span>By: {n.author_email || "Staff"}</span>
                            <span>{new Date(n.created_at).toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Schedule / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#E4E5E7] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#E4E5E7] flex items-center justify-between bg-white">
              <h2 className="text-base font-bold text-[#202124]">
                {modalMode === "create" ? "Schedule Departure Date" : "Edit Departure Schedule"}
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
                  label="Tour Package"
                  required={true}
                  disabled={modalMode === "edit"}
                  options={packageOptions}
                  loadOptions={loadPackageOptions}
                  resolveOption={resolvePackageOption}
                  value={formPackageId}
                  onChange={(val) => setFormPackageId(val || "")}
                  placeholder="Select Tour Package..."
                  allowNone={false}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Departure Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDepartureDate}
                    onChange={(e) => setFormDepartureDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Return Date
                  </label>
                  <input
                    type="date"
                    value={formReturnDate}
                    onChange={(e) => setFormReturnDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Total Seat Capacity (1–100) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={formTotalCapacity}
                    onChange={(e) => setFormTotalCapacity(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                  />
                  <span className="text-[10px] text-[#70757A] mt-0.5 block">
                    Configurable up to 100 travellers
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Booking Cutoff Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formBookingCutoffDate}
                    onChange={(e) => setFormBookingCutoffDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                  />
                  <span className="text-[10px] text-[#70757A] mt-0.5 block">
                    Bookings stop after this cutoff date
                  </span>
                </div>
              </div>

              {modalMode === "edit" && selectedDeparture && (
                <div className="p-3.5 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl text-xs space-y-1.5">
                  <div className="font-bold text-[#202124] flex items-center justify-between">
                    <span>Current Capacity Status</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 bg-white border border-[#D3D8DF] rounded-md text-emerald-700 font-bold">
                      {selectedDeparture.available_capacity} seats available
                    </span>
                  </div>
                  <div className="text-[11px] text-[#5F6368] flex items-center justify-between">
                    <span>
                      Seats Booked:{" "}
                      <strong>
                        {Math.max(
                          0,
                          selectedDeparture.total_capacity - selectedDeparture.available_capacity,
                        )}
                      </strong>
                    </span>
                    <span>Total Capacity: {selectedDeparture.total_capacity}</span>
                  </div>
                  <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1">
                    Safeguard: Total capacity cannot be reduced below already confirmed traveller bookings (
                    {Math.max(0, selectedDeparture.total_capacity - selectedDeparture.available_capacity)} seats).
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Special Rate (Optional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Leave blank for standard package rate"
                    value={formSpecialPrice}
                    onChange={(e) => setFormSpecialPrice(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "draft" | "open" | "closed" | "cancelled" | "sold_out")}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                  >
                    <option value="open">Open</option>
                    <option value="sold_out">Sold Out</option>
                    <option value="closed">Closed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
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
                  {submitting ? "Saving..." : modalMode === "create" ? "Schedule Departure" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
