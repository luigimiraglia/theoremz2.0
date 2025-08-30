import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      "cdn.sanity.io",
      "theoremz.com",
      "i.ytimg.com",
      "img.youtube.com",
    ],
  },
  async redirects() {
    return [
      // Rimuove .html alla fine dell'URL
      {
        source: "/:slug*.html",
        destination: "/:slug*",

        permanent: true,
      },
      // Redirect www -> non-www
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.theoremz.com" }],
        destination: "https://theoremz.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
