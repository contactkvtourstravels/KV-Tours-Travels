import { Suspense } from "react";
import type { Metadata } from "next";
import {
  publicCatalogApi,
  type PublicDestinationListItem,
  type DestinationsPageContent,
} from "@/lib/api";
import { DestinationsClient } from "./DestinationsClient";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kv-tours-travels.vercel.app";
  return {
    title: "Holiday Destinations from Coimbatore | International & Domestic | KV Tours & Travels",
    description:
      "Explore trending holiday destinations from Coimbatore with KV Tours & Travels. Pristine island beaches in Maldives & Lakshadweep, mountain retreats in Manali & Kazakhstan, and scenic escapes across South India.",
    alternates: {
      canonical: `${siteUrl}/destinations`,
    },
    openGraph: {
      title: "Trending Holiday Destinations from Coimbatore | KV Tours & Travels",
      description:
        "Handpicked international escapes and domestic retreats curated by KV Tours & Travels Coimbatore.",
      url: `${siteUrl}/destinations`,
      siteName: "KV Tours & Travels",
      locale: "en_IN",
      type: "website",
    },
  };
}

export default async function DestinationsPage() {
  let destinations: PublicDestinationListItem[] = [];
  let content: DestinationsPageContent | null = null;
  let serverError = false;

  try {
    const [dests, contentRes] = await Promise.all([
      publicCatalogApi.getDestinations(undefined, { timeoutMs: 1500 }),
      publicCatalogApi.getPageContent<DestinationsPageContent>("destinations", false, { timeoutMs: 1500 }).catch(() => null),
    ]);
    destinations = Array.isArray(dests) ? dests : [];
    content = contentRes?.content || null;
  } catch (err) {
    serverError = true;
    console.warn("Could not pre-fetch destinations during SSR:", err);
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F7F5]" />}>
      <DestinationsClient
        initialDestinations={destinations}
        initialContent={content}
        initialError={serverError}
      />
    </Suspense>
  );
}
