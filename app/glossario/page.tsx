import type { Metadata } from "next";
import ThemeToggle from "@/components/ThemeToggle";
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

const CATEGORIA_COLOR: Record<string, string> = {
  Algebra:
    "bg-blue-100 text-blue-700 [.dark_&]:bg-blue-950 [.dark_&]:text-blue-200",
  Analisi:
    "bg-cyan-100 text-cyan-700 [.dark_&]:bg-cyan-950 [.dark_&]:text-cyan-200",
  Trigonometria:
    "bg-emerald-100 text-emerald-700 [.dark_&]:bg-emerald-950 [.dark_&]:text-emerald-200",
  Geometria:
    "bg-amber-100 text-amber-700 [.dark_&]:bg-amber-950 [.dark_&]:text-amber-200",
  "Probabilità e statistica":
    "bg-rose-100 text-rose-700 [.dark_&]:bg-rose-950 [.dark_&]:text-rose-200",
  Fisica:
    "bg-indigo-100 text-indigo-700 [.dark_&]:bg-indigo-950 [.dark_&]:text-indigo-200",
};

function categoryAnchor(cat: string) {
  return cat
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[àèìòù]/g, (c) => ({ à: "a", è: "e", ì: "i", ò: "o", ù: "u" }[c] ?? c));
}

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

      <main className="min-h-screen text-[var(--fg)]">
        <section className="relative mx-6 mt-24 max-w-screen-xl rounded-[24px] bg-gray-100/60 px-4 py-6 shadow-[inset_0_1px_0_rgba(0,0,0,0.04)] [.dark_&]:bg-slate-800 sm:mt-20 sm:px-6 sm:py-8 xl:mx-auto">
          <div className="absolute right-6 top-6 hidden sm:block">
            <ThemeToggle position="relative" />
          </div>

          <div className="max-w-3xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700 [.dark_&]:bg-blue-950 [.dark_&]:text-blue-200">
                Riferimento rapido
              </div>
              <div className="sm:hidden">
                <ThemeToggle position="relative" />
              </div>
            </div>

            <h1 className="text-3xl font-bold leading-tight tracking-tight opacity-90 sm:text-4xl">
              Glossario
            </h1>
            <p className="mt-4 hidden max-w-2xl text-[15.5px] font-medium leading-relaxed sm:block">
              {glossario.length} termini chiave di matematica e fisica spiegati
              in modo chiaro, con definizioni rapide pensate per ripassare
              prima di una verifica.
            </p>
          </div>

          <nav
            aria-label="Categorie del glossario"
            className="mt-8 flex flex-wrap gap-2"
          >
            {CATEGORIE.map((cat) => (
              <a
                key={cat}
                href={`#${categoryAnchor(cat)}`}
                className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900/20 bg-white px-3 py-2 text-sm font-bold transition hover:border-slate-900/50 [.dark_&]:border-slate-500 [.dark_&]:bg-slate-900 [.dark_&]:hover:border-slate-300"
              >
                {cat}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 [.dark_&]:bg-slate-800 [.dark_&]:text-slate-300">
                  {byCategoria[cat].length}
                </span>
              </a>
            ))}
          </nav>
        </section>

        <section className="mx-6 mt-6 max-w-screen-xl pb-12 xl:mx-auto">
          <div className="space-y-6">
            {CATEGORIE.map((cat) => {
              const terms = byCategoria[cat];
              if (!terms.length) return null;

              return (
                <section
                  key={cat}
                  id={categoryAnchor(cat)}
                  className="scroll-mt-24 rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6"
                >
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold">{cat}</h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${CATEGORIA_COLOR[cat]}`}>
                      {terms.length} termini
                    </span>
                  </div>

                  <dl className="grid gap-3 md:grid-cols-2">
                    {terms.map((term) => (
                      <div
                        key={term.slug}
                        id={term.slug}
                        className="scroll-mt-24 rounded-[18px] border-2 border-slate-900/70 bg-white px-4 py-4 shadow-[0_3px_0_#0f172a] [.dark_&]:bg-slate-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <dt className="text-lg font-bold leading-snug">
                            {term.termine}
                          </dt>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${CATEGORIA_COLOR[cat]}`}>
                            {cat}
                          </span>
                        </div>
                        <dd className="mt-3 text-sm font-medium leading-7 opacity-85">
                          {term.definizione}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              );
            })}
          </div>
        </section>

        <section className="mx-6 max-w-screen-xl pb-16 xl:mx-auto">
          <div className="rounded-[24px] bg-gray-100/60 px-4 py-5 text-center [.dark_&]:bg-slate-800 sm:px-6">
            <p className="text-sm font-medium leading-7 opacity-85">
              Le definizioni sono sintetiche: usale come riferimento rapido
              mentre studi matematica e fisica.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
