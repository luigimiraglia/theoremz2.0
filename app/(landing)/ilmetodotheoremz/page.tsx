import type { Metadata } from "next";
import type { ReactNode } from "react";
import CtaModalButton from "./CtaModalButton";

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
                    <span className="mt-1 block text-sm font-bold text-white/90">
                      E svolta il percorso scolastico di tuo figlio
                    </span>
                  </CtaModalButton>
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
          const testimonianze = [
            "/images/test1.jpeg",
            "/images/test2.jpeg",
            "/images/test3.png",
            "/images/test4.png",
            "/images/test6.png",
            "/images/test7.png",
            "/images/test8.png",
            "/images/test9.png",
            "/images/test10.png",
            "/images/test11.png",
          ];
          content = (
            <div className="mx-auto flex max-w-4xl flex-col items-center gap-10 text-center">
              <h2 className="max-w-3xl text-[1.85rem] font-extrabold leading-[1.05] tracking-[-0.01em] sm:text-3xl lg:text-[2.7rem]">
                <span className="text-[#336DFD]">Centinaia di studenti</span>{" "}
                stanno ottenendo risultati che mai si sarebbero aspettati con
                questo percorso
              </h2>
              <div className="w-full overflow-hidden testimonianze-fade">
                <div className="flex w-max items-center testimonianze-track">
                  <div className="flex gap-[10vw] pr-[10vw] sm:gap-4 sm:pr-4">
                    {testimonianze.map((src, idx) => (
                      <img
                        key={`testimonianza-${idx}`}
                        src={src}
                        alt="Testimonianza"
                        className="h-auto w-[80vw] max-w-[320px] shrink-0 rounded-2xl sm:w-[200px] sm:max-w-none lg:w-[240px]"
                      />
                    ))}
                  </div>
                  <div
                    className="flex gap-[10vw] pr-[10vw] sm:gap-4 sm:pr-4"
                    aria-hidden="true"
                  >
                    {testimonianze.map((src, idx) => (
                      <img
                        key={`testimonianza-dup-${idx}`}
                        src={src}
                        alt=""
                        className="h-auto w-[80vw] max-w-[320px] shrink-0 rounded-2xl sm:w-[200px] sm:max-w-none lg:w-[240px]"
                      />
                    ))}
                  </div>
                </div>
                <style>{`
                  @keyframes testimonianze-scroll {
                    0% {
                      transform: translateX(0);
                    }
                    100% {
                      transform: translateX(-50%);
                    }
                  }
                  .testimonianze-track {
                    animation: testimonianze-scroll 28s linear infinite;
                  }
                  .testimonianze-fade {
                    -webkit-mask-image: linear-gradient(
                      to right,
                      transparent,
                      black 2%,
                      black 98%,
                      transparent
                    );
                    mask-image: linear-gradient(
                      to right,
                      transparent,
                      black 2%,
                      black 98%,
                      transparent
                    );
                  }
                  @media (max-width: 639px) {
                    .testimonianze-track {
                      animation-duration: 36s;
                    }
                  }
                  @media (prefers-reduced-motion: reduce) {
                    .testimonianze-track {
                      animation: none;
                      transform: translateX(0);
                    }
                  }
                  @media (min-width: 640px) {
                    .testimonianze-fade {
                      -webkit-mask-image: linear-gradient(
                        to right,
                        transparent,
                        black 6%,
                        black 94%,
                        transparent
                      );
                      mask-image: linear-gradient(
                        to right,
                        transparent,
                        black 6%,
                        black 94%,
                        transparent
                      );
                    }
                  }
                  @media (min-width: 1024px) {
                    .testimonianze-fade {
                      -webkit-mask-image: linear-gradient(
                        to right,
                        transparent,
                        black 8%,
                        black 92%,
                        transparent
                      );
                      mask-image: linear-gradient(
                        to right,
                        transparent,
                        black 8%,
                        black 92%,
                        transparent
                      );
                    }
                  }
                `}</style>
              </div>
              <div className="flex justify-center">
                <CtaModalButton className="rounded-2xl bg-[#336DFD] px-6 py-3 text-center text-white">
                  <span className="text-base font-bold">
                    Candidati gratuitamente
                  </span>
                  <span className="mt-1 block text-sm font-bold text-white/90">
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
                    style={{ backgroundImage: "url('/images/verifica.png')" }}
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
                    style={{ backgroundImage: "url('/images/verifica.png')" }}
                    role="img"
                    aria-label="Immagine verifica"
                  />
                </div>
              </div>
              <br />
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
                <div className="flex-1 lg:order-1 lg:mr-12 lg:flex-none lg:w-[420px]">
                  <div
                    className={`w-full aspect-[3/4] rounded-2xl border bg-cover bg-center bg-no-repeat ${panelClass}`}
                    style={{
                      backgroundImage: "url('/images/studentetriste.png')",
                    }}
                    role="img"
                    aria-label="Immagine percorso"
                  />
                </div>
              </div>
              <br />
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
                <div className="flex-1 lg:ml-12 lg:flex-none lg:w-[420px]">
                  <div
                    className={`w-full aspect-[3/4] rounded-2xl border bg-cover bg-center bg-no-repeat ${panelClass}`}
                    style={{ backgroundImage: "url('/images/verifica.png')" }}
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
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1 lg:flex-none lg:w-[520px]">
                  <div
                    className="w-full aspect-[3/4] overflow-hidden rounded-2xl bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/images/avaluigis.png')" }}
                    role="img"
                    aria-label="Immagine introduzione"
                  />
                </div>
                <div className="flex-1 mt-20">
                  <div className="space-y-4 text-base leading-relaxed text-slate-800">
                    <p className="pb-3 text-[1rem] font-black leading-[1.05] tracking-tight sm:text-[1.7rem] lg:text-[1.7rem]">
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
                      <span className="mt-1 block text-sm font-bold text-white/90">
                        E svolta il percorso scolastico di tuo figlio
                      </span>
                    </CtaModalButton>
                  </div>
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
              <h2 className="text-[2.6rem] font-black leading-[1.05] tracking-tight sm:text-[3.2rem] lg:text-[3.8rem]">
                Il <span className="text-[#336DFD]">Metodo Theoremz</span> e i 7
                step per costruire autonomia nello studio
              </h2>
              <div className="relative mt-10 w-full max-w-3xl">
                <div
                  className="absolute left-2 top-2 bottom-2 w-[3px] rounded-full opacity-80"
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
                      className="relative flex gap-16 pb-10 pl-20 last:pb-0"
                    >
                      <span
                        className="absolute left-2 top-[64px] h-4 w-4 -translate-x-1/2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.6)]"
                        aria-hidden="true"
                      />
                      <span className="w-32 text-center text-[6.5rem] font-black leading-none text-white/30 tabular-nums sm:w-40 sm:text-[9rem] lg:w-52 lg:text-[12rem]">
                        {idx + 1}
                      </span>
                      <div className="mt-6">
                        <p className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
                          {step.title}
                        </p>
                        <p className={`mt-2 text-lg ${mutedText} sm:text-xl`}>
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
              <p className="mb-2 text-2xl font-bold tracking-tight text-slate-600 sm:text-3xl">
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
              <div className="mt-10 flex w-full flex-col items-center gap-10 lg:flex-row lg:items-stretch lg:justify-between">
                <div className="w-full lg:flex-1">
                  <div
                    className="w-full aspect-[3/4] rounded-2xl bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/images/avaluigis.png')" }}
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
                      <span className="mt-1 block text-sm font-bold text-white/90">
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
                      <h3 className="text-center text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                        {offer.title}
                      </h3>
                      <p className="mt-3 text-center text-base font-semibold text-slate-800">
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
                "Si va di fretta \u2192 analisi superficiale del problema",
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
                <div className="min-h-[280px] flex-1 rounded-3xl border border-slate-200 bg-white p-8">
                  <h3 className="text-center text-[1.75rem] font-black text-slate-900 sm:text-[2.1rem] lg:text-[2.4rem]">
                    Ripetizioni tradizionali
                  </h3>
                  <div className="mx-auto mt-8 h-px w-20 bg-slate-200 mb-8" />
                  <div className="mt-6 space-y-10">
                    {confrontoItems.map((item, index) => (
                      <div
                        key={item.title}
                        className="grid items-start gap-x-2 grid-cols-[4rem_1fr] sm:grid-cols-[4.5rem_1fr] lg:grid-cols-[5rem_1fr]"
                      >
                        <span className="text-left text-6xl font-black text-red-500/85 tabular-nums sm:text-7xl lg:text-8xl">
                          {index + 1}
                        </span>
                        <div>
                          <p className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl lg:text-4xl">
                            {item.title}
                          </p>
                          <ul className="mt-3 space-y-3 text-base text-slate-700 sm:text-lg">
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
                </div>
                <div className="min-h-[280px] flex-1 rounded-3xl border border-slate-200 bg-white p-8">
                  <h3 className="text-center text-[1.75rem] font-black text-slate-900 sm:text-[2.1rem] lg:text-[2.4rem]">
                    Metodo Theoremz
                  </h3>
                  <div className="mx-auto mt-8 h-px w-20 bg-slate-200 mb-8" />
                  <div className="mt-6 space-y-10">
                    {confrontoItems.map((item, index) => (
                      <div
                        key={item.title}
                        className="grid items-start gap-x-2 grid-cols-[4rem_1fr] sm:grid-cols-[4.5rem_1fr] lg:grid-cols-[5rem_1fr]"
                      >
                        ri{" "}
                        <span className="text-left text-6xl font-black text-[#336DFD]/85 tabular-nums sm:text-7xl lg:text-8xl">
                          {index + 1}
                        </span>
                        <div>
                          <p className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl lg:text-4xl">
                            {item.title}
                          </p>
                          <ul className="mt-3 space-y-3 text-base text-slate-700 sm:text-lg">
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
                </div>
              </div>
              <div className="mt-12 w-full">
                <details className="group mx-auto w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-black text-slate-900 [&::-webkit-details-marker]:hidden">
                    <span>Alla fine... rivela il voto</span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition group-open:bg-slate-900 group-open:text-white">
                      Rivela
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 transition group-open:rotate-180"
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </summary>
                  <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                      <p className="text-sm font-semibold text-red-600">
                        Ripetizioni tradizionali
                      </p>
                      <p className="mt-4 text-6xl font-black text-red-500">5</p>
                    </div>
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center">
                      <p className="text-sm font-semibold text-[#336DFD]">
                        Metodo Theoremz
                      </p>
                      <p className="mt-4 text-6xl font-black text-[#336DFD]">
                        9
                      </p>
                    </div>
                  </div>
                </details>
              </div>
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
                  La piattaforma che rende lo studio semplice
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
                ? "bg-white text-[#232323] overflow-hidden"
                : isDark
                  ? "bg-[#05122F] text-white"
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
                    : section.id === "programma"
                      ? "mx-auto flex max-w-6xl flex-col gap-3 px-6 pt-20 pb-0 sm:pt-24 sm:pb-0"
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
