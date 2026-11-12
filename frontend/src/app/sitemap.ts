import type { MetadataRoute } from "next";
import { publicCatalogApi } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kv-tours-travels.vercel.app";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/destinations`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/packages`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/group-trips`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/custom-trip`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  try {
    const [destinations, packages] = await Promise.all([
      publicCatalogApi.getDestinations().catch(() => []),
      publicCatalogApi.getPackages().catch(() => []),
    ]);

    const destinationRoutes: MetadataRoute.Sitemap = destinations.map((d) => ({
      url: `${baseUrl}/destinations/${d.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const packageRoutes: MetadataRoute.Sitemap = packages.map((p) => ({
      url: `${baseUrl}/packages/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.85,
    }));

    return [...staticRoutes, ...destinationRoutes, ...packageRoutes];
  } catch {
    return staticRoutes;
  }
}
