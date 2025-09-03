// app/(landing)/black/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import SenjaEmbed from "@/components/SenjaEmbed";

// ---------- METADATA SEO ----------
const TITLE =
  "Theoremz Black — Assistenza via chat, esercizi illimitati e videolezioni";
const DESC =
  "Sblocca tutto Theoremz: assistenza via chat, esercizi risolti, formulari, appunti e videolezioni. Piani da 3,90€/mese. Soddisfatti o rimborsati.";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/black`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/black" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1, // -1 = nessun limite
      "max-image-preview": "large", // anteprime grandi
      "max-video-preview": -1, // nessun limite
    },
  },
  keywords: [
    "ripetizioni",
    "esercizi risolti",
    "videolezioni",
    "matematica",
    "fisica",
    "aiuto compiti",
    "formulario",
    "quiz",
    "studio",
  ],
  openGraph: {
    title: TITLE,
    description: DESC,
    url: CANONICAL,
    siteName: "Theoremz",
    images: [{ url: "/metadata.png" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
    site: "@theoremz_",
    images: ["/metadata.png"],
  },
};

// ---------- PAGINA ----------
export default function BlackPage() {
  // JSON-LD: Breadcrumb, Prodotto (con 3 offerte), FAQ
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Theoremz Black",
    brand: { "@type": "Brand", name: "Theoremz" },
    description: DESC,
    image: [`${SITE}/metadata.png`],
    offers: {
      "@type": "AggregateOffer",
      offerCount: 3,
      lowPrice: "3.90",
      highPrice: "64.90",
      priceCurrency: "EUR",
      offers: [
        {
          "@type": "Offer",
          name: "Piano Essential",
          price: "3.90",
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          url: "https://buy.stripe.com/7sIaIa5f5b21dOgcNo",
        },
        {
          "@type": "Offer",
          name: "Piano Base",
          price: "6.90",
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          url: "https://buy.stripe.com/cN29E66j97PPbG84gT",
        },
        {
          "@type": "Offer",
          name: "Annuale",
          price: "64.90",
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          url: "https://buy.stripe.com/6oE3fIfTJ6LL11u9Be",
        },
      ],
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Theoremz Black",
        item: CANONICAL,
      },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: {
        "@type": "Answer",
        text: a,
      },
    })),
  };

  return (
    <main className="bg-black text-white">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      {/* ============ HERO (2 colonne da md+) ============ */}
      <section className="mx-auto max-w-6xl px-5 pt-12 pb-8 sm:px-8 lg:px-12">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          {/* Testo */}
          <div>
            <h1 className="font-black leading-tight text-[36px] sm:text-[42px] lg:text-[52px]">
              Theoremz
              <span className="ml-1 align-[-0.18em] italic font-extrabold text-[30px] sm:text-[34px] lg:text-[40px]">
                Black
              </span>
              , sblocca tutte le{" "}
              <span className="bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent font-semibold">
                risorse
              </span>{" "}
              per il tuo successo!
            </h1>

            <p className="mt-5 max-w-2xl text-[16px] sm:text-[17px] lg:text-[18px] leading-relaxed text-white/85">
              Il primo servizio per lo studio che ti mette a disposizione{" "}
              <span className="font-semibold">
                tutto quello di cui hai bisogno
              </span>{" "}
              per eccellere.
            </p>

            <div className="mt-8 flex items-center gap-4">
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-6 py-3 text-[16px] font-extrabold text-black transition hover:bg-sky-400"
              >
                Scopri le offerte
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </a>
              <span className="-scale-x-100 text-white/90 text-3xl select-none md:hidden">
                ↩︎
              </span>
            </div>
          </div>

          {/* Illustrazione (solo da md+) */}
          <div className="hidden md:block">
            <HeroIllo />
          </div>
        </div>
      </section>

      {/* ============ INTRO ============ */}
      <section className="mx-auto max-w-6xl px-5 pb-8 sm:px-8 lg:px-12">
        <h2 className="text-[26px] sm:text-[28px] lg:text-[32px] font-extrabold">
          Di cosa si tratta?
        </h2>
        <p className="mt-3 max-w-3xl text-[16px] sm:text-[17px] lg:text-[18px] leading-relaxed text-white/85">
          <span className="text-sky-400 underline-offset-2 hover:underline">
            Theoremz Black
          </span>{" "}
          ti fornisce un&apos;esperienza di apprendimento unica, con un team di{" "}
          <u>insegnanti</u> pronti ad assisterti ogni giorno via chat. Avrai
          accesso completo a tutte le risorse di Theoremz: esercizi, quiz,
          appunti e videolezioni per ogni lezione, oltre a tutto quello che ti
          serve per studiare come si deve.
        </p>
      </section>

      {/* ============ COSA INCLUDE (grid 2 colonne da lg) ============ */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-12">
        <h2 className="text-[26px] sm:text-[28px] lg:text-[32px] font-extrabold">
          Cosa include?
        </h2>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <IncludeCard
            title="Assistenza Costante via Chat"
            items={[
              [
                "Supporto Giornaliero",
                "Lo studente ha sempre a disposizione un insegnante a cui porre domande o chiedere materiale aggiuntivo.",
              ],
              [
                "Aiuto compiti",
                "In caso di difficoltà con gli esercizi, lo studente viene seguito passo passo nella risoluzione.",
              ],
            ]}
          />

          <IncludeCard
            title="Tutti gli Esercizi che vuoi"
            items={[
              [
                "Catalogo Illimitato di Esercizi",
                "Accesso a centinaia di esercizi già presenti; è possibile richiederne ulteriori se non bastassero.",
              ],
              [
                "Già Risolti e Spiegati",
                "Spiegazioni passo passo, con immagini; possibilità di rispiegazione privata su richiesta.",
              ],
            ]}
          />

          <IncludeCard
            title="Appunti, Formulari e Lezioni"
            items={[
              [
                "Tutti gli argomenti coperti",
                "Formulario e videolezione per ogni argomento + molti appunti in PDF.",
              ],
              [
                "Mai senza materiale",
                "Si può richiedere materiale aggiuntivo in ogni momento.",
              ],
            ]}
          />

          {/* Bonus & claim affiancati su desktop */}
          <div className="flex flex-col gap-6 lg:col-span-2 lg:flex-row">
            <div className="flex-1">
              <IncludeCard
                title="Bonus e Premi per gli Iscritti"
                items={[
                  [
                    "Sempre al primo posto",
                    "Accesso prioritario alle nuove funzionalità e alle offerte esclusive.",
                  ],
                  [
                    "La tua opinione conta",
                    "Puoi richiedere funzionalità o argomenti non ancora presenti sul sito.",
                  ],
                ]}
              />
            </div>
            <div className="flex-1">
              <div className="h-full rounded-2xl bg-gradient-to-br from-blue-700 to-cyan-400 px-6 py-8 text-center text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">
                +100% Soddisfatti o Rimborsati
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PRICING (3 card da lg) ============ */}
      <section
        id="pricing"
        className="mx-auto mt-10 max-w-6xl px-5 pb-4 sm:px-8 lg:px-12"
      >
        <div className="mx-auto grid max-w-2xl gap-8 lg:max-w-none lg:grid-cols-3">
          {/* Colonna 1 – Essential */}
          <div>
            <div className="rounded-xl bg-gradient-to-r from-green-500 to-cyan-400 py-2 text-center font-bold text-white">
              Il più economico 👇
            </div>
            <div className="mt-2 rounded-xl bg-white py-2 text-center font-bold text-slate-900">
              Piano Essential
            </div>

            <PriceCard
              price="3,90€"
              unit=" /mese"
              infoHref="https://wa.link/mkxv41"
              buyHref="https://buy.stripe.com/7sIaIa5f5b21dOgcNo"
              features={[
                ["ok", "Studia sempre senza pubblicità"],
                ["ok", "Centinaia di esercizi risolti"],
                ["ok", "Videolezione per ogni argomento"],
                ["ok", "Formulari, quiz e appunti"],
                ["ok", "Sconto del 10% sulle ripetizioni"],
                ["ok", "Dark Mode per lo studio"],
                ["ok", "Salva le lezioni nei preferiti"],
                ["ok", "App Theoremz dedicata"],
                ["ok", "Tutte le funzionalità Theoremz"],
                ["ok", "100% soddisfatti o rimborsati"],
                ["no", "Assistenza via chat illimitata"],
                ["no", "Aiuto compiti giornaliero"],
              ]}
            />
          </div>

          {/* Colonna 2 – Base mensile */}
          <div>
            <div className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 py-2 text-center font-bold text-white">
              Il più venduto 👇
            </div>
            <div className="mt-2 rounded-xl bg-white py-2 text-center font-bold text-slate-900">
              Piano Base
            </div>

            <PriceCard
              price="6,90€"
              unit=" /mese"
              infoHref="https://wa.link/4ogl5q"
              buyHref="https://buy.stripe.com/cN29E66j97PPbG84gT"
              features={[
                ["pink", "Assistenza via chat illimitata"],
                ["pink", "Aiuto compiti giornaliero"],
                ["ok", "Studia sempre senza pubblicità"],
                ["ok", "Centinaia di esercizi risolti"],
                ["ok", "Videolezione per ogni argomento"],
                ["ok", "Formulari, quiz e appunti"],
                ["ok", "Sconto del 10% sulle ripetizioni"],
                ["ok", "Dark Mode per lo studio"],
                ["ok", "Salva le lezioni nei preferiti"],
                ["ok", "App Theoremz dedicata"],
                ["ok", "Tutte le funzionalità Theoremz"],
                ["ok", "100% soddisfatti o rimborsati"],
              ]}
            />
          </div>

          {/* Colonna 3 – Annuale */}
          <div>
            <div className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-400 py-2 text-center font-bold text-white">
              Il più conveniente 👇
            </div>
            <div className="mt-2 rounded-xl bg-white py-2 text-center font-bold text-slate-900">
              Annuale
            </div>

            <PriceCard
              price="64,90€"
              unit=" /anno"
              infoHref="https://wa.link/rwbkqd"
              buyHref="https://buy.stripe.com/6oE3fIfTJ6LL11u9Be"
              features={[
                ["pink", "Assistenza via chat illimitata"],
                ["pink", "Aiuto compiti giornaliero"],
                ["ok", "Studia sempre senza pubblicità"],
                ["ok", "Centinaia di esercizi risolti"],
                ["ok", "Videolezione per ogni argomento"],
                ["ok", "Formulari, quiz e appunti"],
                ["ok", "Sconto del 10% sulle ripetizioni"],
                ["ok", "Dark Mode per lo studio"],
                ["ok", "Salva le lezioni nei preferiti"],
                ["ok", "App Theoremz dedicata"],
                ["ok", "Tutte le funzionalità Theoremz"],
                ["ok", "100% soddisfatti o rimborsati"],
              ]}
            />
          </div>
        </div>
      </section>

      {/* ============ FAQ (2 colonne da lg) ============ */}
      <section className="mx-auto mt-10 max-w-6xl px-5 pb-12 sm:px-8 lg:px-12">
        <h3 className="text-center text-[26px] sm:text-[28px] lg:text-[32px] font-extrabold">
          Domande frequenti
        </h3>

        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {FAQS.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl bg-white text-slate-900 open:shadow-sm transition"
            >
              <summary className="cursor-pointer px-4 py-3 text-[16px] font-semibold">
                {item.q}
              </summary>
              <div className="px-4 pb-4 text-[15px] text-slate-700">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ============ REVIEWS (Senja embed) ============ */}
      <section className="mx-auto mb-16 max-w-6xl px-5 sm:px-8 lg:px-12">
        <h3 className="text-center text-[26px] sm:text-[28px] lg:text-[32px] font-extrabold">
          Cosa Dicono di Noi
        </h3>
        <div className="mx-auto mt-6 max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
          <SenjaEmbed
            id="60864db2-2740-4bf3-89f2-cba20c5c9c70"
            className="w-full"
          />
        </div>
      </section>
    </main>
  );
}

/* ---------- Mini components ---------- */
function IncludeCard({
  title,
  items,
}: {
  title: string;
  items: [string, string][];
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-6 lg:p-7">
      <h3 className="text-[20px] lg:text-[22px] font-extrabold text-sky-400">
        {title}
      </h3>
      <ul className="mt-3 space-y-3">
        {items.map(([h, p]) => (
          <li key={h} className="flex gap-3">
            <span className="select-none text-white/90">✦</span>
            <div>
              <p className="font-semibold">{h}</p>
              <p className="text-white/85 text-[15px] leading-relaxed">{p}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PriceCard({
  price,
  unit,
  features,
  infoHref,
  buyHref,
}: {
  price: string;
  unit: string;
  features: [variant: "ok" | "no" | "pink", text: string][];
  infoHref: string;
  buyHref: string;
}) {
  return (
    <div className="mt-3 rounded-2xl bg-white text-slate-900 shadow-sm ring-1 ring-slate-200">
      <div className="px-6 py-6 lg:px-8 lg:py-8">
        <div className="text-[41px] lg:text-[46px] font-semibold bg-gradient-to-r text-transparent from-blue-600 to-cyan-400 bg-clip-text ">
          {price}
          {unit}
        </div>

        <ul className="mt-5 grid gap-2 text-[16px] font-semibold lg:text-[15.5px]">
          {features.map(([variant, text], i) => {
            const color =
              variant === "no"
                ? "text-rose-500"
                : variant === "pink"
                  ? "bg-clip-text bg-gradient-to-r text-transparent from-purple-500 to-pink-500"
                  : "text-black";
            const strike = variant === "no";
            const pink = variant === "pink";

            return (
              <li key={i} className="flex items-start  gap-2">
                <span className={`${color} text-2xl`}>
                  {variant === "no" ? "✗" : "✓"}
                </span>
                <span
                  className={`${
                    pink
                      ? "bg-clip-text bg-gradient-to-r text-transparent from-purple-500 font-bold to-pink-500"
                      : "text-black"
                  } ${strike ? "line-through text-slate-400" : ""} mt-1`}
                >
                  {text}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link
            href={infoHref}
            aria-label={`Chiedi informazioni sul piano ${
              unit.includes("anno")
                ? "Annuale"
                : unit.includes("mese")
                  ? "Mensile"
                  : ""
            }`}
            className="rounded-xl bg-black px-4 py-3 text-center font-bold text-white transition hover:bg-slate-800"
          >
            Chiedi informazioni 💬
          </Link>
          <Link
            href={buyHref}
            aria-label={`Acquista il piano ${
              unit.includes("anno")
                ? "Annuale"
                : unit.includes("mese")
                  ? "Mensile"
                  : ""
            }`}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-400 px-4 py-3 text-center font-extrabold text-white transition hover:from-sky-500 hover:to-sky-400"
          >
            Acquista ora 👉
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---------- Decorative hero illustration (solo desktop) ---------- */
function HeroIllo() {
  return (
    <svg
      viewBox="0 0 560 340"
      className="h-[220px] sm:h-[260px] lg:h-[300px] w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="b" x1="0" x2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect
        x="20"
        y="20"
        width="520"
        height="220"
        rx="16"
        fill="#0d0f12"
        stroke="#1f2937"
      />
      <circle cx="60" cy="50" r="6" fill="#374151" />
      <circle cx="82" cy="50" r="6" fill="#374151" />
      <circle cx="104" cy="50" r="6" fill="#374151" />
      <rect x="60" y="90" width="200" height="100" rx="12" fill="#111827" />
      <path
        d="M80 160 C120 110, 160 140, 200 110 S250 190, 260 160"
        fill="none"
        stroke="url(#b)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <rect
        x="290"
        y="90"
        width="210"
        height="120"
        rx="14"
        fill="url(#b)"
        opacity=".25"
      />
      <rect
        x="310"
        y="110"
        width="170"
        height="16"
        rx="8"
        fill="#fff"
        opacity=".85"
      />
      <rect
        x="310"
        y="138"
        width="130"
        height="16"
        rx="8"
        fill="#fff"
        opacity=".85"
      />
      <rect
        x="310"
        y="166"
        width="150"
        height="16"
        rx="8"
        fill="#fff"
        opacity=".85"
      />
    </svg>
  );
}

/* ---------- FAQ data ---------- */
const FAQS = [
  {
    q: "L'assistenza è attiva il weekend?",
    a: "Certo, l'assistenza è attiva ogni giorno, tranne in occasione di festività nazionali.",
  },
  {
    q: "A che ora si può contattare l'assistenza?",
    a: "In generale a qualsiasi orario ma potrebbe capitare che i messaggi ricevuti in tarda notte vengano visualizzati la mattina dopo.",
  },
  {
    q: "Tutto questo vale per matematica e fisica?",
    a: "Sì, l'abbonamento include tutte le risorse di matematica e fisica e lo stesso vale per l'assistenza.",
  },
  {
    q: "È anche per studenti delle medie?",
    a: "Assolutamente sì! Il servizio è pensato per tutti gli studenti di medie e liceo.",
  },
  {
    q: "Vorrei abbonarmi con un amico, è possibile avere uno sconto?",
    a: "Probabilmente sì, contatta il servizio clienti per avere maggiori informazioni.",
  },
  {
    q: "Che qualifiche hanno gli insegnanti?",
    a: "Tutti gli insegnanti sono laureati in matematica, fisica o ingegneria e molti di loro hanno anche conseguito un master o una seconda laurea.",
  },
  {
    q: "In cosa consiste l'aiuto compiti?",
    a: "Lo studente ha a disposizione il tutor ogni giorno e può chiedergli aiuto per svolgere i compiti via chat.",
  },
  {
    q: "E se provo e non sono convinto?",
    a: "Nessun problema, se il servizio non soddisfa le aspettative è possibile richiedere un rimborso completo e immediato semplicemente informando l'assistenza clienti.",
  },
  {
    q: "Posso cancellare l'abbonamento in qualsiasi momento?",
    a: "Sì, puoi annullare il tuo abbonamento in qualsiasi momento senza penalità.",
  },
];
