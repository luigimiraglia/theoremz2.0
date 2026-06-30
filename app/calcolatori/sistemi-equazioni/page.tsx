import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import SistemiEquazioniClient from "./SistemiEquazioniClient";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/calcolatori/sistemi-equazioni`;

export const metadata: Metadata = {
  title: "Sistemi di equazioni online con passaggi",
  description:
    "Risolvi sistemi di equazioni 2x2 online con il metodo di Cramer, determinanti, soluzioni e passaggi spiegati.",
  alternates: { canonical: "/calcolatori/sistemi-equazioni" },
  robots: {
    index: true,
    follow: true,
    googleBot:
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  },
  openGraph: {
    title: "Sistemi di equazioni online con passaggi",
    description:
      "Calcolatore per sistemi lineari 2x2 con metodo di Cramer e passaggi.",
    url: CANONICAL,
    siteName: "Theoremz",
    type: "website",
    images: [{ url: "/metadata.png", width: 1200, height: 630, alt: "Sistemi di equazioni online con passaggi — Theoremz" }],
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sistemi di equazioni online con passaggi",
    description:
      "Risolvi sistemi lineari 2x2 online con procedimento spiegato.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
  keywords: [
    "sistemi di equazioni online",
    "risolutore sistemi",
    "sistemi lineari 2x2",
    "metodo di Cramer",
    "sistemi con passaggi",
    "calcolatore sistemi equazioni",
  ],
};

const faq = [
  {
    question: "Che sistemi posso risolvere?",
    answer:
      "Puoi risolvere sistemi lineari 2x2 nella forma ax + by = c e dx + ey = f.",
  },
  {
    question: "Che metodo usa il calcolatore?",
    answer:
      "Il calcolatore usa il metodo di Cramer, calcolando il determinante D e i determinanti Dx e Dy.",
  },
  {
    question: "Cosa succede se il determinante è zero?",
    answer:
      "Se D è zero il sistema può avere infinite soluzioni oppure nessuna soluzione, a seconda dei valori di Dx e Dy.",
  },
  {
    question: "Il risultato viene dato come frazione?",
    answer:
      "Sì. Quando serve, le soluzioni vengono mostrate come frazioni semplificate e anche come valori decimali.",
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

export default function SistemiEquazioniPage() {
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
        name: "Sistemi di equazioni",
        item: CANONICAL,
      },
    ],
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Sistemi di equazioni online",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: CANONICAL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    featureList: [
      "Sistemi lineari 2x2",
      "Metodo di Cramer",
      "Determinante D",
      "Determinanti Dx e Dy",
      "Soluzioni frazionarie",
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
            Sistemi di equazioni online
          </h1>
          <p className="mt-4 hidden max-w-2xl text-[15.5px] font-medium leading-relaxed sm:block">
            Risolvi sistemi lineari 2x2 con il metodo di Cramer. Inserisci i
            coefficienti e guarda determinanti, soluzioni e passaggi.
          </p>
        </div>

        <div className="mt-8">
          <SistemiEquazioniClient />
        </div>
      </section>

      <section className="mx-6 mt-6 grid max-w-screen-xl gap-4 pb-12 lg:grid-cols-[1.05fr_0.95fr] xl:mx-auto">
        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Forma del sistema</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Il calcolatore usa sistemi nella forma ax + by = c e dx + ey = f.
            Devi inserire solo i sei coefficienti numerici.
          </p>
        </article>

        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Metodo di Cramer</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Se il determinante D è diverso da zero, il sistema ha una sola
            soluzione e si calcola con x = Dx / D e y = Dy / D.
          </p>
          <div className="mt-4 rounded-[18px] border-2 border-slate-900/70 bg-white px-4 py-3 font-bold shadow-[0_3px_0_#0f172a] [.dark_&]:bg-slate-900">
            x = Dx / D, y = Dy / D
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
