import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

import { DEFAULT_BUSINESS_PHONE } from "@/lib/constants";
import { publicCatalogApi, type PublicSiteSettings } from "@/lib/api";
import { BrandingProvider } from "@/context/BrandingContext";

export async function generateMetadata(): Promise<Metadata> {
  let settings: PublicSiteSettings | null = null;
  try {
    settings = await publicCatalogApi.getSettings();
  } catch {
    // Graceful fallback during isolated builds
  }

  const displayName = settings?.public_display_name || settings?.agency_name || "Travel Agency";
  const tagline = settings?.tagline || "Luxury & Adventure Journeys";
  const siteTitle = `${displayName} | ${tagline}`;
  const siteDescription =
    settings?.seo_meta_description ||
    settings?.business_description ||
    `${displayName} is your premier travel curator designing bespoke international escapes, breathtaking domestic expeditions, and signature group departures.`;

  const siteUrl = settings?.website_url || process.env.NEXT_PUBLIC_SITE_URL || "https://thewildroute.in";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: siteTitle,
      template: `%s | ${displayName}`,
    },
    description: siteDescription,
    keywords: [
      displayName,
      `${displayName} Travels`,
      `${displayName} Holidays`,
      "Travel Agency",
      "Tour packages",
      "Bespoke international travel",
      "Luxury holiday packages",
    ],
    authors: [
      { name: displayName },
      { name: "Athul Suresh", url: "https://github.com/athulsuresh4466-coder" },
    ],
    creator: "Athul Suresh",
    publisher: "The Wild Root",
    other: {
      "designer": "Athul Suresh",
      "developer": "Athul Suresh - Full Stack Developer | React · Next.js · TypeScript · Python · FastAPI",
      "developer:bio": "Building modern, responsive, and scalable web applications.",
      "developer:github": "https://github.com/athulsuresh4466-coder",
      "developer:linkedin": "https://www.linkedin.com/in/athul-s4466",
      "copyright": "© The Wild Root. All rights reserved.",
    },
    icons: settings?.favicon_url
      ? [
          { rel: "icon", url: settings.favicon_url },
          { rel: "shortcut icon", url: settings.favicon_url },
        ]
      : undefined,
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      url: siteUrl,
      siteName: displayName,
      locale: "en_IN",
      type: "website",
      images: settings?.seo_og_image_url
        ? [{ url: settings.seo_og_image_url, width: 1200, height: 630, alt: displayName }]
        : settings?.logo_url
        ? [{ url: settings.logo_url, alt: displayName }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description: siteDescription,
      images: settings?.seo_og_image_url ? [settings.seo_og_image_url] : undefined,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  let settings: PublicSiteSettings | null = null;
  try {
    settings = await publicCatalogApi.getSettings();
  } catch {
    // Graceful fallback during build or initial startup
  }

  const displayName = settings?.public_display_name || settings?.agency_name || "Travel Agency";
  const siteUrl = settings?.website_url || process.env.NEXT_PUBLIC_SITE_URL || "https://thewildroute.in";
  const phone = settings?.contact_phone || DEFAULT_BUSINESS_PHONE;
  const email = settings?.contact_email || "contact@travelagency.com";
  const street = settings?.office_address || "Main Road";
  const city = settings?.city || "";
  const state = settings?.state || "";
  const postalCode = settings?.postal_code || "";
  const country = settings?.country || "India";
  const logo = settings?.logo_url || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80";

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "TravelAgency",
      "@id": `${siteUrl}/#travelagency`,
      name: displayName,
      image: logo,
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
        latitude: settings?.google_maps_latitude || 10.7867,
        longitude: settings?.google_maps_longitude || 76.6548,
      },
      url: siteUrl,
      priceRange: "₹₹₹",
      currenciesAccepted: settings?.currency || "INR",
      paymentAccepted: "Credit Card, Debit Card, Net Banking, UPI",
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
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: displayName,
      url: siteUrl,
      logo: logo,
      contactPoint: {
        "@type": "ContactPoint",
        telephone: phone,
        contactType: "customer service",
        areaServed: "IN",
        availableLanguage: ["English", "Malayalam", "Tamil", "Hindi"],
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: displayName,
      url: siteUrl,
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
      creator: {
        "@type": "Person",
        name: "Athul Suresh",
        jobTitle: "Full Stack Developer",
        description:
          "Full Stack Developer | React · Next.js · TypeScript · Python · FastAPI. Building modern, responsive, and scalable web applications.",
        url: "https://github.com/athulsuresh4466-coder",
        sameAs: [
          "https://github.com/athulsuresh4466-coder",
          "https://www.linkedin.com/in/athul-s4466",
        ],
      },
      copyrightHolder: {
        "@type": "Organization",
        name: "The Wild Root",
      },
      copyrightYear: new Date().getFullYear(),
    },
  ];

  return (
    <html lang="en" className="h-full antialiased scroll-smooth" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta name="author" content="Athul Suresh" />
        <meta name="creator" content="Athul Suresh" />
        <meta name="designer" content="Athul Suresh" />
        <meta name="developer" content="Athul Suresh" />
        <meta
          name="developer:bio"
          content="Full Stack Developer | React · Next.js · TypeScript · Python · FastAPI. Building modern, responsive, and scalable web applications."
        />
        <meta name="copyright" content="© The Wild Root. All rights reserved." />
        <link rel="author" href="https://github.com/athulsuresh4466-coder" />
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
