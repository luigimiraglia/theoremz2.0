"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  Loader2,
  CheckCircle2,
  ImageIcon,
  ClipboardList,
  Camera,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

type UploadState = "idle" | "uploading" | "processing" | "ready";

export default function RisolutoreUpload() {
  const [fileName, setFileName] = useState<string>("");
  const [state, setState] = useState<UploadState>("idle");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageData, setImageData] = useState<string>("");
  const [steps, setSteps] = useState<Array<{ title: string; body: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const statusCopy = useMemo(() => {
    switch (state) {
      case "uploading":
        return "Caricamento in corso...";
      case "processing":
        return "Theoremz AI sta preparando la soluzione";
      case "ready":
        return "Soluzione pronta";
      default:
        return "Nessun file caricato";
    }
  }, [state]);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
  }, []);

  const handleFile = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    if (!file) {
      setFileName("");
      setState("idle");
      setImagePreview("");
      setImageData("");
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
      setSteps(null);
      setState("processing");
      const res = await fetch("/api/risolutore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "", image: imageData }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Errore sconosciuto");
      }
      const data = await res.json();
      setSteps(data.steps || []);
      setState("ready");
    } catch (err: any) {
      setError(err.message || "Impossibile generare la soluzione");
      setState("idle");
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900">
      <div className="grid gap-8 lg:grid-cols-[3fr,1.2fr]">
        <div className="space-y-5">
          {isMobile ? (
            imagePreview ? (
              <button
                type="button"
                onClick={() => replaceInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 [.dark_&]:border-slate-700 [.dark_&]:text-white"
              >
                <Upload size={16} /> Carica un'altra foto
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
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={handleFile}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleFile}
                />
              </div>
            )
          ) : imagePreview ? (
            <button
              type="button"
              onClick={() => replaceInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 [.dark_&]:border-slate-700 [.dark_&]:text-white"
            >
              <Upload size={16} /> Carica un'altra foto
            </button>
          ) : (
            <label className="group flex h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-slate-500 hover:bg-white [.dark_&]:border-slate-600 [.dark_&]:bg-slate-900/30">
              <input type="file" accept="image/*" hidden onChange={handleFile} />
              <Upload className="mb-3 h-10 w-10 text-slate-400 transition group-hover:text-slate-900 [.dark_&]:text-slate-300 [.dark_&]:group-hover:text-white" />
              <span className="text-sm font-medium text-slate-700 [.dark_&]:text-slate-100">
                Trascina qui il file dal desktop
              </span>
              <span className="text-xs text-slate-500 [.dark_&]:text-slate-400">
                JPG o PNG fino a 10MB
              </span>
            </label>
          )}

          <input ref={replaceInputRef} type="file" accept="image/*" hidden onChange={handleFile} />

          {fileName && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900/30">
              <p className="font-medium text-slate-900 [.dark_&]:text-white">{fileName}</p>
              <p className="text-slate-500 [.dark_&]:text-slate-400">Caricato {new Date().toLocaleTimeString()}</p>
            </div>
          )}
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
            disabled={state === "processing" || !imageData}
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
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/90 p-5 [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm [.dark_&]:bg-white [.dark_&]:text-slate-900">
              {state === "ready" ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <Loader2 className="h-6 w-6 animate-spin text-white" />}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 [.dark_&]:text-slate-400">Stato</p>
              <p className="text-base font-semibold text-slate-900 [.dark_&]:text-white">{statusCopy}</p>
            </div>
          </div>
          <ul className="space-y-3 text-sm text-slate-600 [.dark_&]:text-slate-300">
            <li className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900/60">
              <p className="flex items-center gap-2 font-semibold text-slate-900 [.dark_&]:text-white">
                <ClipboardList size={16} /> Pipeline
              </p>
              <p className="text-xs text-slate-500 [.dark_&]:text-slate-400">Dati → Strategia → Applicazione → Risposta finale.</p>
            </li>
            <li className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900/60">
              <p className="font-semibold text-slate-900 [.dark_&]:text-white">Formato tutor</p>
              <p>Ogni passaggio usa Markdown e Latex come nella chat AI standard.</p>
            </li>
            <li className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900/60">
              <p className="font-semibold text-slate-900 [.dark_&]:text-white">Risposte complete</p>
              <p>Verifichiamo di rispondere a tutte le domande dell'esercizio.</p>
            </li>
          </ul>
        </div>
      </div>

      {steps?.length ? (
        <div className="mt-8 space-y-4">
          <h4 className="text-lg font-semibold text-slate-900 [.dark_&]:text-white">Soluzione proposta</h4>
          <div className="space-y-4">
            {steps.map((step, idx) => {
              const title = step.title || "Passaggio";
              const slug = title.toLowerCase();
              const accent = slug.includes("dato") || slug.includes("estrarre")
                ? "bg-sky-50 ring-sky-200 [.dark_&]:bg-sky-900/30 [.dark_&]:ring-sky-700"
                : slug.includes("risultato") || slug.includes("risposta") || slug.includes("conclus")
                  ? "bg-emerald-50 ring-emerald-200 [.dark_&]:bg-emerald-900/30 [.dark_&]:ring-emerald-700"
                  : "bg-white ring-slate-200 [.dark_&]:bg-slate-900/40 [.dark_&]:ring-slate-800";

              return (
                <div
                  key={`${title}-${idx}`}
                  className={`rounded-2xl border border-transparent p-4 shadow-sm ring-1 ${accent}`}
                >
                  <p className="text-sm font-semibold text-slate-900 [.dark_&]:text-white">{title}</p>
                  <div className="prose prose-sm mt-3 max-w-none whitespace-pre-line text-slate-700 prose-code:text-rose-600 prose-strong:text-slate-900 [.dark_&]:prose-invert">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        p: ({ children }) => (
                          <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>
                        ),
                        code: ({ children }) => <code className="break-words">{children}</code>,
                      }}
                    >
                      {step.body}
                    </ReactMarkdown>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
