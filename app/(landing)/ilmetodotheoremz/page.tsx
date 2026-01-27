import type { Metadata } from "next";
import type { ReactNode } from "react";

import CtaModalButton from "./CtaModalButton";
import TestimonianzeMobileFade from "./TestimonianzeMobileFade";

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
    id: "cta-final",
    title: "CTA finale",
    description: "Chiusura a sfondo blu con call to action.",
  },
  {
    id: "galleria",
    title: "Galleria risultati",
    description: "Griglia immagini finali.",
  },
];

const testimonianze = [
  "/images/test7.webp",
  "/images/test2.webp",
  "/images/test12.webp",
  "/images/test4.webp",
  "/images/test9.webp",
  "/images/test1.webp",
  "/images/test5.webp",
  "/images/test10.webp",
  "/images/test3.webp",
  "/images/test8.webp",
  "/images/test13.webp",
  "/images/test6.webp",
];

const testimonianzeOrizzontali = new Set([
  "/images/test3.webp",
  "/images/test5.webp",
  "/images/test12.webp",
]);

type TestimonianzaProps = {
  src: string;
  alt: string;
  className: string;
};

function Testimonianza({ src, alt, className }: TestimonianzaProps) {
  if (!testimonianzeOrizzontali.has(src)) {
    return <img src={src} alt={alt} className={`h-auto ${className}`} />;
  }

  return (
    <div
      className={`aspect-[3/4] overflow-hidden bg-black ${className}`}
      aria-label={alt}
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-contain object-center"
      />
    </div>
  );
}

export default function MetodoTheoremzPage() {
  return (
    <main className="bg-white text-[#232323] font-semibold">
      {sections.map((section, index) => {
        const isDark = index > 1 ? index % 2 === 0 : index % 2 === 1;
        const isHero = section.id === "hero";
        const isCtaFinal = section.id === "cta-final";
        const usesGrid = isHero || isCtaFinal;
        const mutedText = isDark ? "text-white/80" : "text-slate-600";
        const panelClass = isDark
          ? "border-white/20 bg-white/10"
          : "border-slate-200 bg-white";
        let content: ReactNode;

        if (isHero) {
          content = (
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex max-w-2xl flex-col gap-6 lg:pr-0">
                <h1 className="text-[2.5rem] font-black leading-[1.03] tracking-tight sm:text-[3.1rem] lg:text-[3.8rem]">
                  Con il <span className="text-[#336DFD]">METODO</span> giusto,
                  anche un voto{" "}
                  <span className="text-red-500 underline">rosso</span> diventa
                  un 10 in pagella
                </h1>
                <p className="max-w-xl text-lg font-bold italic leading-snug text-[#232323] sm:text-xl">
                  L&apos;unico sistema strutturato e testato che recupera
                  studenti a rischio e sviluppa un metodo di studio solido,
                  risultati concreti e autonomia.
                </p>
                <div className="relative z-20 mt-4 flex flex-wrap items-center gap-4">
                  <CtaModalButton className="rounded-2xl bg-[#336DFD] px-6 py-3 text-center text-white">
                    <span className="text-base font-bold">
                      Candidati gratuitamente
                    </span>
                    <span className="mt-1 block text-xs font-bold leading-snug text-white/90 sm:text-sm">
                      E svolta il percorso scolastico di tuo figlio
                    </span>
                  </CtaModalButton>
                </div>
              </div>
              <div
                className="hidden min-h-[420px] w-full max-w-[52rem] bg-cover bg-center bg-no-repeat sm:block lg:min-h-[620px]"
                style={{ backgroundImage: "url('/images/avaluigis.webp')" }}
                aria-label="Immagine hero"
              />
            </div>
          );
        } else if (section.id === "problema") {
          content = (
            <div className="mx-auto flex max-w-4xl flex-col items-center gap-10 text-center">
              <h2 className="max-w-3xl text-[1.85rem] font-extrabold leading-[1.05] tracking-[-0.01em] sm:text-3xl lg:text-[2.7rem]">
                <span className="text-[#336DFD]">Centinaia di studenti</span>{" "}
                stanno ottenendo risultati che mai si sarebbero aspettati con
                questo percorso
              </h2>
              <div className="w-full">
                <div className="w-full overflow-hidden testimonianze-fade hidden sm:block">
                  <div className="flex w-max items-center testimonianze-track">
                    <div className="flex gap-[6vw] pr-[6vw] sm:gap-4 sm:pr-4">
                    {testimonianze.map((src, idx) => (
                      <Testimonianza
                        key={`testimonianza-${idx}`}
                        src={src}
                        alt="Testimonianza"
                        className="w-[78vw] max-w-[320px] shrink-0 rounded-2xl sm:w-[200px] sm:max-w-none lg:w-[240px]"
                      />
                    ))}
                  </div>
                  <div
                    className="flex gap-[6vw] pr-[6vw] sm:gap-4 sm:pr-4"
                    aria-hidden="true"
                  >
                    {testimonianze.map((src, idx) => (
                      <Testimonianza
                        key={`testimonianza-dup-${idx}`}
                        src={src}
                        alt=""
                        className="w-[78vw] max-w-[320px] shrink-0 rounded-2xl sm:w-[200px] sm:max-w-none lg:w-[240px]"
                      />
                    ))}
                  </div>
                </div>
              </div>
                <div className="w-full sm:hidden">
                  <TestimonianzeMobileFade
                    items={testimonianze}
                    horizontalItems={[...testimonianzeOrizzontali]}
                  />
                </div>
                <style>{`
                  @-webkit-keyframes testimonianze-scroll {
                    0% {
                      -webkit-transform: translateX(0);
                      transform: translateX(0);
                    }
                    100% {
                      -webkit-transform: translateX(-50%);
                      transform: translateX(-50%);
                    }
                  }
                  @keyframes testimonianze-scroll {
                    0% {
                      transform: translateX(0);
                    }
                    100% {
                      transform: translateX(-50%);
                    }
                  }
                  .testimonianze-track {
                    display: inline-flex;
                    flex-wrap: nowrap;
                    -webkit-animation: testimonianze-scroll 28s linear infinite;
                    animation: testimonianze-scroll 28s linear infinite;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                    will-change: transform;
                  }
                  .testimonianze-track-mobile {
                    -webkit-animation-duration: 24s;
                    animation-duration: 24s;
                  }
                  .testimonianze-fade {
                    position: relative;
                    isolation: isolate;
                    --fade-size: clamp(20px, 8vw, 72px);
                  }
                  .testimonianze-fade::before,
                  .testimonianze-fade::after {
                    content: "";
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: var(--fade-size);
                    z-index: 2;
                    pointer-events: none;
                    background: linear-gradient(
                      to right,
                      #ffffff,
                      rgba(255, 255, 255, 0)
                    );
                  }
                  .testimonianze-fade::before {
                    left: 0;
                  }
                  .testimonianze-fade::after {
                    right: 0;
                    background: linear-gradient(
                      to left,
                      #ffffff,
                      rgba(255, 255, 255, 0)
                    );
                  }
                  @media (max-width: 639px) {
                    .testimonianze-track {
                      -webkit-animation-duration: 36s;
                      animation-duration: 36s;
                    }
                    .testimonianze-track-mobile {
                      -webkit-animation-duration: 26s;
                      animation-duration: 26s;
                    }
                    .testimonianze-fade {
                      --fade-size: clamp(18px, 12vw, 80px);
                    }
                  }
                  @media (prefers-reduced-motion: reduce) {
                    .testimonianze-track,
                    .testimonianze-track-mobile {
                      -webkit-animation: none;
                      animation: none;
                      -webkit-transform: translateX(0);
                      transform: translateX(0);
                    }
                  }
                  @media (min-width: 640px) {
                    .testimonianze-fade {
                      --fade-size: clamp(24px, 6vw, 96px);
                    }
                  }
                  @media (min-width: 1024px) {
                    .testimonianze-fade {
                      --fade-size: clamp(32px, 5vw, 120px);
                    }
                  }
                `}</style>
              </div>
              <div className="flex justify-center">
                <CtaModalButton className="rounded-2xl bg-[#336DFD] px-6 py-3 text-center text-white">
                  <span className="text-base font-bold">
                    Candidati gratuitamente
                  </span>
                  <span className="mt-1 block text-xs font-bold leading-snug text-white/90 sm:text-sm">
                    E svolta il percorso scolastico di tuo figlio
                  </span>
                </CtaModalButton>
              </div>
            </div>
          );
        } else if (section.id === "metodo") {
          content = (
            <div className="mx-auto flex max-w-6xl flex-col gap-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <p
                    className={`text-xl font-semibold sm:text-2xl ${mutedText}`}
                  >
                    Voti rossi si accumulano?
                  </p>
                  <h2 className="mt-3 text-[2.2rem] font-black leading-[1.05] tracking-tight sm:text-[2.8rem] lg:text-[3.1rem]">
                    Se non agisci ora sul metodo finiranno in{" "}
                    <span className="text-[#336DFD]">pagella</span>
                  </h2>
                  <br />
                  <div
                    className={`mt-4 w-full aspect-[3/4] rounded-2xl border bg-cover bg-center bg-no-repeat lg:hidden ${panelClass}`}
                    style={{ backgroundImage: "url('/images/verifica.webp')" }}
                    role="img"
                    aria-label="Immagine verifica"
                  />
                  <div
                    className={`mt-4 space-y-6 text-base leading-relaxed ${mutedText}`}
                  >
                    <p>
                      <span className="block">
                        Ogni settimana c&apos;&egrave; qualcosa da recuperare,
                        ma sembra di rincorrere sempre il problema senza mai
                        risolverlo davvero.
                      </span>
                    </p>
                    <p>
                      <span className="block">
                        Intanto cresce la preoccupazione:
                      </span>
                      <span className="block mt-2">
                        &ldquo;Sta perdendo sicurezza?&rdquo;
                      </span>
                      <span className="block mt-2">
                        &ldquo;Rischia di rimanere indietro?&rdquo;
                      </span>
                      <span className="block mt-2">
                        &ldquo;E se poi arriva la{" "}
                        <span className="font-bold text-white">bocciatura</span>
                        ?&rdquo;
                      </span>
                      <span className="block mt-3">
                        Non &egrave; solo una questione di numeri sul registro,
                        ma di serenit&agrave; in famiglia.
                      </span>
                    </p>
                    <p>
                      <span className="block">
                        E la cosa più frustrante è che, spesso, lo studente sta
                        già facendo tutto quello che può. Ma...
                      </span>
                    </p>
                  </div>
                </div>
                <div className="hidden lg:ml-12 lg:mr-8 lg:block lg:flex-none lg:w-[420px]">
                  <div
                    className={`w-full aspect-[3/4] rounded-2xl border bg-cover bg-center bg-no-repeat ${panelClass}`}
                    style={{ backgroundImage: "url('/images/verifica.webp')" }}
                    role="img"
                    aria-label="Immagine verifica"
                  />
                </div>
              </div>
              <div className="hidden lg:block h-6" aria-hidden="true" />
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1 lg:order-2">
                  <p
                    className={`text-xl font-semibold sm:text-2xl ${mutedText}`}
                  >
                    Se studia tanto, perché i voti non migliorano?
                  </p>
                  <h3 className="mt-3 text-[2.2rem] font-black leading-[1.05] tracking-tight sm:text-[2.8rem] lg:text-[3.1rem]">
                    Perché studiare da soli{" "}
                    <span className="text-[#336DFD]">peggiora</span> la
                    situazione
                  </h3>
                  <br />
                  <div
                    className={`mt-4 w-full aspect-[3/4] rounded-2xl border bg-cover bg-center bg-no-repeat lg:hidden ${panelClass}`}
                    style={{
                      backgroundImage: "url('/images/studentetriste.webp')",
                    }}
                    role="img"
                    aria-label="Immagine percorso"
                  />
                  <div
                    className={`mt-4 space-y-4 text-base leading-relaxed ${mutedText}`}
                  >
                    <p>
                      <span className="block">
                        Quando compaiono le prime insufficienze, la reazione
                        pi&ugrave; comune &egrave; sempre la stessa:
                      </span>
                      <span className="block">
                        pi&ugrave; studio, pi&ugrave; esercizi, pi&ugrave; ore
                        sui libri.
                      </span>
                    </p>
                    <p>
                      Il problema &egrave; che studiare di pi&ugrave; senza un
                      metodo non corregge l&apos;errore, lo moltiplica.
                    </p>
                    <p>Senza una guida:</p>
                    <ul className="list-disc space-y-2 pl-5">
                      <li>si ripassano argomenti sbagliati</li>
                      <li>si consolidano procedure errate</li>
                      <li>
                        le lacune restano nascoste finch&eacute; non esplodono
                        alla verifica
                      </li>
                    </ul>
                    <p>
                      <span className="block">
                        Cos&igrave; lo studio diventa una corsa continua al
                        recupero,
                      </span>
                      <span className="block">
                        e ogni voto negativo rende il successivo ancora
                        pi&ugrave; probabile.
                      </span>
                    </p>
                  </div>
                </div>
                <div className="hidden lg:block lg:order-1 lg:mr-12 lg:flex-none lg:w-[420px]">
                  <div
                    className={`w-full aspect-[3/4] rounded-2xl border bg-cover bg-center bg-no-repeat ${panelClass}`}
                    style={{
                      backgroundImage: "url('/images/studentetriste.webp')",
                    }}
                    role="img"
                    aria-label="Immagine percorso"
                  />
                </div>
              </div>
              <div className="hidden lg:block h-6" aria-hidden="true" />
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <p
                    className={`text-xl font-semibold sm:text-2xl ${mutedText}`}
                  >
                    E le ripetizioni, perché non hanno funzionato?
                  </p>
                  <h3 className="mt-3 text-[2.2rem] font-black leading-[1.05] tracking-tight sm:text-[2.8rem] lg:text-[3.1rem]">
                    <span className="text-[#336DFD]">Capire</span> un esercizio
                    non significa saperlo affrontare
                  </h3>
                  <br />
                  <div
                    className={`mt-4 w-full aspect-[3/4] rounded-2xl border bg-cover bg-center bg-no-repeat lg:hidden ${panelClass}`}
                    style={{ backgroundImage: "url('/images/verifica.webp')" }}
                    role="img"
                    aria-label="Immagine risultati"
                  />
                  <div
                    className={`mt-4 space-y-4 text-base leading-relaxed ${mutedText}`}
                  >
                    <p>
                      Se il problema fosse semplicemente “capire gli argomenti”,
                      allora la scuola{" "}
                      <span className="font-bold text-white">basterebbe</span>.
                    </p>
                    <p>Le spiegazioni non mancano:</p>
                    <ul className="list-disc space-y-2 pl-5">
                      <li>lezioni in classe</li>
                      <li>libri</li>
                      <li>esercizi assegnati</li>
                      <li>verifiche continue</li>
                    </ul>
                    <p>
                      E infatti durante le ripetizioni spesso succede questo: lo
                      studente capisce, segue, sembra tutto chiaro.
                    </p>
                    <p>
                      Il problema arriva dopo. Quando deve studiare da solo,
                      organizzarsi, affrontare esercizi diversi senza una guida.
                    </p>
                    <p>
                      Perch&eacute; spiegare non &egrave; insegnare{" "}
                      <span className="font-bold text-white">
                        come studiare
                      </span>
                      .
                    </p>
                  </div>
                </div>
                <div className="hidden lg:block lg:ml-12 lg:flex-none lg:w-[420px]">
                  <div
                    className={`w-full aspect-[3/4] rounded-2xl border bg-cover bg-center bg-no-repeat ${panelClass}`}
                    style={{ backgroundImage: "url('/images/verifica.webp')" }}
                    role="img"
                    aria-label="Immagine risultati"
                  />
                </div>
              </div>
            </div>
          );
        } else if (section.id === "programma") {
          content = (
            <div className="mx-auto flex max-w-6xl flex-col gap-0">
              <div className="text-center">
                <p className={`text-xl font-semibold sm:text-2xl ${mutedText}`}>
                  La soluzione?
                </p>
                <h3 className="mt-3 text-[2rem] font-black leading-[1.05] tracking-tight sm:text-[2.5rem] lg:text-[2.9rem]">
                  Un team di esperti che rende lo studente{" "}
                  <span className="text-[#336DFD]">autonomo</span> ed{" "}
                  <span className="text-[#336DFD]">efficace</span> nello studio
                </h3>
              </div>
              <div className="flex flex-col gap-4 lg:gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1 lg:flex-none lg:w-[520px]">
                  <div
                    className="w-full aspect-[3/4] overflow-hidden rounded-2xl bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/images/avaluigis.webp')" }}
                    role="img"
                    aria-label="Immagine introduzione"
                  />
                </div>
                <div className="flex-1 mt-6 lg:mt-20">
                  <div className="space-y-4 text-base leading-relaxed text-slate-800">
                    <p className="pb-3 text-[1.5rem] font-black leading-[1.05] tracking-tight sm:text-[1.7rem] lg:text-[1.7rem]">
                      Quando uno studente si impegna ma i risultati non
                      arrivano, il problema non è la volontà.
                    </p>
                    <p>
                      &Egrave; l&apos;assenza di una struttura che lo guidi
                      anche quando studia da solo.
                    </p>
                    <p>
                      <span className="block">
                        Senza un metodo chiaro, ogni difficolt&agrave; diventa
                        un&apos;emergenza.
                      </span>
                      <span className="block">Ogni verifica un rischio.</span>
                      <span className="block">
                        Ogni materia entra in competizione con le altre.
                      </span>
                    </p>
                    <p>
                      <span className="block">Non serve spiegare meglio.</span>
                      <span className="block">
                        Serve insegnare come organizzare lo studio, affrontare i
                        problemi e recuperare senza dipendere da qualcuno.
                      </span>
                    </p>
                    <p>&Egrave; qui che nasce il Metodo Theoremz.</p>
                  </div>
                  <div className="mt-6 flex justify-center">
                    <CtaModalButton className="rounded-2xl bg-[#336DFD] px-6 py-3 text-center text-white">
                      <span className="text-base font-bold">
                        Candidati gratuitamente
                      </span>
                      <span className="mt-1 block text-xs font-bold leading-snug text-white/90 sm:text-sm">
                        E svolta il percorso scolastico di tuo figlio
                      </span>
                    </CtaModalButton>
                  </div>
                  <div className="h-12 sm:hidden" aria-hidden="true" />
                </div>
              </div>
            </div>
          );
        } else if (section.id === "risultati") {
          const steps = [
            {
              id: "analisi",
              title: (
                <>
                  <span className="text-[#336DFD]">Analisi</span> delle
                  difficolt&agrave; reali
                </>
              ),
              body: "Individuiamo dove lo studente si blocca davvero e perché, andando oltre il singolo voto.",
            },
            {
              id: "correzione",
              title: (
                <>
                  <span className="text-[#336DFD]">Correzione</span>
                  {" dell'approccio allo studio"}
                </>
              ),
              body: "Si elimina lo studio inefficace e si costruisce un modo di lavorare lucido e ripetibile.",
            },
            {
              id: "organizzazione",
              title: (
                <>
                  <span className="text-[#336DFD]">Organizzazione</span>
                  {" strategica del tempo"}
                </>
              ),
              body: "Lo studio smette di essere caotico e viene distribuito in modo sostenibile e continuo.",
            },
            {
              id: "strumenti",
              title: (
                <>
                  Strumenti di lavoro e{" "}
                  <span className="text-[#336DFD]">schematizzazione</span>
                </>
              ),
              body: "Lo studente impara a costruire procedure e schemi per affrontare qualsiasi argomento senza confusione.",
            },
            {
              id: "guidata",
              title: (
                <>
                  Applicazione <span className="text-[#336DFD]">guidata</span> e
                  consolidamento
                </>
              ),
              body: "Si lavora su esercizi e problemi reali per rendere il metodo automatico.",
            },
            {
              id: "verifica",
              title: (
                <>
                  <span className="text-[#336DFD]">Verifica</span>
                  {" dell'autonomia"}
                </>
              ),
              body: "Testiamo se lo studente riesce ad affrontare verifiche e studio senza supporto esterno.",
            },
            {
              id: "stabile",
              title: (
                <>
                  Autonomia operativa{" "}
                  <span className="text-[#336DFD]">stabile</span>
                </>
              ),
              body: "Il metodo resta: lo studente sa organizzarsi, studiare e recuperare in modo indipendente.",
            },
          ];
          content = (
            <div className="mx-auto flex max-w-5xl flex-col items-start text-left">
              <h2 className="text-[2.4rem] font-black leading-[1.05] tracking-tight sm:text-[3.2rem] lg:text-[3.8rem]">
                Il <span className="text-[#336DFD]">Metodo Theoremz</span> e i 7
                step per costruire autonomia nello studio
              </h2>
              <div className="relative mt-10 w-full max-w-3xl">
                <div
                  className="absolute left-2 top-2 bottom-2 hidden w-[3px] rounded-full opacity-80 sm:block"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0.9) 10px, rgba(255,255,255,0.25) 10px, rgba(255,255,255,0.25) 22px)",
                    boxShadow: "0 0 12px rgba(255,255,255,0.35)",
                  }}
                  aria-hidden="true"
                />
                <div className="flex flex-col">
                  {steps.map((step, idx) => (
                    <div
                      key={step.id}
                      className="relative flex gap-6 pb-10 pl-0 last:pb-0 sm:gap-16 sm:pl-20"
                    >
                      <span
                        className="absolute left-2 top-[64px] hidden h-4 w-4 -translate-x-1/2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.6)] sm:block"
                        aria-hidden="true"
                      />
                      <span className="w-auto text-left text-[5.5rem] font-black leading-none text-white/30 tabular-nums sm:w-40 sm:text-center sm:text-[9rem] lg:w-52 lg:text-[12rem]">
                        {idx + 1}
                      </span>
                      <div className="mt-6">
                        <p className="text-xl font-bold text-white sm:text-3xl lg:text-4xl">
                          {step.title}
                        </p>
                        <p className={`mt-2 text-base ${mutedText} sm:text-xl`}>
                          {step.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        } else if (section.id === "cta") {
          content = (
            <div className="mx-auto flex w-full max-w-none flex-col items-center text-center">
              <p className="mb-2 text-[1.3rem] font-bold tracking-tight text-slate-600 sm:text-3xl">
                Da insufficienze frequenti a...
              </p>
              <h2 className="text-[2.4rem] font-black leading-[1.05] tracking-tight sm:text-[3.3rem] lg:text-[3.8rem]">
                <span className="block text-[3.6rem] font-black sm:text-[5rem] lg:text-[6rem]">
                  STUDENTE DA 9
                </span>
                <span className="block">
                  con il <span className="text-[#336DFD]">Metodo Theoremz</span>
                </span>
              </h2>
              <div className="mt-4 flex w-full flex-col items-center gap-10 lg:mt-10 lg:flex-row lg:items-stretch lg:justify-between">
                <div className="w-full lg:flex-1">
                  <div
                    className="w-full aspect-[3/4] rounded-2xl bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/images/avaluigis.webp')" }}
                    role="img"
                    aria-label="Immagine studente"
                  />
                </div>
                <div className="w-full lg:flex-1">
                  <div className="flex min-h-[380px] w-full flex-col items-center justify-between gap-10 rounded-2xl bg-[#05122F] px-6 py-10 sm:min-h-[460px] sm:px-8 sm:py-12 lg:min-h-[520px]">
                    <ul className="w-full space-y-8 text-left text-sm text-white/85 sm:text-base">
                      {[
                        {
                          title: "Consulenza iniziale strategica (1 ora)",
                          body: "Per individuare le lacune e costruire un piano di miglioramento mirato.",
                        },
                        {
                          title: "Piano di studio guidato e personalizzato",
                          body: "Per sapere sempre cosa studiare e quando, senza accumuli o corse finali.",
                        },
                        {
                          title: "Ore con insegnante incluse nel percorso",
                          body: "Per chiarire i concetti chiave nei momenti più critici.",
                        },
                        {
                          title: "Supporto continuo via WhatsApp",
                          body: "Per non restare solo quando ti blocchi su un esercizio o un argomento.",
                        },
                        {
                          title: "Verifica costante dei progressi",
                          body: "Per intervenire subito se qualcosa non funziona.",
                        },
                        {
                          title: "Accesso a oltre 150 lezioni registrate",
                          body: "Per ripassare in autonomia, senza vincoli di orario.",
                        },
                        {
                          title: "Oltre 3000 esercizi svolti e spiegati",
                          body: "Per continuare ad allenarti anche oltre i compiti scolastici.",
                        },
                        {
                          title:
                            "Riduzione progressiva della dipendenza dal tutor",
                          body: "Perché l’obiettivo è rendere lo studente autonomo, non assistito.",
                        },
                        {
                          title:
                            "Garanzia di superamento della prova concordata",
                          body: "Perché il percorso è pensato per portare risultati concreti.",
                        },
                      ].map((item) => (
                        <li key={item.title} className="flex items-start gap-3">
                          <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#336DFD] text-white">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                          <span>
                            <span className="block text-base font-bold text-white sm:text-lg">
                              {item.title}
                            </span>
                            <span className="mt-1 block text-sm text-white/75 sm:text-base">
                              {item.body}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <CtaModalButton className="mt-2 rounded-2xl bg-[#336DFD] px-6 py-3 text-center text-white">
                      <span className="text-base font-bold">
                        Candidati gratuitamente
                      </span>
                      <span className="mt-1 block text-xs font-bold leading-snug text-white/90 sm:text-sm">
                        E svolta il percorso scolastico di tuo figlio
                      </span>
                    </CtaModalButton>
                  </div>
                </div>
              </div>
            </div>
          );
        } else if (section.id === "offerte") {
          const offers = [
            {
              title: "Intervento di Recupero",
              lead: "Ideale se ci sono insufficienze o verifiche imminenti",
              details: [
                {
                  label: "Obiettivo",
                  text: "Recuperare rapidamente le lacune più critiche.",
                },
                {
                  label: "Intervento",
                  text: "Si interviene subito su metodo, organizzazione e contenuti per evitare che la situazione peggiori.",
                },
                {
                  label: "Risultato",
                  text: "Voti più stabili e situazione scolastica sotto controllo.",
                },
              ],
              cta: "\u2192 Candidati ora",
            },
            {
              title: "Percorso Quadrimestrale",
              lead: "Ideale per concludere senza brutte sorprese in pagella",
              details: [
                {
                  label: "Obiettivo",
                  text: "Risultati stabili e autonomia reale nello studio.",
                },
                {
                  label: "Percorso",
                  text: "Un percorso strutturato che elimina le difficoltà prima che sia troppo tardi.",
                },
                {
                  label: "Risultato",
                  text: "Pagella da studente modello, metodo di studio che resta.",
                },
              ],
              cta: "\u2192 Candidati ora",
            },
          ];
          content = (
            <div className="mx-auto flex max-w-6xl flex-col gap-8">
              <div className="text-center">
                <h2 className="text-3xl font-black sm:text-4xl">
                  Ogni situazione richiede un intervento diverso
                </h2>
                <p className={`mt-2 text-base ${mutedText}`}>
                  Il prossimo passo &egrave; scegliere il percorso giusto
                </p>
                <br />
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {offers.map((offer) => (
                  <div
                    key={offer.title}
                    className="flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white px-8 py-10 text-left text-slate-900 shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
                  >
                    <div>
                      <h3 className="mb-4 -mt-2 text-center text-3xl font-black leading-tight tracking-tight sm:mt-0 sm:text-4xl">
                        {offer.title}
                      </h3>
                      <p className="text-center text-base font-semibold text-slate-800">
                        {offer.lead}
                      </p>
                      <div className="mt-6 space-y-4 text-left">
                        {offer.details.map((detail) => (
                          <div key={detail.label} className="flex gap-3">
                            <span className="mt-1 flex h-6 w-6 flex-none items-center justify-center">
                              {detail.label === "Obiettivo" ? (
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-5 w-5 text-[#336DFD]"
                                  aria-hidden="true"
                                >
                                  <circle cx="12" cy="12" r="7" />
                                  <circle cx="12" cy="12" r="3" />
                                  <line x1="12" y1="2" x2="12" y2="5" />
                                  <line x1="22" y1="12" x2="19" y2="12" />
                                  <line x1="12" y1="22" x2="12" y2="19" />
                                  <line x1="2" y1="12" x2="5" y2="12" />
                                </svg>
                              ) : detail.label === "Percorso" ? (
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-5 w-5 text-[#336DFD]"
                                  aria-hidden="true"
                                >
                                  <path d="M5 4v16" />
                                  <path d="M5 5h11l-1.5 3L16 11H5" />
                                </svg>
                              ) : detail.label === "Intervento" ? (
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-5 w-5 text-[#336DFD]"
                                  aria-hidden="true"
                                >
                                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                </svg>
                              ) : detail.label === "Risultato" ? (
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-5 w-5 text-[#336DFD]"
                                  aria-hidden="true"
                                >
                                  <path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" />
                                  <path d="M6 7H4a3 3 0 0 0 3 3" />
                                  <path d="M18 7h2a3 3 0 0 1-3 3" />
                                  <path d="M10 14h4" />
                                  <path d="M9 18h6" />
                                </svg>
                              ) : (
                                <span className="h-2 w-2 rounded-full bg-[#336DFD]" />
                              )}
                            </span>
                            <div>
                              <p className="text-base font-bold text-slate-900">
                                {detail.label}
                              </p>
                              <p className="text-sm text-slate-600">
                                {detail.text}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <CtaModalButton className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-[#336DFD] px-6 py-3 text-base font-bold text-white">
                      {offer.cta}
                    </CtaModalButton>
                  </div>
                ))}
              </div>
            </div>
          );
        } else if (section.id === "confronto") {
          const confrontoItems = [
            {
              title: "Brutto voto",
              traditional: [
                "Si guarda solo il voto \u2192 non si capisce il vero problema",
              ],
              method: [
                "Analisi immediata \u2192 si individua la causa reale dell’insufficienza",
              ],
            },
            {
              title: "Reazione",
              traditional: [
                "Si cerca una spiegazione veloce \u2192 intervento casuale, senza strategia",
                "Nessuna responsabilit\u00e0 sui risultati \u2192 paghi anche se nulla cambia",
              ],
              method: [
                "Piano d’azione chiaro \u2192 ogni intervento ha un obiettivo preciso",
                "Responsabilit\u00e0 sul percorso \u2192 il metodo \u00e8 progettato per funzionare",
              ],
            },
            {
              title: "Preparazione",
              traditional: [
                "Spiegazioni identiche alla scuola \u2192 stesso approccio, stessi errori",
                "Nessun metodo di studio \u2192 lo studente resta dipendente dall’aiuto",
                "Professore percepito come giudicante \u2192 ansia e blocco",
              ],
              method: [
                "Metodo di studio strutturato \u2192 lo studente sa come affrontare gli argomenti",
                "Ambiente non giudicante \u2192 pi\u00f9 fiducia, pi\u00f9 partecipazione",
              ],
            },
            {
              title: "Verifica",
              traditional: [
                "Risultato imprevedibile \u2192 “pu\u00f2 andare bene o male”",
                "Nessun tracking \u2192 non sai cosa sta migliorando davvero",
              ],
              method: [
                "Preparazione guidata \u2192 lo studente arriva pi\u00f9 sicuro",
                "Monitoraggio continuo \u2192 sai sempre a che punto sei",
              ],
            },
            {
              title: "Nel tempo",
              traditional: [
                "Ogni difficolt\u00e0 richiede nuove ore \u2192 la dipendenza aumenta",
                "Nessun supporto tra una lezione e l’altra \u2192 i problemi si accumulano",
              ],
              method: [
                "Supporto continuo \u2192 i blocchi vengono risolti subito",
                "Metodo riutilizzabile \u2192 lo studente affronta anche nuovi argomenti",
              ],
            },
          ];
          content = (
            <div className="mx-auto flex w-full max-w-none flex-col gap-6">
              <h2 className="text-center text-[2.4rem] font-black leading-[1.05] tracking-tight sm:text-[3.3rem] lg:text-[3.8rem]">
                Non tutti gli aiuti portano
                <span className="block">
                  allo stesso{" "}
                  <span className="text-[#336DFD]">risultato...</span>
                </span>
              </h2>
              <div className="mt-4 flex w-full flex-col gap-6 md:flex-row">
                <div className="flex min-h-[280px] flex-1 flex-col rounded-3xl border border-slate-200 bg-white p-8">
                  <h3 className="text-center text-[1.75rem] font-black text-slate-900 sm:text-[2.1rem] lg:text-[2.4rem]">
                    Ripetizioni tradizionali
                  </h3>
                  <div className="mx-auto mt-4 h-px w-20 bg-slate-200 mb-4" />
                  <div className="mt-6 space-y-10">
                    {confrontoItems.map((item, index) => (
                      <div
                        key={item.title}
                        className="grid items-start gap-x-1 grid-cols-[3.5rem_1fr] sm:gap-x-2 sm:grid-cols-[4.5rem_1fr] lg:grid-cols-[5rem_1fr]"
                      >
                        <span className="text-left text-6xl font-black text-red-500/85 tabular-nums sm:text-7xl lg:text-8xl">
                          {index + 1}
                        </span>
                        <div>
                          <p className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl lg:text-4xl">
                            {item.title}
                          </p>
                          <ul className="mt-3 space-y-3 text-sm text-slate-700 sm:text-base">
                            {item.traditional.map((line) => (
                              <li key={line} className="flex items-start gap-3">
                                <span className="mt-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-500">
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  >
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                  </svg>
                                </span>
                                <span>{line}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                  <details className="group mt-auto pt-10">
                    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <p className="mb-3 text-sm font-bold text-orange-500">
                        E alla fine...
                      </p>
                      <div className="relative flex min-h-[140px] items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-center shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition-all duration-500 group-open:border-orange-200 group-open:bg-orange-50/80 group-open:shadow-[0_12px_30px_rgba(249,115,22,0.2)]">
                        <span className="pointer-events-none absolute -left-6 top-6 h-12 w-12 rounded-full bg-slate-100 transition-all duration-500 group-open:bg-orange-100" />
                        <span className="pointer-events-none absolute -right-4 bottom-4 h-10 w-10 rounded-full bg-white/70" />
                        <span className="inline-block -translate-y-6 -rotate-2 text-6xl font-black leading-none text-orange-500 transition-all duration-500 ease-out opacity-0 scale-75 group-open:translate-y-0 group-open:rotate-0 group-open:opacity-100 group-open:scale-125 sm:text-7xl">
                          5
                        </span>
                        <div className="absolute inset-0 flex items-center justify-center gap-2">
                          <span className="rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-orange-500 shadow-sm group-open:hidden">
                            Rivela il voto
                          </span>
                        </div>
                      </div>
                    </summary>
                  </details>
                </div>
                <div className="flex min-h-[280px] flex-1 flex-col rounded-3xl border border-slate-200 bg-white p-8">
                  <h3 className="text-center text-[1.75rem] font-black text-slate-900 sm:text-[2.1rem] lg:text-[2.4rem]">
                    Metodo Theoremz
                  </h3>
                  <div className="mx-auto mt-4 h-px w-20 bg-slate-200 mb-4" />
                  <div className="mt-6 space-y-10">
                    {confrontoItems.map((item, index) => (
                      <div
                        key={item.title}
                        className="grid items-start gap-x-1 grid-cols-[3.5rem_1fr] sm:gap-x-2 sm:grid-cols-[4.5rem_1fr] lg:grid-cols-[5rem_1fr]"
                      >
                        <span className="text-left text-6xl font-black text-[#336DFD]/85 tabular-nums sm:text-7xl lg:text-8xl">
                          {index + 1}
                        </span>
                        <div>
                          <p className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl lg:text-4xl">
                            {item.title}
                          </p>
                          <ul className="mt-3 space-y-3 text-sm text-slate-700 sm:text-base">
                            {item.method.map((line) => (
                              <li key={line} className="flex items-start gap-3">
                                <span className="mt-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-[#336DFD]">
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </span>
                                <span>{line}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                  <details className="group mt-auto pt-10">
                    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <p className="mb-3 text-sm font-bold text-[#336DFD]">
                        E alla fine...
                      </p>
                      <div className="relative flex min-h-[140px] items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-center shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition-all duration-500 group-open:border-blue-200 group-open:bg-blue-50/80 group-open:shadow-[0_12px_30px_rgba(59,130,246,0.18)]">
                        <span className="pointer-events-none absolute -left-6 top-6 h-12 w-12 rounded-full bg-slate-100 transition-all duration-500 group-open:bg-blue-100" />
                        <span className="pointer-events-none absolute -right-4 bottom-4 h-10 w-10 rounded-full bg-white/70" />
                        <span className="inline-block -translate-y-6 -rotate-2 text-6xl font-black leading-none text-[#336DFD] transition-all duration-500 ease-out opacity-0 scale-75 group-open:translate-y-0 group-open:rotate-0 group-open:opacity-100 group-open:scale-125 sm:text-7xl">
                          9
                        </span>
                        <div className="absolute inset-0 flex items-center justify-center gap-2">
                          <span className="rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-[#336DFD] shadow-sm group-open:hidden">
                            Rivela il voto
                          </span>
                        </div>
                      </div>
                    </summary>
                  </details>
                </div>
              </div>
            </div>
          );
        } else if (section.id === "piattaforma") {
          const features = [
            {
              title: "Supporto WhatsApp",
              body: "Quando lo studente si blocca, interveniamo subito. Cos\u00ec il problema non cresce e lo studio non si interrompe.",
              image: "/images/mocky1.webp",
            },
            {
              title: "Tracking voti",
              body: "Tutti i voti e le verifiche sono monitorati. Sai sempre se la situazione sta migliorando o no.",
              image: "/images/mocky2.webp",
            },
            {
              title: "Simulazioni verifiche",
              body: "Lo studente si allena prima della prova reale. Arriva pi\u00f9 sicuro e con meno stress.",
              image: "/images/mocky3.webp",
            },
            {
              title: "Esercizi spiegati",
              body: "Ogni esercizio mostra il ragionamento completo. Serve per allenarsi anche quando finiscono i compiti.",
              image: "/images/mocky4.webp",
            },
            {
              title: "Lezioni on-demand",
              body: "Per ripassare gli argomenti quando serve. Senza dipendere dagli orari di qualcuno.",
              image: "/images/mocky5.webp",
            },
            {
              title: "Materiali guidati",
              body: "Schemi, procedure e checklist operative. Per sapere sempre come partire e non bloccarsi.",
              image: "/images/mocky6.webp",
            },
          ];
          content = (
            <div className="mx-auto flex max-w-6xl flex-col gap-10">
              <div className="text-center">
                <h2 className="text-[2.4rem] font-black leading-[1.05] tracking-tight sm:text-[3.3rem] lg:text-[3.8rem]">
                  La piattaforma che rende
                  <span className="block">
                    lo studio <span className="text-[#336DFD]">semplice</span>
                  </span>
                </h2>
              </div>
              <div className="grid gap-10 md:grid-cols-2">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className={`flex h-full flex-col overflow-hidden rounded-3xl border ${panelClass}`}
                  >
                    <div
                      className={`h-64 w-full overflow-hidden sm:h-72 ${
                        isDark ? "bg-white/10" : "bg-slate-100"
                      }`}
                    >
                      <img
                        src={feature.image}
                        alt={feature.title}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-6 text-center">
                      <p
                        className={`text-2xl font-black sm:text-3xl ${
                          isDark ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {feature.title}
                      </p>
                      <p
                        className={`text-base ${
                          isDark ? "text-white/75" : "text-slate-600"
                        }`}
                      >
                        {feature.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center">
                <CtaModalButton className="rounded-2xl bg-[#336DFD] px-6 py-3 text-center text-white">
                  <span className="text-base font-bold">
                    Candidati gratuitamente
                  </span>
                  <span className="mt-1 block text-xs font-bold leading-snug text-white/90 sm:text-sm">
                    E svolta il percorso scolastico di tuo figlio
                  </span>
                </CtaModalButton>
              </div>
            </div>
          );
        } else if (section.id === "supporto") {
          content = (
            <div className="mx-auto flex max-w-6xl flex-col gap-6">
              <h2 className="text-[2.2rem] font-black leading-[1.05] tracking-tight sm:text-[3rem] lg:text-[3.4rem]">
                Una direzione chiara per lo studio
              </h2>
              <p className="max-w-3xl text-base text-slate-600 sm:text-lg">
                Quando c&apos;&egrave; un metodo, lo studente sa cosa fare ogni
                settimana, la famiglia vede i progressi e ogni verifica viene
                preparata con anticipo.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  "Obiettivi settimanali chiari e realistici.",
                  "Feedback costante su voti e lacune.",
                  "Supporto continuo tra una lezione e l&apos;altra.",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 sm:text-base"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          );
        } else if (section.id === "cta-final") {
          content = (
            <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center">
              <h2 className="text-[2.4rem] font-black leading-[1.05] tracking-tight sm:text-[3.3rem] lg:text-[3.8rem]">
                <span className="text-[#336DFD]">Agisci</span> prima di leggerlo
                in pagella
              </h2>
              <p className="max-w-none text-[1.4rem] font-semibold text-slate-700 sm:text-[1.8rem] lg:text-[2rem]">
                Ogni verifica ignorata rende il problema pi&ugrave; grande
              </p>
              <CtaModalButton className="cta-breathe rounded-2xl bg-[#336DFD] px-10 py-4 text-center text-lg font-bold text-white sm:text-xl">
                Candidati gratuitamente
              </CtaModalButton>
            </div>
          );
        } else if (section.id === "galleria") {
          content = (
            <div className="mx-auto flex max-w-6xl flex-col gap-8">
              <div className="text-center">
                <h2 className="text-3xl font-black sm:text-4xl">
                  Altri risultati dei nostri studenti
                </h2>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                {testimonianze.map((src, idx) => (
                  <Testimonianza
                    key={`gallery-${idx}`}
                    src={src}
                    alt={`Testimonianza ${idx + 1}`}
                    className="w-[80vw] max-w-[320px] rounded-2xl sm:w-[200px] sm:max-w-none lg:w-[240px]"
                  />
                ))}
              </div>
              <div className="mt-10 flex justify-center">
                <CtaModalButton className="rounded-2xl bg-[#336DFD] px-6 py-3 text-center text-white">
                  <span className="text-base font-bold">
                    Candidati gratuitamente
                  </span>
                  <span className="mt-1 block text-xs font-bold leading-snug text-white/90 sm:text-sm">
                    E svolta il percorso scolastico di tuo figlio
                  </span>
                </CtaModalButton>
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
                ? "bg-white text-[#232323] overflow-hidden"
                : section.id === "galleria"
                  ? "bg-white text-[#232323]"
                  : isCtaFinal
                  ? "bg-white text-[#232323] relative overflow-hidden"
                  : isDark
                  ? "bg-[#05122F] text-white"
                  : "bg-white text-[#232323]"
            }${isHero ? " relative overflow-hidden sm:[clip-path:polygon(0_0,100%_0,100%_82%,0_100%)]" : ""}`}
          >
            {usesGrid ? (
              <div
                className="absolute inset-0 z-0"
                style={{
                  backgroundColor: "#eff6ff",
                  backgroundImage: `
                    linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                    linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
                  `,
                  backgroundSize: "40px 40px",
                }}
              />
            ) : null}
            {isCtaFinal ? (
              <div className="absolute inset-x-0 bottom-0 z-0 h-[2px] bg-slate-300/80" />
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
                    : section.id === "cta-final"
                      ? "relative z-10 mx-auto flex max-w-6xl flex-col gap-3 px-4 py-20 sm:px-6 sm:py-24"
                    : section.id === "programma"
                      ? "mx-auto flex max-w-6xl flex-col gap-3 px-6 pt-12 pb-0 sm:pt-24 sm:pb-0"
                    : section.id === "confronto"
                      ? "mx-auto flex max-w-6xl flex-col gap-3 px-6 pt-12 pb-20 sm:py-24"
                    : section.id === "cta"
                      ? "mx-auto flex max-w-6xl flex-col gap-3 px-6 pt-12 pb-20 sm:py-24"
                    : section.id === "piattaforma"
                      ? "mx-auto flex max-w-6xl flex-col gap-3 px-6 pt-12 pb-20 sm:py-24"
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
