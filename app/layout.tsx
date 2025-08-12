import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
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

const montserrat = localFont({
  src: [
    {
      path: "../public/fonts/Montserrat/Montserrat-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Montserrat/Montserrat-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/Montserrat/Montserrat-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/Montserrat/Montserrat-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/Montserrat/Montserrat-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../public/fonts/Montserrat/Montserrat-Black.woff2",
      weight: "900",
      style: "normal",
    },
    {
      path: "../public/fonts/Montserrat/Montserrat-Italic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--font-montserrat",
  fallback: [
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "Arial",
    "sans-serif",
  ],
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
        className={`${montserrat.variable} antialiased min-h-dvh bg-background text-foreground`}
        style={{ fontFamily: "var(--font-montserrat)" }}
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
