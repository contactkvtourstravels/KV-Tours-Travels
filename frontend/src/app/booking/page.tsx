"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Compass,
  CreditCard,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Tag,
} from "lucide-react";
import {
  bookingApi,
  publicCatalogApi,
  customerApi,
  type BookingCreateRequest,
  type BookingDetailResponse,
  type BookingTravellerCreate,
  type PriceCalculationResponse,
  type PublicAddOnSummary,
  type PublicDepartureSummary,
  type PublicPackageDetail,
  type SavedTraveller,
  type PublicSiteSettings,
} from "@/lib/api";
import { PublicLayout } from "@/components/public/PublicLayout";
import { useBranding } from "@/context/BrandingContext";

function BookingFlow() {
  const { displayName, shortName, city, getWhatsAppUrl, whatsappEnabled } = useBranding();
  const searchParams = useSearchParams();
  const router = useRouter();
  const packageSlug = searchParams.get("package") || "";
  const initialDepartureId = searchParams.get("departure") || "";
  const initialOfferId = searchParams.get("offer_id") || "";

  // Data fetching state
  const [pkg, setPkg] = useState<PublicPackageDetail | null>(null);
  const [siteSettings, setSiteSettings] = useState<PublicSiteSettings | null>(null);
  const [departures, setDepartures] = useState<PublicDepartureSummary[]>([]);
  const [availableAddOns, setAvailableAddOns] = useState<PublicAddOnSummary[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Booking Flow State
  const [selectedDepartureId, setSelectedDepartureId] = useState(initialDepartureId);
  const [offerId, setOfferId] = useState(initialOfferId);
  const [travellerCount, setTravellerCount] = useState(1);
  const [travellers, setTravellers] = useState<BookingTravellerCreate[]>([
    {
      first_name: "",
      last_name: "",
      contact_email: "",
      contact_phone: "",
      is_primary: true,
      gender: "undisclosed",
      nationality: "IND",
    },
  ]);
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, number>>({});
  const [couponCode, setCouponCode] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [savedTravellers, setSavedTravellers] = useState<SavedTraveller[]>([]);

  // Load saved traveller profiles if customer is logged in
  useEffect(() => {
    customerApi
      .getTravellers()
      .then(setSavedTravellers)
      .catch(() => {
        // Guest or unauthenticated - ignore
      });
  }, []);

  // Live Price Calculation State
  const [pricing, setPricing] = useState<PriceCalculationResponse | null>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Submission State
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completedBooking, setCompletedBooking] = useState<BookingDetailResponse | null>(null);

  // Load Package, Departures, and Add-ons
  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!packageSlug) {
        setLoadingData(false);
        return;
      }
      try {
        const [pkgData, depsData, settingsData] = await Promise.all([
          publicCatalogApi.getPackage(packageSlug),
          publicCatalogApi.getPackageDepartures(packageSlug),
          publicCatalogApi.getSettings().catch(() => null),
        ]);
        if (isMounted) {
          setPkg(pkgData);
          setSiteSettings(settingsData);
          setDepartures(depsData);
          setAvailableAddOns(pkgData.add_ons ?? []);

          // Auto-select departure if specified or first open departure
          if (initialDepartureId && depsData.some((d) => d.id === initialDepartureId)) {
            setSelectedDepartureId(initialDepartureId);
          } else if (depsData.length > 0) {
            const firstAvailable = depsData.find((d) => d.available_capacity > 0) || depsData[0];
            setSelectedDepartureId(firstAvailable.id);
          }
        }
      } catch {
        if (isMounted) {
          setSubmitError("Failed to load journey details. Please check the URL or try again.");
        }
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [packageSlug, initialDepartureId]);

  // Selected departure and dynamic capacity limits
  const selectedDep = departures.find((d) => d.id === selectedDepartureId);
  const minAllowed = pkg ? Math.max(1, pkg.minimum_travellers || 1) : 1;
  const maxCapacity = selectedDep
    ? Math.min(
        100,
        Math.min(
          pkg?.maximum_travellers || 100,
          selectedDep.available_capacity > 0 ? selectedDep.available_capacity : 100,
        ),
      )
    : Math.min(100, pkg?.maximum_travellers || 100);

  // Adjust travellers list when count changes (supporting 1-100)
  const handleTravellerCountChange = (newCount: number) => {
    const safeCount = isNaN(newCount) ? minAllowed : newCount;
    const clamped = Math.max(minAllowed, Math.min(safeCount, maxCapacity));
    setTravellerCount(clamped);

    setTravellers((prev) => {
      const updated = [...prev];
      while (updated.length < clamped) {
        updated.push({
          first_name: "",
          last_name: "",
          gender: "undisclosed",
          nationality: "IND",
          is_primary: false,
        });
      }
      return updated.slice(0, clamped);
    });
  };

  // Recalculate price whenever departure, travellers, add-ons, or coupon changes
  useEffect(() => {
    if (!pkg || !selectedDepartureId) return;

    let isMounted = true;
    const addOnList = Object.entries(selectedAddOns)
      .filter(([, qty]) => qty > 0)
      .map(([id, quantity]) => ({ add_on_id: id, quantity }));

    setCalculatingPrice(true);
    setPriceError(null);

    const timer = setTimeout(async () => {
      try {
        const result = await bookingApi.calculatePrice({
          package_id: pkg.id,
          departure_id: selectedDepartureId,
          number_of_travellers: travellerCount,
          add_ons: addOnList,
          coupon_code: couponCode.trim() || undefined,
          offer_id: offerId.trim() || undefined,
        });
        if (isMounted) {
          setPricing(result);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setPriceError((err as Error).message || "Failed to calculate current price.");
        }
      } finally {
        if (isMounted) setCalculatingPrice(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      isMounted = false;
    };
  }, [pkg, selectedDepartureId, travellerCount, selectedAddOns, couponCode, offerId]);

  // Handle AddOn Toggle
  const toggleAddOn = (addOnId: string) => {
    setSelectedAddOns((prev) => {
      const updated = { ...prev };
      if (updated[addOnId]) {
        delete updated[addOnId];
      } else {
        updated[addOnId] = travellerCount;
      }
      return updated;
    });
  };

  // Update Traveller Field
  const updateTraveller = (
    index: number,
    field: keyof BookingTravellerCreate,
    value: string | boolean | null
  ) => {
    setTravellers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Quick-fill from Saved Traveller Profile
  const applySavedTraveller = (index: number, st: SavedTraveller) => {
    setTravellers((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        first_name: st.first_name,
        last_name: st.last_name,
        gender: st.gender || "undisclosed",
        date_of_birth: st.date_of_birth || undefined,
        contact_phone: st.contact_phone || copy[index].contact_phone,
        contact_email: st.contact_email || copy[index].contact_email,
      };
      return copy;
    });
  };

  // Submit Booking
  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!pkg || !selectedDepartureId) {
      setSubmitError("Please select a package and departure date.");
      return;
    }

    if (selectedDep && travellerCount > selectedDep.available_capacity) {
      setSubmitError(
        `Only ${selectedDep.available_capacity} seat(s) remain on this departure. Please select up to ${selectedDep.available_capacity} travellers.`,
      );
      return;
    }

    if (travellerCount < minAllowed || travellerCount > 100) {
      setSubmitError(
        `Please select between ${minAllowed} and 100 travellers for this booking.`,
      );
      return;
    }

    // Validate travellers
    for (let i = 0; i < travellers.length; i++) {
      const t = travellers[i];
      if (!t.first_name.trim() || !t.last_name.trim()) {
        setSubmitError(`Please enter first and last name for Traveller #${i + 1}.`);
        return;
      }
      if (i === 0 && (!t.contact_email?.trim() || !t.contact_phone?.trim())) {
        setSubmitError("Lead traveller email and contact phone are required.");
        return;
      }
    }

    const addOnList = Object.entries(selectedAddOns)
      .filter(([, qty]) => qty > 0)
      .map(([id, quantity]) => ({ add_on_id: id, quantity }));

    // Generate unique idempotency key for this submission attempt
    const idempotencyKey = `bk-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const payload: BookingCreateRequest = {
      package_id: pkg.id,
      departure_id: selectedDepartureId,
      number_of_travellers: travellerCount,
      travellers,
      add_ons: addOnList,
      coupon_code: couponCode.trim() || undefined,
      offer_id: offerId.trim() || undefined,
      customer_notes: customerNotes.trim() || undefined,
      idempotency_key: idempotencyKey,
    };

    startTransition(async () => {
      try {
        const result = await bookingApi.createBooking(payload, idempotencyKey);
        setCompletedBooking(result);
        router.push(`/booking/payment/${result.booking_reference}`);
      } catch (err: unknown) {
        const errObj = err as { status?: number; message?: string };
        if (errObj.status === 401 || errObj.message?.includes("Authentication")) {
          // Redirect to login preserving the booking URL
          router.push(`/login?redirect=/booking?package=${packageSlug}%26departure=${selectedDepartureId}`);
        } else {
          setSubmitError(
            errObj.message || "Failed to create booking. Please check availability or try again."
          );
        }
      }
    });
  };

  if (loadingData) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-[#70757A]">
        <Loader2 className="w-8 h-8 animate-spin text-[#24292F]" />
        <p className="text-xs uppercase tracking-widest text-[#70757A] font-medium">Preparing Booking Concierge...</p>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="py-24 text-center max-w-xl mx-auto px-4">
        <div className="w-16 h-16 rounded-full bg-[#ECEFF3] border border-[#D3D8DF] flex items-center justify-center mx-auto mb-4 text-[#24292F]">
          <Compass className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-[#202124] mb-2">No Journey Selected</h2>
        <p className="text-[#70757A] text-sm mb-6">
          Please explore our curated destinations or signature packages to begin your reservation.
        </p>
        <Link
          href="/packages"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#24292F] text-white text-xs uppercase tracking-widest font-semibold hover:bg-[#3D4450] shadow-xs transition-all"
        >
          Explore Journeys
        </Link>
      </div>
    );
  }

  // Confirmation Success View
  if (completedBooking) {
    const waUrl = getWhatsAppUrl(
      `Hello ${displayName}! I have created booking reference ${completedBooking.booking_reference} for ${completedBooking.package_title} (${completedBooking.number_of_travellers} travellers, Total: ₹${Number(completedBooking.total).toLocaleString("en-IN")}). Please guide me on payment and confirmation details.`
    );

    return (
      <div className="py-16 max-w-3xl mx-auto px-4 sm:px-6">
        <div className="p-8 sm:p-12 rounded-3xl bg-white border border-[#E4E5E7] text-center space-y-8 shadow-xl relative overflow-hidden">
          <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="inline-block px-3 py-1 rounded-full border border-[#D3D8DF] bg-[#ECEFF3] text-[#24292F] text-xs uppercase tracking-widest font-semibold mb-3">
              Status: Payment Pending
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#202124]">
              Reservation Created
            </h1>
            <p className="text-[#70757A] text-sm max-w-md mx-auto mt-2">
              Your seats have been temporarily reserved. Payment has not been processed.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] text-left space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-[#E4E5E7] gap-2">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#70757A] block">Booking Reference</span>
                <span className="text-lg font-mono font-bold text-[#24292F]">{completedBooking.booking_reference}</span>
              </div>
              <div className="text-sm text-[#70757A]">
                <span>Hold Active: </span>
                <span className="text-[#202124] font-medium">30 Minutes</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#70757A] block">Journey</span>
                <span className="text-[#202124] font-medium">{completedBooking.package_title}</span>
              </div>
              <div>
                <span className="text-[#70757A] block">Travellers</span>
                <span className="text-[#202124] font-medium">{completedBooking.number_of_travellers} Person(s)</span>
              </div>
              <div>
                <span className="text-[#70757A] block">Departure Date</span>
                <span className="text-[#202124] font-medium">{completedBooking.departure_date}</span>
              </div>
              <div>
                <span className="text-[#70757A] block">Authoritative Total</span>
                <span className="text-[#24292F] font-bold text-sm">
                  ₹{Number(completedBooking.total).toLocaleString("en-IN")} {completedBooking.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Action Notice */}
          <div className="p-4 rounded-xl bg-[#F0F2F5] border border-[#D3D8DF] text-[#202124] text-xs text-left flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-[#24292F] flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-[#24292F]">Seat Hold Active:</strong> Your seats are temporarily reserved for 30 minutes. Please complete payment via Razorpay to authoritatively confirm your journey.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={`/booking/payment/${completedBooking.booking_reference}`}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-semibold shadow-xs hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>Proceed to Secure Payment (Razorpay)</span>
            </Link>
            {whatsappEnabled && Boolean(waUrl) && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-4 rounded-full border border-[#E4E5E7] bg-white text-[#202124] text-xs uppercase tracking-widest font-semibold hover:bg-[#F3F4F4] transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp Support</span>
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="mb-10 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D3D8DF] bg-[#ECEFF3] text-[#24292F] text-xs uppercase tracking-widest font-semibold mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-[#5F6368]" />
          <span>Official {displayName} Checkout</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#202124] tracking-tight">
          Reserve Your Journey
        </h1>
        <p className="mt-2 text-[#70757A] text-sm">
          Complete traveller information and preferences for {pkg.name}.
        </p>
      </div>

      {submitError && (
        <div className="mb-8 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <span>{submitError}</span>
          <button
            onClick={() => setSubmitError(null)}
            className="text-[#70757A] hover:text-[#202124] text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleBookingSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Steps (7 Cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* Step 1: Departure & Travellers */}
          <section className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E4E5E7] shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[#E4E5E7]">
              <span className="w-7 h-7 rounded-full bg-[#24292F] text-white text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h2 className="text-lg font-serif font-bold text-[#202124]">Departure & Group Size</h2>
            </div>

            {/* Departure Selector */}
            <div className="space-y-3">
              <label className="block text-xs uppercase tracking-wider text-[#70757A] font-semibold">
                Select Departure Date *
              </label>
              {departures.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#70757A] text-xs">
                  No upcoming group departures currently scheduled. Please enquire for bespoke custom dates.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {departures.map((d) => {
                    const isSelected = d.id === selectedDepartureId;
                    const isSoldOut = d.available_capacity <= 0 || d.status === "sold_out";

                    return (
                      <button
                        type="button"
                        key={d.id}
                        disabled={isSoldOut}
                        onClick={() => setSelectedDepartureId(d.id)}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? "bg-[#24292F] border-[#24292F] text-white shadow-xs"
                            : isSoldOut
                            ? "bg-[#F3F4F4] border-[#E4E5E7] opacity-50 cursor-not-allowed text-[#70757A]"
                            : "bg-[#F7F7F5] border-[#E4E5E7] text-[#202124] hover:border-[#24292F]/40 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-semibold ${isSelected ? "text-white" : "text-[#202124]"}`}>{d.departure_date}</span>
                          {isSoldOut ? (
                            <span className="text-[10px] uppercase font-bold text-rose-600">Sold Out</span>
                          ) : (
                            <span className={`text-[10px] font-semibold ${isSelected ? "text-[#ECEFF3]" : "text-[#3D4450]"}`}>
                              {d.available_capacity} seat{d.available_capacity > 1 ? "s" : ""} left
                            </span>
                          )}
                        </div>
                        <span className={`text-[11px] block ${isSelected ? "text-white/80" : "text-[#70757A]"}`}>
                          Return: {d.return_date || "Flexible"}
                        </span>
                        {d.special_price && (
                          <span className={`text-[11px] font-bold mt-1 block ${isSelected ? "text-white" : "text-[#24292F]"}`}>
                            Special: ₹{Number(d.special_price).toLocaleString("en-IN")}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Traveller Count */}
            <div className="space-y-4 pt-4 border-t border-[#E4E5E7]">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div>
                  <label className="text-xs uppercase tracking-wider text-[#70757A] font-semibold block">
                    Number of Travellers (1–100)
                  </label>
                  <p className="text-[11px] text-[#70757A] mt-0.5">
                    Package range: Min {pkg.minimum_travellers || 1} • Max {pkg.maximum_travellers || 100} guests
                  </p>
                </div>
                {selectedDep && (
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        selectedDep.available_capacity > 10
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : selectedDep.available_capacity > 0
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          selectedDep.available_capacity > 10
                            ? "bg-emerald-500"
                            : selectedDep.available_capacity > 0
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                      />
                      {selectedDep.available_capacity} seat{selectedDep.available_capacity !== 1 ? "s" : ""} available
                    </span>
                  </div>
                )}
              </div>

              {/* Compact Number Selector with Plus/Minus & Direct Entry */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="inline-flex items-center p-1 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] shadow-xs">
                  <button
                    type="button"
                    aria-label="Decrease traveller count"
                    onClick={() => handleTravellerCountChange(travellerCount - 1)}
                    disabled={travellerCount <= minAllowed}
                    className="w-10 h-10 rounded-xl bg-white border border-[#E4E5E7] text-[#202124] text-lg font-bold flex items-center justify-center hover:bg-[#F3F4F4] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
                  >
                    −
                  </button>
                  <div className="px-3">
                    <input
                      type="number"
                      min={minAllowed}
                      max={maxCapacity}
                      value={travellerCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          handleTravellerCountChange(val);
                        }
                      }}
                      className="w-16 text-center text-base font-bold text-[#202124] bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-[10px] uppercase font-semibold text-[#70757A] block text-center -mt-1">
                      {travellerCount === 1 ? "Guest" : "Guests"}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label="Increase traveller count"
                    onClick={() => handleTravellerCountChange(travellerCount + 1)}
                    disabled={travellerCount >= maxCapacity}
                    className="w-10 h-10 rounded-xl bg-white border border-[#E4E5E7] text-[#202124] text-lg font-bold flex items-center justify-center hover:bg-[#F3F4F4] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
                  >
                    +
                  </button>
                </div>

                {/* Quick Party Size Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-[#70757A] font-medium mr-1">Quick:</span>
                  {[1, 2, 4, 10, 25, 50, 100]
                    .filter((n) => n <= maxCapacity && n >= minAllowed)
                    .map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleTravellerCountChange(num)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          travellerCount === num
                            ? "bg-[#24292F] text-white shadow-xs"
                            : "bg-[#F7F7F5] border border-[#E4E5E7] text-[#70757A] hover:text-[#202124] hover:bg-white"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </section>

          {/* Step 2: Traveller Details */}
          <section className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E4E5E7] shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[#E4E5E7]">
              <span className="w-7 h-7 rounded-full bg-[#24292F] text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h2 className="text-lg font-serif font-bold text-[#202124]">Traveller Details</h2>
            </div>

            <div className="space-y-6">
              {travellers.map((traveller, idx) => {
                const isLead = idx === 0;

                return (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#24292F]">
                        {isLead ? "Lead Traveller (Contact Person)" : `Traveller #${idx + 1}`}
                      </span>
                      <div className="flex items-center gap-2">
                        {savedTravellers.length > 0 && (
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              const found = savedTravellers.find((st) => st.id === e.target.value);
                              if (found) {
                                applySavedTraveller(idx, found);
                              }
                              e.target.value = "";
                            }}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-[#E4E5E7] text-[#202124] focus:border-[#24292F] focus:outline-none"
                          >
                            <option value="" disabled>
                              Quick fill from saved profile...
                            </option>
                            {savedTravellers.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.first_name} {st.last_name} ({st.relationship_label || "Companion"})
                              </option>
                            ))}
                          </select>
                        )}
                        {isLead && (
                          <span className="text-[10px] bg-[#ECEFF3] text-[#24292F] border border-[#D3D8DF] px-2 py-0.5 rounded-full font-semibold">
                            Primary
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] text-[#70757A] mb-1 font-medium">First Name *</label>
                        <input
                          type="text"
                          required
                          value={traveller.first_name}
                          onChange={(e) => updateTraveller(idx, "first_name", e.target.value)}
                          placeholder="First name"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E4E5E7] text-[#202124] text-xs placeholder-[#70757A] focus:border-[#24292F] focus:outline-none focus:ring-1 focus:ring-[#24292F]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#70757A] mb-1 font-medium">Last Name *</label>
                        <input
                          type="text"
                          required
                          value={traveller.last_name}
                          onChange={(e) => updateTraveller(idx, "last_name", e.target.value)}
                          placeholder="Last name"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E4E5E7] text-[#202124] text-xs placeholder-[#70757A] focus:border-[#24292F] focus:outline-none focus:ring-1 focus:ring-[#24292F]"
                        />
                      </div>

                      {isLead && (
                        <>
                          <div>
                            <label className="block text-[11px] text-[#70757A] mb-1 font-medium">Email Address *</label>
                            <input
                              type="email"
                              required
                              value={traveller.contact_email || ""}
                              onChange={(e) => updateTraveller(idx, "contact_email", e.target.value)}
                              placeholder="contact@example.com"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E4E5E7] text-[#202124] text-xs placeholder-[#70757A] focus:border-[#24292F] focus:outline-none focus:ring-1 focus:ring-[#24292F]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#70757A] mb-1 font-medium">Contact Phone *</label>
                            <input
                              type="tel"
                              required
                              value={traveller.contact_phone || ""}
                              onChange={(e) => updateTraveller(idx, "contact_phone", e.target.value)}
                              placeholder="+91 98422 12345"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E4E5E7] text-[#202124] text-xs placeholder-[#70757A] focus:border-[#24292F] focus:outline-none focus:ring-1 focus:ring-[#24292F]"
                            />
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-[11px] text-[#70757A] mb-1 font-medium">Gender</label>
                        <select
                          value={traveller.gender || "undisclosed"}
                          onChange={(e) => updateTraveller(idx, "gender", e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E4E5E7] text-[#202124] text-xs focus:border-[#24292F] focus:outline-none focus:ring-1 focus:ring-[#24292F]"
                        >
                          <option value="undisclosed">Prefer not to say</option>
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                          <option value="non_binary">Non-binary</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#70757A] mb-1 font-medium">Date of Birth</label>
                        <input
                          type="date"
                          value={traveller.date_of_birth || ""}
                          onChange={(e) => updateTraveller(idx, "date_of_birth", e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E4E5E7] text-[#202124] text-xs focus:border-[#24292F] focus:outline-none focus:ring-1 focus:ring-[#24292F]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Step 3: Curated Add-ons */}
          {availableAddOns.length > 0 && (
            <section className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E4E5E7] shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-[#E4E5E7]">
                <span className="w-7 h-7 rounded-full bg-[#24292F] text-white text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <h2 className="text-lg font-serif font-bold text-[#202124]">Curated Add-on Experiences</h2>
              </div>

              <div className="space-y-3">
                {availableAddOns.map((addon) => {
                  const isSelected = Boolean(selectedAddOns[addon.id]);

                  return (
                    <div
                      key={addon.id}
                      onClick={() => toggleAddOn(addon.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                        isSelected
                          ? "bg-[#24292F] text-white border-[#24292F] shadow-xs"
                          : "bg-[#F7F7F5] border-[#E4E5E7] text-[#202124] hover:border-[#24292F]/40 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-[#24292F] accent-[#24292F] focus:ring-0 cursor-pointer"
                        />
                        <div>
                          <span className={`text-xs font-bold block ${isSelected ? "text-white" : "text-[#202124]"}`}>{addon.name}</span>
                          <span className={`text-[11px] block ${isSelected ? "text-white/80" : "text-[#70757A]"}`}>
                            ₹{Number(addon.price).toLocaleString("en-IN")} per passenger
                          </span>
                        </div>
                      </div>
                      <span className={`text-xs font-mono font-bold ${isSelected ? "text-white" : "text-[#24292F]"}`}>
                        +₹{(Number(addon.price) * travellerCount).toLocaleString("en-IN")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Step 4: Special Notes */}
          <section className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E4E5E7] shadow-sm space-y-4">
            <label className="block text-xs uppercase tracking-wider text-[#70757A] font-semibold">
              Special Requests & Dietary Requirements (Optional)
            </label>
            <textarea
              rows={3}
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="e.g. Vegetarian meals preferred, celebrating anniversary, bed configuration requests..."
              className="w-full px-4 py-3 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] text-xs placeholder-[#70757A] focus:bg-white focus:border-[#24292F] focus:outline-none focus:ring-1 focus:ring-[#24292F] resize-none"
            />
          </section>
        </div>

        {/* Right Column: Sticky Price Summary & Checkout (5 Cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E4E5E7] shadow-lg space-y-6">
            <h3 className="text-lg font-serif font-bold text-[#202124] pb-3 border-b border-[#E4E5E7]">
              Price Breakdown
            </h3>

            {/* Selected Journey Preview */}
            <div className="flex items-center gap-3 text-xs">
              <div className="w-10 h-10 rounded-xl bg-[#ECEFF3] border border-[#D3D8DF] flex items-center justify-center text-[#24292F] flex-shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-[#202124] block">{pkg.name}</span>
                <span className="text-[#70757A] text-[11px]">
                  {selectedDep?.departure_date || "Date Pending"} • {travellerCount} Passenger{travellerCount > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Special Best Offer Applied Notice */}
            {pricing?.offer_title && (
              <div className="p-3 rounded-xl bg-[#DFBA73]/20 border border-[#DFBA73]/80 text-[#1B1E22] flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#8B6E30] shrink-0" />
                  <span>Offer Applied: {pricing.offer_title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#DFBA73] text-[#1B1E22] font-bold">
                    Verified
                  </span>
                  {offerId && (
                    <button
                      type="button"
                      onClick={() => setOfferId("")}
                      className="text-[10px] text-[#70757A] hover:text-[#202124] underline cursor-pointer"
                      title="Remove offer discount"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Promo Code Input */}
            <div className="pt-2">
              <label className="block text-[11px] uppercase tracking-wider text-[#70757A] font-semibold mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-[#3D4450]" />
                Promo / Coupon Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SAVE10"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] text-xs placeholder-[#70757A] focus:bg-white focus:border-[#24292F] focus:outline-none font-mono"
                />
              </div>
              {pricing?.coupon_message && (
                <p
                  className={`text-[11px] mt-1.5 ${
                    pricing.coupon_valid ? "text-emerald-600 font-medium" : "text-[#24292F] font-medium"
                  }`}
                >
                  {pricing.coupon_message}
                </p>
              )}
              {priceError && (
                <p className="text-[11px] mt-1.5 text-rose-600">
                  {priceError}
                </p>
              )}
            </div>

            {/* Calculations List */}
            <div className="space-y-2.5 pt-4 border-t border-[#E4E5E7] text-xs">
              <div className="flex justify-between text-[#70757A]">
                <span>Base Package (x{travellerCount})</span>
                <span className="text-[#202124] font-medium">
                  {pricing ? `₹${Number(pricing.package_subtotal).toLocaleString("en-IN")}` : "Calculating..."}
                </span>
              </div>

              {pricing && Number(pricing.add_ons_subtotal) > 0 && (
                <div className="flex justify-between text-[#70757A]">
                  <span>Selected Add-ons</span>
                  <span className="text-[#202124] font-medium">
                    +₹{Number(pricing.add_ons_subtotal).toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {pricing && Number(pricing.discount) > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Promo Discount</span>
                  <span>-₹{Number(pricing.discount).toLocaleString("en-IN")}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-4 border-t border-[#E4E5E7]">
                <span className="text-sm font-bold text-[#202124] uppercase tracking-wider">Total Amount</span>
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-serif font-bold text-[#24292F]">
                    {pricing ? `₹${Number(pricing.total).toLocaleString("en-IN")}` : "..."}
                  </span>
                  <span className="text-[10px] text-[#70757A] block uppercase tracking-wider font-mono">
                    {pkg.currency} • Fixed Decimal
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Pending Advisory Notice */}
            <div className="p-3.5 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[11px] text-[#70757A] space-y-1">
              <div className="flex items-center gap-1.5 text-[#24292F] font-bold uppercase text-[10px] tracking-wider">
                <Clock className="w-3.5 h-3.5" />
                <span>{siteSettings && !siteSettings.online_payments_enabled ? "Booking Request Notice" : "Payment Notice"}</span>
              </div>
              <p className="leading-relaxed">
                {siteSettings && !siteSettings.online_payments_enabled
                  ? (siteSettings.online_payments_maintenance_message || `Online card checkout is temporarily paused for routine maintenance. Submitting this form registers your official Booking Request with our ${city || "concierge"} desk, who will contact you to confirm details.`)
                  : "Your reservation will be created in Payment Pending status. No immediate online charge is made at this step."}
              </p>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isPending || calculatingPrice || !selectedDepartureId}
              className="w-full py-4 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-semibold shadow-xs hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{siteSettings && !siteSettings.online_payments_enabled ? "Submit Booking Request" : "Confirm Reservation (Payment Pending)"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function BookingPage() {
  return (
    <PublicLayout>
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center text-[#70757A]">
            <Loader2 className="w-8 h-8 animate-spin text-[#24292F]" />
          </div>
        }
      >
        <BookingFlow />
      </Suspense>
    </PublicLayout>
  );
}
