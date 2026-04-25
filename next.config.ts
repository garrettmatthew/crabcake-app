import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable the client-side router cache for dynamic routes. Default in
  // Next 15+ is 30s, which meant a freshly-submitted rating wouldn't show
  // up on the spot page until the cache aged out. Score data is the
  // primary value of this app — staleness here is unacceptable.
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.crabcakes.app" }],
        destination: "https://crabcakes.app/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
