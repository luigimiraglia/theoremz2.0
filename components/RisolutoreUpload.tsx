"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Upload, Loader2, ImageIcon, Camera, Wand2, Sparkles, Copy, RefreshCw, Eye, EyeOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { useAuth } from "@/lib/AuthContext";
import dynamic from "next/dynamic";
import { useEffect as useReactEffect } from "react";
const BlackPopup = dynamic(() => import("@/components/BlackPopup"), { ssr: false });

type UploadState = "idle" | "uploading" | "processing" | "ready";

type Solution = {
  summary?: string | null;
  finalAnswer?: string | null;
  steps: Array<{ title: string; body: string }>;
  checks?: string[] | null;
};

export default function RisolutoreUpload() {
  const [fileName, setFileName] = useState("");
  const [state, setState] = useState<UploadState>("idle");
  const [imagePreview, setImagePreview] = useState("");
  const [imageData, setImageData] = useState("");
  const [prompt, setPrompt] = useState("");
  const [solution, setSolution] = useState<Solution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const totalSteps = solution?.steps?.length ? solution.steps.length : 0;
  const { isSubscribed } = useAuth();
  const [Popup, setPopup] = useState<ComponentType | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
  }, []);

  const rehypeKatexPlugins = useMemo(
    () => [[rehypeKatex, { strict: false, throwOnError: false }] as const],
    []
  );

  const formatMathContent = (text: string) => {
    const hasDelimiters = text.includes("$");
    const hasMathTokens =
      /\\(in|cup|cap|frac|sqrt|times|cdot|pm|le|ge|alpha|beta|gamma|sin|cos|tan|lim|log|exp)|[∞∈≤≥∑∫π]/.test(text);
    if (!hasDelimiters && hasMathTokens) {
      return `$${text}$`;
    }
    return text;
  };

  const handleFile = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    if (!file) {
      setFileName("");
      setState("idle");
      setImagePreview("");
      setImageData("");
      setSolution(null);
      return;
    }
    setFileName(file.name);
    setState("uploading");
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result?.toString() || "";
      setImagePreview(result);
      setImageData(result);
      setState("idle");
    };
    reader.readAsDataURL(file);
  };

  const solveExercise = async () => {
    try {
      if (!imageData) {
        setError("Carica una foto dell'esercizio");
        return;
      }
      setError(null);
      setSolution(null);
      setState("processing");
      const res = await fetch("/api/risolutore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, image: imageData }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Errore sconosciuto");
      }
      const data = await res.json();
      setSolution({
        summary: data.summary || null,
        finalAnswer: data.finalAnswer || null,
        steps: data.steps || [],
        checks: data.checks || null,
      });
      setState("ready");
    } catch (err: any) {
      setError(err.message || "Impossibile generare la soluzione");
      setState("idle");
    }
  };

  const canGenerate = useMemo(() => !!imageData && state !== "processing", [imageData, state]);

  const copySolution = async () => {
    if (!solution?.steps?.length) return;
    const parts: string[] = [];
    if (solution.finalAnswer) parts.push(`Risultato: ${solution.finalAnswer}`);
    if (solution.summary) parts.push(`Sintesi: ${solution.summary}`);
    solution.steps.forEach((step, idx) => parts.push(`Passaggio ${idx + 1}: ${step.title}\n${step.body}`));
    if (solution.checks?.length) {
      parts.push("Controlli:", ...solution.checks.map((c) => `- ${c}`));
    }
    try {
      await navigator.clipboard.writeText(parts.join("\n\n"));
      setError(null);
    } catch {
      setError("Non riesco a copiare ora, riprova.");
    }
  };

  const requireSub = async () => {
    if (isSubscribed) return true;
    if (!Popup) {
      const mod = await import("@/components/BlackPopup");
      setPopup(() => (mod as any).default ?? (mod as any));
    }
    setShowPopup(true);
    return false;
  };

  useEffect(() => {
    if (!showPopup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPopup(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPopup]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900">
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-gradient-to-r from-sky-50 to-indigo-50 p-4 [.dark_&]:border-slate-800 [.dark_&]:from-slate-800 [.dark_&]:to-slate-900">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 [.dark_&]:text-slate-200">
          <Sparkles className="h-4 w-4 text-sky-500" />
          Risolvi in tre passi: carica foto, aggiungi un appunto, genera.
        </div>
        <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-3 [.dark_&]:text-slate-300">
          <div className="rounded-xl bg-white/70 px-3 py-2 font-semibold text-slate-700 shadow-sm [.dark_&]:bg-slate-800/60 [.dark_&]:text-white">
            🔍 Inquadra bene: foto nitida, niente tagli.
          </div>
          <div className="rounded-xl bg-white/70 px-3 py-2 font-semibold text-slate-700 shadow-sm [.dark_&]:bg-slate-800/60 [.dark_&]:text-white">
            ✍️ Aggiungi note (testo) per chiarire cosa vuoi.
          </div>
          <div className="rounded-xl bg-white/70 px-3 py-2 font-semibold text-slate-700 shadow-sm [.dark_&]:bg-slate-800/60 [.dark_&]:text-white">
            ✅ Passaggi numerati + controlli finali e latex.
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-5">
          {isMobile ? (
            imagePreview ? (
              <button
                type="button"
                onClick={() => replaceInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 [.dark_&]:border-slate-700 [.dark_&]:text-white"
              >
                <Upload size={16} /> Carica un&apos;altra foto
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] px-4 py-3 text-sm font-semibold text-white shadow-sm"
                >
                  <Camera size={16} /> Scatta una foto
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 [.dark_&]:border-slate-700 [.dark_&]:text-white"
                >
                  <Upload size={16} /> Carica dalla galleria
                </button>
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />
                <input ref={galleryInputRef} type="file" accept="image/*" hidden onChange={handleFile} />
              </div>
            )
          ) : imagePreview ? (
            <button
              type="button"
              onClick={() => replaceInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 [.dark_&]:border-slate-700 [.dark_&]:text-white"
            >
              <Upload size={16} /> Carica un&apos;altra foto
            </button>
          ) : (
            <label className="group flex h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-slate-500 hover:bg-white [.dark_&]:border-slate-600 [.dark_&]:bg-slate-900/30">
              <input type="file" accept="image/*" hidden onChange={handleFile} />
              <Upload className="mb-3 h-10 w-10 text-slate-400 transition group-hover:text-slate-900 [.dark_&]:text-slate-300 [.dark_&]:group-hover:text-white" />
              <span className="text-sm font-medium text-slate-700 [.dark_&]:text-slate-100">Trascina qui il file dal desktop</span>
              <span className="text-xs text-slate-500 [.dark_&]:text-slate-400">JPG o PNG fino a 10MB</span>
            </label>
          )}

          <input ref={replaceInputRef} type="file" accept="image/*" hidden onChange={handleFile} />

          {fileName && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900/30">
              <p className="font-medium text-slate-900 [.dark_&]:text-white">{fileName}</p>
              <p className="text-slate-500 [.dark_&]:text-slate-400">Caricato {new Date().toLocaleTimeString()}</p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900/40">
            <label
              htmlFor="prompt"
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 [.dark_&]:text-slate-300"
            >
              <Wand2 className="h-4 w-4 text-sky-500" />
              Note opzionali per il tutor
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Es: dimmi se il metodo è corretto, mostrami la derivata passo passo, controlla unità di misura..."
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 shadow-inner outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900/60 [.dark_&]:text-slate-100"
              disabled={state === "processing"}
            />
          </div>

          {imagePreview && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900/40">
              <div className="mb-2 flex items-center gap-2 text-slate-600 [.dark_&]:text-slate-300">
                <ImageIcon size={16} />
                Anteprima
              </div>
              <img src={imagePreview} alt="Anteprima esercizio" className="max-h-64 w-full rounded-xl object-contain" />
            </div>
          )}

          <button
            type="button"
            onClick={solveExercise}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] px-4 py-3 text-base font-semibold text-white shadow-lg transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canGenerate}
          >
            {state === "processing" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generazione in corso...
              </>
            ) : (
              "Genera soluzione"
            )}
          </button>
          {error && <p className="text-sm text-rose-600">{error}</p>}

          {state === "ready" && (
            <button
              type="button"
              onClick={() => {
                setSolution(null);
                setState("idle");
                setPrompt("");
                setFileName("");
                setImageData("");
                setImagePreview("");
              }}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-700 [.dark_&]:text-slate-300"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Risolvi un altro esercizio
            </button>
          )}
        </div>

        {showPopup && Popup ? (
          <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => {
              if (e.target === overlayRef.current) setShowPopup(false);
            }}
          >
            <div className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-2 shadow-xl [.dark_&]:bg-slate-900">
              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className="absolute right-3 top-3 rounded-full bg-slate-100 p-1 text-slate-600 shadow hover:bg-slate-200 [.dark_&]:bg-slate-800 [.dark_&]:text-slate-200"
                aria-label="Chiudi"
              >
                ✕
              </button>
              <Popup />
            </div>
          </div>
        ) : null}

        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-slate-900 [.dark_&]:text-white">Soluzione proposta</h4>
              <p className="text-sm text-slate-500 [.dark_&]:text-slate-400">Passaggi compatti, latex leggibile, controlli in coda.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!(await requireSub())) return;
                  setShowAnswer((prev) => !prev);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 [.dark_&]:border-slate-700 [.dark_&]:text-slate-200"
              >
                {showAnswer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showAnswer ? "Nascondi" : "Mostra"} risultato
              </button>
              <button
                type="button"
                onClick={copySolution}
                disabled={!solution?.steps?.length}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60 [.dark_&]:border-slate-700 [.dark_&]:text-slate-200"
              >
                <Copy className="h-4 w-4" /> Copia tutto
              </button>
            </div>
          </div>

          {state === "processing" && (
            <div className="grid gap-3 md:grid-cols-2">
              {[1, 2, 3, 4].map((k) => (
                <div
                  key={k}
                  className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50 p-4 shadow-sm [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900/30"
                >
                  <div className="h-4 w-32 rounded bg-slate-200 [.dark_&]:bg-slate-700" />
                  <div className="mt-3 space-y-2">
                    <div className="h-3 w-full rounded bg-slate-200 [.dark_&]:bg-slate-700" />
                    <div className="h-3 w-4/5 rounded bg-slate-200 [.dark_&]:bg-slate-700" />
                    <div className="h-3 w-3/5 rounded bg-slate-200 [.dark_&]:bg-slate-700" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {solution?.finalAnswer && (
            <div className="relative rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 shadow-sm [.dark_&]:border-emerald-700 [.dark_&]:bg-emerald-900/30 [.dark_&]:text-emerald-100">
              <div className="flex items-center justify-between">
                <div className="text-[12px] uppercase tracking-wide text-emerald-600 [.dark_&]:text-emerald-200">
                  Risultato principale
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!(await requireSub())) return;
                    setShowAnswer((prev) => !prev);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white/70 px-2 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-white [.dark_&]:border-emerald-600 [.dark_&]:bg-slate-800 [.dark_&]:text-emerald-200"
                >
                  {showAnswer ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showAnswer ? "Nascondi" : "Mostra"}
                </button>
              </div>
              <div className={`mt-2 text-base font-bold text-slate-900 [.dark_&]:text-white ${showAnswer ? "" : "blur-sm select-none"}`}>
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={rehypeKatexPlugins as any}>
                  {formatMathContent(solution.finalAnswer)}
                </ReactMarkdown>
              </div>
              {!showAnswer && (
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/60 to-white/10 [.dark_&]:from-slate-900/60 [.dark_&]:to-slate-900/10" />
              )}
            </div>
          )}

          {solution?.summary && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm shadow-sm [.dark_&]:border-sky-700 [.dark_&]:bg-sky-900/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 [.dark_&]:text-sky-200">Sintesi</p>
              <p className="mt-1 text-slate-800 [.dark_&]:text-slate-100">{solution.summary}</p>
            </div>
          )}

          {solution?.steps?.length ? (
            <div className="space-y-4">
              {solution.steps.map((step, idx) => {
                const title = step.title || "Passaggio";
                const slug = title.toLowerCase();
                const accent = slug.includes("dato") || slug.includes("estrarre")
                  ? "bg-sky-50 ring-sky-200 [.dark_&]:bg-sky-900/30 [.dark_&]:ring-sky-700"
                  : slug.includes("risultato") || slug.includes("risposta") || slug.includes("conclus")
                    ? "bg-emerald-50 ring-emerald-200 [.dark_&]:bg-emerald-900/30 [.dark_&]:ring-emerald-700"
                    : "bg-white ring-slate-200 [.dark_&]:bg-slate-900/40 [.dark_&]:ring-slate-800";
                const isConclusion =
                  slug.includes("risultato") || slug.includes("risposta") || slug.includes("conclus") || idx === totalSteps - 1;
                const shouldBlur = isConclusion && !showAnswer;

                return (
                  <div key={`${title}-${idx}`} className={`rounded-2xl border border-transparent p-4 shadow-sm ring-1 ${accent}`}>
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shadow [.dark_&]:bg-white [.dark_&]:text-slate-900">
                        {idx + 1}
                      </div>
                      <p className="text-sm font-semibold text-slate-900 [.dark_&]:text-white">{title}</p>
                    </div>
                    <div className="relative">
                      <div
                        className={`prose prose-sm mt-2 max-w-none whitespace-pre-line text-slate-700 prose-code:text-rose-600 prose-strong:text-slate-900 [.dark_&]:prose-invert ${shouldBlur ? "blur-sm select-none" : ""}`}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={rehypeKatexPlugins as any}
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0 leading-snug">{children}</p>,
                            code: ({ children }) => <code className="break-words">{children}</code>,
                            li: ({ children }) => <li className="mb-1 leading-snug">{children}</li>,
                          }}
                        >
                          {step.body || ""}
                        </ReactMarkdown>
                      </div>
                    {shouldBlur && (
                      <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-white/60 to-white/10 [.dark_&]:from-slate-900/60 [.dark_&]:to-slate-900/10" />
                    )}
                  </div>
                  {isConclusion && (
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!(await requireSub())) return;
                          setShowAnswer((prev) => !prev);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white/80 px-2 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-white [.dark_&]:border-emerald-600 [.dark_&]:bg-slate-800 [.dark_&]:text-emerald-200"
                      >
                        {showAnswer ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {showAnswer ? "Nascondi" : "Mostra"}
                      </button>
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          ) : (
            state === "idle" && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 shadow-inner [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900/30 [.dark_&]:text-slate-400">
                Carica una foto e premi “Genera soluzione” per vedere i passaggi qui.
              </div>
            )
          )}

          {solution?.checks?.length ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm shadow-sm [.dark_&]:border-amber-700 [.dark_&]:bg-amber-900/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 [.dark_&]:text-amber-200">Controlli rapidi</p>
              <ul className="mt-2 space-y-1 text-slate-800 [.dark_&]:text-slate-100">
                {solution.checks.map((check, idx) => (
                  <li key={`${check}-${idx}`} className="flex items-start gap-2">
                    <span className="mt-[3px] h-2 w-2 rounded-full bg-amber-500" />
                    <span className="flex-1">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={rehypeKatexPlugins as any}
                        components={{
                          p: ({ children }) => <p className="m-0 leading-snug">{children}</p>,
                          code: ({ children }) => <code className="break-words">{children}</code>,
                        }}
                      >
                        {formatMathContent(check)}
                      </ReactMarkdown>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
