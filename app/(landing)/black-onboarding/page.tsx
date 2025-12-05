import type { Metadata } from "next";
import BlackOnboardingExperience from "./BlackOnboardingExperience";

const TITLE = "Onboarding Black — Benvenuto";
const DESC =
  "Completa l'onboarding di Theoremz Black: inserisci i tuoi dati e guarda il video introduttivo per partire subito.";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/black-onboarding`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/black-onboarding" },
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
  robots: { index: false, follow: false },
};

export default function BlackOnboardingPage() {
  return <BlackOnboardingExperience />;
}
