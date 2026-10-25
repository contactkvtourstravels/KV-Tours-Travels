import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Compass, MapPin, MessageCircle, Users } from "lucide-react";
import { publicCatalogApi, type PublicDestinationDetail, type PublicPackageListItem } from "@/lib/api";
import { getWhatsAppClickToChatUrl } from "@/lib/constants";
import { PublicLayout } from "@/components/public/PublicLayout";
import { TravelImage } from "@/components/public/TravelImage";
import { getSafeImageUrl, getDestinationFallback, DESTINATION_FALLBACKS } from "@/lib/images";

interface DestinationPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: DestinationPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const [dest, settings] = await Promise.all([
      publicCatalogApi.getDestination(slug),
      publicCatalogApi.getSettings().catch(() => null),
    ]);
    const agencyName = settings?.public_display_name || settings?.agency_name || "Travel Agency";
    const siteUrl = settings?.website_url || "https://wildroot.in";
    const title = dest.seo_title || `${dest.name} Tour Packages | ${agencyName}`;
    const description =
      dest.seo_description ||
      dest.short_description ||
      `Discover customized luxury tour packages to ${dest.name} curated by ${agencyName}.`;

    return {
      title,
      description,
      alternates: {
        canonical: `${siteUrl}/destinations/${slug}`,
      },
      openGraph: {
        title,
        description,
        url: `${siteUrl}/destinations/${slug}`,
        images: dest.cover_image_url ? [dest.cover_image_url] : dest.images[0]?.image_url ? [dest.images[0].image_url] : [],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch {
    return {
      title: "Destination Not Found",
    };
  }
}

export default async function DestinationDetailPage({ params }: DestinationPageProps) {
  const { slug } = await params;
  let destination: PublicDestinationDetail;
  let packages: PublicPackageListItem[] = [];
  let agencyName = "Travel Agency";
  let whatsappNumber: string | undefined;
  let whatsappCountryCode = "+91";
  let agencyCity = "India";
  let whatsappEnabled = true;
  let waUrl = "";

  try {
    const [destData, packagesData, settingsData] = await Promise.all([
      publicCatalogApi.getDestination(slug),
      publicCatalogApi.getPackages({ destination_slug: slug }),
      publicCatalogApi.getSettings().catch(() => null),
    ]);
    destination = destData;
    packages = packagesData;
    agencyName = settingsData?.public_display_name || settingsData?.agency_name || "Travel Agency";
    whatsappNumber = settingsData?.whatsapp_number || settingsData?.support_whatsapp || undefined;
    whatsappCountryCode = settingsData?.whatsapp_country_code || "+91";
    agencyCity = settingsData?.city || "India";
    whatsappEnabled = settingsData?.whatsapp_enabled !== false;

    waUrl = whatsappEnabled
      ? getWhatsAppClickToChatUrl(
          whatsappNumber,
          settingsData?.whatsapp_destination_message?.replace("{destination_name}", destination.name) ||
            `Hi ${agencyName}, I am interested in traveling to ${destination.name}. Please share customized package options.`,
          whatsappCountryCode
        )
      : "";
  } catch {
    notFound();
  }

  const rawHero =
    destination.cover_image_url ||
    destination.images?.[0]?.image_url ||
    getDestinationFallback(destination.slug || destination.name);
  const heroImg = getSafeImageUrl(rawHero);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: destination.name,
    description: destination.short_description || destination.description,
    image: heroImg,
    touristType: ["Luxury", "Adventure", "Couples", "Family"],
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
        name: "Destinations",
        item: "https://wildroot.in/destinations",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: destination.name,
        item: `https://wildroot.in/destinations/${slug}`,
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
      <section className="relative min-h-[60vh] sm:min-h-[70vh] flex items-end overflow-hidden bg-black">
        <TravelImage
          src={heroImg}
          alt={destination.name}
          fill
          priority
          fallbackSlug={destination.slug}
          sizes="100vw"
          className="object-cover object-center scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/60" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
          <Link
            href="/destinations"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#ECEFF3]" />
            <span>Back to All Destinations</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/60 border border-white/20 text-[#ECEFF3] text-xs uppercase tracking-widest font-semibold backdrop-blur-md">
              <MapPin className="w-3.5 h-3.5" />
              <span>
                {destination.state_or_city ? `${destination.state_or_city}, ` : ""}
                {destination.country} {destination.region ? `• ${destination.region}` : ""}
              </span>
            </div>
            {destination.category && (
              <span className="px-3 py-1 rounded-full bg-[#24292F]/80 border border-[#D3D8DF]/40 text-[#ECEFF3] text-[11px] uppercase tracking-wider font-semibold backdrop-blur-md">
                {destination.category}
              </span>
            )}
            {destination.travel_type && (
              <span className="px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-[11px] uppercase tracking-wider font-semibold backdrop-blur-md">
                {destination.travel_type}
              </span>
            )}
          </div>

          <h1 className="text-4xl sm:text-6xl font-serif font-bold text-white tracking-tight">
            {destination.name}
          </h1>

          {destination.short_description && (
            <p className="mt-4 text-base sm:text-lg text-white/85 max-w-2xl font-light leading-relaxed">
              {destination.short_description}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Link
              href={`/custom-trip?destination=${encodeURIComponent(destination.name)}`}
              className="h-11 px-7 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold shadow-xs hover:scale-[1.02] transition-all flex items-center justify-center"
            >
              Plan Custom {destination.name} Trip
            </Link>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 px-6 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] text-[#0D7A53] text-xs uppercase tracking-widest font-semibold hover:bg-[#DCF3EA] transition-all flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Inquiry</span>
            </a>
          </div>
        </div>
      </section>

      {/* 2. DESTINATION STORY & DESCRIPTION */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-12">
              <div>
                <span className="text-[#5F6368] text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
                  Destination Overview
                </span>
                <h2 className="text-2xl sm:text-4xl font-serif font-bold text-[#202124]">
                  Discover {destination.name}
                </h2>
                <div className="mt-6 text-[#70757A] text-sm sm:text-base leading-relaxed space-y-4 font-light">
                  {destination.description ? (
                    <p className="whitespace-pre-line">{destination.description}</p>
                  ) : (
                    <p>
                      Immerse yourself in {destination.name}. Whether you seek relaxation, thrilling outdoor experiences, or rich cultural exploration, our Coimbatore concierge customizes every single detail of your itinerary.
                    </p>
                  )}
                </div>
              </div>

              {/* HIGHLIGHTS & ATTRACTIONS BENTO */}
              {destination.highlights && destination.highlights.length > 0 && (
                <div className="pt-8 border-t border-[#E4E5E7]">
                  <span className="text-[#5F6368] text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
                    Must-Visit Attractions
                  </span>
                  <h3 className="text-2xl font-serif font-bold text-[#202124] mb-6">
                    Top Highlights & Experiences
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {destination.highlights.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-5 rounded-3xl bg-[#F7F7F5] border border-[#E4E5E7] hover:border-[#24292F]/40 transition-all flex flex-col justify-between group shadow-sm"
                      >
                        <div>
                          {item.image_url && (
                            <div className="relative h-44 rounded-2xl overflow-hidden mb-4 border border-[#E4E5E7]">
                              <TravelImage
                                src={item.image_url}
                                alt={item.title}
                                fill
                                fallbackSlug={destination.slug}
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              {item.category && (
                                <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-black/65 backdrop-blur-md text-[10px] uppercase font-bold text-[#ECEFF3]">
                                  {item.category}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-lg font-serif font-bold text-[#202124]">{item.title}</h4>
                            {!item.image_url && item.category && (
                              <span className="px-2.5 py-0.5 rounded-full bg-[#E4E5E7] text-[10px] uppercase font-semibold text-[#5F6368]">
                                {item.category}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-xs sm:text-sm text-[#70757A] font-light leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                        {item.caption && (
                          <div className="mt-3 pt-2 border-t border-[#E4E5E7] text-[11px] text-[#5F6368] italic">
                            💡 {item.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PRACTICAL TRAVEL GUIDE */}
              {destination.travel_guide && Object.keys(destination.travel_guide).length > 0 && (
                <div className="pt-8 border-t border-[#E4E5E7]">
                  <span className="text-[#5F6368] text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
                    Essential Information
                  </span>
                  <h3 className="text-2xl font-serif font-bold text-[#202124] mb-6">
                    Practical Travel Guide
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {destination.travel_guide.best_time_to_visit && (
                      <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7]">
                        <span className="text-[10px] uppercase tracking-wider text-[#5F6368] font-bold block mb-1">
                          📅 Best Time to Visit
                        </span>
                        <p className="text-xs sm:text-sm text-[#202124] font-medium">
                          {destination.travel_guide.best_time_to_visit}
                        </p>
                      </div>
                    )}
                    {destination.travel_guide.recommended_duration && (
                      <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7]">
                        <span className="text-[10px] uppercase tracking-wider text-[#5F6368] font-bold block mb-1">
                          ⏱️ Recommended Trip Duration
                        </span>
                        <p className="text-xs sm:text-sm text-[#202124] font-medium">
                          {destination.travel_guide.recommended_duration}
                        </p>
                      </div>
                    )}
                    {destination.travel_guide.seasonal_weather && (
                      <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7]">
                        <span className="text-[10px] uppercase tracking-wider text-[#5F6368] font-bold block mb-1">
                          🌤️ Climate & Weather
                        </span>
                        <p className="text-xs sm:text-sm text-[#202124] font-medium">
                          {destination.travel_guide.seasonal_weather}
                        </p>
                      </div>
                    )}
                    {destination.travel_guide.local_language && (
                      <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7]">
                        <span className="text-[10px] uppercase tracking-wider text-[#5F6368] font-bold block mb-1">
                          🗣️ Local Language
                        </span>
                        <p className="text-xs sm:text-sm text-[#202124] font-medium">
                          {destination.travel_guide.local_language}
                        </p>
                      </div>
                    )}
                    {destination.travel_guide.currency && (
                      <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7]">
                        <span className="text-[10px] uppercase tracking-wider text-[#5F6368] font-bold block mb-1">
                          💳 Local Currency
                        </span>
                        <p className="text-xs sm:text-sm text-[#202124] font-medium">
                          {destination.travel_guide.currency}
                        </p>
                      </div>
                    )}
                    {destination.travel_guide.visa_entry && (
                      <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7]">
                        <span className="text-[10px] uppercase tracking-wider text-[#5F6368] font-bold block mb-1">
                          🛂 Visa & Entry
                        </span>
                        <p className="text-xs sm:text-sm text-[#202124] font-medium">
                          {destination.travel_guide.visa_entry}
                        </p>
                      </div>
                    )}
                    {destination.travel_guide.time_zone && (
                      <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7]">
                        <span className="text-[10px] uppercase tracking-wider text-[#5F6368] font-bold block mb-1">
                          ⏰ Time Zone
                        </span>
                        <p className="text-xs sm:text-sm text-[#202124] font-medium">
                          {destination.travel_guide.time_zone}
                        </p>
                      </div>
                    )}
                    {destination.travel_guide.clothing_etiquette && (
                      <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7]">
                        <span className="text-[10px] uppercase tracking-wider text-[#5F6368] font-bold block mb-1">
                          👔 Clothing & Etiquette
                        </span>
                        <p className="text-xs sm:text-sm text-[#202124] font-medium">
                          {destination.travel_guide.clothing_etiquette}
                        </p>
                      </div>
                    )}
                    {(destination.travel_guide.transport_options || destination.travel_guide.transport_getting_around) && (
                      <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7]">
                        <span className="text-[10px] uppercase tracking-wider text-[#5F6368] font-bold block mb-1">
                          🚗 Transport & Getting Around
                        </span>
                        <p className="text-xs sm:text-sm text-[#202124] font-medium">
                          {destination.travel_guide.transport_options || destination.travel_guide.transport_getting_around}
                        </p>
                      </div>
                    )}
                    {(destination.travel_guide.safety_tips || destination.travel_guide.safety_information) && (
                      <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7]">
                        <span className="text-[10px] uppercase tracking-wider text-[#5F6368] font-bold block mb-1">
                          🛡️ Safety & Health Information
                        </span>
                        <p className="text-xs sm:text-sm text-[#202124] font-medium">
                          {destination.travel_guide.safety_tips || destination.travel_guide.safety_information}
                        </p>
                      </div>
                    )}
                    {destination.travel_guide.packing_tips && (
                      <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7]">
                        <span className="text-[10px] uppercase tracking-wider text-[#5F6368] font-bold block mb-1">
                          🧳 Packing Tips & Essentials
                        </span>
                        <p className="text-xs sm:text-sm text-[#202124] font-medium">
                          {destination.travel_guide.packing_tips}
                        </p>
                      </div>
                    )}
                    {destination.travel_guide.accessibility_information && (
                      <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7]">
                        <span className="text-[10px] uppercase tracking-wider text-[#5F6368] font-bold block mb-1">
                          ♿ Accessibility Information
                        </span>
                        <p className="text-xs sm:text-sm text-[#202124] font-medium">
                          {destination.travel_guide.accessibility_information}
                        </p>
                      </div>
                    )}
                    {(destination.travel_guide.insider_advice || destination.travel_guide.travel_advice) && (
                      <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] sm:col-span-2 md:col-span-3">
                        <span className="text-[10px] uppercase tracking-wider text-[#5F6368] font-bold block mb-1">
                          ✨ Concierge Insider Advice
                        </span>
                        <p className="text-xs sm:text-sm text-[#202124] font-medium">
                          {destination.travel_guide.insider_advice || destination.travel_guide.travel_advice}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* FREQUENTLY ASKED QUESTIONS */}
              {destination.faqs && destination.faqs.length > 0 && (
                <div className="pt-8 border-t border-[#E4E5E7]">
                  <span className="text-[#5F6368] text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
                    Traveller Answers
                  </span>
                  <h3 className="text-2xl font-serif font-bold text-[#202124] mb-6">
                    Frequently Asked Questions
                  </h3>
                  <div className="space-y-3">
                    {destination.faqs.map((faq, idx) => (
                      <details
                        key={idx}
                        className="group p-5 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] open:bg-white open:border-[#24292F]/40 transition-all shadow-xs"
                      >
                        <summary className="font-serif font-bold text-sm sm:text-base text-[#202124] cursor-pointer list-none flex items-center justify-between">
                          <span>{faq.question}</span>
                          <span className="text-[#5F6368] group-open:rotate-180 transition-transform ml-2">▼</span>
                        </summary>
                        <p className="mt-3 text-xs sm:text-sm text-[#70757A] font-light leading-relaxed pt-2 border-t border-[#E4E5E7]">
                          {faq.answer}
                        </p>
                      </details>
                    ))}
                  </div>
                </div>
              )}

              {/* Gallery Grid if images exist */}
              {destination.images && destination.images.length > 0 && (
                <div className="pt-8 border-t border-[#E4E5E7]">
                  <h3 className="text-xl font-serif font-bold text-[#202124] mb-6">Photo Gallery</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {destination.images.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative h-48 rounded-2xl overflow-hidden border border-[#E4E5E7] group shadow-sm bg-[#F7F7F5]"
                      >
                        <TravelImage
                          src={getSafeImageUrl(img.image_url)}
                          alt={img.alt_text || `${destination.name} gallery image ${idx + 1}`}
                          fill
                          fallbackSlug={destination.slug}
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Sidebar: Fast Assistance */}
            <div className="space-y-6">
              <div className="p-5 sm:p-8 rounded-3xl bg-[#F7F7F5] border border-[#E4E5E7] shadow-sm">
                <span className="text-[#5F6368] text-xs uppercase tracking-widest font-semibold block mb-1">
                  {agencyCity} Travel Concierge
                </span>
                <h3 className="text-xl font-serif font-bold text-[#202124] mb-4">
                  Planning {destination.name}?
                </h3>
                <p className="text-[#70757A] text-xs leading-relaxed mb-6">
                  Get personalized flight recommendations, private airport transfers, curated 4-star and 5-star stays, and customized day itineraries.
                </p>

                <div className="space-y-3">
                  <Link
                    href={`/custom-trip?destination=${encodeURIComponent(destination.name)}`}
                    className="w-full h-11 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Compass className="w-4 h-4" />
                    <span>Plan Custom Itinerary</span>
                  </Link>

                  {Boolean(waUrl) && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-11 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] text-[#0D7A53] text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2 hover:bg-[#DCF3EA] transition-all"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp Concierge</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. RELATED PACKAGES FOR THIS DESTINATION */}
      <section className="py-20 bg-[#F7F7F5] border-t border-[#E4E5E7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-[#5F6368] text-xs uppercase tracking-widest font-semibold block mb-1">
                Packages Available
              </span>
              <h2 className="text-3xl font-serif font-bold text-[#202124]">
                Curated Trips in {destination.name}
              </h2>
            </div>
          </div>

          {packages.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-3xl border border-[#E4E5E7] bg-white">
              <Compass className="w-10 h-10 text-[#5F6368]/50 mx-auto mb-3" />
              <h3 className="text-lg font-serif font-bold text-[#202124]">Tailored Custom Trips Available</h3>
              <p className="text-[#70757A] text-xs sm:text-sm mt-1 max-w-md mx-auto">
                While pre-packaged dates are being finalized, our concierge can customize a private departure for your group right now.
              </p>
              <Link
                href={`/custom-trip?destination=${encodeURIComponent(destination.name)}`}
                className="mt-6 inline-block px-6 py-2.5 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold shadow-xs"
              >
                Request Custom Package
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="rounded-3xl overflow-hidden bg-white border border-[#E4E5E7] hover:border-[#24292F]/40 transition-all flex flex-col shadow-sm hover:shadow-xl group"
                >
                  <div className="relative h-56 overflow-hidden">
                    <TravelImage
                      src={
                        pkg.featured_image?.image_url ||
                        heroImg
                      }
                      alt={pkg.name}
                      fill
                      fallbackSlug={pkg.slug || destination.slug}
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                      <span className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-sm">
                        <Clock className="w-3.5 h-3.5 text-[#ECEFF3]" />
                        {pkg.duration_days}D / {pkg.duration_nights}N
                      </span>
                      <span className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-sm">
                        <Users className="w-3.5 h-3.5 text-[#ECEFF3]" />
                        Min {pkg.minimum_travellers}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-xl font-serif font-bold text-[#202124] group-hover:text-[#3D4450] transition-colors">
                        {pkg.name}
                      </h3>
                      <div className="mt-4 pt-4 border-t border-[#E4E5E7]">
                        <span className="text-[10px] uppercase text-[#70757A] block font-medium">Starting from</span>
                        <span className="text-xl font-serif font-bold text-[#24292F]">
                          ₹{Number(pkg.base_price).toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs text-[#70757A] ml-1">/ person</span>
                      </div>
                    </div>

                    <Link
                      href={`/packages/${pkg.slug}`}
                      className="w-full h-10 rounded-full bg-[#F3F4F4] hover:bg-[#E4E5E7] border border-[#E4E5E7] text-[#202124] text-xs uppercase tracking-widest font-semibold text-center flex items-center justify-center transition-all"
                    >
                      View Itinerary & Dates
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
