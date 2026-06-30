import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(process.cwd()),
  experimental: {
    // Reduce bundle size by optimizing common package imports
    optimizePackageImports: [
      "@portabletext/react",
      "react-katex",
      "lucide-react",
    ],
    optimizeCss: true,
  },
  poweredByHeader: false,
  compress: true,
  images: {
    unoptimized: true, // Disabilita l'ottimizzazione di Vercel per risparmiare quota
    domains: [
      "cdn.sanity.io",
      "theoremz.com",
      "i.ytimg.com",
      "img.youtube.com",
    ],
    deviceSizes: [40, 80, 360, 480, 640, 684, 768, 960],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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
      {
        source: "/onboarding/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/onboarding",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/studio/:path*",
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
      // ── Redirect categorie rinominate/accorpate ──────────────────────────
      // Matematica
      { source: "/matematica/algebra-medie",      destination: "/matematica/algebra",                  permanent: true },
      { source: "/matematica/aritmetica-medie",   destination: "/matematica/aritmetica",               permanent: true },
      { source: "/matematica/geometria-medie",    destination: "/matematica/geometria-euclidea",       permanent: true },
      { source: "/matematica/triangoli",          destination: "/matematica/geometria-euclidea",       permanent: true },
      { source: "/matematica/quadrilateri",       destination: "/matematica/geometria-euclidea",       permanent: true },
      { source: "/matematica/poligoni-regolari",  destination: "/matematica/geometria-euclidea",       permanent: true },
      { source: "/matematica/circonferenza",      destination: "/matematica/geometria-euclidea",       permanent: true },
      { source: "/matematica/analisi",            destination: "/matematica/analisi-matematica",       permanent: true },
      { source: "/matematica/integrali",          destination: "/matematica/analisi-matematica",       permanent: true },
      { source: "/matematica/funzioni",           destination: "/matematica/analisi-matematica",       permanent: true },
      { source: "/matematica/derivate",           destination: "/matematica/studio-di-funzione",       permanent: true },
      { source: "/matematica/probabilita",        destination: "/matematica/probabilita-e-statistica", permanent: true },
      { source: "/matematica/statistica",         destination: "/matematica/probabilita-e-statistica", permanent: true },
      { source: "/matematica/equazioni",          destination: "/matematica/equazioni-e-disequazioni", permanent: true },
      { source: "/matematica/disequazioni",       destination: "/matematica/equazioni-e-disequazioni", permanent: true },
      { source: "/matematica/esponenziali",       destination: "/matematica/esponenziali-e-logaritmi", permanent: true },
      // Fisica
      { source: "/fisica/elettronica",            destination: "/fisica/circuiti-elettrici",           permanent: true },
      { source: "/fisica/fluidi",                 destination: "/fisica/meccanica-dei-fluidi",         permanent: true },
      { source: "/fisica/notazioni",              destination: "/fisica/grandezze-e-misure",           permanent: true },
      { source: "/fisica/metrologia",             destination: "/fisica/grandezze-e-misure",           permanent: true },
      { source: "/fisica/grandezze-fisiche",      destination: "/fisica/grandezze-e-misure",           permanent: true },
      { source: "/fisica/moti",                   destination: "/fisica/cinematica",                   permanent: true },
      { source: "/fisica/moto-circolare",         destination: "/fisica/cinematica",                   permanent: true },
      { source: "/fisica/meccanica",              destination: "/fisica/dinamica",                     permanent: true },
      { source: "/fisica/moto-armonico",          destination: "/fisica/dinamica",                     permanent: true },
      { source: "/fisica/acustica",               destination: "/fisica/onde",                         permanent: true },
      { source: "/fisica/ottica-fisica",          destination: "/fisica/ottica",                       permanent: true },
      { source: "/fisica/fisica-atomica",         destination: "/fisica/fisica-moderna",               permanent: true },
      { source: "/fisica/termologia",             destination: "/fisica/termodinamica",                permanent: true },
      { source: "/fisica/induzione",              destination: "/fisica/elettromagnetismo",             permanent: true },
    ];
  },
};

export default nextConfig;
