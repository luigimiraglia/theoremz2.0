/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unused-expressions, @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ListChecks, Timer as TimerIcon, FileText, PlayCircle, Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuth } from "firebase/auth";
import { useAuth } from "@/lib/AuthContext";
import BlackPopup from "@/components/BlackPopup";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

type SavedLessonDoc = {
  lessonId: string;
  slug: string;
  title: string;
  thumb?: string | null;
};

type LessonRef = {
  id: string;
  title: string;
  slug: string;
};

export default function SimulaVerificaPage() {
  const { user, isSubscribed, loading } = useAuth();
  const router = useRouter();

  // Non fare redirect automatico, lascia che l'utente veda la pagina
  // e mostra un messaggio se non è loggato

  const [loadingSaved, setLoadingSaved] = useState(true);
  const [savedLessons, setSavedLessons] = useState<LessonRef[]>([]);

  // fetch saved lessons with details from our API
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoadingSaved(true);
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) return;
        const res = await fetch("/api/me/saved-lessons", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok || !Array.isArray(json.items)) return;
        if (abort) return;
        const mapped: LessonRef[] = (json.items as SavedLessonDoc[]).map(
          (x) => ({ id: x.lessonId, title: x.title, slug: x.slug })
        );
        setSavedLessons(mapped);
      } catch (e) {
        console.error("Errore caricamento salvati", e);
      } finally {
        if (!abort) setLoadingSaved(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, []);

  // Preselezione da querystring: ?lessonId=...&slug=...&title=...
  const searchParams = useSearchParams();
  const [entryLesson, setEntryLesson] = useState<LessonRef | null>(null);
  useEffect(() => {
    try {
      const id = searchParams?.get("lessonId");
      const slug = searchParams?.get("slug");
      const title = searchParams?.get("title");
      if (id && slug) {
        setEntryLesson({ id, slug, title: title || slug });
        setStep((prev) => (prev === "classe" ? "argomenti" : prev));
      }
    } catch {}
  }, [searchParams]);

  const [search, setSearch] = useState("");
  const [bulkTopics, setBulkTopics] = useState("");
  const [bulkAdding, setBulkAdding] = useState(false);
  const [bulkMissing, setBulkMissing] = useState<string[]>([]);
  const [bulkAddedCount, setBulkAddedCount] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<LessonRef[]>([]);
  const [suggested, setSuggested] = useState<LessonRef[]>([]);
  const [selected, setSelected] = useState<LessonRef[]>([]);
  const [showAllSuggested, setShowAllSuggested] = useState(false);
  // exam duration (minutes): only 60 or 120
  const [duration, setDuration] = useState<number>(60);
  const [durationLocked, setDurationLocked] = useState(false);
  const [startAt, setStartAt] = useState<number | null>(null);
  const [genProgress, setGenProgress] = useState(0);
  type Step = "classe" | "argomenti" | "durata" | "generazione" | "pronto" | "verifica" | "fine";
  const [step, setStep] = useState<Step>("classe");
  const [cycle, setCycle] = useState<"medie" | "liceo">("liceo");
  const [year, setYear] = useState<number>(4);
  const [indirizzo, setIndirizzo] = useState<string>("");
  const [classStage, setClassStage] = useState<"cycle" | "year" | "indirizzo">("cycle");
  const classeLabel = useMemo(() => {
    const ord = `${year}º`;
    if (cycle === "medie") return `${ord} Media`;
    const ind = (indirizzo || "").trim();
    const cap = ind ? ind.charAt(0).toUpperCase() + ind.slice(1) : "";
    return cap ? `${ord} Liceo ${cap}` : `${ord} Liceo`;
  }, [cycle, year, indirizzo]);

  async function doSearch(q: string) {
    try {
      setSearching(true);
      const res = await fetch(`/api/lessons-search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (res.ok && Array.isArray(json.items)) setResults(json.items);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  }

  function parseTopicsInput(value: string) {
    return value
      .split(/\r?\n|,|;/)
      .map((item) => item.replace(/^[-•]\s*/, "").trim())
      .filter(Boolean);
  }

  async function handleBulkAdd() {
    const items = parseTopicsInput(bulkTopics);
    setBulkMissing([]);
    setBulkAddedCount(null);
    if (!items.length) return;
    setBulkAdding(true);
    try {
      const responses = await Promise.all(
        items.map(async (topic) => {
          try {
            const res = await fetch(
              `/api/lessons-search?q=${encodeURIComponent(topic)}`
            );
            const json = await res.json();
            if (res.ok && Array.isArray(json.items) && json.items.length) {
              return { topic, lesson: json.items[0] as LessonRef };
            }
          } catch {}
          return { topic, lesson: null };
        })
      );

      const missing: string[] = [];
      const toAdd: LessonRef[] = [];
      for (const entry of responses) {
        if (!entry.lesson) {
          missing.push(entry.topic);
          continue;
        }
        toAdd.push(entry.lesson);
      }

      setSelected((curr) => {
        const next = [...curr];
        let added = 0;
        for (const lesson of toAdd) {
          const exists = next.some(
            (s) => s.id === lesson.id || s.slug === lesson.slug
          );
          if (!exists) {
            next.push(lesson);
            added += 1;
          }
        }
        setBulkAddedCount(added);
        return next;
      });

      setBulkMissing(missing);
    } finally {
      setBulkAdding(false);
    }
  }

  // generation
  const [generating, setGenerating] = useState(false);
  const [examTitle, setExamTitle] = useState<string>("");
  const [examMd, setExamMd] = useState<string>("");
  const [solutionsMd, setSolutionsMd] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const canGenerate = selected.length > 0 && !generating;
  const lockedPlan = false;

  async function handleGenerate() {
    if (!selected.length) return;
    setGenerating(true);
    setError(null);
    setGenProgress(1);
    const iv = setInterval(() => setGenProgress((p) => (p < 98 ? p + 1 : p)), 1500);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) throw new Error("not_auth");
      const lessonIds = selected.map((x) => x.id);
      const res = await fetch("/api/mock-exam/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lessonIds, durationMin: duration }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Errore generazione");
      setExamTitle(json.title || "Verifica");
      setExamMd(json.examMd || "");
      setSolutionsMd(json.solutionsMd || "");
      setGenProgress(100);
    } catch (e: any) {
      setError(e?.message || "Errore imprevisto");
    } finally {
      setGenerating(false);
      clearInterval(iv);
    }
  }

  async function loadSuggested() {
    try {
      const label = classeLabel?.trim();
      if (!label) { setSuggested([]); return; }
      // Costruisco le etichette secondo i valori presenti in Sanity
      const candidates: string[] = [];
      if (label.endsWith("Media")) {
        candidates.push(label); // es: "3º Media"
      } else {
        // Liceo → Sanity usa "Nº Scientifico/Classico/Linguistico"
        const n = label.split(" ")[0]; // es: "4º"
        const indir = (indirizzo || "").toLowerCase();
        const map: Record<string,string> = {
          "scientifico": "Scientifico",
          "classico": "Classico",
          "linguistico": "Linguistico",
        };
        if (map[indir]) {
          candidates.push(`${n} ${map[indir]}`);
        } else {
          candidates.push(`${n} Scientifico`, `${n} Classico`, `${n} Linguistico`);
        }
      }
      const qs = encodeURIComponent(candidates.join(","));
      const res = await fetch(`/api/lessons-by-class?classes=${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok && Array.isArray(json.items)) {
        const map: LessonRef[] = json.items.map((r: any) => ({ id: r.slug, title: r.title, slug: r.slug }));
        setSuggested(map);
      } else {
        setSuggested([]);
      }
    } catch {
      setSuggested([]);
    }
  }

  const selectedSlugs = useMemo(() => selected.map((s) => s.slug), [selected]);

  // submit to team
  const [submitting, setSubmitting] = useState(false);
  const [submitOk, setSubmitOk] = useState<null | string>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const camRef = useRef<HTMLInputElement | null>(null);

  function onAddFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setPhotos((prev) => [...prev, ...arr].slice(0, 10));
  }
  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmitToTeam() {
    try {
      setSubmitting(true);
      setSubmitOk(null);
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) throw new Error("not_auth");
      const fd = new FormData();
      fd.set("title", examTitle || "Verifica");
      fd.set("studentEmail", (user?.email || "").toString());
      fd.set("examMd", examMd || "");
      photos.forEach((f) => fd.append("photos", f, f.name));
      const res = await fetch("/api/mock-exam/submit", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Invio fallito");
      setSubmitOk("Ricevuto! Ti risponderemo via email.");
      setPhotos([]);
      setStep("fine");
    } catch (e: any) {
      setSubmitOk(null);
      alert(e?.message || "Errore invio");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Loading state while auth is being determined */}
      {loading && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Caricamento...</p>
          </div>
        </div>
      )}
      
      {/* User not logged in */}
      {!loading && !user && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md mx-auto p-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-4">Accesso richiesto</h1>
            <p className="text-slate-600 mb-6">Devi essere loggato per accedere alla simulazione verifica.</p>
            <button
              onClick={() => router.push('/register')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Vai al login
            </button>
          </div>
        </div>
      )}
      
      {!loading && user && (
        <main className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
      <style>{`
        @page { size: A4; margin: 18mm; }
        @media print {
          html, body { background: white !important; }
          body * { visibility: hidden; }
          #exam-print, #exam-print * { visibility: visible; }
          #exam-print { position: absolute; left: 0; top: 0; width: 100%; min-height: 261mm; }
        }
        @keyframes bgpos { from { background-position: 0% 50% } to { background-position: 200% 50% } }
        .paper {
          background: #fff;
          color: #000;
          font-family: "Times New Roman", Times, serif;
          font-size: 12pt;
          line-height: 1.45;
          }
        .paper h1 { font-weight: 700; letter-spacing: .1px; margin: 0; }
        .paper h2 { font-weight: 700; margin: 8pt 0 4pt; }
        .paper ol { list-style: decimal; padding-left: 1.1rem; margin: 10pt 0 0; }
        .paper ul { list-style: disc; padding-left: 1.1rem; margin: 8pt 0 0; }
        .paper article.prose p { margin: 6pt 0 10pt; }
        .paper article.prose ol > li { margin-bottom: 12pt; break-inside: avoid; }
        .paper h2, .paper h3 { break-after: avoid; }
        .paper article.prose h2 { margin-top: 12pt; margin-bottom: 8pt; }
        .papernote { font-size: 12px; color: #475569; }
      `}</style>

      <header className="relative overflow-hidden rounded-2xl border border-indigo-200/50 bg-gradient-to-br from-cyan-600 via-blue-600 to-sky-600 text-white shadow-[0_10px_40px_rgba(37,99,235,0.35)]">
        <div className="absolute inset-0 opacity-25 mix-blend-overlay bg-[radial-gradient(circle_at_0%_0%,white,transparent_50%)]" />
        <div className="relative p-5 sm:p-8">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Simula una verifica</h1>
          <p className="text-white/90 text-sm mt-1 max-w-2xl">
            Seleziona classe e argomenti, scegli la durata e genera una verifica in stile scolastico. Stampa in PDF o avvia la simulazione con il timer integrato.
          </p>
        </div>
      </header>

      <Stepper current={step} durationLocked={durationLocked} />

      {/* Step 1: Classe (una domanda alla volta) */}
      {step === "classe" && (
        <section className="rounded-2xl border border-slate-200 bg-white [.dark_&]:bg-slate-900/60 [.dark_&]:border-slate-700 p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-semibold">1) Il tuo percorso</h2>
            <button onClick={() => { setIndirizzo(""); setStep("argomenti"); setSuggested([]); }} className="text-sm text-slate-600 hover:underline">Salta</button>
          </div>
          {classStage === "cycle" && (
            <div className="mt-4">
              <label className="text-sm font-medium">Seleziona il ciclo</label>
              <div className="mt-2 flex gap-2">
                {(["medie","liceo"] as const).map((c) => (
                  <button key={c} onClick={()=>setCycle(c)} className={`px-3 py-1.5 rounded-full border text-sm ${cycle===c?"bg-blue-600 text-white border-blue-600":"bg-white hover:bg-slate-50 [.dark_&]:bg-slate-800 [.dark_&]:hover:bg-slate-700 [.dark_&]:text-white/90 [.dark_&]:border-slate-600"}`}>{c}</button>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={()=>setClassStage("year")} className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm w-full sm:w-auto">Avanti</button>
              </div>
            </div>
          )}
          {classStage === "year" && (
            <div className="mt-4">
              <label className="text-sm font-medium">{"Seleziona l'anno"}</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(cycle === "medie" ? [1,2,3] : [1,2,3,4,5]).map((n)=>(
                  <button key={n} onClick={()=>setYear(n)} className={`px-3 py-1.5 rounded-full border text-sm ${year===n?"bg-blue-600 text-white border-blue-600":"bg-white hover:bg-slate-50 [.dark_&]:bg-slate-800 [.dark_&]:hover:bg-slate-700 [.dark_&]:text-white/90 [.dark_&]:border-slate-600"}`}>{n}º</button>
                ))}
              </div>
              <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:justify-between">
                <button onClick={()=>setClassStage("cycle")} className="rounded-lg border px-4 py-2 text-sm w-full sm:w-auto">Indietro</button>
                <button onClick={()=> setClassStage(cycle==="liceo"?"indirizzo":"indirizzo")} className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm w-full sm:w-auto">Avanti</button>
              </div>
            </div>
          )}
          {classStage === "indirizzo" && cycle === "liceo" && (
            <div className="mt-4">
              <label className="text-sm font-medium">Indirizzo (facoltativo)</label>
              <select value={indirizzo} onChange={(e)=>setIndirizzo(e.target.value)} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm bg-white [.dark_&]:bg-slate-800 [.dark_&]:border-slate-600 [.dark_&]:text-white">
                <option value="">Non specificare</option>
                <option value="scientifico">Scientifico</option>
                <option value="classico">Classico</option>
                <option value="linguistico">Linguistico</option>
                <option value="scienze umane">Scienze Umane</option>
                <option value="artistico">Artistico</option>
                <option value="tecnico">Tecnico (ITIS)</option>
                <option value="altro">Altro</option>
              </select>
              <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:justify-between">
                <button onClick={()=>setClassStage("year")} className="rounded-lg border px-4 py-2 text-sm w-full sm:w-auto">Indietro</button>
                <button onClick={async ()=>{ await loadSuggested(); setStep("argomenti"); }} className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm w-full sm:w-auto">Continua</button>
              </div>
            </div>
          )}
          <div className="mt-4 text-sm text-slate-600 [.dark_&]:text-white/80">Classe selezionata: <strong>{classeLabel || "(non specificata)"}</strong></div>
        </section>
      )}

      {/* Step 2: Argomenti (lezioni) */}
      {step === "argomenti" && (
      <section className="bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] p-[1px] rounded-2xl">
        <div className="rounded-[14px] bg-white [.dark_&]:bg-slate-900/60 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">2) Scegli gli argomenti</h2>
            <p className="text-sm text-slate-600 [.dark_&]:text-white/80 mt-0.5">Suggeriti per <strong>{classeLabel}</strong>, oppure cerca o usa le lezioni salvate.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setStep("classe")} className="text-sm text-slate-600 [.dark_&]:text-white/80 hover:underline inline-flex items-center gap-1">Indietro</button>
            {selected.length > 0 && (
              <button onClick={() => setSelected([])} className="text-sm text-red-600 hover:underline">Pulisci selezione</button>
            )}
          </div>
        </div>

        {entryLesson ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 [.dark_&]:border-slate-700 [.dark_&]:bg-slate-800/60 [.dark_&]:text-white/80">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Hai aperto la simulazione da:{" "}
                <strong className="text-slate-900 [.dark_&]:text-white">
                  {entryLesson.title}
                </strong>
              </span>
              <button
                onClick={() =>
                  setSelected((curr) => {
                    const exists = curr.some(
                      (c) =>
                        c.id === entryLesson.id || c.slug === entryLesson.slug
                    );
                    if (exists) {
                      return curr.filter(
                        (c) =>
                          c.id !== entryLesson.id &&
                          c.slug !== entryLesson.slug
                      );
                    }
                    return [...curr, entryLesson];
                  })
                }
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  selected.some(
                    (c) =>
                      c.id === entryLesson.id || c.slug === entryLesson.slug
                  )
                    ? "bg-slate-200 text-slate-800 hover:bg-slate-300 [.dark_&]:bg-slate-700 [.dark_&]:text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {selected.some(
                  (c) =>
                    c.id === entryLesson.id || c.slug === entryLesson.slug
                )
                  ? "Rimuovi"
                  : "Aggiungi"}
              </button>
            </div>
          </div>
        ) : null}

        {/* Suggeriti */}
        <div className="mt-4">
          <div className="text-sm font-medium mb-2">Suggeriti per {classeLabel}</div>
          {!suggested.length ? (
            <div className="text-sm text-slate-500">Nessun suggerimento disponibile.</div>
          ) : (
            <div className="overflow-x-auto -mx-1 px-1">
              <div className="flex gap-2 whitespace-nowrap sm:flex-wrap sm:whitespace-normal items-start">
                {(showAllSuggested ? suggested : suggested.slice(0, 5)).map((l) => {
                  const active = selected.some((s) => s.id === l.id);
                  return (
                    <button key={l.id} onClick={() => setSelected((curr) => active ? curr.filter((c) => c.id !== l.id) : [...curr, l])} className={`px-3 py-2 rounded-full border text-sm transition-colors shrink-0 ${active ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-slate-50 [.dark_&]:bg-slate-800 [.dark_&]:hover:bg-slate-700 [.dark_&]:text-white/90 [.dark_&]:border-slate-600"}`}>{l.title}</button>
                  );
                })}
                {suggested.length > 5 && !showAllSuggested && (
                  <button onClick={()=>setShowAllSuggested(true)} className="px-3 py-2 rounded-full border text-sm shrink-0 bg-white hover:bg-slate-50 [.dark_&]:bg-slate-800 [.dark_&]:hover:bg-slate-700 [.dark_&]:text-white/90 [.dark_&]:border-slate-600">
                    Mostra altri {suggested.length - 5}
                  </button>
                )}
                {suggested.length > 5 && showAllSuggested && (
                  <button onClick={()=>setShowAllSuggested(false)} className="px-3 py-2 rounded-full border text-sm shrink-0 bg-white hover:bg-slate-50 [.dark_&]:bg-slate-800 [.dark_&]:hover:bg-slate-700 [.dark_&]:text-white/90 [.dark_&]:border-slate-600">
                    Mostra meno
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Saved lessons */}
        <div className="mt-4">
          <div className="text-sm font-medium mb-2">Lezioni salvate</div>
          {loadingSaved ? (
            <div className="h-20 rounded-xl bg-slate-100 animate-pulse" />
          ) : savedLessons.length ? (
            <div className="overflow-x-auto -mx-1 px-1">
              <div className="flex gap-2 whitespace-nowrap sm:flex-wrap sm:whitespace-normal">
              {savedLessons.map((l) => {
                const active = selectedSlugs.includes(l.slug);
                return (
                  <button
                    key={l.id}
                    onClick={() =>
                      setSelected((curr) =>
                        active
                          ? curr.filter((c) => c.id !== l.id)
                          : [...curr, l]
                      )
                    }
                    className={`px-3 py-2 rounded-full border text-sm transition-colors shrink-0 ${
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white hover:bg-slate-50 [.dark_&]:bg-slate-800 [.dark_&]:hover:bg-slate-700 [.dark_&]:text-white/90 [.dark_&]:border-slate-600"
                    }`}
                    title={l.title}
                  >
                    {(l.title || l.slug).slice(0, 40)}{(l.title || l.slug).length > 40 ? "…" : ""}
                  </button>
                );
              })}
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-600">Nessuna lezione salvata.</div>
          )}
        </div>

        {/* Search */}
        <div className="mt-6">
          <div className="text-sm font-medium mb-2">Cerca lezioni</div>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") doSearch(search);
              }}
              placeholder="Es. equazioni di secondo grado"
              className="flex-1 rounded-lg border px-3 py-2 text-sm bg-white [.dark_&]:bg-slate-800 [.dark_&]:border-slate-600 [.dark_&]:text-white"
            />
            <button
              onClick={() => doSearch(search)}
              className="rounded-lg bg-blue-600 text-white px-3 py-2 text-sm hover:bg-blue-700"
              disabled={searching}
            >
              {searching ? "Cerca…" : "Cerca"}
            </button>
          </div>

          {results.length > 0 && (
            <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {results.map((r) => {
                const active = selectedSlugs.includes(r.slug);
                return (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-white p-3 [.dark_&]:bg-slate-800 [.dark_&]:border-slate-600"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate [.dark_&]:text-white">{r.title}</div>
                      <div className="text-xs text-slate-500 truncate">/{r.slug}</div>
                    </div>
                    <button
                      onClick={() =>
                        setSelected((curr) =>
                          active ? curr.filter((c) => c.id !== r.id) : [...curr, r]
                        )
                      }
                      className={`text-sm rounded-lg px-3 py-1.5 ${
                        active
                          ? "bg-emerald-500 text-white hover:bg-emerald-600"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {active ? "Selezionata" : "Seleziona"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Lista argomenti */}
        <div className="mt-6">
          <div className="text-sm font-medium mb-2">
            Oppure incolla la lista degli argomenti
          </div>
          <textarea
            value={bulkTopics}
            onChange={(e) => setBulkTopics(e.target.value)}
            placeholder={`Es.:\n- Equazioni di secondo grado\n- Disequazioni\n- Funzioni`}
            rows={4}
            className="w-full rounded-lg border px-3 py-2 text-sm bg-white [.dark_&]:bg-slate-800 [.dark_&]:border-slate-600 [.dark_&]:text-white"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Uno per riga o separati da virgola.</span>
            {bulkAddedCount !== null && (
              <span className="text-emerald-600">
                Aggiunti {bulkAddedCount} argomenti.
              </span>
            )}
          </div>
          {bulkMissing.length > 0 && (
            <div className="mt-2 text-xs text-rose-600">
              Non trovati: {bulkMissing.join(", ")}.
            </div>
          )}
          <div className="mt-2 flex justify-end">
            <button
              onClick={handleBulkAdd}
              disabled={bulkAdding}
              className="rounded-lg bg-blue-600 text-white px-3 py-2 text-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {bulkAdding ? "Aggiungo..." : "Aggiungi lista"}
            </button>
          </div>
        </div>

        {selected.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Selezionate ({selected.length})</div>
            <div className="flex flex-wrap gap-2">
              {selected.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm bg-white [.dark_&]:bg-slate-800 [.dark_&]:text-white/90 [.dark_&]:border-slate-600"
                >
                  <span className="truncate max-w-[220px]">{s.title}</span>
                  <button
                    onClick={() => setSelected((curr) => curr.filter((c) => c.id !== s.id))}
                    className="ml-1 text-slate-500 hover:text-red-600"
                    aria-label={`Rimuovi ${s.title}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
          <div className="mt-6 flex items-center justify-between gap-2">
            <div className="text-sm text-slate-600 [.dark_&]:text-white/80">Prosegui quando hai selezionato gli argomenti.</div>
          <button disabled={!selected.length} onClick={() => setStep("durata")} className="rounded-lg bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] hover:opacity-95 disabled:opacity-50 text-white px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 w-1/2 sm:w-auto"><ListChecks className="h-4 w-4" /> Continua</button>
          </div>
        </div>
      </section>
      )}

      {/* Step 3: Durata */}
      {step === "durata" && (
        <section className="bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] p-[1px] rounded-2xl">
          <div className="rounded-[14px] bg-white [.dark_&]:bg-slate-900/60 p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-semibold">3) Scegli la durata</h2>
            <button onClick={() => setStep("argomenti")} className="text-sm text-slate-600 hover:underline">Indietro</button>
          </div>
          <p className="text-sm text-slate-600 [.dark_&]:text-white/80 mt-0.5">Una volta confermata, la durata non sarà modificabile.</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[60,120].map((m) => (
              <button key={m} onClick={() => { if (!durationLocked) setDuration(m); }} disabled={durationLocked}
                className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition ${duration===m?"border-blue-600 bg-blue-50 [.dark_&]:bg-slate-800/60":"border-slate-200 hover:border-blue-400 [.dark_&]:border-slate-600"}`}>
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 grid place-items-center rounded-xl ${duration===m?"bg-blue-600 text-white":"bg-slate-100 [.dark_&]:bg-slate-800 text-blue-600"}`}>
                    <TimerIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-base font-semibold">{m} minuti</div>
                    <div className="text-xs text-slate-500">Seleziona per impostare la durata</div>
                  </div>
                  {durationLocked && duration===m && (
                    <Lock className="ml-auto h-4 w-4 text-slate-400" />
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-slate-600 [.dark_&]:text-white/80">Durata selezionata: <strong>{duration} min</strong></div>
            {!durationLocked ? (
              <button
                onClick={() => {
                  setDurationLocked(true);
                  setStep("generazione");
                  void handleGenerate();
                }}
                disabled={!canGenerate}
                className="rounded-lg bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] hover:opacity-95 text-white px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileText className="h-4 w-4" /> Conferma e genera
              </button>
            ) : (
              <button disabled className="rounded-lg bg-slate-300 text-white px-4 py-2 text-sm font-semibold">Confermata</button>
            )}
          </div>
          </div>
        </section>
      )}

      {/* Step 4: Generazione */}
      {step === "generazione" && (
        <section className="bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] p-[1px] rounded-2xl">
          <div className="rounded-[14px] bg-white [.dark_&]:bg-slate-900/60 p-4 sm:p-5">
          <h2 className="text-lg font-semibold">Sto generando la verifica…</h2>
          <p className="text-sm text-slate-600 [.dark_&]:text-white/80 mt-0.5">Preparazione degli esercizi su {selected.length} argomento/i.</p>
          <div className="mt-4 h-3 rounded-full bg-slate-200 [.dark_&]:bg-slate-800 overflow-hidden">
            <div className="h-full bg-[linear-gradient(90deg,#38bdf8,#6366f1,#06b6d4)] bg-[length:200%_100%] animate-[bgpos_2s_linear_infinite] transition-[width] duration-500" style={{ width: `${genProgress}%` }} />
          </div>
          <LoaderMessages progress={genProgress} generating={generating} />
          {error && <div className="mt-2 text-sm text-red-600">{String(error)}</div>}
          {!generating && !error && (
            <div className="mt-3 flex">
              <button onClick={() => setStep("pronto")} className="rounded-lg bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] hover:opacity-95 text-white px-4 py-2 text-sm font-semibold w-full sm:w-auto ml-auto">Continua</button>
            </div>
          )}
          </div>
        </section>
      )}

      {/* Step 5: Pronto */}
      {step === "pronto" && (
        <section className="rounded-2xl border border-slate-200 bg-white [.dark_&]:bg-slate-900/60 p-6 text-center">
          <h2 className="text-lg font-semibold">Verifica pronta</h2>
          <p className="text-sm text-slate-600 [.dark_&]:text-white/80 mt-1">Durata: {duration} min. Premi per iniziare: la verifica verrà mostrata e il timer partirà subito.</p>
          <button onClick={() => { setStartAt(Date.now()); setStep("verifica"); }} className="mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-white px-6 py-3 text-base font-bold gap-2 w-full sm:w-auto"><PlayCircle className="h-5 w-5" /> Inizia verifica</button>
        </section>
      )}

      {/* Step 6: Verifica */}
      {step === "verifica" && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white [.dark_&]:bg-slate-900/60 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Verifica generata</h2>
                <p className="text-sm text-slate-600 [.dark_&]:text-white/80 mt-0.5">
                  Stampa o scarica in PDF. Se vuoi, inviala al team per la valutazione.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="rounded-lg bg-slate-800 text-white px-3 py-1.5 text-sm w-full sm:w-auto"
                >
                  Stampa / PDF
                </button>
                <button
                  onClick={handleSubmitToTeam}
                  disabled={!examMd || submitting || photos.length === 0}
                  className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-sm disabled:opacity-50 w-full sm:w-auto"
                >
                  {submitting ? "Invio…" : "Invia foto + PDF"}
                </button>
              </div>
            </div>
            {submitOk && (
              <div className="mt-2 text-sm text-emerald-700">{submitOk}</div>
            )}
            <div className="mt-3">
              <div className="text-sm font-medium mb-2">Carica foto della verifica svolta</div>
              <div className="flex flex-wrap gap-2">
                <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={(e)=>onAddFiles(e.target.files)} />
                <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e)=>onAddFiles(e.target.files)} />
                <button onClick={()=>fileRef.current?.click()} className="rounded-lg border px-3 py-2 text-sm w-full sm:w-auto">Scegli foto</button>
                <button onClick={()=>camRef.current?.click()} className="rounded-lg border px-3 py-2 text-sm w-full sm:w-auto">Scatta foto</button>
                <span className="text-xs text-slate-500">Max 10 immagini</span>
              </div>
              {photos.length>0 && (
                <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {photos.map((f, i)=>{
                    const url = URL.createObjectURL(f);
                    return (
                      <li key={i} className="relative group">
                        <img src={url} alt={`foto ${i+1}`} className="h-24 w-full object-cover rounded-lg border"/>
                        <button onClick={()=>removePhoto(i)} className="absolute top-1 right-1 text-xs rounded bg-black/60 text-white px-1.5 py-0.5 opacity-0 group-hover:opacity-100">×</button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <TimerControls duration={duration} externalStartAt={startAt ?? undefined} />
          </div>

          <div id="exam-print" className="rounded-2xl border border-slate-200 bg-white paper p-6">
            <div className="text-center">
              <div className="text-xs uppercase tracking-wide text-slate-600">Theoremz – Simulazione Verifica</div>
              <h1 className="text-2xl font-extrabold mt-1">{examTitle || "Verifica"}</h1>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-black">
                <div>Nome e cognome: ________________________________</div>
                <div className="sm:text-right">Classe: ________  Data: ___/___/_____  Durata: {duration} min</div>
              </div>
              <hr className="my-5" />
            </div>
            <article className="prose max-w-none prose-slate">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {examMd}
              </ReactMarkdown>
            </article>
          </div>
        </section>
      )}

      {/* Step 7: Fine */}
      {step === "fine" && (
        <section className="rounded-2xl border border-emerald-300 bg-white [.dark_&]:bg-slate-900/60 p-6 text-center">
          <h2 className="text-lg font-semibold text-emerald-700">Verifica inviata</h2>
          <p className="mt-2 text-sm text-slate-700 [.dark_&]:text-white/80">
            Grazie! Il team correggerà la tua verifica e ti darà un voto con le correzioni dettagliate via email.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button onClick={() => router.push("/")} className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm">Torna alla home</button>
          </div>
        </section>
      )}
      </main>
      )}

    </>
  );
}

function Stepper({ current, durationLocked }: { current: "classe"|"argomenti"|"durata"|"generazione"|"pronto"|"verifica"|"fine"; durationLocked: boolean }) {
  const steps: { id: any; label: string; icon: any }[] = [
    { id: "classe", label: "Classe", icon: BookOpen },
    { id: "argomenti", label: "Argomenti", icon: ListChecks },
    { id: "durata", label: "Durata", icon: TimerIcon },
    { id: "generazione", label: "Genera", icon: FileText },
    { id: "pronto", label: "Pronto", icon: PlayCircle },
  ];
  const idx = steps.findIndex((s) => s.id === current);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white [.dark_&]:bg-slate-900/60 p-3 sm:p-4">
      <ol className="flex items-center justify-between gap-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const done = i < idx;
          const active = i === idx;
          return (
            <li key={s.id} className="flex-1 flex items-center">
              <div className={`flex items-center gap-2 ${active?"":"opacity-80"}`}>
                <div className={`h-8 w-8 rounded-full grid place-items-center text-white text-xs font-bold ${done?"bg-emerald-500":active?"bg-blue-600":"bg-slate-400"}`}>
                  {done?"✓":i+1}
                </div>
                <div className="hidden sm:flex items-center gap-1 text-sm"><Icon className="h-4 w-4" /> {s.label}</div>
              </div>
              {i < steps.length-1 && (
                <div className="mx-2 h-[2px] flex-1 bg-gradient-to-r from-slate-300 to-slate-200 [.dark_&]:from-slate-700 [.dark_&]:to-slate-800" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function CuteGenerating() {
  return (
    <div />
  );
}

function LoaderMessages({ progress, generating }: { progress: number; generating: boolean }) {
  const msgs = [
    "Analizzo i contenuti selezionati…",
    "Seleziono i nuclei tematici…",
    "Compongo gli esercizi…",
    "Rifinisco il testo e i simboli…",
    "Controllo la formattazione…",
  ];
  const idx = Math.min(msgs.length - 1, Math.floor(progress / (100 / msgs.length)));
  return (
    <div className="mt-2 text-center text-sm text-slate-600 [.dark_&]:text-white/80 min-h-[20px]">
      {generating ? msgs[idx] : "Pronto!"}
    </div>
  );
}

function TimerControls({ duration, externalStartAt }: { duration: number; externalStartAt?: number }) {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (!endAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endAt]);

  // external start trigger
  useEffect(() => {
    if (externalStartAt && !endAt) {
      setEndAt(externalStartAt + duration * 60 * 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalStartAt, duration]);

  const remainingMs = endAt ? Math.max(0, endAt - now) : 0;
  const totalMs = duration * 60 * 1000;
  const progress = endAt ? Math.min(100, Math.max(0, ((totalMs - remainingMs) / totalMs) * 100)) : 0;

  useEffect(() => {
    if (!endAt) return;
    if (remainingMs === 0) {
      try {
        if (navigator?.vibrate) navigator.vibrate([200, 120, 200]);
      } catch {}
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const o = ctx.createOscillator();
        o.type = "sine"; o.frequency.value = 880; o.connect(ctx.destination); o.start();
        setTimeout(() => { o.stop(); ctx.close(); }, 400);
      } catch {}
    }
  }, [remainingMs, endAt]);

  const fmt = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
  };

  return (
    <div className="mt-4 border rounded-xl p-3 bg-white [.dark_&]:bg-slate-900/40 [.dark_&]:border-slate-700">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-slate-700 [.dark_&]:text-white/80">
          Durata selezionata: <strong>{duration} min</strong>
        </div>
        {endAt ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-800 text-white text-xs px-2.5 py-1">
              ⏱️ {fmt(remainingMs)}
            </span>
            <button
              onClick={() => setEndAt(null)}
              className="text-sm rounded-lg px-3 py-1.5 bg-slate-200 hover:bg-slate-300 [.dark_&]:bg-slate-800 [.dark_&]:hover:bg-slate-700 [.dark_&]:text-white"
            >
              Reset
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEndAt(Date.now() + duration * 60 * 1000)}
            className="text-sm rounded-lg px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700"
          >
            Avvia timer
          </button>
        )}
      </div>
      {endAt && (
        <div className="mt-2 h-2 rounded-full bg-slate-200 [.dark_&]:bg-slate-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-600 transition-[width] duration-1000" style={{ width: `${progress}%` }} />
        </div>
      )}
      {endAt && remainingMs === 0 && (
        <div className="mt-2 text-sm text-red-600">Tempo scaduto</div>
      )}
    </div>
  );
}
"/* eslint-disable @typescript-eslint/no-unused-vars */\n"
"/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unused-expressions, @next/next/no-img-element */\n"
