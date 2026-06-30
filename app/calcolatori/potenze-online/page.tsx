import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import PotenzeOnlineClient from "./PotenzeOnlineClient";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/calcolatori/potenze-online`;

export const metadata: Metadata = {
  title: "Potenze online con passaggi",
  description:
    "Calcola potenze online con base intera, decimale o frazionaria, esponenti negativi, risultato esatto e passaggi spiegati.",
  alternates: { canonical: "/calcolatori/potenze-online" },
  robots: {
    index: true,
    follow: true,
    googleBot:
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  },
  openGraph: {
    title: "Potenze online con passaggi",
    description:
      "Calcolatore di potenze con frazioni, esponenti negativi e procedimento.",
    url: CANONICAL,
    siteName: "Theoremz",
    type: "website",
    images: [{ url: "/metadata.png", width: 1200, height: 630, alt: "Potenze online con passaggi — Theoremz" }],
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: "Potenze online con passaggi",
    description:
      "Calcola potenze online con risultato esatto, decimale e passaggi.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
  keywords: [
    "potenze online",
    "calcolatore potenze",
    "calcolo potenze",
    "potenze con frazioni",
    "potenze con esponente negativo",
    "proprietà delle potenze",
    "potenze con passaggi",
    "calcolatrice potenze",
  ],
};

const faq = [
  {
    question: "Come si calcola una potenza?",
    answer:
      "Una potenza indica una moltiplicazione ripetuta: la base viene moltiplicata per se stessa tante volte quante indica l'esponente.",
  },
  {
    question: "Come funzionano gli esponenti negativi?",
    answer:
      "Con un esponente negativo si prende il reciproco della base e poi si usa l'esponente positivo corrispondente.",
  },
  {
    question: "Il calcolatore accetta frazioni?",
    answer:
      "Sì. Puoi scrivere la base come frazione, per esempio 3/4, e il risultato viene mostrato anche in forma esatta.",
  },
  {
    question: "Perché l'esponente deve essere intero?",
    answer:
      "Questo strumento è pensato per le potenze scolastiche con esponente intero, incluse le potenze con esponente negativo.",
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

export default function PotenzeOnlinePage() {
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
        name: "Potenze online",
        item: CANONICAL,
      },
    ],
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Potenze online",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: CANONICAL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    featureList: [
      "Potenze con base intera",
      "Potenze con base decimale",
      "Potenze con frazioni",
      "Esponenti negativi",
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
            Potenze online
          </h1>
          <p className="mt-4 hidden max-w-2xl text-[15.5px] font-medium leading-relaxed sm:block">
            Inserisci base ed esponente per calcolare una potenza. Puoi usare
            interi, decimali, frazioni ed esponenti negativi con risultato e
            passaggi.
          </p>
        </div>

        <div className="mt-8">
          <PotenzeOnlineClient />
        </div>
      </section>

      <section className="mx-6 mt-6 grid max-w-screen-xl gap-4 pb-12 lg:grid-cols-[1fr_1fr] xl:mx-auto">
        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Che cos&apos;è una potenza</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Una potenza è una moltiplicazione ripetuta. In aⁿ, la base è a e
            l&apos;esponente è n. Se n è positivo, la base viene moltiplicata per
            se stessa n volte.
          </p>
          <div className="mt-4 rounded-[18px] border-2 border-slate-900/70 bg-white px-4 py-3 font-bold shadow-[0_3px_0_#0f172a] [.dark_&]:bg-slate-900">
            aⁿ = a · a · ... · a
          </div>
        </article>

        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Esponente negativo</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Se l&apos;esponente è negativo, si usa il reciproco della base. Per
            esempio, a⁻ⁿ diventa 1/aⁿ, con a diverso da zero.
          </p>
          <div className="mt-4 rounded-[18px] border-2 border-slate-900/70 bg-white px-4 py-3 font-bold shadow-[0_3px_0_#0f172a] [.dark_&]:bg-slate-900">
            a⁻ⁿ = 1 / aⁿ
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
