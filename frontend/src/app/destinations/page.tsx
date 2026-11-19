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
  return {
    title: "Handpicked Luxury Travel Destinations | KV Tours & Travels Coimbatore",
    description:
      "Explore curated domestic and international travel destinations including pristine beaches, misty hill stations, and cultural wonders.",
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
