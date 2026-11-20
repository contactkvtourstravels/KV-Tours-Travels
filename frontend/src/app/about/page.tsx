import { Suspense } from "react";
import type { Metadata } from "next";
import {
  publicCatalogApi,
  AboutPageContent as AboutPageContentType,
  PublicPageResponse,
  type PublicSiteSettings,
} from "@/lib/api";
import { AboutClient } from "./AboutClient";
import { PublicLayout } from "@/components/public/PublicLayout";

export const revalidate = 60; // Cache on Vercel edge for 60s; revalidate in background

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kvtourstravels.in";
  return {
    title: "About Us | KV Tours & Travels Coimbatore | Premier Travel Agency",
    description:
      "Learn about KV Tours & Travels, Coimbatore's leading travel concierge. Hand-crafting unforgettable international journeys, domestic expeditions, verified luxury stays, and 24/7 dedicated support.",
    alternates: {
      canonical: `${siteUrl}/about`,
    },
    openGraph: {
      title: "About KV Tours & Travels Coimbatore",
      description:
        "Learn about KV Tours & Travels, Coimbatore's leading travel concierge. Hand-crafting unforgettable international journeys, domestic expeditions, and verified luxury stays.",
      url: `${siteUrl}/about`,
      siteName: "KV Tours & Travels",
      locale: "en_IN",
      type: "website",
    },
  };
}

interface PageProps {
  searchParams: Promise<{ preview?: string }>;
}

export default async function AboutPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const isPreview = params?.preview === "true";

  let pageData: PublicPageResponse<AboutPageContentType> | null = null;
  let settings: PublicSiteSettings | null = null;
  let isError = false;

  try {
    const [pageRes, settingsRes] = await Promise.all([
      publicCatalogApi.getPageContent<AboutPageContentType>("about", isPreview, { timeoutMs: 1500 }),
      publicCatalogApi.getSettings({ timeoutMs: 1500 }),
    ]);
    pageData = pageRes;
    settings = settingsRes;
  } catch (err) {
    console.warn("AboutPage server pre-fetch error:", err);
    isError = true;
  }

  return (
    <Suspense
      fallback={
        <PublicLayout>
          <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-[#24292F] border-t-transparent animate-spin" />
          </div>
        </PublicLayout>
      }
    >
      <AboutClient
        initialPageData={pageData}
        initialSettings={settings}
        initialError={isError}
        isPreview={isPreview}
      />
    </Suspense>
  );
}
