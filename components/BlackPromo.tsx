"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";

/** ---------------------- Data ---------------------- */
type BenefitKey = "lessons" | "exercises" | "practice" | "resources";

const IMG_BY_BENEFIT: Record<
  BenefitKey,
  { src: string; alt: string; width: number; height: number }
> = {
  lessons: {
    src: "/images/resources.webp",
    alt: "Videolezioni Theoremz",
    width: 520,
    height: 240,
  },
  exercises: {
    src: "/images/aiutocompiti.webp",
    alt: "Esercizi svolti su Theoremz",
    width: 520,
    height: 240,
  },
  practice: {
    src: "/images/mock5.webp",
    alt: "Quiz e simulazioni verifiche",
    width: 520,
    height: 240,
  },
  resources: {
    src: "/images/dark-mode.webp",
    alt: "Interfaccia Theoremz",
    width: 520,
    height: 240,
  },
};

function ImgIllo({ kind }: { kind: BenefitKey }) {
  const { src, alt, width, height } = IMG_BY_BENEFIT[kind];
  return (
    <div className="relative h-[240px] w-full">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="h-[240px] w-full object-contain"
        // niente priority => lascia decidere al browser
      />
    </div>
  );
}

type IlloProps = { play?: boolean };

const BENEFITS: Record<
  BenefitKey,
  {
    title: ReactNode;
    lead: string;
    desc: string;
    icon: ReactNode;
    Illustration: React.FC<IlloProps>;
  }
> = {
  lessons: {
    title: "Videolezioni per ogni argomento",
    lead: "Spiegazioni chiare, sempre disponibili",
    desc: "Video e spiegazioni ordinate per matematica e fisica, con percorsi per livello.",
    icon: "🎥",
    Illustration: () => <ImgIllo kind="lessons" />,
  },
  exercises: {
    title: "Esercizi svolti passo-passo",
    lead: "Capisci il metodo, non solo il risultato",
    desc: "Svolgimenti chiari e guidati per imparare come si risolve davvero.",
    icon: "✍️",
    Illustration: () => <ImgIllo kind="exercises" />,
  },
  practice: {
    title: "Quiz e simulazioni verifiche",
    lead: "Allenati prima delle prove in classe",
    desc: "Esercizi di ripasso e simulazioni per arrivare pronto alle verifiche.",
    icon: "🧪",
    Illustration: () => <ImgIllo kind="practice" />,
  },
  resources: {
    title: "Formulari, appunti e dark mode",
    lead: "Tutto il materiale in un unico posto",
    desc: "Formule, appunti PDF, flashcard e un'interfaccia comoda anche di sera.",
    icon: "📚",
    Illustration: () => <ImgIllo kind="resources" />,
  },
};

/** ---------------------- Component ---------------------- */
export default function BlackPromo() {
  const [active, setActive] = useState<BenefitKey>("lessons");
  const data = useMemo(() => BENEFITS[active], [active]);

  return (
    <section className="mx-6 my-6 max-w-screen-xl rounded-[24px] border border-slate-200/70 bg-white/95 px-4 py-6 text-slate-900 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur xl:mx-auto sm:mx-6 sm:px-8 sm:py-8 [.dark_&]:border-white/15 [.dark_&]:bg-white/10 [.dark_&]:text-white">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-[28px] font-bold leading-tight text-slate-900 [.dark_&]:text-white sm:text-[32px]">
            La piattaforma completa per{" "}
            <span className="text-sky-600">matematica e fisica</span>
          </h2>

          <p className="mt-8 text-[18px] leading-relaxed text-slate-800 [.dark_&]:text-slate-200">
            Un unico piano con tutto il materiale Theoremz.
            <br />
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
              Scopri Theoremz Black
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
          <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200/70 transition-colors [.dark_&]:bg-slate-900/40 [.dark_&]:ring-white/15">
            <data.Illustration />
          </div>
        </div>
      </div>

      {/* Pills vantaggi */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(
          [
            ["lessons", "Videolezioni"] as const,
            ["exercises", "Esercizi svolti"] as const,
            ["practice", "Quiz e simulazioni"] as const,
            ["resources", "Formulari e appunti"] as const,
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
                    ? "border-blue-500 bg-white text-blue-700 shadow-[0_10px_24px_-16px_rgba(59,130,246,0.55)] hover:shadow-[0_12px_28px_-18px_rgba(59,130,246,0.55)] [.dark_&]:bg-slate-900/60 [.dark_&]:text-blue-300"
                    : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50 [.dark_&]:border-white/20 [.dark_&]:bg-slate-900/50 [.dark_&]:text-slate-200"
                }`}
              aria-pressed={activeNow}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-[15px] ${
                    activeNow
                      ? "bg-blue-100 text-blue-700 [.dark_&]:bg-blue-900/30 [.dark_&]:text-blue-300"
                      : "bg-slate-100 text-slate-700 [.dark_&]:bg-slate-700/60 [.dark_&]:text-slate-200"
                  }`}
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
