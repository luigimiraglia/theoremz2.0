"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getAuth } from "firebase/auth";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, ExternalLink, Loader2, Save } from "lucide-react";

type StudentSheet = {
  id: string;
  studentId: string | null;
  studentName: string;
  accountName: string | null;
  yearClass: string | null;
  track: string | null;
  startDate: string | null;
  parentName: string | null;
  studentEmail: string | null;
  parentEmail: string | null;
  studentPhone: string | null;
  parentPhone: string | null;
  stripeCustomerId: string | null;
  stripeCustomerUrl: string | null;
  nextAssessmentId: string | null;
  nextAssessmentSubject: string | null;
  nextAssessmentDate: string | null;
  goal: string | null;
  difficultyFocus: string | null;
  initialAverage: number | null;
  currentAverage: number | null;
  aiDescription: string | null;
  status: string | null;
  renewalAt: string | null;
  lastContactedAt: string | null;
  lastActiveAt: string | null;
  tutorId: string | null;
  tutorName: string | null;
  tutorEmail: string | null;
  tutorPhone: string | null;
  hoursPaid: number | null;
  hoursConsumed: number | null;
  hoursRemaining: number | null;
  hoursAllocated: number | null;
  hourlyRate: number | null;
};

type StudentForm = {
  studentName: string;
  accountName: string;
  studentEmail: string;
  studentPhone: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  yearClass: string;
  startDate: string;
  nextAssessmentId: string;
  nextAssessmentSubject: string;
  nextAssessmentDate: string;
  goal: string;
  difficultyFocus: string;
  initialAverage: string;
  currentAverage: string;
  hoursPaid: string;
};

function toForm(student: StudentSheet): StudentForm {
  return {
    studentName: student.studentName || "",
    accountName: student.accountName || "",
    studentEmail: student.studentEmail || "",
    studentPhone: student.studentPhone || "",
    parentName: student.parentName || "",
    parentEmail: student.parentEmail || "",
    parentPhone: student.parentPhone || "",
    yearClass: student.yearClass || "",
    startDate: student.startDate || "",
    nextAssessmentId: student.nextAssessmentId || "",
    nextAssessmentSubject: student.nextAssessmentSubject || "",
    nextAssessmentDate: student.nextAssessmentDate || "",
    goal: student.goal || "",
    difficultyFocus: student.difficultyFocus || "",
    initialAverage:
      student.initialAverage != null && Number.isFinite(student.initialAverage)
        ? String(student.initialAverage)
        : "",
    currentAverage:
      student.currentAverage != null && Number.isFinite(student.currentAverage)
        ? String(student.currentAverage)
        : "",
    hoursPaid:
      student.hoursPaid != null && Number.isFinite(student.hoursPaid)
        ? String(student.hoursPaid)
        : "",
  };
}

function formatDate(input?: string | null) {
  if (!input) return "—";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(input?: string | null) {
  if (!input) return "—";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(input?: number | null, maximumFractionDigits = 1) {
  if (input == null || !Number.isFinite(input)) return "—";
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(input);
}

function formatCurrency(input?: number | null) {
  if (input == null || !Number.isFinite(input)) return "—";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(input);
}

function statusLabel(status?: string | null) {
  const normalized = (status || "").trim().toLowerCase();
  if (!normalized) return "Da definire";
  if (normalized === "active") return "Attivo";
  if (normalized === "disdetto") return "Disdetto";
  if (normalized === "lead") return "Lead";
  if (normalized === "new") return "Nuovo";
  if (normalized === "onboarding") return "Onboarding";
  if (normalized === "paused") return "Disdetto";
  if (normalized === "inactive") return "Inattivo";
  if (normalized === "cancelled" || normalized === "canceled") return "Disdetto";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).replaceAll("_", " ");
}

function displayValue(value?: string | number | null) {
  if (value == null) return "—";
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : "—";
  }
  return String(value);
}

function hasTextValue(value?: string | null) {
  return Boolean(value && value.trim().length > 0);
}

function buildWhatsAppUrl(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 6
    ? `https://web.whatsapp.com/send/?phone=${digits}&text&type=phone_number&app_absent=0`
    : null;
}

export default function TutorBlackCardPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contacting, setContacting] = useState(false);
  const [generatingOverview, setGeneratingOverview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [contactMessage, setContactMessage] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentSheet | null>(null);
  const [form, setForm] = useState<StudentForm | null>(null);
  const [initialForm, setInitialForm] = useState<StudentForm | null>(null);
  const [contactNote, setContactNote] = useState("");

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
      setSaveMessage(null);
      setContactMessage(null);

      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) throw new Error("Autenticazione mancante");

        const res = await fetch(`/api/tutor/black-student?studentId=${encodeURIComponent(studentId)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        if (!active) return;

        const nextStudent = data.student as StudentSheet;
        const nextForm = toForm(nextStudent);
        setStudent(nextStudent);
        setForm(nextForm);
        setInitialForm(nextForm);
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

  const dirty = useMemo(() => {
    if (!form || !initialForm) return false;
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);

  const tutorInfoItems = useMemo(() => {
    if (!student) return [];

    return [
      hasTextValue(student.tutorName)
        ? { label: "Tutor assegnato", value: student.tutorName }
        : null,
      hasTextValue(student.tutorEmail)
        ? { label: "Email tutor", value: student.tutorEmail }
        : null,
      hasTextValue(student.tutorPhone)
        ? { label: "Telefono tutor", value: student.tutorPhone }
        : null,
      student.hoursAllocated != null
        ? { label: "Ore assegnate tutor", value: formatNumber(student.hoursAllocated) }
        : null,
      student.hourlyRate != null
        ? { label: "Tariffa oraria", value: formatCurrency(student.hourlyRate) }
        : null,
    ].filter(Boolean) as Array<{ label: string; value: string }>;
  }, [student]);

  const showTutorSection = useMemo(() => {
    return Boolean(tutorInfoItems.length || student?.hoursPaid != null || form?.hoursPaid);
  }, [form?.hoursPaid, student?.hoursPaid, tutorInfoItems.length]);

  const studentWhatsAppUrl = useMemo(() => buildWhatsAppUrl(form?.studentPhone || null), [form?.studentPhone]);

  const handleFieldChange = (field: keyof StudentForm, value: string) => {
    setSaveMessage(null);
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleMarkContacted = async () => {
    if (!student) return;
    setContacting(true);
    setError(null);
    setSaveMessage(null);
    setContactMessage(null);

    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) throw new Error("Token non disponibile");

      const res = await fetch("/api/tutor/black-student", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: student.id,
          contactBody: contactNote,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      const nextStudent = data.student as StudentSheet;
      setStudent(nextStudent);
      setContactNote("");
      setContactMessage("Contatto registrato nei log");
    } catch (err: any) {
      setError(err?.message || "Errore registrazione contatto");
    } finally {
      setContacting(false);
    }
  };

  const handleGenerateOverview = async () => {
    if (!student) return;
    setGeneratingOverview(true);
    setError(null);
    setSaveMessage(null);
    setContactMessage(null);

    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) throw new Error("Token non disponibile");

      const res = await fetch("/api/tutor/black-student", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: student.id,
          action: "generate_overview",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      const nextStudent = data.student as StudentSheet;
      setStudent(nextStudent);
      setSaveMessage("Overview AI aggiornata");
    } catch (err: any) {
      setError(err?.message || "Errore generazione overview AI");
    } finally {
      setGeneratingOverview(false);
    }
  };

  const handleSave = async () => {
    if (!student || !form) return;
    setSaving(true);
    setError(null);
    setSaveMessage(null);
    setContactMessage(null);

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
          studentName: form.studentName,
          accountName: form.accountName,
          studentEmail: form.studentEmail,
          studentPhone: form.studentPhone,
          parentName: form.parentName,
          parentEmail: form.parentEmail,
          parentPhone: form.parentPhone,
          yearClass: form.yearClass,
          startDate: form.startDate,
          nextAssessmentId: form.nextAssessmentId || null,
          nextAssessmentSubject: form.nextAssessmentSubject,
          nextAssessmentDate: form.nextAssessmentDate,
          goal: form.goal,
          difficultyFocus: form.difficultyFocus,
          initialAverage: form.initialAverage,
          currentAverage: form.currentAverage,
          hoursPaid: form.hoursPaid,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      const nextStudent = data.student as StudentSheet;
      const nextForm = toForm(nextStudent);
      setStudent(nextStudent);
      setForm(nextForm);
      setInitialForm(nextForm);
      setSaveMessage("Modifiche salvate");
    } catch (err: any) {
      setError(err?.message || "Errore salvataggio");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-xl items-center justify-center rounded-[28px] border border-slate-200 bg-white px-6 py-8 shadow-sm">
          <div className="inline-flex items-center gap-3 text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carico scheda Black…
          </div>
        </div>
      </main>
    );
  }

  if (!user?.email) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-xl rounded-[28px] border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-950">Accesso richiesto</h1>
          <p className="mt-2 text-sm text-slate-500">
            Entra con un account autorizzato per vedere la scheda.
          </p>
        </div>
      </main>
    );
  }

  if (error && !student) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-xl rounded-[28px] border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-950">Errore caricamento</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
        </div>
      </main>
    );
  }

  if (!student || !form) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-xl rounded-[28px] border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-950">Studente non trovato</h1>
          <p className="mt-2 text-sm text-slate-500">Verifica il link della scheda Black.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6">
        <section className="rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") window.history.back();
                }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Torna indietro
              </button>

              <h1 className="mt-3 truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                {student.studentName}
              </h1>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {studentWhatsAppUrl ? (
                <a
                  href={studentWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-bold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50"
                >
                  WhatsApp
                </a>
              ) : (
                <div className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500">
                  Nessun numero studente
                </div>
              )}

              {student.stripeCustomerUrl ? (
                <a
                  href={student.stripeCustomerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  Apri Stripe
                </a>
              ) : (
                <div className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500">
                  Nessun cliente Stripe
                </div>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={!dirty || saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Salvo…" : "Salva modifiche"}
              </button>
            </div>
          </div>

          {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p> : null}
          {saveMessage ? <p className="mt-3 text-sm font-semibold text-emerald-700">{saveMessage}</p> : null}
          {contactMessage ? <p className="mt-3 text-sm font-semibold text-emerald-700">{contactMessage}</p> : null}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Contatto
                </p>
                <h2 className="mt-2 text-lg font-bold text-slate-950">
                  Registra il contatto
                </h2>
              </div>

              <Field label="Descrizione del contatto opzionale">
                <textarea
                  value={contactNote}
                  onChange={(event) => {
                    setContactMessage(null);
                    setContactNote(event.target.value);
                  }}
                  className="min-h-[108px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="Es. sentito su WhatsApp, fissata call per martedi..."
                />
              </Field>

              <button
                type="button"
                onClick={handleMarkContacted}
                disabled={contacting}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                {contacting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {contacting ? "Registro contatto…" : "Segna come contattato"}
              </button>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Stato
                </p>
                <h2 className="mt-2 text-lg font-bold text-slate-950">
                  Info rapide
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoCell label="Stato percorso" value={statusLabel(student.status)} />
                <InfoCell label="Rinnovo" value={formatDate(student.renewalAt)} />
                <InfoCell label="Ultimo contatto" value={formatDateTime(student.lastContactedAt)} />
                <InfoCell label="Ultimo accesso" value={formatDateTime(student.lastActiveAt)} />
              </div>
            </div>
          </section>
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Scheda modificabile
                </p>
                <h2 className="mt-2 text-lg font-bold text-slate-950">
                  Tutti i campi utili
                </h2>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Nome studente">
                    <input
                      type="text"
                      value={form.studentName}
                      onChange={(event) => handleFieldChange("studentName", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </Field>

                  <Field label="Nome account">
                    <input
                      type="text"
                      value={form.accountName}
                      onChange={(event) => handleFieldChange("accountName", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </Field>

                  <Field label="Email studente">
                    <input
                      type="email"
                      value={form.studentEmail}
                      onChange={(event) => handleFieldChange("studentEmail", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </Field>

                  <Field label="Telefono studente">
                    <input
                      type="text"
                      value={form.studentPhone}
                      onChange={(event) => handleFieldChange("studentPhone", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </Field>

                  <Field label="Nome genitore">
                    <input
                      type="text"
                      value={form.parentName}
                      onChange={(event) => handleFieldChange("parentName", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </Field>

                  <Field label="Email genitore">
                    <input
                      type="email"
                      value={form.parentEmail}
                      onChange={(event) => handleFieldChange("parentEmail", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </Field>

                  <Field label="Telefono genitore">
                    <input
                      type="text"
                      value={form.parentPhone}
                      onChange={(event) => handleFieldChange("parentPhone", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </Field>

                  <Field label="Classe">
                    <input
                      type="text"
                      value={form.yearClass}
                      onChange={(event) => handleFieldChange("yearClass", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </Field>

                  <Field label="Data inizio">
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(event) => handleFieldChange("startDate", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </Field>

                  <Field label="Prossima verifica">
                    <input
                      type="text"
                      value={form.nextAssessmentSubject}
                      onChange={(event) =>
                        handleFieldChange("nextAssessmentSubject", event.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </Field>

                  <Field label="Data verifica">
                    <input
                      type="date"
                      value={form.nextAssessmentDate}
                      onChange={(event) => handleFieldChange("nextAssessmentDate", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </Field>

                  <Field label="Media iniziale">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={form.initialAverage}
                      onChange={(event) => handleFieldChange("initialAverage", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </Field>

                  <Field label="Media attuale">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={form.currentAverage}
                      onChange={(event) => handleFieldChange("currentAverage", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </Field>

                </div>

                <Field label="Obiettivo">
                  <textarea
                    value={form.goal}
                    onChange={(event) => handleFieldChange("goal", event.target.value)}
                    className="min-h-[112px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </Field>

                <Field label="Focus difficoltà">
                  <textarea
                    value={form.difficultyFocus}
                    onChange={(event) => handleFieldChange("difficultyFocus", event.target.value)}
                    className="min-h-[112px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </Field>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-4">
            {showTutorSection ? (
              <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      Gestionale prof
                    </p>
                    <h2 className="mt-2 text-lg font-bold text-slate-950">
                      Tutor e ore
                    </h2>
                  </div>

                  {tutorInfoItems.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {tutorInfoItems.map((item) => (
                        <InfoCell key={item.label} label={item.label} value={item.value} />
                      ))}
                    </div>
                  ) : null}

                  <Field label="Ore residue da svolgere">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min="0"
                      value={form.hoursPaid}
                      onChange={(event) => handleFieldChange("hoursPaid", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </Field>
                </div>
              </section>
            ) : null}

            <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Supporto
                  </p>
                  <h2 className="mt-2 text-lg font-bold text-slate-950">
                    Overview AI
                  </h2>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                        Overview AI
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Riassume la situazione dello studente e suggerisce le prossime mosse.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateOverview}
                      disabled={generatingOverview}
                      className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-800 transition hover:border-slate-400 hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {generatingOverview ? "Genero overview…" : "Genera overview"}
                    </button>
                  </div>

                  <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {student.aiDescription?.trim() || "Nessuna overview generata."}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function InfoCell({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900">
        {displayValue(value)}
      </p>
    </div>
  );
}
