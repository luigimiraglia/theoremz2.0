import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import McmOnlineClient from "./McmOnlineClient";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/calcolatori/mcm-online`;

export const metadata: Metadata = {
  title: "mcm online con passaggi",
  description:
    "Calcola il mcm online di due o più numeri con fattori primi, formula con il MCD e passaggi spiegati.",
  alternates: { canonical: "/calcolatori/mcm-online" },
  robots: {
    index: true,
    follow: true,
    googleBot:
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  },
  openGraph: {
    title: "mcm online con passaggi",
    description:
      "Calcolatore del minimo comune multiplo con scomposizione in fattori primi e passaggi.",
    url: CANONICAL,
    siteName: "Theoremz",
    type: "website",
    images: [{ url: "/metadata.png" }],
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: "mcm online con passaggi",
    description:
      "Calcola il minimo comune multiplo online con procedimento spiegato.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
  keywords: [
    "mcm online",
    "calcolo mcm online",
    "minimo comune multiplo",
    "calcolatore mcm",
    "mcm con passaggi",
    "mcm fattori primi",
    "mcm e mcd",
  ],
};

const faq = [
  {
    question: "Che cos'è il mcm?",
    answer:
      "Il mcm, minimo comune multiplo, è il più piccolo multiplo positivo comune a tutti i numeri considerati.",
  },
  {
    question: "Come si calcola il mcm con i fattori primi?",
    answer:
      "Si scompongono i numeri in fattori primi e si moltiplicano tutti i fattori comuni e non comuni presi con l'esponente maggiore.",
  },
  {
    question: "Qual è la formula tra mcm e MCD?",
    answer:
      "Per due numeri a e b vale la formula mcm(a, b) = a per b diviso MCD(a, b).",
  },
  {
    question: "Si può calcolare il mcm di più di due numeri?",
    answer:
      "Sì. Si calcola prima il mcm dei primi due numeri, poi il mcm tra quel risultato e il numero successivo, fino alla fine.",
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

export default function McmOnlinePage() {
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
        name: "mcm online",
        item: CANONICAL,
      },
    ],
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "mcm online",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: CANONICAL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    featureList: [
      "Calcolo del minimo comune multiplo",
      "Supporto per due o più numeri",
      "Formula con il MCD",
      "Scomposizione in fattori primi",
      "Fattori comuni e non comuni con esponente maggiore",
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
            mcm online
          </h1>
          <p className="mt-4 hidden max-w-2xl text-[15.5px] font-medium leading-relaxed sm:block">
            Calcola il minimo comune multiplo di due o più numeri. Il risultato
            viene mostrato con formula tramite MCD, scomposizione in fattori
            primi e passaggi essenziali.
          </p>
        </div>

        <div className="mt-8">
          <McmOnlineClient />
        </div>
      </section>

      <section className="mx-6 mt-6 grid max-w-screen-xl gap-4 pb-12 lg:grid-cols-[1.05fr_0.95fr] xl:mx-auto">
        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Cos&apos;è il mcm</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Il mcm, minimo comune multiplo, è il più piccolo numero positivo che
            è multiplo di tutti i numeri dati. Serve quando bisogna trovare un
            multiplo comune, per esempio nelle frazioni con denominatori diversi.
          </p>
        </article>

        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Formula con fattori primi</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Dopo aver scomposto i numeri in fattori primi, il mcm si ottiene
            moltiplicando tutti i fattori comuni e non comuni, ciascuno con
            l&apos;esponente maggiore.
          </p>
          <div className="mt-4 rounded-[18px] border-2 border-slate-900/70 bg-white px-4 py-3 font-bold shadow-[0_3px_0_#0f172a] [.dark_&]:bg-slate-900">
            mcm = prodotto dei fattori comuni e non comuni con esponente maggiore
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
