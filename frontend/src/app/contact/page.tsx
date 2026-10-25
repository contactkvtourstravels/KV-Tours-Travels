"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Compass,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Navigation,
  ExternalLink,
  Eye,
} from "lucide-react";
import {
  publicCatalogApi,
  ContactPageContent as ContactPageContentType,
  PublicPageResponse,
  type PublicInquiryCreate,
  type PublicSiteSettings,
} from "@/lib/api";
import { PublicLayout } from "@/components/public/PublicLayout";
import {
  DEFAULT_BUSINESS_PHONE,
  DEFAULT_WHATSAPP_NUMBER,
  getWhatsAppClickToChatUrl,
} from "@/lib/constants";
import { useBranding } from "@/context/BrandingContext";

function ContactPageContent() {
  const { displayName: brandDisplayName } = useBranding();
  const searchParams = useSearchParams();
  const isPreviewParam = searchParams.get("preview") === "true";

  const [pageData, setPageData] = useState<PublicPageResponse<ContactPageContentType> | null>(null);
  const [settings, setSettings] = useState<PublicSiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [pageRes, settingsRes] = await Promise.all([
          publicCatalogApi.getPageContent<ContactPageContentType>("contact", isPreviewParam).catch(() => null),
          publicCatalogApi.getSettings().catch(() => null),
        ]);

        if (pageRes) {
          setPageData(pageRes);
          if (pageRes.content?.form?.topics?.length && !subject) {
            setSubject(pageRes.content.form.topics[0]);
          }
        }
        if (settingsRes) setSettings(settingsRes);
      } catch {
        // Fallback
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
    brandDisplayName ||
    "The Wild Root";
  const city = branding.city || settings?.city || "Palakkad";
  const content = pageData?.content;

  // Resolve office address & phones with fallbacks
  const officeAddress =
    content?.cards?.office_address ||
    branding.office_address ||
    settings?.office_address ||
    "The Wild Root Lounge, Fort Maidan Road, Near Palakkad Fort, Palakkad, Kerala 678001";

  const operatingHours =
    content?.cards?.operating_hours ||
    branding.operating_hours ||
    settings?.operating_hours ||
    "Mon – Sat: 09:30 AM – 07:30 PM IST";

  const primaryPhone =
    content?.cards?.primary_phone ||
    branding.contact_phone ||
    settings?.contact_phone ||
    DEFAULT_BUSINESS_PHONE;

  const contactEmail =
    content?.cards?.contact_email ||
    branding.contact_email ||
    settings?.contact_email ||
    "concierge@thewildroot.in";

  const whatsappNumber =
    branding.whatsapp_number ||
    settings?.whatsapp_number ||
    settings?.support_whatsapp ||
    DEFAULT_WHATSAPP_NUMBER;

  const whatsappCountryCode =
    (typeof branding.whatsapp_country_code === "string" ? branding.whatsapp_country_code : undefined) ||
    settings?.whatsapp_country_code ||
    "+91";

  const whatsappEnabled =
    settings?.whatsapp_enabled !== false &&
    settings?.whatsapp_show_on_contact_page !== false;

  const waUrl = whatsappEnabled
    ? getWhatsAppClickToChatUrl(
        whatsappNumber,
        settings?.whatsapp_prefilled_message ||
          `Hi ${agencyName} ${city}, I am reaching out through your website contact page.`,
        whatsappCountryCode
      )
    : "";

  const topicsList =
    content?.form?.topics && content.form.topics.length > 0
      ? content.form.topics
      : [
          "Bespoke Kerala & Western Ghats Expeditions",
          "Luxury Maldives & Lakshadweep Escapes",
          "Custom International Honeymoon Itineraries",
          "Himalayan Treks & Nature Retreats",
          "Private Family & Corporate Escapes",
          "Flight Ticketing & Visa Concierge",
        ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const chosenTopic = subject || topicsList[0] || "General Enquiry";
    const compiledMessage = `[Subject: ${chosenTopic}]\n${message}`;

    startTransition(async () => {
      try {
        const payload: PublicInquiryCreate = {
          name,
          email,
          phone: phone || undefined,
          message: compiledMessage,
          source: "contact_form",
        };

        const res = await publicCatalogApi.submitInquiry(payload);
        const successNotice =
          content?.form?.success_message ||
          res.message ||
          "Thank you! Our travel concierge has received your message and will reach out shortly.";
        setSuccess(successNotice);
        setName("");
        setEmail("");
        setPhone("");
        setMessage("");
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Failed to send message. Please try again or reach out on WhatsApp.";
        setError(errorMsg);
      }
    });
  };

  // Maps coordinates / links
  const mapEmbedUrl = content?.map?.embed_url;
  const mapDirectionsUrl =
    content?.map?.directions_url ||
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      officeAddress
    )}`;
  const mapLocationUrl =
    content?.map?.location_url ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      officeAddress
    )}`;

  return (
    <PublicLayout>
      {/* Draft Preview Indicator Banner */}
      {pageData?.is_preview && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2 shadow-inner">
          <Eye className="w-4 h-4" />
          <span>Viewing Unpublished Draft Mode Preview • Staff Access Only</span>
        </div>
      )}

      {/* Header Banner */}
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
              <span>{content?.hero?.eyebrow || `${city} Concierge Desk`}</span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-[#202124] tracking-tight">
              {content?.hero?.heading || "Connect With Our Travel Experts"}
            </h1>
            <p className="mt-4 text-[#70757A] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-light">
              {content?.hero?.description ||
                "Have questions regarding upcoming departures, custom itineraries, or visa requirements? We are here to guide you every step of the way."}
            </p>
          </div>
        </section>
      )}

      {/* Main Contact Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left: Verified Contact Cards & Location */}
            {(!content || content.cards?.show_section !== false) && (
              <div className="space-y-6">
                {/* Office Address Card */}
                <div className="p-8 rounded-3xl bg-[#F7F7F5] border border-[#E4E5E7] shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-[#ECEFF3] border border-[#D3D8DF] text-[#24292F] flex items-center justify-center mb-6">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] uppercase tracking-widest text-[#5F6368] font-semibold block mb-1">
                    {content?.cards?.office_card_title || "Visit Our Office"}
                  </span>
                  <h3 className="text-lg font-serif font-bold text-[#202124] mb-2">
                    {content?.cards?.office_card_heading || `${city}, Kerala`}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#70757A] leading-relaxed font-light">
                    {officeAddress}
                  </p>
                  <div className="mt-4 pt-4 border-t border-[#E4E5E7] text-[11px] text-[#70757A] flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-[#3D4450]" />
                    <span>{operatingHours}</span>
                  </div>
                </div>

                {/* Phone & Email Card */}
                <div className="p-8 rounded-3xl bg-[#F7F7F5] border border-[#E4E5E7] shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-[#ECEFF3] border border-[#D3D8DF] text-[#24292F] flex items-center justify-center mb-6">
                    <Phone className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] uppercase tracking-widest text-[#5F6368] font-semibold block mb-1">
                    {content?.cards?.phone_card_title || "Direct Inquiries"}
                  </span>
                  <h3 className="text-lg font-serif font-bold text-[#202124] mb-4">
                    {content?.cards?.phone_card_heading || "Call & Email"}
                  </h3>
                  <div className="space-y-3 text-xs sm:text-sm text-[#202124]">
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-[#3D4450] shrink-0" />
                      <a href={`tel:${primaryPhone}`} className="font-medium hover:underline">
                        {primaryPhone}
                      </a>
                    </div>
                    {(content?.cards?.secondary_phone || settings?.secondary_phone) && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-[#3D4450] shrink-0" />
                        <a
                          href={`tel:${content?.cards?.secondary_phone || settings?.secondary_phone}`}
                          className="font-medium text-[#5F6368] hover:underline"
                        >
                          {content?.cards?.secondary_phone || settings?.secondary_phone} (Office)
                        </a>
                      </div>
                    )}
                    {(content?.cards?.emergency_phone || settings?.emergency_phone) && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-rose-500 shrink-0" />
                        <a
                          href={`tel:${content?.cards?.emergency_phone || settings?.emergency_phone}`}
                          className="font-medium text-rose-700 hover:underline"
                        >
                          {content?.cards?.emergency_phone || settings?.emergency_phone} (24/7 Emergency)
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-[#3D4450] shrink-0" />
                      <a href={`mailto:${contactEmail}`} className="font-medium hover:underline">
                        {contactEmail}
                      </a>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Fast Concierge */}
                {whatsappEnabled && Boolean(waUrl) && (
                  <div className="p-8 rounded-3xl bg-[#EBF7F2] border border-[#A7E2CB] shadow-sm space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-white text-[#0D7A53] flex items-center justify-center shadow-sm">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-serif font-bold text-[#0D7A53]">
                      {content?.cards?.whatsapp_card_title || "Fast WhatsApp Assistance"}
                    </h3>
                    <p className="text-xs text-[#0D7A53]/80 leading-relaxed font-light">
                      {content?.cards?.whatsapp_card_description ||
                        `Need quick departure availability, brochure PDFs, or urgent quotes? Our ${city} team is active on WhatsApp daily.`}
                    </p>
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-11 rounded-full bg-[#0D7A53] hover:bg-[#0B6343] text-white text-xs uppercase tracking-widest font-bold shadow-md shadow-[#0D7A53]/20 transition-all flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{content?.cards?.whatsapp_button_text || "Chat on WhatsApp"}</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Right 2 Cols: Real Contact Form */}
            {(!content || content.form?.show_section !== false) && (
              <div className="lg:col-span-2">
                <div className="p-8 sm:p-12 rounded-3xl bg-white border border-[#E4E5E7] shadow-xl">
                  {success ? (
                    <div className="text-center py-12 space-y-4">
                      <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-9 h-9" />
                      </div>
                      <h3 className="text-2xl font-serif font-bold text-[#202124]">
                        Message Dispatched
                      </h3>
                      <p className="text-[#70757A] text-sm max-w-md mx-auto leading-relaxed font-light">
                        {success}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSuccess(null)}
                        className="mt-6 px-8 h-11 rounded-full bg-[#F3F4F4] text-[#202124] text-xs uppercase tracking-widest font-semibold hover:bg-[#E4E5E7] transition-all"
                      >
                        Send Another Message
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
                        <span className="text-[#5F6368] text-xs uppercase tracking-[0.25em] font-semibold block mb-2">
                          {content?.form?.eyebrow || "Send a Message"}
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#202124]">
                          {content?.form?.heading || "How Can We Assist Your Travels?"}
                        </h2>
                        {content?.form?.description && (
                          <p className="text-xs sm:text-sm text-[#70757A] mt-2 font-light">
                            {content.form.description}
                          </p>
                        )}
                      </div>

                      {error && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm">
                          {error}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label
                            htmlFor="contact-name"
                            className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-2"
                          >
                            Your Full Name *
                          </label>
                          <input
                            id="contact-name"
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Anandha Kumar"
                            className="w-full px-4 py-3 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/60 text-sm focus:border-[#24292F] focus:bg-white focus:outline-none transition-all"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="contact-email"
                            className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-2"
                          >
                            Email Address *
                          </label>
                          <input
                            id="contact-email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="anand@example.com"
                            className="w-full px-4 py-3 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/60 text-sm focus:border-[#24292F] focus:bg-white focus:outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label
                            htmlFor="contact-phone"
                            className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-2"
                          >
                            Phone / WhatsApp Number
                          </label>
                          <input
                            id="contact-phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+91 98420 12345"
                            className="w-full px-4 py-3 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/60 text-sm focus:border-[#24292F] focus:bg-white focus:outline-none transition-all"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="contact-subject"
                            className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-2"
                          >
                            Inquiry Topic
                          </label>
                          <select
                            id="contact-subject"
                            value={subject || topicsList[0]}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] text-sm focus:border-[#24292F] focus:bg-white focus:outline-none transition-all cursor-pointer"
                          >
                            {topicsList.map((top, idx) => (
                              <option key={idx} value={top}>
                                {top}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="contact-msg"
                          className="block text-xs uppercase tracking-wider font-semibold text-[#70757A] mb-2"
                        >
                          Your Travel Message / Query *
                        </label>
                        <textarea
                          id="contact-msg"
                          required
                          rows={5}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Tell us about your destination interests, travel dates, or specific questions..."
                          className="w-full px-4 py-3 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/60 text-sm focus:border-[#24292F] focus:bg-white focus:outline-none resize-none transition-all"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isPending}
                        className="w-full sm:w-auto px-8 h-12 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold shadow-xs hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Sending Message...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Submit Message</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Google Maps Embed & Office Location Section */}
          {(!content || content.map?.show_map !== false) && (
            <div className="mt-16 pt-16 border-t border-[#E4E5E7]">
              <div className="rounded-3xl bg-[#F7F7F5] border border-[#E4E5E7] p-8 sm:p-10 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] uppercase tracking-widest text-[#5F6368] font-semibold block mb-1">
                      {content?.map?.office_location_label || `${agencyName} Headquarters`}
                    </span>
                    <h3 className="text-2xl font-serif font-bold text-[#202124]">
                      {content?.map?.map_title || "Find Our Office Location"}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#70757A] mt-1 font-light">
                      {officeAddress}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={mapLocationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 rounded-full border border-[#D3D8DF] bg-white text-[#24292F] text-xs font-semibold hover:bg-[#F7F7F5] transition-all flex items-center gap-2 shadow-2xs"
                    >
                      <MapPin className="w-4 h-4 text-[#3D4450]" />
                      <span>Open in Google Maps</span>
                    </a>
                    <a
                      href={mapDirectionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-xs"
                    >
                      <Navigation className="w-4 h-4 text-[#ECEFF3]" />
                      <span>Get Directions</span>
                    </a>
                  </div>
                </div>

                {/* Map Embed or Fallback Location Box */}
                {mapEmbedUrl ? (
                  <div className="w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-[#E4E5E7] shadow-inner bg-[#ECEFF3]">
                    <iframe
                      src={mapEmbedUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Google Maps Location"
                    />
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-white border border-[#E4E5E7] text-center space-y-3">
                    <MapPin className="w-8 h-8 text-[#3D4450] mx-auto" />
                    <h4 className="text-base font-serif font-bold text-[#202124]">
                      {officeAddress}
                    </h4>
                    <p className="text-xs text-[#70757A] max-w-md mx-auto">
                      Visit us for in-person consultation, itinerary curation, and flight bookings.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

export default function ContactPage() {
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
      <ContactPageContent />
    </Suspense>
  );
}

