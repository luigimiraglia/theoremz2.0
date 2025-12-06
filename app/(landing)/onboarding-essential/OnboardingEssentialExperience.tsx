"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

type Step = 1 | 2 | 3 | 4;
type BurstPiece = {
  dxStart: string;
  dyStart: string;
  dxEnd: string;
  dyEnd: string;
  color: string;
  delay: number;
  rot: string;
  size: number;
};

export default function OnboardingEssentialExperience() {
  const [step, setStep] = useState<Step>(1);
  const [nome, setNome] = useState("");
  const [classe, setClasse] = useState("");
  const [videoEnded, setVideoEnded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [finalConfetti, setFinalConfetti] = useState(false);

  const formReady = nome.trim().length > 0 && classe.trim().length > 0;

  const buildBurst = (palette: string[]) => {
    const pieces: BurstPiece[] = [];
    const total = 70;
    for (let i = 0; i < total; i++) {
      const angle = (Math.PI * 2 * i) / total + Math.random() * 0.5;
      const baseDistance = 220 + Math.random() * 200;
      const dx = Math.cos(angle) * baseDistance;
      const dy = Math.sin(angle) * baseDistance;
      const startFactor = 0.35;
      const endFactor = 1.35;
      pieces.push({
        dxStart: `${(dx * startFactor).toFixed(1)}px`,
        dyStart: `${(dy * startFactor).toFixed(1)}px`,
        dxEnd: `${(dx * endFactor).toFixed(1)}px`,
        dyEnd: `${(dy * endFactor).toFixed(1)}px`,
        color: palette[i % palette.length],
        delay: Math.random() * 0.12,
        rot: `${Math.random() * 260 - 130}deg`,
        size: 6 + Math.random() * 9,
      });
    }
    return pieces;
  };

  const burstPieces = useMemo(
    () => buildBurst(["#1d4ed8", "#0ea5e9", "#38bdf8", "#67e8f9"]),
    [],
  );
  const finalBurstPieces = useMemo(
    () => buildBurst(["#1d4ed8", "#38bdf8", "#ef4444", "#f97316"]),
    [],
  );

  useEffect(() => {
    if (step !== 2) return;
    setVideoEnded(false);
    const timer = setTimeout(() => {
      setVideoEnded(true);
    }, 25000);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step === 3) {
      setFinalConfetti(true);
    } else {
      setFinalConfetti(false);
    }
  }, [step]);

  useEffect(() => {
    setMounted(true);
    setShowConfetti(true);
    const t = setTimeout(() => setShowConfetti(false), 2600);
    return () => clearTimeout(t);
  }, []);

  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="space-y-5">
          <h1 className="text-[26px] font-black leading-tight text-slate-900 dark:text-white">
            Benvenuto su Theoremz Essential 🎉
          </h1>
          <p className="text-[15px] font-semibold text-slate-600 dark:text-slate-300">
            Inserisci nome e classe per iniziare
          </p>

          <input
            id="onb-essential-nome"
            name="onb-essential-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-sky-400 dark:focus:ring-slate-700"
            placeholder="Nome"
          />

          <input
            id="onb-essential-classe"
            name="onb-essential-classe"
            value={classe}
            onChange={(e) => setClasse(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-blue-400 dark:focus:ring-slate-700"
            placeholder="Classe"
          />

          <button
            type="button"
            disabled={!formReady}
            onClick={() => setStep(2)}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-[15px] font-extrabold transition ${
              formReady
                ? "border-transparent bg-[linear-gradient(90deg,#1d4ed8,#0ea5e9,#38bdf8)] text-white"
                : "border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600"
            }`}
          >
            Inizia ora
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-5">
          <h1 className="text-[22px] font-black leading-tight text-slate-900 dark:text-white">
            Video introduttivo
          </h1>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-black dark:border-slate-800">
            <div className="aspect-video w-full">
              <iframe
                className="h-full w-full brightness-[1.15] saturate-110"
                src="https://www.youtube.com/embed/CD5Wb_wJKJM?rel=0&modestbranding=1&playsinline=1&autoplay=1&controls=0&disablekb=1&fs=0"
                title="Onboarding Essential"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            {!videoEnded ? (
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 to-white/0" />
            ) : null}
          </div>

          <button
            type="button"
            disabled={!videoEnded}
            onClick={() => videoEnded && setStep(3)}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-[15px] font-extrabold transition ${
              videoEnded
                ? "border-transparent bg-[linear-gradient(90deg,#1d4ed8,#0ea5e9,#38bdf8)] text-white"
                : "border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600"
            }`}
          >
            Continua
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-5">
          <h1 className="text-[24px] font-black leading-tight text-slate-900 dark:text-white">
            🔥 Grande, hai iniziato il tuo percorso con Essential!
          </h1>
          <ol className="space-y-2 text-[14px] font-semibold text-slate-700 dark:text-slate-200">
            <li>1. Sei dentro al programma Essential.</li>
            <li>2. Ti seguiamo noi passo passo.</li>
            <li>3. Prima di iniziare puoi:</li>
          </ol>
          <div className="space-y-3">
            <Link
              href="/account"
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-extrabold text-slate-900 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              👉 Studiare sul sito (vai al tuo account)
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <a
              href="https://wa.me/393520646070"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-extrabold text-slate-900 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              👉 Mandarmi un dubbio su WhatsApp
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-[14px] font-extrabold text-slate-900 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              👉 Sono un genitore
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <h1 className="text-[24px] font-black leading-tight text-slate-900 dark:text-white">
          Info per i genitori
        </h1>
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-black dark:border-slate-800">
          <div className="aspect-video w-full">
            <iframe
              className="h-full w-full brightness-[1.1] saturate-110"
              src="https://www.youtube.com/embed/UA1gfshisHc?rel=0&modestbranding=1&playsinline=1&autoplay=1&controls=0&disablekb=1&fs=0"
              title="Genitori Essential"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setStep(3)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-transparent bg-[linear-gradient(90deg,#1d4ed8,#0ea5e9,#38bdf8)] px-5 py-3 text-[15px] font-extrabold text-white transition"
        >
          Torna alle indicazioni
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    );
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes popFadeIn {
              0% { opacity: 1; transform: translateY(18px) scale(0.98); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes confettiBurst {
              0% { opacity: 0; transform: translate(calc(-50% + var(--dx-start)), calc(-50% + var(--dy-start))) scale(0.6) rotate(0deg); }
              12% { opacity: 1; transform: translate(calc(-50% + var(--dx-start)), calc(-50% + var(--dy-start))) scale(0.9) rotate(10deg); }
              60% { opacity: 0.9; }
              80% { opacity: 0; }
              100% { opacity: 0; transform: translate(calc(-50% + var(--dx-end)), calc(-50% + var(--dy-end))) rotate(var(--rot)) scale(1.2); }
            }
          `,
        }}
      />
      {showConfetti ? (
        <div className="pointer-events-none absolute inset-0 z-0">
          {burstPieces.map((p, idx) => (
            <span
              key={idx}
              className="absolute left-1/2 block rounded-sm"
              style={{
                top: "32%",
                width: p.size,
                height: p.size * 2,
                backgroundColor: p.color,
                animation: "confettiBurst 2s ease-out forwards",
                animationDelay: `${p.delay}s`,
                ["--dx-start" as string]: p.dxStart,
                ["--dy-start" as string]: p.dyStart,
                ["--dx-end" as string]: p.dxEnd,
                ["--dy-end" as string]: p.dyEnd,
                ["--rot" as string]: p.rot,
              }}
            />
          ))}
        </div>
      ) : null}
      {finalConfetti ? (
        <div className="pointer-events-none absolute inset-0 z-0">
          {finalBurstPieces.map((p, idx) => (
            <span
              key={`final-${idx}`}
              className="absolute left-1/2 block rounded-sm"
              style={{
                top: "32%",
                width: p.size,
                height: p.size * 2,
                backgroundColor: p.color,
                animation: "confettiBurst 2s ease-out forwards",
                animationDelay: `${p.delay}s`,
                ["--dx-start" as string]: p.dxStart,
                ["--dy-start" as string]: p.dyStart,
                ["--dx-end" as string]: p.dxEnd,
                ["--dy-end" as string]: p.dyEnd,
                ["--rot" as string]: p.rot,
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-3xl items-start justify-center px-4 py-8 sm:px-8 sm:py-10">
        <div
          className="relative w-full space-y-6 overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 py-7 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-8"
          style={{ animation: mounted ? "popFadeIn 0.6s ease-out" : "none" }}
        >
          {renderStep()}
        </div>
      </div>
    </main>
  );
}
