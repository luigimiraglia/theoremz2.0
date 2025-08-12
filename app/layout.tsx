import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
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
  weight: ["400", "600", "700"], // solo i pesi che usi davvero
  display: "swap",
  adjustFontFallback: true,
  preload: true,
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
    <html lang="it" suppressHydrationWarning>
      <head>
        {/* Preconnect Firebase per Auth (non tocca LCP) */}
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
      </head>
      <body
        className={`${montserrat.className} antialiased min-h-dvh bg-background text-foreground`}
      >
        <AuthProvider>
          <Providers>
            <Header />
            {children}
            <Footer />
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
