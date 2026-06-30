import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import EspressioniOnlineClient from "./EspressioniOnlineClient";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/calcolatori/espressioni-online`;

export const metadata: Metadata = {
  title: "Espressioni online con passaggi",
  description:
    "Risolvi espressioni online con parentesi, frazioni, potenze e operazioni. Calcolo numerico con risultato esatto e passaggi spiegati.",
  alternates: { canonical: "/calcolatori/espressioni-online" },
  robots: {
    index: true,
    follow: true,
    googleBot:
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  },
  openGraph: {
    title: "Espressioni online con passaggi",
    description:
      "Calcolatore di espressioni numeriche con parentesi, frazioni, potenze e passaggi.",
    url: CANONICAL,
    siteName: "Theoremz",
    type: "website",
    images: [{ url: "/metadata.png", width: 1200, height: 630, alt: "Espressioni online con passaggi — Theoremz" }],
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: "Espressioni online con passaggi",
    description:
      "Risolvi espressioni numeriche online con procedimento spiegato.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
  keywords: [
    "espressioni online",
    "risolvi espressioni online",
    "calcolatore espressioni",
    "espressioni con frazioni",
    "espressioni con potenze",
    "espressioni con parentesi",
    "espressioni con passaggi",
  ],
};

const faq = [
  {
    question: "Che tipo di espressioni posso risolvere?",
    answer:
      "Puoi risolvere espressioni numeriche con addizioni, sottrazioni, moltiplicazioni, divisioni, parentesi, frazioni e potenze con esponente intero.",
  },
  {
    question: "Come si scrivono le frazioni?",
    answer:
      "Le frazioni si scrivono con la barra. Per esempio un mezzo si scrive 1/2 e tre quarti si scrive 3/4.",
  },
  {
    question: "Qual è l'ordine delle operazioni?",
    answer:
      "Prima si risolvono parentesi e potenze, poi moltiplicazioni e divisioni, infine addizioni e sottrazioni.",
  },
  {
    question: "Il risultato è approssimato?",
    answer:
      "Quando il risultato è frazionario, il calcolatore mostra la frazione esatta e anche il valore decimale.",
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

export default function EspressioniOnlinePage() {
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
        name: "Espressioni online",
        item: CANONICAL,
      },
    ],
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Espressioni online",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: CANONICAL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    featureList: [
      "Espressioni numeriche",
      "Parentesi",
      "Frazioni",
      "Potenze intere",
      "Risultato esatto",
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
            Espressioni online
          </h1>
          <p className="mt-4 hidden max-w-2xl text-[15.5px] font-medium leading-relaxed sm:block">
            Risolvi espressioni numeriche con parentesi, frazioni, potenze e
            operazioni base. Il risultato viene mostrato in forma esatta e con i
            passaggi essenziali.
          </p>
        </div>

        <div className="mt-8">
          <EspressioniOnlineClient />
        </div>
      </section>

      <section className="mx-6 mt-6 grid max-w-screen-xl gap-4 pb-12 lg:grid-cols-[1.05fr_0.95fr] xl:mx-auto">
        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Come scrivere l&apos;espressione</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Scrivi i numeri e gli operatori nell&apos;ordine dell&apos;esercizio. Puoi
            usare sia × sia *, sia : sia /. Le frazioni si scrivono con la barra,
            per esempio 1/2 + 3/4.
          </p>
        </article>

        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Ordine delle operazioni</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Il calcolatore rispetta l&apos;ordine standard: prima parentesi e potenze,
            poi moltiplicazioni e divisioni, infine addizioni e sottrazioni.
          </p>
          <div className="mt-4 rounded-[18px] border-2 border-slate-900/70 bg-white px-4 py-3 font-bold shadow-[0_3px_0_#0f172a] [.dark_&]:bg-slate-900">
            parentesi → potenze → × e : → + e -
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
