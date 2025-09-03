/* eslint-disable @next/next/no-img-element */
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
  const service = {
    "@type": "Service",
    name: "Theoremz Mentor",
    provider: { "@type": "Organization", name: "Theoremz", url: SITE },
    areaServed: "IT",
    serviceType: "Tutor personale di matematica e fisica",
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

  const graph = [breadcrumb, faq, service];

  return (
    <main className="bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
        }}
      />
      <Hero /> {/* solo qui ho migliorato il responsive */}
      <AboutAndTeachers />
      <IncludesGrid />
      <SatisfactionBanner />
      <Pricing />
      <Reviews /> {/* 3 recensioni con stelle */}
      <FAQ />
      <footer className="mt-10 border-t border-slate-100 py-8 text-center text-[13px] text-slate-500">
        © {new Date().getFullYear()} Theoremz — Tutti i diritti riservati
      </footer>
    </main>
  );
}

/* ---------------- HERO (responsive migliorato) ---------------- */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 pt-10 pb-6 sm:px-8 lg:px-12">
        {/* Mobile: stack; Desktop: 2 colonne perfettamente allineate */}
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          {/* Testo */}
          <div className="order-2 lg:order-1">
            <h1 className="text-[30px] sm:text-[36px] lg:text-[44px] font-black leading-tight [text-wrap:balance] break-words hyphens-auto">
              Ti senti <span className="text-rose-500">sopraffatto</span> dai
              compiti e dalle verifiche?
            </h1>
            <p className="mt-3 text-[15.5px] sm:text-[16.5px] text-slate-700 leading-relaxed">
              Studiare da soli può essere <b>difficile</b> e <b>frustrante</b>.
              Senza una guida costante i progressi rallentano e la motivazione
              crolla.
            </p>

            <div className="mt-8">
              <div className="inline-block rounded-xl bg-slate-900/90 px-4 py-2 text-[28px] sm:text-[32px] lg:text-[36px] font-black text-white">
                Theoremz <span className="text-sky-300">Mentor</span>
              </div>
              <h2 className="mt-3 text-[28px] sm:text-[30px] lg:text-[32px] font-extrabold leading-tight">
                un tutor <span className="text-sky-600">personale</span> per il
                tuo successo!
              </h2>

              <p className="mt-3 text-[15.5px] text-slate-700">
                Il primo sistema di apprendimento con un tutor{" "}
                <b>sempre al tuo fianco</b>.
              </p>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <a
                  href="#pricing"
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-sky-600 to-sky-500 px-6 py-3 text-[15px] font-extrabold text-white shadow-[0_8px_0_#1d4ed8] active:translate-y-[1px] active:shadow-[0_7px_0_#1d4ed8]"
                >
                  Scopri le offerte
                  <svg
                    className="ml-2 h-5 w-5"
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
                <span className="inline-flex items-center justify-center rounded-2xl bg-slate-50 px-4 py-3 text-[12.5px] font-semibold text-slate-600 ring-1 ring-slate-200">
                  ⭐️⭐️⭐️⭐️⭐️ Recensioni verificate
                </span>
              </div>
            </div>
          </div>

          {/* Illustrazione/Statistiche */}
        </div>
      </div>
    </section>
  );
}

/* ------------- ABOUT + TEACHERS ------------- */
function AboutAndTeachers() {
  return (
    <section className="border-t border-slate-100">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-12">
        <div className="grid gap-8 md:grid-cols-2">
          {/* about */}
          <div>
            <h3 className="text-[26px] sm:text-[28px] font-extrabold">
              Di cosa si tratta?
            </h3>
            <p className="mt-2 text-[15.5px] leading-relaxed text-slate-700">
              <b>Theoremz Mentor</b> offre un’esperienza di apprendimento unica,
              con un tutor <b>dedicato</b> che ti segue ogni giorno. Avrai
              accesso a piani di studio personalizzati, esercizi settimanali e
              ore di lezione online per superare ogni sfida.
            </p>
          </div>

          {/* teachers */}
          <div>
            <div className="rounded-xl bg-slate-50 px-4 py-2 text-center text-[13px] font-bold text-slate-700 ring-1 ring-slate-200">
              I nostri migliori insegnanti 👇
            </div>
            <div className="mt-4 space-y-4">
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
    <div className="flex items-center gap-4 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
      <img
        alt={name}
        src={img}
        className="h-20 w-20 rounded-xl object-cover ring-1 ring-slate-200"
      />
      <div className="flex-1">
        <div className="font-extrabold">{name}</div>
        <div className="text-[13px] text-slate-600">{subtitle}</div>
      </div>
      <a
        href={link}
        className="rounded-xl bg-emerald-500 px-3 py-2 text-[13px] font-bold text-white hover:bg-emerald-600"
      >
        Prenota ora
      </a>
    </div>
  );
}

/* ------------- INCLUDE GRID ------------- */
function IncludesGrid() {
  return (
    <section className="border-t border-slate-100 bg-slate-50/50">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-12">
        <h3 className="text-[26px] sm:text-[28px] font-extrabold">
          Cosa include?
        </h3>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
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
    <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
      <h4 className="bg-gradient-to-r from-sky-600 to-cyan-500 bg-clip-text text-[20px] font-black text-transparent">
        {title}
      </h4>
      <ul className="mt-3 space-y-4">
        {points.map(([h, p]) => (
          <li key={h} className="grid grid-cols-[20px_1fr] items-start gap-3">
            <span className="mt-[3px] text-slate-700">✒️</span>
            <div>
              <div className="text-[16px] font-extrabold">{h}</div>
              <p className="text-[14.5px] text-slate-700">{p}</p>
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
    <section>
      <div className="mx-auto max-w-6xl px-5 pb-0 sm:px-8 lg:px-12">
        <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-500 px-6 py-8 text-center text-white shadow-md">
          <div className="mx-auto max-w-3xl text-[26px] sm:text-[30px] font-black leading-tight">
            +100% Soddisfatti o Rimborsati
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------- PRICING (orizzontale su desktop) ------------- */
function Pricing() {
  return (
    <section
      id="pricing"
      className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-12"
    >
      <TierTag> Piano Base 👇 </TierTag>
      <Plan
        price="89,90€ /mese"
        bullets={[
          "Tutor dedicato per lo studente",
          "Aiuto compiti via chat giornaliero",
          "1h di lezione a settimana",
          "Esercizi personalizzati di rinforzo",
          "Accesso a tutte le risorse di Theoremz",
          "Orari flessibili anche il weekend",
          "Report per i genitori",
          "Piano di studio personalizzato",
          "100% soddisfatti o rimborsati",
        ]}
        stripeLink={"https://buy.stripe.com/4gweYq5f5da925y00x"}
        waLink={"https://wa.link/yofiy8"}
      />

      <TierTag> Piano Accelerato 👇 </TierTag>
      <Plan
        price="149€ /mese"
        bullets={[
          "Tutor dedicato per lo studente",
          "Aiuto compiti via chat giornaliero",
          "2h di lezione a settimana",
          "Esercizi personalizzati di rinforzo",
          "Accesso a tutte le risorse di Theoremz",
          "Orari flessibili anche il weekend",
          "Report per i genitori",
          "Piano di studio personalizzato",
          "100% soddisfatti o rimborsati",
        ]}
        stripeLink={"https://buy.stripe.com/eVa3fIbDt9XXcKc00B"}
        waLink={"https://wa.link/1nnh4k"}
      />

      <TierTag> Intero Quadrimestre 👇 </TierTag>
      <Plan
        price="329€ /4 mesi"
        bullets={[
          "Tutor dedicato per lo studente",
          "Aiuto compiti via chat giornaliero",
          "1h di lezione a settimana",
          "Esercizi personalizzati di rinforzo",
          "Accesso a tutte le risorse di Theoremz",
          "Orari flessibili anche il weekend",
          "Report per i genitori",
          "Piano di studio personalizzato",
          "100% soddisfatti o rimborsati",
        ]}
        stripeLink={"https://buy.stripe.com/6oEeYq6j9fih11ubJg"}
        waLink={"https://wa.link/tzu43l"}
      />
    </section>
  );
}

function TierTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 rounded-2xl bg-slate-50 py-2 text-center text-[15px] font-extrabold ring-1 ring-slate-200">
      {children}
    </div>
  );
}

function Plan({
  price,
  bullets,
  stripeLink,
  waLink,
}: {
  price: string;
  bullets: string[];
  waLink: string;
  stripeLink: string;
}) {
  return (
    <div className="mb-6 rounded-3xl bg-white p-6 ring-1 ring-slate-200 shadow-sm">
      <div className="text-[36px] sm:text-[44px] font-black leading-none bg-gradient-to-r from-sky-600 to-cyan-500 bg-clip-text text-transparent">
        {price}
      </div>
      <ul className="mt-4 space-y-3">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-3 text-[16px]">
            <span className="mt-1 text-emerald-600">✓</span>
            <span className="text-slate-800">{b}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <a
          href={waLink}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-black px-6 py-3 text-[15px] font-extrabold text-white hover:bg-slate-800"
        >
          Chiedi informazioni 💬
        </a>
        <a
          href={stripeLink}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-500 px-6 py-3 text-[15px] font-extrabold text-white shadow-[0_8px_0_#1d4ed8] active:translate-y-[1px] active:shadow-[0_7px_0_#1d4ed8]"
        >
          Acquista ora 👉
        </a>
      </div>
    </div>
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
    <section className="bg-slate-50/60">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-12">
        <h3 className="mb-6 text-[26px] sm:text-[28px] font-extrabold">
          Cosa dicono gli studenti
        </h3>
        <div className="grid gap-6 md:grid-cols-3">
          {data.map((r) => (
            <div
              key={r.name}
              className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"
            >
              <div className="flex items-center  gap-4">
                {/* <img
                  src={r.img}
                  alt={r.name}
                  className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200"
                /> */}
                <div className="h-12 w-12 bg-blue-500 rounded-full"></div>
                <div>
                  <div className="font-bold">{r.name}</div>
                  <div className="text-xs text-slate-500">{r.class}</div>
                </div>
              </div>
              <div className="mt-3 text-sky-500">
                {"⭐️".repeat(r.stars)}
                <span className="ml-2 align-middle text-[12px] text-slate-500">
                  ({r.stars}.0)
                </span>
              </div>
              <p className="mt-2 text-[14.5px] text-slate-700">“{r.text}”</p>
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
    <section className="border-t border-slate-100 bg-slate-50/60">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 lg:px-12">
        <h3 className="text-[26px] sm:text-[28px] font-extrabold">
          Domande frequenti
        </h3>
        <div className="mt-5 space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl bg-white ring-1 ring-slate-200"
            >
              <summary className="cursor-pointer px-4 py-3 text-[15.5px] font-bold text-slate-800">
                {f.q}
              </summary>
              <div className="px-4 pb-4 text-[15px] text-slate-700">{f.a}</div>
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
