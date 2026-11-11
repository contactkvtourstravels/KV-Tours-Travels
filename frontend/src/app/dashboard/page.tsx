"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Compass,
  MapPin,
  Users,
  Clock,
  ArrowRight,
  MessageCircle,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { customerApi, CustomerDashboardSummary } from "@/lib/api";
import { useCustomer } from "./CustomerContext";
import { useBranding } from "@/context/BrandingContext";

export default function CustomerDashboardPage() {
  const { user } = useCustomer();
  const { displayName, shortName } = useBranding();
  const [data, setData] = useState<CustomerDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);
        const res = await customerApi.getDashboard();
        setData(res);
      } catch (err: unknown) {
        setError((err as Error).message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-[#70757A]">
        <div className="w-8 h-8 border-2 border-[#E4E5E7] border-t-[#24292F] rounded-full animate-spin mb-4" />
        <p className="text-xs uppercase tracking-widest text-[#70757A]">
          Retrieving your personalized itinerary...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-12 max-w-2xl mx-auto">
        <div className="p-6 rounded-3xl bg-red-50 border border-red-200 text-red-700 shadow-sm">
          <p className="font-semibold text-sm">Failed to load dashboard</p>
          <p className="text-xs mt-1 text-red-600">{error || "Unknown error"}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    total_bookings,
    active_bookings_count,
    completed_trips_count,
    upcoming_trips,
    recent_bookings,
    whatsapp_concierge,
    saved_travellers_count,
  } = data;
  const nextTrip = upcoming_trips && upcoming_trips.length > 0 ? upcoming_trips[0] : null;

  return (
    <div className="space-y-8">
      {/* Welcome & Overview Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E4E5E7] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D3D8DF] bg-white text-[#24292F] text-xs uppercase tracking-widest font-semibold mb-2 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>KV Tours & Travels Elite Member</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#202124] tracking-tight">
            Welcome back, {user?.first_name || data.user_name || "Traveller"}
          </h1>
          <p className="text-xs sm:text-sm text-[#70757A] mt-1">
            Track upcoming departures, verified payments, and manage your travel journey.
          </p>
        </div>

        {/* Quick Concierge Callout */}
        {whatsapp_concierge?.click_to_chat_url && (
          <a
            href={whatsapp_concierge.click_to_chat_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] text-[#0D7A53] hover:bg-[#DCF3EA] text-xs font-semibold uppercase tracking-wider transition-all shadow-sm self-start md:self-auto"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{whatsapp_concierge.label || "WhatsApp Concierge"}</span>
          </a>
        )}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-6 rounded-3xl bg-white border border-[#E4E5E7] shadow-sm flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider text-[#70757A] font-semibold">
            Active Bookings
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl sm:text-3xl font-bold font-serif text-[#202124]">
              {active_bookings_count}
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-[#E4E5E7] shadow-sm flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider text-[#70757A] font-semibold">
            Upcoming Departures
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl sm:text-3xl font-bold font-serif text-[#202124]">
              {upcoming_trips?.length || 0}
            </span>
            <Calendar className="w-5 h-5 text-[#24292F]" />
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-[#E4E5E7] shadow-sm flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider text-[#70757A] font-semibold">
            Completed Trips
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl sm:text-3xl font-bold font-serif text-[#202124]">
              {completed_trips_count}
            </span>
            <Clock className="w-5 h-5 text-[#70757A]" />
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-[#E4E5E7] shadow-sm flex flex-col justify-between">
          <span className="text-[11px] uppercase tracking-wider text-[#70757A] font-semibold">
            Total Journeys
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl sm:text-3xl font-bold font-serif text-[#202124]">
              {total_bookings}
            </span>
            <Compass className="w-5 h-5 text-[#70757A]" />
          </div>
        </div>
      </div>

      {/* Next Upcoming Departure Spotlight */}
      {nextTrip ? (
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E4E5E7] shadow-md relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest bg-[#24292F] text-white">
                  Next Journey
                </span>
                <span className="font-mono text-xs text-[#70757A]">
                  Ref: {nextTrip.booking_reference}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#202124]">
                {nextTrip.package_title}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#70757A]">
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-[#24292F]" />
                  {nextTrip.destination_name}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-[#24292F]" />
                  {nextTrip.departure_date}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Users className="w-3.5 h-3.5 text-[#24292F]" />
                  {nextTrip.number_of_travellers} Traveller
                  {nextTrip.number_of_travellers > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href={`/dashboard/bookings/${nextTrip.booking_reference}`}
                className="inline-flex items-center justify-center gap-2 px-6 h-11 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-[#24292F]/15"
              >
                <span>View Full Itinerary & Voucher</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="p-8 rounded-3xl bg-white border border-[#E4E5E7] text-center space-y-4 shadow-sm">
          <Compass className="w-10 h-10 text-[#24292F]/60 mx-auto" />
          <h2 className="text-lg font-serif font-bold text-[#202124]">No Upcoming Trips Scheduled</h2>
          <p className="text-xs text-[#70757A] max-w-md mx-auto">
            You don&apos;t have any upcoming departures yet. Discover our curated group tours and bespoke packages from Coimbatore.
          </p>
          <div>
            <Link
              href="/packages"
              className="inline-flex items-center gap-2 px-6 h-11 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
            >
              <span>Explore Travel Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* Recent Bookings Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-[#202124]">Recent Bookings</h2>
          <Link
            href="/dashboard/bookings"
            className="text-xs text-[#24292F] hover:text-[#3D4450] font-semibold flex items-center gap-1 transition-colors"
          >
            <span>View All Bookings</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recent_bookings.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white border border-[#E4E5E7] text-center text-xs text-[#70757A] shadow-sm">
            No booking history found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recent_bookings.map((b) => (
              <div
                key={b.id}
                className="p-6 rounded-3xl bg-white border border-[#E4E5E7] hover:border-[#24292F]/40 transition-all flex flex-col justify-between gap-4 shadow-sm hover:shadow-md"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#24292F]">
                      {b.booking_reference}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        b.status === "confirmed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : b.status === "pending"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : b.status === "cancelled"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-[#F3F4F4] text-[#70757A] border-[#E4E5E7]"
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#202124] line-clamp-1">{b.package_title}</h3>
                  <div className="flex items-center gap-3 text-xs text-[#70757A]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#24292F]" />
                      {b.departure_date}
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-[#24292F]" />
                      ₹{Number(b.total).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E4E5E7] flex items-center justify-between">
                  <span className="text-[11px] text-[#70757A]">
                    Payment: <span className="capitalize text-[#202124] font-medium">{b.payment_status}</span>
                  </span>
                  <Link
                    href={`/dashboard/bookings/${b.booking_reference}`}
                    className="text-xs text-[#24292F] hover:text-[#3D4450] font-semibold flex items-center gap-1"
                  >
                    <span>Details</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Action Tiles */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        <Link
          href="/dashboard/travellers"
          className="p-6 rounded-3xl bg-white border border-[#E4E5E7] hover:border-[#24292F]/40 transition-all shadow-sm hover:shadow-md group"
        >
          <Users className="w-6 h-6 text-[#24292F] mb-3 group-hover:scale-105 transition-transform" />
          <h3 className="text-sm font-bold text-[#202124] mb-1">
            Saved Travellers {saved_travellers_count > 0 ? `(${saved_travellers_count})` : ""}
          </h3>
          <p className="text-xs text-[#70757A]">
            Speed up future bookings by pre-saving family and companion details.
          </p>
        </Link>

        <Link
          href="/dashboard/profile"
          className="p-6 rounded-3xl bg-white border border-[#E4E5E7] hover:border-[#24292F]/40 transition-all shadow-sm hover:shadow-md group"
        >
          <ShieldCheck className="w-6 h-6 text-[#24292F] mb-3 group-hover:scale-105 transition-transform" />
          <h3 className="text-sm font-bold text-[#202124] mb-1">Account & Security</h3>
          <p className="text-xs text-[#70757A]">
            Manage your personal profile, phone number, and security preferences.
          </p>
        </Link>

        <Link
          href="/contact"
          className="p-6 rounded-3xl bg-white border border-[#E4E5E7] hover:border-[#24292F]/40 transition-all shadow-sm hover:shadow-md group"
        >
          <HelpCircle className="w-6 h-6 text-[#24292F] mb-3 group-hover:scale-105 transition-transform" />
          <h3 className="text-sm font-bold text-[#202124] mb-1">Support & Office</h3>
          <p className="text-xs text-[#70757A]">
            Visit our office in Gandhipuram, Coimbatore, or request assistance.
          </p>
        </Link>
      </section>
    </div>
  );
}
