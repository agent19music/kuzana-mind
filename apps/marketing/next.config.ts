import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-0a313ba028f9423cba4b9803d081b5db.r2.dev",
      },
    ],
  },
};

export default nextConfig;
