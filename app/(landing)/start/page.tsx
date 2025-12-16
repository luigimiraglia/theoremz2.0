import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, LineChart, Sparkles, Users } from "lucide-react";

export const metadata = {
  title: "Theoremz Start — Inizia il tuo percorso in pochi clic",
  description:
    "Scopri subito il percorso migliore per studenti e genitori con tutor dedicati, metodo e risultati concreti.",
  alternates: { canonical: "/start" },
  openGraph: {
    type: "website",
    title: "Theoremz Start — Inizia il tuo percorso",
    description:
      "Strutturiamo un piano su misura per studenti e famiglie: scegli chi sei e scopri subito il percorso giusto.",
    images: [{ url: "/metadata.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Theoremz Start — Inizia il tuo percorso",
    description:
      "Strutturiamo un piano su misura per studenti e famiglie: scegli chi sei e scopri subito il percorso giusto.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
};

const inlineRocket = (
  <Image
    alt="Icona razzo"
    src="/images/rocket.webp"
    width={26}
    height={26}
    className="inline-block h-[1.15em] w-[1.15em] translate-y-[1px]"
  />
);

const inlineChat = (
  <Image
    alt="Icona chat"
    src="/images/mess.webp"
    width={24}
    height={24}
    className="inline-block h-[1.05em] w-[1.05em] translate-y-[1px]"
  />
);

const highlights = [
  {
    icon: <Sparkles className="h-4 w-4 text-sky-600" aria-hidden />,
    label: "Percorsi personalizzati per ogni livello",
  },
  {
    icon: <Users className="h-4 w-4 text-emerald-500" aria-hidden />,
    label: "+200 famiglie seguite ogni anno",
  },
];

const testimonials = [
  {
    name: "Martina, 4ª liceo scientifico",
    quote:
      "In tre mesi la media è salita a 9,7. Arrivo alle verifiche tranquilla perché so cosa devo ripassare.",
  },
  {
    name: "Giulia, maturanda",
    quote: "Risolto in 35 minuti con spiegazione dettagliata. Super servizio!",
  },
  {
    name: "Laura, mamma di Chiara",
    quote:
      "Riccardo l’ha sempre incoraggiata: ora affronta le verifiche con serenità e ci aggiorna ogni settimana.",
  },
];

const steps = [
  {
    title: "Raccontaci chi sei",
    description:
      "Studente o genitore? Inserisci livello di scuola e obiettivo: ci metti meno di un minuto.",
  },
  {
    title: "Ricevi il piano personalizzato",
    description:
      "Tutor dedicato, materiali consigliati e calendario di verifiche per partire subito con il piede giusto.",
  },
  {
    title: "Monitora i risultati",
    description:
      "Report chiari, progressi condivisi con la famiglia e possibilità di passare ai piani Black o Mentor in ogni momento.",
  },
];

export default function StartPage() {
  return (
    <main className="bg-gradient-to-br from-sky-50 to-indigo-50 text-slate-900">
      <section className="relative mx-auto max-w-md px-5 pb-14 pt-10">
        <header className="flex flex-col items-center text-center">
          <div className="relative mb-3 h-16 w-16 overflow-hidden rounded-full ring-2 ring-slate-200">
            <Image
              src="/images/logo.png"
              alt="Theoremz"
              width={128}
              height={128}
              priority
              sizes="64px"
              style={{ objectFit: "cover", width: "100%", height: "100%" }}
            />
          </div>
          <span className="text-[13px] font-semibold text-slate-500">
            👋 Ciao! Siamo Theoremz
          </span>
          <h1 className="mt-2 text-[26px] font-black leading-snug">
            🎯 Trova il percorso giusto per migliorare in matematica
          </h1>
          <p className="mt-2 max-w-sm text-[14px] font-medium text-slate-600">
            Studenti e genitori, qui capite subito da dove partire: scegliete chi siete e vi guidiamo passo passo verso risultati concreti.
          </p>
        </header>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="space-y-3 text-center">
            <p className="text-[13.5px] font-semibold text-slate-600">
              Scegli il tuo profilo: in pochi clic capiamo il percorso migliore e i consigli per partire subito.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/start-studente"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-500 px-5 py-3 text-[15px] font-extrabold text-white shadow-[0_12px_24px_-12px_rgba(14,165,233,0.8)] transition hover:from-sky-500 hover:via-sky-600 hover:to-indigo-600"
              >
                <span className="text-lg" aria-hidden>🎓</span>
                <span>Sono uno studente</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/start-genitore"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-rose-500 px-5 py-3 text-[15px] font-extrabold text-white shadow-[0_12px_24px_-12px_rgba(236,72,153,0.65)] transition hover:from-fuchsia-600 hover:to-rose-600"
              >
                <span className="text-lg" aria-hidden>👨‍👩‍👧‍👦</span>
                <span>Sono un genitore</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <p className="text-[12px] font-semibold text-slate-500">
              Solo curioso? <Link href="/" className="underline underline-offset-4 hover:text-slate-700">Accedi al sito</Link>
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {highlights.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-[13.5px] font-semibold text-slate-600 shadow-sm backdrop-blur"
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
          <h2 className="text-center text-[18px] font-extrabold text-slate-900">
            Le storie più belle{" "}
            {inlineChat}
          </h2>
          <p className="mt-2 text-center text-[13px] font-semibold text-slate-500">
            Storie reali raccolte da chat e report condivisi con le famiglie.
          </p>
          <ul className="mt-4 grid gap-3">
            {testimonials.map((testimonial) => (
              <li
                key={testimonial.name}
                className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-[13.5px] shadow-inner"
              >
                <p className="text-slate-700">“{testimonial.quote}”</p>
                <p className="mt-2 text-[12.5px] font-semibold text-slate-500">{testimonial.name}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
          <h2 className="text-center text-[18px] font-extrabold text-slate-900">
            Come funziona in pratica 🧭
          </h2>
          <ol className="mt-4 space-y-3 text-[13.5px] text-slate-600">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-[14px] font-extrabold text-white">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold text-slate-800">{step.title}</p>
                  <p className="mt-1 text-[13px] text-slate-600">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
          <h2 className="text-center text-[18px] font-extrabold text-slate-900">
            Pronti a partire? {inlineRocket}
          </h2>
          <p className="mt-2 text-center text-[13.5px] text-slate-600">
            Puoi attivare Theoremz Black o richiedere un Mentor 1:1 quando vuoi, con garanzia 100% soddisfatti o rimborsati.
          </p>
          <div className="mt-4 grid gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-[13px] text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
              Tutor dedicati attivi ogni giorno
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-[13px] text-slate-600">
              <LineChart className="h-4 w-4 text-sky-500" aria-hidden />
              Report semplici per studenti e famiglie
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-[13px] text-slate-600">
              <Users className="h-4 w-4 text-indigo-500" aria-hidden />
              Mentor 1:1 pronti quando serve un boost
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-[13px] text-slate-600">
              <Sparkles className="h-4 w-4 text-amber-500" aria-hidden />
              Garanzia 100% soddisfatti o rimborsati
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-2">
            <Link
              href="/start-studente"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-500 px-5 py-3 text-[15px] font-extrabold text-white shadow-[0_12px_24px_-12px_rgba(14,165,233,0.8)] transition hover:from-sky-500 hover:via-sky-600 hover:to-indigo-600"
            >
              <span className="text-lg" aria-hidden>🎓</span>
              <span>Sono uno studente</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/start-genitore"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-rose-500 px-5 py-3 text-[15px] font-extrabold text-white shadow-[0_12px_24px_-12px_rgba(236,72,153,0.65)] transition hover:from-fuchsia-600 hover:to-rose-600"
            >
              <span className="text-lg" aria-hidden>👨‍👩‍👧‍👦</span>
              <span>Sono un genitore</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <p className="mt-3 text-center text-[12px] font-semibold text-slate-500">
            Hai dubbi? <Link href="/contatto-rapido?source=start" className="underline underline-offset-4 hover:text-slate-700">Parla con un tutor</Link>
          </p>
        </section>
      </section>
    </main>
  );
}
