import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Allow large image uploads (admin ad banners can be big).
      bodySizeLimit: "50mb",
    },
  },
  images: {
    remotePatterns: [
      // Stock imagery for marketing pages.
      { protocol: "https", hostname: "images.unsplash.com" },
      // User avatars / listing photos hosted on Supabase Storage.
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
