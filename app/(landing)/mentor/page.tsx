/* eslint-disable @next/next/no-img-element */
import MentorPricing from "@/components/MentorPricing";
import { CheckCircle2, Sparkles, Star } from "lucide-react";
export const metadata = {
  title: "Theoremz Mentor — Tutor personale per verifiche ed esami",
  description:
    "Un tutor al tuo fianco ogni giorno: piani di studio, esercizi mirati e lezioni 1‑to‑1. Migliora voti e sicurezza senza ansia.",
  alternates: { canonical: "/mentor" },
  openGraph: {
    type: "website",
    title: "Theoremz Mentor — Tutor personale",
    description:
      "Piani di studio, esercizi mirati e lezioni 1‑to‑1: risultati reali, meno stress.",
    images: [{ url: "/metadata.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Theoremz Mentor — Tutor personale",
    description:
      "Piani di studio, esercizi mirati e lezioni 1‑to‑1: risultati reali, meno stress.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
};

export default function MentorPage() {
  // JSON-LD: Breadcrumb + FAQ + Service (single @graph)
  const SITE = "https://theoremz.com";
  const CANONICAL = `${SITE}/mentor`;
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Mentor", item: CANONICAL },
    ],
  } as const;
  const faq = {
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } as const;
  // Use Product schema (Google supports reviews for Product; Service may be ignored)
  const product = {
    "@type": "Product",
    name: "Theoremz Mentor",
    brand: { "@type": "Brand", name: "Theoremz" },
    url: CANONICAL,
    image: [`${SITE}/metadata.png`],
    description:
      "Un tutor al tuo fianco ogni giorno: piani di studio, esercizi mirati e lezioni 1‑to‑1.",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: 86,
      bestRating: 5,
    },
    review: [
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Giulia R." },
        reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5 },
        reviewBody:
          "Con Theoremz Mentor ho finalmente capito matematica! Il tutor mi segue passo passo.",
      },
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Marco B." },
        reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5 },
        reviewBody:
          "Fisica era il mio incubo. Le lezioni e gli esercizi settimanali mi hanno sbloccato.",
      },
    ],
  } as const;

  const graph = [breadcrumb, faq, product];

  return (
    <main className="bg-slate-950 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": graph,
          }),
        }}
      />
      <Hero /> {/* solo qui ho migliorato il responsive */}
      <AboutAndTeachers />
      <IncludesGrid />
      <SatisfactionBanner />
      <Pricing />
      <Reviews /> {/* 3 recensioni con stelle */}
      <FAQ />
      <footer className="mt-10 border-t border-white/10 py-8 text-center text-[13px] text-white/50">
        © {new Date().getFullYear()} Theoremz — Tutti i diritti riservati
      </footer>
    </main>
  );
}

/* ---------------- HERO (responsive migliorato) ---------------- */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-5 pt-12 pb-8 sm:px-8 lg:px-12">
        <div className="relative overflow-hidden rounded-[28px] border border-white/12 bg-white/10 px-6 py-10 backdrop-blur sm:px-10 lg:px-16">

          <div className="relative grid gap-12 lg:grid-cols-[1.15fr,0.85fr] lg:items-center">
            {/* Testo */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h1 className="text-[30px] font-black leading-tight sm:text-[36px] lg:text-[44px]">
                  Ti senti <span className="bg-gradient-to-r from-rose-400 to-rose-300 bg-clip-text text-transparent">sopraffatto</span> da compiti e verifiche?
                </h1>
                <p className="text-[15.5px] leading-relaxed text-white/90 sm:text-[16.5px]">
                  Studiare da soli può essere <strong>difficile</strong> e spesso porta a rimandare. Con Theoremz Mentor hai un tutor personale che ti segue ogni giorno e trasforma lo stress in risultati concreti.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="#pricing"
                  className="group inline-flex items-center justify-center rounded-2xl px-6 py-3 text-[15px] font-extrabold text-white transition-all duration-300 btn-gradient-animate btn-halo"
                >
                  Scopri le offerte
                  <svg
                    className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
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
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/12 px-4 py-3 text-[12.5px] font-semibold text-white/85">
                  <span className="flex items-center gap-1 text-white/90">
                    <Star className="h-3.5 w-3.5 text-amber-300" aria-hidden />
                    <Star className="h-3.5 w-3.5 text-amber-300" aria-hidden />
                    <Star className="h-3.5 w-3.5 text-amber-300" aria-hidden />
                    <Star className="h-3.5 w-3.5 text-amber-300" aria-hidden />
                    <Star className="h-3.5 w-3.5 text-amber-300" aria-hidden />
                  </span>
                  <span>Valutazione media 4,9</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 text-[13px] font-semibold text-white/80 sm:flex-row sm:items-center">
                <span className="rounded-2xl border border-white/10 bg-white/12 px-4 py-2">
                  Tutor dedicato + piani su misura
                </span>
                <span className="rounded-2xl border border-white/10 bg-white/12 px-4 py-2">
                  Allenamenti e lezioni 1‑to‑1 ogni settimana
                </span>
              </div>
            </div>

            {/* Card laterale */}
            <div className="hidden lg:order-none lg:block">
              <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/10 px-6 py-6 text-white backdrop-blur">
                <div
                  className="pointer-events-none absolute -top-16 right-12 h-44 w-44 rounded-full bg-cyan-400/35 blur-3xl"
                  aria-hidden
                />
                <h3 className="text-[20px] font-black text-white">
                  Con Mentor ottieni
                </h3>
                <ul className="mt-4 space-y-3 text-[14.5px] font-semibold text-white/80">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-[2px] h-4 w-4 text-emerald-500" aria-hidden />
                    Tutor dedicato che segue i tuoi progressi ogni settimana
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-[2px] h-4 w-4 text-emerald-500" aria-hidden />
                    Piano di studio dinamico e aggiornato dopo ogni verifica
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-[2px] h-4 w-4 text-emerald-500" aria-hidden />
                    Lezioni 1‑to‑1 + esercizi mirati con correzione
                  </li>
                </ul>
                <div className="mt-6 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-[13px] font-semibold text-white/70">
                  &ldquo;Dopo due mesi con Mentor mio figlio è passato da 5 a 7,5 in matematica&rdquo; — <span className="text-white font-bold">Elena, mamma di Luca</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------- ABOUT + TEACHERS ------------- */
function AboutAndTeachers() {
  return (
    <section className="relative border-t border-white/10 bg-slate-950">
      <div className="relative mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          {/* about */}
          <div className="rounded-[26px] border border-white/10 bg-white/5 px-6 py-7 text-white backdrop-blur">
            <h3 className="text-[26px] sm:text-[30px] font-black text-white">
              Di cosa si tratta?
            </h3>
            <p className="mt-4 text-[15.5px] leading-relaxed text-white/80">
              <strong>Theoremz Mentor</strong> è il percorso premium per studenti e famiglie che vogliono un affiancamento continuo. Ogni studente lavora con un tutor dedicato, riceve un piano di studio dinamico e ha esercizi mirati che si aggiornano dopo ogni verifica.
            </p>
            <p className="mt-3 text-[15.5px] leading-relaxed text-white/80">
              Nessun pacchetto generico: ogni settimana analizziamo progressi, difficoltà e obiettivi per tenere alta la motivazione e arrivare tranquilli a interrogazioni ed esami.
            </p>
          </div>

          {/* teachers */}
          <div className="space-y-4">
            <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-center text-[13px] font-semibold uppercase tracking-[0.3em] text-white/70 backdrop-blur">
              I nostri migliori insegnanti
            </div>
            <div className="space-y-4">
              <TeacherCard
                name="Flavio"
                subtitle="Master in Ingegneria Biomedica"
                img="/images/flavio.webp"
                link="https://wa.link/d6nlzv"
              />
              <TeacherCard
                name="Ilaria"
                subtitle="Dottoressa in Ingegneria Gestionale"
                img="images/ilaria.webp"
                link="https://wa.link/a0ywj4"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TeacherCard({
  name,
  subtitle,
  img,
  link,
}: {
  name: string;
  subtitle: string;
  img: string;
  link: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <img
        alt={name}
        src={img}
        className="h-20 w-20 rounded-xl object-cover ring-1 ring-white/20"
      />
      <div className="flex-1">
        <div className="text-[16px] font-black text-white">{name}</div>
        <div className="text-[13px] text-white/70">{subtitle}</div>
      </div>
      <a
        href={link}
        className="rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 px-3 py-2 text-[13px] font-bold text-white transition hover:from-sky-500 hover:to-cyan-400"
      >
        Prenota ora
      </a>
    </div>
  );
}

/* ------------- INCLUDE GRID ------------- */
function IncludesGrid() {
  return (
    <section className="relative border-t border-white/10 bg-slate-950">
      <div className="relative mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-12">
        <h3 className="text-[26px] sm:text-[30px] font-black text-white">
          Cosa include?
        </h3>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <IncludeBlock
            title="Un Tutor per Ogni Studente"
            points={[
              [
                "Supporto Costante",
                "Un tutor di riferimento guida e risponde a qualsiasi difficoltà o blocco.",
              ],
              [
                "Assistenza via Chat",
                "Disponibile ogni giorno per compiti e dubbi sulle lezioni.",
              ],
            ]}
          />
          <IncludeBlock
            title="Piano di Studio"
            points={[
              [
                "Obiettivi Chiari",
                "Piano mensile personalizzato con obiettivi e competenze da sviluppare.",
              ],
              [
                "Adattamento Continuo",
                "Aggiornato in base ai progressi per un apprendimento mirato.",
              ],
            ]}
          />
          <IncludeBlock
            title="Esercizi Settimanali di Allenamento"
            points={[
              [
                "Pratica Mirata",
                "Schede di esercizi personalizzati per consolidare e prepararsi alle verifiche.",
              ],
              [
                "Miglioramento Costante",
                "Allenamenti pensati per affrontare le sfide con sicurezza.",
              ],
            ]}
          />
          <IncludeBlock
            title="Ripetizioni Settimanali"
            points={[
              [
                "Ore di Lezione Privata",
                "1+ ore a settimana su Zoom/Meet per approfondire gli argomenti.",
              ],
              [
                "Focus sulle Difficoltà",
                "Colmiamo lacune e prepariamo al meglio per gli esami.",
              ],
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function IncludeBlock({
  title,
  points,
}: {
  title: string;
  points: [string, string][];
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-transform duration-300 hover:-translate-y-1 backdrop-blur">
      <span
        className="pointer-events-none absolute inset-x-6 top-0 h-[2px] rounded-full bg-gradient-to-r from-sky-500/80 via-cyan-400/60 to-transparent opacity-90"
        aria-hidden
      />
      <h4 className="bg-gradient-to-r from-sky-300 to-cyan-200 bg-clip-text text-[20px] font-black text-transparent">
        {title}
      </h4>
      <ul className="mt-4 space-y-3">
        {points.map(([h, p]) => (
          <li
            key={h}
            className="grid grid-cols-[22px_1fr] items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white group-hover:border-sky-300/60"
          >
            <span className="mt-1 text-sky-300">✓</span>
            <div>
              <div className="text-[15.5px] font-bold text-white">{h}</div>
              <p className="text-[14px] text-white/75">{p}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------- BANNER GARANZIA ------------- */
function SatisfactionBanner() {
  return (
    <section className="relative border-t border-white/10 bg-slate-950">
      <div className="relative mx-auto max-w-6xl px-5 pb-0 pt-10 sm:px-8 lg:px-12">
        <div className="overflow-hidden rounded-[26px] border border-emerald-400/60 bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 px-6 py-9 text-center text-white">
          <div className="mx-auto max-w-3xl text-[26px] font-black leading-tight sm:text-[30px]">
            +100% Soddisfatti o Rimborsati
          </div>
          <p className="mt-2 text-[14px] text-emerald-100">
            7 giorni per valutare il percorso, rimborso completo se non è quello che cerchi.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------- PRICING (orizzontale su desktop) ------------- */
function Pricing() {
  return (
    <section id="pricing" className="border-t border-white/10 bg-slate-950">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-12">
        <MentorPricing />
      </div>
    </section>
  );
}

/* ------------- RECENSIONI (3 card + stelle) ------------- */
function Reviews() {
  const data = [
    {
      name: "Giulia R.",
      class: "3ª Liceo Scientifico",
      text: "Con Theoremz Mentor ho finalmente capito matematica! Il tutor mi segue passo passo e mi motiva. In due mesi sono passata da 5 a 8.",
      img: "https://randomuser.me/api/portraits/women/44.jpg",
      stars: 5,
    },
    {
      name: "Marco B.",
      class: "4ª Liceo Classico",
      text: "Fisica era il mio incubo. Le lezioni online e gli esercizi settimanali mi hanno sbloccato. Ora arrivo preparato e tranquillo.",
      img: "https://randomuser.me/api/portraits/men/34.jpg",
      stars: 5,
    },
    {
      name: "Sara L.",
      class: "5ª Tecnico Economico",
      text: "Ho migliorato i voti e soprattutto il metodo di studio. Organizzazione top e tutor super disponibili anche nel weekend.",
      img: "https://randomuser.me/api/portraits/women/55.jpg",
      stars: 5,
    },
  ];

  return (
    <section className="border-t border-white/10 bg-slate-950">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-12">
        <h3 className="mb-6 text-[26px] sm:text-[28px] font-extrabold text-white">
          Cosa dicono gli studenti
        </h3>
        <div className="grid gap-6 md:grid-cols-3">
          {data.map((r) => (
            <div
              key={r.name}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white backdrop-blur"
            >
              <div className="flex items-center gap-4">
                {/* <img
                  src={r.img}
                  alt={r.name}
                  className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200"
                /> */}
                <div className="h-12 w-12 bg-blue-500 rounded-full"></div>
                <div>
                  <div className="font-bold text-white">{r.name}</div>
                  <div className="text-xs text-white/60">{r.class}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1">
                {Array.from({ length: r.stars }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-amber-300" fill="currentColor" strokeWidth={0} aria-hidden />
                ))}
                <span className="ml-1 align-middle text-[12px] text-white/60">
                  ({r.stars}.0)
                </span>
              </div>
              <p className="mt-2 text-[14.5px] text-white/75">“{r.text}”</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------- FAQ ------------- */
function FAQ() {
  return (
    <section className="border-t border-white/10 bg-slate-950">
      <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8 lg:px-12">
        <h3 className="text-[26px] sm:text-[28px] font-extrabold text-white">
          Domande frequenti
        </h3>
        <div className="mt-5 space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-white/10 bg-white/5 text-white backdrop-blur"
            >
              <summary className="cursor-pointer px-4 py-3 text-[15.5px] font-bold text-white">
                {f.q}
              </summary>
              <div className="px-4 pb-4 text-[15px] text-white/75">{f.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: "Cosa include l'abbonamento Theoremz Mentor?",
    a: "Un insegnante dedicato che ti segue quotidianamente, 1h di ripetizione personalizzata a settimana e accesso alle risorse esclusive.",
  },
  {
    q: "Posso scegliere il mio insegnante?",
    a: "Sì. Dopo l’iscrizione potrai scegliere tra una selezione di insegnanti qualificati.",
  },
  {
    q: "Come si svolgono le ripetizioni?",
    a: "Online (Zoom/Google Meet) con condivisione schermo, esercizi e appunti.",
  },
  {
    q: "A che ora si può fare lezione?",
    a: "In base alle tue disponibilità. Lezioni tutti i giorni 8:00–22:00, sabato e domenica inclusi.",
  },
  {
    q: "Che risorse didattiche sono incluse?",
    a: "Tutte le risorse a pagamento di Theoremz: esercizi, quiz, appunti, videolezioni e altro.",
  },
  {
    q: "Che qualifiche hanno gli insegnanti?",
    a: "Laureati in matematica, fisica o ingegneria (molti con master o seconda laurea).",
  },
  {
    q: "In cosa consiste l'aiuto compiti?",
    a: "Tutor disponibile ogni giorno via chat per aiutarti nello svolgimento dei compiti.",
  },
  {
    q: "E se provo e non sono convinto?",
    a: "Se la lezione non soddisfa, puoi richiedere un rimborso completo informando l'insegnante.",
  },
  {
    q: "Posso cancellare l'abbonamento?",
    a: "Sì, in qualsiasi momento e senza penali.",
  },
];
