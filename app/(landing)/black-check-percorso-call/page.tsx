import type { Metadata } from "next";
import BlackOnboardingGate from "@/components/BlackOnboardingGate";

const TITLE = "Check percorso Black — Prenota la call (20 minuti)";
const DESC =
  "Prenota una call di controllo percorso da 20 minuti con il team Black e aggiorna obiettivi, dubbi e priorità.";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/black-check-percorso-call`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/black-check-percorso-call" },
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

export default function BlackCheckPercorsoCallPage() {
  return (
    <main>
      <BlackOnboardingGate variant="check" redirectPath="/black-check-percorso-call" />
    </main>
  );
}
