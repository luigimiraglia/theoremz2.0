
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, Send } from "lucide-react";

const QUESTIONS = [
  {
    emoji: "👦",
    title: "Domanda 1",
    question: "Come descriveresti il rapporto di tuo figlio con la matematica?",
    options: [
      "Si impegna ma fa fatica",
      "È disorganizzato o si scoraggia facilmente",
      "È costante ma ha dubbi che non riesce a chiarire",
      "È bravo, ma non viene stimolato abbastanza",
    ],
  },
  {
    emoji: "📉",
    title: "Domanda 2",
    question: "Cosa lo blocca di più secondo te?",
    options: [
      "Non capisce la teoria",
      "Non riesce a collegare esercizi diversi",
      "Ha bisogno di qualcuno che lo segua",
      "Gli manca fiducia o metodo",
    ],
  },
  {
    emoji: "🧾",
    title: "Domanda 3",
    question: "Quanto tempo può dedicare alla matematica ogni settimana?",
    options: ["Meno di 2 ore", "2–4 ore", "Più di 4 ore"],
  },
  {
    emoji: "🧑‍🏫",
    title: "Domanda 4",
    question: "Che tipo di aiuto preferiresti per lui?",
    options: [
      "Studiare in autonomia con materiali e assistente AI",
      "Avere un tutor disponibile in chat ogni giorno",
      "Lavorare con un insegnante 1 a 1 in videolezione",
    ],
  },
  {
    emoji: "🎯",
    title: "Domanda 5",
    question: "Qual è il tuo obiettivo per i prossimi mesi?",
    options: [
      "Recuperare le lacune e passare l’anno con serenità",
      "Aumentare sicurezza e costanza",
      "Fargli raggiungere voti alti e piena autonomia",
    ],
  },
] as const;

const PLANS = {
  mentor: {
    name: "Theoremz Mentor",
    description:
      "Un insegnante 1:1 segue tuo figlio ogni settimana con lezioni dedicate, report e coaching motivazionale.",
    ctaLabel: "Vai al piano Mentor",
    href: "/mentor",
    highlight: "Lezioni individuali + follow-up alla famiglia",
  },
  black: {
    name: "Theoremz Black",
    description:
      "Tutor via chat ogni giorno, esercizi spiegati e report regolari per mantenere sicurezza e costanza.",
    ctaLabel: "Vai al piano Theoremz Black",
    href: "/black",
    highlight: "Tutor quotidiano + materiali personalizzati",
  },
  essential: {
    name: "Theoremz Black Essential",
    description:
      "Piattaforma guidata con spiegazioni chiare, planner intelligente e assistente AI per lo studio autonomo.",
    ctaLabel: "Scopri Theoremz Black Essential",
    href: "/black",
    highlight: "Studio autonomo guidato + reminder smart",
  },
} as const;

const QUIZ_ID = "start-genitore" as const;

type Plan = (typeof PLANS)[keyof typeof PLANS];

type PhoneStatus = "idle" | "missing" | "sending" | "submitted" | "error";

function computeRecommendation(answers: readonly string[]): Plan {
  const [attitude, blockers, time, support, goal] = answers;

  if (support?.includes("videolezione") || goal?.includes("voti alti")) {
    return PLANS.mentor;
  }

  if (support?.includes("chat") || blockers?.includes("qualcuno") || goal?.includes("sicurezza")) {
    return PLANS.black;
  }

  if (support?.includes("autonomia") || attitude?.includes("bravo") || time?.includes("Meno")) {
    return PLANS.essential;
  }

  return PLANS.black;
}

export default function QuizClient() {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(QUESTIONS.length).fill(""));
  const [phone, setPhone] = useState("");
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus>("idle");

  const progress = useMemo(
    () =>
      Math.round(
        ((Math.min(stepIndex, QUESTIONS.length) + (stepIndex >= QUESTIONS.length ? 1 : 0)) /
          (QUESTIONS.length + 1)) *
          100,
      ),
    [stepIndex],
  );

  const recommendation = useMemo(() => computeRecommendation(answers), [answers]);

  const handleAnswer = (value: string) => {
    if (stepIndex >= QUESTIONS.length) return;
    const updated = [...answers];
    updated[stepIndex] = value;
    setAnswers(updated);
    setStepIndex((idx) => idx + 1);
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    setPhoneStatus((prev) => (prev === "sending" ? prev : "idle"));
  };

  const resetQuiz = () => {
    setAnswers(Array(QUESTIONS.length).fill(""));
    setPhone("");
    setPhoneStatus("idle");
    setStepIndex(0);
  };

  const submitPhone = async () => {
    const normalizedPhone = phone.trim();
    if (!normalizedPhone) {
      setPhoneStatus("missing");
      return;
    }

    const responses = QUESTIONS.map((q, idx) => ({
      question: q.question,
      answer: answers[idx] || "",
    }));

    setPhoneStatus("sending");
    try {
      const res = await fetch("/api/quiz-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz: QUIZ_ID,
          phone: normalizedPhone,
          plan: {
            name: recommendation.name,
            description: recommendation.description,
            highlight: recommendation.highlight,
          },
          responses,
          submittedAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      setPhoneStatus("submitted");
    } catch (error) {
      console.error("quiz-report submission failed", error);
      setPhoneStatus("error");
    }
  };

  const isFinalScreen = stepIndex >= QUESTIONS.length;

  return (
    <main className="bg-gradient-to-br from-sky-50 to-indigo-50 text-slate-900 min-h-screen">
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
            Scopri come aiutare tuo figlio in matematica 🎯
          </h1>
          <p className="mt-3 max-w-sm text-[14px] font-medium text-slate-600">
            ⏱️ 2 minuti per capire di cosa ha davvero bisogno tuo figlio. Riceverai un report gratuito con consigli personalizzati e il percorso consigliato.
          </p>
        </header>

        <div className="mt-6 flex items-center gap-3 text-[12px] font-semibold text-slate-500">
          <div className="relative h-2 flex-1 rounded-full bg-slate-200">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-sky-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span>{isFinalScreen ? "100%" : `${Math.round(((stepIndex + 1) / (QUESTIONS.length + 1)) * 100)}%`}</span>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
          {isFinalScreen ? (
            <FinalScreen
              answers={answers}
              phone={phone}
              onPhoneChange={handlePhoneChange}
              phoneStatus={phoneStatus}
              onSubmitPhone={() => {
                void submitPhone();
              }}
              onRestart={resetQuiz}
              plan={recommendation}
            />
          ) : (
            <QuestionCard
              step={stepIndex}
              data={QUESTIONS[stepIndex]}
              onSelect={handleAnswer}
              total={QUESTIONS.length}
            />
          )}
        </div>
      </section>
    </main>
  );
}

type QuestionCardProps = {
  step: number;
  total: number;
  data: (typeof QUESTIONS)[number];
  onSelect: (value: string) => void;
};

function QuestionCard({ step, total, data, onSelect }: QuestionCardProps) {
  return (
    <div className="space-y-5">
      <span className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-100 px-4 py-1 text-[12.5px] font-semibold text-slate-600">
        {data.emoji} {data.title} · {step + 1}/{total}
      </span>
      <h2 className="text-[20px] font-extrabold text-slate-900">{data.question}</h2>
      <div className="grid gap-3">
        {data.options.map((option) => (
          <button
            key={option}
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

type FinalScreenProps = {
  answers: string[];
  phone: string;
  onPhoneChange: (value: string) => void;
  phoneStatus: PhoneStatus;
  onSubmitPhone: () => void;
  onRestart: () => void;
  plan: Plan;
};

function FinalScreen({ answers, phone, onPhoneChange, phoneStatus, onSubmitPhone, onRestart, plan }: FinalScreenProps) {
  const isSending = phoneStatus === "sending";
  const isSubmitted = phoneStatus === "submitted";

  return (
    <div className="space-y-5">
      <span className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-50 px-4 py-1 text-[12.5px] font-semibold text-emerald-600">
        <Check className="h-3.5 w-3.5" aria-hidden /> Quiz completato
      </span>
      <h2 className="text-[20px] font-extrabold text-slate-900">
        In base alle tue risposte ti consigliamo <span className="text-sky-600">{plan.name}</span>.
      </h2>
      <p className="text-[14px] font-semibold text-slate-600">{plan.description}</p>
      <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-[13.5px] text-slate-600">
        <p className="font-semibold text-slate-700">Le risposte che hai dato:</p>
        <ul className="space-y-2">
          {answers.map((answer, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-[2px] text-sky-500">•</span>
              <span>{answer}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-2">
        <label htmlFor="phone" className="text-[13.5px] font-semibold text-slate-700">
          📱 Vuoi ricevere il report completo con consigli per tuo figlio su WhatsApp?
        </label>
        {isSubmitted ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
            <Check className="h-4 w-4" aria-hidden /> Report richiesto. Controlla WhatsApp fra pochi minuti.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                placeholder="Es. +39 345 1234567"
                value={phone}
                onChange={(event) => onPhoneChange(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-700 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 disabled:bg-slate-100"
                disabled={isSending || isSubmitted}
              />
              <button
                type="button"
                onClick={onSubmitPhone}
                disabled={isSending || isSubmitted}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-400 bg-sky-500 px-4 py-3 text-[13.5px] font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" aria-hidden />
                Invia report
              </button>
            </div>
            {phoneStatus === "sending" && (
              <p className="text-[12px] font-semibold text-sky-600">⌛ Stiamo registrando la richiesta, a breve riceverai il report.</p>
            )}
            {phoneStatus === "missing" && (
              <p className="text-[12px] font-semibold text-rose-500">Inserisci un numero per richiedere il report su WhatsApp.</p>
            )}
            {phoneStatus === "error" && (
              <p className="text-[12px] font-semibold text-rose-500">
                ⚠️ Non siamo riusciti a inviare la richiesta. Riprova oppure contattaci su <Link href="/contatto-rapido?source=start-quiz" className="underline underline-offset-4">contatto rapido</Link>.
              </p>
            )}
            <p className="text-[12px] font-semibold text-slate-500">
              💬 Ti invieremo solo il report e risorse utili per i genitori.
            </p>
          </>
        )}
      </div>
      <Link
        href={plan.href}
        className="group flex w-full items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-rose-500 px-5 py-4 text-white shadow-[0_18px_30px_-18px_rgba(236,72,153,0.65)] transition hover:from-fuchsia-600 hover:to-rose-600"
      >
        <div className="text-left">
          <span className="block text-[12.5px] font-semibold text-white/80">{plan.highlight}</span>
          <span className="block text-[16px] font-extrabold">{plan.ctaLabel}</span>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </span>
      </Link>
      <button
        type="button"
        onClick={onRestart}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13.5px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
      >
        Rifai il quiz
      </button>
    </div>
  );
}
