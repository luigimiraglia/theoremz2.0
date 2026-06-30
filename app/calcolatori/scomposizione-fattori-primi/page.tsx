import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import ScomposizioneFattoriPrimiClient from "./ScomposizioneFattoriPrimiClient";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/calcolatori/scomposizione-fattori-primi`;

export const metadata: Metadata = {
  title: "Scomposizione in fattori primi online",
  description:
    "Scomponi un numero in fattori primi online con divisioni successive, forma con potenze e passaggi spiegati.",
  alternates: { canonical: "/calcolatori/scomposizione-fattori-primi" },
  robots: {
    index: true,
    follow: true,
    googleBot:
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  },
  openGraph: {
    title: "Scomposizione in fattori primi online",
    description:
      "Calcolatore per scomporre numeri in fattori primi con passaggi e potenze.",
    url: CANONICAL,
    siteName: "Theoremz",
    type: "website",
    images: [{ url: "/metadata.png", width: 1200, height: 630, alt: "Scomposizione in fattori primi online — Theoremz" }],
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: "Scomposizione in fattori primi online",
    description:
      "Scomponi un numero in fattori primi con procedimento spiegato.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
  keywords: [
    "scomposizione in fattori primi",
    "scomposizione fattori primi online",
    "fattori primi online",
    "scomporre in fattori primi",
    "calcolatore fattori primi",
    "numero primo",
    "divisioni successive",
  ],
};

const faq = [
  {
    question: "Che cos'è la scomposizione in fattori primi?",
    answer:
      "È la scrittura di un numero come prodotto di numeri primi. Per esempio 60 si scrive come 2 alla seconda per 3 per 5.",
  },
  {
    question: "Come si scompone un numero in fattori primi?",
    answer:
      "Si divide il numero per i primi più piccoli possibili, come 2, 3, 5, 7, e si continua finché il quoziente diventa 1.",
  },
  {
    question: "A cosa serve la scomposizione in fattori primi?",
    answer:
      "Serve per calcolare MCD, mcm, semplificare frazioni e riconoscere meglio la struttura di un numero.",
  },
  {
    question: "Se il numero è primo cosa succede?",
    answer:
      "Se il numero è primo non si scompone in fattori più piccoli: la sua scomposizione è il numero stesso.",
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

export default function ScomposizioneFattoriPrimiPage() {
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
        name: "Scomposizione in fattori primi",
        item: CANONICAL,
      },
    ],
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Scomposizione in fattori primi online",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: CANONICAL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    featureList: [
      "Scomposizione in fattori primi",
      "Divisioni successive",
      "Forma con potenze",
      "Controllo numero primo",
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
            Scomposizione in fattori primi
          </h1>
          <p className="mt-4 hidden max-w-2xl text-[15.5px] font-medium leading-relaxed sm:block">
            Scomponi un numero in fattori primi. Il risultato viene mostrato con
            divisioni successive, fattori raggruppati in potenze e controllo del
            caso in cui il numero sia primo.
          </p>
        </div>

        <div className="mt-8">
          <ScomposizioneFattoriPrimiClient />
        </div>
      </section>

      <section className="mx-6 mt-6 grid max-w-screen-xl gap-4 pb-12 lg:grid-cols-[1.05fr_0.95fr] xl:mx-auto">
        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Come funziona</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Per scomporre un numero in fattori primi si divide ogni volta per il
            più piccolo numero primo possibile. Si continua fino ad arrivare a
            1, poi si raccolgono i fattori uguali usando le potenze.
          </p>
        </article>

        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Esempio rapido</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Il numero 360 si divide per 2, poi ancora per 2, poi per 2, per 3,
            per 3 e per 5. Quindi:
          </p>
          <div className="mt-4 rounded-[18px] border-2 border-slate-900/70 bg-white px-4 py-3 font-bold shadow-[0_3px_0_#0f172a] [.dark_&]:bg-slate-900">
            360 = 2<sup>3</sup> × 3<sup>2</sup> × 5
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
