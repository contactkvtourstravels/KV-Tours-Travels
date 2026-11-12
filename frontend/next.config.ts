import type { NextConfig } from "next";

const rawBackendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  (process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, "")
    : "") ||
  "http://127.0.0.1:8000";

const backendBase = rawBackendUrl.replace(/\/+$/, "");

let dynamicBackendPattern: {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
  pathname: string;
} | null = null;

try {
  const parsed = new URL(backendBase);
  if (parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
    dynamicBackendPattern = {
      protocol: parsed.protocol.replace(":", "") as "http" | "https",
      hostname: parsed.hostname,
      port: parsed.port || undefined,
      pathname: "/**",
    };
  }
} catch {
  // Use default local fallbacks if parsing fails
}

const nextConfig: NextConfig = {
  devIndicators: false,
  compress: true,
  poweredByHeader: false,
  images: {
    qualities: [75, 80, 85, 90],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560, 3840],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "commons.wikimedia.org",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.onrender.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        pathname: "/**",
      },
      ...(dynamicBackendPattern ? [dynamicBackendPattern] : []),
    ],
  },
  async redirects() {
    return [
      {
        source: "/cabs",
        destination: "/packages",
        permanent: false,
      },
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
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${backendBase}/uploads/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
