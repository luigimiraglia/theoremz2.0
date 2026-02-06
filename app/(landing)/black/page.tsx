// app/(landing)/black/page.tsx
import type { Metadata } from "next";
import SenjaEmbed from "@/components/SenjaEmbed";
import BlackPageGuard from "@/components/BlackPageGuard";
import { ListChecks, CheckCircle2, BookOpen, Star, Users } from "lucide-react";
import PricingTile from "@/components/PricingTile";
// import CountdownTimer from "@/components/CountdownTimer";

// ---------- METADATA SEO ----------
const TITLE = "Theoremz Black — Piattaforma completa per matematica e fisica";
const DESC =
  "Accesso completo alla piattaforma Theoremz: videolezioni, esercizi svolti, formulari, quiz e appunti. Piano unico semplice. Soddisfatti o rimborsati.";
// const DESC =
//   "Accesso completo alla piattaforma Theoremz: videolezioni, esercizi svolti, formulari, quiz e appunti. Offerta di Natale Black: 7 giorni di prova gratuita + 2 mesi al 50% fino al 6 gennaio a mezzanotte. Piano unico semplice. Soddisfatti o rimborsati.";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/black`;
// const HOLIDAY_DEADLINE = "6 gennaio a mezzanotte";
// const NOW = new Date();
// const CURRENT_YEAR = NOW.getFullYear();
// const HOLIDAY_CUTOFF = new Date(CURRENT_YEAR, 0, 6, 23, 59, 59);
// const HOLIDAY_YEAR = NOW > HOLIDAY_CUTOFF ? CURRENT_YEAR + 1 : CURRENT_YEAR;
// const HOLIDAY_DEADLINE_ISO = `${HOLIDAY_YEAR}-01-06T23:59:59`;

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
    "esercizi risolti",
    "videolezioni",
    "matematica",
    "fisica",
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
  // JSON-LD: Breadcrumb, Prodotto (con 2 offerte), FAQ
  const MONTHLY_PRICE = 12;
  const YEARLY_PRICE = 99;
  const MONTHLY_PRICE_LABEL = MONTHLY_PRICE.toFixed(2);
  const YEARLY_PRICE_LABEL = YEARLY_PRICE.toFixed(2);
  const YEARLY_EQUIV = (YEARLY_PRICE / 12).toFixed(2).replace(".", ",");
  const YEARLY_DISCOUNT = Math.round(
    (1 - YEARLY_PRICE / (MONTHLY_PRICE * 12)) * 100,
  );
  const MONTHLY_BUY_HREF = "https://buy.stripe.com/9B68wP7gw8Qv0Fb3v8c7u1a";
  const YEARLY_BUY_HREF = "https://buy.stripe.com/bJe4gz44k6InafL7Loc7u14";

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Theoremz Black",
    brand: { "@type": "Brand", name: "Theoremz" },
    description: DESC,
    image: [`${SITE}/metadata.png`],
    offers: {
      "@type": "AggregateOffer",
      offerCount: 2,
      lowPrice: MONTHLY_PRICE_LABEL,
      highPrice: YEARLY_PRICE_LABEL,
      priceCurrency: "EUR",
      offers: [
        {
          "@type": "Offer",
          name: "Piano Black Mensile",
          price: MONTHLY_PRICE_LABEL,
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          url: MONTHLY_BUY_HREF,
        },
        {
          "@type": "Offer",
          name: "Piano Black Annuale",
          price: YEARLY_PRICE_LABEL,
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          url: YEARLY_BUY_HREF,
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
          "Esercizi svolti chiarissimi, mi hanno sbloccato in poco tempo.",
      },
      {
        "@type": "Review",
        reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5 },
        author: { "@type": "Person", name: "Marco" },
        reviewBody:
          "Videolezioni e appunti ordinati: ripasso veloce prima delle verifiche.",
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
  const heroCtaLabel = "Scopri il piano";
  // const heroCtaLabel = "Scopri l'offerta di Natale Black";
  const platformFeatures = [
    {
      title: "Tracking voti",
      body: "Tutti i voti e le verifiche sono monitorati: capisci subito se stai migliorando o se serve cambiare approccio.",
      image: "/images/mocky2.webp",
    },
    {
      title: "Simulazioni verifiche",
      body: "Ti alleni prima della prova reale, così arrivi più sicuro e con meno stress.",
      image: "/images/mocky3.webp",
    },
    {
      title: "Esercizi spiegati",
      body: "Ogni esercizio mostra il ragionamento completo (3000+ esercizi), così ti alleni anche quando finiscono i compiti.",
      image: "/images/mocky4.webp",
    },
    {
      title: "Lezioni on-demand",
      body: "Ripassi gli argomenti quando serve, senza dipendere dagli orari di qualcuno.",
      image: "/images/mocky5.webp",
    },
  ];
  const SHIMMER_CSS = `
          @keyframes shimmer {
            0% {
              transform: translateX(-100%) skewX(12deg);
            }
            100% {
              transform: translateX(200%) skewX(12deg);
            }
          }
        `;
  // const SNOW_CSS = `
  //         @keyframes snowFall {
  //           0% { transform: translateY(-120px); }
  //           100% { transform: translateY(calc(100vh + 120px)); }
  //         }
  //       `;
  // const SNOW_OVERLAY = (
  //   <div
  //     className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
  //     aria-hidden="true"
  //   >
  //     <div
  //       className="absolute inset-0 animate-[snowFall_12s_linear_infinite] bg-[radial-gradient(7px_7px_at_10%_12%,rgba(255,255,255,0.95),transparent_60%),radial-gradient(7px_7px_at_28%_18%,rgba(255,255,255,0.92),transparent_60%),radial-gradient(8px_8px_at_46%_10%,rgba(255,255,255,0.94),transparent_60%),radial-gradient(7px_7px_at_64%_16%,rgba(255,255,255,0.93),transparent_60%),radial-gradient(7px_7px_at_82%_14%,rgba(255,255,255,0.95),transparent_60%),radial-gradient(6.5px_6.5px_at_16%_40%,rgba(255,255,255,0.92),transparent_60%),radial-gradient(7px_7px_at_34%_44%,rgba(255,255,255,0.9),transparent_60%),radial-gradient(7px_7px_at_58%_38%,rgba(255,255,255,0.92),transparent_60%),radial-gradient(7px_7px_at_78%_42%,rgba(255,255,255,0.93),transparent_60%),radial-gradient(6.5px_6.5px_at_92%_38%,rgba(255,255,255,0.92),transparent_60%),radial-gradient(7px_7px_at_22%_68%,rgba(255,255,255,0.95),transparent_60%),radial-gradient(7px_7px_at_44%_72%,rgba(255,255,255,0.92),transparent_60%),radial-gradient(7px_7px_at_68%_66%,rgba(255,255,255,0.95),transparent_60%),radial-gradient(7px_7px_at_84%_74%,rgba(255,255,255,0.92),transparent_60%),radial-gradient(7px_7px_at_12%_82%,rgba(255,255,255,0.94),transparent_60%),radial-gradient(7px_7px_at_50%_90%,rgba(255,255,255,0.95),transparent_60%),radial-gradient(6.5px_6.5px_at_86%_92%,rgba(255,255,255,0.94),transparent_60%)] opacity-95"
  //       style={{ transform: "translateY(-140px)" }}
  //     />
  //     <div
  //       className="absolute inset-0 animate-[snowFall_18s_linear_infinite] bg-[radial-gradient(5px_5px_at_14%_6%,rgba(255,255,255,0.8),transparent_60%),radial-gradient(5px_5px_at_32%_14%,rgba(255,255,255,0.82),transparent_60%),radial-gradient(5.2px_5.2px_at_52%_8%,rgba(255,255,255,0.82),transparent_60%),radial-gradient(5px_5px_at_70%_12%,rgba(255,255,255,0.8),transparent_60%),radial-gradient(5px_5px_at_88%_10%,rgba(255,255,255,0.8),transparent_60%),radial-gradient(5px_5px_at_18%_48%,rgba(255,255,255,0.78),transparent_60%),radial-gradient(5px_5px_at_36%_54%,rgba(255,255,255,0.8),transparent_60%),radial-gradient(5px_5px_at_58%_48%,rgba(255,255,255,0.82),transparent_60%),radial-gradient(5px_5px_at_74%_54%,rgba(255,255,255,0.8),transparent_60%),radial-gradient(5px_5px_at_90%_52%,rgba(255,255,255,0.78),transparent_60%),radial-gradient(5px_5px_at_24%_76%,rgba(255,255,255,0.8),transparent_60%),radial-gradient(5px_5px_at_46%_80%,rgba(255,255,255,0.82),transparent_60%),radial-gradient(5px_5px_at_66%_74%,rgba(255,255,255,0.8),transparent_60%),radial-gradient(5px_5px_at_82%_82%,rgba(255,255,255,0.8),transparent_60%),radial-gradient(5px_5px_at_10%_88%,rgba(255,255,255,0.82),transparent_60%),radial-gradient(5px_5px_at_54%_94%,rgba(255,255,255,0.82),transparent_60%),radial-gradient(5px_5px_at_88%_96%,rgba(255,255,255,0.8),transparent_60%)] opacity-85"
  //       style={{ animationDelay: "-6s", transform: "translateY(-160px)" }}
  //     />
  //     <div
  //       className="absolute inset-0 animate-[snowFall_26s_linear_infinite] bg-[radial-gradient(3.8px_3.8px_at_8%_16%,rgba(255,255,255,0.7),transparent_60%),radial-gradient(3.8px_3.8px_at_30%_9%,rgba(255,255,255,0.7),transparent_60%),radial-gradient(3.8px_3.8px_at_52%_14%,rgba(255,255,255,0.72),transparent_60%),radial-gradient(3.8px_3.8px_at_72%_8%,rgba(255,255,255,0.7),transparent_60%),radial-gradient(3.8px_3.8px_at_92%_12%,rgba(255,255,255,0.68),transparent_60%),radial-gradient(3.8px_3.8px_at_14%_60%,rgba(255,255,255,0.7),transparent_60%),radial-gradient(3.8px_3.8px_at_32%_66%,rgba(255,255,255,0.7),transparent_60%),radial-gradient(3.8px_3.8px_at_54%_60%,rgba(255,255,255,0.72),transparent_60%),radial-gradient(3.8px_3.8px_at_70%_66%,rgba(255,255,255,0.7),transparent_60%),radial-gradient(3.8px_3.8px_at_90%_62%,rgba(255,255,255,0.68),transparent_60%),radial-gradient(3.8px_3.8px_at_18%_84%,rgba(255,255,255,0.7),transparent_60%),radial-gradient(3.8px_3.8px_at_40%_88%,rgba(255,255,255,0.7),transparent_60%),radial-gradient(3.8px_3.8px_at_62%_82%,rgba(255,255,255,0.7),transparent_60%),radial-gradient(3.8px_3.8px_at_80%_90%,rgba(255,255,255,0.7),transparent_60%),radial-gradient(3.8px_3.8px_at_6%_94%,rgba(255,255,255,0.68),transparent_60%),radial-gradient(3.8px_3.8px_at_46%_98%,rgba(255,255,255,0.7),transparent_60%),radial-gradient(3.8px_3.8px_at_86%_98%,rgba(255,255,255,0.7),transparent_60%)] opacity-78"
  //       style={{ animationDelay: "-14s", transform: "translateY(-180px)" }}
  //     />
  //   </div>
  // );
  // const HOLIDAY_BANNER = (
  //   <div
  //     className="relative mb-8 overflow-hidden rounded-3xl border border-red-200/40 px-6 py-8 text-center shadow-[0_32px_90px_-38px_rgba(185,28,28,0.85)]"
  //     style={{
  //       backgroundImage:
  //         "linear-gradient(115deg, #7f1d1d, #b91c1c 35%, #ef4444 65%, #7f1d1d)",
  //     }}
  //   >
  //     <div className="flex flex-col items-center gap-4 text-white drop-shadow-[0_10px_26px_rgba(0,0,0,0.28)]">
  //       <div className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-1.5 text-[12px] font-black uppercase tracking-[0.32em] text-red-700 shadow-sm">
  //         🎄 Offerta di Natale Black
  //       </div>
  //       <div className="text-[18px] font-extrabold uppercase tracking-[0.18em] text-amber-100">
  //         Solo fino al {HOLIDAY_DEADLINE}
  //       </div>
  //       <div className="text-[24px] sm:text-[28px] font-black leading-tight tracking-tight text-white [text-shadow:0_7px_18px_rgba(0,0,0,0.32)]">
  //         7 giorni GRATIS + 2 mesi al{" "}
  //         <span className="text-amber-200">-50%</span>
  //       </div>
  //       <div className="w-full max-w-md rounded-2xl border border-white/25 bg-white/5 px-4 py-3 shadow-[0_12px_28px_-18px_rgba(0,0,0,0.4)]">
  //         <div className="mb-2 text-[12px] font-bold uppercase tracking-[0.3em] text-white/80">
  //           Scade tra
  //         </div>
  //         <CountdownTimer deadline={HOLIDAY_DEADLINE_ISO} />
  //       </div>
  //       <div className="text-[14px] sm:text-[15px] font-extrabold text-amber-100 drop-shadow-[0_6px_16px_rgba(0,0,0,0.35)]">
  //         Solo 50 posti disponibili
  //       </div>
  //     </div>
  //   </div>
  // );

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
          __html: SHIMMER_CSS,
        }}
      />

      {/* ============ HERO (2 colonne da md+) ============ */}
      <section className="relative mx-auto max-w-6xl px-5 pt-12 pb-12 sm:px-8 lg:px-12">
        <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#0a101d] via-[#111827] to-[#020312] px-6 py-10 shadow-[0_22px_60px_-25px_rgba(14,165,233,0.7)] sm:px-10 lg:px-16">
          <div className="relative grid gap-10 md:grid-cols-2 md:items-center">
            {/* Testo */}
            <div>
              <h1 className="font-black leading-tight text-[36px] sm:text-[44px] lg:text-[54px]">
                Con Black sai
                <span className="italic font-extrabold text-sky-300">
                  {" "}
                  sempre{" "}
                </span>{" "}
                da dove iniziare
              </h1>

              <p className="mt-5 max-w-2xl text-[16px] sm:text-[17px] lg:text-[18px] leading-relaxed text-white/90 font-medium">
                Con{" "}
                <span className="inline-block bg-[linear-gradient(90deg,#38bdf8,#bae6fd,#38bdf8)] bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer font-extrabold">
                  Theoremz Black
                </span>{" "}
                hai tutto in un solo posto per studiare davvero. Così non resti
                mai senza materiale e sai sempre cosa ripassare prima delle
                verifiche.
              </p>

              <div className="mt-8 flex items-center gap-4">
                <a
                  href="#pricing"
                  className="group relative inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[16px] font-extrabold text-white transition-all duration-300 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 shadow-[0_18px_44px_-18px_rgba(14,165,233,0.75)] hover:from-sky-500 hover:via-cyan-400 hover:to-blue-600 hover:shadow-[0_20px_52px_-18px_rgba(14,165,233,0.95)]"
                >
                  {heroCtaLabel}
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
            l&apos;accesso completo alla piattaforma Theoremz, pensato per farti
            studiare con continuità e senza blocchi.
          </p>
          <p>
            Videolezioni, esercizi svolti, formulari, quiz, appunti e flashcard
            sono organizzati per argomento e livello: così sai subito cosa
            ripassare e in che ordine.
          </p>
          <p>
            Studia quando vuoi e arrivi alle verifiche più sicuro, con un piano
            semplice (mensile o annuale).
          </p>
        </div>
        <ul className="mt-5 grid gap-3 text-[14.5px] font-semibold text-white/85 sm:grid-cols-3">
          <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <BookOpen className="h-5 w-5 text-sky-300" aria-hidden />
            Videolezioni chiare per sbloccare gli argomenti
          </li>
          <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <ListChecks className="h-5 w-5 text-cyan-300" aria-hidden />
            Esercizi svolti passo&ndash;passo: impari il metodo
          </li>
          <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-300" aria-hidden />
            Formulari, quiz e appunti pronti per il ripasso
          </li>
        </ul>
      </section>

      {/* ============ VANTAGGI PIATTAFORMA ============ */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-12">
        <div className="max-w-3xl">
          <h2 className="text-[26px] sm:text-[28px] lg:text-[32px] font-black text-white">
            I vantaggi della piattaforma
          </h2>
          <p className="mt-3 text-[16px] sm:text-[17px] text-white/80">
            Strumenti pratici per studiare con continuità, allenarti prima delle
            verifiche e non restare mai senza materiale.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {platformFeatures.map((feature) => (
            <div
              key={feature.title}
              className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_18px_50px_-30px_rgba(56,189,248,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/10 hover:shadow-[0_22px_60px_-30px_rgba(56,189,248,0.6)]"
            >
              <div className="h-56 w-full overflow-hidden bg-gradient-to-br from-white/10 via-white/0 to-sky-500/10 sm:h-64">
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-6 text-center">
                <p className="text-[22px] font-black text-white sm:text-[24px]">
                  {feature.title}
                </p>
                <p className="text-[15px] text-white/75">{feature.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Garanzia */}
        <div className="mt-8">
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
      </section>

      {/* ============ PRICING (Piano Black) ============ */}
      <section
        id="pricing"
        className="mx-auto mt-16 max-w-7xl px-5 pb-4 sm:px-8 lg:px-12"
      >
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6">
          <h2 className="text-center text-[26px] sm:text-[28px] lg:text-[32px] font-black text-white">
            Sblocca tutto prima della prossima verifica ↓
          </h2>
          <PricingTile
            outerClassName="group relative z-0 origin-bottom w-full max-w-[460px] rounded-[26px] bg-gradient-to-r from-blue-600 via-cyan-400 to-sky-400 p-[9px] shadow-[0_28px_80px_-30px_rgba(56,189,248,0.75)] transition-transform duration-300 hover:-translate-y-2 hover:shadow-[0_36px_95px_-34px_rgba(56,189,248,0.9)] before:absolute before:-inset-3 before:rounded-[28px] before:bg-gradient-to-r before:from-sky-400/40 before:via-cyan-400/30 before:to-blue-500/40 before:blur-2xl before:opacity-80 before:content-[''] before:-z-10"
            headerLabel="Piano Black"
            headerGradient="bg-gradient-to-r from-blue-600 to-cyan-400"
            title="Piano Black"
            priceContentByToggleId={{
              "black-platform-monthly": (
                <div className="flex flex-col items-center leading-tight text-center gap-2">
                  <span className="text-[46px] sm:text-[46px] font-black bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent drop-shadow-[0_14px_34px_-12px_rgba(14,165,233,0.6)]">
                    {MONTHLY_PRICE}€/mese
                  </span>
                </div>
              ),
              "black-platform-annual": (
                <div className="flex flex-col items-center leading-tight text-center gap-2">
                  <span className="text-[46px] sm:text-[46px] font-black bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500 bg-clip-text text-transparent drop-shadow-[0_14px_34px_-12px_rgba(16,185,129,0.55)]">
                    {YEARLY_PRICE}€/anno
                  </span>
                  <span className="text-[13px] font-semibold text-slate-600">
                    ~{YEARLY_EQUIV}€/mese
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                    Risparmi ~{YEARLY_DISCOUNT}%
                  </span>
                </div>
              ),
            }}
            priceGradientByToggleId={{
              "black-platform-monthly":
                "from-blue-600 via-cyan-500 to-blue-600",
              "black-platform-annual":
                "from-emerald-500 via-teal-400 to-sky-500",
            }}
            toggleOptions={[
              {
                id: "black-platform-monthly",
                label: "Mensile",
                price: `${MONTHLY_PRICE}€`,
                unit: " /mese",
                buyHref: MONTHLY_BUY_HREF,
                infoHref: "https://wa.link/mkxv41",
                plan: "Piano Black Mensile",
              },
              {
                id: "black-platform-annual",
                label: "Annuale",
                price: `${YEARLY_PRICE}€`,
                unit: " /anno",
                buyHref: YEARLY_BUY_HREF,
                infoHref: "https://wa.link/mkxv41",
                plan: "Piano Black Annuale",
                desktopNote: `Risparmi ~${YEARLY_DISCOUNT}%`,
              },
            ]}
            defaultToggleId="black-platform-monthly"
            priceCardClassName="pb-2 bg-gradient-to-b from-white via-slate-50 to-slate-100 ring-1 ring-cyan-200/60 shadow-[0_18px_50px_-32px_rgba(14,165,233,0.5)]"
            features={[
              ["sky", "Accesso completo alla piattaforma Theoremz"],
              ["sky", "Tutte le videolezioni"],
              ["sky", "Esercizi svolti passo–passo"],
              ["sky", "Simulazioni verifiche"],
              ["ok", "Formulari, quiz e appunti"],
              ["ok", "Flashcard per le formule"],
              ["ok", "Dashboard dei voti"],
              ["ok", "Salvataggio lezioni nei preferiti"],
              ["ok", "Dark Mode"],
              ["ok", "100% Soddisfatti o Rimborsati"],
            ]}
          />
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

/* ---------- FAQ data ---------- */
const FAQS = [
  {
    q: "Cosa include il piano?",
    a: "Accesso completo alla piattaforma: videolezioni, esercizi svolti, formulari, quiz, appunti e flashcard.",
  },
  {
    q: "I contenuti coprono matematica e fisica?",
    a: "Sì, l'abbonamento include tutte le risorse di matematica e fisica.",
  },
  {
    q: "È adatto anche per studenti delle medie?",
    a: "Sì, la piattaforma è pensata per studenti di medie e liceo.",
  },
  {
    q: "Posso usare Theoremz da mobile?",
    a: "Sì, funziona su smartphone, tablet e desktop.",
  },
  {
    q: "Posso cancellare l'abbonamento quando voglio?",
    a: "Sì, puoi annullare l'abbonamento in qualsiasi momento senza penalità.",
  },
  {
    q: "E se non mi trovo bene?",
    a: "Nessun problema, se il servizio non soddisfa le aspettative è possibile richiedere un rimborso completo e immediato.",
  },
];
