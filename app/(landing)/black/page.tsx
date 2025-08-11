// app/black/page.tsx
export default function BlackPage() {
  return (
    <main className="bg-black text-white">
      {/* ... HERO / INTRO / INCLUDE identici alla versione precedente ... */}

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

      {/* ... FAQ / REVIEWS identici alla versione precedente ... */}
    </main>
  );
}

/* ---------- components ---------- */
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

/* ---------- (resto: IncludeCard, HeroIllo, FAQS) rimangono invariati ---------- */
