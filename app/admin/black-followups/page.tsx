"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ArrowRight,
  ListFilter,
  Loader2,
  MessageCircle,
  Phone,
  Plus,
  RefreshCcw,
  UserRound,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";

type Contact = {
  id: string;
  name: string | null;
  studentId?: string | null;
  student?: BlackStudent | null;
  whatsappPhone: string | null;
  note: string | null;
  status: "active" | "completed" | "dropped";
  nextFollowUpAt: string | null;
  lastContactedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type BlackStudent = {
  id: string;
  preferred_name?: string | null;
  student_name?: string | null;
  student_email?: string | null;
  parent_email?: string | null;
  student_phone?: string | null;
  parent_phone?: string | null;
  year_class?: string | null;
  track?: string | null;
};

type ResponseData = {
  date: string;
  due: Contact[];
  upcoming: Contact[];
  completed: Contact[];
};

const allowedEmail = "luigi.miraglia006@gmail.com";
const whatsappPrefixes = ["+39", "+41", "+44", "+34", "+33", "+49", "+43"];

async function buildHeaders() {
  const headers: Record<string, string> = {};
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth.currentUser?.getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch (err) {
    console.warn("[admin/black-followups] missing firebase token", err);
  }
  return headers;
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
}

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00`);
}

function buildWhatsAppLink(phone?: string | null, preferWeb?: boolean) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (preferWeb) return `https://web.whatsapp.com/send?phone=${digits}`;
  return `https://wa.me/${digits}`;
}

function buildCardLink(contact: Contact) {
  const id = contact.studentId || contact.student?.id;
  return id ? `/tutor/scheda-black?studentId=${encodeURIComponent(id)}` : null;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export default function BlackFollowupsPage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() =>
    toDateInputValue(new Date())
  );
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [allFilter, setAllFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [restartingId, setRestartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    whatsappPrefix: whatsappPrefixes[0],
    whatsappNumber: "",
    nextDate: "",
    note: "",
    studentId: "",
  });
  const [showCompleted, setShowCompleted] = useState(false);
  const [preferWebWhatsApp, setPreferWebWhatsApp] = useState(false);
  const [nextDateDraft, setNextDateDraft] = useState<Record<string, string>>({});
  const [importingNext, setImportingNext] = useState(false);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState<BlackStudent[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<BlackStudent | null>(null);
  const [quickQuery, setQuickQuery] = useState("");

  const hasAccess = useMemo(
    () => Boolean(user?.email && user.email.toLowerCase() === allowedEmail),
    [user?.email]
  );

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /android|iphone|ipad|ipod/.test(ua);
    setPreferWebWhatsApp(!isMobile);
  }, []);

  const fetchContacts = useCallback(async () => {
    if (!hasAccess) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await buildHeaders();
      const params = new URLSearchParams({
        date: selectedDate,
        includeCompleted: showCompleted ? "1" : "0",
      });
      const res = await fetch(`/api/admin/black-followups?${params.toString()}`, {
        headers,
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setData({
        date: json.date,
        due: Array.isArray(json.due) ? json.due : [],
        upcoming: Array.isArray(json.upcoming) ? json.upcoming : [],
        completed: Array.isArray(json.completed) ? json.completed : [],
      });
    } catch (err: any) {
      setError(err?.message || "Errore caricamento contatti");
    } finally {
      setLoading(false);
    }
  }, [hasAccess, selectedDate, showCompleted]);

  const fetchAllContacts = useCallback(async () => {
    if (!hasAccess) return;
    setAllLoading(true);
    try {
      const headers = await buildHeaders();
      const res = await fetch("/api/admin/black-followups?all=1", {
        headers,
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setAllContacts(Array.isArray(json.contacts) ? json.contacts : []);
    } catch (err: any) {
      setError(err?.message || "Errore caricamento elenco completo");
    } finally {
      setAllLoading(false);
    }
  }, [hasAccess]);

  useEffect(() => {
    if (hasAccess) fetchContacts();
    if (hasAccess) fetchAllContacts();
  }, [hasAccess, fetchContacts, fetchAllContacts]);

  const applyContactUpdate = useCallback((contact: Contact) => {
    setData((prev) => {
      if (!prev) return prev;
      const removeFrom = (arr: Contact[]) => arr.filter((c) => c.id !== contact.id);
      let due = removeFrom(prev.due);
      let upcoming = removeFrom(prev.upcoming);
      let completed = removeFrom(prev.completed);

      const nextAt = contact.nextFollowUpAt ? new Date(contact.nextFollowUpAt) : null;
      const dayStart = startOfDay(selectedDate);
      const isDue = contact.status === "active" && nextAt && nextAt.getTime() <= addDays(dayStart, 1).getTime();

      if (contact.status === "completed") {
        completed = [contact, ...completed];
      } else if (isDue) {
        due = [contact, ...due];
      } else {
        upcoming = [contact, ...upcoming];
      }
      return { ...prev, due, upcoming, completed };
    });
    setAllContacts((prev) => {
      const remaining = prev.filter((c) => c.id !== contact.id);
      return [contact, ...remaining];
    });
    setNextDateDraft((prev) => {
      const next = { ...prev };
      delete next[contact.id];
      return next;
    });
  }, [selectedDate]);

  const handleCreate = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!form.whatsappNumber.trim()) {
        setError("Inserisci il numero WhatsApp");
        return;
      }
      setCreating(true);
      setError(null);
      try {
        const cleanedNumber = form.whatsappNumber.replace(/[^\d]/g, "");
        const fullWhatsApp =
          cleanedNumber && form.whatsappPrefix
            ? `${form.whatsappPrefix}${cleanedNumber}`
            : cleanedNumber || null;
        const headers = await buildHeaders();
        headers["Content-Type"] = "application/json";
        const res = await fetch("/api/admin/black-followups", {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: form.name.trim() || null,
            whatsapp: fullWhatsApp,
            note: form.note.trim() || null,
            nextFollowUpAt: form.nextDate || null,
            studentId: form.studentId || null,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        setForm({
          name: "",
          whatsappPrefix: form.whatsappPrefix || whatsappPrefixes[0],
          whatsappNumber: "",
          note: "",
          nextDate: "",
          studentId: "",
        });
        await fetchContacts();
        await fetchAllContacts();
      } catch (err: any) {
        setError(err?.message || "Errore creazione contatto");
      } finally {
        setCreating(false);
      }
    },
    [form, fetchContacts, fetchAllContacts]
  );

  const handleAdvance = useCallback(
    async (id: string, customDate?: string) => {
      setAdvancingId(id);
      setError(null);
      try {
        const headers = await buildHeaders();
        headers["Content-Type"] = "application/json";
        const res = await fetch("/api/admin/black-followups", {
          method: "PATCH",
          headers,
          body: JSON.stringify({ id, action: "advance", nextFollowUpAt: customDate || null }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        if (json?.contact) {
          applyContactUpdate(json.contact);
        } else {
          await fetchContacts();
        }
      } catch (err: any) {
        setError(err?.message || "Errore aggiornamento follow-up");
      } finally {
        setAdvancingId(null);
      }
    },
    [fetchContacts, applyContactUpdate]
  );

  const handleRestartLeadCycle = useCallback(
    async (id: string, customDate?: string) => {
      setRestartingId(id);
      setError(null);
      try {
        const headers = await buildHeaders();
        headers["Content-Type"] = "application/json";
        const res = await fetch("/api/admin/black-followups", {
          method: "PATCH",
          headers,
          body: JSON.stringify({ id, action: "restart_lead_cycle", nextFollowUpAt: customDate || null }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        if (json?.contact) {
          applyContactUpdate(json.contact);
        } else {
          await fetchContacts();
        }
      } catch (err: any) {
        setError(err?.message || "Errore riavvio ciclo lead");
      } finally {
        setRestartingId(null);
      }
    },
    [applyContactUpdate, fetchContacts]
  );

  const handleImportNext = useCallback(async () => {
    setImportingNext(true);
    setError(null);
    try {
      const headers = await buildHeaders();
      const res = await fetch("/api/admin/black-followups?next=1", {
        headers,
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      if (json?.contact) {
        applyContactUpdate(json.contact);
        setSelectedStudent(
          json.contact.student ? (json.contact.student as BlackStudent) : null,
        );
        setForm((prev) => ({
          ...prev,
          name: json.contact.student?.preferred_name || json.contact.name || prev.name,
          studentId: json.contact.studentId || "",
          whatsappNumber:
            json.contact.whatsappPhone?.replace(/[^\d]/g, "") || prev.whatsappNumber,
        }));
      } else {
        await fetchContacts();
      }
    } catch (err: any) {
      setError(err?.message || "Errore import contatto");
    } finally {
      setImportingNext(false);
    }
  }, [applyContactUpdate, fetchContacts]);

  const fetchStudents = useCallback(async () => {
    if (!studentQuery.trim()) {
      setStudentResults([]);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const headers = await buildHeaders();
      const res = await fetch(`/api/admin/black-followups?lookup=${encodeURIComponent(studentQuery.trim())}`, {
        headers,
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setStudentResults(Array.isArray(json.students) ? json.students : []);
    } catch (err: any) {
      setError(err?.message || "Errore ricerca studente");
    } finally {
      setSearching(false);
    }
  }, [studentQuery]);

  const applyStudentSelection = useCallback((student: BlackStudent) => {
    setSelectedStudent(student);
    const phoneRaw = student.student_phone || student.parent_phone || "";
    const digits = phoneRaw.replace(/[^\d]/g, "");
    let chosenPrefix = form.whatsappPrefix;
    let numberPart = digits;
    const matchingPrefix = whatsappPrefixes.find((p) => digits.startsWith(p.replace("+", "")));
    if (matchingPrefix) {
      chosenPrefix = matchingPrefix;
      numberPart = digits.slice(matchingPrefix.replace("+", "").length);
    }
    const autoNoteParts: string[] = [];
    if (student.year_class) autoNoteParts.push(`Classe: ${student.year_class}`);
    if (student.track) autoNoteParts.push(`Percorso: ${student.track}`);
    if (student.student_email || student.parent_email) {
      autoNoteParts.push(`Email: ${student.student_email || student.parent_email}`);
    }
    setForm((prev) => ({
      ...prev,
      name: student.preferred_name || student.student_name || prev.name,
      studentId: student.id,
      whatsappPrefix: chosenPrefix,
      whatsappNumber: numberPart,
      note: prev.note || autoNoteParts.join(" • "),
    }));
  }, [form.whatsappPrefix]);

  const dayDue = useMemo(() => {
    const list = data?.due || [];
    return list.map((c) => {
      const dueAt = c.nextFollowUpAt ? new Date(c.nextFollowUpAt) : null;
      const isOverdue = dueAt ? dueAt.getTime() < startOfDay(selectedDate).getTime() : false;
      return { ...c, dueAt, isOverdue };
    });
  }, [data?.due, selectedDate]);

  const filteredAllContacts = useMemo(() => {
    const statusRank = (status?: string | null) => {
      if (status === "active") return 0;
      if (status === "completed") return 1;
      return 2;
    };
    const timeVal = (iso?: string | null, fallback?: number) => {
      if (!iso) return fallback ?? Number.POSITIVE_INFINITY;
      const t = new Date(iso).getTime();
      return Number.isNaN(t) ? fallback ?? Number.POSITIVE_INFINITY : t;
    };
    const sorted = [...allContacts].sort((a, b) => {
      return (
        statusRank(a.status) - statusRank(b.status) ||
        timeVal(a.nextFollowUpAt) - timeVal(b.nextFollowUpAt) ||
        timeVal(b.updatedAt, 0) - timeVal(a.updatedAt, 0)
      );
    });
    const query = allFilter.trim().toLowerCase();
    if (!query) return sorted;
    return sorted.filter((c) => {
      const text = [
        c.name,
        c.whatsappPhone,
        c.note,
        c.status,
        c.student?.preferred_name,
        c.student?.student_name,
        c.student?.student_email,
        c.student?.parent_email,
        c.student?.student_phone,
        c.student?.parent_phone,
        c.student?.year_class,
        c.student?.track,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(query);
    });
  }, [allContacts, allFilter]);

  const quickResults = useMemo(() => {
    const q = quickQuery.trim().toLowerCase();
    if (!q) return [];
    const haystack = q.replace(/[^\w+]/g, "");
    return allContacts
      .filter((c) => {
        const text = [
          c.name,
          c.whatsappPhone,
          c.student?.student_phone,
          c.student?.parent_phone,
          c.student?.student_email,
          c.student?.parent_email,
          c.note,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(q) || text.replace(/\D/g, "").includes(haystack);
      })
      .slice(0, 10);
  }, [allContacts, quickQuery]);

  if (authLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-2 rounded-xl bg-white/80 px-6 py-10 shadow">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <p className="text-lg font-semibold text-slate-800">
          Accesso riservato a {allowedEmail}
        </p>
        <p className="text-sm text-slate-500">Accedi con l&apos;account corretto.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Admin
            </p>
            <h1 className="text-3xl font-black text-slate-900 leading-tight">
              Black da contattare
            </h1>
            <p className="text-sm text-slate-600">
              Logica simile ai lead, con follow-up di default a +3 giorni (modificabile).
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Link
              href="/admin/whatsapp"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-slate-300"
            >
              <MessageCircle size={16} />
              WhatsApp Admin
            </Link>
            <Link
              href="/admin/leads"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-slate-300"
            >
              <ListFilter size={16} />
              Leads manuali
            </Link>
            <button
              onClick={handleImportNext}
              disabled={importingNext}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 shadow-sm hover:border-emerald-300 disabled:opacity-50"
            >
              {importingNext ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Importa prossimo Black
            </button>
            <button
              onClick={fetchContacts}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
              Aggiorna
            </button>
          </div>
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">
            <AlertTriangle size={18} />
            {error}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white">
              <Plus size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 leading-tight">
                Aggiungi contatto Black
              </h2>
              <p className="text-sm text-slate-500">
                Numero WhatsApp obbligatorio; puoi impostare una data di follow-up iniziale.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Collega studente Black
                  </p>
                  <p className="text-xs text-slate-500">
                    Cerca per email o telefono, poi sovrascrivi il numero se serve.
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                    placeholder="email o telefono"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                  />
                  <button
                    type="button"
                    onClick={fetchStudents}
                    disabled={searching}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-emerald-300 disabled:opacity-50"
                  >
                    {searching ? <Loader2 size={14} className="animate-spin" /> : <ListFilter size={14} />}
                    Cerca
                  </button>
                </div>
              </div>
              {studentResults.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {studentResults.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => applyStudentSelection(s)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:border-emerald-300"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {s.preferred_name || s.student_name || "Studente"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {s.student_email || s.parent_email || "Email n/d"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {s.student_phone || s.parent_phone || "Telefono n/d"}
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {s.year_class || "classe?"} · {s.track || "track?"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
              {selectedStudent ? (
                <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Collegato: {selectedStudent.preferred_name || selectedStudent.student_name || "Studente"} (
                  {selectedStudent.student_email || selectedStudent.parent_email || "email n/d"})
                </div>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Nome (facoltativo)</label>
              <div className="relative">
                <UserRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-9 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="Nome e cognome"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">WhatsApp</label>
              <div className="flex gap-2">
                <select
                  value={form.whatsappPrefix}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, whatsappPrefix: e.target.value }))
                  }
                  className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                >
                  {whatsappPrefixes.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.whatsappNumber}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      whatsappNumber: e.target.value,
                    }))
                  }
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="Numero senza spazi"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Data follow-up iniziale</label>
              <input
                type="date"
                value={form.nextDate}
                onChange={(e) => setForm((prev) => ({ ...prev, nextDate: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
              />
              <p className="text-[11px] text-slate-500">
                Se vuota, il contatto finisce nella coda di oggi.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Note</label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                placeholder="Contesto, priorità..."
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock3 size={14} />
              Dopo un contatto, il prossimo follow-up va automaticamente a +3 giorni (modificabile).
            </div>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Salva contatto
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Giorno da evadere
              </p>
              <h3 className="text-xl font-bold text-slate-900 leading-tight">
                {new Date(selectedDate).toLocaleDateString("it-IT", {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                })}
              </h3>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-slate-900/90 px-3 py-3 text-white shadow">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">Da contattare</p>
              <p className="mt-1 text-2xl font-black">
                {dayDue.length}
                <span className="text-xs font-semibold text-white/60"> contatti</span>
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 px-3 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Prossimi</p>
              <p className="mt-1 text-2xl font-black text-slate-900">
                {data?.upcoming?.length || 0}
                <span className="text-xs font-semibold text-slate-500"> in coda</span>
              </p>
            </div>
            <label className="col-span-2 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              Mostra anche i completati
            </label>
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Da contattare entro il {formatDay(data?.date)}
            </h2>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
          </div>
          {dayDue.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
              Nessun contatto per questa data.
            </div>
          ) : (
            <div className="space-y-3">
              {dayDue.map((contact) => {
                const whatsappLink = buildWhatsAppLink(contact.whatsappPhone, preferWebWhatsApp);
                const dateDraft = nextDateDraft[contact.id] || "";
                const cardLink = buildCardLink(contact);
                return (
                  <div
                    key={contact.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Black
                          </span>
                          {contact.isOverdue ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                              In ritardo
                            </span>
                          ) : null}
                        </div>
                        <div>
                          <p className="text-base font-semibold text-slate-900">
                            {contact.name || "Contatto senza nome"}
                          </p>
                          {contact.student ? (
                            <p className="text-xs text-slate-600">
                              {contact.student.preferred_name || contact.student.student_name || "Studente"} ·{" "}
                              {contact.student.student_email || contact.student.parent_email || "email n/d"} ·{" "}
                              {contact.student.year_class || "classe?"} · {contact.student.track || "track?"}
                            </p>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                            {contact.whatsappPhone ? <span>{contact.whatsappPhone}</span> : null}
                            {whatsappLink ? (
                              <a
                                href={whatsappLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-slate-900 underline decoration-slate-300 underline-offset-4"
                              >
                                Apri chat
                                <ArrowRight size={14} />
                              </a>
                            ) : null}
                            {cardLink ? (
                              <a
                                href={cardLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-slate-900 underline decoration-slate-300 underline-offset-4"
                              >
                                Scheda Black
                                <ExternalLink size={14} />
                              </a>
                            ) : null}
                          </div>
                        </div>
                        {contact.note ? (
                          <p className="text-sm text-slate-700">
                            <span className="font-semibold text-slate-900">Nota:</span>{" "}
                            {contact.note}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                            <Clock3 size={14} />
                            {contact.isOverdue
                              ? `doveva essere il ${formatDate(contact.nextFollowUpAt)}`
                              : `oggi / ${formatDate(contact.nextFollowUpAt)}`}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                            Inserito {formatDate(contact.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-stretch gap-2">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <input
                            type="date"
                            value={dateDraft}
                            onChange={(e) =>
                              setNextDateDraft((prev) => ({
                                ...prev,
                                [contact.id]: e.target.value,
                              }))
                            }
                            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                          />
                          <span className="text-[11px] text-slate-500">Vuoto = +3 giorni</span>
                        </div>
                        <button
                          onClick={() =>
                            handleRestartLeadCycle(contact.id, dateDraft || undefined)
                          }
                          disabled={restartingId === contact.id}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 shadow hover:border-indigo-300 disabled:opacity-60"
                        >
                          {restartingId === contact.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <RefreshCcw size={16} />
                          )}
                          Ha risposto (restart lead)
                        </button>
                        <button
                          onClick={() =>
                            handleAdvance(contact.id, dateDraft || undefined)
                          }
                          disabled={advancingId === contact.id}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {advancingId === contact.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={16} />
                          )}
                          Contattato
                        </button>
                        <p className="text-[11px] leading-tight text-slate-500">
                          Segna il contatto e programma la prossima data (se vuota: +3 giorni).
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Prossimi follow-up</h3>
              <Clock3 size={16} className="text-slate-400" />
            </div>
            {data?.upcoming?.length ? (
              <div className="space-y-2">
                {data.upcoming.slice(0, 8).map((contact) => {
                  const nextAt = contact.nextFollowUpAt ? new Date(contact.nextFollowUpAt) : null;
                  const cardLink = buildCardLink(contact);
                  return (
                    <div
                      key={contact.id}
                      className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                            Black
                          </span>
                          <span className="font-semibold text-slate-900">
                            {contact.name || contact.whatsappPhone || "Contatto"}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                          {nextAt ? nextAt.toLocaleDateString("it-IT") : "—"}
                        </span>
                      </div>
                      {contact.student ? (
                        <p className="text-[11px] text-slate-600 mt-1">
                          {contact.student.preferred_name || contact.student.student_name || "Studente"} ·{" "}
                          {contact.student.student_email || contact.student.parent_email || "email n/d"}
                        </p>
                      ) : null}
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <Clock3 size={14} />
                        Prossimo follow-up
                        {cardLink ? (
                          <a
                            href={cardLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-slate-700 underline decoration-slate-300 underline-offset-4"
                          >
                            Scheda
                            <ExternalLink size={12} />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Nessun follow-up programmato.</p>
            )}
          </div>

          {showCompleted ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Chiusi</h3>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
              {data?.completed?.length ? (
                <div className="space-y-2 text-sm">
                  {data.completed.slice(0, 10).map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                          Black
                        </span>
                        <span className="font-semibold text-slate-900">
                          {contact.name || contact.whatsappPhone || "Contatto"}
                        </span>
                        {buildCardLink(contact) ? (
                          <a
                            href={buildCardLink(contact)!}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-slate-600 underline decoration-slate-300 underline-offset-4"
                          >
                            Scheda
                            <ExternalLink size={12} />
                          </a>
                        ) : null}
                      </div>
                      <span className="text-xs text-slate-500">
                        chiuso {formatDate(contact.updatedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Nessun contatto completato.</p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Azioni rapide
              </p>
              <p className="text-sm text-slate-600">
                Cerca per numero/email e clicca subito: Contattato, Apri WhatsApp, Ha risposto.
              </p>
            </div>
            <input
              type="text"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Cerca numero, email o nome"
              className="w-full min-w-[260px] md:w-80 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
            />
          </div>
          {quickQuery ? (
            <div className="mt-3 max-h-64 space-y-2 overflow-auto">
              {quickResults.length ? (
                quickResults.map((contact) => {
                  const whatsappLink = buildWhatsAppLink(contact.whatsappPhone, preferWebWhatsApp);
                  const dateDraft = nextDateDraft[contact.id] || "";
                  return (
                    <div
                      key={contact.id}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {contact.name || contact.whatsappPhone || "Contatto"}
                          </p>
                          <p className="text-xs text-slate-600">
                            {contact.whatsappPhone || "Telefono n/d"}
                            {contact.student?.student_email
                              ? ` · ${contact.student.student_email}`
                              : contact.student?.parent_email
                                ? ` · ${contact.student.parent_email}`
                                : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold">
                            {contact.status === "completed"
                              ? "Completato"
                              : contact.status === "dropped"
                                ? "Dropped"
                                : "Attivo"}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold">
                            {formatDate(contact.nextFollowUpAt)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="font-semibold text-slate-900">Prossimo:</span>
                        <input
                          type="date"
                          value={dateDraft}
                          onChange={(e) =>
                            setNextDateDraft((prev) => ({
                              ...prev,
                              [contact.id]: e.target.value,
                            }))
                          }
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                        />
                        <select
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            const next = addDays(new Date(), Number(val));
                            const iso = toDateInputValue(next);
                            setNextDateDraft((prev) => ({ ...prev, [contact.id]: iso }));
                          }}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                        >
                          <option value="">Rapidi</option>
                          <option value="0">Oggi</option>
                          <option value="1">+1 giorno</option>
                          <option value="3">+3 giorni</option>
                          <option value="7">+7 giorni</option>
                        </select>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleAdvance(contact.id, dateDraft || undefined)}
                          disabled={advancingId === contact.id}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {advancingId === contact.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          Contattato
                        </button>
                        {whatsappLink ? (
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-300"
                          >
                            <Phone size={14} />
                            Apri WhatsApp
                          </a>
                        ) : null}
                        <button
                          onClick={() => handleRestartLeadCycle(contact.id, dateDraft || undefined)}
                          disabled={restartingId === contact.id}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:border-indigo-300 disabled:opacity-60"
                        >
                          {restartingId === contact.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <RefreshCcw size={14} />
                          )}
                          Ha risposto
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
                  Nessun contatto trovato.
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Archivio Black
            </p>
            <h3 className="text-lg font-semibold text-slate-900 leading-tight">
              Tutti i follow-up
            </h3>
            <p className="text-sm text-slate-500">
              Consulta l&apos;elenco completo e apri la scheda Black del contatto.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <input
              type="text"
              value={allFilter}
              onChange={(e) => setAllFilter(e.target.value)}
              placeholder="Filtra per nome, email, telefono, note..."
              className="w-full min-w-[240px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
            />
            <button
              type="button"
              onClick={fetchAllContacts}
              disabled={allLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-slate-300 disabled:opacity-50"
            >
              {allLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
              Aggiorna elenco
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <span>{filteredAllContacts.length} mostrati</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span>{allContacts.length} totali</span>
        </div>
        <div className="mt-4 max-h-[520px] space-y-2 overflow-auto">
          {allLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              Carico tutti i follow-up...
            </div>
          ) : filteredAllContacts.length ? (
            filteredAllContacts.map((contact) => {
              const whatsappLink = buildWhatsAppLink(contact.whatsappPhone, preferWebWhatsApp);
              const cardLink = buildCardLink(contact);
              const statusTone =
                contact.status === "completed"
                  ? "bg-emerald-100 text-emerald-700"
                  : contact.status === "dropped"
                  ? "bg-slate-100 text-slate-600"
                  : "bg-indigo-100 text-indigo-700";
              return (
                <div
                  key={contact.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone}`}>
                        {contact.status === "completed"
                          ? "Completato"
                          : contact.status === "dropped"
                          ? "Dropped"
                          : "Attivo"}
                      </span>
                      <p className="text-sm font-semibold text-slate-900">
                        {contact.name || contact.whatsappPhone || "Contatto"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                      <Clock3 size={14} />
                      {formatDate(contact.nextFollowUpAt)}
                    </div>
                  </div>
                  {contact.student ? (
                    <p className="mt-1 text-xs text-slate-600">
                      {contact.student.preferred_name || contact.student.student_name || "Studente"} ·{" "}
                      {contact.student.student_email || contact.student.parent_email || "email n/d"} ·{" "}
                      {contact.student.year_class || "classe?"} · {contact.student.track || "track?"}
                    </p>
                  ) : null}
                  {contact.note ? (
                    <p className="mt-2 text-sm text-slate-700">{contact.note}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    {contact.whatsappPhone ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-semibold text-slate-800">
                        <Phone size={14} />
                        {contact.whatsappPhone}
                      </span>
                    ) : null}
                    {whatsappLink ? (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-semibold text-slate-800 underline decoration-slate-300 underline-offset-4"
                      >
                        Apri chat
                        <ArrowRight size={12} />
                      </a>
                    ) : null}
                    {cardLink ? (
                      <a
                        href={cardLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-semibold text-slate-800 underline decoration-slate-300 underline-offset-4"
                      >
                        Scheda Black
                        <ExternalLink size={12} />
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
              Nessun follow-up trovato. Usa un filtro diverso o aggiorna l&apos;elenco.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
