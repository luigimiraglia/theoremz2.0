// app/esercizi/page.tsx
export default function RisoluzioneEserciziPage() {
  return (
    <main className="bg-white text-slate-900">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-5 pt-4 pb-8 sm:px-8 lg:px-12 lg:pt-16">
          <div className="grid gap-6 md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[11px] sm:text-[12px] font-bold text-sky-700 ring-1 ring-sky-200">
                🚀 Risoluzione Veloce Esercizi
              </div>

              <h1
                className="
                  mt-3
                  font-black leading-tight
                  text-[28px] sm:text-[34px] md:text-[40px] lg:text-[48px]
                  break-words hyphens-auto
                  [text-wrap:balance]
                "
              >
                Mandaci il tuo{" "}
                <span className="bg-gradient-to-r from-sky-500 to-cyan-400 bg-clip-text text-transparent">
                  esercizio
                </span>
                , in <span className="text-sky-600">2 ore</span> ricevi la
                soluzione{" "}
                <span className="sm:whitespace-nowrap">
                  spiegata passo passo
                </span>
                .
              </h1>

              <p className="mt-3 text-[15.5px] sm:text-[16.5px] leading-relaxed text-slate-600 break-words hyphens-auto">
                Soluzione garantita al <b>100%</b> o <b>rimborso completo</b>.
                Migliaia di studenti si affidano ogni giorno al team di
                Theoremz. Scegli il pacchetto, carica la foto e ci pensiamo noi.
                Facile.
              </p>

              <ul className="mt-5 grid gap-2 text-[14.5px] sm:text-[15.5px] text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-emerald-600">✓</span>
                  <span>
                    Consegna entro <b>2 ore</b> (in media <b>42 min</b>)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-emerald-600">✓</span>
                  <span>
                    Spiegazione chiara e <b>riutilizzabile</b> per studiare
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-emerald-600">✓</span>
                  <span>Assistenza in chat se hai dubbi sulla soluzione</span>
                </li>
              </ul>

              <div className="mt-5 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:gap-3">
                <a
                  href="#pricing"
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 px-5 py-3 text-[14.5px] sm:text-[15px] font-extrabold text-white shadow-[0_7px_0_#1d4ed8] active:translate-y-[1px] active:shadow-[0_6px_0_#1d4ed8]"
                >
                  Scegli un pacchetto
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
                <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-[12px] sm:text-[13px] font-semibold text-slate-600 ring-1 ring-slate-200">
                  🔒 Pagamento sicuro • 💸 Rimborso 100%
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="border-b border-slate-100 bg-slate-50/60">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-5 py-5 sm:grid-cols-4 sm:px-8 lg:px-12">
          {[
            ["35K+ studenti", "ci hanno scelto"],
            ["< 2 ore", "tempo medio di consegna"],
            ["100% rimborso", "se non risolviamo"],
            ["Chat inclusa", "per chiarimenti"],
          ].map(([big, small]) => (
            <div
              key={big}
              className="rounded-xl bg-white px-3 py-3 text-center ring-1 ring-slate-200"
            >
              <div className="text-[16px] sm:text-[18px] font-extrabold text-slate-900">
                {big}
              </div>
              <div className="text-[12px] sm:text-[12.5px] font-semibold text-slate-500">
                {small}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section
        id="pricing"
        className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-12"
      >
        <h2 className="text-center text-[24px] sm:text-[28px] font-extrabold">
          Scegli il tuo pacchetto 👇
        </h2>

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <PlanCard
            title="Pacchetto Singolo"
            price="€5"
            cta="Acquista per €5"
            buyHref="https://buy.stripe.com/bIY9E69vl2vv7pS7sG" // <--- sostituisci col tuo link
            highlights={[
              "1 esercizio",
              "Risoluzione entro 2 ore",
              "Spiegazione passo passo",
              "Risultato corretto al 100%",
            ]}
          />
          <PlanCard
            popular
            title="Pacchetto Standard"
            price="€10"
            cta="Acquista per €10"
            buyHref="https://buy.stripe.com/5kA2bE7ndc6511u6oB" // <--- sostituisci col tuo link
            subtitle="Più scelto"
            highlights={[
              "5 esercizi",
              "Risoluzione entro 2 ore",
              "Spiegazione passo passo",
              "Risultato corretto al 100%",
            ]}
          />
          <PlanCard
            title="Pacchetto Plus"
            price="€15"
            cta="Acquista per €15"
            buyHref="https://buy.stripe.com/aEU03w6j91rr4dG5kw" // <--- sostituisci col tuo link
            highlights={[
              "10 esercizi",
              "Risoluzione entro 2 ore",
              "Spiegazione passo passo",
              "Risultato corretto al 100%",
            ]}
          />
        </div>

        {/* Urgenza */}
        <div className="mt-7 overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/70 p-5 text-center ring-1 ring-inset ring-rose-100">
          <div className="text-[16px] sm:text-[18px] font-extrabold text-rose-600">
            ⚡ Risoluzione Immediata
          </div>
          <p className="mx-auto mt-1 max-w-3xl text-[14.5px] sm:text-[15.5px] text-rose-700 break-words hyphens-auto">
            Hai bisogno di una soluzione <b>subito</b>? Con il servizio premium
            garantiamo la consegna in <b>meno di 30 minuti</b> oppure rimborso
            completo. Perfetto quando ogni minuto conta.
          </p>
          <div className="mt-3">
            <a
              href="https://buy.stripe.com/aEUg2ugXN6LL11u6oD"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-rose-500 to-rose-400 px-5 py-3 text-[14.5px] font-extrabold text-white shadow-[0_7px_0_#be123c] active:translate-y-[1px] active:shadow-[0_6px_0_#be123c]"
            >
              Compra Ora per €10
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
          </div>
        </div>
      </section>

      {/* COME FUNZIONA */}
      <section className="border-t border-slate-100 bg-slate-50/50">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-12">
          <h3 className="text-center text-[22px] sm:text-[26px] font-extrabold">
            Come funziona (in 3 step)
          </h3>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {[
              [
                "1. Carica il tuo esercizio",
                "Scatta una foto ben leggibile oppure allega il PDF.",
              ],
              [
                "2. Scegli il pacchetto",
                "Singolo, Standard o Plus. Per urgenze, usa 'Immediata'.",
              ],
              [
                "3. Ricevi la soluzione",
                "Entro 2 ore (in media 42 min) con spiegazione passo passo.",
              ],
            ].map(([h, p]) => (
              <div
                key={h}
                className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
              >
                <div className="text-[16px] sm:text-[18px] font-extrabold text-slate-900">
                  {h}
                </div>
                <p className="mt-1 text-[14px] sm:text-[15px] text-slate-600">
                  {p}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[12.5px] sm:text-[13.5px] text-slate-500">
            ✅ Se qualcosa non è chiaro, puoi scrivere in chat: ti aiutiamo a
            capire ogni passaggio.
          </p>
        </div>
      </section>

      {/* ESEMPI */}
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-12">
        <h3 className="text-center text-[22px] sm:text-[26px] font-extrabold">
          Com’è fatta la soluzione?
        </h3>
        <p className="mx-auto mt-1 max-w-3xl text-center text-[14.5px] sm:text-[15.5px] text-slate-600 break-words hyphens-auto">
          Risposte sintetiche dove serve, dettagliate dove conta. Schema,
          passaggi numerati, conclusione ed eventuali annotazioni utili a
          studiare.
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <ExampleCard title="Algebra" />
          <ExampleCard title="Geometria" />
          <ExampleCard title="Fisica" />
        </div>
      </section>

      {/* GARANZIE */}
      <section className="border-y border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-12">
          <h3 className="text-center text-[22px] sm:text-[26px] font-extrabold">
            Perché scegliere Theoremz
          </h3>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {[
              [
                "🔒 Rimborso 100%",
                "Se non risolviamo o se non sei soddisfatto della spiegazione.",
              ],
              ["⚡ SLA chiaro", "Consegna entro 2 ore (premium in < 30 min)."],
              ["💬 Supporto", "Chat inclusa per chiarimenti post-consegna."],
            ].map(([h, p]) => (
              <div
                key={h}
                className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
              >
                <div className="text-[16px] sm:text-[18px] font-extrabold text-slate-900">
                  {h}
                </div>
                <p className="mt-1 text-[14px] sm:text-[15px] text-slate-600">
                  {p}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-12">
        <h3 className="text-center text-[22px] sm:text-[26px] font-extrabold">
          Cosa dicono gli studenti
        </h3>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {[
            [
              "Alessio",
              "⭐️⭐️⭐️⭐️⭐️",
              "Ho inviato l’esercizio di algebra, soluzione chiarissima. Ho capito anche il metodo!",
            ],
            [
              "Giulia",
              "⭐️⭐️⭐️⭐️⭐️",
              "Risolto in 35 minuti con spiegazione dettagliata. Super servizio!",
            ],
            [
              "Mario",
              "⭐️⭐️⭐️⭐️⭐️",
              "Mi hanno aiutato anche dopo con due dubbi in chat. Gentilissimi.",
            ],
            [
              "Sara",
              "⭐️⭐️⭐️⭐️⭐️",
              "Ottimo per preparare le verifiche, risposte precise e ben spiegate.",
            ],
          ].map(([name, stars, body]) => (
            <div
              key={name}
              className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
            >
              <div className="flex items-center justify-between">
                <div className="font-extrabold">{name}</div>
                <div className="text-[12.5px] text-amber-500">{stars}</div>
              </div>
              <p className="mt-2 text-[14px] sm:text-[15px] text-slate-700">
                {body}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5 text-center">
          <a
            href="#pricing"
            className="inline-flex items-center justify-center rounded-xl bg-black px-5 py-3 text-[14.5px] sm:text-[15px] font-extrabold text-white transition hover:bg-slate-800"
          >
            Invia il tuo esercizio
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-slate-100 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-12">
          <h3 className="text-center text-[22px] sm:text-[26px] font-extrabold">
            Domande frequenti
          </h3>
          <div className="mx-auto mt-5 grid max-w-3xl gap-3">
            {FAQS.map((q) => (
              <details
                key={q.q}
                className="group rounded-xl bg-white shadow-xs ring-1 ring-slate-200 open:shadow-sm"
              >
                <summary className="cursor-pointer px-4 py-3 text-[14.5px] sm:text-[15.5px] font-semibold text-slate-900">
                  {q.q}
                </summary>
                <div className="px-4 pb-4 text-[14px] sm:text-[15px] text-slate-600">
                  {q.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* STICKY CTA */}
      <div className="sticky bottom-3 z-40 mx-auto max-w-6xl px-5 sm:px-8 lg:px-12">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 backdrop-blur-md shadow-lg">
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <div className="text-center text-[12.5px] sm:text-[14px] font-semibold text-slate-700">
              Pronto a ricevere la soluzione?{" "}
              <span className="text-sky-600">Consegna media 42 min</span>
            </div>
            <div className="flex gap-2">
              <a
                href="#pricing"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 px-4 py-3 text-[13.5px] sm:text-[14px] font-extrabold text-white"
              >
                Scegli un pacchetto
              </a>
              <a
                href="#checkout-immediata"
                className="inline-flex items-center justify-center rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-[13.5px] sm:text-[14px] font-extrabold text-rose-700"
              >
                ⚡ Immediata (30 min)
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER MINI */}
      <footer className="mt-8 border-t border-slate-100 py-7 text-center text-[12.5px] sm:text-[13.5px] text-slate-500">
        © {new Date().getFullYear()} Theoremz — Tutti i diritti riservati
      </footer>
    </main>
  );
}

/* ---- Components ---- */

function PlanCard({
  title,
  price,
  cta,
  highlights,
  popular,
  subtitle,
  buyHref,
}: {
  title: string;
  price: string;
  cta: string;
  highlights: string[];
  popular?: boolean;
  subtitle?: string;
  buyHref: string; // link di acquisto specifico del piano
}) {
  const isExternalBuy = /^https?:\/\//i.test(buyHref);

  return (
    <div
      className={`relative rounded-2xl bg-white p-5 ring-1 ring-slate-200 ${
        popular ? "shadow-[0_0_0_3px_rgba(59,130,246,0.25)]" : ""
      }`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sky-600 px-3 py-1 text-[11px] sm:text-[12px] font-bold text-white shadow">
          🔥 {subtitle || "Più scelto"}
        </div>
      )}

      <div className="flex items-end justify-between">
        <div>
          <h4 className="text-[16px] sm:text-[20px] font-bold text-slate-900">
            {title}
          </h4>
          <div className="mt-1 text-[24px] sm:text-[28px] font-black text-blue-600">
            {price}{" "}
            <span className="align-middle text-[12.5px] sm:text-[14px] font-semibold text-slate-500">
              una tantum
            </span>
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] sm:text-[12px] font-bold text-slate-600 ring-1 ring-slate-200">
          Consegna <span className="text-sky-600">≤ 2h</span>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {highlights.map((h) => (
          <li
            key={h}
            className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[13.5px] sm:text-[14px] font-semibold text-slate-700 ring-1 ring-slate-200"
          >
            <span className="text-emerald-600">✓</span>
            <span className="break-words hyphens-auto">{h}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5">
        <a
          href={buyHref}
          {...(isExternalBuy
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          className={`inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-[13.5px] sm:text-[14.5px] font-extrabold ${
            popular
              ? "bg-gradient-to-r from-sky-600 to-sky-500 text-white shadow-[0_7px_0_#1d4ed8] active:translate-y-[1px] active:shadow-[0_6px_0_#1d4ed8]"
              : "bg-black text-white hover:bg-slate-800"
          }`}
        >
          {cta}
        </a>
        <p className="mt-2 text-center text-[11.5px] sm:text-[12.5px] font-semibold text-slate-500">
          🔒 Sicuro • 💸 Rimborso 100% • 📦 Email con ricevuta
        </p>
      </div>
    </div>
  );
}

function ExampleCard({ title }: { title: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <div className="text-[15px] sm:text-[16px] font-extrabold">{title}</div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] sm:text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
          Esempio
        </span>
      </div>
      <div className="mt-3 rounded-lg bg-gradient-to-br from-sky-50 to-cyan-50 p-4 ring-1 ring-sky-100">
        <div className="text-[12.5px] sm:text-[13.5px] font-semibold text-slate-700">
          1) Imposta l’equazione
          <br />
          2) Applica il teorema…
          <br />
          3) Concludi con…
        </div>
        <div className="mt-3 rounded-md bg-white p-3 text-[11.5px] sm:text-[12.5px] text-slate-600 ring-1 ring-slate-200">
          <b>Conclusione:</b> la soluzione è <b>x = 3</b>. Nota: il metodo vale
          anche per…
        </div>
      </div>
    </div>
  );
}

// HeroIllo era inutilizzato ed è stato rimosso per pulizia lint

/* ---- FAQ ---- */
const FAQS = [
  {
    q: "Posso inviare foto dell’esercizio?",
    a: "Sì, basta che sia leggibile. Accettiamo anche PDF o screenshot.",
  },
  {
    q: "In quanto tempo ricevo la soluzione?",
    a: "Consegniamo entro 2 ore (spesso in 30–60 min). Con l’opzione “Immediata” garantiamo < 30 minuti.",
  },
  {
    q: "Se non capisco la spiegazione?",
    a: "Scrivi in chat: chiariremo i passaggi finché è tutto chiaro.",
  },
  {
    q: "Vale anche per fisica?",
    a: "Sì, trattiamo matematica e fisica. Se serve altro, chiedi in chat.",
  },
  {
    q: "Rimborsate davvero se non risolvete?",
    a: "Assolutamente sì. Se non risolviamo o se non sei soddisfatto, rimborso completo.",
  },
  {
    q: "Ci sono limiti al numero di richieste?",
    a: "Dipende dal pacchetto: Singolo (1), Standard (5), Plus (10). Puoi sempre acquistare altri pacchetti.",
  },
];
