import type { Metadata } from "next";
import BlackOnboardingGate from "@/components/BlackOnboardingGate";

const TITLE = "Call di benvenuto Black — Prenota l'onboarding";
const DESC =
  "Blocca uno slot di 30 minuti con il team Black per impostare account, obiettivi e chat dedicata. Interfaccia di prenotazione senza invii.";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/black-onboarding-call`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/black-onboarding-call" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESC,
    url: CANONICAL,
    siteName: "Theoremz",
    images: [{ url: "/metadata.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
    site: "@theoremz_",
    images: ["/metadata.png"],
  },
  robots: { index: true, follow: true },
};

export default function BlackOnboardingCallPage() {
  return (
    <main>
      <BlackOnboardingGate />
    </main>
  );
}
