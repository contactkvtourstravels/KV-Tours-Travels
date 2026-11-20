import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { PublicLayout } from "@/components/public/PublicLayout";
import { CustomTripClient } from "./CustomTripClient";

export const revalidate = 60; // Cache on Vercel edge for 60s; revalidate in background

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kvtourstravels.in";
  return {
    title: "Custom Trip Planner Coimbatore | Bespoke Holiday Itineraries | KV Tours & Travels",
    description:
      "Plan your dream tailored holiday with KV Tours & Travels Coimbatore. Tailored flights, verified 5-star resort stays, and private concierge logistics for Maldives, Bali, Kazakhstan, and domestic getaways.",
    alternates: {
      canonical: `${siteUrl}/custom-trip`,
    },
    openGraph: {
      title: "Design Your Bespoke Journey | KV Tours & Travels Coimbatore",
      description:
        "Every vacation should be as unique as you are. Share your travel wishes with our Coimbatore travel specialists to curate an extraordinary, personalized itinerary.",
      url: `${siteUrl}/custom-trip`,
      siteName: "KV Tours & Travels",
      locale: "en_IN",
      type: "website",
    },
  };
}

export default function CustomTripPage() {
  return (
    <PublicLayout>
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center text-[#70757A]">
            <Loader2 className="w-8 h-8 animate-spin text-[#24292F]" />
          </div>
        }
      >
        <CustomTripClient />
      </Suspense>
    </PublicLayout>
  );
}
