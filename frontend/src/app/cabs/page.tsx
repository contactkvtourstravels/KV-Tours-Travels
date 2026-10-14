"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import {
  Car,
  Compass,
  MapPin,
  Calendar,
  Clock,
  Users,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  Phone,
  MessageCircle,
  Sparkles,
  ArrowRight,
  Fuel,
  Navigation,
} from "lucide-react";
import { publicCatalogApi, type PublicInquiryCreate } from "@/lib/api";
import {
  DEFAULT_BUSINESS_PHONE,
  DEFAULT_WHATSAPP_NUMBER,
  getWhatsAppClickToChatUrl,
} from "@/lib/constants";
import { PublicLayout } from "@/components/public/PublicLayout";

interface Vehicle {
  id: string;
  name: string;
  category: string;
  passengerCapacity: number;
  luggageCapacity: string;
  acType: string;
  ratePerKm: number;
  minKmPerDay: number;
  driverAllowancePerDay: number;
  imageUrl: string;
  features: string[];
  bestFor: string;
  isPopular?: boolean;
}

const FLEET_VEHICLES: Vehicle[] = [
  {
    id: "sedan-dzire",
    name: "Maruti Suzuki Swift Dzire / Etios",
    category: "Comfort Sedan",
    passengerCapacity: 4,
    luggageCapacity: "2 Large + 1 Small Bags",
    acType: "Climate Controlled AC",
    ratePerKm: 13,
    minKmPerDay: 250,
    driverAllowancePerDay: 400,
    imageUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
    features: ["Clean & Sanitized", "Experienced Hill Drivers", "Mobile USB Charger", "Bottled Water"],
    bestFor: "Couples & Small Families (Up to 4 Pax)",
    isPopular: true,
  },
  {
    id: "suv-innova-crysta",
    name: "Toyota Innova Crysta",
    category: "Premium SUV",
    passengerCapacity: 7,
    luggageCapacity: "4 Large + 2 Small Bags",
    acType: "Dual AC with Rear Vents",
    ratePerKm: 19,
    minKmPerDay: 250,
    driverAllowancePerDay: 500,
    imageUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
    features: ["Captain Seats Option", "Superior Hill Climb Power", "Extra Legroom & Recline", "First Aid Kit"],
    bestFor: "Family Trips & Hill Station Safaris (6-7 Pax)",
    isPopular: true,
  },
  {
    id: "mpv-innova-hycross",
    name: "Toyota Innova Hycross Hybrid",
    category: "Luxury MPV",
    passengerCapacity: 6,
    luggageCapacity: "4 Large Bags",
    acType: "Multi-Zone Climate Control",
    ratePerKm: 24,
    minKmPerDay: 250,
    driverAllowancePerDay: 600,
    imageUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
    features: ["Ottoman Reclining Seats", "Panoramic Sunroof", "Silent Hybrid Cabin", "Wireless Charging"],
    bestFor: "VIP Guests & Executive Business Leisure (5-6 Pax)",
  },
  {
    id: "van-urbania",
    name: "Force Urbania Luxury Van",
    category: "Executive Mini Coach",
    passengerCapacity: 10,
    luggageCapacity: "8 Large Bags",
    acType: "Individual Aircraft-Style AC Vents",
    ratePerKm: 30,
    minKmPerDay: 300,
    driverAllowancePerDay: 700,
    imageUrl: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80",
    features: ["Individual Recliner Seats", "Full Standing Height", "LED Reading Lights", "USB at Every Seat"],
    bestFor: "Executive Groups & Pilgrimage Circles (9-10 Pax)",
    isPopular: true,
  },
  {
    id: "coach-tempo-12",
    name: "Force Tempo Traveller (12-Seater)",
    category: "Tempo Traveller",
    passengerCapacity: 12,
    luggageCapacity: "10 Large Bags",
    acType: "Dual High-Capacity AC",
    ratePerKm: 26,
    minKmPerDay: 300,
    driverAllowancePerDay: 600,
    imageUrl: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80",
    features: ["Pushback 2x1 Recliners", "Stereo Sound System", "Spacious Luggage Boot", "Curtained Windows"],
    bestFor: "Group Outings & Extended Family Trips (10-12 Pax)",
  },
  {
    id: "coach-tempo-17",
    name: "Force Tempo Traveller (17-Seater)",
    category: "Tempo Traveller",
    passengerCapacity: 17,
    luggageCapacity: "14 Large Bags",
    acType: "Dual High-Capacity AC",
    ratePerKm: 29,
    minKmPerDay: 300,
    driverAllowancePerDay: 700,
    imageUrl: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80",
    features: ["Pushback Luxury Seating", "LED TV & Audio", "Ample Overhead Racks", "Uniformed Professional Chauffeur"],
    bestFor: "Large Pilgrimage Groups & College Outings (13-17 Pax)",
  },
];

interface RoutePackage {
  id: string;
  from: string;
  to: string;
  distance: string;
  duration: string;
  description: string;
  sedanFare: number;
  innovaFare: number;
  hycrossFare: number;
  tempoFare: number;
  isPopular?: boolean;
}

const POPULAR_ROUTES: RoutePackage[] = [
  {
    id: "cbe-ooty",
    from: "Coimbatore",
    to: "Ooty & Coonoor",
    distance: "88 km",
    duration: "2.5 - 3 Hours",
    description: "Scenic route via Mettupalayam and Kallar ascending the Nilgiri hills through 36 hairpin bends.",
    sedanFare: 2800,
    innovaFare: 4200,
    hycrossFare: 5500,
    tempoFare: 6800,
    isPopular: true,
  },
  {
    id: "cbe-kodai",
    from: "Coimbatore",
    to: "Kodaikanal",
    distance: "175 km",
    duration: "4.5 - 5 Hours",
    description: "Smooth highway drive via Palladam, Dharapuram, and Palani Ghat road to the princess of hill stations.",
    sedanFare: 4500,
    innovaFare: 6500,
    hycrossFare: 8000,
    tempoFare: 9500,
    isPopular: true,
  },
  {
    id: "cbe-munnar",
    from: "Coimbatore",
    to: "Munnar",
    distance: "160 km",
    duration: "4.5 Hours",
    description: "Spectacular Western Ghats route via Pollachi, Udumalpet, and Marayoor ancient sandalwood reserves.",
    sedanFare: 4200,
    innovaFare: 6200,
    hycrossFare: 7800,
    tempoFare: 9200,
    isPopular: true,
  },
  {
    id: "cbe-isha",
    from: "Coimbatore",
    to: "Isha Yoga Centre (Round Trip)",
    distance: "35 km each way",
    duration: "1 Hour each way",
    description: "Direct highway drive to the foothills of Velliangiri for Dhyanalinga and 112-ft Adiyogi Shiva Statue.",
    sedanFare: 1800,
    innovaFare: 2800,
    hycrossFare: 3600,
    tempoFare: 4500,
    isPopular: true,
  },
  {
    id: "cbe-valparai",
    from: "Coimbatore",
    to: "Valparai & Sholayar Dam",
    distance: "105 km",
    duration: "3.5 Hours",
    description: "Thrilling 40-hairpin climb through Anamalai Tiger Reserve tea gardens with chances to spot hornbills.",
    sedanFare: 3800,
    innovaFare: 5600,
    hycrossFare: 7000,
    tempoFare: 8500,
    isPopular: true,
  },
  {
    id: "cbe-madurai",
    from: "Coimbatore",
    to: "Madurai Meenakshi Temple",
    distance: "215 km",
    duration: "3.5 - 4 Hours",
    description: "Smooth 4-lane highway drive directly to Meenakshi Amman Temple or Madurai Airport (IXM).",
    sedanFare: 4800,
    innovaFare: 7200,
    hycrossFare: 8900,
    tempoFare: 11000,
    isPopular: true,
  },
];

const FAQS = [
  {
    q: "How are Coimbatore outstation cab fares calculated?",
    a: "Outstation trips are calculated on a transparent per-kilometer rate with a minimum billing of 250 km per calendar day. State permit taxes, toll gate fees, and parking charges are billed at actuals with receipts.",
  },
  {
    q: "Can I book a Coimbatore Airport (CJB) pickup with flight delay monitoring?",
    a: "Yes. Simply share your flight number when booking. Our chauffeur monitors your flight status in real time and waits at the arrivals gate with a name placard without extra waiting charges for flight delays.",
  },
  {
    q: "Are your drivers experienced on steep hill station routes?",
    a: "Absolutely. All KV Tours & Travels chauffeurs have extensive experience navigating mountain roads including the 36 hairpin bends of Ooty's Kalhatti Ghat, the 40 curves of Valparai, and the foggy hairpin roads of Munnar and Kodaikanal.",
  },
  {
    q: "Can I make emergency stops or custom detours during the trip?",
    a: "Yes! Unlike app-based aggregators, our chauffeur is dedicated entirely to your itinerary. You can stop for photos, tea plantation viewpoints, clean roadside restaurants, and temple visits at your leisure.",
  },
];

type TripTypeId = "outstation-round" | "outstation-oneway" | "airport-cjb" | "local-package";

export default function CabsPage() {
  // Booking Form State
  const [tripType, setTripType] = useState<TripTypeId>("outstation-round");
  const [pickupCity, setPickupCity] = useState("Coimbatore Airport (CJB)");
  const [destination, setDestination] = useState("Ooty & Coonoor");
  const [travelDate, setTravelDate] = useState("");
  const [pickupTime, setPickupTime] = useState("08:00 AM");
  const [selectedVehicleId, setSelectedVehicleId] = useState("suv-innova-crysta");
  const [passengerCount, setPassengerCount] = useState("4 Adults");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  const [isPending, startTransition] = useTransition();
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Active Vehicle Object
  const selectedVehicle = FLEET_VEHICLES.find((v) => v.id === selectedVehicleId) || FLEET_VEHICLES[1];

  // Calculate live fare estimate
  const activeRoute = POPULAR_ROUTES.find((r) => r.to.toLowerCase().includes(destination.toLowerCase()) || destination.toLowerCase().includes(r.to.toLowerCase()));

  const estimatedFare = React.useMemo(() => {
    if (activeRoute) {
      if (selectedVehicleId.includes("sedan")) return activeRoute.sedanFare;
      if (selectedVehicleId.includes("crysta")) return activeRoute.innovaFare;
      if (selectedVehicleId.includes("hycross")) return activeRoute.hycrossFare;
      return activeRoute.tempoFare;
    }
    // Fallback: estimate 250km min * rate
    return selectedVehicle.minKmPerDay * selectedVehicle.ratePerKm + selectedVehicle.driverAllowancePerDay;
  }, [activeRoute, selectedVehicle, selectedVehicleId]);

  // Construct Direct WhatsApp URL
  const waMessage = `Hi KV Tours & Travels, I would like to book a cab:
• Trip Type: ${tripType.replace("-", " ").toUpperCase()}
• Pickup: ${pickupCity}
• Destination: ${destination}
• Date: ${travelDate || "Immediate / Flexible"}
• Time: ${pickupTime}
• Vehicle: ${selectedVehicle.name} (${selectedVehicle.category})
• Passengers: ${passengerCount}
• Name: ${customerName || "Customer"}
• Phone: ${customerPhone || "Not specified"}
Please confirm availability and share fare quote.`;

  const waBookingUrl = getWhatsAppClickToChatUrl(DEFAULT_WHATSAPP_NUMBER, waMessage);

  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);

    if (!customerName || !customerPhone) {
      setBookingError("Please provide your name and contact phone number.");
      return;
    }

    startTransition(async () => {
      try {
        const payload: PublicInquiryCreate = {
          name: customerName,
          email: customerEmail || "cab-booking@kvtours.in",
          phone: customerPhone,
          source: "other",
          message: `[CAB BOOKING REQUEST]
Trip Type: ${tripType}
Pickup Location: ${pickupCity}
Destination: ${destination}
Travel Date: ${travelDate || "Flexible"}
Pickup Time: ${pickupTime}
Vehicle Chosen: ${selectedVehicle.name} (${selectedVehicle.category})
Passenger Count: ${passengerCount}
Estimated Base Fare: ₹${estimatedFare.toLocaleString()}
Special Notes: ${specialRequests || "None"}`,
        };

        const res = await publicCatalogApi.submitInquiry(payload);
        setBookingSuccess(
          `Thank you, ${customerName}! Your cab booking enquiry has been received (Ref: ${res.id ? res.id.slice(0, 8).toUpperCase() : "KV-CAB"}). Our Coimbatore fleet coordinator will call you within 15 minutes to confirm your ride.`
        );
      } catch {
        setBookingError("Unable to submit booking request right now. Please book directly via WhatsApp or call us.");
      }
    });
  };

  const handleSelectVehicle = (vId: string) => {
    setSelectedVehicleId(vId);
    // Scroll to booking widget
    const widget = document.getElementById("cab-booking-widget");
    if (widget) {
      widget.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSelectRoute = (route: RoutePackage) => {
    setDestination(route.to);
    setPickupCity(route.from);
    const widget = document.getElementById("cab-booking-widget");
    if (widget) {
      widget.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <PublicLayout>
      {/* 1. HERO SECTION */}
      <section className="relative pt-32 pb-20 lg:pt-36 lg:pb-24 bg-[#1E2229] text-white overflow-hidden">
        {/* Subtle Luxury Pattern / Gradient */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#C5A880_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#C5A880]/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#3B82F6]/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[#C5A880] text-xs font-semibold uppercase tracking-widest mb-6">
              <Car className="w-3.5 h-3.5" />
              <span>KV Tours & Travels • Coimbatore Chauffeur Fleet</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-white tracking-tight leading-[1.15]">
              Premium Outstation Cabs & Airport CJB Transfers
            </h1>

            <p className="mt-5 text-base sm:text-lg text-[#CBD5E1] leading-relaxed max-w-2xl">
              Experience safe, comfortable, and punctual chauffeur-driven journeys from Coimbatore to Ooty, Munnar, Kodaikanal, Valparai, and Isha Yoga Centre. Clean sanitized Sedans, Innova Crysta SUVs, and luxury Tempo Travellers.
            </p>

            {/* Quick Trust Badges */}
            <div className="mt-8 flex flex-wrap items-center gap-4 text-xs font-medium text-[#E2E8F0]">
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                <ShieldCheck className="w-4 h-4 text-[#C5A880]" />
                <span>Zero Surge Pricing</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                <Navigation className="w-4 h-4 text-[#C5A880]" />
                <span>Expert Mountain Drivers</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                <Clock className="w-4 h-4 text-[#C5A880]" />
                <span>24/7 Airport CJB Transfers</span>
              </div>
            </div>

            {/* Direct Action Buttons */}
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href={waBookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold text-sm tracking-wider uppercase shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Instant WhatsApp Booking</span>
              </a>
              <a
                href={`tel:${DEFAULT_BUSINESS_PHONE}`}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm tracking-wider uppercase transition-colors"
              >
                <Phone className="w-4 h-4 text-[#C5A880]" />
                <span>Call Concierge: {DEFAULT_BUSINESS_PHONE}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE CAB BOOKING & FARE CALCULATOR WIDGET */}
      <section id="cab-booking-widget" className="relative -mt-10 z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="bg-white rounded-3xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.12)] border border-[#E2E8F0] p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between pb-6 mb-6 border-b border-[#E2E8F0] gap-4">
            <div>
              <span className="text-xs font-serif font-bold uppercase tracking-widest text-[#C5A880]">
                Interactive Ride Booking
              </span>
              <h2 className="text-2xl font-serif font-bold text-[#1E293B] mt-0.5">
                Calculate Fare & Book Your Ride
              </h2>
            </div>

            {/* Trip Type Tabs */}
            <div className="flex flex-wrap p-1 bg-[#F1F5F9] rounded-full border border-[#E2E8F0]">
              {[
                { id: "outstation-round", label: "Outstation Round-Trip" },
                { id: "outstation-oneway", label: "One-Way Drop" },
                { id: "airport-cjb", label: "Airport CJB Transfer" },
                { id: "local-package", label: "Local 8hr/80km" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTripType(tab.id as TripTypeId)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    tripType === tab.id
                      ? "bg-[#1E293B] text-white shadow-xs"
                      : "text-[#64748B] hover:text-[#1E293B]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Booking Form Grid */}
          <form onSubmit={handleSubmitInquiry} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Pickup Location */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                  Pickup Location <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3.5" />
                  <select
                    value={pickupCity}
                    onChange={(e) => setPickupCity(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm font-medium text-[#1E293B] focus:outline-none focus:border-[#1E293B]"
                  >
                    <option value="Coimbatore Airport (CJB)">Coimbatore Airport (CJB)</option>
                    <option value="Coimbatore Junction (CBE)">Coimbatore Junction Railway Station</option>
                    <option value="Gandhipuram Bus Stand">Gandhipuram Bus Stand</option>
                    <option value="RS Puram / Saibaba Colony">RS Puram / Saibaba Colony</option>
                    <option value="Peelamedu / Hopes College">Peelamedu / Hopes College</option>
                    <option value="Isha Yoga Centre">Isha Yoga Centre, Velliangiri</option>
                    <option value="Tiruppur / Erode">Tiruppur / Erode Town</option>
                    <option value="Custom Address">Other Doorstep Location (Coimbatore)</option>
                  </select>
                </div>
              </div>

              {/* Destination Drop */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                  Destination Drop <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Navigation className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3.5" />
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm font-medium text-[#1E293B] focus:outline-none focus:border-[#1E293B]"
                  >
                    <option value="Ooty & Coonoor">Ooty & Coonoor (88 km)</option>
                    <option value="Kodaikanal">Kodaikanal (175 km)</option>
                    <option value="Munnar">Munnar, Kerala (160 km)</option>
                    <option value="Isha Yoga Centre">Isha Yoga Centre / Adiyogi (35 km)</option>
                    <option value="Valparai & Sholayar">Valparai & Sholayar Dam (105 km)</option>
                    <option value="Madurai Temple City">Madurai Meenakshi Temple (215 km)</option>
                    <option value="Rameshwaram">Rameshwaram & Dhanushkodi (370 km)</option>
                    <option value="Wayanad">Wayanad Rainforests (180 km)</option>
                    <option value="Coorg (Madikeri)">Coorg Coffee Country (260 km)</option>
                    <option value="Mysore Royal Palace">Mysore City (200 km)</option>
                    <option value="Palakkad / Malampuzha">Palakkad, Kerala (55 km)</option>
                  </select>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                  Travel Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3.5" />
                  <input
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm font-medium text-[#1E293B] focus:outline-none focus:border-[#1E293B]"
                  />
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                  Pickup Time <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3.5" />
                  <select
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm font-medium text-[#1E293B] focus:outline-none focus:border-[#1E293B]"
                  >
                    <option value="05:00 AM">05:00 AM (Early Morning Ascent)</option>
                    <option value="06:30 AM">06:30 AM</option>
                    <option value="08:00 AM">08:00 AM (Recommended)</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="12:00 PM">12:00 PM (Noon)</option>
                    <option value="02:30 PM">02:30 PM</option>
                    <option value="05:00 PM">05:00 PM</option>
                    <option value="08:30 PM">08:30 PM (Night Train/Flight Arrival)</option>
                    <option value="11:30 PM">11:30 PM (Midnight Airport CJB)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Vehicle Selection Chips */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-2">
                Select Your Vehicle Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {FLEET_VEHICLES.map((veh) => {
                  const isSelected = selectedVehicleId === veh.id;
                  return (
                    <button
                      key={veh.id}
                      type="button"
                      onClick={() => setSelectedVehicleId(veh.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? "bg-[#1E293B] text-white border-[#1E293B] shadow-sm"
                          : "bg-[#F8FAFC] border-[#E2E8F0] hover:bg-white text-[#334155]"
                      }`}
                    >
                      <div className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                        {veh.category}
                      </div>
                      <div className="text-xs font-bold truncate mt-0.5">
                        {veh.name.split("/")[0]}
                      </div>
                      <div className={`text-[10px] mt-1 font-semibold ${isSelected ? "text-[#C5A880]" : "text-[#0D7A53]"}`}>
                        ₹{veh.ratePerKm}/km
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Customer Details Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                  Your Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Athul S"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm font-medium text-[#1E293B] focus:outline-none focus:border-[#1E293B]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                  Contact Phone / WhatsApp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="+91 94420 XXXXX"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm font-medium text-[#1E293B] focus:outline-none focus:border-[#1E293B]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm font-medium text-[#1E293B] focus:outline-none focus:border-[#1E293B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                  Passenger Count
                </label>
                <select
                  value={passengerCount}
                  onChange={(e) => setPassengerCount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm font-medium text-[#1E293B] focus:outline-none focus:border-[#1E293B]"
                >
                  <option value="1-2 Adults">1-2 Adults</option>
                  <option value="3-4 Adults">3-4 Adults</option>
                  <option value="5-6 Adults">5-6 Adults</option>
                  <option value="7-8 Pax (Large Family)">7-8 Pax (Large Family)</option>
                  <option value="9-12 Pax (Group / Van)">9-12 Pax (Group / Van)</option>
                  <option value="13-17 Pax (Coach)">13-17 Pax (Coach)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                  Flight No. / Hotel / Pickup Address Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Flight 6E-241 landing at 11:30 AM / Hotel Le Meridien doorstep"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm font-medium text-[#1E293B] focus:outline-none focus:border-[#1E293B]"
                />
              </div>
            </div>

            {/* Live Estimated Fare Card & Submit CTAs */}
            <div className="p-4 sm:p-6 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="text-xs uppercase tracking-wider font-bold text-[#64748B]">
                  Estimated Starting Fare ({selectedVehicle.name})
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold font-serif text-[#1E293B]">
                    ₹{estimatedFare.toLocaleString()}
                  </span>
                  <span className="text-xs text-[#64748B] font-medium">
                    (Includes vehicle, fuel, and dedicated chauffeur)
                  </span>
                </div>
                <div className="text-[11px] text-[#94A3B8] mt-0.5">
                  *Tolls, parking, and interstate permits charged at actuals with GST bill.
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <a
                  href={waBookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Book on WhatsApp</span>
                </a>

                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-xs"
                >
                  <span>{isPending ? "Submitting..." : "Send Online Request"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Feedback Messages */}
            {bookingError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {bookingError}
              </div>
            )}
            {bookingSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>{bookingSuccess}</div>
              </div>
            )}
          </form>
        </div>
      </section>

      {/* 3. OUR LUXURY FLEET SHOWCASE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-serif font-bold uppercase tracking-widest text-[#C5A880]">
            Pristine Vehicles & Professional Mountain Chauffeurs
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#1E293B] mt-2">
            The KV Tours & Travels Fleet
          </h2>
          <p className="mt-3 text-sm text-[#64748B] leading-relaxed">
            All our vehicles undergo regular mechanical fitness checks before every hill ascent and are driven exclusively by courteous, uniformed, background-verified chauffeurs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FLEET_VEHICLES.map((veh) => (
            <div
              key={veh.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Vehicle Image */}
                <div className="relative h-52 w-full bg-[#1E293B]">
                  <Image
                    src={veh.imageUrl}
                    alt={veh.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#1E293B]/85 backdrop-blur-xs text-white text-[10px] font-bold uppercase tracking-wider">
                    {veh.category}
                  </div>
                  {veh.isPopular && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#C5A880] text-white text-[10px] font-bold uppercase tracking-wider">
                      Most Popular
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-lg font-bold text-[#1E293B] font-serif">
                    {veh.name}
                  </h3>
                  <p className="text-xs text-[#64748B] mt-1">
                    {veh.bestFor}
                  </p>

                  {/* Specifications */}
                  <div className="grid grid-cols-2 gap-3 my-4 py-3 border-y border-[#F1F5F9] text-xs text-[#475569]">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#C5A880] shrink-0" />
                      <span>{veh.passengerCapacity} Passengers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-[#C5A880] shrink-0" />
                      <span className="truncate">{veh.luggageCapacity}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Fuel className="w-4 h-4 text-[#C5A880] shrink-0" />
                      <span>{veh.acType}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#C5A880] shrink-0" />
                      <span>GPS & Sanitized</span>
                    </div>
                  </div>

                  {/* Feature Bullets */}
                  <div className="space-y-1.5 text-xs text-[#64748B]">
                    {veh.features.map((feat, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer / Tariff & CTA */}
              <div className="px-6 pb-6 pt-2 bg-[#F8FAFC] border-t border-[#F1F5F9] flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#94A3B8]">Outstation Tariff</div>
                  <div className="text-lg font-bold text-[#1E293B]">
                    ₹{veh.ratePerKm} <span className="text-xs font-normal text-[#64748B]">/ km</span>
                  </div>
                  <div className="text-[10px] text-[#64748B]">Min {veh.minKmPerDay} km/day</div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectVehicle(veh.id)}
                  className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-white text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Select & Book
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. POPULAR COIMBATORE OUTSTATION ROUTES TABLE */}
      <section className="bg-[#F8FAFC] py-16 border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-serif font-bold uppercase tracking-widest text-[#C5A880]">
                Fixed Transparent Tariffs from Coimbatore Hub
              </span>
              <h2 className="text-3xl font-serif font-bold text-[#1E293B] mt-1">
                Popular Outstation Routes & Starting Fares
              </h2>
            </div>
            <p className="text-xs text-[#64748B] max-w-sm">
              All fares include vehicle fuel, tolls allowance, and driver charges. No hidden surprises when you travel with KV Tours.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {POPULAR_ROUTES.map((route) => (
              <div
                key={route.id}
                className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-[#C5A880] mb-2">
                    <span className="flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5" />
                      {route.distance} • {route.duration}
                    </span>
                    {route.isPopular && (
                      <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold">
                        Top Route
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold font-serif text-[#1E293B]">
                    {route.from} → {route.to}
                  </h3>

                  <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
                    {route.description}
                  </p>

                  {/* Fares Matrix */}
                  <div className="mt-4 pt-3 border-t border-[#F1F5F9] space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[#475569]">Sedan (Dzire / Etios):</span>
                      <span className="font-bold text-[#1E293B]">₹{route.sedanFare.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#475569]">Innova Crysta SUV:</span>
                      <span className="font-bold text-[#1E293B]">₹{route.innovaFare.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#475569]">Innova Hycross Hybrid:</span>
                      <span className="font-bold text-[#1E293B]">₹{route.hycrossFare.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#475569]">Tempo Traveller (12S):</span>
                      <span className="font-bold text-[#1E293B]">₹{route.tempoFare.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleSelectRoute(route)}
                    className="text-xs font-bold text-[#1E293B] hover:text-[#C5A880] flex items-center gap-1 transition-colors"
                  >
                    <span>Book This Route</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <a
                    href={getWhatsAppClickToChatUrl(
                      DEFAULT_WHATSAPP_NUMBER,
                      `Hi KV Tours, I want to book a cab from ${route.from} to ${route.to}.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#0D7A53] hover:underline font-semibold flex items-center gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. WHY TRAVEL WITH KV TOURS CABS? */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0]">
            <div className="w-10 h-10 rounded-xl bg-[#EBF7F2] text-[#0D7A53] flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold font-serif text-[#1E293B] text-base">
              Verified Mountain Drivers
            </h4>
            <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
              Our drivers specialize in Western Ghats mountain driving with decades of experience on Kalhatti ghat, Valparai curves, and Munnar mist.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0]">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="font-bold font-serif text-[#1E293B] text-base">
              Flight Delay Monitoring
            </h4>
            <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
              Arriving at Coimbatore Airport (CJB)? We track flight landing times automatically and guarantee your driver will be waiting at arrivals.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0]">
            <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="font-bold font-serif text-[#1E293B] text-base">
              Spotless Luxury Interiors
            </h4>
            <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
              Every cab is deep-cleaned and vacuumed before dispatch, stocked with fresh bottled mineral water, tissue boxes, and mobile phone chargers.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0]">
            <div className="w-10 h-10 rounded-xl bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center mb-4">
              <Compass className="w-5 h-5" />
            </div>
            <h4 className="font-bold font-serif text-[#1E293B] text-base">
              Flexible Sightseeing Stays
            </h4>
            <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
              Stop at roadside waterfalls, botanical viewpoints, or authentic South Indian tea stalls whenever you like with zero rush or surge penalties.
            </p>
          </div>
        </div>
      </section>

      {/* 6. FAQS ACCORDION */}
      <section className="bg-[#F8FAFC] py-16 border-t border-[#E2E8F0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-serif font-bold uppercase tracking-widest text-[#C5A880]">
              Got Questions?
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E293B] mt-1">
              Frequently Asked Questions About Cab Rentals
            </h2>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs"
              >
                <h3 className="font-bold text-[#1E293B] text-sm sm:text-base font-serif">
                  {faq.q}
                </h3>
                <p className="text-xs sm:text-sm text-[#64748B] mt-2 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

          {/* Need help banner */}
          <div className="mt-12 p-6 rounded-2xl bg-[#1E293B] text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-base font-bold font-serif">Need a custom fleet quote for corporate or wedding events?</div>
              <div className="text-xs text-[#94A3B8] mt-0.5">Speak with our Coimbatore fleet manager directly.</div>
            </div>
            <a
              href={`tel:${DEFAULT_BUSINESS_PHONE}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C5A880] hover:bg-[#B39368] text-white font-bold text-xs uppercase tracking-wider shrink-0"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{DEFAULT_BUSINESS_PHONE}</span>
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
