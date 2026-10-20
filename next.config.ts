import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Recipe photos live in the Supabase public bucket; next/image resizes them per screen.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "wizhobeinzqrupjbpgxn.supabase.co",
        pathname: "/storage/v1/object/public/recipe-images/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
