import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import ProporzioniOnlineClient from "./ProporzioniOnlineClient";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/calcolatori/proporzioni-online`;

export const metadata: Metadata = {
  title: "Proporzioni online con x e passaggi",
  description:
    "Risolvi proporzioni online con termine incognito x, prodotto dei medi e degli estremi, verifica e passaggi spiegati.",
  alternates: { canonical: "/calcolatori/proporzioni-online" },
  robots: {
    index: true,
    follow: true,
    googleBot:
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  },
  openGraph: {
    title: "Proporzioni online con x e passaggi",
    description:
      "Calcolatore di proporzioni con termine incognito, verifica e procedimento.",
    url: CANONICAL,
    siteName: "Theoremz",
    type: "website",
    images: [{ url: "/metadata.png", width: 1200, height: 630, alt: "Proporzioni online con x e passaggi — Theoremz" }],
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: "Proporzioni online con x e passaggi",
    description:
      "Trova il termine incognito di una proporzione con passaggi spiegati.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
  keywords: [
    "proporzioni online",
    "calcolatore proporzioni",
    "risolvi proporzioni",
    "proporzioni con x",
    "termine incognito proporzioni",
    "prodotto medi estremi",
    "proporzioni con passaggi",
  ],
};

const faq = [
  {
    question: "Come si risolve una proporzione con x?",
    answer:
      "Si usa la proprietà fondamentale delle proporzioni: il prodotto degli estremi è uguale al prodotto dei medi. Poi si divide per isolare x.",
  },
  {
    question: "Dove posso mettere la x?",
    answer:
      "Puoi scrivere x in uno qualsiasi dei quattro termini della proporzione. Il calcolatore riconosce automaticamente il termine incognito.",
  },
  {
    question: "Il calcolatore verifica anche proporzioni senza x?",
    answer:
      "Sì. Se non inserisci x, lo strumento confronta il prodotto degli estremi con il prodotto dei medi e dice se la proporzione è corretta.",
  },
  {
    question: "Posso usare numeri decimali?",
    answer:
      "Sì. Puoi usare numeri interi o decimali, sia con la virgola sia con il punto.",
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

export default function ProporzioniOnlinePage() {
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
        name: "Proporzioni online",
        item: CANONICAL,
      },
    ],
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Proporzioni online",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: CANONICAL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    featureList: [
      "Termine incognito in qualsiasi posizione",
      "Prodotto dei medi e degli estremi",
      "Verifica delle proporzioni",
      "Numeri decimali",
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
            Proporzioni online
          </h1>
          <p className="mt-4 hidden max-w-2xl text-[15.5px] font-medium leading-relaxed sm:block">
            Scrivi una proporzione nella forma a : b = c : d e inserisci x nel
            termine da trovare. Il calcolatore mostra risultato, verifica e
            passaggi.
          </p>
        </div>

        <div className="mt-8">
          <ProporzioniOnlineClient />
        </div>
      </section>

      <section className="mx-6 mt-6 grid max-w-screen-xl gap-4 pb-12 lg:grid-cols-[1.05fr_0.95fr] xl:mx-auto">
        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Proprietà fondamentale</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            In una proporzione il prodotto degli estremi è uguale al prodotto
            dei medi. Per questo, in a : b = c : d vale sempre a · d = b · c.
          </p>
          <div className="mt-4 rounded-[18px] border-2 border-slate-900/70 bg-white px-4 py-3 font-bold shadow-[0_3px_0_#0f172a] [.dark_&]:bg-slate-900">
            a : b = c : d → a · d = b · c
          </div>
        </article>

        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Termine incognito</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Se manca un termine, si moltiplicano i due termini collegati dalla
            proprietà fondamentale e si divide per il termine rimanente. Lo
            strumento mostra anche la verifica finale.
          </p>
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
