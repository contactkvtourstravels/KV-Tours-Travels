import { Suspense } from "react";
import {
  publicCatalogApi,
  ContactPageContent as ContactPageContentType,
  PublicPageResponse,
  type PublicSiteSettings,
} from "@/lib/api";
import { ContactClient } from "./ContactClient";
import { PublicLayout } from "@/components/public/PublicLayout";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

interface PageProps {
  searchParams: Promise<{ preview?: string }>;
}

export default async function ContactPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const isPreview = params?.preview === "true";

  let pageData: PublicPageResponse<ContactPageContentType> | null = null;
  let settings: PublicSiteSettings | null = null;
  let isError = false;

  try {
    const [pageRes, settingsRes] = await Promise.all([
      publicCatalogApi.getPageContent<ContactPageContentType>("contact", isPreview),
      publicCatalogApi.getSettings(),
    ]);
    pageData = pageRes;
    settings = settingsRes;
  } catch (err) {
    console.warn("ContactPage server pre-fetch error:", err);
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
      <ContactClient
        initialPageData={pageData}
        initialSettings={settings}
        initialError={isError}
        isPreview={isPreview}
      />
    </Suspense>
  );
}
