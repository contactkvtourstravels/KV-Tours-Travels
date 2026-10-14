"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Package as PackageIcon,
  Building2,
  Compass,
  Calendar,
  Clock,
  CheckCircle2,
  MessageSquare,
  TrendingUp,
  ArrowUpRight,
  RefreshCw,
  Download,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  adminApi,
  adminExportsApi,
  AdminDashboardMetrics,
} from "@/lib/api";
import { useAdmin } from "./AdminContext";

export default function AdminDashboardPage() {
  const { user, hasAnyRole } = useAdmin();
  const isManagerOrAdmin = hasAnyRole(["manager", "admin", "super_admin"]);

  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setError(null);
      const data = await adminApi.getMetrics();
      setMetrics(data);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load admin dashboard metrics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMetrics();
  };

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-64 bg-stone-200 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-28 bg-white border border-[#E4E5E7] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-8 text-center bg-white border border-[#E4E5E7] rounded-2xl max-w-xl mx-auto my-12 shadow-xs">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-[#202124] mb-2">Unable to Load Operations Dashboard</h3>
        <p className="text-rose-600 text-sm font-medium mb-6">{error || "Could not retrieve live metrics."}</p>
        <button
          onClick={handleRefresh}
          className="px-5 py-2.5 bg-[#24292F] hover:bg-[#3D4450] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs"
        >
          Try Again
        </button>
      </div>
    );
  }

  const catalogStats = [
    {
      title: "Total Destinations",
      value: metrics.total_destinations,
      subtitle: `${metrics.published_destinations} published to public website`,
      icon: MapPin,
      badge: `${metrics.published_destinations} live`,
      href: "/admin/destinations",
      accent: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    {
      title: "Tour Packages",
      value: metrics.total_packages,
      subtitle: `${metrics.published_packages} published itineraries`,
      icon: PackageIcon,
      badge: `${metrics.published_packages} live`,
      href: "/admin/packages",
      accent: "text-amber-700 bg-amber-50 border-amber-200",
    },
    {
      title: "Active Hotels",
      value: metrics.active_hotels ?? 0,
      subtitle: "Verified hotel accommodations",
      icon: Building2,
      badge: "Partner properties",
      href: "/admin/hotels",
      accent: "text-sky-700 bg-sky-50 border-sky-200",
    },
    {
      title: "Active Activities",
      value: metrics.active_activities ?? 0,
      subtitle: "Excursions & adventure experiences",
      icon: Compass,
      badge: "Active",
      href: "/admin/activities",
      accent: "text-purple-700 bg-purple-50 border-purple-200",
    },
  ];

  const operationsStats = [
    {
      title: "Upcoming Departures",
      value: metrics.upcoming_departures ?? 0,
      subtitle: "Scheduled group tours & fixed dates",
      icon: Calendar,
      badge: "Open for booking",
      href: "/admin/departures",
      accent: "text-indigo-700 bg-indigo-50 border-indigo-200",
    },
    {
      title: "Pending Bookings",
      value: metrics.pending_bookings,
      subtitle: "Awaiting customer settlement",
      icon: Clock,
      badge: metrics.pending_bookings > 0 ? "Requires action" : "Clear",
      href: "/admin/bookings",
      accent: "text-amber-700 bg-amber-50 border-amber-200",
    },
    {
      title: "Confirmed Bookings",
      value: metrics.confirmed_bookings,
      subtitle: "Active operational reservations",
      icon: CheckCircle2,
      badge: `${metrics.total_bookings} total`,
      href: "/admin/bookings",
      accent: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    {
      title: "Customer Inquiries",
      value: metrics.unread_inquiries,
      subtitle: `${metrics.total_inquiries} lifetime leads received`,
      icon: MessageSquare,
      badge: metrics.unread_inquiries > 0 ? "New leads" : "Up to date",
      href: "/admin/inquiries",
      accent: "text-rose-700 bg-rose-50 border-rose-200",
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A880]">
              KV Tours & Travels
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs text-[#70757A]">
              Coimbatore Operations Console
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#202124] tracking-tight">
            Welcome back, {user?.first_name || "Admin"}
          </h1>
          <p className="text-sm text-[#5F6368] mt-1 max-w-xl">
            Real-time synchronization status for catalog publications, departures inventory, traveller bookings, and customer inquiries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#D3D8DF] bg-white hover:bg-[#F3F4F4] text-[#24292F] text-xs font-bold uppercase tracking-wider transition-all shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#5F6368] ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh Live Data</span>
          </button>

          {isManagerOrAdmin && (
            <a
              href={adminExportsApi.getBookingsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Bookings</span>
            </a>
          )}
        </div>
      </div>

      {/* Revenue Summary Banner (If Manager/Admin) */}
      {isManagerOrAdmin && (
        <div className="bg-gradient-to-r from-[#202124] to-[#2D3139] text-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#C5A880]">
              <TrendingUp className="w-4 h-4" />
              Financial Reconciliation
            </div>
            <div className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
              {formatCurrency(metrics.total_revenue)}
            </div>
            <p className="text-xs text-stone-300">
              Total verified revenue captured from confirmed traveller bookings.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/payments"
              className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-all border border-white/20"
            >
              Reconciliation
            </Link>
            <Link
              href="/admin/analytics"
              className="px-5 py-2.5 rounded-full bg-[#C5A880] hover:bg-[#D4B991] text-[#202124] text-xs font-bold uppercase tracking-wider transition-all shadow-xs"
            >
              View Analytics
            </Link>
          </div>
        </div>
      )}

      {/* Section 1: Travel Catalog Synchronization */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#202124]">Travel Catalog Status</h2>
            <p className="text-xs text-[#70757A]">Publicly published inventory and master destination records</p>
          </div>
          <Link
            href="/admin/destinations"
            className="text-xs font-bold text-[#24292F] hover:text-[#C5A880] flex items-center gap-1 transition-colors"
          >
            Manage Catalog <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {catalogStats.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <Link
                key={idx}
                href={kpi.href}
                className="bg-white border border-[#E4E5E7] hover:border-[#C5A880] rounded-2xl p-5 transition-all shadow-2xs hover:shadow-xs group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl border ${kpi.accent}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F7F7F5] border border-[#E4E5E7] text-[#5F6368]">
                    {kpi.badge}
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-bold font-serif text-[#202124] tracking-tight mb-0.5">
                    {kpi.value}
                  </div>
                  <div className="text-xs font-bold text-[#3D4450]">{kpi.title}</div>
                  <div className="text-[11px] text-[#70757A] mt-1">{kpi.subtitle}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Section 2: Operations & Bookings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#202124]">Operations & Guest Bookings</h2>
            <p className="text-xs text-[#70757A]">Traveller reservations, departures capacity, and leads</p>
          </div>
          <Link
            href="/admin/bookings"
            className="text-xs font-bold text-[#24292F] hover:text-[#C5A880] flex items-center gap-1 transition-colors"
          >
            View Bookings <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {operationsStats.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <Link
                key={idx}
                href={kpi.href}
                className="bg-white border border-[#E4E5E7] hover:border-[#C5A880] rounded-2xl p-5 transition-all shadow-2xs hover:shadow-xs group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl border ${kpi.accent}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F7F7F5] border border-[#E4E5E7] text-[#5F6368]">
                    {kpi.badge}
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-bold font-serif text-[#202124] tracking-tight mb-0.5">
                    {kpi.value}
                  </div>
                  <div className="text-xs font-bold text-[#3D4450]">{kpi.title}</div>
                  <div className="text-[11px] text-[#70757A] mt-1">{kpi.subtitle}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Action Navigation Cards */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs">
        <h2 className="text-sm font-bold text-[#202124] uppercase tracking-wider mb-4">
          Quick Catalog Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <Link
            href="/admin/destinations"
            className="p-3.5 rounded-xl border border-[#E4E5E7] hover:border-[#C5A880] hover:bg-[#FDFBF7] text-center transition-all group"
          >
            <MapPin className="w-5 h-5 mx-auto mb-2 text-[#5F6368] group-hover:text-[#C5A880] transition-colors" />
            <div className="text-xs font-bold text-[#202124]">Destinations</div>
            <div className="text-[10px] text-[#70757A]">Add & publish</div>
          </Link>
          <Link
            href="/admin/packages"
            className="p-3.5 rounded-xl border border-[#E4E5E7] hover:border-[#C5A880] hover:bg-[#FDFBF7] text-center transition-all group"
          >
            <PackageIcon className="w-5 h-5 mx-auto mb-2 text-[#5F6368] group-hover:text-[#C5A880] transition-colors" />
            <div className="text-xs font-bold text-[#202124]">Packages</div>
            <div className="text-[10px] text-[#70757A]">Itineraries</div>
          </Link>
          <Link
            href="/admin/hotels"
            className="p-3.5 rounded-xl border border-[#E4E5E7] hover:border-[#C5A880] hover:bg-[#FDFBF7] text-center transition-all group"
          >
            <Building2 className="w-5 h-5 mx-auto mb-2 text-[#5F6368] group-hover:text-[#C5A880] transition-colors" />
            <div className="text-xs font-bold text-[#202124]">Hotels</div>
            <div className="text-[10px] text-[#70757A]">Accommodations</div>
          </Link>
          <Link
            href="/admin/activities"
            className="p-3.5 rounded-xl border border-[#E4E5E7] hover:border-[#C5A880] hover:bg-[#FDFBF7] text-center transition-all group"
          >
            <Compass className="w-5 h-5 mx-auto mb-2 text-[#5F6368] group-hover:text-[#C5A880] transition-colors" />
            <div className="text-xs font-bold text-[#202124]">Activities</div>
            <div className="text-[10px] text-[#70757A]">Experiences</div>
          </Link>
          <Link
            href="/admin/departures"
            className="p-3.5 rounded-xl border border-[#E4E5E7] hover:border-[#C5A880] hover:bg-[#FDFBF7] text-center transition-all group"
          >
            <Calendar className="w-5 h-5 mx-auto mb-2 text-[#5F6368] group-hover:text-[#C5A880] transition-colors" />
            <div className="text-xs font-bold text-[#202124]">Departures</div>
            <div className="text-[10px] text-[#70757A]">Group dates</div>
          </Link>
          <Link
            href="/admin/settings"
            className="p-3.5 rounded-xl border border-[#E4E5E7] hover:border-[#C5A880] hover:bg-[#FDFBF7] text-center transition-all group"
          >
            <ExternalLink className="w-5 h-5 mx-auto mb-2 text-[#5F6368] group-hover:text-[#C5A880] transition-colors" />
            <div className="text-xs font-bold text-[#202124]">Settings</div>
            <div className="text-[10px] text-[#70757A]">Agency profile</div>
          </Link>
        </div>
      </div>

      {/* Tables: Recent Bookings & Recent Inquiries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Bookings */}
        <div className="bg-white border border-[#E4E5E7] rounded-2xl overflow-hidden shadow-2xs">
          <div className="p-5 border-b border-[#E4E5E7] flex items-center justify-between bg-white">
            <div>
              <h2 className="text-sm font-bold text-[#202124]">Recent Guest Bookings</h2>
              <p className="text-xs text-[#70757A]">Authoritative database bookings</p>
            </div>
            <Link
              href="/admin/bookings"
              className="text-xs font-bold text-[#24292F] hover:text-[#C5A880] flex items-center gap-1 transition-colors"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[#E4E5E7]">
            {metrics.recent_bookings.length === 0 ? (
              <div className="p-8 text-center text-[#70757A] text-xs">
                No bookings recorded yet in the database.
              </div>
            ) : (
              metrics.recent_bookings.map((booking) => (
                <div key={booking.id} className="p-4 hover:bg-[#F7F7F5] transition-colors flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#202124]">{booking.booking_reference}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                          booking.status === "confirmed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : booking.status === "pending"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                    <div className="text-xs text-[#5F6368]">
                      {booking.customer_name} • {booking.package_name}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-[#202124]">
                      ₹{Number(booking.total_amount).toLocaleString("en-IN")}
                    </div>
                    <div className="text-[11px] text-[#70757A]">
                      {new Date(booking.created_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Inquiries */}
        <div className="bg-white border border-[#E4E5E7] rounded-2xl overflow-hidden shadow-2xs">
          <div className="p-5 border-b border-[#E4E5E7] flex items-center justify-between bg-white">
            <div>
              <h2 className="text-sm font-bold text-[#202124]">Recent Customer Inquiries</h2>
              <p className="text-xs text-[#70757A]">Website inquiries & consultation leads</p>
            </div>
            <Link
              href="/admin/inquiries"
              className="text-xs font-bold text-[#24292F] hover:text-[#C5A880] flex items-center gap-1 transition-colors"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[#E4E5E7]">
            {metrics.recent_inquiries.length === 0 ? (
              <div className="p-8 text-center text-[#70757A] text-xs">
                No customer inquiries received yet.
              </div>
            ) : (
              metrics.recent_inquiries.map((inquiry) => (
                <div key={inquiry.id} className="p-4 hover:bg-[#F7F7F5] transition-colors flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#202124]">{inquiry.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                          inquiry.status === "new"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-[#F7F7F5] text-[#5F6368] border-[#E4E5E7]"
                        }`}
                      >
                        {inquiry.status}
                      </span>
                    </div>
                    <div className="text-xs text-[#5F6368] truncate max-w-xs">
                      {inquiry.email} • {inquiry.message_preview}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] text-[#70757A]">
                      {new Date(inquiry.created_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
