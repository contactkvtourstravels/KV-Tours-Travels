import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KV Tours & Travels",
    short_name: "KV Tours",
    description:
      "Curated luxury holidays, international group departures, and bespoke travel concierge by KV Tours & Travels.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0C0E",
    theme_color: "#DFBA73",
    icons: [
      {
        src: "/logo.png",
        sizes: "825x825",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}

