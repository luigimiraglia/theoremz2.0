import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import {
  FaCalculator,
  FaCheckCircle,
  FaDivide,
  FaEquals,
  FaListOl,
  FaPercent,
  FaRulerCombined,
  FaSquareRootAlt,
} from "react-icons/fa";
import type { IconType } from "react-icons";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";

type Calculator = {
  title: string;
  description: string;
  status: string;
  icon: IconType;
  href?: string;
};

export const metadata: Metadata = {
  title: "Calcolatori online di matematica e fisica",
  description:
    "Elenco dei calcolatori online Theoremz per matematica e fisica: percentuali, MCD, mcm, fattori primi, equivalenze ed espressioni.",
  alternates: { canonical: "/calcolatori" },
  robots: {
    index: true,
    follow: true,
    googleBot:
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  },
  openGraph: {
    title: "Calcolatori online di matematica e fisica",
    description:
      "Strumenti online per calcoli di matematica e fisica, con risultati e passaggi spiegati.",
    url: `${SITE}/calcolatori`,
    siteName: "Theoremz",
    type: "website",
    images: [{ url: "/metadata.png" }],
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: "Calcolatori online di matematica e fisica",
    description:
      "Elenco dei calcolatori online Theoremz per matematica e fisica.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
};

const calculators: Calculator[] = [
  {
    title: "Calcolo percentuale",
    description: "Percentuali, sconti, aumenti e variazioni percentuali.",
    status: "Disponibile",
    icon: FaPercent,
    href: "/calcolatori/calcolo-percentuale",
  },
  {
    title: "MCD online",
    description: "Massimo comune divisore con passaggi.",
    status: "Disponibile",
    icon: FaDivide,
    href: "/calcolatori/mcd-online",
  },
  {
    title: "mcm online",
    description: "Minimo comune multiplo con passaggi.",
    status: "Disponibile",
    icon: FaEquals,
    href: "/calcolatori/mcm-online",
  },
  {
    title: "Scomposizione in fattori primi",
    description: "Scomposizione guidata di un numero intero.",
    status: "Disponibile",
    icon: FaListOl,
    href: "/calcolatori/scomposizione-fattori-primi",
  },
  {
    title: "Numero primo",
    description: "Controllo di primalità e divisori da verificare.",
    status: "Disponibile",
    icon: FaCheckCircle,
    href: "/calcolatori/numero-primo",
  },
  {
    title: "Equivalenze",
    description: "Conversioni tra unità di misura.",
    status: "In preparazione",
    icon: FaRulerCombined,
  },
  {
    title: "Espressioni online",
    description: "Espressioni con numeri, frazioni, potenze e parentesi.",
    status: "Prossimamente",
    icon: FaSquareRootAlt,
  },
  {
    title: "Equazioni",
    description: "Equazioni di primo e secondo grado.",
    status: "Prossimamente",
    icon: FaCalculator,
  },
];

function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function CalcolatoriPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      {
        "@type": "ListItem",
        position: 2,
        name: "Calcolatori",
        item: `${SITE}/calcolatori`,
      },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Calcolatori online Theoremz",
    itemListElement: calculators.map((calculator, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: calculator.title,
      description: calculator.description,
      ...(calculator.href ? { url: `${SITE}${calculator.href}` } : {}),
    })),
  };

  return (
    <main className="min-h-screen text-[var(--fg)]">
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={itemListJsonLd} />

      <section className="relative mx-6 mt-24 max-w-screen-xl rounded-[24px] bg-gray-100/60 px-4 py-6 shadow-[inset_0_1px_0_rgba(0,0,0,0.04)] [.dark_&]:bg-slate-800 sm:mt-20 sm:px-6 sm:py-8 xl:mx-auto">
        <div className="absolute right-6 top-6 hidden sm:block">
          <ThemeToggle position="relative" />
        </div>

        <div className="max-w-3xl">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700 [.dark_&]:bg-blue-950 [.dark_&]:text-blue-200">
              Strumenti
            </div>
            <div className="sm:hidden">
              <ThemeToggle position="relative" />
            </div>
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight opacity-90 sm:text-4xl">
            Calcolatori online
          </h1>
          <p className="mt-4 hidden max-w-2xl text-[15.5px] font-medium leading-relaxed sm:block">
            Una raccolta di calcolatori per matematica e fisica. Ogni strumento
            mostra il risultato e i passaggi essenziali del procedimento.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {calculators.map((calculator) => {
            const Icon = calculator.icon;
            const cardContent = (
              <>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-blue-100 text-blue-700 [.dark_&]:bg-blue-950 [.dark_&]:text-blue-200">
                    <Icon aria-hidden="true" />
                  </span>
                  <h2 className="text-lg font-bold">{calculator.title}</h2>
                </div>
                <p className="mt-3 text-sm font-medium leading-6 opacity-80">
                  {calculator.description}
                </p>
                {calculator.href && (
                  <span className="mt-4 inline-flex rounded-[14px] bg-blue-500 px-4 py-2 text-sm font-bold text-white">
                    Apri calcolatore
                  </span>
                )}
              </>
            );

            if (calculator.href) {
              return (
                <Link
                  key={calculator.title}
                  href={calculator.href}
                  className="block rounded-[18px] border-2 border-slate-900/70 bg-white px-4 py-4 shadow-[0_3px_0_#0f172a] transition hover:-translate-y-0.5 hover:shadow-[0_5px_0_#0f172a] [.dark_&]:bg-slate-900"
                >
                  {cardContent}
                </Link>
              );
            }

            return (
              <article
                key={calculator.title}
                className="rounded-[18px] border-2 border-slate-900/70 bg-white px-4 py-4 opacity-80 shadow-[0_3px_0_#0f172a] [.dark_&]:bg-slate-900"
              >
                {cardContent}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
