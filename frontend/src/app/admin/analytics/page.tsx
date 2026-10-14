"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  TrendingUp,
  CreditCard,
  Calendar,
  Users,
  Package as PackageIcon,
  Download,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import {
  adminAnalyticsApi,
  adminExportsApi,
  RevenueAnalyticsResponse,
  BookingAnalyticsResponse,
  CustomerAnalyticsResponse,
  PackagePerformanceResponse,
  DestinationPerformanceResponse,
} from "@/lib/api";
import { useAdmin } from "../AdminContext";

export default function AdminAnalyticsPage() {
  const { hasAnyRole } = useAdmin();
  const isAuthorized = hasAnyRole(["manager", "admin", "super_admin"]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"revenue" | "bookings" | "customers" | "performance">("revenue");

  // Date Range Filter
  const [period, setPeriod] = useState<string>("30d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  // Data states
  const [revenueData, setRevenueData] = useState<RevenueAnalyticsResponse | null>(null);
  const [bookingData, setBookingData] = useState<BookingAnalyticsResponse | null>(null);
  const [customerData, setCustomerData] = useState<CustomerAnalyticsResponse | null>(null);
  const [packageData, setPackageData] = useState<PackagePerformanceResponse | null>(null);
  const [destinationData, setDestinationData] = useState<DestinationPerformanceResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packageSortBy, setPackageSortBy] = useState<string>("revenue");

  const fetchTabAnalytics = useCallback(async () => {
    if (!isAuthorized) return;
    try {
      setLoading(true);
      setError(null);

      if (activeTab === "revenue") {
        const rev = await adminAnalyticsApi.getRevenue({
          period,
          custom_start: period === "custom" ? customStart : undefined,
          custom_end: period === "custom" ? customEnd : undefined,
        });
        setRevenueData(rev);
      } else if (activeTab === "bookings") {
        const bkg = await adminAnalyticsApi.getBookings({
          period,
          custom_start: period === "custom" ? customStart : undefined,
          custom_end: period === "custom" ? customEnd : undefined,
        });
        setBookingData(bkg);
      } else if (activeTab === "customers") {
        const cust = await adminAnalyticsApi.getCustomers();
        setCustomerData(cust);
      } else if (activeTab === "performance") {
        const [pkgs, dests] = await Promise.all([
          adminAnalyticsApi.getPackages({ sort_by: packageSortBy }),
          adminAnalyticsApi.getDestinations(),
        ]);
        setPackageData(pkgs);
        setDestinationData(dests);
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [isAuthorized, activeTab, period, customStart, customEnd, packageSortBy]);

  useEffect(() => {
    fetchTabAnalytics();
  }, [fetchTabAnalytics]);

  if (!isAuthorized) {
    return (
      <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl max-w-xl mx-auto my-12">
        <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-100">Manager Access Required</h2>
        <p className="text-sm text-slate-400 mt-2">
          Financial revenue analysis and business performance insights are restricted to managerial and administrative staff.
        </p>
      </div>
    );
  }

  const formatCurrency = (val: string | number) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            Financial & Operational Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative SQL aggregated revenue, booking conversion, cohort retention, and inventory performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fetchTabAnalytics()}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          {activeTab === "revenue" && (
            <a
              href={adminExportsApi.getRevenueUrl(period)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4 text-slate-400" />
              Export Revenue CSV
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-2">
        <div className="flex gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab("revenue")}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "revenue"
                ? "border-emerald-500 text-emerald-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Revenue & Settlements
          </button>

          <button
            onClick={() => setActiveTab("bookings")}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "bookings"
                ? "border-sky-500 text-sky-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Booking Trends & Funnel
          </button>

          <button
            onClick={() => setActiveTab("customers")}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "customers"
                ? "border-indigo-500 text-indigo-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            Customer Cohorts
          </button>

          <button
            onClick={() => setActiveTab("performance")}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "performance"
                ? "border-amber-500 text-amber-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <PackageIcon className="w-4 h-4" />
            Product Rankings
          </button>
        </div>

        {/* Date Period Selector (for revenue and bookings tabs) */}
        {(activeTab === "revenue" || activeTab === "bookings") && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Period:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>

            {period === "custom" && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Tab Panels */}
      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-900 border border-slate-800 rounded-xl" />
            ))}
          </div>
          <div className="h-80 bg-slate-900 border border-slate-800 rounded-xl" />
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-rose-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => fetchTabAnalytics()}
            className="px-4 py-2 bg-slate-800 text-slate-200 text-sm rounded-lg"
          >
            Retry Analytics Calculation
          </button>
        </div>
      ) : activeTab === "revenue" && revenueData ? (
        <div className="space-y-6">
          {/* Revenue KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-400">Total Gross Revenue</span>
              <div className="text-2xl font-bold text-slate-100">{formatCurrency(revenueData.total_revenue)}</div>
              <p className="text-xs text-slate-500">All captured payments in period</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase text-emerald-400">Net Authoritative Income</span>
              <div className="text-2xl font-bold text-emerald-400">{formatCurrency(revenueData.net_revenue)}</div>
              <p className="text-xs text-slate-500">Gross revenue minus refunds</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase text-amber-400">Pending Payments</span>
              <div className="text-2xl font-bold text-amber-400">{formatCurrency(revenueData.pending_payments)}</div>
              <p className="text-xs text-slate-500">Awaiting customer collection</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase text-rose-400">Total Refunds</span>
              <div className="text-2xl font-bold text-rose-400">{formatCurrency(revenueData.refunded_amount)}</div>
              <p className="text-xs text-slate-500">Processed refund volume</p>
            </div>
          </div>

          {/* Time Series Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Daily Revenue Timeline</h3>
                <p className="text-xs text-slate-400">
                  Business dates from {revenueData.start_date} to {revenueData.end_date}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-center">Bookings Count</th>
                    <th className="py-3 px-4 text-right">Paid Revenue</th>
                    <th className="py-3 px-4 text-right">Refunded</th>
                    <th className="py-3 px-4 text-right">Net Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {revenueData.time_series.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-slate-200">{item.date}</td>
                      <td className="py-3 px-4 text-center font-mono text-xs">{item.bookings_count}</td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-400">
                        {formatCurrency(item.paid_revenue)}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-400">
                        {formatCurrency(item.refunded_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-100">
                        {formatCurrency(item.net_revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === "bookings" && bookingData ? (
        <div className="space-y-6">
          {/* Booking KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-400">Total Bookings</span>
              <div className="text-2xl font-bold text-slate-100">{bookingData.total_bookings}</div>
              <p className="text-xs text-slate-500">Reservations created in period</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase text-emerald-400">Confirmed Bookings</span>
              <div className="text-2xl font-bold text-emerald-400">{bookingData.confirmed_count}</div>
              <p className="text-xs text-slate-500">Fully secured departures</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase text-sky-400">Conversion Rate</span>
              <div className="text-2xl font-bold text-sky-400">{bookingData.conversion_rate}%</div>
              <p className="text-xs text-slate-500">Confirmed / Total bookings</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase text-amber-400">Average Booking Value</span>
              <div className="text-2xl font-bold text-amber-400">{formatCurrency(bookingData.average_booking_value)}</div>
              <p className="text-xs text-slate-500">Avg {bookingData.average_travellers_per_booking} travellers/booking</p>
            </div>
          </div>

          {/* Status Breakdown & Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-100">Booking Status Breakdown</h3>
              <div className="space-y-3">
                {bookingData.by_status.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="capitalize text-slate-300 font-medium">{item.status}</span>
                    <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-200">
                      {item.count} ({bookingData.total_bookings > 0 ? Math.round((item.count / bookingData.total_bookings) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-slate-100">Daily Booking Trends</h3>
              </div>
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4 text-center">Bookings Created</th>
                      <th className="py-2.5 px-4 text-right">Gross Booking Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
                    {bookingData.time_series.map((ts, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-4 font-mono">{ts.date}</td>
                        <td className="py-2.5 px-4 text-center font-mono font-medium">{ts.count}</td>
                        <td className="py-2.5 px-4 text-right font-medium text-slate-100">
                          {formatCurrency(ts.gross_value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "customers" && customerData ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-400">Total Customers</span>
              <div className="text-2xl font-bold text-slate-100">{customerData.total_customers}</div>
              <p className="text-xs text-slate-500">Registered traveller accounts</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase text-emerald-400">Returning Customers</span>
              <div className="text-2xl font-bold text-emerald-400">{customerData.returning_customers}</div>
              <p className="text-xs text-slate-500">
                {customerData.total_customers > 0
                  ? Math.round((customerData.returning_customers / customerData.total_customers) * 100)
                  : 0}% repeat booking rate
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase text-sky-400">Upcoming Trips</span>
              <div className="text-2xl font-bold text-sky-400">{customerData.customers_with_upcoming_trips}</div>
              <p className="text-xs text-slate-500">Travellers with active bookings</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase text-purple-400">Completed Journeys</span>
              <div className="text-2xl font-bold text-purple-400">{customerData.customers_with_completed_trips}</div>
              <p className="text-xs text-slate-500">Travellers who returned home</p>
            </div>
          </div>
        </div>
      ) : activeTab === "performance" && packageData && destinationData ? (
        <div className="space-y-8">
          {/* Package Rankings */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Package Performance Rankings</h3>
                <p className="text-xs text-slate-400">Experience-level demand, bookings, and revenue volume</p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Sort by:</span>
                <select
                  value={packageSortBy}
                  onChange={(e) => setPackageSortBy(e.target.value)}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="revenue">Confirmed Revenue</option>
                  <option value="bookings">Bookings Count</option>
                  <option value="travellers">Travellers Count</option>
                  <option value="conversion">Conversion Rate</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Package</th>
                    <th className="py-3 px-4">Destination</th>
                    <th className="py-3 px-4 text-center">Bookings</th>
                    <th className="py-3 px-4 text-center">Travellers</th>
                    <th className="py-3 px-4 text-center">Conversion</th>
                    <th className="py-3 px-4 text-right">Confirmed Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
                  {packageData.items.map((pkg) => (
                    <tr key={pkg.package_id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-medium text-slate-100">{pkg.package_name}</td>
                      <td className="py-3 px-4 text-slate-400">{pkg.destination_name}</td>
                      <td className="py-3 px-4 text-center font-mono">{pkg.bookings_count}</td>
                      <td className="py-3 px-4 text-center font-mono">{pkg.travellers_count}</td>
                      <td className="py-3 px-4 text-center font-mono text-sky-400">{pkg.conversion_rate}%</td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                        {formatCurrency(pkg.confirmed_revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Destination Rankings */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100">Destination Performance</h3>
              <p className="text-xs text-slate-400">Regional demand distribution and collective financial yield</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Destination</th>
                    <th className="py-3 px-4 text-center">Packages Offered</th>
                    <th className="py-3 px-4 text-center">Total Bookings</th>
                    <th className="py-3 px-4 text-center">Total Travellers</th>
                    <th className="py-3 px-4 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
                  {destinationData.items.map((dest) => (
                    <tr key={dest.destination_id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-medium text-slate-100">{dest.destination_name}</td>
                      <td className="py-3 px-4 text-center font-mono">{dest.packages_count}</td>
                      <td className="py-3 px-4 text-center font-mono">{dest.bookings_count}</td>
                      <td className="py-3 px-4 text-center font-mono">{dest.travellers_count}</td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                        {formatCurrency(dest.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
