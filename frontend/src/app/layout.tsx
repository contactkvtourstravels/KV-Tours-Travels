import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

import { DEFAULT_BUSINESS_PHONE } from "@/lib/constants";

const siteTitle = "KV Tours & Travels | Coimbatore • Luxury & Adventure Journeys";
const siteDescription =
  "KV Tours & Travels is Coimbatore's premier travel agency curating bespoke international getaways, breathtaking domestic tours, and signature group departures to Maldives, Lakshadweep, Kazakhstan, Manali, and beyond.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://kvtours.in"),
  title: {
    default: siteTitle,
    template: "%s | KV Tours & Travels Coimbatore",
  },
  description: siteDescription,
  keywords: [
    "KV Tours & Travels",
    "KV Tours Coimbatore",
    "Travel Agency Coimbatore",
    "Maldives tour packages from Coimbatore",
    "Lakshadweep tour packages from Coimbatore",
    "Kazakhstan tour packages from Coimbatore",
    "Manali group trips from Coimbatore",
    "Bespoke international travel Tamil Nadu",
    "Luxury honeymoon packages Coimbatore",
  ],
  authors: [{ name: "KV Tours & Travels" }],
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: "https://kvtours.in",
    siteName: "KV Tours & Travels",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": "https://kvtours.in/#travelagency",
    name: "KV Tours & Travels",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    telephone: DEFAULT_BUSINESS_PHONE,
    email: "contact@kvtours.in",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Cross Cut Road, Gandhipuram",
      addressLocality: "Coimbatore",
      addressRegion: "Tamil Nadu",
      postalCode: "641012",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 11.0168,
      longitude: 76.9558,
    },
    url: "https://kvtours.in",
    priceRange: "₹₹₹",
    currenciesAccepted: "INR",
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
    "@id": "https://kvtours.in/#organization",
    name: "KV Tours & Travels",
    url: "https://kvtours.in",
    logo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: DEFAULT_BUSINESS_PHONE,
      contactType: "customer service",
      areaServed: "IN",
      availableLanguage: ["English", "Tamil", "Hindi"],
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://kvtours.in/#website",
    name: "KV Tours & Travels",
    url: "https://kvtours.in",
    publisher: {
      "@id": "https://kvtours.in/#organization",
    },
  },
];

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="min-h-full bg-white text-[#202124] flex flex-col font-sans selection:bg-[#24292F]/15 selection:text-[#202124]">
        {children}
      </body>
    </html>
  );
}
