import { Suspense } from "react";
import type { Metadata } from "next";
import {
  publicCatalogApi,
  type PublicPackageListItem,
  type PublicDestinationListItem,
  type PackagesPageContent,
} from "@/lib/api";
import { PackagesClient } from "./PackagesClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Curated Travel Packages | KV Tours & Travels Coimbatore",
    description:
      "Explore handcrafted luxury holiday packages, private journeys, and bespoke expeditions across India and worldwide destinations.",
  };
}

export default async function PackagesPage() {
  let packages: PublicPackageListItem[] = [];
  let destinations: PublicDestinationListItem[] = [];
  let content: PackagesPageContent | null = null;
  let serverError = false;

  try {
    const [pkgs, dests, contentRes] = await Promise.all([
      publicCatalogApi.getPackages(undefined),
      publicCatalogApi.getDestinations(undefined),
      publicCatalogApi.getPageContent<PackagesPageContent>("packages", false).catch(() => null),
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
