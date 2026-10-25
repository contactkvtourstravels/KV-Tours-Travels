"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import {
  ShieldCheck,
  Clock,
  CreditCard,
  AlertCircle,
  Loader2,
  Calendar,
  Users,
  Compass,
  ArrowRight,
  Lock,
  MessageCircle,
  Building,
  Copy,
  Check,
  FileCheck,
  AlertTriangle,
  MapPin,
} from "lucide-react";
import { PublicLayout } from "@/components/public/PublicLayout";
import {
  bookingApi,
  paymentApi,
  publicCatalogApi,
  BookingDetailResponse,
  RazorpayOrderResponse,
  PublicSiteSettings,
  BankSettingsPublicResponse,
} from "@/lib/api";
import { useBranding } from "@/context/BrandingContext";

interface RazorpayInstance {
  open: () => void;
  on: (
    event: string,
    callback: (resp: { error?: { code?: string; description?: string } }) => void
  ) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function PaymentContent() {
  const { displayName, shortName, city, getWhatsAppUrl, whatsappEnabled } = useBranding();
  const params = useParams();
  const router = useRouter();
  const reference = params?.reference as string;

  const [booking, setBooking] = useState<BookingDetailResponse | null>(null);
  const [siteSettings, setSiteSettings] = useState<PublicSiteSettings | null>(null);
  const [bankDetails, setBankDetails] = useState<BankSettingsPublicResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<
    "full_online" | "deposit_online" | "bank_transfer" | "branch_cash"
  >("full_online");

  // Bank Transfer Form State
  const [transferReference, setTransferReference] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [transferSuccessMessage, setTransferSuccessMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [isInitiating, setIsInitiating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  // Load authoritative booking & bank settings
  const loadBooking = useCallback(async () => {
    if (!reference) return;
    try {
      setLoading(true);
      setFetchError(null);
      const [data, settingsData, bankData] = await Promise.all([
        bookingApi.getBooking(reference),
        publicCatalogApi.getSettings().catch(() => null),
        paymentApi.getBankDetails().catch(() => null),
      ]);
      setBooking(data);
      setSiteSettings(settingsData);
      setBankDetails(bankData);

      // If already fully paid, redirect directly to confirmation
      if (data.status === "confirmed" && data.payment_status === "paid") {
        router.replace(`/booking/confirmation/${data.booking_reference}`);
        return;
      }

      // Check transaction threshold vs outstanding balance
      const totalAmt = Number(data.total);
      const paidAmt = Number(data.total_paid || 0);
      const balanceAmt = Number(data.outstanding_balance ?? totalAmt - paidAmt);
      const maxOnlineLimit = Number(bankData?.max_online_single_payment_limit || 500000);

      if (balanceAmt > maxOnlineLimit) {
        if (bankData?.split_payments_enabled ?? true) {
          setPaymentMethod("deposit_online");
        } else if (bankData?.bank_transfer_enabled ?? true) {
          setPaymentMethod("bank_transfer");
        }
      }

      // Compute hold seconds remaining (ensure UTC interpretation)
      if (data.hold_expires_at) {
        const rawExpiry = String(data.hold_expires_at).trim();
        const normalizedExpiry =
          rawExpiry.endsWith("Z") || /[+-]\d{2}(?::?\d{2})?$/.test(rawExpiry)
            ? rawExpiry
            : `${rawExpiry}Z`;
        const expiresAt = new Date(normalizedExpiry).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setSecondsRemaining(diff);
      }
    } catch (err: unknown) {
      setFetchError((err as Error).message || "Failed to load booking details.");
    } finally {
      setLoading(false);
    }
  }, [reference, router]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  // Authoritative financial calculations
  const totalAmount = booking ? Number(booking.total) : 0;
  const totalPaid = booking ? Number(booking.total_paid || 0) : 0;
  const outstandingBalance = booking
    ? Math.max(0, Number(booking.outstanding_balance ?? totalAmount - totalPaid))
    : 0;

  const depositPercentage = bankDetails
    ? Number(bankDetails.default_deposit_percentage || 25)
    : 25;
  const defaultDepositCalc = Math.round(totalAmount * (depositPercentage / 100));
  const minDeposit = bankDetails ? Number(bankDetails.min_deposit_amount || 5000) : 5000;
  const depositAmount = booking
    ? Number(
        booking.deposit_amount ||
          Math.min(outstandingBalance, Math.max(minDeposit, defaultDepositCalc))
      )
    : 0;

  const maxOnlineLimit = bankDetails
    ? Number(bankDetails.max_online_single_payment_limit || 500000)
    : 500000;
  const isFullAboveLimit = outstandingBalance > maxOnlineLimit;

  // Determine active availability of each payment system
  const isOnlinePaymentsActive = Boolean(siteSettings?.online_payments_enabled);
  const isBankTransferActive = Boolean(bankDetails?.bank_transfer_enabled);
  const isBranchPaymentActive = Boolean(bankDetails?.branch_payment_enabled);
  const isSplitPaymentActive =
    isOnlinePaymentsActive &&
    Boolean(bankDetails?.split_payments_enabled) &&
    outstandingBalance > depositAmount;
  const isFullOnlineActive = isOnlinePaymentsActive && !isFullAboveLimit;

  // Auto-align selected payment method with enabled options
  useEffect(() => {
    if (loading) return;
    const availableMethods: Array<
      "full_online" | "deposit_online" | "bank_transfer" | "branch_cash"
    > = [];
    if (isFullOnlineActive) availableMethods.push("full_online");
    if (isSplitPaymentActive) availableMethods.push("deposit_online");
    if (isBankTransferActive) availableMethods.push("bank_transfer");
    if (isBranchPaymentActive) availableMethods.push("branch_cash");

    if (availableMethods.length > 0 && !availableMethods.includes(paymentMethod)) {
      setPaymentMethod(availableMethods[0]);
    }
  }, [
    loading,
    isFullOnlineActive,
    isSplitPaymentActive,
    isBankTransferActive,
    isBranchPaymentActive,
    paymentMethod,
  ]);

  // Live countdown timer for payment hold
  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining]);

  const formatCountdown = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const isHoldExpired = secondsRemaining !== null && secondsRemaining <= 0;

  const payableNow =
    paymentMethod === "deposit_online"
      ? Math.min(depositAmount, outstandingBalance)
      : outstandingBalance;
  const remainingAfterPayment = Math.max(0, outstandingBalance - payableNow);

  // Check for any pending bank transfer submitted
  const pendingBankTransfer = booking?.payments?.find(
    (p) =>
      (p.provider === "bank_transfer" || p.provider === "branch") &&
      p.status === "pending"
  );

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Submit Bank Transfer Reference
  const handleSubmitBankTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    const refTrimmed = transferReference.trim();
    if (!refTrimmed) {
      setPaymentError("Please enter your bank transfer UTR or transaction reference number.");
      return;
    }

    try {
      setIsSubmittingTransfer(true);
      setPaymentError(null);
      const res = await paymentApi.submitBankTransfer({
        booking_id: booking.id,
        transfer_reference: refTrimmed,
        amount: outstandingBalance,
        payment_method: paymentMethod === "branch_cash" ? "branch_cash" : "bank_transfer",
        notes: transferNotes.trim() || undefined,
      });
      setTransferSuccessMessage(res.message);
      setTransferReference("");
      setTransferNotes("");
      await loadBooking();
    } catch (err: unknown) {
      setPaymentError((err as Error).message || "Failed to submit bank transfer reference.");
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  // Handle Razorpay Checkout initiation
  const handleProceedPayment = async () => {
    if (!booking) return;
    if (siteSettings && !siteSettings.online_payments_enabled) {
      setPaymentError(
        siteSettings.online_payments_maintenance_message ||
          "Online card/UPI checkout is temporarily paused for routine maintenance. Please contact our concierge."
      );
      return;
    }
    if (isHoldExpired) {
      setPaymentError("Your 30-minute booking hold has expired. Please create a new booking.");
      return;
    }

    if (paymentMethod === "full_online" && isFullAboveLimit) {
      setPaymentError(
        `This booking amount (₹${outstandingBalance.toLocaleString("en-IN")}) exceeds the maximum single online payment limit of ₹${maxOnlineLimit.toLocaleString("en-IN")}. Please select "Deposit / Split Payment" or "Bank Transfer".`
      );
      return;
    }

    try {
      setIsInitiating(true);
      setPaymentError(null);

      const targetAmount =
        paymentMethod === "deposit_online"
          ? Math.min(depositAmount, outstandingBalance)
          : outstandingBalance;
      const targetType = paymentMethod === "deposit_online" ? "deposit" : "full";

      // 1. Authoritatively create or retrieve Razorpay order from backend
      const orderData: RazorpayOrderResponse = await paymentApi.createOrder(
        booking.id,
        undefined,
        targetAmount,
        targetType
      );

      // Check if Razorpay script is present
      if (typeof window === "undefined" || !window.Razorpay) {
        throw new Error(
          "Razorpay Checkout script could not be loaded. Please check your internet connection or ad blocker."
        );
      }

      // 2. Configure official Razorpay Checkout options
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: displayName || "Travel Agency",
        description: `${targetType === "deposit" ? "Deposit" : "Payment"} for ${booking.package_title} (${orderData.booking_reference})`,
        order_id: orderData.order_id,
        prefill: {
          name: orderData.customer_name,
          email: orderData.customer_email,
          contact: orderData.customer_phone || undefined,
        },
        notes: {
          booking_reference: orderData.booking_reference,
          booking_id: booking.id,
          payment_type: targetType,
        },
        theme: {
          color: "#24292F",
          backdrop_color: "#080808",
        },
        modal: {
          backdropclose: false,
          escape: false,
          handleback: true,
          ondismiss: async function () {
            setIsInitiating(false);
            setPaymentError(
              "Payment checkout was dismissed. You can retry anytime while your seat hold remains active."
            );
            try {
              await paymentApi.recordFailure({
                booking_id: booking.id,
                razorpay_order_id: orderData.order_id,
                error_code: "MODAL_DISMISSED",
                error_description: "Customer closed payment modal before completion",
              });
            } catch {
              // Ignore client failure reporting error
            }
          },
        },
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          setIsInitiating(false);
          setIsVerifying(true);
          try {
            // Authoritative server-side HMAC-SHA256 signature verification
            const verifyRes = await paymentApi.verifyPayment({
              booking_id: booking.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.success) {
              if (verifyRes.payment_status === "paid") {
                router.push(`/booking/confirmation/${booking.booking_reference}`);
              } else {
                setTransferSuccessMessage(
                  "Deposit payment successfully received! Your reservation is confirmed. You can pay the remaining balance before departure."
                );
                await loadBooking();
              }
            } else {
              setPaymentError(
                verifyRes.message || "Payment verification could not be confirmed authoritatively."
              );
            }
          } catch (err: unknown) {
            setPaymentError(
              (err as Error).message || "Server verification failed. Please contact support with your payment ID."
            );
          } finally {
            setIsVerifying(false);
          }
        },
      };

      const rzpInstance = new window.Razorpay(options);

      rzpInstance.on("payment.failed", async function (response: { error?: { code?: string; description?: string } }) {
        setIsInitiating(false);
        const reason = response.error?.description || "Payment failed at gateway.";
        setPaymentError(`Payment failed: ${reason}`);
        try {
          await paymentApi.recordFailure({
            booking_id: booking.id,
            razorpay_order_id: orderData.order_id,
            error_code: response.error?.code,
            error_description: response.error?.description,
          });
        } catch {
          // ignore
        }
      });

      rzpInstance.open();
    } catch (err: unknown) {
      setIsInitiating(false);
      setPaymentError((err as Error).message || "Failed to initialize payment gateway.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#24292F]" />
        <p className="text-[#70757A] text-sm tracking-wide font-medium">
          Securing booking details...
        </p>
      </div>
    );
  }

  if (fetchError || !booking) {
    return (
      <div className="min-h-[60vh] max-w-lg mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-[#202124]">Booking Not Found</h1>
        <p className="text-[#70757A] text-sm">
          {fetchError || "The requested booking reservation could not be located."}
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

  if (booking.status === "cancelled") {
    return (
      <div className="min-h-[60vh] max-w-lg mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-14 h-14 rounded-full bg-[#ECEFF3] border border-[#D3D8DF] text-[#24292F] flex items-center justify-center mx-auto">
          <Clock className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-[#202124]">Reservation Cancelled</h1>
        <p className="text-[#70757A] text-sm">
          This booking ({booking.booking_reference}) has been cancelled or the temporary hold expired.
          Any reserved seats have been released back to availability.
        </p>
        <Link
          href="/packages"
          className="inline-block px-8 py-3.5 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-semibold shadow-md shadow-[#24292F]/15 transition-all"
        >
          Explore Available Journeys
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Official Razorpay Checkout JS */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onError={() =>
          setPaymentError(
            "Unable to load Razorpay payment gateway script. Please verify your connection."
          )
        }
      />

      <div className="py-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Verification Overlay */}
        {isVerifying && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="bg-white p-8 rounded-3xl border border-[#E4E5E7] shadow-2xl max-w-sm space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-[#24292F] mx-auto" />
              <h2 className="text-xl font-serif font-bold text-[#202124]">
                Authoritatively Verifying Payment
              </h2>
              <p className="text-[#70757A] text-xs">
                Please do not refresh or close this window while we verify the cryptographic signature
                with Razorpay...
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D3D8DF] bg-[#ECEFF3] text-[#24292F] text-xs uppercase tracking-widest font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{displayName} Secure Checkout</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#202124] tracking-tight">
            Complete Your Journey Payment
          </h1>
          <p className="text-[#70757A] text-sm max-w-md mx-auto">
            Authorized reservation checkout for reference{" "}
            <span className="font-mono text-[#24292F] font-semibold">{booking.booking_reference}</span>
          </p>
        </div>

        {/* Notifications */}
        {paymentError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Payment Notice</span>
              <span>{paymentError}</span>
            </div>
            <button
              onClick={() => setPaymentError(null)}
              className="text-[#70757A] hover:text-[#202124]"
            >
              ✕
            </button>
          </div>
        )}

        {transferSuccessMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Payment Submitted</span>
              <span>{transferSuccessMessage}</span>
            </div>
            <button
              onClick={() => setTransferSuccessMessage(null)}
              className="text-emerald-600 hover:text-emerald-800"
            >
              ✕
            </button>
          </div>
        )}

        {/* High-Value Transaction Threshold Guidance Notice */}
        {isFullAboveLimit && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Payment Threshold Notice (₹{maxOnlineLimit.toLocaleString("en-IN")} Single Limit)</span>
            </div>
            <p className="leading-relaxed">
              Your outstanding balance of <strong>₹{outstandingBalance.toLocaleString("en-IN")}</strong> exceeds the single online transaction threshold of ₹{maxOnlineLimit.toLocaleString("en-IN")}.
              You can easily complete this booking by choosing <strong>Deposit / Split Payment</strong> (pay ₹{depositAmount.toLocaleString("en-IN")} online now) or <strong>Direct Bank Transfer / Branch Payment</strong>.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Summary & Payment Options */}
          <div className="md:col-span-7 space-y-6">
            {/* Journey Summary Card */}
            <div className="p-6 rounded-3xl bg-white border border-[#E4E5E7] shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#E4E5E7]">
                <span className="text-xs uppercase tracking-wider text-[#24292F] font-semibold flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  Journey Summary
                </span>
                <span
                  className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-full font-semibold border ${
                    booking.payment_status === "paid"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : booking.payment_status === "partially_paid"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-[#ECEFF3] text-[#24292F] border-[#D3D8DF]"
                  }`}
                >
                  {booking.payment_status === "partially_paid"
                    ? "Partially Paid"
                    : booking.payment_status === "paid"
                    ? "Fully Paid"
                    : "Payment Pending"}
                </span>
              </div>

              <div>
                <h2 className="text-xl font-serif font-bold text-[#202124]">{booking.package_title}</h2>
                <p className="text-xs text-[#70757A] mt-1">{booking.destination_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-[#E4E5E7] text-xs">
                <div className="space-y-1">
                  <span className="text-[#70757A] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#24292F]" /> Departure Date
                  </span>
                  <span className="text-[#202124] font-medium block">
                    {new Date(booking.departure_date).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[#70757A] flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[#24292F]" /> Travellers
                  </span>
                  <span className="text-[#202124] font-medium block">
                    {booking.number_of_travellers} Traveller{booking.number_of_travellers > 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Outstanding Ledger Balance */}
              <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] grid grid-cols-3 gap-3 text-center text-xs">
                <div>
                  <span className="text-[10px] uppercase text-[#70757A] font-semibold block">Total Package</span>
                  <span className="font-serif font-bold text-[#202124] text-base">
                    ₹{totalAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[#70757A] font-semibold block">Amount Paid</span>
                  <span className="font-serif font-bold text-emerald-700 text-base">
                    ₹{totalPaid.toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[#70757A] font-semibold block">Outstanding</span>
                  <span className="font-serif font-bold text-rose-700 text-base">
                    ₹{outstandingBalance.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Travellers List */}
              <div className="space-y-2">
                <span className="text-[11px] uppercase tracking-wider text-[#70757A] font-semibold block">
                  Registered Travellers ({booking.travellers?.length || 0})
                </span>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {booking.travellers?.map((traveller, idx) => (
                    <div
                      key={traveller.id}
                      className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7]"
                    >
                      <span className="text-[#202124] font-medium">
                        {idx + 1}. {traveller.first_name} {traveller.last_name}
                      </span>
                      {traveller.is_primary && (
                        <span className="text-[10px] text-[#24292F] uppercase font-semibold bg-[#ECEFF3] px-2 py-0.5 rounded-full border border-[#D3D8DF]">
                          Lead Contact
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bank Transfer Instructions & UTR Submission Form */}
            {(paymentMethod === "bank_transfer" || paymentMethod === "branch_cash") && bankDetails && (
              <div className="p-6 rounded-3xl bg-white border border-[#E4E5E7] shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#E4E5E7]">
                  <span className="text-xs uppercase tracking-wider text-[#24292F] font-semibold flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#24292F]" />
                    {paymentMethod === "bank_transfer"
                      ? "Official Bank Account Details"
                      : `${shortName || displayName} Branch Office Payment`}
                  </span>
                  <span className="text-[11px] text-[#70757A]">Ref: {booking.booking_reference}</span>
                </div>

                {/* Bank Account Details Box */}
                {paymentMethod === "bank_transfer" && (
                  <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] uppercase text-[#70757A] font-semibold block">
                          Account Holder
                        </span>
                        <span className="font-semibold text-[#202124] block">
                          {bankDetails.account_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-[#70757A] font-semibold block">
                          Bank & Branch
                        </span>
                        <span className="font-semibold text-[#202124] block">
                          {bankDetails.bank_name} • {bankDetails.branch_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-[#70757A] font-semibold block">
                          Account Number
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono font-bold text-[#202124] text-sm">
                            {bankDetails.account_number}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(bankDetails.account_number, "acc")}
                            className="p-1 text-[#70757A] hover:text-[#202124]"
                            title="Copy Account Number"
                          >
                            {copiedField === "acc" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-[#70757A] font-semibold block">
                          IFSC Code
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono font-bold text-[#202124] text-sm">
                            {bankDetails.ifsc_code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(bankDetails.ifsc_code, "ifsc")}
                            className="p-1 text-[#70757A] hover:text-[#202124]"
                            title="Copy IFSC Code"
                          >
                            {copiedField === "ifsc" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      {bankDetails.upi_id && (
                        <div>
                          <span className="text-[10px] uppercase text-[#70757A] font-semibold block">
                            UPI ID
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono font-bold text-[#202124]">
                              {bankDetails.upi_id}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(bankDetails.upi_id || "", "upi")}
                              className="p-1 text-[#70757A] hover:text-[#202124]"
                              title="Copy UPI ID"
                            >
                              {copiedField === "upi" ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] uppercase text-[#70757A] font-semibold block">
                          Account Type
                        </span>
                        <span className="font-medium text-[#202124]">
                          {bankDetails.account_type || "Current Account"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E4E5E7] text-[11px] text-[#5F6368] space-y-1">
                      <p>
                        <strong>Payment Instructions:</strong> {bankDetails.payment_instructions}
                      </p>
                      <p className="text-amber-800">
                        Important: Please include <strong>{booking.booking_reference}</strong> in your NEFT / IMPS / UPI description or remarks.
                      </p>
                    </div>
                  </div>
                )}

                {/* Branch Payment Info */}
                {paymentMethod === "branch_cash" && (
                  <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-[#202124]">
                      <MapPin className="w-4 h-4 text-[#C5A880]" />
                      <span>{displayName} — {city || "Concierge"} Office</span>
                    </div>
                    <p className="text-[#5F6368] leading-relaxed">
                      Visit our registered concierge office at Cross Cut Road, Gandhipuram, Coimbatore. Quote booking reference <strong>{booking.booking_reference}</strong> to our finance team to complete payment and collect your physical stamped tax invoice.
                    </p>
                    <p className="text-[#70757A] text-[11px]">
                      Desk Helpline: {bankDetails.payment_contact_phone || "+91 98422 12345"}
                    </p>
                  </div>
                )}

                {/* Pending Transfer Status Banner */}
                {pendingBankTransfer ? (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-800">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Awaiting Payment Verification</span>
                    </div>
                    <p className="leading-relaxed">
                      Your transfer reference <strong>{pendingBankTransfer.provider_payment_id}</strong> for <strong>₹{Number(pendingBankTransfer.amount).toLocaleString("en-IN")}</strong> has been registered. Our accounts team will reconcile this against bank statements and credit your reservation shortly.
                    </p>
                    <span className="text-[10px] text-amber-700 block">
                      Submitted on: {new Date(pendingBankTransfer.created_at).toLocaleString("en-IN")}
                    </span>
                  </div>
                ) : (
                  /* Transfer Reference Submission Form */
                  <form onSubmit={handleSubmitBankTransfer} className="space-y-4 pt-2">
                    <div className="font-semibold text-xs text-[#202124]">
                      Submit Transfer Reference / UTR for Verification
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        UTR / Transaction Reference Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 12 to 22 digit UTR / IMPS / RRN reference"
                        value={transferReference}
                        onChange={(e) => setTransferReference(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs font-mono text-[#202124] focus:outline-none focus:border-[#C5A880]"
                      />
                      <span className="text-[10px] text-[#70757A] mt-1 block">
                        Format: {bankDetails.required_reference_format || "12 to 22 digit alphanumeric reference"}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#202124] mb-1">
                        Payment Remarks / Bank Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Transferred from HDFC Bank, account ending in 4321"
                        value={transferNotes}
                        onChange={(e) => setTransferNotes(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingTransfer || !transferReference.trim()}
                      className="w-full py-3.5 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmittingTransfer ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Submitting Transfer for Verification...</span>
                        </>
                      ) : (
                        <>
                          <FileCheck className="w-4 h-4" />
                          <span>Submit Reference for Verification</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Payment Method Selection & Checkout Card */}
          <div className="md:col-span-5 space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E4E5E7] shadow-lg space-y-6">
              {/* Seat Hold Status Banner */}
              <div
                className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
                  isHoldExpired
                    ? "bg-rose-50 border-rose-200 text-rose-700"
                    : "bg-[#ECEFF3] border-[#D3D8DF] text-[#24292F]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">
                    {isHoldExpired ? "Seat Hold Expired" : "Seat Hold Active"}
                  </span>
                </div>
                <div className="font-mono font-bold text-sm">
                  {secondsRemaining !== null && !isHoldExpired
                    ? formatCountdown(secondsRemaining)
                    : isHoldExpired
                    ? "00:00"
                    : "--:--"}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-3">
                <label className="block text-xs uppercase tracking-wider text-[#70757A] font-semibold">
                  Select Payment Option
                </label>
                <div className="space-y-2">
                  {/* Full Online */}
                  <button
                    type="button"
                    disabled={isFullAboveLimit}
                    onClick={() => setPaymentMethod("full_online")}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all ${
                      paymentMethod === "full_online"
                        ? "bg-[#24292F] border-[#24292F] text-white shadow-xs"
                        : isFullAboveLimit
                        ? "bg-[#F7F7F5] border-[#E4E5E7] opacity-50 cursor-not-allowed text-[#70757A]"
                        : "bg-[#F7F7F5] border-[#E4E5E7] text-[#202124] hover:border-[#24292F]/40 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" />
                        Full Online Payment
                      </span>
                      {isFullAboveLimit && (
                        <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          Exceeds ₹5L Limit
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] block ${
                        paymentMethod === "full_online" ? "text-white/80" : "text-[#70757A]"
                      }`}
                    >
                      Pay ₹{outstandingBalance.toLocaleString("en-IN")} in full via Cards, UPI, or NetBanking
                    </span>
                  </button>

                  {/* Split / Deposit Payment */}
                  {(bankDetails?.split_payments_enabled ?? true) && outstandingBalance > depositAmount && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("deposit_online")}
                      className={`w-full p-3.5 rounded-2xl border text-left transition-all ${
                        paymentMethod === "deposit_online"
                          ? "bg-[#24292F] border-[#24292F] text-white shadow-xs"
                          : "bg-[#F7F7F5] border-[#E4E5E7] text-[#202124] hover:border-[#24292F]/40 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5" />
                          Deposit / Split Payment ({depositPercentage}%)
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            paymentMethod === "deposit_online"
                              ? "bg-white/20 text-white border-white/30"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          Recommended
                        </span>
                      </div>
                      <span
                        className={`text-[11px] block ${
                          paymentMethod === "deposit_online" ? "text-white/80" : "text-[#70757A]"
                        }`}
                      >
                        Pay ₹{depositAmount.toLocaleString("en-IN")} now to lock seats; pay remaining ₹{(outstandingBalance - depositAmount).toLocaleString("en-IN")} later
                      </span>
                    </button>
                  )}

                  {/* Direct Bank Transfer */}
                  {(bankDetails?.bank_transfer_enabled ?? true) && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("bank_transfer")}
                      className={`w-full p-3.5 rounded-2xl border text-left transition-all ${
                        paymentMethod === "bank_transfer"
                          ? "bg-[#24292F] border-[#24292F] text-white shadow-xs"
                          : "bg-[#F7F7F5] border-[#E4E5E7] text-[#202124] hover:border-[#24292F]/40 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5" />
                          NEFT / RTGS / Bank Transfer
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            paymentMethod === "bank_transfer"
                              ? "bg-white/20 text-white border-white/30"
                              : "bg-[#ECEFF3] text-[#24292F] border-[#D3D8DF]"
                          }`}
                        >
                          No Gateway Limit
                        </span>
                      </div>
                      <span
                        className={`text-[11px] block ${
                          paymentMethod === "bank_transfer" ? "text-white/80" : "text-[#70757A]"
                        }`}
                      >
                        Transfer to our HDFC Bank account and submit reference/UTR
                      </span>
                    </button>
                  )}

                  {/* Branch Cash Payment */}
                  {(bankDetails?.branch_payment_enabled ?? true) && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("branch_cash")}
                      className={`w-full p-3.5 rounded-2xl border text-left transition-all ${
                        paymentMethod === "branch_cash"
                          ? "bg-[#24292F] border-[#24292F] text-white shadow-xs"
                          : "bg-[#F7F7F5] border-[#E4E5E7] text-[#202124] hover:border-[#24292F]/40 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          Branch Office Payment
                        </span>
                      </div>
                      <span
                        className={`text-[11px] block ${
                          paymentMethod === "branch_cash" ? "text-white/80" : "text-[#70757A]"
                        }`}
                      >
                        Pay at our Coimbatore office in person
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2.5 text-xs pt-4 border-t border-[#E4E5E7]">
                <div className="flex justify-between text-[#70757A]">
                  <span>Total Booking Amount</span>
                  <span className="font-mono text-[#202124] font-medium">
                    ₹{totalAmount.toLocaleString("en-IN")}
                  </span>
                </div>

                {totalPaid > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Already Paid</span>
                    <span className="font-mono">
                      -₹{totalPaid.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-[#70757A]">
                  <span>Outstanding Balance</span>
                  <span className="font-mono text-rose-700 font-bold">
                    ₹{outstandingBalance.toLocaleString("en-IN")}
                  </span>
                </div>

                {paymentMethod === "deposit_online" && (
                  <div className="flex justify-between text-blue-600 font-medium pt-1">
                    <span>Balance Remaining After Today</span>
                    <span className="font-mono">
                      ₹{remainingAfterPayment.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-[#E4E5E7] flex justify-between items-baseline">
                  <span className="text-sm font-bold uppercase tracking-wider text-[#202124]">
                    Amount Payable Now
                  </span>
                  <div className="text-right">
                    <span className="text-2xl font-serif font-bold text-[#202124]">
                      ₹{payableNow.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-[#70757A] block uppercase font-mono">
                      {booking.currency} • Authoritative Total
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="p-3.5 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[11px] text-[#70757A] space-y-1">
                <div className="flex items-center gap-1.5 text-[#202124] font-semibold text-[11px]">
                  <Lock className="w-3.5 h-3.5 text-[#24292F]" />
                  <span>Verified & Protected Checkout</span>
                </div>
                <p className="leading-relaxed">
                  Every transaction is secured via HMAC-SHA256 signature verification and recorded in an immutable financial ledger.
                </p>
              </div>

              {/* Action Button */}
              {isHoldExpired ? (
                <div className="space-y-3">
                  <p className="text-xs text-rose-600 text-center font-medium">
                    The 30-minute hold window for these seats has passed.
                  </p>
                  <Link
                    href={`/packages/${booking.package_slug || ""}`}
                    className="w-full py-4 rounded-full bg-white border border-[#E4E5E7] text-[#202124] text-xs uppercase tracking-widest font-semibold hover:bg-[#F3F4F4] transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Re-select Journey Dates</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : paymentMethod === "bank_transfer" || paymentMethod === "branch_cash" ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-[#70757A] text-center">
                    Please use the bank details on the left to transfer and submit your reference.
                  </p>
                </div>
              ) : siteSettings && !siteSettings.online_payments_enabled ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2">
                    <div className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                      <AlertCircle className="w-4 h-4 text-amber-700" />
                      <span>Online Checkout Temporarily Paused</span>
                    </div>
                    <p className="leading-relaxed">
                      {siteSettings.online_payments_maintenance_message ||
                        `Online card/UPI checkout is temporarily paused for routine maintenance. Please choose Bank Transfer or contact our ${city || "concierge"} desk directly.`}
                    </p>
                  </div>

                  {whatsappEnabled && getWhatsAppUrl(
                    `Hello ${displayName}! My booking reference is ${booking.booking_reference} for "${booking.package_title}" (Total: ₹${Number(booking.total).toLocaleString("en-IN")}). Please assist me with payment confirmation.`
                  ) ? (
                    <a
                      href={getWhatsAppUrl(
                        `Hello ${displayName}! My booking reference is ${booking.booking_reference} for "${booking.package_title}" (Total: ₹${Number(booking.total).toLocaleString("en-IN")}). Please assist me with payment confirmation.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-4 rounded-full bg-[#0D7A53] hover:bg-[#0A6242] text-white text-xs uppercase tracking-widest font-semibold shadow-lg shadow-emerald-900/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Confirm on WhatsApp Concierge</span>
                    </a>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isInitiating || isVerifying || isHoldExpired || (paymentMethod === "full_online" && isFullAboveLimit)}
                  onClick={handleProceedPayment}
                  className="w-full py-4 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-semibold shadow-lg shadow-[#24292F]/20 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isInitiating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Opening Secure Checkout...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>
                        Pay ₹{payableNow.toLocaleString("en-IN")}{" "}
                        {paymentMethod === "deposit_online" ? "Deposit" : ""} via Razorpay
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function PaymentPage() {
  return (
    <PublicLayout>
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center text-[#70757A]">
            <Loader2 className="w-8 h-8 animate-spin text-[#24292F]" />
          </div>
        }
      >
        <PaymentContent />
      </Suspense>
    </PublicLayout>
  );
}
