// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { Suspense } from "react";
import Script from "next/script";
import { cookies } from "next/headers";
import { AuthProvider } from "@/lib/AuthContext";
import "./globals.css";
import Providers from "./providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BlackPromoBanner from "@/components/BlackPromoBanner"; // ⬅️ NEW
import AnalyticsListener from "@/components/AnalyticsListener";
import CookieBanner from "@/components/CookieBanner";

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
    apple: "/images/apple-touch.webp",
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
  const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  let hasAnalyticsConsent = false;
  try {
    const cookieStore = await cookies();
    const c = cookieStore.get("tz_consent")?.value;
    if (c) {
      const v: any = JSON.parse(decodeURIComponent(c));
      hasAnalyticsConsent = !!v?.c?.analytics;
    }
  } catch {}
  return (
    <html lang="it" translate="no" className={montserrat.className} suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
        {/* Preconnect essenziali: Auth + Sanity CDN (immagini) */}
        <link
          rel="preconnect"
          href="https://theoremz-login.firebaseapp.com"
          crossOrigin=""
        />
        <link
          rel="dns-prefetch"
          href="https://theoremz-login.firebaseapp.com"
        />
        <link rel="preconnect" href="https://www.gstatic.com" crossOrigin="" />
        <link
          rel="preconnect"
          href="https://securetoken.googleapis.com"
          crossOrigin=""
        />
        <link rel="preconnect" href="https://apis.google.com" crossOrigin="" />
        <link rel="preconnect" href="https://cdn.sanity.io" crossOrigin="" />
        <link rel="preconnect" href="https://i.ytimg.com" crossOrigin="" />
        <link rel="preconnect" href="https://img.youtube.com" crossOrigin="" />

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
                    url: "https://theoremz.com/metadata.png",
                  },
                },
                {
                  "@type": "WebSite",
                  name: "Theoremz",
                  url: "https://theoremz.com",
                  inLanguage: "it-IT",
                },
              ],
            }),
          }}
        />

        {/* Consent Mode default (deny) – injected as early as possible */}
        <Script id="consent-default" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);} 
            gtag('consent', 'default', {
              'ad_storage': 'denied',
              'ad_user_data': 'denied',
              'ad_personalization': 'denied',
              'analytics_storage': 'denied',
              'functionality_storage': 'denied',
              'security_storage': 'granted'
            });
          `}
        </Script>

        {/* Google Analytics (GA4) – load only if analytics consent was already granted */}
        {GA_ID && hasAnalyticsConsent ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);} 
                window.gtag = gtag;
                gtag('js', new Date());
                // send_page_view: false to manually handle SPA navigations
                gtag('config', '${GA_ID}', { anonymize_ip: true, send_page_view: false });
              `}
            </Script>
          </>
        ) : null}
      </head>

      <body className="antialiased min-h-dvh bg-background text-foreground">
        <AuthProvider>
          {/* Non bloccare il paint del contenuto server-rendered */}
          <Suspense fallback={null}>
            <Providers>
              <Suspense fallback={null}>
                <Header />
              </Suspense>

              {/* Banner Black (client) — mostra solo se non abbonato, escluso /black e /mentor */}
              <Suspense fallback={null}>
                <BlackPromoBanner />
              </Suspense>

              {children}

              <Suspense fallback={null}>
                <Footer />
              </Suspense>

              {/* SPA pageview listener (client) — only when analytics consent is present */}
              {GA_ID && hasAnalyticsConsent ? (
                <Suspense fallback={null}>
                  <AnalyticsListener />
                </Suspense>
              ) : null}

              {/* GDPR consent banner */}
              <Suspense fallback={null}>
                <CookieBanner />
              </Suspense>
            </Providers>
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
