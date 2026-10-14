import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 80, 85, 90],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560, 3840],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/admin/business",
        destination: "/admin/content/main?tab=branding",
        permanent: false,
      },
      {
        source: "/admin/business-settings",
        destination: "/admin/content/main?tab=branding",
        permanent: false,
      },
      {
        source: "/admin/homepage",
        destination: "/admin/content/main",
        permanent: false,
      },
      {
        source: "/admin/homepage-settings",
        destination: "/admin/content/main",
        permanent: false,
      },
      {
        source: "/admin/communication",
        destination: "/admin/settings?tab=whatsapp",
        permanent: false,
      },
      {
        source: "/admin/communication-settings",
        destination: "/admin/settings?tab=whatsapp",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
