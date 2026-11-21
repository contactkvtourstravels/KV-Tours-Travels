import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

import { DEFAULT_BUSINESS_PHONE } from "@/lib/constants";
import { publicCatalogApi, type PublicSiteSettings } from "@/lib/api";
import { BrandingProvider } from "@/context/BrandingContext";

// High-performance edge SWR caching: instant response for users, revalidated in background
export const revalidate = 60;

let cachedServerSettings: PublicSiteSettings | null = null;
let lastSettingsFetchTime = 0;
const SETTINGS_CACHE_TTL_MS = 60_000;

async function getCachedSettings(): Promise<PublicSiteSettings | null> {
  const now = Date.now();
  if (cachedServerSettings && now - lastSettingsFetchTime < SETTINGS_CACHE_TTL_MS) {
    return cachedServerSettings;
  }
  try {
    const fresh = await publicCatalogApi.getSettings({ timeoutMs: 1200 });
    if (fresh) {
      cachedServerSettings = fresh;
      lastSettingsFetchTime = now;
      return fresh;
    }
  } catch {
    // If cloud database is cold-starting, fail-fast without blocking page render
  }
  return cachedServerSettings;
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCachedSettings();

  const displayName = settings?.public_display_name || settings?.agency_name || "KV Tours & Travels";
  const siteTitle = settings?.seo_website_title || `${displayName} | Best Travel Agency in Coimbatore | Tour Packages`;
  const siteDescription =
    settings?.seo_meta_description ||
    settings?.business_description ||
    `${displayName} is Coimbatore's premier travel agency located at Cross Cut Road, Gandhipuram. Curating bespoke international tour packages (Maldives, Bali, Kazakhstan, Dubai, Japan), domestic group departures, honeymoon escapes, and custom holidays. Contact our concierge today.`;

  const siteUrl = settings?.website_url || process.env.NEXT_PUBLIC_SITE_URL || "https://kvtourstravels.in";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: siteTitle,
      template: `%s | ${displayName}`,
    },
    description: siteDescription,
    keywords: [
      "KV Tours",
      "KV Tours & Travels",
      "KV Tours Coimbatore",
      "KV Tours Gandhipuram",
      "KV Tours Travels",
      "KV Tours Holidays",
      "KV Tours Packages",
      displayName,
      `${displayName} Coimbatore`,
      `${displayName} Gandhipuram`,
      `${displayName} Holidays`,
      "best travel agency in Coimbatore",
      "tours and travels in Coimbatore",
      "travel agents in Coimbatore",
      "tours and travels Gandhipuram Coimbatore",
      "international tour packages from Coimbatore",
      "group tours from Coimbatore",
      "fixed departure trips Coimbatore",
      "honeymoon packages Coimbatore",
      "holiday packages from Coimbatore",
      "vacation packages Coimbatore",
      "Maldives tour packages from Coimbatore",
      "Bali holiday packages from Coimbatore",
      "Kazakhstan tour package from Coimbatore",
      "Dubai tour packages from Coimbatore",
      "Japan tour packages from Coimbatore",
      "Kerala tour packages from Coimbatore",
      "Gokarna trip from Coimbatore",
      "Wayanad tour packages from Coimbatore",
      "Himachal tour packages Coimbatore",
      "Kashmir tour packages Coimbatore",
      "custom travel planner Coimbatore",
      "corporate tour packages Coimbatore",
      "Tamil Nadu travel agency",
    ],
    authors: [
      { name: displayName },
    ],
    creator: displayName,
    publisher: displayName,
    alternates: {
      canonical: siteUrl,
    },
    other: {
      "geo.region": "IN-TN",
      "geo.placename": "Coimbatore",
      "geo.position": "11.0183;76.9682",
      "ICBM": "11.0183, 76.9682",
      "copyright": `© ${displayName}. All rights reserved.`,
    },
    icons: {
      icon: [
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-96.png", sizes: "96x96", type: "image/png" },
        { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
        { url: "/favicon.ico", sizes: "48x48 32x32 16x16" },
        { url: settings?.favicon_url || "/logo.png", type: "image/png" },
      ],
      shortcut: ["/favicon.ico"],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      url: siteUrl,
      siteName: displayName,
      locale: "en_IN",
      type: "website",
      images: settings?.seo_og_image_url
        ? [{ url: settings.seo_og_image_url, width: 1200, height: 630, alt: `${displayName} Coimbatore` }]
        : [{ url: "/images/hero/hero-4k.webp", width: 1200, height: 630, alt: `${displayName} Coimbatore` }],
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description: siteDescription,
      images: settings?.seo_og_image_url ? [settings.seo_og_image_url] : ["/images/hero/hero-4k.webp"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const settings = await getCachedSettings();

  const displayName = settings?.public_display_name || settings?.agency_name || "KV Tours & Travels";
  const siteUrl = settings?.website_url || process.env.NEXT_PUBLIC_SITE_URL || "https://kvtourstravels.in";
  const phone = settings?.contact_phone || settings?.whatsapp_number || DEFAULT_BUSINESS_PHONE;
  const email = settings?.contact_email || "contact.kvtourstravels@gmail.com";
  const street = settings?.office_address || "Cross Cut Road, Gandhipuram";
  const city = (settings?.city || "Coimbatore").replace(/\s*[•\-–|]?\s*luxury\s*escapes?/gi, "").trim();
  const state = settings?.state || "Tamil Nadu";
  const postalCode = settings?.postal_code || "641012";
  const country = settings?.country || "India";
  const logo = `${siteUrl}/logo.png`;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": ["TravelAgency", "LocalBusiness"],
      "@id": `${siteUrl}/#travelagency`,
      name: displayName,
      alternateName: [
        "KV Tours",
        "KV Tours & Travels",
        "KV Tours and Travels",
        "KV Tours Coimbatore",
        "KV Tours Travels",
      ],
      description: "Coimbatore's premier travel agency at Cross Cut Road, Gandhipuram. Curating bespoke international tour packages, domestic group departures, honeymoon escapes, and customized holiday itineraries.",
      image: logo,
      logo: logo,
      sameAs: [
        "https://www.instagram.com/kvtourstravels.in/",
        "https://www.facebook.com/kvtourstravels",
        siteUrl,
      ],
      telephone: phone,
      email: email,
      address: {
        "@type": "PostalAddress",
        streetAddress: street,
        addressLocality: city,
        addressRegion: state,
        postalCode: postalCode,
        addressCountry: country === "India" ? "IN" : country,
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: settings?.google_maps_latitude || 11.0183,
        longitude: settings?.google_maps_longitude || 76.9682,
      },
      url: siteUrl,
      priceRange: "₹₹₹",
      currenciesAccepted: settings?.currency || "INR",
      paymentAccepted: "Credit Card, Debit Card, Net Banking, UPI, Cash",
      areaServed: [
        { "@type": "City", name: "Coimbatore" },
        { "@type": "AdministrativeArea", name: "Tamil Nadu" },
        { "@type": "AdministrativeArea", name: "Kerala" },
        { "@type": "Country", name: "India" },
      ],
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ],
          opens: "09:30",
          closes: "19:30",
        },
      ],
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Travel Services & Tour Packages",
        itemListElement: [
          {
            "@type": "OfferCatalog",
            name: "International Tour Packages",
            itemListElement: [
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Maldives Luxury Holiday Packages" } },
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Bali Island Leisure & Cultural Tours" } },
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Kazakhstan Winter & Alpine Tours" } },
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Dubai Desert & City Tours" } },
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Japan Cherry Blossom & Cultural Tours" } },
            ],
          },
          {
            "@type": "OfferCatalog",
            name: "Domestic & Group Trips",
            itemListElement: [
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Fixed Departure Group Tours" } },
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Kerala Backwater & Hill Station Escapes" } },
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Gokarna Surf & Coastal Road Trips" } },
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Agumbe Rainforest & Western Ghats Treks" } },
            ],
          },
        ],
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: displayName,
      alternateName: ["KV Tours", "KV Tours & Travels"],
      url: siteUrl,
      logo: logo,
      sameAs: [
        "https://www.instagram.com/kvtourstravels.in/",
        "https://www.facebook.com/kvtourstravels",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        telephone: phone,
        contactType: "customer service",
        areaServed: "IN",
        availableLanguage: ["English", "Tamil", "Malayalam", "Hindi"],
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: displayName,
      alternateName: [
        "KV Tours",
        "KV Tours & Travels",
        "KV Tours Coimbatore",
        "KV Tours Travels",
        "KV Tours and Travels",
        "kvtourstravels.in",
      ],
      url: siteUrl,
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/packages?search={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
      creator: {
        "@type": "Organization",
        name: displayName,
        url: siteUrl,
      },
      copyrightHolder: {
        "@type": "Organization",
        name: displayName,
      },
      copyrightYear: new Date().getFullYear(),
    },
  ];

  return (
    <html lang="en" className="h-full antialiased scroll-smooth" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta name="copyright" content={`© ${displayName}. All rights reserved.`} />
        {/* Google Search Favicon explicit high-res links (Google requires min 48px square or multiple: 48, 96, 192) */}
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/icon-96.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="/icon-48.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <script
          id="schema-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          suppressHydrationWarning
        />
      </head>
      <body className="min-h-full bg-white text-[#202124] flex flex-col font-sans selection:bg-[#24292F]/15 selection:text-[#202124]" suppressHydrationWarning>
        <BrandingProvider initialSettings={settings}>
          {children}
        </BrandingProvider>
      </body>
    </html>
  );
}
