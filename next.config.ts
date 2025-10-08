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
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Configurazione di base per il chunking
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 50000,
        }
      };
    }
    return config;
  },
  images: {
    // Usa le immagini pre-ottimizzate dal nostro script
    unoptimized: true,
    domains: [
      "cdn.sanity.io",
      "theoremz.com",
      "i.ytimg.com",
      "img.youtube.com",
    ],
    deviceSizes: [360, 480, 640, 768, 960, 1200, 1600, 2000], // Allinea con lo script di ottimizzazione
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
        source: "/account/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/register/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/reset-password/:path*",
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
