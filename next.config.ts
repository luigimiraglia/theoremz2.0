import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Reduce bundle size by optimizing common package imports
    optimizePackageImports: [
      "@portabletext/react",
      "react-katex",
      "lucide-react",
    ],
  },
  images: {
    // Disabilita l'optimizer di Next (usa file statici così come sono)
    unoptimized: true,
    domains: [
      "cdn.sanity.io",
      "theoremz.com",
      "i.ytimg.com",
      "img.youtube.com",
    ],
  },
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/video/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/notes/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
      {
        source: "/metadata.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Extra safety: prevent indexing of account pages via headers too
      {
        source: "/account",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/register",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/reset-password",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:slug*.html",
        destination: "/:slug*",
        permanent: true,
      },
      {
        source: "/chi-siamo",
        destination: "/chisiamo",
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
