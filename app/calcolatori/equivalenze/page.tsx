import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import EquivalenzeClient from "./EquivalenzeClient";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/calcolatori/equivalenze`;

export const metadata: Metadata = {
  title: "Equivalenze online con passaggi",
  description:
    "Calcola equivalenze online tra unità di misura: lunghezza, massa, capacità, area, volume e tempo, con risultato e passaggi spiegati.",
  alternates: { canonical: "/calcolatori/equivalenze" },
  robots: {
    index: true,
    follow: true,
    googleBot:
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  },
  openGraph: {
    title: "Equivalenze online con passaggi",
    description:
      "Convertitore di unità di misura per equivalenze scolastiche con procedimento spiegato.",
    url: CANONICAL,
    siteName: "Theoremz",
    type: "website",
    images: [{ url: "/metadata.png" }],
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: "Equivalenze online con passaggi",
    description:
      "Calcola equivalenze tra unità di misura con risultato e passaggi.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
  keywords: [
    "equivalenze",
    "equivalenze online",
    "calcolo equivalenze",
    "convertitore unità di misura",
    "equivalenze con passaggi",
    "equivalenze metri",
    "equivalenze grammi",
    "equivalenze litri",
  ],
};

const faq = [
  {
    question: "Come si fanno le equivalenze?",
    answer:
      "Per fare un'equivalenza si trasforma il valore dalla sua unità di partenza all'unità di arrivo, moltiplicando o dividendo per il fattore di conversione corretto.",
  },
  {
    question: "Quando si moltiplica e quando si divide?",
    answer:
      "Se passi a un'unità più piccola il numero aumenta, quindi di solito moltiplichi. Se passi a un'unità più grande il numero diminuisce, quindi dividi.",
  },
  {
    question: "Le equivalenze con aree e volumi funzionano allo stesso modo?",
    answer:
      "No. Nelle aree ogni salto vale 100, mentre nei volumi ogni salto vale 1000. Per lunghezze, masse e capacità ogni salto metrico vale 10.",
  },
  {
    question: "Quali unità posso convertire?",
    answer:
      "Il calcolatore gestisce lunghezza, massa, capacità, area, volume e tempo, cioè le equivalenze più comuni a scuola.",
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

export default function EquivalenzePage() {
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
        name: "Equivalenze",
        item: CANONICAL,
      },
    ],
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Equivalenze online",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: CANONICAL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    featureList: [
      "Equivalenze di lunghezza",
      "Equivalenze di massa",
      "Equivalenze di capacità",
      "Equivalenze di area",
      "Equivalenze di volume",
      "Equivalenze di tempo",
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
            Equivalenze online
          </h1>
          <p className="mt-4 hidden max-w-2xl text-[15.5px] font-medium leading-relaxed sm:block">
            Converti unità di misura per lunghezza, massa, capacità, area,
            volume e tempo. Il risultato mostra il fattore di conversione e i
            passaggi essenziali.
          </p>
        </div>

        <div className="mt-8">
          <EquivalenzeClient />
        </div>
      </section>

      <section className="mx-6 mt-6 grid max-w-screen-xl gap-4 pb-12 lg:grid-cols-[1.05fr_0.95fr] xl:mx-auto">
        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Come funzionano le equivalenze</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Un&apos;equivalenza cambia l&apos;unità di misura senza cambiare la grandezza
            reale. Per esempio 1 metro e 100 centimetri indicano la stessa
            lunghezza, scritta con unità diverse.
          </p>
        </article>

        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Attenzione ad aree e volumi</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Nelle lunghezze ogni salto metrico vale 10. Nelle aree ogni salto
            vale 100, perché le unità sono al quadrato. Nei volumi ogni salto
            vale 1000, perché le unità sono al cubo.
          </p>
          <div className="mt-4 rounded-[18px] border-2 border-slate-900/70 bg-white px-4 py-3 font-bold shadow-[0_3px_0_#0f172a] [.dark_&]:bg-slate-900">
            lunghezze: ×10 · aree: ×100 · volumi: ×1000
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
