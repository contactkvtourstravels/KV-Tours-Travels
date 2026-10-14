"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Users,
  Compass,
  MessageCircle,
  Printer,
  ShieldCheck,
  MapPin,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { PublicLayout } from "@/components/public/PublicLayout";
import { bookingApi, BookingDetailResponse } from "@/lib/api";

function ConfirmationContent() {
  const params = useParams();
  const reference = params?.reference as string;

  const [booking, setBooking] = useState<BookingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBooking = useCallback(async () => {
    if (!reference) return;
    try {
      setLoading(true);
      setError(null);
      const data = await bookingApi.getBooking(reference);
      setBooking(data);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load booking confirmation details.");
    } finally {
      setLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  if (loading) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#24292F]" />
        <p className="text-[#70757A] text-sm tracking-wide font-medium">
          Retrieving verified booking confirmation...
        </p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-[60vh] max-w-lg mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-[#202124]">Booking Not Found</h1>
        <p className="text-[#70757A] text-sm">
          {error || "The requested booking reservation could not be found."}
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-3.5 rounded-full bg-white border border-[#E4E5E7] text-[#202124] text-xs uppercase tracking-widest font-semibold hover:bg-[#F3F4F4] transition-colors shadow-sm"
        >
          Return to Home
        </Link>
      </div>
    );
  }

  const latestPayment =
    booking.payments && booking.payments.length > 0
      ? booking.payments[booking.payments.length - 1]
      : null;

  const isConfirmed = booking.status === "confirmed";
  const isPaid = booking.payment_status === "paid";

  const waMessage = encodeURIComponent(
    `Hello KV Tours & Travels! I have confirmed my booking reference ${booking.booking_reference} for ${booking.package_title}. Please share my trip briefing and travel documents.`
  );
  const waUrl = `https://wa.me/919842212345?text=${waMessage}`;

  return (
    <div className="py-8 sm:py-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 print:p-0 print:m-0 print:max-w-none">
      {/* ===================================================================== */}
      {/* 1. EXCLUSIVE LUXURY PRINT LETTERHEAD (PRINT ONLY)                     */}
      {/* ===================================================================== */}
      <div className="hidden print:block pb-5 mb-5 border-b-2 border-[#C5A880]">
        <div className="flex justify-between items-start gap-4">
          <div>
            <div className="text-2xl font-serif font-black tracking-tight text-[#111827]">
              KV TOURS & TRAVELS
            </div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#8C6D3B] font-bold mt-0.5">
              Bespoke Luxury & Adventure Journeys • Coimbatore Operations Hub
            </div>
            <div className="text-[10px] text-[#4B5563] mt-2 space-y-0.5 leading-tight">
              <div>Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu 641012, India</div>
              <div>Concierge Desk: +91 98422 12345 | bookings@kvtours.in | www.kvtours.in</div>
            </div>
          </div>

          <div className="text-right">
            <div className="inline-block px-3 py-1 bg-[#F9FAFB] border border-[#C5A880] rounded text-[10px] uppercase tracking-widest font-bold text-[#8C6D3B]">
              Official Travel Voucher & Receipt
            </div>
            <div className="mt-2 font-mono text-base font-extrabold tracking-wider text-[#111827]">
              {booking.booking_reference}
            </div>
            <div className="text-[10px] text-[#4B5563] mt-0.5">
              Issued: {booking.created_at ? new Date(booking.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
            </div>
            <div className="mt-1 text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-end gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
              Verified & Paid via Razorpay
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. TOP BANNER / BRAND HEADER (SCREEN ONLY)                            */}
      {/* ===================================================================== */}
      <div className="text-center space-y-4 mb-8 print:hidden">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
        </div>

        <div className="space-y-1">
          <span className="text-xs uppercase tracking-widest text-[#24292F] font-bold block">
            KV TOURS & TRAVELS • COIMBATORE
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#202124]">
            Booking Confirmed & Verified
          </h1>
          <p className="text-[#70757A] text-sm max-w-md mx-auto">
            Your journey reservation has been authoritatively secured and verified with Razorpay payment settlement.
          </p>
        </div>

        {/* Reference Highlight & Print Action Bar */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white border border-[#E4E5E7] font-mono text-xs shadow-xs">
            <span className="text-[#70757A] uppercase font-medium">Reference:</span>
            <span className="text-[#24292F] font-bold tracking-wider">
              {booking.booking_reference}
            </span>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-wider font-bold shadow-md shadow-[#24292F]/15 active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#C5A880]" />
            <span>Print / Save PDF Travel Voucher</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. MAIN VOUCHER CARD (SCREEN + PRINT)                                 */}
      {/* ===================================================================== */}
      <div className="rounded-3xl bg-white border border-[#E4E5E7] p-6 sm:p-10 space-y-7 shadow-xl print:border-0 print:shadow-none print:p-0 print:space-y-4">
        {/* Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[#E4E5E7] print:pb-2.5 print:border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider print:text-[10px] print:px-2.5 print:py-0.5 ${
                isConfirmed
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-[#ECEFF3] border border-[#D3D8DF] text-[#24292F]"
              }`}
            >
              Booking: {booking.status}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider print:text-[10px] print:px-2.5 print:py-0.5 ${
                isPaid
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-[#ECEFF3] border border-[#D3D8DF] text-[#24292F]"
              }`}
            >
              Payment: {booking.payment_status}
            </span>
          </div>

          <button
            onClick={() => window.print()}
            className="print:hidden inline-flex items-center gap-2 text-xs text-[#70757A] hover:text-[#202124] transition-colors cursor-pointer font-medium"
          >
            <Printer className="w-4 h-4" />
            <span>Print Confirmation</span>
          </button>
        </div>

        {/* Section 1: Journey Details */}
        <div className="space-y-3 print:space-y-2 no-break">
          <span className="text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 print:text-[11px] text-[#8C6D3B]">
            <Compass className="w-3.5 h-3.5 text-[#C5A880]" />
            Journey Specifications
          </span>

          <div className="p-5 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-4 print:p-3.5 print:rounded-lg print:border-[#D1D5DB] print:bg-[#F9FAFB]">
            <div className="flex flex-col sm:flex-row justify-between sm:items-baseline gap-2">
              <h2 className="text-xl font-serif font-bold text-[#202124] print:text-lg">
                {booking.package_title}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-[#70757A] print:text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-[#24292F]" />
                <span className="font-medium text-[#202124]">{booking.destination_name}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E4E5E7] text-xs print:gap-2 print:pt-2.5 print:border-[#E5E7EB] print:text-[11px]">
              <div>
                <span className="text-[#70757A] block mb-0.5 uppercase tracking-wider text-[10px] font-bold">Departure Date</span>
                <span className="text-[#202124] font-semibold">
                  {new Date(booking.departure_date).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              {booking.return_date && (
                <div>
                  <span className="text-[#70757A] block mb-0.5 uppercase tracking-wider text-[10px] font-bold">Return Date</span>
                  <span className="text-[#202124] font-semibold">
                    {new Date(booking.return_date).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
              <div>
                <span className="text-[#70757A] block mb-0.5 uppercase tracking-wider text-[10px] font-bold">Travellers</span>
                <span className="text-[#202124] font-semibold">
                  {booking.number_of_travellers} Person{booking.number_of_travellers > 1 ? "s" : ""} (Registered Guests)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Registered Travellers Roster Table */}
        <div className="space-y-3 print:space-y-2 no-break">
          <span className="text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 print:text-[11px] text-[#8C6D3B]">
            <Users className="w-3.5 h-3.5 text-[#C5A880]" />
            Passenger Manifest & Travel Roster
          </span>

          <div className="border border-[#E4E5E7] rounded-2xl overflow-hidden shadow-sm print:rounded-lg print:border-[#D1D5DB]">
            <table className="w-full text-left text-xs print:text-[10.5px]">
              <thead className="bg-[#F7F7F5] text-[#5F6368] border-b border-[#E4E5E7] print:bg-[#F3F4F6] print:text-[#374151]">
                <tr>
                  <th className="py-2.5 px-4 font-bold uppercase tracking-wider text-[10px]">#</th>
                  <th className="py-2.5 px-4 font-bold uppercase tracking-wider text-[10px]">Guest Name</th>
                  <th className="py-2.5 px-4 font-bold uppercase tracking-wider text-[10px]">Role / Status</th>
                  <th className="py-2.5 px-4 font-bold uppercase tracking-wider text-[10px]">Contact Info</th>
                  <th className="py-2.5 px-4 font-bold uppercase tracking-wider text-[10px]">Passport / National ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E5E7] text-[#202124] print:divide-[#E5E7EB]">
                {booking.travellers.map((traveller, idx) => (
                  <tr key={traveller.id} className="hover:bg-[#F3F4F4]/50 print:bg-white">
                    <td className="py-2.5 px-4 font-bold text-[#70757A]">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-[#202124]">
                      {traveller.first_name} {traveller.last_name}
                    </td>
                    <td className="py-2.5 px-4">
                      {traveller.is_primary ? (
                        <span className="text-[10px] text-[#24292F] font-bold uppercase bg-[#ECEFF3] px-2 py-0.5 rounded border border-[#D3D8DF]">
                          Lead Contact
                        </span>
                      ) : (
                        <span className="text-[#70757A]">Guest</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-[#5F6368] font-mono text-[11px]">
                      {traveller.contact_phone || traveller.contact_email || "-"}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[#5F6368]">
                      {traveller.passport_number
                        ? `${traveller.passport_number} (${traveller.passport_issuing_country || "IND"})`
                        : "Domestic / Gov ID"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Payment Verification & Settlement Statement */}
        <div className="space-y-3 print:space-y-2 no-break">
          <span className="text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 print:text-[11px] text-[#8C6D3B]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C5A880]" />
            Financial Settlement & Gateway Audit Details
          </span>

          <div className="p-5 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-4 text-xs print:p-3.5 print:rounded-lg print:border-[#D1D5DB] print:bg-[#F9FAFB] print:space-y-2.5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
              <div>
                <span className="text-[#70757A] block mb-0.5 uppercase tracking-wider text-[10px] font-bold">Gateway Provider</span>
                <span className="text-[#202124] font-semibold uppercase font-mono">
                  {latestPayment?.provider || "Razorpay Gateway"}
                </span>
              </div>
              <div>
                <span className="text-[#70757A] block mb-0.5 uppercase tracking-wider text-[10px] font-bold">Razorpay Order ID</span>
                <span className="text-[#202124] font-mono text-[11px] truncate block font-medium">
                  {latestPayment?.provider_order_id || "-"}
                </span>
              </div>
              <div>
                <span className="text-[#70757A] block mb-0.5 uppercase tracking-wider text-[10px] font-bold">Transaction / Payment ID</span>
                <span className="text-[#202124] font-mono text-[11px] truncate block font-medium">
                  {latestPayment?.provider_payment_id || "-"}
                </span>
              </div>
              <div>
                <span className="text-[#70757A] block mb-0.5 uppercase tracking-wider text-[10px] font-bold">Total Amount Paid</span>
                <span className="text-[#24292F] font-serif font-black text-base block text-emerald-800">
                  ₹{Number(booking.total).toLocaleString("en-IN")} {booking.currency}
                </span>
              </div>
            </div>

            {latestPayment?.captured_at && (
              <div className="pt-3 border-t border-[#E4E5E7] text-[11px] text-[#5F6368] flex items-center justify-between gap-1.5 print:pt-2 print:border-[#E5E7EB]">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Authoritatively captured on{" "}
                    <strong>{new Date(latestPayment.captured_at).toLocaleString("en-IN")}</strong>
                  </span>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  100% Settled
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Traveler Protocols & Emergency Concierge */}
        <div className="p-4 rounded-xl bg-white border border-[#E5E7EB] space-y-2 text-[11px] leading-relaxed text-[#4B5563] no-break">
          <div className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-[#8C6D3B]">
            <span>Important Traveler Guidelines & Arrival Briefing</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[#374151]">
            <li>
              <strong>Check-in Requirement:</strong> Please present this official electronic voucher along with original government photo identification (or passport for international travel) during hotel check-in and departure assembly.
            </li>
            <li>
              <strong>Private Logistics:</strong> Scheduled chauffeured transfers and curated excursions are confirmed as per the booked itinerary. Your travel host details will be notified 24 hours prior to departure.
            </li>
            <li>
              <strong>24/7 Dedicated Concierge Helpline:</strong> Coimbatore Operations Desk: +91 98422 12345 | Priority WhatsApp Desk: +91 94420 00000 | concierge@kvtours.in
            </li>
          </ul>
        </div>

        {/* Section 5: Official Authenticity Stamp (Print Only) */}
        <div className="hidden print:flex items-center justify-between pt-3 border-t border-[#E5E7EB] text-[9.5px] text-[#6B7280] no-break">
          <div>
            <div className="font-bold text-[#111827] uppercase tracking-wider">
              KV Tours & Travels Operations • Coimbatore Portal
            </div>
            <div>Computer-generated authoritative travel document • Valid without physical signature</div>
          </div>
          <div className="text-right font-mono">
            <div>AUTH-VERIFIED-{booking.booking_reference}</div>
            <div className="text-[8.5px] text-[#9CA3AF]">Tamper-Proof Electronic Seal</div>
          </div>
        </div>

        {/* Section 6: Screen Concierge Actions (Hidden in Print) */}
        <div className="pt-6 border-t border-[#E4E5E7] flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#0D7A53] hover:bg-[#0A6242] text-white text-xs uppercase tracking-widest font-semibold shadow-md shadow-emerald-700/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Connect with Coimbatore Concierge</span>
          </a>

          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3.5 rounded-full border border-[#E4E5E7] bg-white text-[#202124] text-xs uppercase tracking-widest font-semibold hover:bg-[#F3F4F4] transition-all text-center"
          >
            Return to KV Tours Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <PublicLayout>
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center text-[#70757A]">
            <Loader2 className="w-8 h-8 animate-spin text-[#24292F]" />
          </div>
        }
      >
        <ConfirmationContent />
      </Suspense>
    </PublicLayout>
  );
}
