"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2,
  Clock,
  Compass,
  Info,
  MapPin,
  RefreshCw,
  Search,
  Tag,
  UserCheck,
  Users,
  X,
  AlertCircle,
  Eye,
  CreditCard,
  RotateCcw,
} from "lucide-react";
import {
  adminBookingApi,
  adminApi,
  adminPaymentApi,
  BookingDetailResponse,
  BookingListResponse,
  PackageItem,
} from "@/lib/api";
import { useAdmin } from "../AdminContext";
import { SearchableSelect } from "@/components/admin/SearchableSelect";

export default function BookingsAdminPage() {
  const { hasAnyRole } = useAdmin();
  const canManageStatus = hasAnyRole(["manager", "admin", "super_admin"]);

  const [bookings, setBookings] = useState<BookingListResponse | null>(null);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>("all");
  const [filterPackageId, setFilterPackageId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Selected Booking Drawer/Modal
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [detailBooking, setDetailBooking] = useState<BookingDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Status Change State
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusActionTarget, setStatusActionTarget] = useState<string>("");
  const [statusReason, setStatusReason] = useState<string>("");

  // Payment Operations (Hold Expiration & Refunds)
  const [expiringHolds, setExpiringHolds] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundPaymentId, setRefundPaymentId] = useState<string | null>(null);
  const [refundMaxAmount, setRefundMaxAmount] = useState<number>(0);
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundReason, setRefundReason] = useState<string>("");
  const [refundProcessing, setRefundProcessing] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const fetchPackagesList = async () => {
    try {
      const res = await adminApi.getPackages({ page: 1, page_size: 100 });
      setPackages(res.items);
    } catch {
      // Ignore background package catalog error
    }
  };

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const statusParam = filterStatus === "all" ? undefined : filterStatus;
      const paymentParam = filterPaymentStatus === "all" ? undefined : filterPaymentStatus;
      const packageParam = filterPackageId === "all" ? undefined : filterPackageId;

      const data = await adminBookingApi.listBookings({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        status: statusParam,
        payment_status: paymentParam,
        package_id: packageParam,
      });
      setBookings(data);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterPaymentStatus, filterPackageId]);

  useEffect(() => {
    fetchPackagesList();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Load single booking detail
  const openDetailDrawer = async (id: string) => {
    setSelectedBookingId(id);
    setDetailLoading(true);
    setDetailError(null);
    setStatusActionTarget("");
    setStatusReason("");
    try {
      const data = await adminBookingApi.getBooking(id);
      setDetailBooking(data);
    } catch (err: unknown) {
      setDetailError((err as Error).message || "Failed to load booking details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailDrawer = () => {
    setSelectedBookingId(null);
    setDetailBooking(null);
    setStatusActionTarget("");
    setStatusReason("");
  };

  const handleUpdateStatus = async () => {
    if (!detailBooking || !statusActionTarget) return;

    setStatusUpdating(true);
    setDetailError(null);
    try {
      const updated = await adminBookingApi.updateStatus(
        detailBooking.id,
        statusActionTarget,
        statusReason.trim() || undefined
      );
      setDetailBooking(updated);
      setSuccessMessage(`Booking ${updated.booking_reference} status changed to ${updated.status}.`);
      setStatusActionTarget("");
      setStatusReason("");
      fetchBookings();
    } catch (err: unknown) {
      setDetailError((err as Error).message || "Failed to update booking status.");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleExpireHolds = async () => {
    try {
      setExpiringHolds(true);
      const res = await adminPaymentApi.expireHolds();
      setSuccessMessage(
        `Hold sweep completed: ${res.expired_count} expired booking(s) cancelled, ${res.released_seats} departure seat(s) returned to inventory.`
      );
      fetchBookings();
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to scan and expire abandoned holds.");
    } finally {
      setExpiringHolds(false);
    }
  };

  const openRefundModal = (paymentId: string, maxAmount: number) => {
    setRefundPaymentId(paymentId);
    setRefundMaxAmount(maxAmount);
    setRefundAmount(String(maxAmount));
    setRefundReason("");
    setRefundError(null);
    setRefundModalOpen(true);
  };

  const handleProcessRefund = async () => {
    if (!refundPaymentId) return;
    const amt = Number(refundAmount);
    if (isNaN(amt) || amt <= 0) {
      setRefundError("Please specify a valid positive refund amount.");
      return;
    }
    if (amt > refundMaxAmount) {
      setRefundError(`Refund amount cannot exceed ₹${refundMaxAmount.toLocaleString("en-IN")}.`);
      return;
    }

    try {
      setRefundProcessing(true);
      setRefundError(null);
      const res = await adminPaymentApi.processRefund(refundPaymentId, {
        amount: amt,
        reason: refundReason.trim() || undefined,
      });
      setSuccessMessage(
        `Refund of ₹${Number(res.amount).toLocaleString("en-IN")} confirmed via Razorpay (${res.provider_refund_id}).`
      );
      setRefundModalOpen(false);
      if (selectedBookingId) {
        openDetailDrawer(selectedBookingId);
      }
      fetchBookings();
    } catch (err: unknown) {
      setRefundError((err as Error).message || "Failed to process refund through Razorpay.");
    } finally {
      setRefundProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "payment_pending":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <Clock className="w-3 h-3 text-amber-400" /> Payment Pending
          </span>
        );
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Confirmed
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
            <X className="w-3 h-3 text-rose-400" /> Cancelled
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
            <CheckCircle2 className="w-3 h-3 text-blue-400" /> Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Paid
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Unpaid
          </span>
        );
      case "refunded":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30">
            Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Compass className="w-6 h-6 text-amber-400" />
            Bookings & Passenger Manifests
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Authoritative booking lifecycle management, capacity allocations, and traveller manifests for KV Tours & Travels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageStatus && (
            <button
              disabled={expiringHolds}
              onClick={handleExpireHolds}
              className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-xs font-medium text-amber-300 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Release seats for any bookings with expired 30-minute holds"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{expiringHolds ? "Releasing Holds..." : "Expire Holds"}</span>
            </button>
          )}

          <button
            onClick={fetchBookings}
            className="px-3.5 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg text-xs flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)}>
            <X className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search booking reference, customer email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-850 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-850 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="payment_pending">Payment Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>

          {/* Payment Status Filter */}
          <select
            value={filterPaymentStatus}
            onChange={(e) => {
              setFilterPaymentStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-850 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Payments</option>
            <option value="pending">Unpaid (Pending)</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Package Filter */}
          <div className="w-52">
            <SearchableSelect
              value={filterPackageId === "all" ? null : filterPackageId}
              onChange={(val) => {
                setFilterPackageId(val || "all");
                setPage(1);
              }}
              options={packages.map((pkg) => ({
                id: pkg.id,
                label: pkg.name,
                subLabel: pkg.destination_name || undefined,
              }))}
              loadOptions={async (query) => {
                const res = await adminApi.getPackages({
                  search: query.trim() || undefined,
                  page: 1,
                  page_size: 25,
                });
                return res.items.map((pkg) => ({
                  id: pkg.id,
                  label: pkg.name,
                  subLabel: pkg.destination_name || undefined,
                }));
              }}
              resolveOption={async (id) => {
                try {
                  const pkg = await adminApi.getPackage(id);
                  return {
                    id: pkg.id,
                    label: pkg.name,
                    subLabel: pkg.destination_name || undefined,
                  };
                } catch {
                  return null;
                }
              }}
              allowNone={true}
              noneLabel="All Packages"
              placeholder="All Packages"
            />
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Booking Ref</th>
                <th className="py-3 px-4">Package & Destination</th>
                <th className="py-3 px-4">Departure Date</th>
                <th className="py-3 px-4 text-center">Pax</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
                    Loading authoritative bookings...
                  </td>
                </tr>
              ) : !bookings || bookings.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500">
                    <Compass className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    No bookings found matching current filters.
                  </td>
                </tr>
              ) : (
                bookings.items.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-amber-400 tracking-wider">
                        {b.booking_reference}
                      </div>
                      {b.hold_expires_at && b.status === "payment_pending" && (
                        <span className="text-[10px] text-amber-500/80 flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" /> Hold active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{b.package_title}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {b.destination_name}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {new Date(b.departure_date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold text-[11px]">
                        <Users className="w-3 h-3 text-slate-400" />
                        {b.number_of_travellers}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-amber-300">
                      ₹{Number(b.total).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4">{getPaymentBadge(b.payment_status)}</td>
                    <td className="py-3 px-4">{getStatusBadge(b.status)}</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(b.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openDetailDrawer(b.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="View Full Booking & Manifest"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {bookings && bookings.total > 0 && (
          <div className="p-4 bg-slate-850/50 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing {(page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, bookings.total)} of {bookings.total} bookings
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition-colors"
              >
                Previous
              </button>
              <span className="px-2 font-mono text-white">
                Page {page} of {Math.ceil(bookings.total / pageSize)}
              </span>
              <button
                disabled={page >= Math.ceil(bookings.total / pageSize)}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Booking Detail Modal / Slide-out */}
      {selectedBookingId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold font-mono text-amber-400">
                    {detailBooking?.booking_reference || "Loading..."}
                  </h2>
                  {detailBooking && getStatusBadge(detailBooking.status)}
                  {detailBooking && getPaymentBadge(detailBooking.payment_status)}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Booked on{" "}
                  {detailBooking
                    ? new Date(detailBooking.created_at).toLocaleString("en-IN")
                    : ""}
                </p>
              </div>

              <button
                onClick={closeDetailDrawer}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                Loading booking details & manifest...
              </div>
            ) : detailError ? (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                {detailError}
              </div>
            ) : detailBooking ? (
              <div className="space-y-6 text-xs text-slate-300">
                {/* Notice for Payment Pending */}
                {detailBooking.status === "payment_pending" && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold">Payment Pending Phase</strong>
                      <span className="text-[11px] text-amber-300/80">
                        This booking has reserved {detailBooking.number_of_travellers} seats. Seat holds are frozen until payment is settled in Phase 9 or manually confirmed by administrative staff.
                        {detailBooking.hold_expires_at && (
                          <span className="block mt-0.5 font-mono text-[10px]">
                            Hold Expiry: {new Date(detailBooking.hold_expires_at).toLocaleString("en-IN")}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Status Transition Control for Admin */}
                {canManageStatus && (
                  <div className="p-4 bg-slate-850 border border-slate-800 rounded-xl space-y-3">
                    <span className="font-semibold text-white uppercase tracking-wider text-[11px] block">
                      Administrative Lifecycle Transition
                    </span>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <select
                        value={statusActionTarget}
                        onChange={(e) => setStatusActionTarget(e.target.value)}
                        className="w-full sm:w-auto px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="">-- Change Lifecycle Status --</option>
                        {detailBooking.status === "pending" && (
                          <>
                            <option value="payment_pending">Advance to Payment Pending</option>
                            <option value="cancelled">Cancel Booking</option>
                          </>
                        )}
                        {detailBooking.status === "payment_pending" && (
                          <>
                            <option value="confirmed">Confirm Booking (Admin Override)</option>
                            <option value="cancelled">Cancel Booking (Release Seats)</option>
                          </>
                        )}
                        {detailBooking.status === "confirmed" && (
                          <>
                            <option value="completed">Mark Journey Completed</option>
                            <option value="cancelled">Cancel Booking (Release Seats)</option>
                          </>
                        )}
                      </select>

                      {statusActionTarget && (
                        <input
                          type="text"
                          placeholder="Reason (optional)..."
                          value={statusReason}
                          onChange={(e) => setStatusReason(e.target.value)}
                          className="flex-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        />
                      )}

                      {statusActionTarget && (
                        <button
                          disabled={statusUpdating}
                          onClick={handleUpdateStatus}
                          className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-xs transition-colors shrink-0 disabled:opacity-50"
                        >
                          {statusUpdating ? "Updating..." : "Apply Transition"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Grid: Customer & Journey details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-850/60 border border-slate-800 rounded-xl space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-amber-400" /> Customer Information
                    </span>
                    <div className="text-white font-semibold text-sm">
                      {detailBooking.customer_name}
                    </div>
                    <div className="text-slate-400">{detailBooking.customer_email}</div>
                    {detailBooking.customer_notes && (
                      <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-300">
                        <span className="text-slate-500 block">Customer Notes:</span>
                        {detailBooking.customer_notes}
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-850/60 border border-slate-800 rounded-xl space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-amber-400" /> Journey Information
                    </span>
                    <div className="text-white font-semibold text-sm">
                      {detailBooking.package_title}
                    </div>
                    <div className="text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {detailBooking.destination_name}
                    </div>
                    <div className="text-[11px] text-slate-300 font-mono mt-1">
                      Departure: {new Date(detailBooking.departure_date).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {detailBooking.return_date && (
                        <span> → {new Date(detailBooking.return_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Traveller Manifest */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-bold tracking-wider text-white flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-amber-400" /> Passenger Manifest ({detailBooking.travellers.length})
                    </span>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-850 text-slate-400">
                        <tr>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">Gender / DOB</th>
                          <th className="py-2.5 px-3">Contact</th>
                          <th className="py-2.5 px-3">Passport (Intl)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {detailBooking.travellers.map((traveller) => (
                          <tr key={traveller.id}>
                            <td className="py-2.5 px-3">
                              {traveller.is_primary ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Lead
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] text-slate-400 bg-slate-800">
                                  Pax
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-white">
                              {traveller.first_name} {traveller.last_name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">
                              {traveller.gender || "-"}
                              {traveller.date_of_birth && ` • ${traveller.date_of_birth}`}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">
                              {traveller.contact_phone || traveller.contact_email || "-"}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                              {traveller.passport_number ? (
                                <span>
                                  {traveller.passport_number} ({traveller.passport_issuing_country || "IND"})
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Selected Add-ons */}
                {detailBooking.add_ons && detailBooking.add_ons.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-xs uppercase font-bold tracking-wider text-white flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-amber-400" /> Selected Add-ons & Upgrades
                    </span>
                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-850 text-slate-400">
                          <tr>
                            <th className="py-2 px-3">Add-on Item</th>
                            <th className="py-2 px-3 text-center">Qty</th>
                            <th className="py-2 px-3 text-right">Unit Price</th>
                            <th className="py-2 px-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {detailBooking.add_ons.map((addon) => (
                            <tr key={addon.id}>
                              <td className="py-2 px-3 font-medium text-white">
                                {addon.name_snapshot}
                              </td>
                              <td className="py-2 px-3 text-center font-mono">{addon.quantity}</td>
                              <td className="py-2 px-3 text-right font-mono text-slate-400">
                                ₹{Number(addon.unit_price).toLocaleString("en-IN")}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-semibold text-amber-300">
                                ₹{Number(addon.total_price).toLocaleString("en-IN")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Authoritative Financial Breakdown Snapshot */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">
                    Authoritative Financial Breakdown
                  </span>
                  <div className="flex justify-between text-slate-400">
                    <span>Base Package Subtotal</span>
                    <span className="font-mono text-white">
                      ₹{Number(detailBooking.subtotal).toLocaleString("en-IN")}
                    </span>
                  </div>
                  {Number(detailBooking.discount) > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Promo / Coupon Discount</span>
                      <span className="font-mono">
                        -₹{Number(detailBooking.discount).toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                  {Number(detailBooking.tax) > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>Taxes & Government Surcharges</span>
                      <span className="font-mono text-white">
                        +₹{Number(detailBooking.tax).toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold text-amber-400">
                    <span>Final Snapshot Total ({detailBooking.currency})</span>
                    <span className="font-mono text-base">
                      ₹{Number(detailBooking.total).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Gateway Payment Records */}
                <div className="space-y-3">
                  <span className="text-xs uppercase font-bold tracking-wider text-white flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-amber-400" /> Payment & Gateway Records
                  </span>

                  {detailBooking.payments && detailBooking.payments.length > 0 ? (
                    <div className="space-y-3">
                      {detailBooking.payments.map((pmt) => {
                        const totalPaid = Number(pmt.amount);
                        const totalRefunded = pmt.refunds.reduce(
                          (acc, r) => acc + (r.status === "processed" ? Number(r.amount) : 0),
                          0
                        );
                        const refundableRemaining = Math.max(0, totalPaid - totalRefunded);
                        const canRefund =
                          canManageStatus &&
                          pmt.status === "paid" &&
                          refundableRemaining > 0;

                        return (
                          <div
                            key={pmt.id}
                            className="p-4 bg-slate-850/80 border border-slate-800 rounded-xl space-y-3 text-xs"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold uppercase text-amber-400">
                                  {pmt.provider}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    pmt.status === "paid"
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : pmt.status === "failed"
                                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  }`}
                                >
                                  {pmt.status}
                                </span>
                              </div>

                              {canRefund && (
                                <button
                                  onClick={() => openRefundModal(pmt.id, refundableRemaining)}
                                  className="px-3 py-1 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Issue Refund</span>
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300">
                              <div>
                                <span className="text-slate-500 block text-[10px] uppercase">Order ID</span>
                                <span className="font-mono text-white text-[11px] truncate block">
                                  {pmt.provider_order_id || "-"}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px] uppercase">Payment ID</span>
                                <span className="font-mono text-white text-[11px] truncate block">
                                  {pmt.provider_payment_id || "-"}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px] uppercase">Amount</span>
                                <span className="font-mono text-amber-300 font-bold">
                                  ₹{totalPaid.toLocaleString("en-IN")} {pmt.currency}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px] uppercase">Captured At</span>
                                <span className="text-slate-300 text-[11px]">
                                  {pmt.captured_at
                                    ? new Date(pmt.captured_at).toLocaleDateString("en-IN")
                                    : "-"}
                                </span>
                              </div>
                            </div>

                            {pmt.failure_message && (
                              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/20 text-rose-300 text-[11px]">
                                <span className="font-semibold">Failure ({pmt.failure_code || "ERROR"}):</span>{" "}
                                {pmt.failure_message}
                              </div>
                            )}

                            {/* Refunds if any */}
                            {pmt.refunds && pmt.refunds.length > 0 && (
                              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                  Refund History
                                </span>
                                {pmt.refunds.map((ref) => (
                                  <div
                                    key={ref.id}
                                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px]"
                                  >
                                    <div>
                                      <span className="font-mono text-slate-300 mr-2">
                                        {ref.provider_refund_id}
                                      </span>
                                      {ref.reason && (
                                        <span className="text-slate-500 text-[10px]">({ref.reason})</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-rose-400">
                                        -₹{Number(ref.amount).toLocaleString("en-IN")}
                                      </span>
                                      <span className="text-[10px] uppercase bg-rose-500/10 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/20">
                                        {ref.status}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-850/40 border border-slate-800 rounded-xl text-slate-400 text-xs">
                      No online payment transactions registered yet for this reservation. Current status:{" "}
                      <span className="text-amber-400 font-semibold">{detailBooking.payment_status}</span>.
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Modal Footer */}
            <div className="border-t border-slate-800 pt-4 flex justify-end">
              <button
                onClick={closeDetailDrawer}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
              >
                Close Manifest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Administrative Refund Confirmation Modal */}
      {refundModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-400" />
                Authorized Razorpay Refund
              </h3>
              <button
                onClick={() => setRefundModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {refundError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg text-xs">
                {refundError}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Refundable Balance</label>
                <div className="font-mono font-bold text-amber-400 text-sm">
                  ₹{refundMaxAmount.toLocaleString("en-IN")} INR
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Refund Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={refundMaxAmount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-850 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Supports full or partial refund up to the captured total.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Reason for Refund
                </label>
                <input
                  type="text"
                  placeholder="e.g. Customer cancelled departure / schedule change"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-850 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRefundModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={refundProcessing}
                onClick={handleProcessRefund}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {refundProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing via Gateway...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Confirm Razorpay Refund</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
