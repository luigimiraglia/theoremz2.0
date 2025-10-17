// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { Suspense } from "react";
import Script from "next/script";
// Note: avoid server cookies here to keep layout static and reduce FAC usage
import { AuthProvider } from "@/lib/AuthContext";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";
// Import solo il CSS critico
import "./critical.css";
import Providers from "./providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BlackPromoBanner from "@/components/BlackPromoBanner";
import CookieBanner from "@/components/CookieBanner";
import KatexFonts from "@/components/KatexFonts";

export const metadata: Metadata = {
  title: {
    default: "Theoremz - La piattaforma definitiva di Matematica e Fisica",
    template: "%s | Theoremz",
  },
  description:
    "Studia gratuitamente le materie scientifiche su Theoremz! Qui troverai anche esercizi per allenarti.",
  metadataBase: new URL("https://theoremz.com"),
  openGraph: {
    title: "Home | Theoremz - La piattaforma definitiva di matematica e fisica",
    description:
      "Studia gratuitamente le materie scientifiche su Theoremz! Qui troverai anche esercizi per allenarti.",
    url: "https://theoremz.com",
    siteName: "Theoremz",
    images: [{ url: "/metadata.png" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Home | Theoremz - La piattaforma definitiva di matematica e fisica",
    description:
      "Studia gratuitamente le materie scientifiche su Theoremz! Qui troverai anche esercizi per allenarti.",
    site: "@theoremz_",
    images: ["/metadata.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/images/apple-touch.png",
  },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  adjustFontFallback: true,
  preload: true,
  fallback: ["system-ui", "Segoe UI", "Helvetica", "Arial", "sans-serif"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  userScalable: true,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="it"
      translate="no"
      className={montserrat.className}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        <KatexFonts />
        <meta name="google" content="notranslate" />
        <meta name="color-scheme" content="light dark" />
        {/* DNS prefetch leggero per immagini da Sanity; evita connessioni TCP/TLS inutili */}
        <link rel="dns-prefetch" href="https://cdn.sanity.io" />
        <link rel="preconnect" href="https://cdn.sanity.io" crossOrigin="anonymous" />
        {/* Hint early connections used by auth/Google APIs (saves ~300ms on mobile) */}
        <link rel="preconnect" href="https://apis.google.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://apis.google.com" />
        <link rel="preconnect" href="https://www.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googleapis.com" />
        {/* DNS only for resources that may be gated by consent */}
        <link rel="dns-prefetch" href="https://www.gstatic.com" />
        {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? (
          <>
            <link
              rel="preconnect"
              href={`https://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}`}
              crossOrigin="anonymous"
            />
            <link
              rel="dns-prefetch"
              href={`https://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}`}
            />
          </>
        ) : null}

        {/* Base structured data: Organization + WebSite */}
        <script
          type="application/ld+json"
          // keep JSON minimal to avoid validation noise
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  name: "Theoremz",
                  url: "https://theoremz.com",
                  logo: {
                    "@type": "ImageObject",
                    url: "https://theoremz.com/images/logo.webp",
                  },
                },
                {
                  "@type": "WebSite",
                  name: "Theoremz",
                  url: "https://theoremz.com",
                  inLanguage: "it-IT",
                  potentialAction: [
                    {
                      "@type": "SearchAction",
                      target: "https://theoremz.com/matematica?q={search_term_string}",
                      "query-input": "required name=search_term_string",
                    },
                    {
                      "@type": "SearchAction",
                      target: "https://theoremz.com/fisica?q={search_term_string}",
                      "query-input": "required name=search_term_string",
                    },
                  ],
                },
              ],
            }),
          }}
        />

        {/* Theme init (no-flash, resolves Android/system vs site selection) */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            try {
              var d = document.documentElement;
              var s = localStorage.getItem('theme');
              var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
              var t = (s === 'dark' || s === 'light') ? s : (prefersDark ? 'dark' : 'light');
              if (t === 'dark') d.classList.add('dark'); else d.classList.remove('dark');
              d.style.colorScheme = t;
            } catch {}
          `}
        </Script>
      </head>

      <body className="antialiased min-h-dvh bg-background text-foreground overflow-x-hidden">
        <ToastProvider>
          <AuthProvider>
            {/* Non bloccare il paint del contenuto server-rendered */}
            <Suspense fallback={null}>
              <Providers>
                <Suspense fallback={null}>
                  <Header />
                </Suspense>

                {/* Banner Black (client) — mostra solo se non abbonato; escluso /black, /mentor e /contatto-rapido */}
                <Suspense fallback={null}>
                  <BlackPromoBanner />
                </Suspense>

                {children}

                <Suspense fallback={null}>
                  <Footer />
                </Suspense>

                {/* GDPR consent banner */}
                <Suspense fallback={null}>
                  <CookieBanner />
                </Suspense>
              </Providers>
            </Suspense>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
