"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

/** ---------------------- Data ---------------------- */
type BenefitKey = "ads" | "quiz" | "tutor" | "dark";

const BENEFITS: Record<
  BenefitKey,
  {
    title: string;
    lead: string;
    desc: string;
    icon: string; // emoji nella pill
    Illustration: React.FC;
  }
> = {
  ads: {
    title: "Zero pubblicità ✋",
    lead: "Studia senza distrazioni",
    desc: "Con Black navighi Theoremz senza annunci né interruzioni. Focus totale su spiegazioni, indici e appunti.",
    icon: "🚫",
    Illustration: AdsIllo,
  },
  quiz: {
    title: "Esercizi e quiz 🍒",
    lead: "Allenati e verifica subito",
    desc: "Collezioni di esercizi, spiegazioni passo-passo e quiz a risposta immediata per fissare i concetti.",
    icon: "🧮",
    Illustration: QuizIllo,
  },
  tutor: {
    title: "Aiuto compiti 💬",
    lead: "Un boost quando serve",
    desc: "Invia l’esercizio: lo risolviamo e ti diamo una spiegazione chiara, pronta per essere ricordata.",
    icon: "📨",
    Illustration: TutorIllo,
  },
  dark: {
    title: "Dark Mode 🌙",
    lead: "Occhi riposati, batteria felice",
    desc: "Tema scuro su tutto il sito, perfetto per lo studio serale e i monitor OLED. Cambi con un tap.",
    icon: "🌙",
    Illustration: DarkIllo,
  },
};

/** ---------------------- Component ---------------------- */
export default function BlackPromo() {
  const [active, setActive] = useState<BenefitKey>("ads");
  const data = useMemo(() => BENEFITS[active], [active]);

  return (
    <section className="mx-4 my-6 max-w-screen-xl rounded-[24px] bg-gray-100/60 px-4 py-6  [.dark_&]:bg-slate-800 sm:mx-6 lg:mx-auto sm:px-8 sm:py-8">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-[28px] font-bold leading-tight text-slate-900 [.dark_&]:text-white sm:text-[32px]">
            Scopri <span className="text-sky-600">Theoremz Black</span>!
          </h2>

          <p className="mt-8 text-[18px] leading-relaxed text-slate-800 [.dark_&]:text-slate-200">
            <span className="font-semibold text-sky-600">{data.title}</span>
            <br />
            {data.desc}
          </p>

          {/* CTA */}
          <div className="mt-6">
            <Link
              href="/black"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-4 text-[18px] font-extrabold text-white shadow-[0_6px_0_#0f172a] transition active:translate-y-[1px] active:shadow-[0_5px_0_#0f172a] [.dark_&]:bg-white [.dark_&]:text-slate-900 [.dark_&]:shadow-[0_6px_0_#e5e7eb]"
            >
              Passa a black!
              <svg
                className="ml-2 h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Illustrazione dinamica */}
        <div className="mx-auto w-full max-w-[520px] md:mx-0">
          <div className="rounded-2xl bg-white/80 p-6 ring-1 ring-black/5 transition-colors [.dark_&]:bg-slate-900/50 [.dark_&]:ring-white/10">
            <data.Illustration />
          </div>
        </div>
      </div>

      {/* Pills vantaggi */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(
          [
            ["ads", "No pubblicità"] as const,
            ["quiz", "Esercizi e quiz"] as const,
            ["tutor", "Aiuto compiti"] as const,
            ["dark", "Dark Mode"] as const,
          ] satisfies ReadonlyArray<readonly [BenefitKey, string]>
        ).map(([key, label]) => {
          const activeNow = active === key;
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`group flex items-center justify-between rounded-2xl border-2 px-4 py-3 text-[16px] font-semibold transition
                ${
                  activeNow
                    ? "border-sky-500 bg-white text-sky-700 shadow-sm [.dark_&]:bg-slate-900 [.dark_&]:text-sky-300"
                    : "border-slate-300/80 bg-white/80 text-slate-700 hover:border-slate-400 hover:bg-white [.dark_&]:bg-slate-900/60 [.dark_&]:border-slate-600 [.dark_&]:text-slate-200"
                }`}
              aria-pressed={activeNow}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-[15px] ${activeNow ? "bg-sky-100 text-sky-700 [.dark_&]:bg-sky-900/30 [.dark_&]:text-sky-300" : "bg-slate-100 text-slate-700 [.dark_&]:bg-slate-700/60 [.dark_&]:text-slate-200"}`}
                >
                  {BENEFITS[key].icon}
                </span>
                {label}
              </span>
              <svg
                className={`h-5 w-5 transition-transform ${activeNow ? "translate-x-1 opacity-100" : "opacity-50 group-hover:translate-x-1"}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          );
        })}
      </div>

      {/* Sottotitolo che cambia (lead) */}
      <p className="mt-4 text-center text-[15px] font-medium text-slate-500 [.dark_&]:text-slate-300/80">
        {data.lead}
      </p>
    </section>
  );
}

/** ---------------------- Illustrations ---------------------- */
/* Le illustrazioni sono SVG “brand-like”, con micro animazioni e zero CLS.
   Sostituiscile con immagini reali se vuoi: mantenendo la firma del componente. */

function AdsIllo() {
  return (
    <svg viewBox="0 0 560 300" className="h-[240px] w-full">
      <defs>
        <linearGradient id="g1" x1="0" x2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>

      <rect
        x="20"
        y="30"
        width="520"
        height="200"
        rx="16"
        fill="#fff"
        stroke="#0f172a"
        strokeWidth="4"
      />
      <circle cx="48" cy="54" r="5" fill="#e5e7eb" />
      <circle cx="66" cy="54" r="5" fill="#e5e7eb" />
      <circle cx="84" cy="54" r="5" fill="#e5e7eb" />

      {/* banner bloccato */}
      <rect
        x="56"
        y="90"
        width="300"
        height="60"
        rx="10"
        fill="#fde68a"
        stroke="#0f172a"
        strokeWidth="3"
      />
      <line
        x1="56"
        y1="90"
        x2="356"
        y2="150"
        stroke="#ef4444"
        strokeWidth="6"
      />
      <line
        x1="356"
        y1="90"
        x2="56"
        y2="150"
        stroke="#ef4444"
        strokeWidth="6"
      />

      {/* contenuto pulito a destra */}
      <rect x="380" y="90" width="130" height="100" rx="12" fill="url(#g1)" />
      <circle cx="445" cy="140" r="26" fill="#fff" />
      <path
        d="M435 140 h20 M445 130 v20"
        stroke="#2563eb"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function QuizIllo() {
  return (
    <svg viewBox="0 0 560 300" className="h-[240px] w-full">
      <defs>
        <linearGradient id="g2" x1="0" x2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <rect
        x="40"
        y="50"
        width="480"
        height="200"
        rx="16"
        fill="#fff"
        stroke="#0f172a"
        strokeWidth="4"
      />
      <rect x="70" y="90" width="180" height="30" rx="8" fill="#e5e7eb" />
      <rect x="70" y="130" width="180" height="30" rx="8" fill="#e5e7eb" />
      <rect x="70" y="170" width="180" height="30" rx="8" fill="#e5e7eb" />

      {/* card risultato */}
      <rect x="300" y="90" width="180" height="140" rx="14" fill="url(#g2)" />
      <g fill="#fff">
        <circle cx="330" cy="120" r="10" />
        <rect x="350" y="112" width="100" height="16" rx="8" />
        <rect x="350" y="138" width="90" height="16" rx="8" />
        <rect x="350" y="164" width="70" height="16" rx="8" />
      </g>
      <polyline
        points="330,120 336,126 346,112"
        fill="none"
        stroke="#fff"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TutorIllo() {
  return (
    <svg viewBox="0 0 560 300" className="h-[240px] w-full">
      <rect
        x="40"
        y="60"
        width="220"
        height="140"
        rx="14"
        fill="#f1f5f9"
        stroke="#0f172a"
        strokeWidth="3"
      />
      <path
        d="M60 160 C90 100, 140 160, 180 110"
        fill="none"
        stroke="#60a5fa"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* avatar/tutor */}
      <g transform="translate(360,150)">
        <circle
          cx="0"
          cy="-40"
          r="22"
          fill="#fde68a"
          stroke="#0f172a"
          strokeWidth="3"
        />
        <rect
          x="-26"
          y="-22"
          width="52"
          height="52"
          rx="12"
          fill="#93c5fd"
          stroke="#0f172a"
          strokeWidth="3"
        />
        <path
          d="M-6 -12 L-40 -52"
          stroke="#0f172a"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <animate
            attributeName="d"
            dur="2.2s"
            repeatCount="indefinite"
            values="M-6 -12 L-40 -52; M-6 -12 L-46 -48; M-6 -12 L-40 -52"
          />
        </path>
      </g>
    </svg>
  );
}

function DarkIllo() {
  return (
    <svg viewBox="0 0 560 300" className="h-[240px] w-full">
      <rect
        x="40"
        y="60"
        width="480"
        height="180"
        rx="16"
        fill="#0f172a"
        stroke="#0f172a"
        strokeWidth="4"
      />
      <circle cx="110" cy="110" r="28" fill="#fde68a" />
      <circle cx="110" cy="110" r="18" fill="#0f172a" />
      <rect x="170" y="100" width="280" height="20" rx="6" fill="#1f2937" />
      <rect x="170" y="140" width="220" height="20" rx="6" fill="#1f2937" />
      <rect x="170" y="180" width="260" height="20" rx="6" fill="#1f2937" />
    </svg>
  );
}
