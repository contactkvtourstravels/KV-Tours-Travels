import { Suspense } from "react";
import type { Metadata } from "next";
import { publicCatalogApi, type PublicHomeFeed } from "@/lib/api";
import { HomeClient } from "./HomeClient";
import { PublicLayout } from "@/components/public/PublicLayout";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const feed = await publicCatalogApi.getHomeFeed(false, {
      next: { tags: ["catalog", "home_feed"], revalidate: 60 },
    });
    const title =
      feed?.content?.seo_title ||
      feed?.settings?.seo_website_title ||
      "KV Tours & Travels | Coimbatore Luxury Escapes & Curated Holidays";
    const description =
      feed?.content?.seo_meta_description ||
      feed?.settings?.seo_meta_description ||
      "Coimbatore's premier luxury travel agency crafting extraordinary holidays across India and the globe.";
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: feed?.settings?.seo_og_image_url ? [{ url: feed.settings.seo_og_image_url }] : [],
      },
    };
  } catch {
    return {
      title: "KV Tours & Travels | Coimbatore Luxury Escapes & Curated Holidays",
      description:
        "Coimbatore's premier luxury travel agency crafting extraordinary holidays across India and the globe.",
    };
  }
}

export default async function HomePage() {
  let homeFeed: PublicHomeFeed | null = null;
  try {
    homeFeed = await publicCatalogApi.getHomeFeed(false, {
      next: { tags: ["catalog", "home_feed"], revalidate: 60 },
    });
  } catch (err) {
    console.warn("Could not pre-fetch home-feed during server render, will hydrate on client:", err);
  }

  return (
    <Suspense
      fallback={
        <PublicLayout transparentHeader>
          <div className="min-h-screen bg-[#0E1311] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-[#DFBA73] border-t-transparent animate-spin" />
          </div>
        </PublicLayout>
      }
    >
      <HomeClient initialFeed={homeFeed} />
    </Suspense>
  );
}
