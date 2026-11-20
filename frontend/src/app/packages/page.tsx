import { Suspense } from "react";
import type { Metadata } from "next";
import {
  publicCatalogApi,
  type PublicPackageListItem,
  type PublicDestinationListItem,
  type PackagesPageContent,
} from "@/lib/api";
import { PackagesClient } from "./PackagesClient";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kv-tours-travels.vercel.app";
  return {
    title: "Tour Packages from Coimbatore | International & Domestic Holidays | KV Tours & Travels",
    description:
      "Explore handcrafted holiday packages from Coimbatore with KV Tours & Travels. Discover verified boutique stays, private transfers, and customized itineraries for Maldives, Bali, Kazakhstan, Dubai, Gokarna, Wayanad, and beyond.",
    alternates: {
      canonical: `${siteUrl}/packages`,
    },
    openGraph: {
      title: "Holiday Tour Packages from Coimbatore | KV Tours & Travels",
      description:
        "Handcrafted international escapes and domestic retreats from Coimbatore. Verified 5-star accommodations, private transfers, and 24/7 dedicated travel concierge.",
      url: `${siteUrl}/packages`,
      siteName: "KV Tours & Travels",
      locale: "en_IN",
      type: "website",
    },
  };
}

export default async function PackagesPage() {
  let packages: PublicPackageListItem[] = [];
  let destinations: PublicDestinationListItem[] = [];
  let content: PackagesPageContent | null = null;
  let serverError = false;

  try {
    const [pkgs, dests, contentRes] = await Promise.all([
      publicCatalogApi.getPackages(undefined, { timeoutMs: 1500 }),
      publicCatalogApi.getDestinations(undefined, { timeoutMs: 1500 }),
      publicCatalogApi.getPageContent<PackagesPageContent>("packages", false, { timeoutMs: 1500 }).catch(() => null),
    ]);
    packages = Array.isArray(pkgs) ? pkgs : [];
    destinations = Array.isArray(dests) ? dests : [];
    content = contentRes?.content || null;
  } catch (err) {
    serverError = true;
    console.warn("Could not pre-fetch packages during SSR:", err);
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F7F5]" />}>
      <PackagesClient
        initialPackages={packages}
        initialDestinations={destinations}
        initialContent={content}
        initialError={serverError}
      />
    </Suspense>
  );
}
