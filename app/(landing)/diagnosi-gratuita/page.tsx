import type { Metadata } from "next";
import DiagnosiForm from "./DiagnosiForm";

export const metadata: Metadata = {
  title: "Diagnosi gratuita — Theoremz",
  description:
    "Prenota una chiamata gratuita di 15 minuti. Capiamo insieme cosa ti blocca in matematica o fisica e costruiamo un piano su misura per il tuo recupero.",
  alternates: { canonical: "/diagnosi-gratuita" },
  robots: { index: true, follow: true },
};

export default function DiagnosiGratuitaPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-gradient-to-b from-slate-50 via-white to-sky-50 text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-400/12 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-indigo-500/8 blur-3xl" />
      </div>

      <section className="relative mx-auto flex min-h-dvh w-full max-w-2xl items-start px-4 pt-3 pb-6 sm:items-center sm:px-6 sm:py-6 lg:px-8 lg:py-10">
        <div className="w-full rounded-[32px] border border-slate-200/90 bg-white/90 p-4 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.22)] backdrop-blur sm:p-6">
          <div className="mb-4 pt-1 text-center sm:mb-5 sm:pt-0">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-700">
              Diagnosi gratuita
            </p>
            <h1 className="mt-2 text-[28px] font-black leading-[1] tracking-[-0.05em] text-slate-900 sm:text-[34px]">
              Prenota la tua chiamata
            </h1>
            <p className="mt-2 text-[14px] leading-6 text-slate-600">
              15 minuti per capire da dove ripartire. Compila il form e ti
              richiamiamo.
            </p>
          </div>

          <DiagnosiForm />
        </div>
      </section>
    </main>
  );
}
