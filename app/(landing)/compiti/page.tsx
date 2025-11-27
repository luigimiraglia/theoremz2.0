import HomeworkReview from "@/components/HomeworkReview";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Controllo compiti con AI | Theoremz",
  description:
    "Carica i compiti svolti, ottieni feedback dettagliato su ogni esercizio: cosa è giusto, cosa manca, come migliorare e punteggio stile verifica.",
  alternates: { canonical: "/compiti" },
};

export default function CompitiPage() {
  return (
    <main className="min-h-screen px-4 py-8 text-slate-900 [.dark_&]:bg-slate-950 [.dark_&]:text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-sky-600 [.dark_&]:text-sky-300">
            Verifica compiti
          </p>
          <h1 className="text-3xl font-black sm:text-4xl">Carica i tuoi compiti e ottieni un feedback da tutor AI</h1>
          <p className="max-w-3xl text-sm sm:text-base text-slate-600 [.dark_&]:text-slate-200">
            Analizziamo ogni esercizio, evidenziamo cosa hai fatto bene, dove correggere e assegnamo un punteggio 0–10 come in verifica.
          </p>
        </header>

        <HomeworkReview />
      </div>
    </main>
  );
}
