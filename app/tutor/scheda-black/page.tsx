"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getAuth } from "firebase/auth";
import { Loader2, Phone, Mail, ClipboardList, Shield } from "lucide-react";

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
  readiness?: number | null;
  risk?: string | null;
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
            <Field label="Stato" value={student.status} />
            <Field label="Readiness" value={student.readiness != null ? `${student.readiness}` : null} />
            <Field label="Rischio" value={student.risk} />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Obiettivi e verifica
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            <Field label="Goal" value={student.goal} />
            <Field label="Focus difficoltà" value={student.difficultyFocus} />
            <Field label="Prossima verifica" value={student.nextAssessmentSubject} />
            <Field label="Data prossima verifica" value={formatDate(student.nextAssessmentDate)} />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Note AI</p>
            <p className="whitespace-pre-wrap">{student.aiDescription || "—"}</p>
          </div>
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
