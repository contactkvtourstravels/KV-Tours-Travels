import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TravelImage } from "@/components/public/TravelImage";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Hotel,
  MapPin,
  Plus,
  Shield,
  Star,
  Users,
  X,
} from "lucide-react";
import { publicCatalogApi, type PublicPackageDetail } from "@/lib/api";
import { getWhatsAppClickToChatUrl } from "@/lib/constants";
import { PublicLayout } from "@/components/public/PublicLayout";
import { PackageDetailClientActions } from "./PackageDetailClientActions";
import { getSafeImageUrl, getDestinationFallback, DESTINATION_FALLBACKS } from "@/lib/images";

interface PackagePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PackagePageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const [pkg, settings] = await Promise.all([
      publicCatalogApi.getPackage(slug),
      publicCatalogApi.getSettings().catch(() => null),
    ]);
    const agencyName = settings?.public_display_name || settings?.agency_name || "Travel Agency";
    const siteUrl = settings?.website_url || "https://wildroot.in";
    const title = pkg.seo_title || `${pkg.name} | ${agencyName}`;
    const description =
      pkg.seo_description ||
      pkg.short_description ||
      `Experience ${pkg.name} with ${agencyName}. ${pkg.duration_days} Days / ${pkg.duration_nights} Nights starting from ₹${Number(pkg.base_price).toLocaleString("en-IN")}.`;

    return {
      title,
      description,
      alternates: {
        canonical: `${siteUrl}/packages/${slug}`,
      },
      openGraph: {
        title,
        description,
        url: `${siteUrl}/packages/${slug}`,
        images: pkg.cover_image_url ? [pkg.cover_image_url] : pkg.images[0]?.image_url ? [pkg.images[0].image_url] : [],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch {
    return {
      title: "Package Not Found",
    };
  }
}

export default async function PackageDetailPage({ params }: PackagePageProps) {
  const { slug } = await params;

  let pkg: PublicPackageDetail;
  let onlinePaymentsEnabled = false;
  let maintenanceMsg: string | undefined;
  let agencyName = "Travel Agency";
  let whatsappNumber: string | undefined;
  let whatsappCountryCode = "+91";
  let whatsappEnabled = true;

  try {
    const [pkgData, settingsData] = await Promise.all([
      publicCatalogApi.getPackage(slug),
      publicCatalogApi.getSettings().catch(() => null),
    ]);
    pkg = pkgData;
    onlinePaymentsEnabled = Boolean(settingsData?.online_payments_enabled);
    maintenanceMsg = settingsData?.online_payments_maintenance_message;
    agencyName = settingsData?.public_display_name || settingsData?.agency_name || "Travel Agency";
    whatsappNumber = settingsData?.whatsapp_number || settingsData?.support_whatsapp || undefined;
    whatsappCountryCode = settingsData?.whatsapp_country_code || "+91";
    whatsappEnabled = settingsData?.whatsapp_enabled !== false && settingsData?.whatsapp_show_on_package_pages !== false;
  } catch {
    notFound();
  }

  const waUrl = whatsappEnabled
    ? getWhatsAppClickToChatUrl(
        whatsappNumber,
        `Hi ${agencyName}, I am interested in booking the "${pkg.name}" (${pkg.duration_days}D/${pkg.duration_nights}N) package. Please share availability and payment details.`,
        whatsappCountryCode
      )
    : "";

  const rawHero =
    pkg.cover_image_url ||
    pkg.images?.[0]?.image_url ||
    getDestinationFallback(pkg.slug || pkg.destination_slug || pkg.destination_name);
  const heroImg = getSafeImageUrl(rawHero);

  // Schema.org structured data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: pkg.name,
    description: pkg.short_description || pkg.description,
    image: heroImg,
    offers: {
      "@type": "Offer",
      price: pkg.base_price,
      priceCurrency: pkg.currency || "INR",
      availability: "https://schema.org/InStock",
    },
  };

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://wildroot.in",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Packages",
        item: "https://wildroot.in/packages",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: pkg.name,
        item: `https://wildroot.in/packages/${slug}`,
      },
    ],
  };

  return (
    <PublicLayout transparentHeader>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />

      {/* 1. HERO HEADER */}
      <section className="relative min-h-[65vh] sm:min-h-[75vh] flex items-end overflow-hidden bg-black">
        <TravelImage
          src={heroImg}
          alt={pkg.name}
          fill
          priority
          fallbackSlug={pkg.slug || pkg.destination_slug}
          sizes="100vw"
          className="object-cover object-center scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/60" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
          <Link
            href="/packages"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/80 hover:text-white mb-6 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4 text-[#ECEFF3]" />
            <span>Back to All Packages</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Link
              href={`/destinations/${pkg.destination_slug}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-white/20 text-[#ECEFF3] text-xs uppercase tracking-widest font-semibold hover:border-white/40 transition-colors backdrop-blur-md"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{pkg.destination_name}</span>
            </Link>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs backdrop-blur-md">
              <Clock className="w-3.5 h-3.5 text-[#ECEFF3]" />
              <span>{pkg.duration_days} Days / {pkg.duration_nights} Nights</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs backdrop-blur-md">
              <Users className="w-3.5 h-3.5 text-[#ECEFF3]" />
              <span>Group: {pkg.minimum_travellers} {pkg.maximum_travellers ? `- ${pkg.maximum_travellers}` : "+"} travellers</span>
            </span>
            {pkg.category && (
              <span className="px-3 py-1 rounded-full bg-[#24292F]/80 border border-[#D3D8DF]/40 text-[#ECEFF3] text-[11px] uppercase tracking-wider font-semibold backdrop-blur-md">
                {pkg.category}
              </span>
            )}
            {pkg.travel_type && (
              <span className="px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-[11px] uppercase tracking-wider font-semibold backdrop-blur-md">
                {pkg.travel_type}
              </span>
            )}
            {pkg.difficulty_level && (
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/90 text-[11px] uppercase tracking-wider backdrop-blur-md">
                ⚡ {pkg.difficulty_level}
              </span>
            )}
            {pkg.departure_location && (
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/90 text-[11px] uppercase tracking-wider backdrop-blur-md">
                🛫 Ex-{pkg.departure_location}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-white tracking-tight max-w-4xl">
            {pkg.name}
          </h1>

          {pkg.short_description && (
            <p className="mt-4 text-base sm:text-lg text-white/85 max-w-3xl font-light leading-relaxed">
              {pkg.short_description}
            </p>
          )}

          {/* Pricing Highlight Pill */}
          <div className="mt-8 flex flex-wrap items-baseline gap-3">
            <span className="text-xs uppercase tracking-wider text-white/70">Starting from</span>
            <span className="text-3xl sm:text-4xl font-serif font-bold text-[#ECEFF3]">
              ₹{Number(pkg.base_price).toLocaleString("en-IN")}
            </span>
            <span className="text-xs text-white/70">/ person (inclusive of stays & transfers)</span>
          </div>
        </div>
      </section>

      {/* 2. MAIN PACKAGE CONTENT & STICKY BOOKING CONCIERGE */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left 2 Cols: Details, Itinerary, Hotels, Activities */}
            <div className="lg:col-span-2 space-y-16">
              {/* Overview & Story */}
              <div>
                <span className="text-[#5F6368] text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
                  Trip Narrative
                </span>
                <h2 className="text-2xl sm:text-4xl font-serif font-bold text-[#202124] mb-6">
                  Experience {pkg.name}
                </h2>
                <div className="text-[#70757A] text-sm sm:text-base leading-relaxed space-y-4 font-light">
                  {pkg.description ? (
                    <p className="whitespace-pre-line">{pkg.description}</p>
                  ) : (
                    <p>
                      Join {agencyName} on a handcrafted {pkg.duration_days}-day luxury journey through {pkg.destination_name}. From private airport greetings and handpicked accommodations to curated excursions, every moment is planned with elegance and care.
                    </p>
                  )}
                </div>
              </div>

              {/* INCLUSIONS & EXCLUSIONS SECTION */}
              {((pkg.inclusions && pkg.inclusions.length > 0) || (pkg.exclusions && pkg.exclusions.length > 0)) && (
                <div className="pt-8 border-t border-[#E4E5E7]">
                  <span className="text-[#5F6368] text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
                    Transparent Coverage
                  </span>
                  <h3 className="text-2xl font-serif font-bold text-[#202124] mb-6">
                    What&apos;s Included &amp; Excluded
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Inclusions */}
                    <div className="p-6 rounded-3xl bg-[#F7F7F5] border border-[#E4E5E7] shadow-xs space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#EBF7F2] border border-[#A7E2CB] text-[#0D7A53] flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4" />
                        </div>
                        <h4 className="text-lg font-serif font-bold text-[#202124]">Included in Your Tour</h4>
                      </div>
                      {pkg.inclusions && pkg.inclusions.length > 0 ? (
                        <ul className="space-y-2.5 pt-2">
                          {pkg.inclusions.map((inc, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#202124]">
                              <CheckCircle2 className="w-4 h-4 text-[#0D7A53] shrink-0 mt-0.5" />
                              <span className="font-light">{inc}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-[#70757A] italic">Standard stays, transfers, and sightseeing included.</p>
                      )}
                    </div>

                    {/* Exclusions */}
                    <div className="p-6 rounded-3xl bg-[#F7F7F5] border border-[#E4E5E7] shadow-xs space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#F3F4F4] border border-[#D3D8DF] text-[#5F6368] flex items-center justify-center shrink-0">
                          <X className="w-4 h-4" />
                        </div>
                        <h4 className="text-lg font-serif font-bold text-[#202124]">Not Included (Exclusions)</h4>
                      </div>
                      {pkg.exclusions && pkg.exclusions.length > 0 ? (
                        <ul className="space-y-2.5 pt-2">
                          {pkg.exclusions.map((exc, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#70757A]">
                              <X className="w-4 h-4 text-[#5F6368] shrink-0 mt-0.5" />
                              <span className="font-light">{exc}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-[#70757A] italic">Personal expenses, optional gratuities, and unlisted meals.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TIERED PRICING & BOOKING POLICIES */}
              {(pkg.child_price || pkg.infant_price || pkg.single_room_supplement || pkg.cancellation_policy || pkg.booking_cutoff_days) && (
                <div className="pt-8 border-t border-[#E4E5E7]">
                  <span className="text-[#5F6368] text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
                    Pricing Breakdown &amp; Policies
                  </span>
                  <h3 className="text-2xl font-serif font-bold text-[#202124] mb-6">
                    Tiered Pricing &amp; Cancellation Rules
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7]">
                      <span className="text-[10px] uppercase tracking-wider text-[#5F6368] font-bold block mb-1">
                        Adult (Base)
                      </span>
                      <span className="text-lg font-serif font-bold text-[#202124]">
                        ₹{Number(pkg.base_price).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-[#70757A] block mt-0.5">per adult</span>
                    </div>

                    {pkg.child_price && (
                      <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7]">
                        <span className="text-[10px] uppercase tracking-wider text-[#5F6368] font-bold block mb-1">
                          Child (2-11 Yrs)
                        </span>
                        <span className="text-lg font-serif font-bold text-[#202124]">
                          ₹{Number(pkg.child_price).toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-[#70757A] block mt-0.5">per child</span>
                      </div>
                    )}

                    {pkg.infant_price && (
                      <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7]">
                        <span className="text-[10px] uppercase tracking-wider text-[#5F6368] font-bold block mb-1">
                          Infant (&lt;2 Yrs)
                        </span>
                        <span className="text-lg font-serif font-bold text-[#202124]">
                          ₹{Number(pkg.infant_price).toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-[#70757A] block mt-0.5">per infant</span>
                      </div>
                    )}

                    {pkg.single_room_supplement && (
                      <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7]">
                        <span className="text-[10px] uppercase tracking-wider text-[#5F6368] font-bold block mb-1">
                          Solo Room
                        </span>
                        <span className="text-lg font-serif font-bold text-[#202124]">
                          +₹{Number(pkg.single_room_supplement).toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-[#70757A] block mt-0.5">single supplement</span>
                      </div>
                    )}
                  </div>

                  {(pkg.cancellation_policy || (pkg.booking_cutoff_days && pkg.booking_cutoff_days > 0)) && (
                    <div className="p-5 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-2">
                      {pkg.booking_cutoff_days && pkg.booking_cutoff_days > 0 && (
                        <div className="flex items-center gap-2 text-xs text-[#202124]">
                          <Clock className="w-4 h-4 text-[#5F6368]" />
                          <span>Advance booking window: <strong>Must book at least {pkg.booking_cutoff_days} days before departure</strong></span>
                        </div>
                      )}
                      {pkg.cancellation_policy && (
                        <div className="flex items-start gap-2 text-xs text-[#70757A] pt-1">
                          <AlertCircle className="w-4 h-4 text-[#5F6368] shrink-0 mt-0.5" />
                          <span>Cancellation Policy: <span className="text-[#202124]">{pkg.cancellation_policy}</span></span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Day-by-Day Itinerary Section */}
              {pkg.itinerary && pkg.itinerary.length > 0 && (
                <div className="pt-8 border-t border-[#E4E5E7]">
                  <span className="text-[#5F6368] text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
                    Chronological Schedule
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#202124] mb-8">
                    Day-by-Day Itinerary
                  </h2>

                  <div className="space-y-6 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-[#E4E5E7]">
                    {pkg.itinerary.map((day) => (
                      <div key={day.day_number} className="relative pl-12 group">
                        {/* Day indicator badge */}
                        <div className="absolute left-0 top-1 w-10 h-10 rounded-full border-2 border-[#24292F] bg-white text-[#202124] font-serif font-bold text-xs flex items-center justify-center shadow-2xs">
                          D{day.day_number}
                        </div>

                        <div className="p-6 rounded-3xl bg-[#F7F7F5] border border-[#E4E5E7] hover:border-[#24292F]/40 transition-all space-y-3 shadow-sm">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs uppercase tracking-widest text-[#24292F] font-semibold">
                              Day {day.day_number}
                            </span>
                            {day.meals && (
                              <span className="text-xs text-[#70757A] bg-white px-3 py-1 rounded-full border border-[#E4E5E7] font-medium">
                                Meals: {day.meals}
                              </span>
                            )}
                          </div>

                          <h3 className="text-xl font-serif font-bold text-[#202124]">
                            {day.title}
                          </h3>

                          {day.description && (
                            <p className="text-[#70757A] text-xs sm:text-sm leading-relaxed font-light">
                              {day.description}
                            </p>
                          )}

                          {/* Accommodation & Transport Notes */}
                          {(day.accommodation || day.transportation) && (
                            <div className="pt-3 border-t border-[#E4E5E7] flex flex-wrap items-center gap-4 text-xs text-[#70757A]">
                              {day.accommodation && (
                                <span className="flex items-center gap-1.5">
                                  <Hotel className="w-3.5 h-3.5 text-[#3D4450]" />
                                  Stay: <strong className="text-[#202124]">{day.accommodation}</strong>
                                </span>
                              )}
                              {day.transportation && (
                                <span className="flex items-center gap-1.5">
                                  <Compass className="w-3.5 h-3.5 text-[#3D4450]" />
                                  Transport: <strong className="text-[#202124]">{day.transportation}</strong>
                                </span>
                              )}
                            </div>
                          )}

                          {/* Day specific activities */}
                          {day.activities && day.activities.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2 pt-2">
                              {day.activities.map((act) => (
                                <span
                                  key={act.id}
                                  className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-white text-[#202124] border border-[#E4E5E7] font-medium"
                                >
                                  <Check className="w-3 h-3 text-[#3D4450]" />
                                  {act.name} {act.duration_minutes ? `(${act.duration_minutes}m)` : ""}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Associated Hotels Section */}
              {pkg.hotels && pkg.hotels.length > 0 && (
                <div className="pt-8 border-t border-[#E4E5E7]">
                  <span className="text-[#5F6368] text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
                    Accommodation Standards
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#202124] mb-6">
                    Curated Partner Hotels
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {pkg.hotels.map((h) => (
                      <div
                        key={h.id}
                        className="p-5 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] hover:border-[#24292F]/40 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-serif font-bold text-[#202124]">{h.name}</h3>
                          {h.star_rating && (
                            <div className="flex items-center gap-0.5 text-[#24292F] text-xs">
                              {Array.from({ length: h.star_rating }).map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 fill-[#24292F]" />
                              ))}
                            </div>
                          )}
                        </div>
                        {h.address && (
                          <p className="text-xs text-[#70757A] flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#3D4450] shrink-0" />
                            <span>{h.address}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Included Activities Section */}
              {pkg.activities && pkg.activities.length > 0 && (
                <div className="pt-8 border-t border-[#E4E5E7]">
                  <span className="text-[#5F6368] text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
                    Experiences Included
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#202124] mb-6">
                    Handpicked Activities
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {pkg.activities.map((act) => (
                      <div
                        key={act.id}
                        className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#ECEFF3] border border-[#D3D8DF] text-[#24292F] flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-[#202124]">{act.name}</h4>
                          <span className="text-[11px] text-[#70757A]">
                            {act.category || "Sightseeing"} {act.duration_minutes ? `• ${act.duration_minutes} mins` : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Group Departures & Live Seat Availability Table */}
              <div className="pt-8 border-t border-[#E4E5E7]">
                <span className="text-[#5F6368] text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
                  Fixed Departure Batches
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#202124] mb-6">
                  Upcoming Departure Dates
                </h2>

                {pkg.upcoming_departures && pkg.upcoming_departures.length > 0 ? (
                  <div className="space-y-4">
                    {pkg.upcoming_departures.map((dep) => {
                      const depDate = new Date(dep.departure_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                      const retDate = dep.return_date
                        ? new Date(dep.return_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : null;
                      const price = dep.special_price ?? pkg.base_price;

                      return (
                        <div
                          key={dep.id}
                          className="p-5 rounded-2xl bg-white border border-[#E4E5E7] hover:border-[#24292F]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-serif font-bold text-[#202124]">{depDate}</span>
                              {retDate && <span className="text-xs text-[#70757A]">→ {retDate}</span>}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-[#70757A]">
                              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                                <Users className="w-3.5 h-3.5" />
                                {dep.available_capacity} seats available
                              </span>
                              <span>•</span>
                              <span>Total {dep.total_capacity} capacity</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 justify-between sm:justify-end">
                            <div className="text-right">
                              <span className="text-[11px] uppercase text-[#70757A] block font-medium">Batch Price</span>
                              <span className="text-lg font-serif font-bold text-[#24292F]">
                                ₹{Number(price).toLocaleString("en-IN")}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {dep.available_capacity > 0 ? (
                                onlinePaymentsEnabled ? (
                                  <Link
                                    href={`/booking?package=${pkg.slug}&departure=${dep.id}`}
                                    className="h-9 px-4 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-wider font-bold transition-all shadow-xs flex items-center justify-center"
                                  >
                                    Book Date
                                  </Link>
                                ) : whatsappEnabled ? (
                                  <a
                                    href={getWhatsAppClickToChatUrl(
                                      whatsappNumber,
                                      `Hi ${agencyName}, I would like to inquire about the "${pkg.name}" departure on ${depDate} (₹${Number(price).toLocaleString("en-IN")}). Please share itinerary and payment details.`,
                                      whatsappCountryCode
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-9 px-4 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-wider font-bold transition-all shadow-xs flex items-center justify-center"
                                  >
                                    Enquire Date
                                  </a>
                                ) : (
                                  <Link
                                    href="/contact"
                                    className="h-9 px-4 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-wider font-bold transition-all shadow-xs flex items-center justify-center"
                                  >
                                    Enquire Date
                                  </Link>
                                )
                              ) : (
                                <span className="h-9 px-3 rounded-full bg-[#F3F4F4] text-[#70757A] text-xs uppercase tracking-wider font-semibold flex items-center justify-center">
                                  Sold Out
                                </span>
                              )}
                              {whatsappEnabled && (
                                <a
                                  href={getWhatsAppClickToChatUrl(
                                    whatsappNumber,
                                    `Hi ${agencyName}, I want to inquire about the ${pkg.name} departure on ${depDate}.`,
                                    whatsappCountryCode
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="h-9 px-3.5 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] text-[#0D7A53] text-xs uppercase tracking-wider font-semibold hover:bg-[#DCF3EA] transition-all flex items-center justify-center"
                                  title="Enquire on WhatsApp"
                                >
                                  Enquire
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 rounded-3xl bg-[#F7F7F5] border border-[#E4E5E7] text-center">
                    <Calendar className="w-8 h-8 text-[#5F6368]/60 mx-auto mb-2" />
                    <h3 className="text-base font-serif font-bold text-[#202124]">Private Departures Available Daily</h3>
                    <p className="text-xs text-[#70757A] mt-1 max-w-md mx-auto leading-relaxed">
                      No fixed group batches are currently listed for this itinerary, but our Coimbatore concierge can book a private departure for your exact travel dates.
                    </p>
                  </div>
                )}
              </div>

              {/* Add-Ons / Optional Upgrades */}
              {pkg.add_ons && pkg.add_ons.length > 0 && (
                <div className="pt-8 border-t border-[#E4E5E7]">
                  <span className="text-[#5F6368] text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
                    Enhance Your Journey
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#202124] mb-6">
                    Applicable Add-On Services
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {pkg.add_ons.map((addon) => {
                      const priceTypeLabel =
                        addon.price_type === "per_traveller"
                          ? "/ person"
                          : addon.price_type === "per_room_night"
                          ? "/ room night"
                          : addon.price_type === "per_unit"
                          ? "/ unit"
                          : "/ booking";

                      return (
                        <div
                          key={addon.id}
                          className="p-5 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] hover:border-[#24292F]/40 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5 gap-2">
                              <h4 className="text-sm font-bold text-[#202124] font-serif">{addon.name}</h4>
                              <div className="text-right shrink-0">
                                <span className="text-xs font-semibold text-[#24292F]">
                                  +₹{Number(addon.price).toLocaleString("en-IN")}
                                </span>
                                <span className="text-[10px] text-[#70757A] ml-1">{priceTypeLabel}</span>
                              </div>
                            </div>
                            {addon.description && (
                              <p className="text-xs text-[#70757A] font-light mt-1">
                                {addon.description}
                              </p>
                            )}
                          </div>
                          <div className="mt-3 pt-2 border-t border-[#E4E5E7] text-[10px] uppercase text-[#70757A] flex items-center justify-between font-medium">
                            <span className="flex items-center gap-1">
                              <Plus className="w-3 h-3 text-[#3D4450]" />
                              <span>Selectable at checkout</span>
                            </span>
                            {addon.is_mandatory && (
                              <span className="px-2 py-0.5 rounded-full bg-[#24292F] text-white text-[9px] font-bold">
                                Mandatory
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Photo Gallery Grid if images exist */}
              {pkg.images && pkg.images.length > 0 && (
                <div className="pt-8 border-t border-[#E4E5E7]">
                  <span className="text-[#5F6368] text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
                    Visual Showcase
                  </span>
                  <h3 className="text-2xl font-serif font-bold text-[#202124] mb-6">Photo Gallery</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {pkg.images.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative h-48 rounded-2xl overflow-hidden border border-[#E4E5E7] group shadow-sm bg-[#F7F7F5]"
                      >
                        <TravelImage
                          src={getSafeImageUrl(img.image_url)}
                          alt={img.alt_text || `${pkg.name} photo ${idx + 1}`}
                          fill
                          fallbackSlug={pkg.slug || pkg.destination_slug}
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Sticky Concierge Booking Card */}
            <div>
              <div className="sticky top-28 p-5 sm:p-8 rounded-3xl bg-[#F7F7F5] border border-[#E4E5E7] shadow-xl space-y-6">
                <div>
                  <span className="text-[#5F6368] text-xs uppercase tracking-widest font-semibold block mb-1">
                    {agencyName} Travel Concierge
                  </span>
                  <h3 className="text-2xl font-serif font-bold text-[#202124]">
                    Book / Enquire Journey
                  </h3>
                  <div className="mt-4 pt-4 border-t border-[#E4E5E7]">
                    <span className="text-xs text-[#70757A] uppercase tracking-wider block font-medium">
                      Starting Investment
                    </span>
                    <span className="text-3xl font-serif font-bold text-[#24292F]">
                      ₹{Number(pkg.base_price).toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-[#70757A] ml-1">/ person</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-[#E4E5E7] text-xs text-[#70757A]">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#3D4450]" />
                    <span>No fake fees — transparent inclusions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#3D4450]" />
                    <span>Direct Coimbatore concierge support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#3D4450]" />
                    <span>Free itinerary customisation before booking</span>
                  </div>
                </div>

                {/* Interactive Client-side Actions */}
                <PackageDetailClientActions
                  packageId={pkg.id}
                  packageName={pkg.name}
                  packageSlug={pkg.slug}
                  hasDepartures={Boolean(
                    pkg.upcoming_departures &&
                      pkg.upcoming_departures.some((d) => d.available_capacity > 0)
                  )}
                  waUrl={waUrl}
                  onlinePaymentsEnabled={onlinePaymentsEnabled}
                  maintenanceMessage={maintenanceMsg}
                  whatsappEnabled={whatsappEnabled}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
