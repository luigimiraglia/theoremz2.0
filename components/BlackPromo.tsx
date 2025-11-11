"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, useEffect, useRef } from "react";

/** ---------------------- Data ---------------------- */
type BenefitKey = "ads" | "quiz" | "tutor" | "dark";

const IMG_BY_BENEFIT: Record<
  Exclude<BenefitKey, "ads">,
  { src: string; alt: string; width: number; height: number }
> = {
  quiz: {
    src: "/images/resources.webp",
    alt: "Esercizi e quiz su Theoremz",
    width: 520,
    height: 240,
  },
  tutor: {
    src: "/images/aiutocompiti.webp",
    alt: "Tutor dedicato Theoremz",
    width: 520,
    height: 240,
  },
  dark: {
    src: "/images/dark-mode.webp",
    alt: "Interfaccia Theoremz",
    width: 520,
    height: 240,
  },
};

/** Hook: reduced motion */
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    setReduced(m.matches);
    m.addEventListener?.("change", onChange);
    return () => m.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

/** Lottie per “No pubblicità” con lazy mount + pause */
function AdsLottie({ play }: { play: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const animRef = useRef<any>(null);
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();

  // Track viewport
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0.2,
    });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  // Load / control animation
  useEffect(() => {
    let mounted = true;

    async function ensureAnim() {
      if (!ref.current || !play || !visible || reduced) return;
      if (animRef.current) {
        animRef.current.play();
        return;
      }
      const lottie = (await import("lottie-web")).default;
      if (!mounted || !ref.current) return;
      animRef.current = lottie.loadAnimation({
        container: ref.current,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: "/animations/no-ads.json",
        rendererSettings: { progressiveLoad: true },
      });
    }

    ensureAnim();

    // Pause if not playing/visible/reduced
    if (!play || !visible || reduced) {
      animRef.current?.pause?.();
    }

    return () => {
      mounted = false;
      // Se esci dalla pill, distruggi (libera memoria/CPU)
      if (!play && animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
    };
  }, [play, visible, reduced]);

  // Pause in background tab
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) animRef.current?.pause?.();
      else if (play && visible && !reduced) animRef.current?.play?.();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [play, visible, reduced]);

  return (
    <div
      ref={ref}
      className="h-[240px] w-full"
      role="img"
      aria-label="Animazione: zero pubblicità su Theoremz"
    />
  );
}

function ImgIllo({ kind }: { kind: Exclude<BenefitKey, "ads"> }) {
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
    title: string;
    lead: string;
    desc: string;
    icon: string;
    Illustration: React.FC<IlloProps>;
  }
> = {
  ads: {
    title: "Assistenza via chat illimitata 💬",
    lead: "Un tutor personale sempre con te",
    desc: "Con Black hai assistenza costante via chat: un insegnante ti segue 1:1 ogni giorno per aiutarti con i compiti e rispondere a ogni dubbio.",
    icon: "👨‍🏫",
    Illustration: ({ play }) => <AdsLottie play={!!play} />,
  },
  quiz: {
    title: "Theoremz AI Avanzato 🤖",
    lead: "Intelligenza artificiale al tuo servizio",
    desc: "AI tutor che conosce il tuo percorso, crea quiz personalizzati, simula verifiche e ti prepara con consigli mirati sui tuoi punti deboli.",
    icon: "🧠",
    Illustration: () => <ImgIllo kind="quiz" />,
  },
  tutor: {
    title: "Aiuto compiti giornaliero 📚",
    lead: "Supporto costante per ogni materia",
    desc: "Ogni giorno un tutor ti segue passo passo nella risoluzione degli esercizi, con spiegazioni dettagliate e personalizzate per te.",
    icon: "📝",
    Illustration: () => <ImgIllo kind="tutor" />,
  },
  dark: {
    title: "Tutte le risorse Theoremz ✨",
    lead: "Accesso completo alla piattaforma",
    desc: "Centinaia di esercizi risolti, videolezioni, formulari, quiz, dark mode e sconto del 10% sulle ripetizioni individuali.",
    icon: "🎯",
    Illustration: () => <ImgIllo kind="dark" />,
  },
};

/** ---------------------- Component ---------------------- */
export default function BlackPromo() {
  const [active, setActive] = useState<BenefitKey>("ads");
  const data = useMemo(() => BENEFITS[active], [active]);

  return (
    <section className="mx-6 my-6 max-w-screen-xl rounded-[24px] border border-slate-200/70 bg-white/95 px-4 py-6 text-slate-900 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur xl:mx-auto sm:mx-6 sm:px-8 sm:py-8 [.dark_&]:border-white/15 [.dark_&]:bg-white/10 [.dark_&]:text-white">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-[28px] font-bold leading-tight text-slate-900 [.dark_&]:text-white sm:text-[32px]">
            Mai più solo con la <span className="text-sky-600">matematica</span>
            !
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
            {/* play solo se la pill attiva è "ads" */}
            <data.Illustration play={active === "ads"} />
          </div>
        </div>
      </div>

      {/* Pills vantaggi */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(
          [
            ["ads", "Chat illimitata"] as const,
            ["quiz", "Theoremz AI"] as const,
            ["tutor", "Aiuto compiti"] as const,
            ["dark", "Tutte le risorse"] as const,
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
