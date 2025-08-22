// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { Suspense } from "react";
import { AuthProvider } from "@/lib/AuthContext";
import "./globals.css";
import Providers from "./providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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
  display: "swap", // niente FOIT: il testo dipinge subito
  adjustFontFallback: true,
  preload: true,
  fallback: ["system-ui", "Segoe UI", "Helvetica", "Arial", "sans-serif"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className={montserrat.className} suppressHydrationWarning>
      <head>
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
        {/* facoltativo: se usi immagini/asset dal tuo dominio statico separato, aggiungi qui */}
      </head>

      <body className="antialiased min-h-dvh bg-background text-foreground">
        <AuthProvider>
          {/* Non bloccare il paint del contenuto server-rendered */}
          <Suspense fallback={null}>
            <Providers>
              <Suspense fallback={null}>
                <Header />
              </Suspense>

              {children}

              <Suspense fallback={null}>
                <Footer />
              </Suspense>
            </Providers>
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
