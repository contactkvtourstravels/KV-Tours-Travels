import { Suspense } from "react";
import type { Metadata } from "next";
import {
  publicCatalogApi,
  type PublicDepartureListItem,
  type GroupTripsPageContent,
} from "@/lib/api";
import { GroupTripsClient } from "./GroupTripsClient";
import { PublicLayout } from "@/components/public/PublicLayout";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Upcoming Fixed Departures & Group Trips | KV Tours & Travels",
    description:
      "Join like-minded travelers on curated group departures and expeditions led by professional tour leads and naturalists.",
  };
}

export default async function GroupTripsPage() {
  let departures: PublicDepartureListItem[] = [];
  let content: GroupTripsPageContent | null = null;

  try {
    const [deps, contentRes] = await Promise.all([
      publicCatalogApi.getAllDepartures(),
      publicCatalogApi.getPageContent<GroupTripsPageContent>("group-trips", false).catch(() => null),
    ]);
    departures = deps;
    content = contentRes?.content || null;
  } catch (err) {
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
      />
    </Suspense>
  );
}
