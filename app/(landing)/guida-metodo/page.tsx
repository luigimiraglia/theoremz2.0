import type { Metadata } from "next";
import {
  Blocks,
  CalendarCheck2,
  FileText,
  MessageCircle,
  Mic,
  NotebookPen,
  Star,
  Timer,
} from "lucide-react";
import GuidaMetodoForm from "./GuidaMetodoForm";

export const metadata: Metadata = {
  title: "Il Metodo per il tuo primo 9 in matematica e fisica — Guida gratuita",
  description:
    "Scarica gratis la guida PDF di Theoremz: il sistema in 6 pilastri e un piano di 30 giorni per cambiare metodo di studio e alzare la media in matematica e fisica.",
  alternates: { canonical: "/guida-metodo" },
  openGraph: {
    title: "Il Metodo per il tuo primo 9 in matematica e fisica",
    description:
      "La guida gratuita in PDF usata da migliaia di studenti per cambiare metodo di studio in 30 giorni.",
    url: "https://theoremz.com/guida-metodo",
    siteName: "Theoremz",
    images: [{ url: "/metadata.png" }],
    type: "website",
    locale: "it_IT",
  },
  robots: { index: true, follow: true },
};

const bullets = [
  {
    icon: Blocks,
    title: "La caccia alle lacune",
    body: "Perché gli argomenti nuovi ti sembrano impossibili — e come sistemarlo in 3 step.",
  },
  {
    icon: Timer,
    title: "La sessione di studio perfetta",
    body: "Fare in 40 minuti quello che oggi ti richiede 2 ore.",
  },
  {
    icon: Mic,
    title: "Il test infallibile",
    body: "Scopri cosa non hai capito prima che lo scopra il prof.",
  },
  {
    icon: NotebookPen,
    title: "Il Quaderno degli Errori",
    body: "La singola abitudine che alza la media più di ogni altra.",
  },
  {
    icon: Star,
    title: "La strategia esatta per la verifica",
    body: "Dalla tecnica della stella alla presentazione che vale 1-2 voti.",
  },
  {
    icon: MessageCircle,
    title: "Non bloccarti mai all'interrogazione",
    body: "Si allena a casa, la sera prima — e funziona.",
  },
  {
    icon: CalendarCheck2,
    title: "Il piano dei 30 giorni",
    body: "Più la checklist pre-verifica da stampare e tenere sulla scrivania.",
  },
];

export default function GuidaMetodoPage() {
  return (
    <main className="bg-white text-[#0f172a]">
      {/* HERO */}
      <section className="relative overflow-hidden bg-[#05122F] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div
          className="pointer-events-none absolute -top-32 right-[-10%] h-[420px] w-[420px] rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(43,127,255,0.55), transparent 70%)",
          }}
        />

        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-20">
          <div className="flex flex-col gap-5 lg:pr-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-sky-300">
              Guida gratuita in PDF · 12 pagine
            </span>
            <h1 className="text-[2.15rem] font-black leading-[1.08] tracking-tight sm:text-[2.9rem] lg:text-[3.3rem]">
              Il metodo per il tuo primo{" "}
              <span className="text-sky-300">9</span> in matematica e fisica
            </h1>
            <p className="max-w-xl text-[1.05rem] leading-relaxed text-white/75 sm:text-lg">
              Il sistema completo usato ogni giorno da migliaia di studenti
              per cambiare metodo di studio — e media — in 30 giorni. Passo
              dopo passo, senza studiare più ore.
            </p>
            <div className="hidden flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-sm font-semibold text-white/55 lg:flex">
              <span>45.000+ studenti</span>
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <span>@theoremz__</span>
            </div>
          </div>

          <div className="lg:justify-self-end lg:self-start">
            <CoverMockup />
            <div
              id="ottieni-guida"
              className="mt-7 scroll-mt-24 rounded-[26px] border border-white/10 bg-white p-5 text-slate-900 shadow-[0_40px_90px_-40px_rgba(2,6,23,0.6)] sm:p-6"
            >
              <GuidaMetodoForm />
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="border-b border-slate-100 bg-white px-5 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">
            Studi tanto ma la media non si muove?
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
            Non sei negato. Chi prende 9 non è più intelligente di te — ha
            solo scoperto prima come si studia la matematica. Spesso studia
            anche meno ore. La differenza non è la quantità di studio: è il
            metodo. E il metodo si impara in 30 giorni.
          </p>
          <a
            href="#ottieni-guida"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563eb] via-[#2b7fff] to-[#55d4ff] px-6 py-3 text-sm font-black text-white shadow-[0_14px_30px_-14px_rgba(37,99,235,0.55)] transition hover:brightness-[1.05]"
          >
            Scarica la guida gratis →
          </a>
        </div>
      </section>

      {/* COSA C'È DENTRO */}
      <section className="bg-slate-50 px-5 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">
              Dentro la guida trovi
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Sette blocchi concreti, in ordine, ognuno pensato per essere
              applicato subito.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {bullets.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.4)] sm:p-5"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-black leading-snug text-slate-900">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <a
              href="#ottieni-guida"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563eb] via-[#2b7fff] to-[#55d4ff] px-7 py-3.5 text-sm font-black text-white shadow-[0_14px_30px_-14px_rgba(37,99,235,0.55)] transition hover:brightness-[1.05]"
            >
              Inviami la guida gratis →
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function CoverMockup() {
  const symbols = [
    { s: "∫", top: "6%", left: "10%", size: "1.6rem" },
    { s: "π", top: "16%", left: "72%", size: "1.3rem" },
    { s: "√", top: "34%", left: "6%", size: "1.4rem" },
    { s: "Δ", top: "58%", left: "80%", size: "1.7rem" },
    { s: "Ω", top: "78%", left: "14%", size: "1.5rem" },
    { s: "∑", top: "88%", left: "62%", size: "1.3rem" },
    { s: "θ", top: "46%", left: "88%", size: "1.2rem" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[270px] -rotate-2 sm:max-w-[300px]">
      <div
        className="relative aspect-[4/5.1] overflow-hidden rounded-[26px] ring-1 ring-white/10"
        style={{
          background:
            "linear-gradient(160deg, #0a1330 0%, #132a63 55%, #1c3f8f 100%)",
          boxShadow: "0 45px 90px -30px rgba(2,6,23,0.65)",
        }}
      >
        {symbols.map((sym, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="absolute select-none font-black text-white/10"
            style={{ top: sym.top, left: sym.left, fontSize: sym.size }}
          >
            {sym.s}
          </span>
        ))}

        <div className="relative z-10 flex h-full flex-col p-5">
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white">
            Theoremz.
          </div>
          <div className="mt-6 inline-flex w-fit rounded-full border border-white/25 px-2.5 py-1 text-[8.5px] font-bold uppercase tracking-wider text-white/75">
            La guida definitiva
          </div>
          <div className="mt-3 text-[1.2rem] font-black leading-[1.12] tracking-tight sm:text-[1.35rem]">
            Il Metodo per il tuo primo{" "}
            <span className="text-sky-300">9</span> in matematica e fisica
          </div>
          <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
            {["6 pilastri", "Piano 30 giorni", "Checklist"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/20 px-2 py-1 text-[7.5px] font-bold text-white/70"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-[8px] font-semibold text-white/45">
            <span>theoremz.com</span>
            <span>12 pagine</span>
          </div>
        </div>
      </div>

      <div className="absolute -right-3 -top-3 rotate-6 rounded-2xl bg-white p-2.5 shadow-[0_16px_30px_-10px_rgba(2,6,23,0.5)]">
        <FileText className="h-5 w-5 text-blue-600" />
      </div>
    </div>
  );
}
