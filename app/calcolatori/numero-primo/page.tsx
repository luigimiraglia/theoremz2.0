import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import NumeroPrimoClient from "./NumeroPrimoClient";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/calcolatori/numero-primo`;

export const metadata: Metadata = {
  title: "Numero primo online: verifica con passaggi",
  description:
    "Controlla se un numero è primo online con divisori testati, criterio della radice quadrata e primi precedente e successivo.",
  alternates: { canonical: "/calcolatori/numero-primo" },
  robots: {
    index: true,
    follow: true,
    googleBot:
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  },
  openGraph: {
    title: "Numero primo online: verifica con passaggi",
    description:
      "Verifica se un numero è primo e guarda quali divisori sono stati controllati.",
    url: CANONICAL,
    siteName: "Theoremz",
    type: "website",
    images: [{ url: "/metadata.png", width: 1200, height: 630, alt: "Numero primo online: verifica con passaggi — Theoremz" }],
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: "Numero primo online: verifica con passaggi",
    description:
      "Controlla se un numero è primo con divisori testati e spiegazione.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
  keywords: [
    "numero primo",
    "numero primo online",
    "verifica numero primo",
    "controllo numero primo",
    "numeri primi",
    "come capire se un numero è primo",
    "calcolatore numero primo",
  ],
};

const faq = [
  {
    question: "Che cos'è un numero primo?",
    answer:
      "Un numero primo è un numero intero maggiore di 1 che ha esattamente due divisori positivi: 1 e se stesso.",
  },
  {
    question: "Come si capisce se un numero è primo?",
    answer:
      "Si controlla se il numero è divisibile per qualche intero maggiore di 1 fino alla sua radice quadrata. Se non si trova nessun divisore, il numero è primo.",
  },
  {
    question: "Perché basta controllare fino alla radice quadrata?",
    answer:
      "Perché se un numero ha un divisore più grande della radice quadrata, allora deve avere anche un divisore più piccolo della radice quadrata.",
  },
  {
    question: "1 è un numero primo?",
    answer:
      "No. Il numero 1 non è primo perché ha un solo divisore positivo, cioè se stesso.",
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

export default function NumeroPrimoPage() {
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
        name: "Numero primo",
        item: CANONICAL,
      },
    ],
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Numero primo online",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: CANONICAL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    featureList: [
      "Verifica se un numero è primo",
      "Divisori controllati",
      "Criterio della radice quadrata",
      "Primo precedente",
      "Primo successivo",
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
            Numero primo online
          </h1>
          <p className="mt-4 hidden max-w-2xl text-[15.5px] font-medium leading-relaxed sm:block">
            Controlla se un numero è primo. Il risultato mostra i divisori
            controllati, il criterio della radice quadrata e i numeri primi
            vicino a quello inserito.
          </p>
        </div>

        <div className="mt-8">
          <NumeroPrimoClient />
        </div>
      </section>

      <section className="mx-6 mt-6 grid max-w-screen-xl gap-4 pb-12 lg:grid-cols-[1.05fr_0.95fr] xl:mx-auto">
        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Definizione</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Un numero primo è un numero intero maggiore di 1 divisibile soltanto
            per 1 e per se stesso. Per esempio 2, 3, 5, 7 e 11 sono numeri
            primi.
          </p>
        </article>

        <article className="rounded-[24px] bg-gray-100/60 px-4 py-5 [.dark_&]:bg-slate-800 sm:px-6">
          <h2 className="text-2xl font-bold">Regola pratica</h2>
          <p className="mt-3 text-sm font-medium leading-7 opacity-85">
            Per controllare un numero non serve provare tutti i divisori: basta
            arrivare alla radice quadrata. Se nessun divisore funziona entro quel
            limite, il numero è primo.
          </p>
          <div className="mt-4 rounded-[18px] border-2 border-slate-900/70 bg-white px-4 py-3 font-bold shadow-[0_3px_0_#0f172a] [.dark_&]:bg-slate-900">
            Controlla i divisori fino a √n
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
