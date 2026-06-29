import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import CalcolatriceFrazioniClient from "./CalcolatriceFrazioniClient";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/calcolatori/calcolatrice-frazioni`;

export const metadata: Metadata = {
  title: "Calcolatrice frazioni online con passaggi",
  description:
    "Calcolatrice frazioni online per sommare, sottrarre, moltiplicare e dividere frazioni con risultato semplificato e passaggi spiegati.",
  alternates: { canonical: "/calcolatori/calcolatrice-frazioni" },
  robots: {
    index: true,
    follow: true,
    googleBot:
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  },
  openGraph: {
    title: "Calcolatrice frazioni online con passaggi",
    description:
      "Somma, sottrai, moltiplica e dividi frazioni con risultato semplificato.",
    url: CANONICAL,
    siteName: "Theoremz",
    type: "website",
    images: [{ url: "/metadata.png" }],
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: "Calcolatrice frazioni online con passaggi",
    description:
      "Calcola operazioni tra frazioni con procedimento spiegato.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
  keywords: [
    "calcolatrice frazioni",
    "calcolatrice frazioni online",
    "calcolo frazioni",
    "somma frazioni",
    "sottrazione frazioni",
    "moltiplicazione frazioni",
    "divisione frazioni",
    "frazioni con passaggi",
  ],
};

const faq = [
  {
    question: "Come si sommano due frazioni?",
    answer:
      "Per sommare due frazioni si portano allo stesso denominatore, poi si sommano i numeratori e si semplifica il risultato.",
  },
  {
    question: "Come si moltiplicano due frazioni?",
    answer:
      "Per moltiplicare due frazioni si moltiplicano tra loro i numeratori e tra loro i denominatori, poi si semplifica.",
  },
  {
    question: "Come si dividono due frazioni?",
    answer:
      "Per dividere due frazioni si moltiplica la prima frazione per il reciproco della seconda.",
  },
  {
    question: "Il risultato viene semplificato?",
    answer:
      "Sì. Il calcolatore mostra sempre la frazione finale ridotta ai minimi termini, quando possibile.",
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

export default function CalcolatriceFrazioniPage() {
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
        name: "Calcolatrice frazioni",
        item: CANONICAL,
      },
    ],
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Calcolatrice frazioni online",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: CANONICAL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    featureList: [
      "Somma di frazioni",
      "Sottrazione di frazioni",
      "Moltiplicazione di frazioni",
      "Divisione di frazioni",
      "Semplificazione del risultato",
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
            Calcolatrice frazioni
          </h1>
          <p className="mt-4 hidden max-w-2xl text-[15.5px] font-medium leading-relaxed sm:block">
            Somma, sottrai, moltiplica e dividi frazioni. Il risultato viene
            semplificato automaticamente e mostrato con i passaggi essenziali.
          </p>
        </div>

        <div className="mt-8">
          <CalcolatriceFrazioniClient />
        </div>
      </section>

      <section className="mx-6 mt-6 grid max-w-screen-xl gap-4 pb-12 lg:grid-cols-[1.05fr_0.95fr] xl:mx-auto">
        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Operazioni con frazioni</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Per sommare e sottrarre frazioni serve un denominatore comune. Per
            moltiplicare si moltiplicano numeratori e denominatori. Per dividere
            si usa il reciproco della seconda frazione.
          </p>
        </article>

        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Risultato semplificato</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Dopo il calcolo, la frazione viene ridotta ai minimi termini
            dividendo numeratore e denominatore per il loro massimo comune
            divisore.
          </p>
          <div className="mt-4 rounded-[18px] border-2 border-slate-900/70 bg-white px-4 py-3 font-bold shadow-[0_3px_0_#0f172a] [.dark_&]:bg-slate-900">
            semplifica usando il MCD
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
