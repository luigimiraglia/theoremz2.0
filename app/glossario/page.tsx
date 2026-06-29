import type { Metadata } from "next";
import Link from "next/link";
import { glossario, CATEGORIE, type GlossaryTerm } from "@/data/glossario";

export const metadata: Metadata = {
  title: "Glossario di matematica e fisica — Theoremz",
  description:
    "Definizioni chiare e concise dei termini principali di matematica e fisica per le scuole superiori: algebra, analisi, trigonometria, geometria, probabilità e fisica.",
  alternates: { canonical: "https://theoremz.com/glossario" },
  openGraph: {
    title: "Glossario di matematica e fisica",
    description:
      "Tutti i termini chiave spiegati in modo semplice. Algebra, analisi, trigonometria, geometria, probabilità e fisica.",
    url: "https://theoremz.com/glossario",
  },
};

const CATEGORIA_EMOJI: Record<string, string> = {
  Algebra: "🔢",
  Analisi: "📈",
  Trigonometria: "📐",
  Geometria: "📏",
  "Probabilità e statistica": "🎲",
  Fisica: "⚛️",
};

const CATEGORIA_COLOR: Record<string, string> = {
  Algebra:
    "bg-violet-100 text-violet-700 [.dark_&]:bg-violet-900/40 [.dark_&]:text-violet-300",
  Analisi:
    "bg-sky-100 text-sky-700 [.dark_&]:bg-sky-900/40 [.dark_&]:text-sky-300",
  Trigonometria:
    "bg-emerald-100 text-emerald-700 [.dark_&]:bg-emerald-900/40 [.dark_&]:text-emerald-300",
  Geometria:
    "bg-orange-100 text-orange-700 [.dark_&]:bg-orange-900/40 [.dark_&]:text-orange-300",
  "Probabilità e statistica":
    "bg-pink-100 text-pink-700 [.dark_&]:bg-pink-900/40 [.dark_&]:text-pink-300",
  Fisica:
    "bg-cyan-100 text-cyan-700 [.dark_&]:bg-cyan-900/40 [.dark_&]:text-cyan-300",
};

function buildJsonLd(terms: GlossaryTerm[]) {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "Glossario di matematica e fisica",
    "@id": "https://theoremz.com/glossario",
    description:
      "Definizioni chiare e concise dei termini principali di matematica e fisica per le scuole superiori.",
    hasDefinedTerm: terms.map((t) => ({
      "@type": "DefinedTerm",
      name: t.termine,
      "@id": `https://theoremz.com/glossario#${t.slug}`,
      description: t.definizione,
      inDefinedTermSet: "https://theoremz.com/glossario",
    })),
  };
}

export default function GlossarioPage() {
  const byCategoria = CATEGORIE.reduce(
    (acc, cat) => {
      acc[cat] = glossario.filter((t) => t.categoria === cat);
      return acc;
    },
    {} as Record<string, GlossaryTerm[]>
  );

  const jsonLd = buildJsonLd(glossario);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="min-h-screen bg-white [.dark_&]:bg-slate-950">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="mb-10">
            <p className="text-sm font-medium text-sky-600 [.dark_&]:text-sky-400 mb-2 uppercase tracking-wide">
              Riferimento rapido
            </p>
            <h1 className="text-4xl font-black text-slate-900 [.dark_&]:text-white mb-3">
              Glossario
            </h1>
            <p className="text-lg text-slate-600 [.dark_&]:text-slate-300 max-w-2xl">
              {glossario.length} termini chiave di matematica e fisica spiegati
              in modo chiaro. Ogni definizione è pensata per essere estraibile e
              utile prima di una verifica.
            </p>
          </div>

          {/* Quick-nav categorie */}
          <nav
            aria-label="Categorie del glossario"
            className="flex flex-wrap gap-2 mb-12"
          >
            {CATEGORIE.map((cat) => (
              <a
                key={cat}
                href={`#${cat.toLowerCase().replace(/\s+/g, "-").replace(/[àèìòù]/g, (c) => ({ à: "a", è: "e", ì: "i", ò: "o", ù: "u" }[c] ?? c))}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-slate-200 [.dark_&]:border-slate-700 bg-slate-50 [.dark_&]:bg-slate-900 text-slate-700 [.dark_&]:text-slate-300 hover:bg-slate-100 [.dark_&]:hover:bg-slate-800 transition-colors"
              >
                <span>{CATEGORIA_EMOJI[cat]}</span>
                {cat}
                <span className="text-xs text-slate-400 [.dark_&]:text-slate-500">
                  {byCategoria[cat].length}
                </span>
              </a>
            ))}
          </nav>

          {/* Sezioni per categoria */}
          <div className="space-y-16">
            {CATEGORIE.map((cat) => {
              const terms = byCategoria[cat];
              if (!terms.length) return null;
              const anchorId = cat
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[àèìòù]/g, (c) =>
                  ({ à: "a", è: "e", ì: "i", ò: "o", ù: "u" }[c] ?? c)
                );

              return (
                <section key={cat} id={anchorId} className="scroll-mt-20">
                  <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-200 [.dark_&]:border-slate-800">
                    <span className="text-2xl" aria-hidden>
                      {CATEGORIA_EMOJI[cat]}
                    </span>
                    <h2 className="text-2xl font-bold text-slate-900 [.dark_&]:text-white">
                      {cat}
                    </h2>
                    <span className="text-sm text-slate-400 [.dark_&]:text-slate-500 ml-auto">
                      {terms.length} termini
                    </span>
                  </div>

                  <dl className="space-y-6">
                    {terms.map((term) => (
                      <div
                        key={term.slug}
                        id={term.slug}
                        className="scroll-mt-20 group rounded-xl border border-slate-200 [.dark_&]:border-slate-800 bg-slate-50/50 [.dark_&]:bg-slate-900/30 p-5 hover:border-slate-300 [.dark_&]:hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <dt className="font-semibold text-slate-900 [.dark_&]:text-white text-[1.05rem]">
                            {term.termine}
                          </dt>
                          <span
                            className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORIA_COLOR[cat]}`}
                          >
                            {cat}
                          </span>
                        </div>
                        <dd className="text-slate-600 [.dark_&]:text-slate-400 text-[0.93rem] leading-7">
                          {term.definizione}
                        </dd>
                        {term.lezione && (
                          <div className="mt-3">
                            <Link
                              href={`/${term.lezione}`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 [.dark_&]:text-sky-400 hover:underline"
                            >
                              Lezione completa
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                                aria-hidden
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                                />
                              </svg>
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </dl>
                </section>
              );
            })}
          </div>

          {/* Footer CTA */}
          <div className="mt-16 pt-8 border-t border-slate-200 [.dark_&]:border-slate-800 text-center">
            <p className="text-slate-600 [.dark_&]:text-slate-400 mb-4">
              Vuoi approfondire? Consulta le lezioni complete di matematica e
              fisica.
            </p>
            <Link
              href="/lezioni"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-colors"
            >
              Tutte le lezioni
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
