import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KV Tours & Travels",
    short_name: "KV Tours",
    description:
      "Curated luxury holidays, international group departures, and bespoke travel concierge by KV Tours & Travels.",
    start_url: "/",
    display: "standalone",
    background_color: "#24292F",
    theme_color: "#24292F",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}

