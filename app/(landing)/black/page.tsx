// app/(landing)/black/page.tsx
import type { Metadata } from "next";
import SenjaEmbed from "@/components/SenjaEmbed";
import BlackPageGuard from "@/components/BlackPageGuard";
import type { LucideIcon } from "lucide-react";
import {
  MessageCircle,
  ClipboardCheck,
  ListChecks,
  CheckCircle2,
  BookOpen,
  Megaphone,
  Trophy,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import PriceCard from "@/components/PriceCard";
import PricingTile from "@/components/PricingTile";

// ---------- METADATA SEO ----------
const TITLE =
  "Theoremz Black — Mentoring didattico, esercizi illimitati e videolezioni";
const DESC =
  "Sblocca tutto Theoremz: mentoring personalizzato via chat, esercizi risolti, formulari, appunti e videolezioni. Piani da 12€/mese. Soddisfatti o rimborsati.";
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
      lowPrice: "12.00",
      highPrice: "259.00",
      priceCurrency: "EUR",
      offers: [
        {
          "@type": "Offer",
          name: "Piano Essential",
          price: "12.00",
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          url: "https://buy.stripe.com/7sIaIa5f5b21dOgcNo",
        },
        {
          "@type": "Offer",
          name: "Piano Black",
          price: "26.00",
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          url: "https://buy.stripe.com/cN29E66j97PPbG84gT",
        },
        {
          "@type": "Offer",
          name: "Annuale",
          price: "259.00",
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

  // Structured data (single @graph)
  const product = {
    "@type": "Product",
    name: "Theoremz Black",
    brand: { "@type": "Brand", name: "Theoremz" },
    description: DESC,
    image: [`${SITE}/metadata.png`],
    offers: productLd.offers,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: 127,
      bestRating: 5,
    },
    review: [
      {
        "@type": "Review",
        reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5 },
        author: { "@type": "Person", name: "Giulia" },
        reviewBody:
          "Risolto in 35 minuti con spiegazione dettagliata. Super servizio!",
      },
      {
        "@type": "Review",
        reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5 },
        author: { "@type": "Person", name: "Marco" },
        reviewBody:
          "Mi hanno aiutato anche dopo con due dubbi in chat. Gentilissimi.",
      },
    ],
  } as const;

  const faq = {
    "@type": "FAQPage",
    mainEntity: FAQS.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  } as const;

  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbLd.itemListElement,
  } as const;

  const graph = [breadcrumb, product, faq];

  return (
    <main className="bg-black text-white">
      {/* Guard per utenti già abbonati */}
      <BlackPageGuard />

      {/* JSON-LD (single @graph) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": graph,
          }),
        }}
      />

      {/* Stili CSS per l'animazione shimmer */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes shimmer {
            0% {
              transform: translateX(-100%) skewX(12deg);
            }
            100% {
              transform: translateX(200%) skewX(12deg);
            }
          }
        `,
        }}
      />

      {/* ============ HERO (2 colonne da md+) ============ */}
      <section className="relative mx-auto max-w-6xl px-5 pt-12 pb-12 sm:px-8 lg:px-12">
        <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#0a101d] via-[#111827] to-[#020312] px-6 py-10 shadow-[0_22px_60px_-25px_rgba(14,165,233,0.7)] sm:px-10 lg:px-16">
          <div className="relative grid gap-10 md:grid-cols-2 md:items-center">
            {/* Testo */}
            <div>
              <h1 className="font-black leading-tight text-[36px] sm:text-[44px] lg:text-[54px]">
                Mai più solo davanti alla
                <span className="italic font-extrabold text-sky-300">
                  {" "}
                  matematica.
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-[16px] sm:text-[17px] lg:text-[18px] leading-relaxed text-white/90 font-medium">
                Con{" "}
                <span className="inline-block bg-[linear-gradient(90deg,#38bdf8,#bae6fd,#38bdf8)] bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer font-extrabold">
                  Theoremz Black
                </span>{" "}
                hai un <span className="font-bold">tutor</span> che ti segue 1:1
                ogni giorno, tutte le risorse di Theoremz e molto altro.{" "}
                <span className="inline-block bg-[linear-gradient(90deg,#00FFD1,#bae6fd,#EC9B3B)] bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer font-extrabold"></span>
              </p>

              <div className="mt-8 flex items-center gap-4">
                <a
                  href="#pricing"
                  className="group relative inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[16px] font-extrabold text-white transition-all duration-300 btn-gradient-animate btn-halo"
                >
                  Scopri le offerte
                  <svg
                    className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
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
              </div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 md:hidden">
                <Star
                  className="h-4 w-4 text-amber-300"
                  strokeWidth={0}
                  fill="currentColor"
                  aria-hidden
                />
                4.8/5 da studenti soddisfatti
              </div>
            </div>

            {/* Social proof banner (solo da md+) */}
            <div className="hidden md:flex justify-center">
              <div className="group relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent px-8 py-9 text-center shadow-[0_25px_70px_-30px_rgba(56,189,248,0.8)] backdrop-blur transition-transform duration-500 ease-out will-change-transform motion-safe:hover:-translate-y-2 motion-safe:hover:scale-[1.02]">
                <div className="relative space-y-5 transition-transform duration-500 ease-out motion-safe:group-hover:-translate-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60 transition-colors duration-500 motion-safe:group-hover:text-white/80">
                    Valutazione studenti
                  </p>
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-end gap-2 transition-transform duration-500 ease-out motion-safe:group-hover:scale-105">
                      <span className="text-[52px] font-black leading-none text-white">
                        4.8
                      </span>
                      <span className="pb-1 text-lg font-semibold text-white/70 transition-colors duration-500 motion-safe:group-hover:text-white/90">
                        su 5
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-7 w-7 text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.55)] transition-transform duration-500 ease-out motion-safe:group-hover:translate-y-[-2px] motion-safe:group-hover:drop-shadow-[0_0_16px_rgba(251,191,36,0.85)]"
                          strokeWidth={0}
                          fill="currentColor"
                          aria-hidden
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 transition-transform duration-500 ease-out motion-safe:group-hover:translate-y-1 motion-safe:group-hover:bg-white/15">
                    <Users className="h-4 w-4 text-sky-300" aria-hidden />
                    Oltre 200 studenti soddisfatti
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ INTRO ============ */}
      <section className="mx-auto max-w-6xl px-5 pb-8 sm:px-8 lg:px-12">
        <h2 className="text-[26px] sm:text-[28px] lg:text-[32px] font-black text-white">
          Di cosa si tratta?
        </h2>
        <div className="mt-4 max-w-3xl space-y-4 text-[16px] sm:text-[17px] lg:text-[18px] leading-relaxed text-white/90 font-medium">
          <p>
            <span className="font-semibold text-white">Theoremz Black</span> è
            <span className="font-semibold text-sky-200">
              {" "}
              il tuo mentore didattico personale
            </span>
            : un insegnante dedicato ti accompagna nel tuo percorso di studio,
            costruendo con te un piano personalizzato e adattandolo ai tuoi
            ritmi e obiettivi.
          </p>
          <p>
            Non aspettiamo che tu abbia dubbi: ti forniamo
            <span className="font-semibold text-white">
              {" "}
              materiale mirato ogni settimana
            </span>
            , ti prepariamo attivamente per le verifiche e ti insegniamo
            strategie di studio efficaci. Allo stesso tempo, puoi sempre
            scriverci per qualsiasi domanda o difficoltà.
          </p>
          <p>
            <span className="font-semibold text-sky-200">
              Un approccio proattivo
            </span>{" "}
            che ti fa sentire sempre preparato e sicuro, trasformando lo studio
            da fatica a crescita costante.
          </p>
        </div>
        <ul className="mt-5 grid gap-3 text-[14.5px] font-semibold text-white/85 sm:grid-cols-3">
          <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <MessageCircle className="h-5 w-5 text-sky-300" aria-hidden />
            Mentore didattico personale
          </li>
          <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <ListChecks className="h-5 w-5 text-cyan-300" aria-hidden />
            Preparazione attiva alle verifiche
          </li>
          <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <Sparkles className="h-5 w-5 text-emerald-300" aria-hidden />
            Strategie di studio personalizzate
          </li>
        </ul>
      </section>

      {/* ============ COSA INCLUDE (grid 2 colonne da lg) ============ */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-12">
        <h2 className="text-[26px] sm:text-[28px] lg:text-[32px] font-black text-white">
          Cosa include?
        </h2>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <IncludeCard
            title="Mentoring Didattico Personalizzato"
            items={[
              [
                "Piano di Studio ",
                "Il tuo mentore crea un percorso su misura basato sui tuoi obiettivi, punti di forza e aree di miglioramento.",
              ],
              [
                "Supporto Costante via Chat",
                "Puoi scrivere in qualsiasi momento per ogni dubbio o difficoltà. Il tuo mentore ti risponde sempre e ti guida passo passo.",
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
              [
                "Flashcards Interattive",
                "Schede di ripasso personalizzate per memorizzare formule, teoremi e concetti chiave.",
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

          {/* Garanzia */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-cyan-500/90 via-sky-500/80 to-blue-600/80 px-6 py-9 text-center text-2xl sm:text-3xl lg:text-4xl font-black text-white shadow-[0_20px_45px_-28px_rgba(14,165,233,0.9)]">
              <span className="block text-sm font-semibold uppercase tracking-[0.35em] text-white/80">
                Garanzia totale
              </span>
              <span className="mt-4 block">+100% Soddisfatti o Rimborsati</span>
              <span className="mt-3 block text-base font-semibold text-white/90">
                Cambia idea quando vuoi
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PRICING (3 card da lg) ============ */}
      <section
        id="pricing"
        className="mx-auto mt-16 max-w-7xl px-5 pb-4 sm:px-8 lg:px-12"
      >
        <div className="mx-auto grid max-w-2xl gap-6 items-end justify-items-center lg:max-w-none lg:grid-cols-2 xl:grid-cols-3">
          {/* Colonna 1 – Essential */}
          <PricingTile
            outerClassName="group origin-bottom w-full max-w-[440px] rounded-[24px] bg-gradient-to-r from-green-500 to-cyan-400 p-[8px] shadow-[0_22px_55px_-28px_rgba(34,197,94,0.55)] transition-transform duration-300 hover:-translate-y-2 hover:shadow-[0_28px_70px_-32px_rgba(34,197,94,0.6)]"
            headerLabel="Il più economico"
            headerGradient="bg-gradient-to-r from-green-500 to-cyan-400"
            title="Piano Essential"
            toggleOptions={[
              {
                id: "essential-monthly",
                label: "Mensile",
                price: "12€",
                unit: " /mese",
                buyHref: "https://buy.stripe.com/bJe8wP6csgiXgE9aXAc7u13",
                infoHref: "https://wa.link/mkxv41",
                plan: "Essential Mensile",
              },
              {
                id: "essential-annual",
                label: "Annuale",
                price: "99€",
                unit: " /anno",
                buyHref: "https://buy.stripe.com/bJe4gz44k6InafL7Loc7u14",
                infoHref: "https://wa.link/mkxv41",
                plan: "Essential Annuale",
              },
            ]}
            defaultToggleId="essential-monthly"
            priceCardClassName="pb-1"
            features={[
              [
                "violet",
                "Theoremz AI illimitata su WhatsApp",
                [
                  "Mandi la foto dell’esercizio: il bot lo risolve e spiega i passaggi.",
                  "Ti aiuta a preparare verifiche e interrogazioni ogni giorno.",
                  "Ti manda video, esercizi e schemi in base a classe, voti e obiettivi.",
                ],
              ],
              ["ok", "Tutte le videolezioni"],
              ["ok", "Esercizi svolti passo–passo"],
              ["ok", "Formulari, quiz e appunti"],
              ["ok", "Flashcard per le formule"],
              ["ok", "Simulazioni verifiche"],
              ["ok", "Correzione verifiche"],
              ["ok", "Risorse aggiuntive illimitate"],
              ["ok", "Tutti i vantaggi di Free"],
              ["ok", "100% Soddisfatti o Rimborsati"],
              ["no", "Tutor umano"],
              ["no", "Domanda settimanale"],
              ["no", "Programma di studio"],
            ]}
          />

          {/* Colonna 2 – Base mensile */}
          <PricingTile
            outerClassName="group origin-bottom w-full max-w-[440px] rounded-[24px] bg-gradient-to-r from-rose-500 to-pink-500 p-[8px] shadow-[0_22px_55px_-28px_rgba(244,63,94,0.6)] transition-transform duration-300 hover:-translate-y-2 hover:shadow-[0_28px_70px_-32px_rgba(244,63,94,0.65)]"
            headerLabel="Il più popolare"
            headerGradient="bg-gradient-to-r from-rose-500 to-pink-500"
            title="Piano Black"
            toggleOptions={[
              {
                id: "black-monthly",
                label: "Mensile",
                price: "26€",
                unit: " /mese",
                buyHref: "https://buy.stripe.com/00w9ATgR66InbjPaXAc7u17",
                infoHref: "https://wa.link/4ogl5q",
                plan: "Black Standard Mensile",
              },
              {
                id: "black-annual",
                label: "Annuale",
                price: "259€",
                unit: " /anno",
                buyHref: "https://buy.stripe.com/7sY8wP44k0jZ1Jf1n0c7u16",
                infoHref: "https://wa.link/rwbkqd",
                plan: "Black Annuale",
              },
            ]}
            defaultToggleId="black-monthly"
            priceCardClassName="pb-3"
            features={[
              [
                "violet",
                "Mentoring didattico personalizzato",
                [
                  "Tutor dedicato che ti segue 1:1 su Whatsapp ogni giorno.",
                  "Costruisce con te un piano di studio su misura.",
                  "Ti aiuta a individurare, e superare le difficoltà.",
                ],
              ],
              [
                "violet",
                "Domanda settimanale in videochiamata",
                [
                  "Ogni settimana puoi inviare una domanda al tutor.",
                  "Prenoti un orario e affrontate l'argomento insieme.",
                  "Ideale per preparare verifiche, interrogazioni o argomenti complessi.",
                ],
              ],
              [
                "violet",
                "Theoremz AI illimitata su WhatsApp",
                [
                  "Mandi la foto dell’esercizio: il bot lo risolve e spiega i passaggi.",
                  "Ti aiuta a preparare verifiche e interrogazioni ogni giorno.",
                  "Ti manda video, esercizi e schemi in base a classe, voti e obiettivi.",
                ],
              ],
              ["ok", "Primo incontro di 30 min"],
              ["ok", "Tutte le videolezioni"],
              ["ok", "Esercizi svolti passo–passo"],
              ["ok", "Formulari, quiz e appunti"],
              ["ok", "Simulazioni verifiche"],
              ["ok", "Correzione verifiche"],
              ["ok", "Risorse aggiuntive illimitate"],
              ["ok", "Tutti i vantaggi di Essential"],
              ["ok", "Tutti i vantaggi di Free"],
              ["ok", "100% Soddisfatti o Rimborsati"],
            ]}
          />

          {/* Colonna 3 – Annuale */}
          <div className="group origin-bottom w-full max-w-[420px] rounded-[22px] bg-gradient-to-r from-blue-600 to-cyan-400 p-[7px] shadow-[0_22px_55px_-28px_rgba(59,130,246,0.55)] transition-transform duration-300 hover:-translate-y-2 hover:shadow-[0_28px_70px_-32px_rgba(59,130,246,0.6)]">
            <div className="rounded-[18px] bg-gradient-to-r from-blue-600 to-cyan-400 px-4 py-2.5 text-center text-white shadow-md ring-1 ring-white/30">
              <div className="text-[12px] font-extrabold uppercase tracking-wide">
                Gratuito
              </div>
            </div>
            <div className="mt-2 overflow-hidden rounded-[22px] bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-white px-5 py-3 text-center text-lg font-black text-slate-900">
                Piano Free
              </div>

              <PriceCard
                price="0€"
                unit=" /sempre"
                buyHref="/account"
                infoHref="https://wa.link/rwbkqd"
                className="mt-0 rounded-none border-none shadow-none ring-0 hover:translate-y-0 group-hover:translate-y-0 cta-quiet"
                features={[
                  ["ok", "Lezioni per tutti gli argomenti"],
                  ["ok", "Dashboard dei voti"],
                  ["ok", "Salvataggio lezioni nei preferiti"],
                  ["ok", "Dark Mode"],
                  ["no", "AI Theoremz"],
                  ["no", "Esercizi svolti"],
                  ["no", "Simulazioni verifiche"],
                  ["no", "Videolezioni"],
                  ["no", "Tutor dedicato"],
                  ["no", "Aiuto compiti"],
                  ["no", "Programma di studio"],
                  ["no", "Priorità nelle risposte"],
                ]}
              />
            </div>
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
  function iconFor(h: string): LucideIcon {
    const t = h.toLowerCase();
    if (t.includes("supporto") || t.includes("chat")) return MessageCircle;
    if (t.includes("compiti")) return ClipboardCheck;
    if (t.includes("catalogo") || t.includes("esercizi")) return ListChecks;
    if (t.includes("risolti") || t.includes("spiegati")) return CheckCircle2;
    if (
      t.includes("argomenti") ||
      t.includes("lezioni") ||
      t.includes("formulari")
    )
      return BookOpen;
    if (t.includes("materiale")) return Megaphone;
    if (t.includes("premi") || t.includes("primo posto")) return Trophy;
    return Sparkles;
  }
  return (
    <div className="group rounded-2xl border border-white/25 bg-gradient-to-br from-white/15 via-white/5 to-white/0 p-6 shadow-[0_18px_40px_-30px_rgba(56,189,248,0.6)] transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/50 hover:shadow-[0_22px_50px_-28px_rgba(56,189,248,0.9)] lg:p-7">
      <h3 className="text-[20px] lg:text-[22px] font-black text-white">
        {title}
      </h3>
      <ul className="mt-5 space-y-3">
        {items.map(([h, p]) => (
          <li
            key={h}
            className="flex gap-3 rounded-xl border border-white/15 bg-white/[0.07] px-4 py-3 transition-colors duration-300 group-hover:border-cyan-200/60 group-hover:bg-white/15"
          >
            {(() => {
              const Icon = iconFor(h);
              return (
                <Icon
                  className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300"
                  aria-hidden
                />
              );
            })()}
            <div>
              <p className="font-semibold text-white tracking-wide">{h}</p>
              <p className="text-[15px] leading-relaxed text-white/85">{p}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- FAQ data ---------- */
const FAQS = [
  {
    q: "Il tutor è disponibile il weekend?",
    a: "Certo, il servizio di mentoring è attivo ogni giorno, tranne in occasione di festività nazionali.",
  },
  {
    q: "A che ora si può contattare il tutor?",
    a: "In generale a qualsiasi orario ma potrebbe capitare che i messaggi ricevuti in tarda notte vengano visualizzati la mattina dopo.",
  },
  {
    q: "Tutto questo vale per matematica e fisica?",
    a: "Sì, l'abbonamento include tutte le risorse di matematica e fisica e lo stesso vale per il mentoring didattico.",
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
    a: "Puoi scrivere in qualsiasi momento per ogni dubbio o difficoltà. Il tutor ti risponde sempre e ti guida nell'apprendimento, spiegandoti come affrontare gli esercizi e aiutandoti a capire i metodi e la logica di risoluzione.",
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
