// app/(landing)/risolutore/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import RisolutoreUpload from "@/components/RisolutoreUpload";

const TITLE = "Risolutore esercizi";
const DESC =
  "Carica la foto di un esercizio di matematica o fisica e lascia che Theoremz AI lo trasformi in una soluzione guidata, in stile lezione.";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/risolutore" },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: `${SITE}/risolutore`,
    images: [{ url: "/metadata.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
    site: "@theoremz_",
    images: ["/metadata.png"],
  },
};

export default function RisolutorePage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 [.dark_&]:text-slate-400">
            Strumenti
          </p>
          <h1 className="text-3xl font-black text-slate-900 [.dark_&]:text-white">
            Risolutore esercizi
          </h1>
          <p className="text-sm text-slate-600 [.dark_&]:text-slate-300">
            Carica l'esercizio e ottieni una soluzione didattica pronta da copiare nei tuoi appunti.
          </p>
        </header>
        <RisolutoreUpload />
      </div>
    </main>
  );
}
