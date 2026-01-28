"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

type Identity = "studente" | "genitore" | null;

type Question = {
  id: string;
  emoji: string;
  question: string;
  options: readonly string[];
};

type ResultConfig = {
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  gradient: string;
  hover: string;
  shadow: string;
};

const IDENTITY_QUESTION: Question = {
  id: "identity",
  emoji: "🧭",
  question: "Chi sta compilando il quiz?",
  options: ["Sono uno studente", "Sono un genitore"],
};

const STUDENT_QUESTION: Question = {
  id: "student_goal",
  emoji: "🎒",
  question: "Cosa stai cercando?",
  options: ["Studiare meglio in autonomia", "Esercizi e spiegazioni", "Un aiuto leggero mentre studio"],
};

const PARENT_QUESTIONS: Question[] = [
  {
    id: "parent_situation",
    emoji: "👨‍👩‍👧‍👦",
    question: "In che situazione si trova tuo figlio/a?",
    options: [
      "Sta andando bene, ma voglio migliorare",
      "Ha qualche difficoltà",
      "Ha insufficienze / voti molto bassi",
    ],
  },
  {
    id: "parent_last_bad",
    emoji: "🧪",
    question: "Quando è stata l'ultima verifica andata male?",
    options: ["Nell'ultimo mese", "Negli ultimi 2-3 mesi", "Non ancora, ma temo succeda"],
  },
  {
    id: "parent_risk",
    emoji: "⚠️",
    question: "Cosa succede se la situazione non migliora?",
    options: ["Nulla di grave", "Rischia insufficienze", "Rischia debiti / bocciatura"],
  },
];

const STUDENT_RESULT: ResultConfig = {
  title: "Per lo studio in autonomia",
  description:
    "Theoremz è una piattaforma pensata per studiare in autonomia. Se cerchi questo tipo di supporto, puoi accedere qui.",
  ctaLabel: "Accedi alla piattaforma",
  href: "/black",
  gradient: "from-sky-400 via-sky-500 to-indigo-500",
  hover: "hover:from-sky-500 hover:via-sky-600 hover:to-indigo-600",
  shadow: "shadow-[0_18px_30px_-18px_rgba(14,165,233,0.6)]",
};

const PARENT_URGENT_RESULT: ResultConfig = {
  title: "Serve un intervento diretto",
  description:
    "Da quello che ci hai raccontato, la situazione richiede un intervento diretto e strutturato. In questi casi lavoriamo con un tutor che segue lo studente personalmente.",
  ctaLabel: "Parla con un tutor",
  href: "/ilmetodotheoremz",
  gradient: "from-amber-400 via-orange-500 to-rose-500",
  hover: "hover:from-amber-500 hover:via-orange-600 hover:to-rose-600",
  shadow: "shadow-[0_18px_30px_-18px_rgba(249,115,22,0.55)]",
};

const PARENT_SOFT_RESULT: ResultConfig = {
  title: "Studio in autonomia",
  description:
    "Se non ci sono difficoltà urgenti, Theoremz è pensato per studiare in autonomia e consolidare il metodo.",
  ctaLabel: "Accedi alla piattaforma",
  href: "/black",
  gradient: "from-sky-400 via-sky-500 to-indigo-500",
  hover: "hover:from-sky-500 hover:via-sky-600 hover:to-indigo-600",
  shadow: "shadow-[0_18px_30px_-18px_rgba(14,165,233,0.6)]",
};

export default function StartQuizClient() {
  const [identity, setIdentity] = useState<Identity>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const steps = useMemo(() => {
    if (!identity) return [IDENTITY_QUESTION];
    if (identity === "studente") return [IDENTITY_QUESTION, STUDENT_QUESTION];
    return [IDENTITY_QUESTION, ...PARENT_QUESTIONS];
  }, [identity]);

  const totalQuestions = identity === "studente" ? 2 : 4;
  const isFinalScreen = stepIndex >= steps.length;

  const progress = useMemo(() => {
    const total = totalQuestions + 1;
    const current = Math.min(stepIndex, totalQuestions) + 1;
    return Math.round((current / total) * 100);
  }, [stepIndex, totalQuestions]);

  const result = useMemo(() => {
    if (identity === "studente") return STUDENT_RESULT;
    if (identity === "genitore") {
      return isUrgentParentCase(answers) ? PARENT_URGENT_RESULT : PARENT_SOFT_RESULT;
    }
    return null;
  }, [identity, answers]);

  const handleAnswer = (value: string) => {
    const current = steps[stepIndex];
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
    if (current.id === "identity") {
      setIdentity(value === "Sono uno studente" ? "studente" : "genitore");
    }
    setStepIndex((prev) => prev + 1);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-50 text-slate-900">
      <section className="relative mx-auto max-w-md px-5 pb-16 pt-10">
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
          <h1 className="text-[26px] font-black leading-snug">
            Quiz Start Theoremz
          </h1>
          <p className="mt-3 max-w-sm text-[14px] font-medium text-slate-600">
            ⏱️ Meno di un minuto: capiamo chi sei e ti indirizziamo alla pagina giusta.
          </p>
        </header>

        <div className="mt-6 flex items-center gap-3 text-[12px] font-semibold text-slate-500">
          <div className="relative h-2 flex-1 rounded-full bg-slate-200">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-sky-500 transition-all"
              style={{ width: `${isFinalScreen ? 100 : progress}%` }}
            />
          </div>
          <span>{isFinalScreen ? "100%" : `${progress}%`}</span>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
          {isFinalScreen && result ? (
            <ResultCard result={result} />
          ) : (
            <QuestionCard
              step={stepIndex}
              total={totalQuestions}
              data={steps[stepIndex]}
              onSelect={handleAnswer}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function isUrgentParentCase(answers: Record<string, string>) {
  const situation = answers.parent_situation ?? "";
  const lastBad = answers.parent_last_bad ?? "";
  const risk = answers.parent_risk ?? "";

  const hasDifficulty =
    situation === "Ha qualche difficoltà" || situation === "Ha insufficienze / voti molto bassi";
  const recent =
    lastBad === "Nell'ultimo mese" || lastBad === "Negli ultimi 2-3 mesi";
  const highRisk =
    risk === "Rischia insufficienze" || risk === "Rischia debiti / bocciatura";

  return hasDifficulty && recent && highRisk;
}

function QuestionCard({
  step,
  total,
  data,
  onSelect,
}: {
  step: number;
  total: number;
  data: Question;
  onSelect: (value: string) => void;
}) {
  const label = step + 1;

  return (
    <div className="space-y-5">
      <span className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-100 px-4 py-1 text-[12.5px] font-semibold text-slate-600">
        {data.emoji} Domanda {label} · {label}/{total}
      </span>
      <h2 className="text-[20px] font-extrabold text-slate-900">{data.question}</h2>
      <div className="grid gap-3">
        {data.options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-[14px] font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:shadow-lg"
          >
            <span className="max-w-[85%]">{option}</span>
            <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-sky-500" />
          </button>
        ))}
      </div>
      <p className="text-[12.5px] text-slate-500">
        Risposta immediata: la prossima domanda si sblocca non appena scegli un&apos;opzione.
      </p>
    </div>
  );
}

function ResultCard({ result }: { result: ResultConfig }) {
  return (
    <div className="space-y-5">
      <span className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-50 px-4 py-1 text-[12.5px] font-semibold text-emerald-600">
        <Check className="h-3.5 w-3.5" aria-hidden /> Quiz completato
      </span>
      <h2 className="text-[20px] font-extrabold text-slate-900">{result.title}</h2>
      <p className="text-[14px] font-semibold text-slate-600">{result.description}</p>
      <Link
        href={result.href}
        className={`group flex w-full items-center justify-between gap-4 rounded-2xl bg-gradient-to-r px-5 py-4 text-white transition ${result.gradient} ${result.shadow} ${result.hover}`}
      >
        <span className="block text-[16px] font-extrabold">{result.ctaLabel}</span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </span>
      </Link>
    </div>
  );
}
