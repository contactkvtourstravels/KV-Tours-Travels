"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Calendar,
  CreditCard,
  MapPin,
  Users,
  ChevronLeft,
  Download,
  FileText,
  Printer,
  ShieldCheck,
  MessageCircle,
  AlertTriangle,
  Clock,
  Building,
  Compass,
  X,
} from "lucide-react";
import {
  customerBookingApi,
  BookingDetailResponse,
  TravelVoucherData,
  PaymentReceiptData,
} from "@/lib/api";
import { getWhatsAppClickToChatUrl } from "@/lib/constants";

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const resolvedParams = use(params);
  const reference = resolvedParams.reference;

  const [booking, setBooking] = useState<BookingDetailResponse | null>(null);
  const [voucher, setVoucher] = useState<TravelVoucherData | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const b = await customerBookingApi.getBookingDetail(reference);
        setBooking(b);

        // Fetch voucher and receipt in parallel if confirmed
        try {
          const [v, r] = await Promise.all([
            customerBookingApi.getVoucher(reference),
            customerBookingApi.getReceipt(reference),
          ]);
          setVoucher(v);
          setReceipt(r);
        } catch {
          // Non-blocking if pending or unavailable
        }
      } catch (err: unknown) {
        setError((err as Error).message || "Failed to load booking details.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [reference]);

  const handleCancellationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    try {
      setCancelSubmitting(true);
      setCancelError(null);
      const res = await customerBookingApi.requestCancellation(booking.id, cancelReason);
      setCancelMessage(res.message);
      // Reload booking to show updated cancellation request status
      const updated = await customerBookingApi.getBookingDetail(reference);
      setBooking(updated);
      setTimeout(() => setShowCancelModal(false), 2000);
    } catch (err: unknown) {
      setCancelError((err as Error).message || "Failed to submit cancellation request.");
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-[#70757A]">
        <div className="w-8 h-8 border-2 border-[#E4E5E7] border-t-[#24292F] rounded-full animate-spin mb-4" />
        <p className="text-xs uppercase tracking-widest text-[#70757A]">
          Loading booking manifest {reference}...
        </p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="py-12 max-w-xl mx-auto space-y-4">
        <div className="p-6 rounded-3xl bg-red-50 border border-red-200 text-red-700 text-xs shadow-sm">
          {error || "Booking not found or you are not authorized to view this booking."}
        </div>
        <Link
          href="/dashboard/bookings"
          className="inline-flex items-center gap-2 text-xs text-[#24292F] hover:underline font-semibold"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to My Bookings</span>
        </Link>
      </div>
    );
  }

  const waHelpUrl = getWhatsAppClickToChatUrl(
    voucher?.whatsapp_number,
    `Hi KV Tours & Travels, I need assistance with my booking ${booking.booking_reference}.`
  );

  return (
    <div className="space-y-8">
      {/* Back Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/bookings"
          className="inline-flex items-center gap-1.5 text-xs text-[#70757A] hover:text-[#202124] transition-colors font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to All Bookings</span>
        </Link>

        <a
          href={waHelpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] text-[#0D7A53] text-xs font-semibold hover:bg-[#DCF3EA] transition-all"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>Ask About My Booking</span>
        </a>
      </div>

      {/* Hero Header Card */}
      <section className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E4E5E7] shadow-sm relative">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm sm:text-base font-bold text-[#24292F] tracking-wider">
                {booking.booking_reference}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  booking.status === "confirmed"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : booking.status === "pending"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : booking.status === "cancelled"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-[#F3F4F4] text-[#70757A] border-[#E4E5E7]"
                }`}
              >
                {booking.status}
              </span>
              <span className="text-xs text-[#70757A]">
                Payment: <strong className="capitalize text-[#202124]">{booking.payment_status}</strong>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#202124] tracking-tight">
              {booking.package_title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#70757A]">
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#24292F]" />
                {booking.destination_name}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-[#24292F]" />
                Departure: {booking.departure_date}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Users className="w-3.5 h-3.5 text-[#24292F]" />
                {booking.number_of_travellers} Traveller
                {booking.number_of_travellers > 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#24292F]" />
                Lead: {booking.customer_name}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {voucher && (
              <button
                type="button"
                onClick={() => setShowVoucherModal(true)}
                className="inline-flex items-center gap-2 px-5 h-10 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-[#24292F]/15 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Travel Voucher</span>
              </button>
            )}

            {receipt && (
              <button
                type="button"
                onClick={() => setShowReceiptModal(true)}
                className="inline-flex items-center gap-2 px-5 h-10 rounded-full bg-[#F3F4F4] hover:bg-[#E4E5E7] text-[#202124] border border-[#E4E5E7] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Payment Receipt</span>
              </button>
            )}

            {/* Cancellation Request trigger if booking is not cancelled */}
            {booking.status !== "cancelled" && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="inline-flex items-center gap-2 px-4 h-10 rounded-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Request Cancellation</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Cancellation Status Banner (if request exists) */}
      {booking.cancellation_request && (
        <div
          className={`p-5 rounded-3xl border shadow-sm ${
            booking.cancellation_request.status === "approved"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : booking.cancellation_request.status === "rejected"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4" />
            <span>Cancellation Request: {booking.cancellation_request.status}</span>
          </div>
          <p className="text-xs">
            <strong>Reason:</strong> {booking.cancellation_request.reason}
          </p>
          {booking.cancellation_request.admin_notes && (
            <p className="text-xs mt-1">
              <strong>Staff Note:</strong> {booking.cancellation_request.admin_notes}
            </p>
          )}
        </div>
      )}

      {/* Main Content Grid: Itinerary & Passenger Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left (8 Cols): Itinerary & Passenger Roster */}
        <div className="lg:col-span-8 space-y-8">
          {/* Day-by-Day Itinerary Breakdown */}
          {voucher && voucher.itinerary_days && voucher.itinerary_days.length > 0 && (
            <section className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E4E5E7] space-y-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-[#E4E5E7]">
                <div className="flex items-center gap-3">
                  <Compass className="w-5 h-5 text-[#24292F]" />
                  <h2 className="text-lg font-serif font-bold text-[#202124]">
                    Day-by-Day Journey Plan
                  </h2>
                </div>
              </div>

              <div className="space-y-4">
                {voucher.itinerary_days.map((day) => (
                  <div
                    key={day.day_number}
                    className="p-5 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#24292F]">
                        Day {day.day_number}: {day.title}
                      </span>
                    </div>
                    {day.description && (
                      <p className="text-xs text-[#70757A] leading-relaxed">
                        {day.description}
                      </p>
                    )}
                    {day.activities && day.activities.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1.5">
                        {day.activities.map((act, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-full bg-white border border-[#E4E5E7] text-[11px] text-[#202124] font-medium"
                          >
                            &bull; {act}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Passenger Roster */}
          <section className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E4E5E7] space-y-6 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-[#E4E5E7]">
              <Users className="w-5 h-5 text-[#24292F]" />
              <h2 className="text-lg font-serif font-bold text-[#202124]">
                Passenger Manifest ({booking.travellers.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {booking.travellers.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#202124]">
                      {t.first_name} {t.last_name}
                    </span>
                    {t.is_primary && (
                      <span className="text-[10px] bg-[#ECEFF3] text-[#24292F] border border-[#D3D8DF] px-2 py-0.5 rounded-full font-semibold">
                        Lead
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#70757A] space-y-1">
                    <p>Nationality: {t.nationality || "IND"}</p>
                    <p>Gender: <span className="capitalize">{t.gender || "undisclosed"}</span></p>
                    {t.contact_phone && <p>Phone: {t.contact_phone}</p>}
                    {t.contact_email && <p>Email: {t.contact_email}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Included Accommodations */}
          {voucher && voucher.hotel_information && voucher.hotel_information.length > 0 && (
            <section className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E4E5E7] space-y-4 shadow-sm">
              <div className="flex items-center gap-3 pb-4 border-b border-[#E4E5E7]">
                <Building className="w-5 h-5 text-[#24292F]" />
                <h2 className="text-lg font-serif font-bold text-[#202124]">
                  Accommodation Details
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {voucher.hotel_information.map((h, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-1"
                  >
                    <div className="text-xs font-bold text-[#202124]">{h.name || h.hotel_id || "Partner Hotel"}</div>
                    <div className="text-[11px] text-[#70757A]">
                      {h.city ? `${h.city} • ` : ""}{h.room_type || "Standard Room"} ({h.nights || 1} Nights)
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right (4 Cols): Price Breakdown & Payment Verification */}
        <div className="lg:col-span-4 space-y-6">
          {/* Price Breakdown Card */}
          <div className="p-6 rounded-3xl bg-white border border-[#E4E5E7] space-y-4 shadow-sm">
            <h3 className="text-base font-serif font-bold text-[#202124] pb-3 border-b border-[#E4E5E7]">
              Price Breakdown
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-[#70757A]">
                <span>Base Package Rate</span>
                <span className="text-[#202124] font-medium">
                  ₹{Number(booking.subtotal || booking.total).toLocaleString("en-IN")}
                </span>
              </div>

              {Number(booking.discount) > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Coupon Discount</span>
                  <span>-₹{Number(booking.discount).toLocaleString("en-IN")}</span>
                </div>
              )}

              {Number(booking.tax) > 0 && (
                <div className="flex justify-between text-[#70757A]">
                  <span>GST / Taxes</span>
                  <span className="text-[#202124] font-medium">
                    ₹{Number(booking.tax).toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-[#E4E5E7] flex justify-between items-baseline">
                <span className="text-xs uppercase tracking-wider text-[#70757A] font-semibold">
                  Total Paid
                </span>
                <span className="text-2xl font-serif font-bold text-[#202124]">
                  ₹{Number(booking.total).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Snapshot */}
          <div className="p-6 rounded-3xl bg-white border border-[#E4E5E7] space-y-3 shadow-sm">
            <h3 className="text-base font-serif font-bold text-[#202124] pb-3 border-b border-[#E4E5E7] flex items-center justify-between">
              <span>Payment Details</span>
              <CreditCard className="w-4 h-4 text-[#24292F]" />
            </h3>

            <div className="text-xs space-y-2 text-[#70757A]">
              <div className="flex justify-between">
                <span>Provider</span>
                <span className="text-[#202124] font-medium">Razorpay</span>
              </div>
              <div className="flex justify-between">
                <span>Status</span>
                <span className="capitalize text-[#202124] font-medium">{booking.payment_status}</span>
              </div>
              {booking.payments && booking.payments.length > 0 && (
                <div className="flex justify-between">
                  <span>Transaction ID</span>
                  <span className="font-mono text-[11px] text-[#24292F] font-bold">
                    {booking.payments[0].provider_payment_id || booking.payments[0].id}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TRAVEL VOUCHER MODAL */}
      {showVoucherModal && voucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#E4E5E7] rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl">
            {/* Modal Actions */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E4E5E7]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#24292F]" />
                <span className="text-sm font-bold uppercase tracking-wider text-[#202124]">
                  Official Travel Voucher
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#F3F4F4] hover:bg-[#E4E5E7] text-[#202124] text-xs font-semibold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
                  className="w-8 h-8 rounded-full bg-[#F3F4F4] text-[#70757A] hover:text-[#202124] hover:bg-[#E4E5E7] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Voucher Body (Printable) */}
            <div className="space-y-6 text-[#202124]">
              {/* Agency Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E4E5E7]">
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#24292F]">
                    {voucher.agency_name}
                  </h2>
                  <p className="text-xs text-[#70757A] mt-1">{voucher.agency_location}</p>
                  <p className="text-xs text-[#70757A]">
                    Phone: {voucher.agency_phone} | Email: {voucher.agency_email}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <div className="font-mono text-xs text-[#70757A]">Booking Reference</div>
                  <div className="font-mono text-lg font-bold text-[#202124]">
                    {voucher.booking_reference}
                  </div>
                  <div className="text-[11px] text-emerald-700 uppercase font-semibold">
                    Status: {voucher.booking_status}
                  </div>
                </div>
              </div>

              {/* Package Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] text-xs">
                <div>
                  <span className="text-[#70757A] block text-[10px] uppercase font-semibold">Package</span>
                  <span className="font-bold text-[#202124]">{voucher.package_title}</span>
                </div>
                <div>
                  <span className="text-[#70757A] block text-[10px] uppercase font-semibold">Destination</span>
                  <span className="font-bold text-[#202124]">{voucher.destination_name}</span>
                </div>
                <div>
                  <span className="text-[#70757A] block text-[10px] uppercase font-semibold">Departure</span>
                  <span className="font-bold text-[#202124]">{voucher.departure_date}</span>
                </div>
                <div>
                  <span className="text-[#70757A] block text-[10px] uppercase font-semibold">Travellers</span>
                  <span className="font-bold text-[#202124]">
                    {voucher.number_of_travellers}
                  </span>
                </div>
              </div>

              {/* Travellers List */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase font-bold tracking-wider text-[#24292F]">
                  Confirmed Travellers
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {voucher.travellers.map((t, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7]">
                      <strong className="text-[#202124]">{t.name}</strong> <span className="text-[#70757A]">({t.gender})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Itinerary Summary */}
              {voucher.itinerary_days && (
                <div className="space-y-2">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-[#24292F]">
                    Itinerary Highlights
                  </h4>
                  <div className="space-y-2 text-xs">
                    {voucher.itinerary_days.map((d) => (
                      <div key={d.day_number} className="p-3.5 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7]">
                        <strong className="text-[#202124]">Day {d.day_number}: {d.title}</strong>
                        {d.description && <p className="text-[#70757A] mt-1">{d.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT RECEIPT MODAL */}
      {showReceiptModal && receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#E4E5E7] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl">
            {/* Modal Actions */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E4E5E7]">
              <span className="text-sm font-bold uppercase tracking-wider text-[#202124]">
                Payment Receipt
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#F3F4F4] hover:bg-[#E4E5E7] text-[#202124] text-xs font-semibold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="w-8 h-8 rounded-full bg-[#F3F4F4] text-[#70757A] hover:text-[#202124] hover:bg-[#E4E5E7] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Receipt Body */}
            <div className="space-y-5 text-[#202124] text-xs">
              <div className="flex justify-between items-start pb-4 border-b border-[#E4E5E7]">
                <div>
                  <h3 className="font-serif font-bold text-[#24292F] text-lg">
                    {receipt.agency_name}
                  </h3>
                  <p className="text-[#70757A]">{receipt.agency_location}</p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[#70757A]">Receipt #{receipt.receipt_number}</div>
                  <div className="text-[#202124] font-mono font-medium">{receipt.payment_date}</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#70757A]">Customer Name:</span>
                  <strong className="text-[#202124]">{receipt.customer_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#70757A]">Booking Reference:</span>
                  <strong className="text-[#24292F] font-mono">{receipt.booking_reference}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#70757A]">Payment Provider:</span>
                  <strong className="text-[#202124] capitalize">{receipt.payment_provider}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#70757A]">Payment ID:</span>
                  <strong className="text-[#202124] font-mono">{receipt.payment_id || "N/A"}</strong>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-[#202124] uppercase text-[11px] tracking-wider">
                  Payment Summary
                </h4>
                <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-2">
                  <div className="flex justify-between text-[#70757A]">
                    <span>Base Amount:</span>
                    <span className="text-[#202124]">₹{Number(receipt.subtotal).toLocaleString("en-IN")}</span>
                  </div>
                  {Number(receipt.tax) > 0 && (
                    <div className="flex justify-between text-[#70757A]">
                      <span>GST / Tax:</span>
                      <span className="text-[#202124]">₹{Number(receipt.tax).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {Number(receipt.discount) > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Discount:</span>
                      <span>-₹{Number(receipt.discount).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-[#E4E5E7] flex justify-between font-bold text-sm text-[#202124]">
                    <span>Total Paid:</span>
                    <span className="text-[#24292F]">₹{Number(receipt.total_amount || receipt.amount_paid).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-[#70757A] italic text-center">
                This receipt is generated from authoritative immutable payment transaction records.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION REQUEST MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-red-200 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E5E7]">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>Request Booking Cancellation</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="w-8 h-8 rounded-full bg-[#F3F4F4] text-[#70757A] hover:text-[#202124] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-relaxed">
              <strong>Notice:</strong> Submitting a cancellation request does not automatically grant a refund. Our team reviews all requests pursuant to KV Tours & Travels cancellation policies.
            </div>

            {cancelError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {cancelError}
              </div>
            )}

            {cancelMessage ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs text-center font-medium">
                {cancelMessage}
              </div>
            ) : (
              <form onSubmit={handleCancellationSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-2">
                    Reason for Cancellation *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Please provide details regarding your cancellation request..."
                    className="w-full p-3.5 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] text-xs focus:border-[#24292F] focus:bg-white focus:outline-none transition-all resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(false)}
                    className="px-4 py-2 rounded-full bg-[#F3F4F4] text-[#70757A] hover:text-[#202124] text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={cancelSubmitting || !cancelReason.trim()}
                    className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                  >
                    {cancelSubmitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
