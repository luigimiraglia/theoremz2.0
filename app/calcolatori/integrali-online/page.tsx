import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import IntegraliOnlineClient from "./IntegraliOnlineClient";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/calcolatori/integrali-online`;

export const metadata: Metadata = {
  title: "Integrali online con passaggi",
  description:
    "Calcolatrice integrali online per primitive scolastiche: polinomi, potenze, seno, coseno, esponenziali, logaritmi e radici con passaggi.",
  alternates: { canonical: "/calcolatori/integrali-online" },
  robots: {
    index: true,
    follow: true,
    googleBot:
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  },
  openGraph: {
    title: "Integrali online con passaggi",
    description:
      "Calcolatore di primitive con regole spiegate e risultato in forma matematica.",
    url: CANONICAL,
    siteName: "Theoremz",
    type: "website",
    images: [{ url: "/metadata.png" }],
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: "Integrali online con passaggi",
    description:
      "Calcola primitive online con passaggi per funzioni scolastiche.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
  keywords: [
    "integrali online",
    "calcolatrice integrali",
    "calcolo integrali online",
    "integrali con passaggi",
    "calcolatore primitive",
    "primitive online",
    "integrale indefinito online",
    "risolutore integrali",
  ],
};

const faq = [
  {
    question: "Che integrali posso calcolare?",
    answer:
      "Il calcolatore gestisce primitive scolastiche: polinomi, potenze di x, somme, costanti, 1/x, radici, seno, coseno ed esponenziali con argomento lineare.",
  },
  {
    question: "Mostra i passaggi?",
    answer:
      "Sì. Mostra le principali regole usate e ricorda di aggiungere la costante di integrazione C.",
  },
  {
    question: "È una calcolatrice CAS completa?",
    answer:
      "No. È uno strumento didattico per gli integrali più comuni del programma scolastico. Prodotti e quozienti complessi possono richiedere metodi avanzati.",
  },
  {
    question: "Come devo scrivere le funzioni?",
    answer:
      "Puoi scrivere x^2, 3x^2-4x+1, 1/x, sqrt(x), sin(2x), cos(x), exp(x), con parentesi e prodotti impliciti come 2x.",
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

export default function IntegraliOnlinePage() {
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
        name: "Integrali online",
        item: CANONICAL,
      },
    ],
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Integrali online",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: CANONICAL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    featureList: [
      "Primitive di polinomi",
      "Potenze di x",
      "Integrale di 1/x",
      "Radici",
      "Seno e coseno",
      "Esponenziali",
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
            Integrali online
          </h1>
          <p className="mt-4 hidden max-w-2xl text-[15.5px] font-medium leading-relaxed sm:block">
            Calcola primitive scolastiche con passaggi: polinomi, potenze,
            radici, 1/x, seno, coseno ed esponenziali con argomento lineare.
          </p>
        </div>

        <div className="mt-8">
          <IntegraliOnlineClient />
        </div>
      </section>

      <section className="mx-6 mt-6 grid max-w-screen-xl gap-4 pb-12 lg:grid-cols-[1fr_1fr] xl:mx-auto">
        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Integrale indefinito</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Un integrale indefinito cerca una primitiva della funzione, cioè una
            funzione la cui derivata restituisce la funzione di partenza.
          </p>
          <div className="mt-4 overflow-x-auto rounded-[18px] border-2 border-slate-900/70 bg-white px-4 py-3 font-bold shadow-[0_3px_0_#0f172a] [.dark_&]:bg-slate-900">
            ∫ f(x) dx = F(x) + C
          </div>
        </article>

        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Costante di integrazione</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Le primitive di una funzione sono infinite: differiscono per una
            costante. Per questo, negli integrali indefiniti si aggiunge sempre
            + C al risultato.
          </p>
          <Link
            href="/calcolatori/derivate-online"
            className="mt-4 inline-flex rounded-[14px] bg-blue-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-600"
          >
            Apri il calcolatore di derivate
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
