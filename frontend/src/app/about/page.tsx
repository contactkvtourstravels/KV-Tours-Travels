import { Suspense } from "react";
import {
  publicCatalogApi,
  AboutPageContent as AboutPageContentType,
  PublicPageResponse,
  type PublicSiteSettings,
} from "@/lib/api";
import { AboutClient } from "./AboutClient";
import { PublicLayout } from "@/components/public/PublicLayout";

export const revalidate = 60; // Cache on Vercel edge for 60s; revalidate in background

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
