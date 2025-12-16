import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, LineChart, ShieldCheck, Sparkles } from "lucide-react";

export const metadata = {
  title: "Theoremz Start Genitore — Supporto reale per la tua famiglia",
  description:
    "Tutor dedicati, monitoraggio costante e materiali premium per aiutare tuo figlio a migliorare in matematica con serenità.",
  alternates: { canonical: "/start-genitore" },
  openGraph: {
    type: "website",
    title: "Theoremz Start Genitore",
    description:
      "Scopri come aiutare tuo figlio a migliorare in matematica con tutor dedicati e report costanti.",
    images: [{ url: "/metadata.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Theoremz Start Genitore",
    description:
      "Scopri come aiutare tuo figlio a migliorare in matematica con tutor dedicati e report costanti.",
    images: ["/metadata.png"],
    site: "@theoremz_",
  },
};

const inlineChat = (
  <Image
    alt="Icona chat"
    src="/images/mess.webp"
    width={24}
    height={24}
    className="inline-block h-[1.05em] w-[1.05em] translate-y-[1px]"
  />
);

type Action = {
  href: string;
  label: string;
  emoji?: string;
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

type Quote = {
  name: string;
  quote: string;
};

type JourneyStep = {
  title: string;
  description: string;
};

const actions: Action[] = [
  {
    href: "/start-genitore/form",
    label: "Fai il quiz per tuo figlio",
    emoji: "📊",
    gradient: "from-sky-400 via-sky-500 to-indigo-500",
    hover: "hover:from-sky-500 hover:via-sky-600 hover:to-indigo-600",
    shadow: "shadow-[0_12px_24px_-12px_rgba(14,165,233,0.8)]",
    variant: "primary",
  },
  {
    href: "/black",
    label: "Passa a Theoremz Black",
    emoji: "",
    gradient: "from-fuchsia-500 to-rose-500",
    hover: "hover:from-fuchsia-600 hover:to-rose-600",
    shadow: "shadow-[0_12px_24px_-12px_rgba(236,72,153,0.65)]",
    variant: "secondary",
  },
  {
    href: "/mentor",
    label: "Prenota una sessione con il Mentor",
    emoji: "",
    gradient: "from-amber-400 via-orange-500 to-rose-500",
    hover: "hover:from-amber-500 hover:via-orange-600 hover:to-rose-600",
    shadow: "shadow-[0_12px_24px_-12px_rgba(249,115,22,0.55)]",
    variant: "secondary",
  },
];

const highlights: Highlight[] = [
  {
    icon: <ShieldCheck className="h-4 w-4 text-sky-500" aria-hidden />,
    title: "Tutor selezionati",
    description:
      "Docenti laureati, formati internamente e in contatto quotidiano con la famiglia.",
  },
  {
    icon: <LineChart className="h-4 w-4 text-indigo-500" aria-hidden />,
    title: "Risultati monitorati",
    description:
      "Report chiari su voti, media e obiettivi: sai sempre come sta andando tuo figlio.",
  },
  {
    icon: <Heart className="h-4 w-4 text-rose-500" aria-hidden />,
    title: "Serenità per tutta la casa",
    description:
      "Aggiornamenti via WhatsApp o email, reminder verifiche e supporto emotivo prima delle prove.",
  },
  {
    icon: <Sparkles className="h-4 w-4 text-amber-500" aria-hidden />,
    title: "Garanzia 100%",
    description:
      "Ogni piano è coperto dalla garanzia soddisfatti o rimborsati: se non fa per tuo figlio, rimborsiamo subito.",
  },
];

const testimonials: Quote[] = [
  {
    name: "Laura, mamma di Chiara",
    quote:
      "Riccardo l’ha sempre stimolata e incoraggiata. Ora affronta le verifiche con sicurezza.",
  },
  {
    name: "Andrea, papà di Marco",
    quote:
      "In un trimestre è passato da 6 a 9,7 di media. Finalmente studia con autonomia e serenità.",
  },
  {
    name: "Silvia, mamma di Martina",
    quote:
      "Controllo i report mensili e vedo la media salire. Theoremz ci tiene aggiornati senza stress.",
  },
];

const journey: JourneyStep[] = [
  {
    title: "Onboarding guidato",
    description:
      "Call iniziale con tutor e famiglia: obiettivi, orari e materiali per partire subito.",
  },
  {
    title: "Piano condiviso",
    description:
      "Dashboard con lezioni, compiti, sessioni chat e reminder personalizzati.",
  },
  {
    title: "Aggiornamenti costanti",
    description:
      "Report periodici, possibilità di aggiungere Mentor 1:1 e revisioni straordinarie prima delle verifiche.",
  },
];

const safeguards = [
  ["Garanzia 100% soddisfatti o rimborsati", "🛡️"],
  ["Monitoraggio dei progressi ogni settimana", "📈"],
  ["Team disponibile 7/7 per famiglie e studenti", "🤝"],
] as const;

export default function StartGenitorePage() {
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
            👋 Benvenuto nella cabina di regia dei genitori
          </span>
          <h1 className="mt-2 text-[26px] font-black leading-snug">
            Supporto quotidiano per tuo figlio, serenità per tutta la famiglia
          </h1>
          <p className="mt-2 max-w-sm text-[14px] font-medium text-slate-600">
            Scopri in pochi clic come personalizzare il percorso di matematica: tutor dedicato, materiali mirati e report trasparenti.
          </p>
        </header>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
          <p className="text-center text-[13.5px] font-semibold text-slate-600">
            Scegli da dove partire: puoi cambiare piano in qualsiasi momento.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {actions.map((action) => (
              <ActionButton key={action.href} action={action} />
            ))}
          </div>
          <p className="mt-3 text-center text-[12px] font-semibold text-slate-500">
            Vuoi solo dare un’occhiata? <Link href="/" className="underline underline-offset-4 hover:text-slate-700">Entra nel sito</Link>
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/85 shadow-sm backdrop-blur">
            <Image
              src="/images/testimonial1.webp"
              alt="Screenshot della media 9,76"
              width={600}
              height={320}
              className="h-auto w-full object-cover"
            />
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/85 shadow-sm backdrop-blur">
            <Image
              src="/images/testimonial3.webp"
              alt="Chat con una mamma soddisfatta"
              width={600}
              height={320}
              className="h-auto w-full object-cover"
            />
          </div>
        </div>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
          <h2 className="text-center text-[18px] font-extrabold text-slate-900">
            Perché le famiglie ci scelgono 💙
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
            Testimonianze vere{" "}
            {inlineChat}
          </h2>
          <p className="mt-2 text-center text-[13px] font-semibold text-slate-500">
            Genitori che hanno visto cambiare metodo, voti e serenità in casa.
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
            Come funziona passo passo 🧭
          </h2>
          <ol className="mt-4 space-y-3 text-[13.5px] text-slate-600">
            {journey.map((step, index) => (
              <li
                key={step.title}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-[14px] font-extrabold text-white">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold text-slate-800">{step.title}</p>
                  <p className="mt-1 text-[13px]">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
          <h2 className="text-center text-[18px] font-extrabold text-slate-900">
            Serenità garantita 🛡️
          </h2>
          <p className="mt-2 text-center text-[13.5px] text-slate-600">
            Attiva Theoremz Black o il Mentor 1:1 quando vuoi: c’è la garanzia 100% soddisfatti o rimborsati.
          </p>
          <div className="mt-4 grid gap-2">
            {safeguards.map(([label, emoji]) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-[13px] text-slate-600"
              >
                <span className="text-base">{emoji}</span>
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
            Preferisci parlarne? <Link href="/contatto-rapido?source=start-genitore" className="underline underline-offset-4 hover:text-slate-700">Parla con un tutor</Link>
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
        <span className={isPrimary ? "text-lg" : "text-sm"} aria-hidden>
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
