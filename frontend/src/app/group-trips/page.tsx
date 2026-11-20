import { Suspense } from "react";
import type { Metadata } from "next";
import {
  publicCatalogApi,
  type PublicDepartureListItem,
  type GroupTripsPageContent,
} from "@/lib/api";
import { GroupTripsClient } from "./GroupTripsClient";
import { PublicLayout } from "@/components/public/PublicLayout";

export const revalidate = 60; // Cache on Vercel edge for 60s; revalidate in background

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kv-tours-travels.vercel.app";
  return {
    title: "Group Trips & Fixed Departures from Coimbatore | KV Tours & Travels",
    description:
      "Join curated small-group departures from Coimbatore across India & abroad with KV Tours & Travels. Guaranteed small groups, verified stays, transparent inclusions, and expert trip leads.",
    alternates: {
      canonical: `${siteUrl}/group-trips`,
    },
    openGraph: {
      title: "Upcoming Fixed Departures & Group Trips from Coimbatore | KV Tours & Travels",
      description:
        "Travel together with fellow adventurers from Coimbatore and across India. Fixed departure dates with guaranteed small-group dynamics.",
      url: `${siteUrl}/group-trips`,
      siteName: "KV Tours & Travels",
      locale: "en_IN",
      type: "website",
    },
  };
}

export default async function GroupTripsPage() {
  let departures: PublicDepartureListItem[] = [];
  let content: GroupTripsPageContent | null = null;
  let serverError = false;

  try {
    const [deps, contentRes] = await Promise.all([
      publicCatalogApi.getAllDepartures({ timeoutMs: 1500 }),
      publicCatalogApi.getPageContent<GroupTripsPageContent>("group-trips", false, { timeoutMs: 1500 }).catch(() => null),
    ]);
    departures = Array.isArray(deps) ? deps : [];
    content = contentRes?.content || null;
  } catch (err) {
    serverError = true;
    console.warn("Could not pre-fetch departures during SSR:", err);
  }

  return (
    <Suspense
      fallback={
        <PublicLayout>
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-[#24292F] border-t-transparent animate-spin" />
          </div>
        </PublicLayout>
      }
    >
      <GroupTripsClient
        initialDepartures={departures}
        initialContent={content}
        initialError={serverError}
      />
    </Suspense>
  );
}
