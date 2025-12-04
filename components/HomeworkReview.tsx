/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2, Upload, Camera, ImageIcon, Sparkles, CheckCircle2, XCircle, ArrowUpRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { useAuth } from "@/lib/AuthContext";
import dynamic from "next/dynamic";
import { useEffect } from "react";

const BlackPopup = dynamic(() => import("@/components/BlackPopup"), { ssr: false });

type ReviewResult = {
  exercises: Array<{
    title: string;
    score: number | null;
    correct: string[];
    issues: string[];
    improvements: string[];
  }>;
  overall?: string | null;
};

type UploadState = "idle" | "uploading" | "processing";

export default function HomeworkReview() {
  const { isSubscribed } = useAuth();
  const [state, setState] = useState<UploadState>("idle");
  const [images, setImages] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const katexPlugins = useMemo(
    () => [[rehypeKatex, { strict: false, throwOnError: false }] as const],
    []
  );

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, 5);
    setState("uploading");
    const readers: Promise<string>[] = list.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result?.toString() || "");
          reader.readAsDataURL(file);
        })
    );
    Promise.all(readers)
      .then((data) => {
        setImages(data);
        setPreviews(data);
        setResult(null);
        setError(null);
      })
      .catch(() => setError("Errore nel caricamento delle immagini"))
      .finally(() => setState("idle"));
  };

  const submit = async () => {
    if (!images.length) {
      setError("Carica almeno una foto dei compiti");
      return;
    }
    if (!isSubscribed) {
      setShowPopup(true);
      return;
    }
    setState("processing");
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/compiti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Errore imprevisto");
      }
      setResult(data as ReviewResult);
    } catch (err: any) {
      setError(err.message || "Non riesco a valutare ora");
    } finally {
      setState("idle");
    }
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
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-gradient-to-r from-sky-50 to-indigo-50 p-4 [.dark_&]:border-slate-800 [.dark_&]:from-slate-800 [.dark_&]:to-slate-900">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 [.dark_&]:text-slate-200">
          <Sparkles className="h-4 w-4 text-sky-500" />
          Carica i compiti svolti, l&apos;AI li valuta come una verifica.
        </div>
        <p className="text-xs text-slate-600 [.dark_&]:text-slate-300">
          Identifica ogni esercizio, assegna un punteggio 0-10, evidenzia cosa va bene, cosa manca e come migliorare.
        </p>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.6fr,1fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
            >
              <Camera className="h-4 w-4" /> Scatta foto
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 [.dark_&]:border-slate-700 [.dark_&]:text-white"
            >
              <Upload className="h-4 w-4" /> Carica dalla galleria
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
            <input ref={galleryInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
          </div>

          {!!previews.length && (
            <div className="grid gap-3 md:grid-cols-2">
              {previews.map((src, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-3 text-sm [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900/40">
                  <div className="mb-2 flex items-center gap-2 text-slate-600 [.dark_&]:text-slate-300">
                    <ImageIcon className="h-4 w-4" />
                    Foto {idx + 1}
                  </div>
                  <img src={src} alt={`Compito ${idx + 1}`} className="max-h-64 w-full rounded-xl object-contain" />
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900/40">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 [.dark_&]:text-slate-300">
              Note opzionali
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Es: esercizi 1-3 algebra, indicami dove sbaglio i segni; dimmi se la forma della soluzione è ok. Mostrami la soluzione passo passo."
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 shadow-inner outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900/60 [.dark_&]:text-slate-100"
              disabled={state === "processing"}
            />
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={state === "processing"}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-3 text-base font-semibold text-white shadow-lg transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state === "processing" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sto valutando i compiti...
              </>
            ) : (
              "Ottieni feedback"
            )}
          </button>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900/40">
          <div className="flex items-center gap-2 text-slate-800 [.dark_&]:text-slate-100">
            <Sparkles className="h-4 w-4 text-sky-500" />
            Risultati
          </div>
          {!result && state !== "processing" && (
            <p className="text-slate-500 [.dark_&]:text-slate-300">Carica i compiti per vedere il feedback qui.</p>
          )}
          {state === "processing" && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50 p-3 [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900/30">
                  <div className="h-4 w-28 rounded bg-slate-200 [.dark_&]:bg-slate-700" />
                  <div className="mt-2 space-y-2">
                    <div className="h-3 w-full rounded bg-slate-200 [.dark_&]:bg-slate-700" />
                    <div className="h-3 w-3/4 rounded bg-slate-200 [.dark_&]:bg-slate-700" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {result?.exercises?.length ? (
            <div className="space-y-3">
              {result.exercises.map((ex, idx) => (
                <div key={`${ex.title}-${idx}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900/40">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white [.dark_&]:bg-white [.dark_&]:text-slate-900">
                        {idx + 1}
                      </span>
                      <p className="text-sm font-semibold text-slate-900 [.dark_&]:text-white">{ex.title}</p>
                    </div>
                    {typeof ex.score === "number" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 [.dark_&]:bg-emerald-900/40 [.dark_&]:text-emerald-200">
                        {ex.score.toFixed(1)}/10
                      </span>
                    ) : null}
                  </div>

                  {ex.correct?.length ? (
                    <div className="mt-2 flex items-start gap-2 text-sm text-emerald-700 [.dark_&]:text-emerald-300">
                      <CheckCircle2 className="mt-0.5 h-4 w-4" />
                      <div className="space-y-1">
                        {ex.correct.map((c, i) => (
                          <p key={i}>{c}</p>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {ex.issues?.length ? (
                    <div className="mt-2 flex items-start gap-2 text-sm text-rose-700 [.dark_&]:text-rose-300">
                      <XCircle className="mt-0.5 h-4 w-4" />
                      <div className="space-y-1">
                        {ex.issues.map((c, i) => (
                          <p key={i}>{c}</p>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {ex.improvements?.length ? (
                    <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm [.dark_&]:border-slate-700 [.dark_&]:bg-slate-800 [.dark_&]:text-slate-100">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 [.dark_&]:text-slate-300">
                        <ArrowUpRight className="h-4 w-4" /> Come migliorare
                      </div>
                      <ul className="mt-1 space-y-1">
                        {ex.improvements.map((imp, i) => (
                          <li key={i} className="leading-snug">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={katexPlugins as any}>
                              {imp}
                            </ReactMarkdown>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {result?.overall ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm [.dark_&]:border-slate-700 [.dark_&]:bg-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 [.dark_&]:text-slate-300">Feedback generale</p>
              <p className="mt-1 leading-relaxed text-slate-800 [.dark_&]:text-slate-100">{result.overall}</p>
            </div>
          ) : null}
        </div>
      </div>

      {!isSubscribed && showPopup && (
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
            <BlackPopup />
          </div>
        </div>
      )}
    </section>
  );
}
