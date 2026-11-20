import { Suspense } from "react";
import type { Metadata } from "next";
import {
  publicCatalogApi,
  ContactPageContent as ContactPageContentType,
  PublicPageResponse,
  type PublicSiteSettings,
} from "@/lib/api";
import { ContactClient } from "./ContactClient";
import { PublicLayout } from "@/components/public/PublicLayout";

export const revalidate = 60; // Cache on Vercel edge for 60s; revalidate in background

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kvtourstravels.in";
  return {
    title: "Contact KV Tours & Travels Coimbatore | Gandhipuram Office & WhatsApp",
    description:
      "Get in touch with KV Tours & Travels at Cross Cut Road, Gandhipuram, Coimbatore. Reach our travel concierge via phone or WhatsApp for instant flight, holiday package, and customized trip inquiries.",
    alternates: {
      canonical: `${siteUrl}/contact`,
    },
    openGraph: {
      title: "Contact KV Tours & Travels Coimbatore",
      description:
        "Visit our office at Cross Cut Road, Gandhipuram, Coimbatore or chat directly on WhatsApp with our bespoke travel concierge.",
      url: `${siteUrl}/contact`,
      siteName: "KV Tours & Travels",
      locale: "en_IN",
      type: "website",
    },
  };
}

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
      publicCatalogApi.getPageContent<ContactPageContentType>("contact", isPreview, { timeoutMs: 1500 }),
      publicCatalogApi.getSettings({ timeoutMs: 1500 }),
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
