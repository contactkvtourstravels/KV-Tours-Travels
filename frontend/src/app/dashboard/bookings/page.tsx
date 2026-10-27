"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Calendar,
  Search,
  Filter,
  ArrowRight,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  Compass,
} from "lucide-react";
import { customerBookingApi, BookingItem, BookingListResponse } from "@/lib/api";

const STATUS_FILTERS = [
  { label: "All Bookings", value: "" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Pending", value: "pending" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Completed", value: "completed" },
];

export default function CustomerBookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(6);
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res: BookingListResponse = await customerBookingApi.getMyBookings({
        page,
        per_page: perPage,
        status: status || undefined,
        search: activeSearch || undefined,
      });
      setBookings(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }, [page, perPage, status, activeSearch]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchInput.trim());
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
  };

  const totalPages = Math.ceil(total / perPage) || 1;

  const getStatusBadge = (bStatus: string) => {
    switch (bStatus.toLowerCase()) {
      case "confirmed":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            Confirmed
          </span>
        );
      case "pending":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
            Payment Pending
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
            Cancelled
          </span>
        );
      case "completed":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
            Completed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F3F4F4] text-[#70757A] border border-[#E4E5E7] capitalize">
            {bStatus}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E4E5E7] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#202124] tracking-tight">
            My Travel Bookings
          </h1>
          <p className="text-xs sm:text-sm text-[#70757A] mt-1">
            Review your itinerary reservations, payment receipts, vouchers, and cancellation requests.
          </p>
        </div>

        <Link
          href="/packages"
          className="inline-flex items-center gap-2 px-5 h-10 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-[#24292F]/15 self-start sm:self-auto"
        >
          <Compass className="w-4 h-4" />
          <span>Book New Journey</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-[#E4E5E7] shadow-sm">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#70757A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by package name or booking reference..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-xs text-[#202124] placeholder-[#70757A]/60 focus:outline-none focus:border-[#24292F] transition-all"
          />
        </form>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-[#70757A] mr-1 hidden sm:inline" />
          {STATUS_FILTERS.map((f) => {
            const isSelected = status === f.value;
            return (
              <button
                key={f.value}
                onClick={() => handleStatusChange(f.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-[#24292F] text-white shadow-sm"
                    : "bg-white text-[#70757A] hover:text-[#202124] hover:bg-[#F3F4F4] border border-[#E4E5E7]"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-[#70757A]">
          <div className="w-8 h-8 border-2 border-[#E4E5E7] border-t-[#24292F] rounded-full animate-spin mb-4" />
          <p className="text-xs uppercase tracking-widest text-[#70757A]">
            Loading your bookings...
          </p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-3xl bg-red-50 border border-red-200 text-red-700 text-xs shadow-sm">
          {error}
        </div>
      ) : bookings.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-[#E4E5E7] text-center space-y-4 shadow-sm">
          <Calendar className="w-10 h-10 text-[#70757A]/60 mx-auto" />
          <h3 className="text-base font-serif font-bold text-[#202124]">No Bookings Found</h3>
          <p className="text-xs text-[#70757A] max-w-sm mx-auto">
            {activeSearch || status
              ? "No reservations match your current search criteria or status filter."
              : "You haven't made any bookings yet. Begin by exploring our curated destination packages."}
          </p>
          {(activeSearch || status) && (
            <button
              onClick={() => {
                setStatus("");
                setSearchInput("");
                setActiveSearch("");
              }}
              className="px-5 py-2 rounded-full bg-[#F3F4F4] hover:bg-[#E4E5E7] text-[#202124] text-xs font-semibold transition-all"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="p-6 rounded-3xl bg-white border border-[#E4E5E7] hover:border-[#24292F]/40 transition-all flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 shadow-sm hover:shadow-md"
              >
                {/* Left: Booking & Package Overview */}
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm font-bold text-[#24292F] tracking-wider">
                      {b.booking_reference}
                    </span>
                    {getStatusBadge(b.status)}
                    <span className="text-xs text-[#70757A]">
                      Booked on {new Date(b.created_at).toLocaleDateString("en-IN")}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-serif font-bold text-[#202124]">
                    {b.package_title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#70757A]">
                    <span className="flex items-center gap-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-[#24292F]" />
                      {b.destination_name}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-[#24292F]" />
                      Departure: {b.departure_date}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <Users className="w-3.5 h-3.5 text-[#24292F]" />
                      {b.number_of_travellers} Traveller
                      {b.number_of_travellers > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Right: Financials & Action Link */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between border-t lg:border-t-0 pt-4 lg:pt-0 border-[#E4E5E7] gap-4">
                  <div className="text-left lg:text-right">
                    <div className="text-xs text-[#70757A] uppercase tracking-wider font-medium">
                      Total Amount
                    </div>
                    <div className="text-lg font-bold font-serif text-[#202124]">
                      ₹{Number(b.total).toLocaleString("en-IN")}
                    </div>
                    <div className="text-[11px] text-[#70757A]">
                      Payment: <span className="capitalize text-[#202124] font-medium">{b.payment_status}</span>
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/bookings/${b.booking_reference}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#F3F4F4] hover:bg-[#24292F] hover:text-white text-[#202124] border border-[#E4E5E7] hover:border-[#24292F] text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                  >
                    <span>View Itinerary & Receipt</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-[#E4E5E7]">
              <span className="text-xs text-[#70757A]">
                Showing page {page} of {totalPages} ({total} total bookings)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-full bg-white border border-[#E4E5E7] text-[#202124] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#F3F4F4] transition-all shadow-sm"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 rounded-full bg-white border border-[#E4E5E7] text-[#202124] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#F3F4F4] transition-all shadow-sm"
                  aria-label="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
