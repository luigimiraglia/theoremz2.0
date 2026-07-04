import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowRight,
  Blocks,
  BookOpenCheck,
  CalendarCheck2,
  CheckCircle2,
  FileText,
  MessageCircle,
  Mic,
  NotebookPen,
  ShieldCheck,
  Star,
  Timer,
  TrendingUp,
} from "lucide-react";
import LeadMagnetForm from "./LeadMagnetForm";

export const metadata: Metadata = {
  title: "Il Metodo Theoremz per matematica e fisica | Guida gratuita",
  description:
    "Scarica gratis la guida PDF di Theoremz: il sistema completo per cambiare metodo di studio e media in 30 giorni.",
  alternates: { canonical: "/metodo-theoremz-pdf" },
  openGraph: {
    title: "Il Metodo Theoremz per alzare la media in matematica e fisica",
    description:
      "La guida gratuita in PDF per cambiare metodo di studio in 30 giorni, senza studiare più ore.",
    url: "https://theoremz.com/metodo-theoremz-pdf",
    siteName: "Theoremz",
    images: [{ url: "/images/lead-magnets/il-metodo-theoremz-cover.png" }],
    type: "website",
    locale: "it_IT",
  },
  robots: { index: true, follow: true },
};

const guideItems = [
  {
    icon: Blocks,
    title: "La caccia alle lacune",
    text: "Perché gli argomenti nuovi ti sembrano impossibili e come sistemarlo in 3 step.",
  },
  {
    icon: Timer,
    title: "La sessione di studio perfetta",
    text: "Fare in 40 minuti quello che oggi ti richiede 2 ore.",
  },
  {
    icon: Mic,
    title: "Il test infallibile",
    text: "Scoprire cosa non hai capito prima che lo scopra il prof.",
  },
  {
    icon: NotebookPen,
    title: "Il Quaderno degli Errori",
    text: "La singola abitudine che alza la media più di ogni altra.",
  },
  {
    icon: Star,
    title: "La strategia esatta per la verifica",
    text: "Dalla tecnica della stella alla presentazione che vale 1-2 voti.",
  },
  {
    icon: MessageCircle,
    title: "Mai bloccato all'interrogazione",
    text: "Si allena a casa, la sera prima, con un protocollo preciso.",
  },
  {
    icon: CalendarCheck2,
    title: "Il piano dei 30 giorni",
    text: "Con checklist pre-verifica da stampare e seguire passo dopo passo.",
  },
];

export default function MetodoTheoremzPdfPage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="bg-[#071126] text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 pb-14 pt-7 sm:px-6 sm:pb-[72px] lg:grid-cols-[1.03fr_0.97fr] lg:items-center lg:gap-12 lg:pb-20 lg:pt-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#9DD6FF]">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              Guida gratuita in PDF · 12 pagine
            </div>

            <h1 className="mt-5 text-[2.45rem] font-black leading-[1.02] tracking-tight sm:text-[3.35rem] lg:text-[4.25rem]">
              Il Metodo Theoremz per alzare la media in matematica e fisica
            </h1>

            <p className="mt-5 max-w-xl text-[1.05rem] font-semibold leading-8 text-white/[0.76] sm:text-lg">
              Il sistema completo usato ogni giorno da migliaia di studenti per
              cambiare metodo di studio - e media - in 30 giorni. Passo dopo
              passo, senza studiare più ore.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["30 giorni", "piano operativo"],
                ["12 pagine", "zero teoria inutile"],
                ["1 metodo", "per studio e verifiche"],
              ].map(([value, label]) => (
                <div
                  key={value}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3"
                >
                  <p className="text-lg font-black text-white">{value}</p>
                  <p className="mt-1 text-xs font-bold text-white/55">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            <a
              href="#ottieni-guida"
              className="mt-7 inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#336DFD] px-6 text-[15px] font-black text-white shadow-[0_18px_38px_-18px_rgba(51,109,253,0.8)] transition hover:bg-[#2559e6] lg:hidden"
            >
              Ottieni la guida
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </div>

          <div>
            <div className="mx-auto max-w-[410px] lg:ml-auto">
              <CoverPreview />
              <div
                id="ottieni-guida"
                className="mt-5 scroll-mt-8 rounded-[24px] border border-slate-200 bg-white p-5 text-slate-950 shadow-[0_32px_80px_-34px_rgba(2,6,23,0.7)] sm:p-6"
              >
                <LeadMagnetForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-100 px-5 py-14 sm:px-6 sm:py-[72px]">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600">
              <TrendingUp className="h-5 w-5" aria-hidden />
            </div>
            <h2 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">
              Studi tanto ma la media non si muove?
            </h2>
          </div>
          <p className="mt-5 text-base font-semibold leading-8 text-slate-600 sm:text-lg">
            Non sei negato. Chi prende 9 non è più intelligente di te: ha
            solo scoperto prima come si studia la matematica. Spesso studia
            anche meno ore. La differenza non è la quantità di studio: è il
            metodo. E il metodo si impara in 30 giorni.
          </p>
        </div>
      </section>

      <section className="bg-slate-50 px-5 py-14 sm:px-6 sm:py-[72px]">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#336DFD]">
              <BookOpenCheck className="h-3.5 w-3.5" aria-hidden />
              Dentro la guida trovi
            </div>
            <h2 className="mt-4 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
              Azioni precise, non consigli generici
            </h2>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guideItems.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.5)]"
              >
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EEF4FF] text-[#336DFD]">
                  <item.icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-[15px] font-black leading-snug text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  {item.text}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-9 rounded-[24px] border border-slate-200 bg-white p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
            <div className="flex gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="font-black text-slate-950">
                  PDF gratuito, inviato subito via email
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                  Compili il form, confermi il consenso e ricevi la guida in
                  allegato.
                </p>
              </div>
            </div>
            <a
              href="#ottieni-guida"
              className="mt-5 inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 sm:mt-0 sm:w-auto"
            >
              Scarica gratis
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function CoverPreview() {
  return (
    <div className="relative mx-auto w-[70vw] max-w-[260px] sm:max-w-[320px] lg:max-w-[350px]">
      <div className="absolute inset-x-5 bottom-0 h-8 translate-y-5 rounded-full bg-black/35 blur-xl" />
      <div className="relative -rotate-2 overflow-hidden rounded-[24px] border border-white/15 bg-white p-2 shadow-[0_32px_80px_-28px_rgba(0,0,0,0.8)]">
        <Image
          src="/images/lead-magnets/il-metodo-theoremz-cover.png"
          alt="Copertina della guida Il Metodo Theoremz"
          width={595}
          height={842}
          priority
          sizes="(max-width: 640px) 78vw, 350px"
          className="h-auto w-full rounded-[18px]"
        />
      </div>
      <div className="absolute -right-4 top-10 rotate-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-xl">
        <CheckCircle2 className="mr-1 inline h-4 w-4 text-emerald-600" />
        PDF pronto
      </div>
    </div>
  );
}
