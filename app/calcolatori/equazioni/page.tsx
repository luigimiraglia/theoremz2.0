import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import EquazioniClient from "./EquazioniClient";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/calcolatori/equazioni`;

export const metadata: Metadata = {
  title: "Equazioni online con passaggi",
  description:
    "Risolvi equazioni online di primo e secondo grado con x, parentesi, frazioni numeriche, discriminante e passaggi spiegati.",
  alternates: { canonical: "/calcolatori/equazioni" },
  robots: {
    index: true,
    follow: true,
    googleBot:
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  },
  openGraph: {
    title: "Equazioni online con passaggi",
    description:
      "Calcolatore di equazioni di primo e secondo grado con procedimento spiegato.",
    url: CANONICAL,
    siteName: "Theoremz",
    type: "website",
    images: [{ url: "/metadata.png" }],
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: "Equazioni online con passaggi",
    description:
      "Risolvi equazioni di primo e secondo grado online con passaggi.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
  keywords: [
    "equazioni online",
    "risolutore equazioni",
    "calcolatore equazioni",
    "equazioni primo grado online",
    "equazioni secondo grado online",
    "equazioni con passaggi",
    "formula discriminante",
  ],
};

const faq = [
  {
    question: "Che equazioni posso risolvere?",
    answer:
      "Puoi risolvere equazioni numeriche di primo e secondo grado nella variabile x, anche con parentesi, frazioni numeriche e potenze x^2.",
  },
  {
    question: "Come si scrive x al quadrato?",
    answer:
      "Puoi scrivere x^2. Per esempio x^2 - 5x + 6 = 0.",
  },
  {
    question: "Il calcolatore mostra i passaggi?",
    answer:
      "Sì. Mostra la forma normale dell'equazione, il procedimento e, per le equazioni di secondo grado, il discriminante.",
  },
  {
    question: "Risolve equazioni di grado superiore?",
    answer:
      "No. Questo strumento è pensato per equazioni scolastiche di primo e secondo grado.",
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

export default function EquazioniPage() {
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
        name: "Equazioni",
        item: CANONICAL,
      },
    ],
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Equazioni online",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: CANONICAL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    featureList: [
      "Equazioni di primo grado",
      "Equazioni di secondo grado",
      "Parentesi",
      "Frazioni numeriche",
      "Discriminante",
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
            Equazioni online
          </h1>
          <p className="mt-4 hidden max-w-2xl text-[15.5px] font-medium leading-relaxed sm:block">
            Risolvi equazioni di primo e secondo grado. Scrivi l&apos;equazione con
            la lettera x e guarda forma normale, soluzioni e passaggi.
          </p>
        </div>

        <div className="mt-8">
          <EquazioniClient />
        </div>
      </section>

      <section className="mx-6 mt-6 grid max-w-screen-xl gap-4 pb-12 lg:grid-cols-[1.05fr_0.95fr] xl:mx-auto">
        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Come scrivere l&apos;equazione</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Usa la lettera x e un solo segno uguale. Puoi scrivere prodotti
            impliciti come 2x o 3(x + 1), frazioni numeriche come 1/2 e potenze
            come x^2.
          </p>
        </article>

        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Secondo grado</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Per le equazioni di secondo grado il calcolatore porta tutto nella
            forma ax² + bx + c = 0 e usa il discriminante.
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
