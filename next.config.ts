import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
