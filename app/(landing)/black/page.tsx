// app/black/page.tsx
export default function BlackPage() {
  return (
    <main className="bg-black text-white">
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
          <a className="text-sky-400 underline-offset-2 hover:underline">
            Theoremz Black
          </a>{" "}
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
              <div className="h-full rounded-2xl bg-gradient-to-r from-sky-500 to-sky-400 px-6 py-8 text-center text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black">
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
            <div className="rounded-xl bg-emerald-500 py-2 text-center font-bold text-black">
              Il più economico 👇
            </div>
            <div className="mt-2 rounded-xl bg-white py-2 text-center font-bold text-slate-900">
              Piano Essential
            </div>

            <PriceCard
              price="3,90€"
              unit="/mese"
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
            <div className="rounded-xl bg-fuchsia-500 py-2 text-center font-bold text-black">
              Il più venduto 👇
            </div>
            <div className="mt-2 rounded-xl bg-white py-2 text-center font-bold text-slate-900">
              Piano Base
            </div>

            <PriceCard
              price="6,90€"
              unit="/mese"
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
            <div className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 py-2 text-center font-bold text-black">
              Il più conveniente 👇
            </div>
            <div className="mt-2 rounded-xl bg-white py-2 text-center font-bold text-slate-900">
              Annuale
            </div>

            <PriceCard
              price="64,90€"
              unit="/anno"
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
          {FAQS.map((q) => (
            <details
              key={q}
              className="group rounded-xl bg-white text-slate-900 open:shadow-sm transition"
            >
              <summary className="cursor-pointer px-4 py-3 text-[16px] font-semibold">
                ▶ {q}
              </summary>
              <div className="px-4 pb-4 text-[15px] text-slate-700">
                Risposta sintetica: sì, ricevi supporto rapido con materiali
                verificati.
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ============ REVIEWS (box centrato) ============ */}
      <section className="mx-auto mb-16 max-w-6xl px-5 sm:px-8 lg:px-12">
        <h3 className="text-center text-[26px] sm:text-[28px] lg:text-[32px] font-extrabold">
          Cosa Dicono di Noi
        </h3>
        <div className="mx-auto mt-6 max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/80">
          {/* Inserisci qui il tuo widget recensioni (Senja/altro) */}
          <p className="text-[15px]">Widget recensioni</p>
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
}: {
  price: string;
  unit: string;
  features: [variant: "ok" | "no" | "pink", text: string][];
}) {
  return (
    <div className="mt-3 rounded-2xl bg-white text-slate-900 shadow-sm ring-1 ring-slate-200">
      <div className="px-6 py-6 lg:px-8 lg:py-8">
        <div className="text-[40px] lg:text-[44px] font-extrabold text-sky-500">
          {price}
          <span className="ml-2 align-middle text-[24px] lg:text-[26px] font-bold text-slate-700">
            {unit}
          </span>
        </div>

        <ul className="mt-5 grid gap-3 text-[15px] lg:text-[15.5px]">
          {features.map(([variant, text], i) => {
            const color =
              variant === "no"
                ? "text-rose-500"
                : variant === "pink"
                  ? "text-fuchsia-500"
                  : "text-emerald-600";
            const strike = variant === "no";

            return (
              <li key={i} className="flex items-start gap-2">
                <span className={`mt-0.5 ${color}`}>
                  {variant === "no" ? "✗" : "✓"}
                </span>
                <span
                  className={`${strike ? "line-through text-slate-400" : "text-slate-800"}`}
                >
                  {text}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <a
            href="#"
            className="rounded-xl bg-black px-4 py-3 text-center font-bold text-white transition hover:bg-slate-800"
          >
            Chiedi informazioni 💬
          </a>
          <a
            href="#"
            className="rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 px-4 py-3 text-center font-extrabold text-black transition hover:from-sky-500 hover:to-sky-400"
          >
            Acquista ora 👉
          </a>
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
  "L'assistenza è illimitata?",
  "L'assistenza è attiva il weekend?",
  "A che ora si può contattare l'assistenza?",
  "Tutto questo vale per matematica e fisica?",
  "È anche per studenti delle medie?",
  "Vorrei abbonarmi con un amico, è possibile avere uno sconto?",
  "Che qualifiche hanno gli insegnanti?",
  "In cosa consiste l'aiuto compiti?",
  "E se provo e non sono convinto?",
  "Posso cancellare l'abbonamento in qualsiasi momento?",
];
