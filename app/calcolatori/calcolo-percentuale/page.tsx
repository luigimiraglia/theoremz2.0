import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import CalcoloPercentualeClient from "./CalcoloPercentualeClient";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/calcolatori/calcolo-percentuale`;

export const metadata: Metadata = {
  title: "Calcolo percentuale online con passaggi",
  description:
    "Calcolatrice percentuale online per calcolare percentuali, sconti, aumenti e variazioni percentuali con formula e passaggi spiegati.",
  alternates: { canonical: "/calcolatori/calcolo-percentuale" },
  robots: {
    index: true,
    follow: true,
    googleBot:
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  },
  openGraph: {
    title: "Calcolo percentuale online con passaggi",
    description:
      "Calcola percentuali, sconti, aumenti e variazioni percentuali con procedimento spiegato.",
    url: CANONICAL,
    siteName: "Theoremz",
    type: "website",
    images: [{ url: "/metadata.png" }],
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: "Calcolo percentuale online con passaggi",
    description:
      "Calcolatrice percentuale online con formule e passaggi spiegati.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
  keywords: [
    "calcolo percentuale",
    "calcolatrice percentuale",
    "calcolo percentuale online",
    "calcolare percentuale",
    "calcolo sconto percentuale",
    "variazione percentuale",
    "aumento percentuale",
  ],
};

const faq = [
  {
    question: "Come si calcola la percentuale di un numero?",
    answer:
      "Per calcolare la percentuale di un numero si divide la percentuale per 100 e poi si moltiplica il risultato per il numero di partenza.",
  },
  {
    question: "Come faccio a sapere che percentuale rappresenta un numero?",
    answer:
      "Dividi la parte per il totale e moltiplica per 100. La formula è parte diviso totale per 100.",
  },
  {
    question: "Come si calcola uno sconto percentuale?",
    answer:
      "Prima calcoli la percentuale del prezzo iniziale, poi sottrai quel valore dal prezzo di partenza.",
  },
  {
    question: "Come si calcola la variazione percentuale?",
    answer:
      "Sottrai il valore iniziale dal valore finale, dividi per il valore iniziale e moltiplica per 100.",
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

export default function CalcoloPercentualePage() {
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
        name: "Calcolo percentuale",
        item: CANONICAL,
      },
    ],
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Calcolo percentuale online",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: CANONICAL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    featureList: [
      "Calcolo della percentuale di un numero",
      "Calcolo della percentuale inversa",
      "Calcolo dello sconto percentuale",
      "Calcolo dell'aumento percentuale",
      "Calcolo della variazione percentuale",
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
            Calcolo percentuale online
          </h1>
          <p className="mt-4 hidden max-w-2xl text-[15.5px] font-medium leading-relaxed sm:block">
            Calcola percentuali, sconti, aumenti e variazioni percentuali. Il
            risultato viene mostrato insieme alla formula e ai passaggi
            essenziali.
          </p>
        </div>

        <div className="mt-8">
          <CalcoloPercentualeClient />
        </div>
      </section>

      <section className="mx-6 mt-6 grid max-w-screen-xl gap-4 pb-12 lg:grid-cols-[1.1fr_0.9fr] xl:mx-auto">
        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Come si calcola una percentuale</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Per trovare una percentuale di un numero devi trasformare la
            percentuale in frazione con denominatore 100 e moltiplicare per il
            valore di partenza. Per esempio, il 20% di 150 si calcola facendo
            20 / 100 × 150 = 30.
          </p>
          <div className="mt-4 rounded-[18px] border-2 border-slate-900/70 bg-white px-4 py-3 font-bold shadow-[0_3px_0_#0f172a] [.dark_&]:bg-slate-900">
            p% di N = p / 100 × N
          </div>
        </article>

        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Cosa puoi calcolare</h2>
          <ul className="mt-3 space-y-2 text-sm font-medium leading-6 opacity-85">
            <li>Una percentuale di un numero, ad esempio il 15% di 80.</li>
            <li>Che percentuale rappresenta una parte rispetto al totale.</li>
            <li>Il prezzo finale dopo uno sconto o un aumento.</li>
            <li>La variazione percentuale tra due valori.</li>
          </ul>
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
