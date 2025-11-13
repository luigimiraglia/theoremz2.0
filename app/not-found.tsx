import Link from "next/link";
import { SearchX } from "lucide-react";

export const metadata = {
  title: "Pagina non trovata — Theoremz",
  description: "Ops! La pagina che cerchi non esiste. Torna alla home.",
};

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white [.dark_&]:bg-slate-950 px-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icona grande */}
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full bg-slate-100 [.dark_&]:bg-slate-900 flex items-center justify-center">
            <SearchX className="h-12 w-12 text-slate-400 [.dark_&]:text-slate-600" />
          </div>
        </div>

        {/* Titolo e descrizione */}
        <div className="space-y-3">
          <h1 className="text-5xl font-black text-slate-900 [.dark_&]:text-white">
            404
          </h1>
          <p className="text-xl font-semibold text-slate-700 [.dark_&]:text-slate-200">
            Pagina non trovata
          </p>
          <p className="text-base text-slate-600 [.dark_&]:text-slate-400">
            Ops! Sembra che tu stia cercando una pagina che non esiste. Non ti preoccupare, capita a tutti.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold py-3 px-6 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Torna alla home
          </Link>
          <Link
            href="/lezioni"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 [.dark_&]:border-slate-800 bg-white/60 [.dark_&]:bg-slate-900/40 hover:bg-slate-50 [.dark_&]:hover:bg-slate-800/60 text-slate-700 [.dark_&]:text-slate-300 font-semibold py-3 px-6 transition-colors backdrop-blur"
          >
            Sfoglia le lezioni
          </Link>
        </div>

        {/* Suggerimento */}
        <div className="pt-6 border-t border-slate-200 [.dark_&]:border-slate-800">
          <p className="text-sm text-slate-500 [.dark_&]:text-slate-500">
            Hai bisogno di aiuto?{" "}
            <Link
              href="mailto:theoremz.team@gmail.com"
              className="text-sky-600 [.dark_&]:text-sky-400 hover:underline font-medium"
            >
              Contattaci
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
