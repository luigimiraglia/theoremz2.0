import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import EquazioniSecondoGradoClient from "./EquazioniSecondoGradoClient";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/calcolatori/equazioni-secondo-grado`;

export const metadata: Metadata = {
  title: "Equazioni di secondo grado online con passaggi",
  description:
    "Risolvi equazioni di secondo grado online con formula risolutiva, delta, soluzioni reali e passaggi spiegati.",
  alternates: { canonical: "/calcolatori/equazioni-secondo-grado" },
  robots: {
    index: true,
    follow: true,
    googleBot:
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  },
  openGraph: {
    title: "Equazioni di secondo grado online con passaggi",
    description:
      "Calcolatore per equazioni di secondo grado con discriminante, formula risolutiva e passaggi.",
    url: CANONICAL,
    siteName: "Theoremz",
    type: "website",
    images: [{ url: "/metadata.png" }],
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: "Equazioni di secondo grado online con passaggi",
    description:
      "Trova delta e soluzioni di una equazione di secondo grado online.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
  keywords: [
    "equazioni secondo grado online",
    "equazioni di secondo grado",
    "formula risolutiva online",
    "calcolatore delta",
    "discriminante online",
    "equazioni complete secondo grado",
    "equazioni incomplete secondo grado",
    "soluzioni equazione secondo grado",
  ],
};

const faq = [
  {
    question: "Come si usa il calcolatore di equazioni di secondo grado?",
    answer:
      "Inserisci i coefficienti a, b e c della forma ax² + bx + c = 0. Il calcolatore trova il discriminante e le soluzioni reali.",
  },
  {
    question: "Che cosa succede se il delta è negativo?",
    answer:
      "Se il discriminante è negativo, l'equazione non ha soluzioni reali. In questo calcolatore vengono mostrate solo le soluzioni reali.",
  },
  {
    question: "Il calcolatore gestisce anche le equazioni incomplete?",
    answer:
      "Sì. Puoi mettere b = 0 oppure c = 0 per risolvere anche equazioni di secondo grado incomplete.",
  },
  {
    question: "Posso usare numeri decimali?",
    answer:
      "Sì. Puoi scrivere numeri interi o decimali, usando sia il punto sia la virgola.",
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

export default function EquazioniSecondoGradoPage() {
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
        name: "Equazioni di secondo grado",
        item: CANONICAL,
      },
    ],
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Equazioni di secondo grado online",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: CANONICAL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    featureList: [
      "Calcolo del delta",
      "Formula risolutiva",
      "Soluzioni reali",
      "Equazioni incomplete",
      "Passaggi spiegati",
      "Coefficienti decimali",
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
            Equazioni di secondo grado online
          </h1>
          <p className="mt-4 hidden max-w-2xl text-[15.5px] font-medium leading-relaxed sm:block">
            Inserisci i coefficienti della forma ax² + bx + c = 0. Il
            calcolatore mostra delta, formula risolutiva, soluzioni e passaggi
            del procedimento.
          </p>
        </div>

        <div className="mt-8">
          <EquazioniSecondoGradoClient />
        </div>
      </section>

      <section className="mx-6 mt-6 grid max-w-screen-xl gap-4 pb-12 lg:grid-cols-[1fr_1fr] xl:mx-auto">
        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Formula risolutiva</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Una equazione di secondo grado completa si scrive nella forma ax² +
            bx + c = 0, con a diverso da zero. Dopo aver calcolato il
            discriminante, le soluzioni reali si trovano con la formula
            risolutiva.
          </p>
          <div className="mt-4 overflow-x-auto rounded-[18px] border-2 border-slate-900/70 bg-white px-4 py-3 text-center font-bold shadow-[0_3px_0_#0f172a] [.dark_&]:bg-slate-900">
            x = (-b ± √Δ) / 2a
          </div>
        </article>

        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Delta e soluzioni</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Il discriminante indica quante soluzioni reali ha l&apos;equazione:
            due se Δ è positivo, una doppia se Δ è zero, nessuna soluzione reale
            se Δ è negativo.
          </p>
          <div className="mt-4 rounded-[18px] border-2 border-slate-900/70 bg-white px-4 py-3 font-bold shadow-[0_3px_0_#0f172a] [.dark_&]:bg-slate-900">
            Δ = b² - 4ac
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
