import InterrogazioneSim from "@/components/InterrogazioneSim";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simulazione interrogazione | Theoremz",
  description:
    "Allenati all'interrogazione: ricevi domande, rispondi, ottieni feedback immediato e un voto finale in decimi con suggerimenti.",
  alternates: { canonical: "/interrogazione" },
};

export default function InterrogazionePage(props: any) {
  const rawTopic = props?.searchParams?.topic;
  const topic = typeof rawTopic === "string" ? rawTopic : Array.isArray(rawTopic) ? rawTopic[0] : undefined;
  return (
    <main className="min-h-screen px-4 py-8 text-slate-900 [.dark_&]:text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-sky-600 [.dark_&]:text-sky-300">
            Simulazione interrogazione
          </p>
          <h1 className="text-3xl font-black sm:text-4xl">Rispondi alle domande e ricevi il voto finale</h1>
          <p className="max-w-3xl text-sm sm:text-base text-slate-600 [.dark_&]:text-slate-200">
            Domande generate sull&apos;argomento che scegli, feedback immediato e valutazione conclusiva con punti di forza e da migliorare.
          </p>
        </header>

        <InterrogazioneSim prefilledTopic={topic} />
      </div>
    </main>
  );
}
