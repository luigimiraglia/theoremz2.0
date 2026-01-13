/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unused-expressions */
"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Loader2, Play, StopCircle, Mic, MicOff, Send, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import dynamic from "next/dynamic";

const BlackPopup = dynamic(() => import("@/components/BlackPopup"), { ssr: false });

type QA = { question: string; answer: string };
type Feedback = { lastAnswer: string | null; scoreComment: string | null } | null;
type FinalEval = { grade: number | null; summary: string | null; strengths: string[]; weaknesses: string[] } | null;

export default function InterrogazioneSim({ prefilledTopic }: { prefilledTopic?: string }) {
  const { isSubscribed } = useAuth();
  const [topic, setTopic] = useState(prefilledTopic || "");
  const [targetQuestions, setTargetQuestions] = useState(5);
  const [history, setHistory] = useState<QA[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [finalEval, setFinalEval] = useState<FinalEval>(null);
  const [state, setState] = useState<"idle" | "asking" | "submitting" | "finished">("idle");
  const [showPopup, setShowPopup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [recording, setRecording] = useState<"idle" | "recording" | "uploading">("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const canStart = topic.trim().length > 2 && state === "idle";

  const resetSession = () => {
    setHistory([]);
    setFeedback(null);
    setFinalEval(null);
    setAnswer("");
    setCurrentQuestion(null);
    setState("idle");
    setError(null);
  };

  useEffect(() => {
    if (prefilledTopic) setTopic(prefilledTopic);
  }, [prefilledTopic]);

  const startSession = async () => {
    if (!isSubscribed) {
      setShowPopup(true);
      return;
    }
    setError(null);
    resetSession();
    setState("asking");
    const q = await fetchNextQuestion([]);
    if (q) {
      setCurrentQuestion(q);
    } else {
      setError("Non riesco a generare la prima domanda.");
      setState("idle");
    }
  };

  const getToken = async () => {
    const { getAuth } = await import("firebase/auth");
    return await getAuth().currentUser?.getIdToken();
  };

  const fetchNextQuestion = async (hist: QA[]) => {
    try {
      const token = await getToken();
      if (!token) {
        setShowPopup(true);
        return null;
      }
      const res = await fetch("/api/interrogazione", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ topic, history: hist }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Errore imprevisto");
      if (data.feedback) setFeedback(data.feedback);
      return data.nextQuestion as string | null;
    } catch (err: any) {
      setError(err.message || "Errore rete");
      return null;
    }
  };

  const submitAnswer = async (textOverride?: string) => {
    const content = (textOverride ?? answer).trim();
    if (!currentQuestion || !content) return;
    const newHist = [...history, { question: currentQuestion, answer: content }];
    setState("submitting");
    setAnswer("");
    setFeedback(null);
    setError(null);
    setHistory(newHist);

    const reached = newHist.length >= targetQuestions;
    if (reached) {
      try {
        const token = await getToken();
        if (!token) {
          setShowPopup(true);
          throw new Error("missing_token");
        }
        const res = await fetch("/api/interrogazione", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ topic, history: newHist, done: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Errore finale");
        setFeedback(data.feedback || null);
        setFinalEval(data.final || null);
        setCurrentQuestion(null);
        setState("finished");
      } catch (err: any) {
        setError(err.message || "Errore finale");
        setState("finished");
      }
      return;
    }

    const next = await fetchNextQuestion(newHist);
    if (next) {
      setCurrentQuestion(next);
      setState("asking");
    } else {
      setState("finished");
    }
  };

  const progress = useMemo(() => {
    const total = Math.max(targetQuestions, 1);
    const done = Math.min(history.length, total);
    return Math.round((done / total) * 100);
  }, [history.length, targetQuestions]);

  const showSetup = state === "idle";
  const showLive = state !== "idle";

  useEffect(() => {
    if (!showPopup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPopup(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPopup]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = handleRecordingStop;
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording("recording");
    } catch (err: any) {
      setError("Microfono non disponibile");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
  };

  const handleRecordingStop = async () => {
    if (!chunksRef.current.length) {
      setRecording("idle");
      return;
    }
    setRecording("uploading");
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const base64 = await blobToBase64(blob);
    try {
      const token = await getToken();
      if (!token) {
        setShowPopup(true);
        throw new Error("missing_token");
      }
      const res = await fetch("/api/interrogazione/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ audio: base64, mime: blob.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Errore trascrizione");
      const text = (data?.text || "").trim();
      if (text) {
        await submitAnswer(text);
      }
    } catch (err: any) {
      setError(err.message || "Errore trascrizione audio");
    } finally {
      setRecording("idle");
    }
  };

  const blobToBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(",")[1] || "");
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm [.dark_&]:border-slate-800 [.dark_&]:bg-slate-900">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-gradient-to-r from-sky-50 to-indigo-50 p-4 [.dark_&]:border-slate-800 [.dark_&]:from-slate-800 [.dark_&]:to-slate-900">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 [.dark_&]:text-slate-200">
          <Sparkles className="h-4 w-4 text-sky-500" />
          Simulazione interrogazione con feedback e voto finale.
        </div>
        <p className="text-xs text-slate-600 [.dark_&]:text-slate-300">
          Rispondi alle domande, l&apos;AI valuta subito e alla fine ti assegna un voto in decimi con punti di forza e da migliorare.
        </p>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <div className="space-y-4">
          {finalEval && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm shadow-sm [.dark_&]:border-emerald-700 [.dark_&]:bg-emerald-900/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 [.dark_&]:text-emerald-200">Interrogazione conclusa</p>
              <p className="mt-2 text-2xl font-black text-emerald-800 [.dark_&]:text-emerald-100">
                Voto: {typeof finalEval.grade === "number" ? `${finalEval.grade.toFixed(1)}/10` : "—"}
              </p>
              {finalEval.summary && <p className="mt-2 text-slate-800 [.dark_&]:text-slate-100">{finalEval.summary}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={startSession}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
                >
                  <Play className="h-4 w-4" /> Rifai interrogazione
                </button>
                <button
                  type="button"
                  onClick={resetSession}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 [.dark_&]:border-slate-700 [.dark_&]:text-slate-200"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
          <div className="space-y-3">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Argomento (es. equazioni di 2° grado, derivate...)"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900/60 [.dark_&]:text-slate-100"
              disabled={state !== "idle"}
            />
            <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 [.dark_&]:text-slate-300">
                Durata stimata (domande)
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { label: "5 min", value: 3 },
                  { label: "15 min", value: 6 },
                  { label: "30 min", value: 10 },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setTargetQuestions(opt.value)}
                    disabled={state !== "idle"}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold shadow-sm transition ${
                      targetQuestions === opt.value
                        ? "bg-sky-600 text-white shadow-lg"
                        : "border border-slate-200 text-slate-700 hover:border-slate-300 [.dark_&]:border-slate-700 [.dark_&]:text-slate-200"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {opt.label} · ~{opt.value} domande
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={startSession}
              disabled={!canStart}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state === "asking" ? <StopCircle className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {state === "asking" ? "Ricomincia" : "Avvia simulazione"}
            </button>
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 [.dark_&]:border-slate-700 [.dark_&]:text-slate-200">
              {recording === "recording" ? <MicOff className="h-4 w-4 text-rose-600" /> : <Mic className="h-4 w-4" />}
              {recording === "recording" ? "Registrazione in corso..." : "Rispondi parlando (trascrizione)"}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900/40">
            <div className="flex items-center justify-between text-sm font-semibold text-slate-700 [.dark_&]:text-slate-200">
              <span>Progresso</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 [.dark_&]:bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 [.dark_&]:text-slate-300">Domanda</p>
            <div className="mt-2 min-h-[60px] text-sm font-semibold text-slate-900 [.dark_&]:text-white">
              {state === "finished" && finalEval
                ? "Interrogazione conclusa."
                : currentQuestion || "Avvia per ricevere la prima domanda."}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900/40">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 [.dark_&]:text-slate-300">Risposta</label>
            {state === "finished" && finalEval ? (
              <p className="mt-2 text-sm text-slate-600 [.dark_&]:text-slate-200">Interrogazione chiusa. Vedi il voto finale.</p>
            ) : (
              <>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={4}
                  placeholder="Scrivi o detta la risposta. L'AI la valuta e suggerisce correzioni."
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 shadow-inner outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900/60 [.dark_&]:text-slate-100"
                  disabled={!currentQuestion || state === "submitting"}
                />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={recording === "recording" ? stopRecording : startRecording}
                    disabled={recording === "uploading" || state === "submitting" || !currentQuestion}
                    className={`inline-flex items-center gap-3 rounded-2xl px-5 py-3 text-base font-bold shadow-md transition disabled:cursor-not-allowed disabled:opacity-60 [.dark_&]:border-slate-700 [.dark_&]:text-slate-200 ${
                      recording === "recording"
                        ? "border border-rose-300 bg-rose-50 text-rose-700 animate-[pulse_1s_ease-in-out_infinite] [.dark_&]:bg-rose-900/40 [.dark_&]:border-rose-700"
                        : "border border-slate-200 text-slate-800 hover:border-slate-300 hover:shadow-lg"
                    }`}
                  >
                    {recording === "recording" ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    {recording === "recording" ? "Stop registrazione" : "Detta la risposta"}
                    {recording === "uploading" && <Loader2 className="h-4 w-4 animate-spin" />}
                  </button>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => submitAnswer()}
                      disabled={!currentQuestion || !answer.trim() || state === "submitting"}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {state === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Invia risposta
                    </button>
                  </div>
                </div>
              </>
            )}
            {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
          </div>

          {feedback && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm shadow-sm [.dark_&]:border-amber-700 [.dark_&]:bg-amber-900/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 [.dark_&]:text-amber-200">Feedback immediato</p>
              {feedback.lastAnswer && <p className="mt-2 text-slate-800 [.dark_&]:text-slate-100">{feedback.lastAnswer}</p>}
              {feedback.scoreComment && (
                <p className="mt-2 text-slate-800 [.dark_&]:text-slate-100 font-semibold">{feedback.scoreComment}</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900/40">
          <div className="flex items-center gap-2 text-slate-800 [.dark_&]:text-slate-100">
            <Sparkles className="h-4 w-4 text-sky-500" />
            Cronologia risposte
          </div>
          {history.length === 0 ? (
            <p className="text-slate-500 [.dark_&]:text-slate-300">Le risposte appariranno qui.</p>
          ) : (
            <div className="space-y-3">
              {history.map((qa, idx) => (
                <div key={`${idx}-${qa.question.slice(0, 20)}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm [.dark_&]:border-slate-700 [.dark_&]:bg-slate-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 [.dark_&]:text-slate-400">Domanda {idx + 1}</p>
                  <p className="text-slate-900 [.dark_&]:text-white">{qa.question}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500 [.dark_&]:text-slate-400">Risposta</p>
                  <p className="text-slate-800 [.dark_&]:text-slate-200">{qa.answer}</p>
                </div>
              ))}
            </div>
          )}

          {finalEval && (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm shadow-sm [.dark_&]:border-emerald-700 [.dark_&]:bg-emerald-900/30">
              <div className="flex items-center gap-2 text-emerald-800 [.dark_&]:text-emerald-100">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-lg font-bold">
                  Voto: {typeof finalEval.grade === "number" ? `${finalEval.grade.toFixed(1)}/10` : "—"}
                </span>
              </div>
              {finalEval.summary && <p className="text-slate-800 [.dark_&]:text-slate-100">{finalEval.summary}</p>}
              {finalEval.strengths?.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 [.dark_&]:text-emerald-200">Punti di forza</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-800 [.dark_&]:text-slate-100">
                    {finalEval.strengths.map((s, i) => (
                      <li key={`s-${i}`}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {finalEval.weaknesses?.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 [.dark_&]:text-amber-200">Da migliorare</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-800 [.dark_&]:text-slate-100">
                    {finalEval.weaknesses.map((s, i) => (
                      <li key={`w-${i}`}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}

          {error && state === "finished" && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 [.dark_&]:border-amber-700 [.dark_&]:bg-amber-900/30 [.dark_&]:text-amber-100">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}
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
"/* eslint-disable @typescript-eslint/no-unused-vars */\n"
"/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unused-expressions */\n"
