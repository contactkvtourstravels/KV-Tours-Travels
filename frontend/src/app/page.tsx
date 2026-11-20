import { Suspense } from "react";
import type { Metadata } from "next";
import { publicCatalogApi, type PublicHomeFeed } from "@/lib/api";
import { HomeClient } from "./HomeClient";
import { PublicLayout } from "@/components/public/PublicLayout";

export const revalidate = 60; // Cache on Vercel edge for 60 seconds; revalidate in background

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kvtourstravels.in";
  const defaultTitle = "KV Tours & Travels | Best Travel Agency in Coimbatore | Tour Packages";
  const defaultDescription =
    "Coimbatore's premier travel agency located at Cross Cut Road, Gandhipuram. Curating bespoke international tour packages (Maldives, Bali, Kazakhstan, Dubai, Japan), domestic group departures, honeymoon escapes, and custom holidays. Contact our concierge today.";

  try {
    const feed = await publicCatalogApi.getHomeFeed(false, {
      timeoutMs: 1200,
    });
    const title =
      feed?.content?.seo_title ||
      feed?.settings?.seo_website_title ||
      defaultTitle;
    const description =
      feed?.content?.seo_meta_description ||
      feed?.settings?.seo_meta_description ||
      defaultDescription;
    const ogImage = feed?.settings?.seo_og_image_url || "/images/hero/hero-4k.webp";

    return {
      title,
      description,
      alternates: {
        canonical: siteUrl,
      },
      openGraph: {
        title,
        description,
        url: siteUrl,
        siteName: "KV Tours & Travels",
        locale: "en_IN",
        type: "website",
        images: [{ url: ogImage, width: 1200, height: 630, alt: "KV Tours & Travels Coimbatore" }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImage],
      },
    };
  } catch {
    return {
      title: defaultTitle,
      description: defaultDescription,
      alternates: {
        canonical: siteUrl,
      },
      openGraph: {
        title: defaultTitle,
        description: defaultDescription,
        url: siteUrl,
        siteName: "KV Tours & Travels",
        locale: "en_IN",
        type: "website",
        images: [{ url: "/images/hero/hero-4k.webp", width: 1200, height: 630, alt: "KV Tours & Travels Coimbatore" }],
      },
      twitter: {
        card: "summary_large_image",
        title: defaultTitle,
        description: defaultDescription,
        images: ["/images/hero/hero-4k.webp"],
      },
    };
  }
}

export default async function HomePage() {
  let homeFeed: PublicHomeFeed | null = null;
  let serverError = false;

  try {
    homeFeed = await publicCatalogApi.getHomeFeed(false, {
      timeoutMs: 1500,
    });
  } catch (err) {
    serverError = true;
    console.warn("Could not pre-fetch home-feed during server render, will hydrate on client:", err);
  }

  return (
    <Suspense
      fallback={
        <PublicLayout transparentHeader hideWakeUpBanner>
          <div className="min-h-screen bg-[#0E1311] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-[#DFBA73] border-t-transparent animate-spin" />
          </div>
        </PublicLayout>
      }
    >
      <HomeClient initialFeed={homeFeed} initialError={serverError} />
    </Suspense>
  );
}
