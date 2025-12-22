"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getAuth } from "firebase/auth";
import { Loader2, Phone, Mail, ClipboardList, Shield, Pencil } from "lucide-react";

type StudentDetail = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  yearClass?: string | null;
  track?: string | null;
  startDate?: string | null;
  goal?: string | null;
  difficultyFocus?: string | null;
  nextAssessmentSubject?: string | null;
  nextAssessmentDate?: string | null;
  aiDescription?: string | null;
  status?: string | null;
  lastContactedAt?: string | null;
  hoursPaid?: number;
  hoursConsumed?: number;
  remainingPaid?: number;
  hourlyRate?: number | null;
  isBlack?: boolean;
};

export default function TutorBlackCardPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState({
    name: "",
    goal: "",
    difficulty: "",
    aiNotes: "",
  });

  useEffect(() => {
    let active = true;
    (async () => {
      const studentId = searchParams.get("studentId") || "";
      if (!studentId) {
        setError("studentId mancante");
        setLoading(false);
        return;
      }
      if (!user?.email) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) throw new Error("Autenticazione mancante");
        const res = await fetch(`/api/tutor/black-student?studentId=${encodeURIComponent(studentId)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        if (!active) return;
        const s = data.student;
        setStudent({
          ...s,
          hoursPaid: Number(s?.hoursPaid ?? s?.hours_paid ?? 0),
          hoursConsumed: Number(s?.hoursConsumed ?? s?.hours_consumed ?? 0),
          remainingPaid: Number(s?.remainingPaid ?? 0),
        });
        setMeta({
          name: s.name || "",
          goal: s.goal || "",
          difficulty: s.difficultyFocus || "",
          aiNotes: s.aiDescription || "",
        });
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || "Errore caricamento scheda");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [searchParams, user?.email]);

  const handleSave = async () => {
    if (!student?.id) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) throw new Error("Token non disponibile");
      const res = await fetch("/api/tutor/black-student", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: student.id,
          name: meta.name || student.name,
          goal: meta.goal,
          difficultyFocus: meta.difficulty,
          aiDescription: meta.aiNotes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setStudent((prev) =>
        prev
          ? {
              ...prev,
              name: meta.name || prev.name,
              goal: meta.goal,
              difficultyFocus: meta.difficulty,
              aiDescription: meta.aiNotes,
            }
          : prev
      );
      setEditing(false);
    } catch (err: any) {
      setError(err?.message || "Errore salvataggio dati");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <Loader2 className="h-5 w-5 animate-spin text-sky-400" />
          <span>Carico scheda…</span>
        </div>
      </main>
    );
  }

  if (!user?.email) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center space-y-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-lg font-semibold">Accesso richiesto</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Entra con l&apos;account tutor per vedere la scheda.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center space-y-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-lg font-semibold text-amber-600 dark:text-amber-200">Errore</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
        </div>
      </main>
    );
  }

  if (!student) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center space-y-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-lg font-semibold">Nessuno studente</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Verifica il link o scegli uno studente valido.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-2">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Scheda Black</p>
          <h1 className="text-2xl font-bold">{student.name || "Studente"}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {student.email || "Email n/d"}
            </span>
            <span className="inline-flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {student.phone || "Telefono n/d"}
            </span>
          </div>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Dati studente
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            <Field label="Classe" value={student.yearClass} />
            <Field label="Track" value={student.track} />
            <Field label="Start" value={formatDate(student.startDate)} />
            <Field label="Ultimo accesso" value={formatDate(student.lastContactedAt)} />
            <Field
              label="Abbonamento"
              value={
                student.status
                  ? student.status.toLowerCase() === "active"
                    ? "Attivo"
                    : student.status
                  : null
              }
            />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Obiettivi e verifica
            </p>
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <Pencil className="h-3.5 w-3.5" />
              {editing ? "Annulla" : "Modifica"}
            </button>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={meta.name}
                    onChange={(e) => setMeta((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="Nome studente"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                    Obiettivo
                  </label>
                  <input
                    type="text"
                    value={meta.goal}
                    onChange={(e) => setMeta((prev) => ({ ...prev, goal: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="Obiettivo principale"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                    Difficoltà
                  </label>
                  <input
                    type="text"
                    value={meta.difficulty}
                    onChange={(e) =>
                      setMeta((prev) => ({ ...prev, difficulty: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="Difficoltà principali"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                    Note insegnante
                  </label>
                  <textarea
                    value={meta.aiNotes}
                    onChange={(e) => setMeta((prev) => ({ ...prev, aiNotes: e.target.value }))}
                    className="w-full min-h-[120px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="Note insegnante"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Salva
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Aggiorna obiettivo, difficoltà e note insegnante.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-2 md:grid-cols-2">
                <Field label="Obiettivo" value={student.goal} />
                <Field label="Difficoltà" value={student.difficultyFocus} />
                <Field label="Prossima verifica" value={student.nextAssessmentSubject} />
                <Field label="Data prossima verifica" value={formatDate(student.nextAssessmentDate)} />
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Note insegnante</p>
                <p className="whitespace-pre-wrap">{student.aiDescription || "—"}</p>
              </div>
            </>
          )}
        </section>

        {student.phone && (
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`https://wa.me/${(student.phone || "").replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              Contatta su WhatsApp
            </a>
          </div>
        )}
      </div>
    </main>
  );
}

function formatDate(input?: string | null) {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
        <span className="font-semibold text-slate-700 dark:text-slate-200">{label}</span>
        <span>n/d</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
      <span className="font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <span className="text-right">{typeof value === "number" ? value : value}</span>
    </div>
  );
}
