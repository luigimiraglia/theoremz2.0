import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Il Metodo Theoremz",
  alternates: { canonical: "/ilmetodotheoremz" },
};

const sections = [
  {
    id: "hero",
    title: "Il Metodo Theoremz",
    description: "Hero + promessa: qui andranno claim e posizionamento.",
  },
  {
    id: "problema",
    title: "Il problema che risolviamo",
    description: "Due righe per raccontare il contesto e l'urgenza.",
  },
  {
    id: "metodo",
    title: "Voti rossi e ripetizioni tradizionali",
    description: "Due blocchi con testo e immagine in colonna.",
  },
  {
    id: "programma",
    title: "Tre passaggi del percorso",
    description: "Sequenza di blocchi orizzontali con testo e immagine.",
  },
  {
    id: "risultati",
    title: "Il metodo passo per passo",
    description: "Titolo centrale e lista numerata.",
  },
  {
    id: "cta",
    title: "Sezione densa",
    description: "Colonna testo con elenco e immagine di supporto.",
  },
  {
    id: "offerte",
    title: "Offerte",
    description: "Card simmetriche con bottone.",
  },
  {
    id: "confronto",
    title: "Prima e dopo",
    description: "Testo discorsivo con paragrafi.",
  },
  {
    id: "piattaforma",
    title: "Piattaforma",
    description: "Feature in griglia con icone.",
  },
  {
    id: "galleria",
    title: "Galleria risultati",
    description: "Griglia immagini finali.",
  },
];

export default function MetodoTheoremzPage() {
  return (
    <main className="bg-white text-[#232323] font-semibold">
      {sections.map((section, index) => {
        const isDark = index > 1 ? index % 2 === 0 : index % 2 === 1;
        const isHero = section.id === "hero";
        const mutedText = isDark ? "text-blue-100/80" : "text-slate-600";
        const panelClass = isDark
          ? "border-white/20 bg-white/10"
          : "border-slate-200 bg-white";
        let content: ReactNode;

        if (isHero) {
          content = (
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex max-w-2xl flex-col gap-6 lg:pr-0">
                <h1 className="text-[2.2rem] font-black leading-[1.05] sm:text-[2.75rem] lg:text-[3.4rem]">
                  Con il <span className="text-[#336DFD]">METODO</span> giusto,
                  anche un voto{" "}
                  <span className="text-red-500 underline">rosso</span> diventa
                  un 10 in pagella
                </h1>
                <p className="max-w-xl text-lg font-bold italic leading-snug text-[#232323] sm:text-xl">
                  L&apos;unico sistema strutturato e testato che recupera studenti a
                  rischio e sviluppa un metodo di studio solido, risultati
                  concreti e autonomia.
                </p>
                <div className="relative z-20 mt-4 flex flex-wrap items-center gap-4">
                  <button className="rounded-2xl bg-[#336DFD] px-6 py-3 text-center text-white">
                    <span className="text-base font-bold">
                      Candidati gratuitamente
                    </span>
                    <span className="mt-1 block text-sm font-bold text-white/90">
                      E svolta il percorso scolastico di tuo figlio
                    </span>
                  </button>
                </div>
              </div>
              <div
                className="hidden min-h-[420px] w-full max-w-[52rem] bg-cover bg-center bg-no-repeat sm:block lg:min-h-[620px]"
                style={{ backgroundImage: "url('/images/avaluigis.png')" }}
                aria-label="Immagine hero"
              />
            </div>
          );
        } else if (section.id === "problema") {
          content = (
            <div className="mx-auto flex max-w-4xl flex-col items-center gap-10 text-center">
              <h2 className="max-w-3xl text-[1.85rem] font-extrabold leading-[1.05] tracking-[-0.01em] sm:text-3xl lg:text-[2.7rem]">
                <span className="text-[#336DFD]">
                  Centinaia di studenti
                </span>{" "}
                stanno ottenendo risultati che mai si sarebbero aspettati con
                questo percorso
              </h2>
              <div className="w-full overflow-hidden rounded-2xl bg-white">
                <div className="flex aspect-video w-full items-center justify-center border border-slate-200 bg-white text-sm font-semibold text-slate-500">
                  Video
                </div>
              </div>
              <div className="flex justify-center">
                <button className="rounded-2xl bg-[#336DFD] px-6 py-3 text-center text-white">
                  <span className="text-base font-bold">
                    Candidati gratuitamente
                  </span>
                  <span className="mt-1 block text-sm font-bold text-white/90">
                    E svolta il percorso scolastico di tuo figlio
                  </span>
                </button>
              </div>
            </div>
          );
        } else if (section.id === "metodo") {
          content = (
            <div className="mx-auto flex max-w-6xl flex-col gap-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <h2 className="text-3xl font-black leading-tight sm:text-4xl">
                    Voti rossi e rischio bocciatura non sono una condanna
                  </h2>
                  <div className={`mt-4 space-y-3 text-base ${mutedText}`}>
                    <p>
                      Quando gli argomenti si accumulano, lo studio diventa un
                      muro.
                    </p>
                    <p>
                      Il percorso scompone le lacune e costruisce obiettivi
                      settimanali chiari.
                    </p>
                    <p>
                      Cosi i voti tornano a salire e la sicurezza si riaccende.
                    </p>
                  </div>
                </div>
                <div className="flex-1">
                  <div
                    className={`min-h-[260px] w-full rounded-2xl border ${panelClass}`}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <h2 className="text-3xl font-black leading-tight sm:text-4xl">
                    Perche le ripetizioni tradizionali non funzionano
                  </h2>
                  <div className={`mt-4 space-y-3 text-base ${mutedText}`}>
                    <p>Un&apos;ora a settimana senza strategia non cambia il metodo.</p>
                    <p>
                      Si recupera l&apos;emergenza, ma non si costruisce autonomia.
                    </p>
                    <p>
                      Serve continuita, misurazione e correzioni costanti.
                    </p>
                  </div>
                </div>
                <div className="flex-1">
                  <div
                    className={`min-h-[260px] w-full rounded-2xl border ${panelClass}`}
                  />
                </div>
              </div>
            </div>
          );
        } else if (section.id === "programma") {
          const passaggi = [
            {
              title: "Diagnosi reale",
              body: "Capire dove si blocca lo studente, senza giudizio.",
            },
            {
              title: "Piano guidato",
              body: "Materiali mirati, esercizi chiari e calendario sostenibile.",
            },
            {
              title: "Consolidamento",
              body: "Metodo stabile che resta anche dopo le verifiche.",
            },
          ];
          content = (
            <div className="mx-auto flex max-w-6xl flex-col gap-10">
              {passaggi.map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col gap-6 lg:flex-row lg:items-center"
                >
                  <div className="flex-1">
                    <h3 className="text-2xl font-black">{item.title}</h3>
                    <p className={`mt-2 max-w-md text-base ${mutedText}`}>
                      {item.body}
                    </p>
                  </div>
                  <div className="flex-1">
                    <div
                      className={`min-h-[220px] w-full rounded-2xl border ${panelClass}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          );
        } else if (section.id === "risultati") {
          content = (
            <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
              <h2 className="text-3xl font-black leading-tight sm:text-4xl">
                Il metodo passo per passo
              </h2>
              <ol
                className={`w-full max-w-2xl list-decimal pl-6 text-left text-base ${mutedText}`}
              >
                <li>Colloquio iniziale con genitore e studente.</li>
                <li>Mappa dei buchi e degli obiettivi.</li>
                <li>Piano settimanale con esercizi mirati.</li>
                <li>Monitoraggio e feedback continuo.</li>
                <li>Simulazioni e verifica finale.</li>
              </ol>
            </div>
          );
        } else if (section.id === "cta") {
          content = (
            <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-start">
              <div className="flex-1">
                <h2 className="text-3xl font-black leading-tight sm:text-4xl">
                  Quando tuo figlio si sblocca, tutta la famiglia respira
                </h2>
                <ul
                  className={`mt-4 list-disc space-y-2 pl-5 text-base ${mutedText}`}
                >
                  <li>Programma personalizzato per ogni materia.</li>
                  <li>Tutor dedicato che segue e misura i progressi.</li>
                  <li>Schede e risorse sempre pronte.</li>
                  <li>Compiti guidati con metodo.</li>
                  <li>Simulazioni delle verifiche con correzioni.</li>
                  <li>Recupero dei prerequisiti mancanti.</li>
                  <li>Metodo di studio che resta nel tempo.</li>
                  <li>Comunicazione chiara con la famiglia.</li>
                </ul>
              </div>
              <div className="flex-1">
                <div
                  className={`min-h-[360px] w-full rounded-2xl border ${panelClass}`}
                />
              </div>
            </div>
          );
        } else if (section.id === "offerte") {
          const offers = [
            {
              title: "Percorso Essenziale",
              body: "Struttura base, obiettivi chiari e monitoraggio iniziale.",
            },
            {
              title: "Percorso Completo",
              body: "Metodo completo con tutor, materiali e simulazioni.",
            },
            {
              title: "Percorso Intensivo",
              body: "Massimo supporto per recuperi rapidi e risultati stabili.",
            },
          ];
          content = (
            <div className="mx-auto flex max-w-6xl flex-col gap-8">
              <div className="text-center">
                <h2 className="text-3xl font-black sm:text-4xl">Le offerte</h2>
                <p className={`mt-2 text-base ${mutedText}`}>
                  Scegli il percorso piu adatto alla situazione di tuo figlio.
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                {offers.map((offer) => (
                  <div
                    key={offer.title}
                    className={`flex h-full flex-col justify-between rounded-2xl border p-6 ${panelClass}`}
                  >
                    <div>
                      <h3 className="text-xl font-black">{offer.title}</h3>
                      <p className={`mt-2 text-sm ${mutedText}`}>
                        {offer.body}
                      </p>
                    </div>
                    <button className="mt-6 rounded-2xl bg-[#336DFD] px-4 py-2 text-sm font-bold text-white">
                      Candidati
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        } else if (section.id === "confronto") {
          content = (
            <div className="mx-auto flex max-w-4xl flex-col gap-6">
              <h2 className="text-3xl font-black sm:text-4xl">
                Prima e dopo il Metodo Theoremz
              </h2>
              <p className={`text-base leading-relaxed ${mutedText}`}>
                Prima: ripetizioni frammentate, studio a singhiozzo e risultati
                instabili che non reggono alla prova successiva.
              </p>
              <p className={`text-base leading-relaxed ${mutedText}`}>
                Dopo: percorso continuo, obiettivi settimanali e miglioramento
                misurabile in ogni materia.
              </p>
              <p className={`text-base leading-relaxed ${mutedText}`}>
                Non e una lezione in piu: e un metodo che cambia il modo di
                studiare.
              </p>
            </div>
          );
        } else if (section.id === "piattaforma") {
          const features = [
            {
              title: "Piano settimanale",
              body: "Sempre chiaro cosa fare e quando farlo.",
            },
            {
              title: "Esercizi guidati",
              body: "Allenamento mirato con soluzioni spiegate.",
            },
            {
              title: "Report per genitori",
              body: "Aggiornamenti semplici e comprensibili.",
            },
            {
              title: "Materiali sempre disponibili",
              body: "Schede, riassunti e mappe pronti all'uso.",
            },
            {
              title: "Chat con tutor",
              body: "Supporto rapido quando serve davvero.",
            },
            {
              title: "Simulazioni verifiche",
              body: "Allenamento realistico prima del voto.",
            },
          ];
          content = (
            <div className="mx-auto flex max-w-6xl flex-col gap-8">
              <div>
                <h2 className="text-3xl font-black sm:text-4xl">
                  La piattaforma che rende tutto semplice
                </h2>
                <p className={`mt-2 text-base ${mutedText}`}>
                  Strumenti chiari, progressi visibili e materiali sempre a
                  disposizione.
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className={`flex items-start gap-4 rounded-2xl border p-4 ${panelClass}`}
                  >
                    <div
                      className={`mt-1 h-10 w-10 rounded-full ${
                        isDark ? "bg-white/20" : "bg-slate-100"
                      }`}
                    />
                    <div>
                      <p className="text-base font-bold">{feature.title}</p>
                      <p className={`mt-1 text-sm ${mutedText}`}>
                        {feature.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        } else if (section.id === "galleria") {
          content = (
            <div className="mx-auto flex max-w-6xl flex-col gap-8">
              <div className="text-center">
                <h2 className="text-3xl font-black sm:text-4xl">
                  Risultati reali
                </h2>
                <p className={`mt-2 text-base ${mutedText}`}>
                  Una galleria di progressi che parlano da soli.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={`gallery-${idx}`}
                    className={`aspect-[4/3] w-full rounded-2xl border ${panelClass}`}
                  />
                ))}
              </div>
            </div>
          );
        } else {
          content = (
            <>
              <span
                className={
                  isDark
                    ? "text-xs font-semibold uppercase tracking-[0.3em] text-blue-200/80"
                    : "text-xs font-semibold uppercase tracking-[0.3em] text-slate-500"
                }
              >
                {`Sezione ${index + 1}`}
              </span>
              <h2 className="text-3xl font-black sm:text-4xl">
                {section.title}
              </h2>
              <p
                className={
                  isDark
                    ? "max-w-lg text-base text-blue-100/80"
                    : "max-w-lg text-base text-slate-600"
                }
              >
                {section.description}
              </p>
            </>
          );
        }
        return (
          <section
            key={section.id}
            id={section.id}
            className={`${
              section.id === "problema"
                ? "bg-white text-[#232323]"
                : isDark
                  ? "bg-[#0D277E] text-white"
                  : "bg-white text-[#232323]"
            }${isHero ? " relative overflow-hidden sm:[clip-path:polygon(0_0,100%_0,100%_82%,0_100%)]" : ""}`}
          >
            {isHero ? (
              <div
                className="absolute inset-0 z-0"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                    linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
                  `,
                  backgroundSize: "40px 40px",
                }}
              />
            ) : null}
            {isHero ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-20"
              >
                <svg
                  className="h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <line
                    x1="0"
                    y1="100"
                    x2="100"
                    y2="100"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                    className="sm:hidden"
                  />
                  <line
                    x1="0"
                    y1="100"
                    x2="100"
                    y2="82"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                    className="hidden sm:block"
                  />
                </svg>
              </div>
            ) : null}
            <div
              className={
                isHero
                  ? "relative z-10 mx-auto flex max-w-6xl flex-col gap-3 px-6 pt-6 pb-12 sm:py-8"
                  : section.id === "problema"
                    ? "mx-auto flex max-w-6xl flex-col gap-3 px-6 pt-8 pb-16 sm:pt-10 sm:pb-20"
                    : "mx-auto flex max-w-6xl flex-col gap-3 px-6 py-20 sm:py-24"
              }
            >
              {content}
            </div>
          </section>
        );
      })}
    </main>
  );
}
