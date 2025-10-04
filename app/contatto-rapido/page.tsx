import type { Metadata } from "next";
import LeadFormClient from "./LeadFormClient";

export const metadata: Metadata = {
  title: "Parla con un tutor | Theoremz",
  description:
    "Un consulente accademico ti contatterà rapidamente per aiutarti a capire l’opzione migliore per le tue necessità.",
  alternates: { canonical: "/contatto-rapido" },
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-white [.dark_&]:bg-slate-950">
      <section className="mx-auto max-w-3xl sm:px-6 pb-10 pt-3">
        {/* Mini title section */}
        <div className="text-center">
          <h1 className="text-[26px] sm:text-[30px] font-black text-slate-800 [.dark_&]:text-sky-400">
            Indeciso? <br />{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-emerald-400 to-blue-500">
              Parla con un tutor
            </span>
          </h1>
          <p className="mt-2 text-[15.5px] px-5 sm:text-[16px] text-slate-600 [.dark_&]:text-slate-300">
            Ti contatteremo in poche ore per aiutarti a scegliere l’opzione più
            adatta ai tuoi obiettivi.
          </p>
        </div>

        <LeadFormClient />
      </section>
    </main>
  );
}
