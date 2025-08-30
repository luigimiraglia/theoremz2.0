import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // ⛔ disattiva l'optimizer di Next/Vercel
    // (facoltativo: puoi anche rimuovere "domains" quando unoptimized è true)
    domains: [
      "cdn.sanity.io",
      "theoremz.com",
      "i.ytimg.com",
      "img.youtube.com",
    ],
  },
  async redirects() {
    return [
      {
        source: "/:slug*.html",
        destination: "/:slug*",
        permanent: true,
      },
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
