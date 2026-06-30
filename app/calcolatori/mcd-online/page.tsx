import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import McdOnlineClient from "./McdOnlineClient";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/calcolatori/mcd-online`;

export const metadata: Metadata = {
  title: "MCD online con passaggi",
  description:
    "Calcola il MCD online di due o più numeri con algoritmo di Euclide, scomposizione in fattori primi e passaggi spiegati.",
  alternates: { canonical: "/calcolatori/mcd-online" },
  robots: {
    index: true,
    follow: true,
    googleBot:
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  },
  openGraph: {
    title: "MCD online con passaggi",
    description:
      "Calcolatore del massimo comune divisore con passaggi, fattori primi e algoritmo di Euclide.",
    url: CANONICAL,
    siteName: "Theoremz",
    type: "website",
    images: [{ url: "/metadata.png", width: 1200, height: 630, alt: "MCD online con passaggi — Theoremz" }],
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: "MCD online con passaggi",
    description:
      "Calcola il massimo comune divisore online con procedimento spiegato.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
  keywords: [
    "mcd online",
    "calcolo mcd online",
    "massimo comune divisore",
    "calcolatore mcd",
    "mcd con passaggi",
    "algoritmo di Euclide",
    "scomposizione in fattori primi",
  ],
};

const faq = [
  {
    question: "Che cos'è il MCD?",
    answer:
      "Il MCD, massimo comune divisore, è il più grande numero intero che divide esattamente tutti i numeri considerati.",
  },
  {
    question: "Come si calcola il MCD con i fattori primi?",
    answer:
      "Si scompongono i numeri in fattori primi e si moltiplicano solo i fattori comuni presi con l'esponente più piccolo.",
  },
  {
    question: "Come funziona l'algoritmo di Euclide?",
    answer:
      "Si divide il numero più grande per il più piccolo e si continua dividendo il divisore per il resto, finché il resto diventa zero.",
  },
  {
    question: "Si può calcolare il MCD di più di due numeri?",
    answer:
      "Sì. Si calcola prima il MCD dei primi due numeri, poi il MCD tra quel risultato e il numero successivo, fino alla fine.",
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

export default function McdOnlinePage() {
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
        name: "MCD online",
        item: CANONICAL,
      },
    ],
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MCD online",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: CANONICAL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    featureList: [
      "Calcolo del massimo comune divisore",
      "Supporto per due o più numeri",
      "Algoritmo di Euclide con passaggi",
      "Scomposizione in fattori primi",
      "Fattori comuni con esponente minore",
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
            MCD online
          </h1>
          <p className="mt-4 hidden max-w-2xl text-[15.5px] font-medium leading-relaxed sm:block">
            Calcola il massimo comune divisore di due o più numeri. Il risultato
            viene mostrato con algoritmo di Euclide, scomposizione in fattori
            primi e passaggi essenziali.
          </p>
        </div>

        <div className="mt-8">
          <McdOnlineClient />
        </div>
      </section>

      <section className="mx-6 mt-6 grid max-w-screen-xl gap-4 pb-12 lg:grid-cols-[1.05fr_0.95fr] xl:mx-auto">
        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Cos&apos;è il MCD</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Il MCD, massimo comune divisore, è il più grande numero che divide
            esattamente tutti i numeri dati. Serve per semplificare frazioni,
            risolvere problemi con divisori comuni e confrontare quantità
            divisibili nello stesso modo.
          </p>
        </article>

        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Formula con fattori primi</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Dopo aver scomposto i numeri in fattori primi, il MCD si ottiene
            moltiplicando soltanto i fattori comuni, ciascuno con l&apos;esponente
            minore.
          </p>
          <div className="mt-4 rounded-[18px] border-2 border-slate-900/70 bg-white px-4 py-3 font-bold shadow-[0_3px_0_#0f172a] [.dark_&]:bg-slate-900">
            MCD = prodotto dei fattori comuni con esponente minore
          </div>
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
