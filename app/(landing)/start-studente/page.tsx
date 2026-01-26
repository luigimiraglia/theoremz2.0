import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";

export const metadata = {
  title: "Theoremz Start Studente — Migliora in matematica partendo da dove sei",
  description:
    "Percorsi personalizzati, tutor via chat e risorse premium per studenti che vogliono portare la matematica al livello successivo.",
  alternates: { canonical: "/start-studente" },
  openGraph: {
    type: "website",
    title: "Theoremz Start Studente",
    description:
      "Lezioni chiare, esercizi guidati e tutor che risponde ogni giorno per arrivare al 10 in matematica.",
    images: [{ url: "/metadata.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Theoremz Start Studente",
    description:
      "Lezioni chiare, esercizi guidati e tutor che risponde ogni giorno per arrivare al 10 in matematica.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
};

type Action = {
  href: string;
  label: string;
  emoji?: ReactNode;
  gradient: string;
  hover: string;
  shadow: string;
  variant: "primary" | "secondary";
};

type Highlight = {
  icon: ReactNode;
  title: string;
  description: string;
};

type Testimonial = {
  name: string;
  track: string;
  quote: string;
};

type Faq = {
  question: string;
  answer: string;
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

const inlineCheck = (
  <Image
    alt="Icona check"
    src="/images/check.webp"
    width={22}
    height={22}
    className="inline-block h-[1.05em] w-[1.05em] translate-y-[1px]"
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

const actions: Action[] = [
  {
    href: "/start-studente/form",
    label: "Fai il quiz da 1 minuto",
    emoji: inlineRocket,
    gradient: "from-sky-400 via-sky-500 to-indigo-500",
    hover: "hover:from-sky-500 hover:via-sky-600 hover:to-indigo-600",
    shadow: "shadow-[0_12px_24px_-12px_rgba(14,165,233,0.8)]",
    variant: "primary",
  },
  {
    href: "/black",
    label: "Abbonati a Theoremz Black",
    emoji: "",
    gradient: "from-fuchsia-500 to-rose-500",
    hover: "hover:from-fuchsia-600 hover:to-rose-600",
    shadow: "shadow-[0_12px_24px_-12px_rgba(236,72,153,0.65)]",
    variant: "secondary",
  },
  {
    href: "/ilmetodotheoremz",
    label: "Lavora 1:1 con un Mentor",
    emoji: "",
    gradient: "from-amber-400 via-orange-500 to-rose-500",
    hover: "hover:from-amber-500 hover:via-orange-600 hover:to-rose-600",
    shadow: "shadow-[0_12px_24px_-12px_rgba(249,115,22,0.55)]",
    variant: "secondary",
  },
];

const highlights: Highlight[] = [
  {
    icon: <Sparkles className="h-4 w-4 text-sky-500" aria-hidden />,
    title: "Metodo su misura",
    description:
      "Partiamo dai tuoi voti e dal calendario delle verifiche per costruire un piano realistico che ti fa crescere ogni settimana.",
  },
  {
    icon: <MessageCircle className="h-4 w-4 text-emerald-500" aria-hidden />,
    title: "Tutor sempre con te",
    description:
      "Scrivi quando vuoi: ti rispondiamo con spiegazioni, audio, schemi e incoraggiamento prima di ogni verifica.",
  },
  {
    icon: <CheckCircle2 className="h-4 w-4 text-indigo-500" aria-hidden />,
    title: "Esercizi spiegati",
    description:
      "Invia la foto del problema, ricevi subito il procedimento commentato passo passo e un recap da ripassare.",
  },
  {
    icon: <ShieldCheck className="h-4 w-4 text-amber-500" aria-hidden />,
    title: "Garanzia totale",
    description:
      "Su ogni piano hai 100% soddisfatti o rimborsati: se non fa per te, ti rimborsiamo subito.",
  },
];

const testimonials: Testimonial[] = [
  {
    name: "Giulia, maturanda",
    track: "Theoremz Black",
    quote:
      "Risolto in 35 minuti con spiegazione dettagliata. Super servizio!",
  },
  {
    name: "Marco, 5ª liceo scientifico",
    track: "Supporto chat",
    quote:
      "Mi hanno aiutato anche dopo con due dubbi in chat. Gentilissimi.",
  },
  {
    name: "Luca, 3ª liceo scientifico",
    track: "Percorso personalizzato",
    quote:
      "In tre mesi sono passato da 6 a 9,88 in matematica. Ora capisco come prepararmi alle interrogazioni.",
  },
];

const faqs: Faq[] = [
  {
    question: "Come funziona la garanzia soddisfatti o rimborsati?",
    answer:
      "Hai 100% soddisfatti o rimborsati: se il percorso non fa per te, basta comunicarlo entro 14 giorni e rimborsiamo subito.",
  },
  {
    question: "Posso chiedere aiuto per i compiti?",
    answer:
      "Sì, invii una foto o un PDF dell&apos;esercizio e ricevi la soluzione spiegata passo passo, pronta da ripassare.",
  },
  {
    question: "Serve installare qualcosa?",
    answer:
      "No, accedi da browser o dalla web app: tutto il materiale e la chat sono già organizzati per te.",
  },
  {
    question: "Posso passare a Theoremz Black più avanti?",
    answer:
      "Certo, puoi attivare l&apos;abbonamento quando vuoi. Il tutor ti avvisa se è il momento giusto per fare il salto.",
  },
];

const progressChecks: Array<[string, ReactNode]> = [
  ["Allenamenti guidati ogni settimana", inlineCheck],
  ["Report voto e media sempre aggiornati", "📊"],
  ["Chat con tutor e reminder verifiche", inlineChat],
  ["Garanzia 100% soddisfatti o rimborsati", "🛡️"],
];

export default function StartStudentePage() {
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
          <span className="text-[13px] font-semibold text-slate-500">🎒 Pronto a fare il salto di qualità?</span>
          <h1 className="mt-2 text-[26px] font-black leading-snug">
            Porta la matematica al livello che meriti
          </h1>
          <p className="mt-2 max-w-sm text-[14px] font-medium text-slate-600">
            Ti aiutiamo a organizzare studio, verifiche e compiti: scegli come vuoi iniziare e capiamo subito il percorso giusto per te.
          </p>
        </header>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
          <p className="text-center text-[13.5px] font-semibold text-slate-600">
            Scegli l&apos;opzione che preferisci: puoi cambiare quando vuoi.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {actions.map((action) => (
              <ActionButton key={action.href} action={action} />
            ))}
          </div>
          <p className="mt-3 text-center text-[12px] font-semibold text-slate-500">
            Solo curioso? <Link href="/" className="underline underline-offset-4 hover:text-slate-700">Accedi al sito</Link>
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white/85 shadow-sm backdrop-blur">
          <Image
            src="/images/testimonial2.webp"
            alt="Screenshot del voto 9,88 in matematica"
            width={640}
            height={320}
            className="h-auto w-full object-cover"
          />
        </div>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
          <h2 className="text-center text-[18px] font-extrabold text-slate-900">
            Il boost che ti serve 🔋
          </h2>
          <ul className="mt-4 grid gap-3">
            {highlights.map((item) => (
              <li
                key={item.title}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-[13.5px] text-slate-600"
              >
                <span className="mt-[2px]">{item.icon}</span>
                <div>
                  <p className="font-semibold text-slate-800">{item.title}</p>
                  <p className="mt-1 text-[13px]">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
          <h2 className="text-center text-[18px] font-extrabold text-slate-900">
            Le storie più belle{" "}
            {inlineChat}
          </h2>
          <p className="mt-2 text-center text-[13px] font-semibold text-slate-500">
            Messaggi reali dalla nostra chat: risultati concreti, zero stress.
          </p>
          <ul className="mt-4 grid gap-3">
            {testimonials.map((testimonial) => (
              <li
                key={testimonial.name}
                className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-[13.5px] shadow-inner"
              >
                <p className="text-slate-700">“{testimonial.quote}”</p>
                <p className="mt-2 text-[12.5px] font-semibold text-slate-500">
                  {testimonial.name} · {testimonial.track}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
          <h2 className="text-center text-[18px] font-extrabold text-slate-900">
            Domande frequenti ❓
          </h2>
          <div className="mt-4 space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-xl border border-slate-100 bg-slate-50/80 transition open:border-slate-200 open:bg-white"
              >
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-[13.5px] font-semibold text-slate-700">
                  {faq.question}
                  <ArrowRight className="h-4 w-4 text-slate-400 transition group-open:rotate-90" />
                </summary>
                <div className="px-4 pb-3 text-[13px] text-slate-600">{faq.answer}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
          <h2 className="text-center text-[18px] font-extrabold text-slate-900">
            Pronto a partire? {inlineRocket}
          </h2>
          <p className="mt-2 text-center text-[13.5px] text-slate-600">
            Attiva Theoremz Black o il Mentor quando vuoi: tutti i percorsi hanno garanzia 100% soddisfatti o rimborsati.
          </p>
          <div className="mt-4 grid gap-2">
            {progressChecks.map(([label, icon]) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-[13px] text-slate-600"
              >
                <span className="text-base leading-none">{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-2">
            {actions.map((action) => (
              <ActionButton key={`final-${action.href}`} action={action} />
            ))}
          </div>
          <p className="mt-3 text-center text-[12px] font-semibold text-slate-500">
            Dubbi? <Link href="/contatto-rapido?source=start-studente" className="underline underline-offset-4 hover:text-slate-700">Parla con un tutor</Link>
          </p>
        </section>
      </section>
    </main>
  );
}

function ActionButton({ action }: { action: Action }) {
  const isPrimary = action.variant === "primary";
  const primaryClasses =
    "group inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r px-6 py-3.5 text-[16px] font-black text-white transition ";
  const secondaryClasses =
    "group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900";

  const className = isPrimary
    ? primaryClasses + action.gradient + " " + action.shadow + " " + action.hover
    : secondaryClasses;

  return (
    <Link href={action.href} className={className}>
      {action.emoji && (
        <span
          className={
            (isPrimary ? "text-lg" : "text-sm") +
            " inline-flex items-center leading-none"
          }
        >
          {action.emoji}
        </span>
      )}
      <span>{action.label}</span>
      <ArrowRight
        className={
          isPrimary
            ? "h-4 w-4 transition-transform group-hover:translate-x-1"
            : "h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-slate-600"
        }
      />
    </Link>
  );
}
