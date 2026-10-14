"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Compass,
  HeartHandshake,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
  Star,
  Clock,
  Eye,
  Info,
} from "lucide-react";
import { PublicLayout } from "@/components/public/PublicLayout";
import {
  publicCatalogApi,
  AboutPageContent as AboutPageContentType,
  PublicPageResponse,
  type PublicSiteSettings,
} from "@/lib/api";
import {
  DEFAULT_WHATSAPP_NUMBER,
  getWhatsAppClickToChatUrl,
} from "@/lib/constants";

function AboutPageContent() {

  const searchParams = useSearchParams();
  const isPreviewParam = searchParams.get("preview") === "true";

  const [pageData, setPageData] = useState<PublicPageResponse<AboutPageContentType> | null>(null);
  const [settings, setSettings] = useState<PublicSiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [pageRes, settingsRes] = await Promise.all([
          publicCatalogApi.getPageContent<AboutPageContentType>("about", isPreviewParam).catch(() => null),
          publicCatalogApi.getSettings().catch(() => null),
        ]);

        if (pageRes) setPageData(pageRes);
        if (settingsRes) setSettings(settingsRes);
      } catch {
        // Fallback gracefully
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isPreviewParam]);

  const branding = pageData?.agency_branding || {};
  const agencyName =
    branding.agency_name ||
    settings?.public_display_name ||
    settings?.agency_name ||
    "KV Tours & Travels";
  const city = branding.city || settings?.city || "Coimbatore";
  const address =
    branding.office_address ||
    settings?.office_address ||
    settings?.public_office_address ||
    "Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu 641012";
  const whatsappNumber =
    branding.whatsapp_number || settings?.whatsapp_number || DEFAULT_WHATSAPP_NUMBER;

  const content = pageData?.content;

  // Helpers for icons
  const renderPrincipleIcon = (iconName: string) => {
    switch (iconName) {
      case "ShieldCheck":
        return <ShieldCheck className="w-6 h-6" />;
      case "HeartHandshake":
        return <HeartHandshake className="w-6 h-6" />;
      case "Sparkles":
        return <Sparkles className="w-6 h-6" />;
      case "Compass":
      default:
        return <Compass className="w-6 h-6" />;
    }
  };

  // WhatsApp click-to-chat URL
  const waUrl = getWhatsAppClickToChatUrl(
    whatsappNumber,
    `Hi ${agencyName} ${city}, I would like to learn more about your bespoke travel planning.`
  );

  // Agency initials for avatar badge (e.g. "ABC" or "KV")
  const agencyInitials = agencyName
    .split(/\s+/)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() || "")
    .join("") || "KV";

  return (
    <PublicLayout>
      {/* Draft Preview Indicator Banner */}
      {pageData?.is_preview && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2 shadow-inner">
          <Eye className="w-4 h-4" />
          <span>Viewing Unpublished Draft Mode Preview • Staff Access Only</span>
        </div>
      )}

      {/* Render sections based on content.sections_order or fallback */}
      {(!content || content.hero?.show_section !== false) && (
        <section
          className="relative py-20 bg-[#F7F7F5] border-b border-[#E4E5E7] overflow-hidden"
          style={{
            backgroundImage: content?.hero?.background_image_url
              ? `linear-gradient(rgba(247,247,245,0.92), rgba(247,247,245,0.92)), url(${content.hero.background_image_url})`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#D3D8DF] bg-white text-[#24292F] text-xs uppercase tracking-widest font-semibold mb-4 shadow-2xs">
              <Compass className="w-3.5 h-3.5 text-[#5F6368]" />
              <span>{content?.hero?.eyebrow || `${city} Born • Worldwide Curated`}</span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-[#202124] tracking-tight">
              {content?.hero?.heading || `About ${agencyName}`}
            </h1>
            <p className="mt-4 text-[#70757A] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-light">
              {content?.hero?.description ||
                settings?.tagline ||
                "Crafting bespoke international holidays, domestic expeditions, and signature group escapes with genuine care and meticulous attention to detail."}
            </p>
          </div>
        </section>
      )}

      {/* Narrative & Body Sections */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
          {/* Section 1: Who We Are / Our Story */}
          {(!content || content.story?.show_section !== false) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-[#5F6368] text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
                  {content?.story?.eyebrow || "Our Origin & Heart"}
                </span>
                <h2 className="text-2xl sm:text-4xl font-serif font-bold text-[#202124] tracking-tight">
                  {content?.story?.title || `Rooted in ${city}, Inspired by the World`}
                </h2>
                <div className="mt-6 text-[#70757A] text-sm sm:text-base leading-relaxed space-y-4 font-light">
                  {content?.story?.paragraphs && content.story.paragraphs.length > 0 ? (
                    content.story.paragraphs.map((p, idx) => <p key={idx}>{p}</p>)
                  ) : (
                    <>
                      <p>
                        {agencyName} was established in {city} to offer discerning travelers a refreshing alternative to impersonal booking portals and rigid group tours.
                      </p>
                      <p>
                        We believe that travel is deeply personal. Whether it is stepping onto the pristine atolls of the Maldives, discovering the lagoons of Lakshadweep, traversing the snowy landscapes of Kazakhstan, or breathing the pine air of Manali, every journey should feel effortless and memorable.
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="p-8 rounded-3xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-6 shadow-sm">
                {content?.story?.image_url && (
                  <div className="w-full h-48 rounded-2xl overflow-hidden border border-[#E4E5E7] mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={content.story.image_url}
                      alt={content.story.title || "Our Story"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="h-9 px-3.5 rounded-full bg-[#24292F] text-white flex items-center justify-center gap-1.5 border border-[#3D4450] font-serif font-bold text-xs tracking-wider shadow-2xs">
                    <Compass className="w-3.5 h-3.5 text-[#ECEFF3]" />
                    <span>{agencyInitials}</span>
                  </div>
                  <div>
                    <h3 className="text-[#202124] font-serif font-bold text-base">
                      {content?.story?.office_card_title || agencyName}
                    </h3>
                    <span className="text-xs text-[#5F6368] font-semibold uppercase tracking-wider">
                      {city} Concierge Office
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#70757A] leading-relaxed">
                  {content?.story?.office_card_description ||
                    `Headquartered at ${address}, our team provides face-to-face consultations as well as digital planning for clients across South India and beyond.`}
                </p>
                <div className="pt-2 border-t border-[#E4E5E7] flex items-center gap-2 text-xs text-[#202124] font-medium">
                  <MapPin className="w-4 h-4 text-[#3D4450] shrink-0" />
                  <span>{content?.office?.address || address}</span>
                </div>
              </div>
            </div>
          )}

          {/* Section: Mission & Vision */}
          {content?.mission_vision?.show_section && (
            <div className="border-t border-[#E4E5E7] pt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 rounded-3xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-3 shadow-2xs">
                <span className="text-xs uppercase tracking-widest text-[#5F6368] font-semibold block">
                  Purpose
                </span>
                <h3 className="text-xl font-serif font-bold text-[#202124]">
                  {content.mission_vision.mission_title}
                </h3>
                <p className="text-sm text-[#70757A] leading-relaxed font-light">
                  {content.mission_vision.mission_description}
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-3 shadow-2xs">
                <span className="text-xs uppercase tracking-widest text-[#5F6368] font-semibold block">
                  Aspiration
                </span>
                <h3 className="text-xl font-serif font-bold text-[#202124]">
                  {content.mission_vision.vision_title}
                </h3>
                <p className="text-sm text-[#70757A] leading-relaxed font-light">
                  {content.mission_vision.vision_description}
                </p>
              </div>
            </div>
          )}

          {/* Section 2: Core Philosophy / Principles */}
          {(!content || content.principles?.show_section !== false) && (
            <div className="border-t border-[#E4E5E7] pt-20">
              <div className="text-center max-w-2xl mx-auto mb-16">
                <span className="text-[#5F6368] text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
                  {content?.principles?.eyebrow || "Our Standards"}
                </span>
                <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#202124] tracking-tight">
                  {content?.principles?.heading || "Our Core Travel Principles"}
                </h2>
                <p className="mt-3 text-[#70757A] text-xs sm:text-sm">
                  {content?.principles?.description ||
                    "Honest, verified commitments that guide every itinerary we build."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {content?.principles?.cards && content.principles.cards.length > 0 ? (
                  content.principles.cards.map((card) => (
                    <div
                      key={card.id}
                      className="p-8 rounded-3xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-4 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#ECEFF3] border border-[#D3D8DF] text-[#24292F] flex items-center justify-center">
                        {renderPrincipleIcon(card.icon)}
                      </div>
                      <h3 className="text-lg font-serif font-bold text-[#202124]">{card.title}</h3>
                      <p className="text-xs sm:text-sm text-[#70757A] leading-relaxed font-light">
                        {card.description}
                      </p>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="p-8 rounded-3xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-4 shadow-sm hover:shadow-md transition-all">
                      <div className="w-12 h-12 rounded-2xl bg-[#ECEFF3] border border-[#D3D8DF] text-[#24292F] flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-serif font-bold text-[#202124]">
                        Vetted Accommodations
                      </h3>
                      <p className="text-xs sm:text-sm text-[#70757A] leading-relaxed font-light">
                        We don&apos;t book random hotels off algorithm aggregators. Every resort, boutique hotel, and stay partner is verified for cleanliness, safety, hospitality, and location.
                      </p>
                    </div>

                    <div className="p-8 rounded-3xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-4 shadow-sm hover:shadow-md transition-all">
                      <div className="w-12 h-12 rounded-2xl bg-[#ECEFF3] border border-[#D3D8DF] text-[#24292F] flex items-center justify-center">
                        <HeartHandshake className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-serif font-bold text-[#202124]">
                        Personal Care
                      </h3>
                      <p className="text-xs sm:text-sm text-[#70757A] leading-relaxed font-light">
                        You are not a ticket number. A designated {city} travel advisor coordinates your visas, flights, vouchers, and remains reachable via WhatsApp throughout your entire holiday.
                      </p>
                    </div>

                    <div className="p-8 rounded-3xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-4 shadow-sm hover:shadow-md transition-all">
                      <div className="w-12 h-12 rounded-2xl bg-[#ECEFF3] border border-[#D3D8DF] text-[#24292F] flex items-center justify-center">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-serif font-bold text-[#202124]">
                        Transparent Planning
                      </h3>
                      <p className="text-xs sm:text-sm text-[#70757A] leading-relaxed font-light">
                        No hidden surcharges or surprise fees. Every quote clearly specifies room categories, inclusions, transfers, meal plans, and activity admissions before you pay.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Section: Statistics Counters */}
          {content?.stats?.show_section && content.stats.items.length > 0 && (
            <div className="border-t border-[#E4E5E7] pt-16">
              <div className="text-center max-w-xl mx-auto mb-10">
                <h3 className="text-2xl font-serif font-bold text-[#202124]">
                  {content.stats.heading || "By The Numbers"}
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
                {content.stats.items.map((stat) => (
                  <div
                    key={stat.id}
                    className="p-6 rounded-3xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-2 shadow-2xs"
                  >
                    <div className="text-2xl sm:text-4xl font-serif font-bold text-[#202124]">
                      {stat.value}
                    </div>
                    <div className="text-xs uppercase tracking-wider font-semibold text-[#5F6368]">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Team Members */}
          {content?.team?.show_section && content.team.members.length > 0 && (
            <div className="border-t border-[#E4E5E7] pt-20">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <span className="text-[#5F6368] text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
                  Our People
                </span>
                <h2 className="text-3xl font-serif font-bold text-[#202124]">
                  {content.team.heading || "Meet Our Travel Designers"}
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-[#70757A]">
                  {content.team.description}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                {content.team.members.map((member) => (
                  <div
                    key={member.id}
                    className="p-6 rounded-3xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-4 text-center shadow-2xs"
                  >
                    {member.photo_url ? (
                      <div className="w-24 h-24 rounded-full overflow-hidden mx-auto border-2 border-white shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={member.photo_url}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-[#ECEFF3] border border-[#D3D8DF] text-[#24292F] flex items-center justify-center mx-auto text-xl font-bold font-serif">
                        {member.name[0]}
                      </div>
                    )}
                    <div>
                      <h4 className="text-base font-serif font-bold text-[#202124]">
                        {member.name}
                      </h4>
                      <p className="text-xs font-semibold text-[#5F6368] uppercase tracking-wider mt-0.5">
                        {member.role}
                      </p>
                    </div>
                    {member.bio && (
                      <p className="text-xs text-[#70757A] leading-relaxed font-light">
                        {member.bio}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Testimonials */}
          {content?.testimonials?.show_section && content.testimonials.items.length > 0 && (
            <div className="border-t border-[#E4E5E7] pt-20">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <span className="text-[#5F6368] text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
                  Guest Experiences
                </span>
                <h2 className="text-3xl font-serif font-bold text-[#202124]">
                  {content.testimonials.heading || "Traveler Reflections"}
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-[#70757A]">
                  {content.testimonials.description}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {content.testimonials.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-8 rounded-3xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-4 shadow-sm"
                  >
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: item.rating || 5 }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-500" />
                      ))}
                    </div>
                    <p className="text-sm text-[#202124] italic font-serif leading-relaxed">
                      &ldquo;{item.quote}&rdquo;
                    </p>
                    <div className="pt-2 border-t border-[#E4E5E7]">
                      <h4 className="text-xs font-bold text-[#202124]">{item.author}</h4>
                      <p className="text-[11px] text-[#70757A]">
                        {item.trip_name ? `${item.trip_name} • ` : ""}
                        {item.location}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Call to Action Banner */}
          {(!content || content.cta?.show_section !== false) && (
            <div className="rounded-3xl border border-[#E4E5E7] bg-[#F7F7F5] p-8 sm:p-12 text-center space-y-6 shadow-sm">
              <h3 className="text-2xl sm:text-4xl font-serif font-bold text-[#202124]">
                {content?.cta?.heading || `Experience the ${agencyName} Difference`}
              </h3>
              <p className="text-[#70757A] text-sm max-w-xl mx-auto leading-relaxed">
                {content?.cta?.description ||
                  `Let us turn your vacation dreams into a seamless reality. Connect with our ${city} advisors today.`}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
                <Link
                  href={content?.cta?.primary_button_link || "/custom-trip"}
                  className="h-11 px-8 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold shadow-xs transition-all flex items-center justify-center"
                >
                  {content?.cta?.primary_button_text || "Plan Your Trip"}
                </Link>
                {settings?.whatsapp_enabled !== false && (
                  <a
                    href={content?.cta?.secondary_button_link || waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-11 px-6 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] text-[#0D7A53] text-xs uppercase tracking-widest font-semibold hover:bg-[#DCF3EA] transition-all flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{content?.cta?.secondary_button_text || "Chat on WhatsApp"}</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

export default function AboutPage() {
  return (
    <Suspense
      fallback={
        <PublicLayout>
          <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-[#24292F] border-t-transparent animate-spin" />
          </div>
        </PublicLayout>
      }
    >
      <AboutPageContent />
    </Suspense>
  );
}

