import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prenota una sessione — Theoremz",
  description: "Prenota una sessione con un tutor Theoremz.",
  alternates: { canonical: "https://theoremz.com/prenota" },
  robots: { index: false, follow: false },
};

export default function PrenotaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
