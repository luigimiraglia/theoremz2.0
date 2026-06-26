"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { getAuth } from "firebase/auth";
import { useAuth } from "@/lib/AuthContext";
import {
  ArrowUpDown,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

type StudentRow = {
  id: string;
  studentId: string | null;
  programKind: string;
  fullName: string;
  phone: string | null;
  activationAt: string | null;
  lastContactAt: string | null;
  nextAssessmentAt: string | null;
  nextAssessmentLabel: string | null;
  renewalAt: string | null;
  urgencyScore: number;
  status: string | null;
};

type SortKey =
  | "urgency_desc"
  | "next_assessment_asc"
  | "renewal_asc"
  | "last_contact_desc"
  | "name_asc";

type StudentsApiResponse = {
  students?: StudentRow[];
  error?: string;
};

const ALLOWED_EMAIL = "luigi.miraglia006@gmail.com";

type CreateStudentForm = {
  fullName: string;
  phone: string;
  email: string;
  parentPhone: string;
  parentEmail: string;
  yearClass: string;
  startDate: string;
  nextAssessmentSubject: string;
  nextAssessmentDate: string;
  programKind: "percorso" | "subscription";
};

const INITIAL_CREATE_FORM: CreateStudentForm = {
  fullName: "",
  phone: "",
  email: "",
  parentPhone: "",
  parentEmail: "",
  yearClass: "",
  startDate: new Date().toISOString().slice(0, 10),
  nextAssessmentSubject: "",
  nextAssessmentDate: "",
  programKind: "percorso",
};

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "Nessun contatto";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toWhatsAppHref(phone?: string | null) {
  const digits = (phone || "").replace(/\D/g, "");
  return digits
    ? `https://web.whatsapp.com/send/?phone=${digits}&text&type=phone_number&app_absent=0`
    : null;
}

function toSortableTime(iso?: string | null, fallback = Number.MAX_SAFE_INTEGER) {
  if (!iso) return fallback;
  const value = new Date(iso).getTime();
  return Number.isFinite(value) ? value : fallback;
}

function compareStudents(a: StudentRow, b: StudentRow, sort: SortKey) {
  if (sort === "urgency_desc") {
    if (b.urgencyScore !== a.urgencyScore) return b.urgencyScore - a.urgencyScore;
    const aContact = toSortableTime(a.lastContactAt);
    const bContact = toSortableTime(b.lastContactAt);
    if (aContact !== bContact) return aContact - bContact;
    return a.fullName.localeCompare(b.fullName, "it");
  }
  if (sort === "name_asc") {
    return a.fullName.localeCompare(b.fullName, "it");
  }
  if (sort === "last_contact_desc") {
    return toSortableTime(b.lastContactAt, 0) - toSortableTime(a.lastContactAt, 0);
  }
  if (sort === "renewal_asc") {
    return toSortableTime(a.renewalAt) - toSortableTime(b.renewalAt);
  }
  return toSortableTime(a.nextAssessmentAt) - toSortableTime(b.nextAssessmentAt);
}

function normalizeStatusKey(status?: string | null) {
  return (status || "").trim().toLowerCase();
}

function statusBadge(student: StudentRow) {
  const status = normalizeStatusKey(student.status);
  if (!status || status === "new" || status === "lead" || status === "onboarding") {
    return "border-sky-300 bg-sky-50 text-sky-800";
  }
  if (
    status === "disdetto" ||
    status === "paused" ||
    status === "inactive" ||
    status === "closed" ||
    status === "cancelled" ||
    status === "canceled" ||
    status === "churned"
  ) {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }
  return "border-emerald-300 bg-emerald-50 text-emerald-800";
}

function statusLabel(student: StudentRow) {
  const status = normalizeStatusKey(student.status);
  if (!status) return "Da definire";
  if (status === "active") return "Attivo";
  if (status === "disdetto") return "Disdetto";
  if (status === "lead") return "Lead";
  if (status === "new") return "Nuovo";
  if (status === "onboarding") return "Onboarding";
  if (status === "paused") return "Disdetto";
  if (status === "inactive") return "Inattivo";
  if (status === "closed") return "Chiuso";
  if (status === "cancelled" || status === "canceled") return "Disdetto";
  if (status === "churned") return "Disdetto";
  return status.charAt(0).toUpperCase() + status.slice(1).replaceAll("_", " ");
}

async function fetchStudents(token: string) {
  const res = await fetch("/api/admin/students", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as StudentsApiResponse;
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return Array.isArray(data.students) ? data.students : [];
}

function EmptyState() {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/90 px-6 py-14 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <UserRound className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-900">Nessuno studente Black trovato</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        Quando avrai lead, iscritti o studenti Black salvati, compariranno qui.
      </p>
    </div>
  );
}

export default function StudentsAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("urgency_desc");
  const [showAddModal, setShowAddModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateStudentForm>(INITIAL_CREATE_FORM);
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const hasAccess = Boolean(user?.email && user.email.toLowerCase() === ALLOWED_EMAIL);

  useEffect(() => {
    if (authLoading) return;
    if (!hasAccess) {
      setLoadingStudents(false);
      return;
    }

    let active = true;

    (async () => {
      setLoadingStudents(true);
      setFetchError(null);
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) throw new Error("Autenticazione mancante");
        if (!active) return;
        setStudents(await fetchStudents(token));
      } catch (err: any) {
        if (!active) return;
        setFetchError(err?.message || "Errore caricamento studenti");
      } finally {
        if (active) setLoadingStudents(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [authLoading, hasAccess]);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredStudents = useMemo(() => {
    const base = students.filter((student) => {
      if (!normalizedQuery) return true;
      const haystack = [
        student.fullName,
        student.phone || "",
        statusLabel(student),
        student.programKind === "percorso" ? "percorso" : "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
    return [...base].sort((a, b) => compareStudents(a, b, sortBy));
  }, [normalizedQuery, sortBy, students]);

  const handleCreateFieldChange = (field: keyof CreateStudentForm, value: string) => {
    setCreateError(null);
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateStudent = async () => {
    setCreatingStudent(true);
    setCreateError(null);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) throw new Error("Autenticazione mancante");

      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create_student",
          ...createForm,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      const refreshedStudents = await fetchStudents(token);
      setStudents(refreshedStudents);
      setShowAddModal(false);
      setCreateForm(INITIAL_CREATE_FORM);
    } catch (err: any) {
      setCreateError(err?.message || "Errore creazione scheda");
    } finally {
      setCreatingStudent(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto flex max-w-xl items-center justify-center rounded-[28px] border border-slate-200 bg-white/90 px-6 py-8 shadow-sm">
          <div className="inline-flex items-center gap-3 text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carico dashboard studenti…
          </div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-xl rounded-[30px] border border-slate-200 bg-white/95 px-8 py-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-950">Accesso riservato</h1>
          <p className="mt-2 text-sm text-slate-500">
            Questa dashboard studenti è disponibile solo per l&apos;account amministratore.
          </p>
        </div>
      </div>
    );
  }

  if (loadingStudents) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto flex max-w-xl items-center justify-center rounded-[28px] border border-slate-200 bg-white/90 px-6 py-8 shadow-sm">
          <div className="inline-flex items-center gap-3 text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carico dashboard studenti…
          </div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-xl rounded-[30px] border border-slate-200 bg-white/95 px-8 py-10 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">Errore caricamento</h1>
          <p className="mt-2 text-sm text-slate-500">{fetchError}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:px-8">
        <section className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px] lg:flex-1">
              <label className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cerca studente o numero di telefono…"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <ArrowUpDown className="h-4 w-4 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortKey)}
                  className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none"
                >
                  <option value="urgency_desc">Ordina per da contattare più urgentemente</option>
                  <option value="next_assessment_asc">Ordina per prossima verifica</option>
                  <option value="renewal_asc">Ordina per rinnovo più vicino</option>
                  <option value="last_contact_desc">Ordina per ultimo contatto</option>
                  <option value="name_asc">Ordina alfabeticamente</option>
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 sm:w-auto sm:self-start lg:self-auto"
            >
              <Plus className="h-4 w-4" />
              Aggiungi studente
            </button>
          </div>
        </section>

        {filteredStudents.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <section className="hidden overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 shadow-sm xl:block">
              <div className="grid grid-cols-[minmax(240px,1.3fr)_220px_220px_160px_280px] gap-4 border-b border-slate-200 bg-slate-50/90 px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                <span>Studente</span>
                <span>Telefono</span>
                <span>Ultimo contatto</span>
                <span>Stato percorso</span>
                <span>Azioni</span>
              </div>

              <div className="divide-y divide-slate-200">
                {filteredStudents.map((student) => {
                  const whatsappHref = toWhatsAppHref(student.phone);
                  return (
                    <div
                      key={student.id}
                      className="grid grid-cols-[minmax(240px,1.3fr)_220px_220px_160px_280px] gap-4 px-6 py-5 transition hover:bg-slate-50/70"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[15px] font-bold text-slate-950">
                            {student.fullName}
                          </p>
                          {student.programKind === "percorso" ? (
                            <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-800">
                              Percorso
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>
                            Prossima verifica: {student.nextAssessmentAt ? formatDate(student.nextAssessmentAt) : "—"}
                          </span>
                          <span>
                            Attivato: {student.activationAt ? formatDate(student.activationAt) : "—"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center text-sm font-semibold text-slate-700">
                        {student.phone || "Telefono n/d"}
                      </div>

                      <div className="flex items-center">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {formatDate(student.lastContactAt)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDateTime(student.lastContactAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <span
                          className={`inline-flex rounded-full border px-3 py-2 text-xs font-bold ${statusBadge(student)}`}
                        >
                          {statusLabel(student)}
                        </span>
                      </div>

                      <div className="flex items-center">
                        <div className="grid w-full grid-cols-2 gap-2">
                          <Link
                            href={`/tutor/scheda-black?studentId=${encodeURIComponent(student.id)}`}
                            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                          >
                            Apri scheda
                          </Link>
                          {whatsappHref ? (
                            <a
                              href={whatsappHref}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                            >
                              <MessageCircle className="h-4 w-4" />
                              Apri WhatsApp
                            </a>
                          ) : (
                            <span className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-500">
                              Telefono mancante
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="flex flex-col gap-3 xl:hidden">
              {filteredStudents.map((student) => {
                const whatsappHref = toWhatsAppHref(student.phone);
                return (
                  <article
                    key={student.id}
                    className="rounded-[22px] border border-slate-200 bg-white/95 p-3 shadow-sm sm:p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-base font-bold text-slate-950">
                            {student.fullName}
                          </p>
                          {student.programKind === "percorso" ? (
                            <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-800">
                              Percorso
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>
                            Prossima verifica: {student.nextAssessmentAt ? formatDate(student.nextAssessmentAt) : "—"}
                          </span>
                          <span>
                            Attivato: {student.activationAt ? formatDate(student.activationAt) : "—"}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                          <CompactInfo label="Telefono" value={student.phone || "Telefono n/d"} />
                          <CompactInfo
                            label="Ultimo contatto"
                            value={formatDateTime(student.lastContactAt)}
                          />
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 lg:min-w-[150px]">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                              Stato percorso
                            </p>
                            <div className="mt-2">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${statusBadge(student)}`}
                              >
                                {statusLabel(student)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 lg:w-[280px] lg:flex-none">
                        <Link
                          href={`/tutor/scheda-black?studentId=${encodeURIComponent(student.id)}`}
                          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                          Apri scheda
                        </Link>
                        {whatsappHref ? (
                          <a
                            href={whatsappHref}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Apri WhatsApp
                          </a>
                        ) : (
                          <span className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-500">
                            Telefono mancante
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        )}
      </div>

      {showAddModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4">
          <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.45)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">
                  Aggiungi studente
                </p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                  Crea una scheda Black
                </h2>
                <p className="mt-2 max-w-xl text-sm text-slate-500">
                  Puoi creare anche studenti di tipo percorso completo. Questi finiscono con
                  priorità massima nella dashboard.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Chiudi
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <ModalField
                label="Nome completo"
                value={createForm.fullName}
                onChange={(value) => handleCreateFieldChange("fullName", value)}
                placeholder="Es. Martina Rinaldi"
              />
              <ModalField
                label="Telefono studente"
                value={createForm.phone}
                onChange={(value) => handleCreateFieldChange("phone", value)}
                placeholder="+39 333 000 0000"
              />
              <ModalField
                label="Email studente"
                value={createForm.email}
                onChange={(value) => handleCreateFieldChange("email", value)}
                placeholder="studente@email.com"
              />
              <ModalField
                label="Classe"
                value={createForm.yearClass}
                onChange={(value) => handleCreateFieldChange("yearClass", value)}
                placeholder="4° Liceo Scientifico"
              />
              <ModalField
                label="Telefono genitore"
                value={createForm.parentPhone}
                onChange={(value) => handleCreateFieldChange("parentPhone", value)}
                placeholder="+39 333 000 0000"
              />
              <ModalField
                label="Email genitore"
                value={createForm.parentEmail}
                onChange={(value) => handleCreateFieldChange("parentEmail", value)}
                placeholder="genitore@email.com"
              />
              <ModalField
                label="Prossima verifica"
                value={createForm.nextAssessmentSubject}
                onChange={(value) => handleCreateFieldChange("nextAssessmentSubject", value)}
                placeholder="Es. Verifica matematica"
              />
              <ModalField
                type="date"
                label="Data verifica"
                value={createForm.nextAssessmentDate}
                onChange={(value) => handleCreateFieldChange("nextAssessmentDate", value)}
                placeholder=""
              />
              <ModalField
                type="date"
                label="Data attivazione"
                value={createForm.startDate}
                onChange={(value) => handleCreateFieldChange("startDate", value)}
                placeholder=""
              />
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Tipo scheda
                </span>
                <select
                  value={createForm.programKind}
                  onChange={(event) =>
                    handleCreateFieldChange(
                      "programKind",
                      event.target.value as CreateStudentForm["programKind"],
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                >
                  <option value="percorso">Percorso completo</option>
                  <option value="subscription">Black / abbonamento</option>
                </select>
              </label>
            </div>

            {createError ? <p className="mt-4 text-sm font-semibold text-rose-600">{createError}</p> : null}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <p className="text-xs font-semibold text-slate-500">
                Nome e un contatto sono il minimo richiesto per creare la scheda.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setCreateError(null);
                    setCreateForm(INITIAL_CREATE_FORM);
                  }}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleCreateStudent}
                  disabled={creatingStudent}
                  className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {creatingStudent ? "Creo scheda…" : "Crea scheda"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function CompactInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 min-w-0 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ModalField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
      />
    </label>
  );
}
