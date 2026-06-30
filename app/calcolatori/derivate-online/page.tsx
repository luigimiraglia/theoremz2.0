import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import DerivateOnlineClient from "./DerivateOnlineClient";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/calcolatori/derivate-online`;

export const metadata: Metadata = {
  title: "Derivate online con passaggi",
  description:
    "Calcolatrice derivate online per polinomi, prodotti, quozienti, potenze, seno, coseno, logaritmi, radici ed esponenziali con passaggi.",
  alternates: { canonical: "/calcolatori/derivate-online" },
  robots: {
    index: true,
    follow: true,
    googleBot:
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  },
  openGraph: {
    title: "Derivate online con passaggi",
    description:
      "Calcolatore di derivate con regole spiegate e risultato in forma matematica.",
    url: CANONICAL,
    siteName: "Theoremz",
    type: "website",
    images: [{ url: "/metadata.png", width: 1200, height: 630, alt: "Derivate online con passaggi — Theoremz" }],
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: "Derivate online con passaggi",
    description:
      "Calcola derivate online con passaggi per funzioni scolastiche.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
  keywords: [
    "derivate online",
    "calcolatrice derivate",
    "calcolo derivate online",
    "derivate con passaggi",
    "calcolatore derivate",
    "derivata prima online",
    "derivata di una funzione",
    "risolutore derivate",
  ],
};

const faq = [
  {
    question: "Che derivate posso calcolare?",
    answer:
      "Il calcolatore gestisce polinomi, prodotti, quozienti, potenze numeriche, parentesi e funzioni elementari come seno, coseno, tangente, logaritmo, radice ed esponenziale.",
  },
  {
    question: "Mostra i passaggi?",
    answer:
      "Sì. Mostra le principali regole usate, come regola della potenza, prodotto, quoziente e catena.",
  },
  {
    question: "È un CAS completo?",
    answer:
      "No. È pensato per le derivate più comuni del programma scolastico. Per funzioni molto avanzate può servire una riscrittura più semplice.",
  },
  {
    question: "Come scrivo le funzioni?",
    answer:
      "Puoi scrivere x^2, sin(x), cos(x), tan(x), ln(x), log(x), sqrt(x), exp(x), prodotti come 2x e quozienti come (x^2+1)/(x-1).",
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

export default function DerivateOnlinePage() {
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
      {
        "@type": "ListItem",
        position: 3,
        name: "Derivate online",
        item: CANONICAL,
      },
    ],
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Derivate online",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: CANONICAL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    featureList: [
      "Derivate di polinomi",
      "Regola del prodotto",
      "Regola del quoziente",
      "Regola della catena",
      "Derivate trigonometriche",
      "Logaritmi ed esponenziali",
      "Passaggi spiegati",
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <main className="min-h-screen text-[var(--fg)]">
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={softwareJsonLd} />
      <JsonLd data={faqJsonLd} />

      <section className="relative mx-6 mt-24 max-w-screen-xl rounded-[24px] bg-gray-100/60 px-4 py-6 shadow-[inset_0_1px_0_rgba(0,0,0,0.04)] [.dark_&]:bg-slate-800 sm:mt-20 sm:px-6 sm:py-8 xl:mx-auto">
        <div className="absolute right-6 top-6 hidden sm:block">
          <ThemeToggle position="relative" />
        </div>

        <div className="max-w-3xl">
          <div className="mb-4 flex items-center justify-between gap-4">
            <Link
              href="/calcolatori"
              className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-200 [.dark_&]:bg-blue-950 [.dark_&]:text-blue-200"
            >
              Calcolatori
            </Link>
            <div className="sm:hidden">
              <ThemeToggle position="relative" />
            </div>
          </div>

          <h1 className="text-3xl font-bold leading-tight tracking-tight opacity-90 sm:text-4xl">
            Derivate online
          </h1>
          <p className="mt-4 hidden max-w-2xl text-[15.5px] font-medium leading-relaxed sm:block">
            Calcola la derivata prima di una funzione con regole spiegate:
            potenze, prodotti, quozienti, catena, logaritmi, esponenziali e
            funzioni goniometriche.
          </p>
        </div>

        <div className="mt-8">
          <DerivateOnlineClient />
        </div>
      </section>

      <section className="mx-6 mt-6 grid max-w-screen-xl gap-4 pb-12 lg:grid-cols-[1fr_1fr] xl:mx-auto">
        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Regole di derivazione</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Il calcolatore riconosce le regole principali: derivata di una
            somma, potenza, prodotto, quoziente e funzione composta. Questo lo
            rende utile per controllare esercizi scolastici e capire quale
            regola viene usata.
          </p>
          <div className="mt-4 overflow-x-auto rounded-[18px] border-2 border-slate-900/70 bg-white px-4 py-3 font-bold shadow-[0_3px_0_#0f172a] [.dark_&]:bg-slate-900">
            (uⁿ)&apos; = n · uⁿ⁻¹ · u&apos;
          </div>
        </article>

        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Funzioni supportate</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Puoi usare sin(x), cos(x), tan(x), ln(x), log(x), sqrt(x), exp(x),
            parentesi, prodotti impliciti come 2x e quozienti come
            (x^2+1)/(x-1).
          </p>
          <Link
            href="/calcolatori/integrali-online"
            className="mt-4 inline-flex rounded-[14px] bg-blue-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-600"
          >
            Apri il calcolatore di integrali
          </Link>
        </article>
      </section>

      <section className="mx-6 max-w-screen-xl pb-16 xl:mx-auto">
        <div className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Domande frequenti</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {faq.map((item) => (
              <article
                key={item.question}
                className="rounded-[18px] border-2 border-slate-900/70 bg-white px-4 py-4 shadow-[0_3px_0_#0f172a] [.dark_&]:bg-slate-900"
              >
                <h3 className="font-bold">{item.question}</h3>
                <p className="mt-2 text-sm font-medium leading-6 opacity-80">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
