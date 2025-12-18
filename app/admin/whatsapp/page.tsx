"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import clsx from "clsx";
import { useAuth } from "@/lib/AuthContext";
import { ArrowRight, ListFilter, MessageCircle } from "lucide-react";

type Booking = {
  id: string;
  slotId?: string;
  callTypeId?: string | null;
  tutorId?: string | null;
  studentId?: string | null;
  startsAt: string;
  durationMin: number | null;
  callType: string | null;
  callTypeName: string | null;
  tutorName: string | null;
  fullName: string;
  email: string;
  note: string | null;
  status?: string | null;
  remainingPaid?: number | null;
};

type CallTypeMeta = { id: string; slug: string; name: string; duration_min: number };
type TutorStudent = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  hoursPaid?: number;
  hoursConsumed?: number;
  remainingPaid?: number;
  isBlack?: boolean;
  hourlyRate?: number | null;
};
type TutorMeta = {
  id: string;
  display_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  bio?: string | null;
  hoursDue?: number | null;
  students?: TutorStudent[];
};
type BookingDraft = {
  id: string | null;
  fullName: string;
  email: string;
  note: string;
  date: string;
  time: string;
  callTypeSlug: string;
  tutorId: string;
  durationMin: string;
  status: "confirmed" | "cancelled";
};

type ConversationItem = {
  id?: string;
  phoneTail: string | null;
  phone?: string | null;
  status?: string | null;
  type?: string | null;
  bot?: string | null;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  updatedAt?: string | null;
  student?: {
    id: string;
    userId?: string | null;
    name?: string | null;
    status?: string | null;
    planLabel?: string | null;
    readiness?: number | null;
    risk?: string | null;
    yearClass?: string | null;
    track?: string | null;
    startDate?: string | null;
    parentName?: string | null;
    studentEmail?: string | null;
    parentEmail?: string | null;
    studentPhone?: string | null;
    parentPhone?: string | null;
    goal?: string | null;
    difficultyFocus?: string | null;
    nextAssessmentSubject?: string | null;
    nextAssessmentDate?: string | null;
    aiDescription?: string | null;
    lastContactedAt?: string | null;
    stripePrice?: string | null;
  } | null;
};

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  meta?: { image?: { id?: string; mime_type?: string | null } };
};

function tutorLabel(t?: TutorMeta | null) {
  if (!t) return "Tutor";
  return t.display_name || t.full_name || t.email || "Tutor";
}

function formatHoursLabel(val?: number | null) {
  if (val === null || val === undefined) return "—";
  const n = Number(val);
  if (!Number.isFinite(n)) return "—";
  return Number.isInteger(n) ? `${n}h` : `${n.toFixed(1)}h`;
}

function formatEuro(val?: number | null) {
  if (val === null || val === undefined) return "€—";
  const n = Number(val);
  if (!Number.isFinite(n)) return "€—";
  return `€${n.toFixed(2)}`;
}

async function buildHeaders() {
  const headers: Record<string, string> = {};
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth.currentUser?.getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch (err) {
    console.warn("[admin/whatsapp] missing firebase token", err);
  }
  return headers;
}

function TutorRow({
  tutor,
  buildHeaders,
  onUpdated,
  onDeleted,
  setTutorsLoading,
  setTutorError,
}: {
  tutor: TutorMeta;
  buildHeaders: () => Promise<Record<string, string>>;
  onUpdated: (t: TutorMeta) => void;
  onDeleted: (id: string) => void;
  setTutorsLoading: (v: boolean) => void;
  setTutorError: (v: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [hoursDraft, setHoursDraft] = useState<string>(tutor.hoursDue != null ? String(tutor.hoursDue) : "");
  const [hoursSaving, setHoursSaving] = useState(false);
  const totalAmountDue = useMemo(() => {
    const list = tutor.students || [];
    return list.reduce((sum, s) => {
      const rate = Number(s.hourlyRate ?? 0);
      const consumed = Number(s.hoursConsumed ?? 0);
      if (!Number.isFinite(rate) || !Number.isFinite(consumed)) return sum;
      return sum + rate * consumed;
    }, 0);
  }, [tutor.students]);

  useEffect(() => {
    setHoursDraft(tutor.hoursDue != null ? String(tutor.hoursDue) : "");
  }, [tutor.hoursDue]);

  const updateHoursDue = async (next: number) => {
    setHoursSaving(true);
    setTutorsLoading(true);
    setTutorError(null);
    try {
      const headers = await buildHeaders();
      headers["Content-Type"] = "application/json";
      const res = await fetch("/api/admin/tutors", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ id: tutor.id, hoursDue: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      onUpdated(data.tutor);
      setHoursDraft(String(next));
    } catch (err: any) {
      setTutorError(err?.message || "Errore update ore tutor");
    } finally {
      setHoursSaving(false);
      setTutorsLoading(false);
    }
  };

  const handleSaveHours = async () => {
    const parsed = Number((hoursDraft || "").toString().replace(",", "."));
    if (!Number.isFinite(parsed)) {
      setTutorError("Inserisci ore valide");
      return;
    }
    await updateHoursDue(parsed);
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
      {editing ? (
        <TutorEditForm
          tutor={tutor}
          onCancel={() => setEditing(false)}
          onSave={async (patch) => {
            setTutorsLoading(true);
            setTutorError(null);
            try {
              const headers = await buildHeaders();
              headers["Content-Type"] = "application/json";
              const res = await fetch("/api/admin/tutors", {
                method: "PATCH",
                headers,
                body: JSON.stringify(patch),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
              onUpdated(data.tutor);
              setEditing(false);
            } catch (err: any) {
              setTutorError(err?.message || "Errore aggiornamento tutor");
            } finally {
              setTutorsLoading(false);
            }
          }}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-semibold">{tutorLabel(tutor)}</p>
              <p className="text-xs text-slate-300">{tutor.email || "email n/d"}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(true)}
                className="text-xs rounded-lg border border-white/20 px-2 py-1 text-slate-100 hover:border-white/40"
              >
                Modifica
              </button>
              <button
                onClick={async () => {
                  if (!window.confirm("Rimuovere questo tutor?")) return;
                  setTutorsLoading(true);
                  try {
                    const headers = await buildHeaders();
                    headers["Content-Type"] = "application/json";
                    const res = await fetch("/api/admin/tutors", {
                      method: "DELETE",
                      headers,
                      body: JSON.stringify({ id: tutor.id }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
                    onDeleted(tutor.id);
                  } catch (err: any) {
                    setTutorError(err?.message || "Errore eliminazione tutor");
                  } finally {
                    setTutorsLoading(false);
                  }
                }}
                className="text-xs rounded-lg border border-red-400/60 px-2 py-1 text-red-200 hover:border-red-300"
              >
                Rimuovi
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-100">
                Ore da pagare: {formatHoursLabel(tutor.hoursDue)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 font-semibold text-slate-100">
                Saldo (ore×tariffa): {formatEuro(totalAmountDue)}
              </span>
              <button
                onClick={() => updateHoursDue(0)}
                disabled={hoursSaving}
                className="rounded-lg border border-white/20 px-2 py-1 text-[11px] font-semibold text-white hover:border-emerald-300 disabled:opacity-60"
              >
                Azzera
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={hoursDraft}
                onChange={(e) => setHoursDraft(e.target.value)}
                placeholder="Ore dovute"
                className="w-28 rounded-lg border border-white/15 bg-slate-900/70 px-2 py-1 text-xs text-white placeholder:text-slate-500"
                type="number"
                step="0.5"
              />
              <button
                onClick={handleSaveHours}
                disabled={hoursSaving}
                className="rounded-lg bg-emerald-500 text-slate-900 px-3 py-1 text-xs font-semibold hover:bg-emerald-400 disabled:opacity-60"
              >
                {hoursSaving ? "Salvo..." : "Aggiorna ore dovute"}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-900/60 px-2 py-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.15em] text-slate-400">
                Studenti assegnati
              </p>
              <span className="text-[11px] text-slate-300">{tutor.students?.length || 0}</span>
            </div>
            {tutor.students && tutor.students.length > 0 ? (
              <div className="mt-2 grid gap-2">
                {tutor.students.slice(0, 8).map((s) => (
                  <div
                    key={s.id}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{s.name}</p>
                      <span className="text-[11px] text-emerald-200">
                        Rimaste: {formatHoursLabel(s.remainingPaid)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {s.email || "Email n/d"}
                      {s.phone ? ` • ${s.phone}` : ""}
                    </p>
                    <p className="text-[11px] text-slate-300">
                      Tariffa: {s.hourlyRate != null ? `${s.hourlyRate} €/h` : "n/d"}
                    </p>
                    {Number(s.hoursConsumed ?? 0) > 0 && s.hourlyRate != null ? (
                      <p className="text-[11px] text-emerald-200">
                        Saldo stimato: {formatEuro(Number(s.hourlyRate) * Number(s.hoursConsumed))}
                      </p>
                    ) : null}
                  </div>
                ))}
                {tutor.students.length > 8 && (
                  <p className="text-[11px] text-slate-400">
                    +{tutor.students.length - 8} altri studenti
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">Nessuno studente collegato.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TutorEditForm({
  tutor,
  onSave,
  onCancel,
}: {
  tutor: TutorMeta & { full_name?: string | null; phone?: string | null; notes?: string | null; bio?: string | null };
  onSave: (patch: { id: string; displayName?: string; fullName?: string; email?: string; phone?: string; notes?: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [displayName, setDisplayName] = useState(tutor.display_name || "");
  const [fullName, setFullName] = useState((tutor as any).full_name || tutor.display_name || "");
  const [email, setEmail] = useState(tutor.email || "");
  const [phone, setPhone] = useState((tutor as any).phone || "");
  const [notes, setNotes] = useState((tutor as any).notes || (tutor as any).bio || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: tutor.id,
        displayName,
        fullName,
        email,
        phone,
        notes,
      });
      onCancel();
    } catch (err: any) {
      setError(err?.message || "Errore salvataggio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white">
      <div className="grid grid-cols-1 gap-2">
        <label className="text-xs text-slate-300">
          Nome visibile
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-white/10 px-2 py-1 text-sm text-white placeholder:text-slate-400 focus:border-sky-400"
            placeholder="Display name"
          />
        </label>
        <label className="text-xs text-slate-300">
          Nome completo
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-white/10 px-2 py-1 text-sm text-white placeholder:text-slate-400 focus:border-sky-400"
            placeholder="Full name"
          />
        </label>
        <label className="text-xs text-slate-300">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-white/10 px-2 py-1 text-sm text-white placeholder:text-slate-400 focus:border-sky-400"
            placeholder="email@dominio.it"
            required
          />
        </label>
        <label className="text-xs text-slate-300">
          Telefono
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-white/10 px-2 py-1 text-sm text-white placeholder:text-slate-400 focus:border-sky-400"
            placeholder="+39..."
          />
        </label>
        <label className="text-xs text-slate-300">
          Note interne
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-white/10 px-2 py-1 text-sm text-white placeholder:text-slate-400 focus:border-sky-400"
            rows={3}
            placeholder="Note o info sul tutor"
          />
        </label>
      </div>
      {error ? <p className="text-xs text-amber-300">{error}</p> : null}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-400 disabled:opacity-60"
        >
          {saving ? "Salvo..." : "Salva"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:border-white/40 disabled:opacity-60"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}

type DetailResponse = {
  conversation: ConversationItem;
  messages: Message[];
};

const statusStyles: Record<string, string> = {
  bot: "bg-sky-500/15 text-sky-100 border-sky-400/40",
  tutor: "bg-indigo-500/15 text-indigo-100 border-indigo-400/40",
  waiting_tutor: "bg-amber-400/20 text-amber-100 border-amber-300/40",
  default: "bg-slate-800/60 text-slate-100 border-slate-700/70",
};

const riskStyles: Record<string, string> = {
  red: "bg-rose-500/20 text-rose-100",
  yellow: "bg-amber-400/20 text-amber-100",
  green: "bg-sky-500/20 text-sky-100",
};

const allowedEmail = "luigi.miraglia006@gmail.com";
const botOptions = ["black", "sales", "prospect", "mentor", "altro"];

export default function WhatsAppAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [list, setList] = useState<ConversationItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [polling, setPolling] = useState(false);
  const [mediaToken, setMediaToken] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const [loadingToContact, setLoadingToContact] = useState(false);
  const [showToContact, setShowToContact] = useState(false);
  const [toContact, setToContact] = useState<{ stale: any[]; recentNoContact: any[] }>({
    stale: [],
    recentNoContact: [],
  });
  const [openProfileAfterPanel, setOpenProfileAfterPanel] = useState(false);
  const [showBookings, setShowBookings] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingMeta, setBookingMeta] = useState<{ callTypes: CallTypeMeta[]; tutors: TutorMeta[] }>(
    { callTypes: [], tutors: [] },
  );
  const [selectedTutorId, setSelectedTutorId] = useState<string>("all");
  const [tutorList, setTutorList] = useState<TutorMeta[]>([]);
  const [tutorsLoading, setTutorsLoading] = useState(false);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const [showTutorPanel, setShowTutorPanel] = useState(false);
  const [showAddTutorForm, setShowAddTutorForm] = useState(false);
  const [showAssignTutorForm, setShowAssignTutorForm] = useState(false);
  const [assignmentTutorId, setAssignmentTutorId] = useState<string>("");
  const [assignmentName, setAssignmentName] = useState("");
  const [assignmentEmail, setAssignmentEmail] = useState("");
  const [assignmentPhone, setAssignmentPhone] = useState("");
  const [assigningStudent, setAssigningStudent] = useState(false);
  const [assignStudentMsg, setAssignStudentMsg] = useState<string | null>(null);
  const [showStudentPanel, setShowStudentPanel] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [students, setStudents] = useState<
    Array<{
      id: string;
      name: string;
      email?: string | null;
      phone?: string | null;
      tutorId?: string | null;
      tutorName?: string | null;
      remainingPaid?: number;
      hoursPaid?: number;
      hoursConsumed?: number;
      hourlyRate?: number | null;
      isBlack?: boolean;
    }>
  >([]);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [hoursInput, setHoursInput] = useState<Record<string, string>>({});
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentDrafts, setStudentDrafts] = useState<
    Record<
      string,
      {
        name: string;
        email: string;
        phone: string;
        tutorId: string;
        hoursPaid?: string;
        hoursConsumed?: string;
        hourlyRate?: string;
      }
    >
  >({});
  const [bookingDraft, setBookingDraft] = useState<BookingDraft>(() => ({
    id: null,
    fullName: "",
    email: "",
    note: "",
    date: new Date().toISOString().slice(0, 10),
    time: "10:00",
    callTypeSlug: "onboarding",
    tutorId: "",
    durationMin: "60",
    status: "confirmed",
  }));
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingActionError, setBookingActionError] = useState<string | null>(null);
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
  const [bookingMonth, setBookingMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAccess = useMemo(
    () => Boolean(user?.email && user.email.toLowerCase() === allowedEmail),
    [user?.email]
  );

  const fetchStudents = useCallback(async () => {
    setStudentsLoading(true);
    setStudentError(null);
    try {
      const headers = await buildHeaders();
      const res = await fetch("/api/admin/students", { headers, cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const list = Array.isArray(data?.students) ? data.students : [];
      setStudents(list);
    } catch (err: any) {
      setStudentError(err?.message || "Errore caricamento studenti");
      console.error(err);
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  const handleAddHours = useCallback(
    async (studentId: string) => {
      const raw = hoursInput[studentId] || "";
      const hours = Number(raw.replace(",", "."));
      if (!Number.isFinite(hours) || hours <= 0) {
        setStudentError("Inserisci ore valide");
        return;
      }
      setStudentError(null);
      setStudentsLoading(true);
      try {
        const headers = await buildHeaders();
        headers["Content-Type"] = "application/json";
        const res = await fetch("/api/admin/students", {
          method: "POST",
          headers,
          body: JSON.stringify({ studentId, hours }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        setStudents((prev) =>
          prev.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  hoursPaid: data.hoursPaid ?? s.hoursPaid,
                  remainingPaid: data.remainingPaid ?? s.remainingPaid,
                }
              : s
          )
        );
        setHoursInput((prev) => ({ ...prev, [studentId]: "" }));
      } catch (err: any) {
        setStudentError(err?.message || "Errore aggiunta ore");
      } finally {
        setStudentsLoading(false);
      }
    },
    [hoursInput],
  );

  const handleEditStudent = useCallback(
    (student: { id: string; name?: string | null; email?: string | null; phone?: string | null; tutorId?: string | null }) => {
      setStudentError(null);
      setEditingStudentId(student.id);
      setStudentDrafts((prev) => ({
        ...prev,
        [student.id]: {
          name: student.name || "",
          email: student.email || "",
          phone: student.phone || "",
          tutorId: student.tutorId || tutorList[0]?.id || "",
          hoursPaid: students.find((s) => s.id === student.id)?.hoursPaid != null ? String(students.find((s) => s.id === student.id)?.hoursPaid) : "",
          hoursConsumed:
            students.find((s) => s.id === student.id)?.hoursConsumed != null
              ? String(students.find((s) => s.id === student.id)?.hoursConsumed)
              : "",
          hourlyRate:
            students.find((s) => s.id === student.id)?.hourlyRate != null
              ? String(students.find((s) => s.id === student.id)?.hourlyRate)
              : "",
        },
      }));
    },
    [tutorList, students],
  );

  const handleSaveStudent = useCallback(
    async (studentId: string) => {
      const draft = studentDrafts[studentId];
      if (!draft) return;
      setStudentsLoading(true);
      setStudentError(null);
      try {
        const headers = await buildHeaders();
        headers["Content-Type"] = "application/json";
        const hoursPaid = draft.hoursPaid !== undefined && draft.hoursPaid !== ""
          ? Number(String(draft.hoursPaid).replace(",", "."))
          : undefined;
        const hoursConsumed = draft.hoursConsumed !== undefined && draft.hoursConsumed !== ""
          ? Number(String(draft.hoursConsumed).replace(",", "."))
          : undefined;
        const hourlyRate = draft.hourlyRate !== undefined && draft.hourlyRate !== ""
          ? Number(String(draft.hourlyRate).replace(",", "."))
          : undefined;
        if ((hoursPaid !== undefined && (Number.isNaN(hoursPaid) || hoursPaid < 0)) || (hoursConsumed !== undefined && (Number.isNaN(hoursConsumed) || hoursConsumed < 0))) {
          setStudentError("Ore non valide");
          setStudentsLoading(false);
          return;
        }
        if (hourlyRate !== undefined && Number.isNaN(hourlyRate)) {
          setStudentError("Tariffa oraria non valida");
          setStudentsLoading(false);
          return;
        }
        const res = await fetch("/api/admin/students", {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            studentId,
            name: draft.name,
            email: draft.email,
            phone: draft.phone,
            tutorId: draft.tutorId || undefined,
            hoursPaid,
            hoursConsumed,
            hourlyRate,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        const updated = data.student;
        if (updated?.id) {
          setStudents((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
        }
        setEditingStudentId(null);
      } catch (err: any) {
        setStudentError(err?.message || "Errore aggiornamento studente");
      } finally {
        setStudentsLoading(false);
      }
    },
    [studentDrafts],
  );

  const fetchBookings = useCallback(
    async (opts?: { tutorId?: string }) => {
      setLoadingBookings(true);
      const targetTutor = opts?.tutorId ?? selectedTutorId;
      try {
        const headers = await buildHeaders();
        const params = new URLSearchParams({ meta: "1" });
        if (targetTutor && targetTutor !== "all") params.set("tutorId", targetTutor);
        const res = await fetch(`/api/admin/bookings?${params.toString()}`, { headers, cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || `HTTP ${res.status}`);
        }
        const tutors = Array.isArray(data.tutors)
          ? data.tutors.map((t: any) => ({
              ...t,
              display_name: t.display_name || t.full_name || t.email || "Tutor",
            }))
          : [];
        const viewerIsAdmin = Boolean(data.viewerIsAdmin);
        let nextTutor =
          targetTutor && targetTutor !== "auto"
            ? targetTutor
            : data.currentTutorId || (viewerIsAdmin ? "all" : tutors?.[0]?.id) || "";
        if (viewerIsAdmin && targetTutor === "all") nextTutor = "all";
        setSelectedTutorId(nextTutor || "all");
        setBookingMeta({
          callTypes: Array.isArray(data.callTypes) ? data.callTypes : [],
          tutors,
        });
        setTutorList(tutors);
        const defaultTutorForForm =
          nextTutor === "all" ? tutors?.[0]?.id || "" : (nextTutor as string);
        setBookingDraft((prev) => ({
          ...prev,
          callTypeSlug: prev.callTypeSlug || data.callTypes?.[0]?.slug || "onboarding",
          tutorId: prev.tutorId || defaultTutorForForm,
        }));
        setBookings(
          Array.isArray(data.bookings)
            ? data.bookings.filter((b: any) => b && b.id)
            : [],
        );
      } catch (err: any) {
        console.error("[admin/whatsapp] bookings error", err);
        setError(err?.message || "Errore prenotazioni");
      } finally {
        setLoadingBookings(false);
      }
    },
    [selectedTutorId],
  );

  const fetchList = useCallback(
    async (opts?: { keepSelection?: boolean; searchOverride?: string }) => {
      setLoadingList(true);
      setError(null);
      try {
        const headers = await buildHeaders();
        const qParam = opts?.searchOverride ?? search;
        const query = qParam ? `?q=${encodeURIComponent(qParam)}` : "";
        const res = await fetch(`/api/admin/whatsapp${query}`, {
          headers,
          cache: "no-store",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          const detail = data?.error || data?.detail;
          throw new Error(`HTTP ${res.status}${detail ? ` — ${detail}` : ""}`);
        }
        const data = await res.json();
        const conversations = data.conversations || [];
        setList(conversations);
        if (!opts?.keepSelection && conversations.length) {
          setSelected(conversations[0]?.phoneTail || null);
        }
        return conversations;
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Errore caricamento conversazioni");
      } finally {
        setLoadingList(false);
      }
    },
    [search]
  );

  const fetchDetail = useCallback(
    async (phoneTail: string | null, opts?: { silent?: boolean }) => {
      if (!phoneTail) {
        setDetail(null);
        return;
      }
      if (!opts?.silent) {
        setLoadingDetail(true);
        setError(null);
      }
      try {
        const headers = await buildHeaders();
        const res = await fetch(`/api/admin/whatsapp/${phoneTail}`, {
          headers,
          cache: "no-store",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          const detail = data?.error || data?.detail;
          throw new Error(`HTTP ${res.status}${detail ? ` — ${detail}` : ""}`);
        }
        const data = (await res.json()) as DetailResponse;
        setDetail(data);
      } catch (err: any) {
        console.error(err);
        if (!opts?.silent) setError(err?.message || "Errore caricamento dettaglio");
      } finally {
        if (!opts?.silent) setLoadingDetail(false);
      }
    },
    []
  );

  const calendarDays = useMemo(() => {
    const days: { date: string; dayNum: number; inMonth: boolean }[] = [];
    const first = new Date(bookingMonth);
    first.setDate(1);
    const startWeekday = (first.getDay() + 6) % 7; // convert Sun=6, Mon=0
    const gridStart = new Date(first);
    gridStart.setDate(1 - startWeekday);
    for (let i = 0; i < 6 * 7; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayNum = d.getDate();
      const date = `${y}-${m}-${String(dayNum).padStart(2, "0")}`;
      days.push({ date, dayNum, inMonth: d.getMonth() === bookingMonth.getMonth() });
    }
    return days;
  }, [bookingMonth]);

  const bookingMap = useMemo(() => {
    const m = new Map<string, Booking[]>();
    bookings.forEach((b) => {
      const day = b.startsAt?.split("T")[0];
      if (!day) return;
      const list = m.get(day) || [];
      list.push(b);
      m.set(day, list);
    });
    return m;
  }, [bookings]);

  const handleProfileUpdate = useCallback(
    async (phoneTail: string, updates: Record<string, any>) => {
      try {
        const headers = await buildHeaders();
        headers["Content-Type"] = "application/json";
        const res = await fetch(`/api/admin/whatsapp/${phoneTail}`, {
          method: "POST",
          headers,
          body: JSON.stringify({ update: updates }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const detail = data?.error || data?.detail;
          throw new Error(detail || `HTTP ${res.status}`);
        }
        await Promise.all([fetchDetail(phoneTail), fetchList({ keepSelection: true })]);
        return null;
      } catch (err: any) {
        console.error(err);
        return err?.message || "Errore salvataggio";
      }
    },
    [fetchDetail, fetchList]
  );

  const handleMarkContact = useCallback(
    async (phoneTail: string) => {
      try {
        const headers = await buildHeaders();
        headers["Content-Type"] = "application/json";
        const res = await fetch(`/api/admin/whatsapp/${phoneTail}`, {
          method: "POST",
          headers,
          body: JSON.stringify({ checked: true }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const detail = data?.error || data?.detail;
          throw new Error(detail || `HTTP ${res.status}`);
        }
        await Promise.all([fetchDetail(phoneTail), fetchList({ keepSelection: true })]);
        return null;
      } catch (err: any) {
        console.error(err);
        return err?.message || "Errore aggiornamento contatto";
      }
    },
    [fetchDetail, fetchList]
  );

  const handleOpenContactFromPanel = useCallback(
    async (rawTail: string | null, opts?: { openProfile?: boolean }) => {
      const digits = (rawTail || "").replace(/\D/g, "");
      const tail = digits.slice(-10) || digits || rawTail;
      if (!tail) return;
      setError(null);
      setLoadingDetail(true);
      try {
        await fetchDetail(tail, { silent: true });
        setSelected(tail);
        await fetchList({ keepSelection: true });
        if (opts?.openProfile) setOpenProfileAfterPanel(true);
        setShowToContact(false);
      } catch (err: any) {
        console.error(err);
        setOpenProfileAfterPanel(false);
        setError(err?.message || "Errore apertura scheda");
      } finally {
        setLoadingDetail(false);
      }
    },
    [fetchDetail, fetchList]
  );

  useEffect(() => {
    if (!hasAccess || authLoading) return;
    fetchList();
  }, [hasAccess, authLoading, fetchList]);

  useEffect(() => {
    let active = true;
    async function refreshMediaToken() {
      try {
        const { auth } = await import("@/lib/firebase");
        const token = await auth.currentUser?.getIdToken();
        if (active) setMediaToken(token || null);
      } catch (err) {
        console.warn("[admin/whatsapp] media token unavailable", err);
        if (active) setMediaToken(null);
      }
    }
    if (hasAccess && !authLoading) {
      refreshMediaToken();
    } else {
      setMediaToken(null);
    }
    return () => {
      active = false;
    };
  }, [hasAccess, authLoading, user?.uid]);

  useEffect(() => {
    if (selected) {
      fetchDetail(selected);
    } else {
      setDetail(null);
    }
  }, [selected, fetchDetail]);

  useEffect(() => {
    if (!openProfileAfterPanel) return;
    if (!detail || detail.conversation.phoneTail !== selected) return;
    if (detail.conversation.student) {
      setShowProfile(true);
    }
    setOpenProfileAfterPanel(false);
  }, [openProfileAfterPanel, detail, detail?.conversation?.phoneTail, selected]);

  useEffect(() => {
    if (!selected) {
      if (pollRef.current) clearInterval(pollRef.current);
      setPolling(false);
      return;
    }
    setPolling(true);
    const id = setInterval(() => {
      fetchDetail(selected, { silent: true });
    }, 5000);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = id;
    return () => {
      clearInterval(id);
      setPolling(false);
    };
  }, [selected, fetchDetail]);

  useEffect(() => {
    if (showBookings && bookings.length === 0 && !loadingBookings) {
      fetchBookings({ tutorId: selectedTutorId });
    }
  }, [showBookings, bookings.length, loadingBookings, fetchBookings, selectedTutorId]);

  const fetchTutors = useCallback(async () => {
    setTutorsLoading(true);
    setTutorError(null);
    try {
      const headers = await buildHeaders();
      const res = await fetch("/api/admin/tutors", { headers, cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const tutors = Array.isArray(data.tutors) ? data.tutors : [];
      setTutorList(tutors);
      if (!assignmentTutorId && tutors[0]?.id) {
        setAssignmentTutorId(tutors[0].id);
      }
    } catch (err: any) {
      console.error("[admin/whatsapp] tutor fetch error", err);
      setTutorError(err?.message || "Errore caricamento tutor");
    } finally {
      setTutorsLoading(false);
    }
  }, [assignmentTutorId]);

  const handleAssignStudentToTutor = useCallback(async () => {
    const targetTutorId = assignmentTutorId || tutorList[0]?.id || "";
    const targetTutor =
      tutorList.find((t) => t.id === targetTutorId) || tutorList[0] || null;
    if (
      !targetTutorId ||
      (!assignmentEmail.trim() && !assignmentPhone.trim())
    ) {
      setAssignStudentMsg("Inserisci nome, email o telefono e seleziona un tutor");
      return;
    }
    if (targetTutor && !targetTutor.email) {
      setAssignStudentMsg("Completa l'email del tutor per vederlo in Studenti assegnati.");
      return;
    }
    setAssigningStudent(true);
    setAssignStudentMsg(null);
    setTutorError(null);
    try {
      const headers = await buildHeaders();
      headers["Content-Type"] = "application/json";
      const res = await fetch("/api/admin/tutor-assignments", {
        method: "POST",
        headers,
        body: JSON.stringify({
          tutorId: targetTutorId,
          studentEmail: assignmentEmail.trim() || undefined,
          studentPhone: assignmentPhone.trim() || undefined,
          studentName: assignmentName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setAssignStudentMsg("Studente assegnato con successo");
      setAssignmentEmail("");
      setAssignmentPhone("");
      setAssignmentName("");
    } catch (err: any) {
      console.error("[admin/whatsapp] assign student error", err);
      setAssignStudentMsg(err?.message || "Errore assegnazione studente");
    } finally {
      setAssigningStudent(false);
    }
  }, [assignmentTutorId, assignmentEmail, assignmentName, assignmentPhone, tutorList]);

  const handleSend = async (statusOverride?: string) => {
    if (!selected || !draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      const headers = await buildHeaders();
      headers["Content-Type"] = "application/json";
      const res = await fetch(`/api/admin/whatsapp/${selected}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: draft.trim(),
          status: statusOverride || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = data?.error || data?.detail;
        throw new Error(detail || `HTTP ${res.status}`);
      }
      setDraft("");
      await Promise.all([fetchDetail(selected), fetchList({ keepSelection: true })]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Errore invio");
    } finally {
      setSending(false);
    }
  };

  const formatDateLabel = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("it-IT", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  };

  const openBookingEditor = (booking?: Booking | null) => {
    const { date, time } = isoToLocalParts(booking?.startsAt);
    const fallbackDate =
      date || new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    const fallbackTime = time || "10:00";
    const callTypeSlug =
      booking?.callType ||
      bookingDraft.callTypeSlug ||
      bookingMeta.callTypes[0]?.slug ||
      "onboarding";
    const tutorId =
      booking?.tutorId ||
      bookingDraft.tutorId ||
      (selectedTutorId !== "all" ? selectedTutorId : "") ||
      bookingMeta.tutors[0]?.id ||
      "";
    setBookingDraft({
      id: booking?.id || null,
      fullName: booking?.fullName || "",
      email: booking?.email || "",
      note: booking?.note || "",
      date: fallbackDate,
      time: fallbackTime,
      callTypeSlug,
      tutorId,
      durationMin: booking?.durationMin ? String(booking.durationMin) : "60",
      status: booking?.status === "cancelled" ? "cancelled" : "confirmed",
    });
    setBookingActionError(null);
    setShowBookingForm(true);
  };

  const handleBookingSave = async () => {
    const startsAtIso = localPartsToIso(bookingDraft.date, bookingDraft.time);
    if (!startsAtIso) {
      setBookingActionError("Data/ora non valida");
      return;
    }
    const safeCallType =
      bookingDraft.callTypeSlug || bookingMeta.callTypes[0]?.slug || "onboarding";
    const safeTutorId =
      bookingDraft.tutorId ||
      (selectedTutorId !== "all" ? selectedTutorId : "") ||
      bookingMeta.tutors[0]?.id ||
      null;
    setBookingSaving(true);
    setBookingActionError(null);
    try {
      const headers = await buildHeaders();
      headers["Content-Type"] = "application/json";
      const payload: Record<string, any> = {
        startsAt: startsAtIso,
        callTypeSlug: safeCallType,
        tutorId: safeTutorId || undefined,
        fullName: bookingDraft.fullName,
        email: bookingDraft.email,
        note: bookingDraft.note,
        durationMin: bookingDraft.durationMin ? Number(bookingDraft.durationMin) : 60,
        status: bookingDraft.status,
      };
      const method = bookingDraft.id ? "PATCH" : "POST";
      if (bookingDraft.id) payload.id = bookingDraft.id;
      const res = await fetch("/api/admin/bookings", {
        method,
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      if (!data.booking || !data.booking.id) {
        // Risposta vuota o inconsistente: ricaria la lista e chiudi
        await fetchBookings();
        setShowBookingForm(false);
        return;
      }
      if (data.booking) {
        setBookings((prev) => {
          const list = prev.filter((b) => b && b.id && b.id !== data.booking.id);
          list.push(data.booking);
          return list;
        });
      }
      await fetchBookings();
      setShowBookingForm(false);
    } catch (err: any) {
      console.error("[admin/whatsapp] booking save", err);
      setBookingActionError(err?.message || "Errore salvataggio booking");
    } finally {
      setBookingSaving(false);
    }
  };

  const handleBookingDelete = async (id: string) => {
    if (!id) return;
    const confirmed = typeof window !== "undefined" ? window.confirm("Eliminare la prenotazione?") : true;
    if (!confirmed) return;
    setDeletingBookingId(id);
    setBookingActionError(null);
    try {
      const headers = await buildHeaders();
      headers["Content-Type"] = "application/json";
      const res = await fetch("/api/admin/bookings", {
        method: "DELETE",
        headers,
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
    setBookings((prev) => prev.filter((b) => b && b.id && b.id !== id));
      if (bookingDraft.id === id) {
        setShowBookingForm(false);
      }
    } catch (err: any) {
      console.error("[admin/whatsapp] booking delete", err);
      setBookingActionError(err?.message || "Errore eliminazione booking");
    } finally {
      setDeletingBookingId(null);
    }
  };

  const handleGenerateDraft = async (message: Message) => {
    if (!selected || !message.content) return;
    setGeneratingId(message.id || message.created_at);
    setError(null);
    try {
      const headers = await buildHeaders();
      headers["Content-Type"] = "application/json";
      const res = await fetch("/api/admin/whatsapp/ai", {
        method: "POST",
        headers,
        body: JSON.stringify({ phoneTail: selected, message: message.content, meta: message.meta }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (typeof data?.reply === "string") {
        setDraft(data.reply);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Errore generazione AI");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleLinkEmail = async () => {
    if (!selected || !linkEmail.trim()) return;
    setLinking(true);
    setError(null);
    try {
      const headers = await buildHeaders();
      headers["Content-Type"] = "application/json";
      const res = await fetch(`/api/admin/whatsapp/${selected}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ linkEmail: linkEmail.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setLinkEmail("");
      await Promise.all([fetchDetail(selected), fetchList({ keepSelection: true })]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Errore link email");
    } finally {
      setLinking(false);
    }
  };

  const handleStatusChange = async (next: string) => {
    if (!selected) return;
    setSending(true);
    setError(null);
    try {
      const headers = await buildHeaders();
      headers["Content-Type"] = "application/json";
      const res = await fetch(`/api/admin/whatsapp/${selected}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = data?.error || data?.detail;
        throw new Error(detail || `HTTP ${res.status}`);
      }
      await Promise.all([fetchDetail(selected), fetchList({ keepSelection: true })]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Errore aggiornamento stato");
    } finally {
      setSending(false);
    }
  };

  const handleBotChange = async (bot: string) => {
    if (!selected) return;
    setSending(true);
    setError(null);
    try {
      const headers = await buildHeaders();
      headers["Content-Type"] = "application/json";
      const res = await fetch(`/api/admin/whatsapp/${selected}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ bot }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = data?.error || data?.detail;
        throw new Error(detail || `HTTP ${res.status}`);
      }
      await Promise.all([fetchDetail(selected), fetchList({ keepSelection: true })]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Errore aggiornamento bot");
    } finally {
      setSending(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-400 border-t-transparent" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 max-w-md shadow-2xl">
          <p className="text-sm uppercase tracking-[0.25em] text-amber-400 mb-3">Accesso</p>
          <h1 className="text-2xl font-semibold mb-2">Solo per Luigi</h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Effettua login con l&apos;email autorizzata per aprire la console WhatsApp.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Internaccia</p>
            <h1 className="text-2xl font-semibold text-slate-50">WhatsApp Desk</h1>
            <p className="text-sm text-slate-400">
              Conversazioni live, stato e scheda cliente. Aggiorna con cautela.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={() => {
                setShowBookings(true);
                fetchBookings();
              }}
              className="px-3 py-2 rounded-lg bg-indigo-500 text-slate-900 text-sm font-semibold border border-indigo-400 hover:border-indigo-200 transition inline-flex items-center gap-2"
            >
              Calendario prenotazioni
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
            <button
              onClick={async () => {
                setShowToContact(true);
                setLoadingToContact(true);
                try {
                  const headers = await buildHeaders();
                  const res = await fetch("/api/admin/whatsapp?toContact=1", {
                    headers,
                    cache: "no-store",
                  });
                  const data = await res.json();
                  setToContact({
                    stale: Array.isArray(data?.stale) ? data.stale : [],
                    recentNoContact: Array.isArray(data?.recentNoContact) ? data.recentNoContact : [],
                  });
                } catch (err) {
                  console.error(err);
                  setError("Errore caricamento da contattare");
                } finally {
                  setLoadingToContact(false);
                }
              }}
              className="px-3 py-2 rounded-lg bg-emerald-500 text-slate-900 text-sm font-semibold border border-emerald-400 hover:border-emerald-200 transition inline-flex items-center gap-2"
            >
              <ListFilter className="h-4 w-4" aria-hidden />
              Da contattare
            </button>
            <button
              onClick={() => {
                setShowTutorPanel(true);
                fetchTutors();
              }}
              className="px-3 py-2 rounded-lg bg-gradient-to-r from-purple-400 via-fuchsia-500 to-pink-500 text-slate-950 text-sm font-semibold border border-white/10 shadow-[0_10px_40px_rgba(236,72,153,0.35)] hover:shadow-[0_12px_48px_rgba(232,121,249,0.35)] transition inline-flex items-center gap-2"
            >
              Gestisci tutor
            </button>
            <button
              onClick={() => {
                setShowStudentPanel(true);
                fetchTutors();
                fetchStudents();
              }}
              className="px-3 py-2 rounded-lg bg-gradient-to-r from-slate-200 to-white text-slate-900 text-sm font-semibold border border-slate-300 hover:border-emerald-400 transition inline-flex items-center gap-2"
            >
              Studenti
            </button>
            <button
              onClick={() => setPolling((prev) => !prev)}
              className={clsx(
                "px-3 py-2 rounded-lg border text-sm font-semibold transition shadow-sm",
                polling
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-300"
                  : "bg-white text-slate-900 border-slate-200 hover:border-emerald-300"
              )}
            >
              {polling ? "Live ON" : "Live OFF"}
            </button>
            <button
              onClick={() => fetchList({ keepSelection: true })}
              className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm border border-slate-900 hover:bg-slate-800 transition shadow-sm"
              disabled={loadingList}
            >
              {loadingList ? "Aggiorno..." : "Refresh"}
            </button>
            <a
              href="/admin/black-followups"
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-900 shadow-sm hover:border-emerald-300 inline-flex items-center gap-2"
            >
              <ListFilter size={16} />
              Black follow-up
            </a>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-100 px-4 py-2">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <aside className="lg:col-span-1 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800">
              <div className="relative">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") fetchList();
                  }}
                  placeholder="Cerca numero o coda"
                  className="w-full rounded-xl bg-slate-800/70 border border-slate-700 text-slate-100 px-4 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
                />
                <button
                  onClick={() => fetchList()}
                  className="absolute right-2 top-1.5 text-xs text-emerald-300"
                >
                  Vai
                </button>
                <a
                  href="/admin/leads"
                  className="absolute -right-1 -bottom-10 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-100 shadow hover:border-emerald-400/60 hover:text-emerald-200"
                >
                  <MessageCircle size={14} />
                  Leads manuali
                </a>
              </div>
            </div>

            <div className="overflow-y-auto h-[70vh] divide-y divide-slate-800">
              {loadingList && (
                <div className="p-4 text-sm text-slate-400">Carico conversazioni...</div>
              )}
              {!loadingList && list.length === 0 && (
                <div className="p-4 text-sm text-slate-400">Nessuna conversazione</div>
              )}
              {list.map((item) => (
                <button
                  key={item.phoneTail || item.id}
                  onClick={() => setSelected(item.phoneTail || null)}
                  className={clsx(
                    "w-full text-left p-4 hover:bg-slate-800/50 transition",
                    selected === item.phoneTail ? "bg-slate-800/70" : ""
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-100 font-medium">
                          {item.phoneTail || "??"}
                        </span>
                        {item.status && (
                          <span
                            className={clsx(
                              "text-[11px] px-2 py-0.5 rounded-full border",
                              statusStyles[item.status] || statusStyles.default
                            )}
                          >
                            {item.status}
                          </span>
                        )}
                      </div>
                      {item.student?.name && (
                        <p className="text-xs text-emerald-200 mt-1">{item.student.name}</p>
                      )}
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {item.lastMessagePreview || "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-500">
                        {formatRelative(item.updatedAt || item.lastMessageAt)}
                      </p>
                      {item.student?.planLabel && (
                        <p className="text-[11px] text-indigo-200 mt-1">
                          {item.student.planLabel}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl min-h-[70vh] flex flex-col">
            {loadingDetail && (
              <div className="flex-1 flex items-center justify-center text-slate-300">
                Carico dettaglio...
              </div>
            )}
            {!loadingDetail && !detail && (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                Seleziona una conversazione
              </div>
            )}
            {!loadingDetail && detail && (
              <>
                <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
                      {detail.conversation.type || "black"}
                    </p>
                    <h2 className="text-xl font-semibold text-slate-50">
                      {detail.conversation.phoneTail}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {detail.conversation.status && (
                        <span
                          className={clsx(
                            "text-xs px-2 py-1 rounded-full border",
                            statusStyles[detail.conversation.status] || statusStyles.default
                          )}
                        >
                          Stato: {detail.conversation.status}
                        </span>
                      )}
                      {detail.conversation.bot && (
                        <span className="text-xs px-2 py-1 rounded-full border border-slate-700 text-slate-200 bg-slate-800/60">
                          Bot: {detail.conversation.bot}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {detail.conversation.student && (
                      <button
                        onClick={() => setShowProfile(true)}
                        className="text-xs px-3 py-2 rounded-lg border border-indigo-300/60 text-indigo-100 bg-indigo-500/10 hover:border-indigo-200"
                      >
                        Scheda
                      </button>
                    )}
                    <select
                      value={detail.conversation.bot || ""}
                      onChange={(e) => handleBotChange(e.target.value)}
                      className="text-xs px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
                      disabled={sending}
                    >
                      <option value="">Bot?</option>
                      {botOptions.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                    {["bot", "waiting_tutor", "tutor"].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(st)}
                        className={clsx(
                          "text-xs px-3 py-2 rounded-lg border transition",
                          detail.conversation.status === st
                            ? "border-emerald-400 text-emerald-200"
                            : "border-slate-700 text-slate-300 hover:border-emerald-300"
                        )}
                        disabled={sending}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-4 pb-2 flex flex-wrap items-center gap-2 text-sm text-slate-200">
                  <input
                    value={linkEmail}
                    onChange={(e) => setLinkEmail(e.target.value)}
                    placeholder="Email studente/genitore per link"
                    className="rounded-lg bg-slate-800/70 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
                  />
                  <button
                    onClick={handleLinkEmail}
                    disabled={linking || !linkEmail.trim()}
                    className="px-3 py-2 rounded-lg border border-emerald-400 text-emerald-200 bg-emerald-500/10 hover:border-emerald-200 disabled:opacity-60"
                  >
                    {linking ? "Link..." : "Link email a numero"}
                  </button>
                  <span className="text-xs text-slate-500">
                    Collega il numero a uno studente Black tramite email.
                  </span>
                </div>

                {detail.conversation.student && (
                  <div className="border-b border-slate-800 bg-slate-900/70 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-emerald-200">
                          {detail.conversation.student.name || "Studente"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {detail.conversation.student.planLabel || "Black"} ·{" "}
                          {detail.conversation.student.yearClass || "classe?"} ·{" "}
                          {detail.conversation.student.track || "track?"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {detail.conversation.student.studentEmail ||
                            detail.conversation.student.parentEmail ||
                            "Email n/d"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {detail.conversation.student.studentPhone ||
                            detail.conversation.student.parentPhone ||
                            "Telefono n/d"}
                        </p>
                      </div>
                      <div className="text-right">
                        {detail.conversation.student.readiness !== undefined && (
                          <div className="text-sm text-emerald-200">
                            Ready {detail.conversation.student.readiness ?? "—"}
                          </div>
                        )}
                        {detail.conversation.student.risk && (
                          <span
                            className={clsx(
                              "text-[11px] px-2 py-1 rounded-full",
                              riskStyles[detail.conversation.student.risk] ||
                                "bg-slate-800 text-slate-200"
                            )}
                          >
                            {detail.conversation.student.risk}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex-1 max-h-[55vh] overflow-y-auto px-4 py-3 space-y-2 bg-gradient-to-b from-slate-900/30 to-slate-950 flex flex-col-reverse">
                  {detail.messages.length === 0 && (
                    <p className="text-sm text-slate-500">Nessun messaggio salvato.</p>
                  )}
                  {detail.messages
                    .slice()
                    .reverse()
                    .map((m) => {
                      const images: string[] = [];
                      if (typeof m.meta?.image?.id === "string") {
                        const tokenParam = mediaToken
                          ? `&token=${encodeURIComponent(mediaToken)}`
                          : "";
                        images.push(`/api/admin/whatsapp/media?id=${m.meta.image.id}${tokenParam}`);
                      }
                      if (typeof m.content === "string") {
                        images.push(...(m.content.match(/data:image[^ \n]+/g) || []));
                      }
                      const text =
                        typeof m.content === "string"
                          ? m.content.replace(/data:image[^ \n]+/g, "").trim()
                          : "";
                      return (
                        <div
                          key={m.id || m.created_at}
                          className={clsx(
                            "flex",
                            m.role === "assistant" ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={clsx(
                              "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-md space-y-2",
                              m.role === "assistant"
                                ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-50"
                                : "bg-slate-800/80 border border-slate-700 text-slate-100"
                            )}
                          >
                            {text && (
                              <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
                            )}
                            {m.role === "user" && (
                              <button
                                type="button"
                                onClick={() => handleGenerateDraft(m)}
                                className="text-[11px] px-2 py-1 rounded-full border border-slate-600 text-emerald-200 bg-slate-800/60 hover:border-emerald-300 transition"
                                disabled={Boolean(generatingId)}
                              >
                                {generatingId === (m.id || m.created_at) ? "..." : "Suggerisci AI"}
                              </button>
                            )}
                          {images.length > 0 && (
                            <div className="grid grid-cols-1 gap-2">
                              {images.map((src, idx) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  key={`${m.created_at}-${idx}`}
                                  src={src}
                                  alt="media"
                                  className="max-h-60 w-full rounded-xl object-contain border border-slate-700/50 cursor-zoom-in"
                                    onClick={() => setPreviewImage(src)}
                                  />
                                ))}
                              </div>
                            )}
                            <p className="text-[10px] text-slate-400 mt-1 text-right">
                              {formatAbsolute(m.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-900/80">
                  <div className="mb-3 flex items-center gap-2">
                    <p className="text-xs text-slate-400">Intervieni su WhatsApp</p>
                    <span className="text-[11px] text-slate-500">
                      Lo stato passa automaticamente a tutor al send.
                    </span>
                  </div>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={3}
                    placeholder="Scrivi risposta breve..."
                    className="w-full rounded-xl bg-slate-800/70 border border-slate-700 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex gap-2">
                      {["tutor", "waiting_tutor", "bot"].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleStatusChange(st)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-emerald-300 transition"
                          disabled={sending}
                          type="button"
                        >
                          Set {st}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => handleSend()}
                      disabled={sending || !draft.trim()}
                      className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-900 font-semibold text-sm shadow-lg shadow-emerald-500/30 disabled:bg-slate-700 disabled:text-slate-400"
                    >
                      {sending ? "Invio..." : "Invia in WA"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {showBookings && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-900/80 backdrop-blur">
          <div className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Calendario</p>
                <h2 className="text-lg font-semibold text-slate-50">
                  Prenotazioni call{" "}
                  {selectedTutorId !== "all" &&
                    tutorLabel(bookingMeta.tutors.find((t) => t.id === selectedTutorId))
                      ? `· ${
                          tutorLabel(bookingMeta.tutors.find((t) => t.id === selectedTutorId))
                        }`
                      : ""}
                </h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <select
                  value={selectedTutorId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSelectedTutorId(next);
                    fetchBookings({ tutorId: next });
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-200 focus:border-sky-400 focus:outline-none"
                >
                  <option value="all">Tutti i tutor</option>
                  {bookingMeta.tutors.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.display_name || "Tutor"}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() =>
                    setBookingMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                  }
                  className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-indigo-400"
                >
                  -1 mese
                </button>
                <button
                  onClick={() =>
                    setBookingMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                  }
                  className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-indigo-400"
                >
                  +1 mese
                </button>
                <button
                  onClick={() => setShowBookings(false)}
                  className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-red-400"
                >
                  Chiudi
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-slate-200">
                    {bookingMonth.toLocaleString("it-IT", { month: "long", year: "numeric" })}
                  </div>
                  {loadingBookings && (
                    <div className="text-xs text-slate-400">Carico prenotazioni...</div>
                  )}
                </div>
                <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">
                  {["L", "M", "M", "G", "V", "S", "D"].map((d) => (
                    <div key={d} className="py-1">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2 text-sm">
                  {calendarDays.map((day) => {
                    const dayBookings = bookingMap.get(day.date) || [];
                    const hasBookings = dayBookings.length > 0;
                    const badgeColor =
                      dayBookings[0]?.callType === "check-percorso"
                        ? "bg-amber-400 text-amber-950"
                        : "bg-emerald-400 text-emerald-950";
                    return (
                      <div
                        key={day.date}
                        className={clsx(
                          "rounded-xl border p-2 min-h-[140px] flex flex-col gap-2",
                          day.inMonth
                            ? "border-slate-800 bg-slate-900/60"
                            : "border-slate-900/50 bg-slate-900/30 text-slate-600"
                        )}
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                          <span>{day.dayNum}</span>
                          {hasBookings && (
                            <span
                              className={clsx(
                                "inline-flex items-center rounded-full px-2 py-[2px] text-[10px] font-bold",
                                badgeColor
                              )}
                            >
                              {dayBookings.length}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {dayBookings.slice(0, 5).map((b) => (
                            <div
                              key={b.id}
                              className="rounded-lg bg-slate-800/70 border border-slate-700 px-2 py-1 text-[11px] text-slate-100"
                            >
                              <div className="font-semibold">
                                {formatTime(b.startsAt)} · {b.callTypeName || b.callType}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {b.fullName}
                              </div>
                            </div>
                          ))}
                          {dayBookings.length > 5 && (
                            <div className="text-[10px] text-slate-500">
                              +{dayBookings.length - 5} altri
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-200">Prossime prenotazioni</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openBookingEditor(null)}
                      className="text-xs rounded-lg border border-emerald-400/70 px-3 py-1.5 font-semibold text-emerald-300 hover:border-emerald-200 hover:text-emerald-100"
                    >
                      Nuova prenotazione
                    </button>
                    <button
                      onClick={() => fetchBookings()}
                      className="text-xs text-indigo-300 hover:text-indigo-200"
                      disabled={loadingBookings}
                    >
                      {loadingBookings ? "Aggiorno..." : "Refresh"}
                    </button>
                  </div>
                </div>
                {bookingActionError && (
                  <div className="rounded-lg border border-amber-400/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    {bookingActionError}
                  </div>
                )}
                {showBookingForm && (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-200">
                        {bookingDraft.id ? "Modifica prenotazione" : "Nuova prenotazione"}
                      </p>
                      <button
                        onClick={() => {
                          setShowBookingForm(false);
                          setBookingDraft((prev) => ({ ...prev, id: null }));
                        }}
                        className="text-[11px] text-slate-400 hover:text-slate-200"
                      >
                        Chiudi
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[11px] uppercase tracking-[0.1em] text-slate-500">
                          Nome
                        </label>
                        <input
                          value={bookingDraft.fullName}
                          onChange={(e) =>
                            setBookingDraft((prev) => ({ ...prev, fullName: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400"
                          placeholder="Nome studente"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] uppercase tracking-[0.1em] text-slate-500">
                          Email
                        </label>
                        <input
                          value={bookingDraft.email}
                          onChange={(e) =>
                            setBookingDraft((prev) => ({ ...prev, email: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400"
                          placeholder="Email studente"
                          type="email"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[11px] uppercase tracking-[0.1em] text-slate-500">
                          Data
                        </label>
                        <input
                          type="date"
                          value={bookingDraft.date}
                          onChange={(e) =>
                            setBookingDraft((prev) => ({ ...prev, date: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] uppercase tracking-[0.1em] text-slate-500">
                          Ora
                        </label>
                        <input
                          type="time"
                          value={bookingDraft.time}
                          onChange={(e) =>
                            setBookingDraft((prev) => ({ ...prev, time: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <label className="text-[11px] uppercase tracking-[0.1em] text-slate-500">
                          Tipo
                        </label>
                        <select
                          value={bookingDraft.callTypeSlug}
                          onChange={(e) =>
                            setBookingDraft((prev) => ({ ...prev, callTypeSlug: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400"
                        >
                          {bookingMeta.callTypes.map((ct) => (
                            <option key={ct.id} value={ct.slug}>
                              {ct.name} ({ct.duration_min}m)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] uppercase tracking-[0.1em] text-slate-500">
                          Tutor
                        </label>
                        <select
                          value={bookingDraft.tutorId}
                          onChange={(e) =>
                            setBookingDraft((prev) => ({ ...prev, tutorId: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400"
                        >
                          {bookingMeta.tutors.map((t) => (
                            <option key={t.id} value={t.id}>
                              {tutorLabel(t)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] uppercase tracking-[0.1em] text-slate-500">
                          Durata (min)
                        </label>
                        <input
                          type="number"
                          value={bookingDraft.durationMin}
                          onChange={(e) =>
                            setBookingDraft((prev) => ({ ...prev, durationMin: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400"
                          placeholder="Es. 30"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-[0.1em] text-slate-500">
                        Note
                      </label>
                      <textarea
                        value={bookingDraft.note}
                        onChange={(e) =>
                          setBookingDraft((prev) => ({ ...prev, note: e.target.value }))
                        }
                        rows={2}
                        className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400"
                        placeholder="Note interne"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 items-center">
                      <div className="space-y-2">
                        <label className="text-[11px] uppercase tracking-[0.1em] text-slate-500">
                          Stato
                        </label>
                        <select
                          value={bookingDraft.status}
                          onChange={(e) =>
                            setBookingDraft((prev) => ({
                              ...prev,
                              status: e.target.value as "confirmed" | "cancelled",
                            }))
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400"
                        >
                          <option value="confirmed">Confermato</option>
                          <option value="cancelled">Cancellato</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        {bookingDraft.id && (
                          <button
                            onClick={() => handleBookingDelete(bookingDraft.id || "")}
                            disabled={bookingSaving || deletingBookingId === bookingDraft.id}
                            className="text-[11px] rounded-lg border border-red-500/70 px-3 py-2 font-semibold text-red-200 hover:border-red-300 disabled:opacity-60"
                            type="button"
                          >
                            {deletingBookingId === bookingDraft.id ? "Elimino..." : "Elimina"}
                          </button>
                        )}
                        <button
                          onClick={() => handleBookingSave()}
                          disabled={bookingSaving}
                          className="text-[11px] rounded-lg border border-emerald-400/80 bg-emerald-500/20 px-3 py-2 font-semibold text-emerald-100 hover:border-emerald-200 disabled:opacity-60"
                          type="button"
                        >
                          {bookingSaving ? "Salvo..." : "Salva"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                  {bookings
                    .slice()
                    .sort((a, b) => (a.startsAt > b.startsAt ? 1 : -1))
                    .map((b, idx) => (
                      <div
                        key={b.id || b.slotId || b.startsAt || `${b.email}-${idx}`}
                        className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold">{b.callTypeName || b.callType}</span>
                          <div className="flex items-center gap-2">
                            <span
                              className={clsx(
                                "rounded-full px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide",
                                b.status === "cancelled"
                                  ? "bg-red-500/20 text-red-200"
                                  : "bg-emerald-500/20 text-emerald-100",
                              )}
                            >
                              {b.status === "cancelled" ? "cancellata" : "confermata"}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {formatDateLabel(b.startsAt)} · {formatTime(b.startsAt)}
                            </span>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {b.fullName} — {b.email}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Tutor: {b.tutorName || tutorLabel(tutorList.find((t) => t.id === b.tutorId))} · {b.durationMin || "—"} min
                        </div>
                        {b.note && (
                          <div className="mt-1 rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-1 text-[11px] text-slate-200">
                            {b.note}
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => openBookingEditor(b)}
                            className="text-[11px] rounded-lg border border-slate-700 px-2 py-1 text-slate-200 hover:border-emerald-300"
                            type="button"
                          >
                            Modifica
                          </button>
                          <button
                            onClick={async () => {
                              setRemindingId(b.id);
                              setBookingActionError(null);
                              try {
                                const headers = await buildHeaders();
                                headers["Content-Type"] = "application/json";
                                const res = await fetch("/api/admin/bookings/remind", {
                                  method: "POST",
                                  headers,
                                  body: JSON.stringify({ id: b.id }),
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
                              } catch (err: any) {
                                console.error("[admin/whatsapp] reminder", err);
                                setBookingActionError(err?.message || "Errore invio reminder");
                              } finally {
                                setRemindingId(null);
                              }
                            }}
                            disabled={remindingId === b.id}
                            className="text-[11px] rounded-lg border border-indigo-500/70 px-2 py-1 text-indigo-200 hover:border-indigo-300 disabled:opacity-60"
                            type="button"
                          >
                            {remindingId === b.id ? "Invio..." : "Reminder mail"}
                          </button>
                          <button
                            onClick={() => handleBookingDelete(b.id)}
                            disabled={deletingBookingId === b.id}
                            className="text-[11px] rounded-lg border border-red-500/70 px-2 py-1 text-red-200 hover:border-red-300 disabled:opacity-60"
                            type="button"
                          >
                            {deletingBookingId === b.id ? "Elimino..." : "Elimina"}
                          </button>
                        </div>
                      </div>
                    ))}
                  {!bookings.length && !loadingBookings && (
                    <div className="text-sm text-slate-500">Nessuna prenotazione trovata.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTutorPanel && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Tutor</p>
                <h3 className="text-lg font-semibold text-white">Gestione tutor</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchTutors}
                  className="rounded-lg border border-white/20 px-3 py-1 text-xs font-semibold text-sky-200 hover:border-sky-400"
                  disabled={tutorsLoading}
                >
                  {tutorsLoading ? "Aggiorno..." : "Refresh"}
                </button>
                <button
                  onClick={() => {
                    setShowTutorPanel(false);
                    setShowAddTutorForm(false);
                    setShowAssignTutorForm(false);
                  }}
                  className="rounded-lg border border-white/15 px-3 py-1 text-xs font-semibold text-white hover:border-sky-400"
                >
                  Chiudi
                </button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <p className="text-sm text-slate-200">Tutor disponibili</p>
                  {tutorError && <p className="text-xs text-amber-400">{tutorError}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowAddTutorForm((v) => !v)}
                    className="rounded-lg bg-sky-500 text-slate-900 px-3 py-1.5 text-xs font-semibold hover:bg-sky-400"
                  >
                    {showAddTutorForm ? "Chiudi aggiunta" : "Aggiungi tutor"}
                  </button>
                  <button
                    onClick={() => setShowAssignTutorForm((v) => !v)}
                    className="rounded-lg bg-emerald-500 text-slate-900 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-400"
                  >
                    {showAssignTutorForm ? "Chiudi assegnazione" : "Assegna studente"}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <div className="space-y-3">
                  <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                    {tutorsLoading && <p className="text-sm text-slate-400">Carico tutor...</p>}
                    {!tutorsLoading && tutorList.length === 0 && (
                      <p className="text-sm text-slate-400">Nessun tutor trovato.</p>
                    )}
                    {tutorList.map((t) => (
                      <TutorRow
                        key={t.id}
                        tutor={t}
                        buildHeaders={buildHeaders}
                        onUpdated={(updated) => {
                          setTutorList((prev) =>
                            prev
                              .map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
                              .sort((a, b) => (a.display_name || a.email || "").localeCompare(b.display_name || b.email || "")),
                          );
                        }}
                        onDeleted={(id) => setTutorList((prev) => prev.filter((x) => x.id !== id))}
                        setTutorsLoading={setTutorsLoading}
                        setTutorError={setTutorError}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {showAddTutorForm && (
                    <AddTutorForm
                      onCreate={async (name, email) => {
                        setTutorsLoading(true);
                        setTutorError(null);
                        try {
                          const headers = await buildHeaders();
                          headers["Content-Type"] = "application/json";
                          const res = await fetch("/api/admin/tutors", {
                            method: "POST",
                            headers,
                            body: JSON.stringify({ displayName: name, email }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
                          setTutorList((prev) =>
                            [...prev, data.tutor].sort((a, b) =>
                              (a.display_name || a.email || "").localeCompare(b.display_name || b.email || ""),
                            ),
                          );
                          setShowAddTutorForm(false);
                        } catch (err: any) {
                          setTutorError(err?.message || "Errore creazione tutor");
                        } finally {
                          setTutorsLoading(false);
                        }
                      }}
                    />
                  )}

                  {showAssignTutorForm && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">Assegna studente a tutor</p>
                        {assignStudentMsg && (
                          <span className="text-[11px] font-semibold text-emerald-200">{assignStudentMsg}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <select
                          value={assignmentTutorId}
                          onChange={(e) => setAssignmentTutorId(e.target.value)}
                          className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                        >
                          {tutorList.map((t) => (
                            <option key={t.id} value={t.id}>
                              {tutorLabel(t)}
                            </option>
                          ))}
                        </select>
                        <input
                          value={assignmentName}
                          onChange={(e) => setAssignmentName(e.target.value)}
                          placeholder="Nome studente"
                          className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                        />
                        <input
                          value={assignmentEmail}
                          onChange={(e) => setAssignmentEmail(e.target.value)}
                          placeholder="Email studente"
                          className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                          type="email"
                        />
                        <input
                          value={assignmentPhone}
                          onChange={(e) => setAssignmentPhone(e.target.value)}
                          placeholder="Telefono (facoltativo)"
                          className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                        />
                        <button
                          onClick={handleAssignStudentToTutor}
                          disabled={assigningStudent || tutorList.length === 0}
                          className="rounded-lg bg-emerald-500 text-slate-900 font-semibold px-3 py-2 text-sm hover:bg-emerald-400 disabled:opacity-60"
                          type="button"
                        >
                          {assigningStudent ? "Assegno..." : "Assegna studente"}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Inserisci email o telefono (anche studenti non Black) e assegna al tutor selezionato.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showStudentPanel && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-slate-900/90 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Studenti</p>
                <h3 className="text-lg font-semibold text-white">Elenco studenti</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchStudents}
                  className="rounded-lg border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:border-emerald-400"
                  disabled={studentsLoading}
                >
                  {studentsLoading ? "Aggiorno..." : "Refresh"}
                </button>
                <button
                  onClick={() => setShowStudentPanel(false)}
                  className="rounded-lg border border-white/15 px-3 py-1 text-xs font-semibold text-white hover:border-emerald-400"
                >
                  Chiudi
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {studentError && (
                <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100">
                  {studentError}
                </div>
              )}
              {studentsLoading ? (
                <div className="text-sm text-slate-300">Carico studenti...</div>
              ) : null}
              {!studentsLoading && students.length === 0 ? (
                <div className="text-sm text-slate-300">Nessuno studente trovato.</div>
              ) : null}
              {!studentsLoading && students.length > 0 ? (
                <div className="grid gap-2 max-h-[70vh] overflow-y-auto pr-1">
                  {students.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white"
                    >
                      {editingStudentId === s.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <input
                              value={studentDrafts[s.id]?.name || ""}
                              onChange={(e) =>
                                setStudentDrafts((prev) => ({
                                  ...prev,
                                  [s.id]: { ...(prev[s.id] || {}), name: e.target.value },
                                }))
                              }
                              placeholder="Nome"
                              className="rounded-lg border border-white/15 bg-slate-900/70 px-2 py-1 text-xs text-white placeholder:text-slate-500"
                            />
                            <input
                              value={studentDrafts[s.id]?.email || ""}
                              onChange={(e) =>
                                setStudentDrafts((prev) => ({
                                  ...prev,
                                  [s.id]: { ...(prev[s.id] || {}), email: e.target.value },
                                }))
                              }
                              placeholder="Email"
                              className="rounded-lg border border-white/15 bg-slate-900/70 px-2 py-1 text-xs text-white placeholder:text-slate-500"
                              type="email"
                            />
                            <input
                              value={studentDrafts[s.id]?.phone || ""}
                              onChange={(e) =>
                                setStudentDrafts((prev) => ({
                                  ...prev,
                                  [s.id]: { ...(prev[s.id] || {}), phone: e.target.value },
                                }))
                              }
                              placeholder="Telefono"
                              className="rounded-lg border border-white/15 bg-slate-900/70 px-2 py-1 text-xs text-white placeholder:text-slate-500"
                            />
                            <select
                              value={studentDrafts[s.id]?.tutorId || ""}
                              onChange={(e) =>
                                setStudentDrafts((prev) => ({
                                  ...prev,
                                  [s.id]: { ...(prev[s.id] || {}), tutorId: e.target.value },
                                }))
                              }
                          className="rounded-lg border border-white/15 bg-slate-900/70 px-2 py-1 text-xs text-white"
                        >
                          {tutorList.map((t) => (
                            <option key={t.id} value={t.id}>
                              {tutorLabel(t)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input
                          value={studentDrafts[s.id]?.hoursPaid || ""}
                          onChange={(e) =>
                            setStudentDrafts((prev) => ({
                              ...prev,
                              [s.id]: { ...(prev[s.id] || {}), hoursPaid: e.target.value },
                            }))
                          }
                          placeholder="Ore pagate"
                          className="rounded-lg border border-white/15 bg-slate-900/70 px-2 py-1 text-xs text-white placeholder:text-slate-500"
                          type="number"
                          step="0.5"
                          min="0"
                        />
                        <input
                          value={studentDrafts[s.id]?.hoursConsumed || ""}
                          onChange={(e) =>
                            setStudentDrafts((prev) => ({
                              ...prev,
                              [s.id]: { ...(prev[s.id] || {}), hoursConsumed: e.target.value },
                            }))
                          }
                          placeholder="Ore consumate"
                          className="rounded-lg border border-white/15 bg-slate-900/70 px-2 py-1 text-xs text-white placeholder:text-slate-500"
                          type="number"
                          step="0.5"
                          min="0"
                        />
                        <input
                          value={studentDrafts[s.id]?.hourlyRate || ""}
                          onChange={(e) =>
                            setStudentDrafts((prev) => ({
                              ...prev,
                              [s.id]: { ...(prev[s.id] || {}), hourlyRate: e.target.value },
                            }))
                          }
                          placeholder="€ / ora"
                          className="rounded-lg border border-white/15 bg-slate-900/70 px-2 py-1 text-xs text-white placeholder:text-slate-500"
                          type="number"
                          step="0.5"
                          min="0"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveStudent(s.id)}
                          disabled={studentsLoading}
                          className="rounded-lg bg-emerald-500 text-slate-900 px-3 py-1 text-[11px] font-semibold hover:bg-emerald-400 disabled:opacity-60"
                            >
                              Salva
                            </button>
                            <button
                              onClick={() => setEditingStudentId(null)}
                              className="rounded-lg border border-white/20 px-3 py-1 text-[11px] font-semibold text-white hover:border-amber-300"
                            >
                              Annulla
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold">
                                {s.name}
                                {s.isBlack ? (
                                  <span className="ml-2 rounded-full bg-indigo-500/20 px-2 py-0.5 text-[11px] font-bold text-indigo-100">
                                    Black
                                  </span>
                                ) : null}
                              </p>
                              <p className="text-[11px] text-slate-300">
                                {s.email || "Email n/d"} {s.phone ? `• ${s.phone}` : ""}
                              </p>
                              <p className="text-[11px] text-slate-300">
                                Tutor: {s.tutorName || "n/d"}
                              </p>
                              <p className="text-[11px] text-slate-300">
                                Ore: {formatHoursLabel(s.hoursPaid)} pagate · {formatHoursLabel(s.hoursConsumed)} consumate
                              </p>
                              <p className="text-[11px] text-slate-300">
                                Tariffa: {s.hourlyRate != null ? `${s.hourlyRate} €/h` : "n/d"}
                              </p>
                              {s.hourlyRate != null && s.hoursConsumed != null ? (
                                <p className="text-[11px] text-emerald-200">
                                  Saldo stimato: {formatEuro(Number(s.hourlyRate) * Number(s.hoursConsumed || 0))}
                                </p>
                              ) : null}
                            </div>
                            <div className="text-right text-xs font-semibold text-emerald-200">
                              Rimaste: {formatHoursLabel(s.remainingPaid || 0)}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <input
                              value={hoursInput[s.id] || ""}
                              onChange={(e) =>
                                setHoursInput((prev) => ({ ...prev, [s.id]: e.target.value }))
                              }
                              placeholder="+ ore"
                              className="w-24 rounded-lg border border-white/15 bg-slate-900/70 px-2 py-1 text-xs text-white placeholder:text-slate-500"
                              type="number"
                              min="0"
                              step="0.5"
                            />
                            <button
                              onClick={() => handleAddHours(s.id)}
                              className="rounded-lg bg-emerald-500 text-slate-900 px-3 py-1 text-[11px] font-semibold hover:bg-emerald-400"
                              disabled={studentsLoading}
                            >
                              Aggiungi ore
                            </button>
                            <button
                              onClick={() => handleEditStudent(s)}
                              className="rounded-lg border border-white/20 px-3 py-1 text-[11px] font-semibold text-white hover:border-emerald-300"
                            >
                              Modifica
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {showToContact && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="mx-auto max-w-5xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
                  Follow-up Black
                </p>
                <h2 className="text-xl font-bold text-white">Da contattare</h2>
              </div>
              <button
                onClick={() => setShowToContact(false)}
                className="text-sm text-slate-300 hover:text-white"
              >
                Chiudi
              </button>
            </div>

            {loadingToContact ? (
              <div className="mt-6 text-sm text-slate-300">Carico lista...</div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-white">Ultimo contatto &gt; 3 giorni</p>
                  {toContact.stale.length === 0 && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
                      Nessuno
                    </div>
                  )}
                  {toContact.stale.map((item) => (
                    <ContactCard
                      key={`${item.id}-stale`}
                      item={item}
                      onOpen={handleOpenContactFromPanel}
                      closePanel={() => setShowToContact(false)}
                    />
                  ))}
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-white">
                    Iscritti &lt; 3 settimane senza contatto
                  </p>
                  {toContact.recentNoContact.length === 0 && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
                      Nessuno
                    </div>
                  )}
                  {toContact.recentNoContact.map((item) => (
                    <ContactCard
                      key={`${item.id}-recent`}
                      item={item}
                      onOpen={handleOpenContactFromPanel}
                      closePanel={() => setShowToContact(false)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showProfile && detail?.conversation.student && (
        <ProfileModal
          student={detail.conversation.student}
          phoneTail={detail.conversation.phoneTail || ""}
          onSave={handleProfileUpdate}
          onMarkContact={handleMarkContact}
          onClose={() => setShowProfile(false)}
        />
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 bg-slate-900 text-slate-100 rounded-full h-10 w-10 shadow-lg border border-slate-700 hover:border-emerald-400"
              aria-label="Chiudi anteprima"
            >
              ×
            </button>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage}
                alt="preview"
                className="w-full max-h-[85vh] object-contain bg-slate-950"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddTutorForm({ onCreate }: { onCreate: (name: string, email: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
      <p className="text-sm font-semibold text-white">Aggiungi tutor</p>
      {error && <p className="text-xs text-amber-300">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome"
          className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder:text-slate-500"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          type="email"
        />
      </div>
      <button
        onClick={async () => {
          if (!name.trim() || !email.trim()) {
            setError("Nome ed email sono obbligatori");
            return;
          }
          setSaving(true);
          setError(null);
          try {
            await onCreate(name.trim(), email.trim());
            setName("");
            setEmail("");
          } catch (err: any) {
            setError(err?.message || "Errore creazione");
          } finally {
            setSaving(false);
          }
        }}
        disabled={saving}
        className="w-full rounded-lg bg-sky-500 text-slate-900 font-semibold px-3 py-2 text-sm hover:bg-sky-400 disabled:opacity-60"
      >
        {saving ? "Creo..." : "Crea tutor"}
      </button>
    </div>
  );
}

function ContactCard({
  item,
  onOpen,
  closePanel,
}: {
  item: any;
  onOpen: (phoneTail: string | null, opts?: { openProfile?: boolean }) => void;
  closePanel: () => void;
}) {
  const phoneTail =
    item.phoneTail || (item.phone || "").replace(/\D/g, "").slice(-10) || null;
  const last =
    item.lastContactedAt &&
    new Date(item.lastContactedAt).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <p className="text-sm font-semibold text-white">{item.name || "—"}</p>
      <p className="text-xs text-slate-300 mt-1">{item.email || "—"}</p>
      <p className="text-xs text-slate-400 mt-1">{item.phone || "—"}</p>
      {item.startDate && (
        <p className="text-[11px] text-slate-500 mt-1">
          Start: {new Date(item.startDate).toLocaleDateString("it-IT")}
        </p>
      )}
      {last && (
        <p className="text-[11px] text-amber-300 mt-1">Ultimo contatto: {last}</p>
      )}
      <button
        type="button"
        disabled={!phoneTail}
        onClick={() => {
          if (!phoneTail) return;
          closePanel();
          onOpen(phoneTail, { openProfile: true });
        }}
        className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition ${
          phoneTail
            ? "bg-emerald-500 text-slate-900 hover:bg-emerald-400"
            : "bg-slate-700 text-slate-400 cursor-not-allowed"
        }`}
      >
        Apri scheda
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function formatRelative(input?: string | null) {
  if (!input) return "—";
  const ts = new Date(input).getTime();
  if (Number.isNaN(ts)) return input;
  const diff = Date.now() - ts;
  if (diff < 60000) return "ora";
  if (diff < 3600000) return `${Math.round(diff / 60000)}m fa`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h fa`;
  return formatAbsolute(input);
}

function formatAbsolute(input?: string | null) {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isoToLocalParts(iso?: string | null) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(
    2,
    "0",
  )}`;
  return { date, time };
}

function localPartsToIso(date: string, time: string) {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function ProfileModal({
  student,
  phoneTail,
  onSave,
  onMarkContact,
  onClose,
}: {
  student: NonNullable<ConversationItem["student"]>;
  phoneTail: string;
  onSave: (phoneTail: string, updates: Record<string, any>) => Promise<string | null>;
  onMarkContact: (phoneTail: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: student.name || "",
    studentPhone: student.studentPhone || "",
    parentPhone: student.parentPhone || "",
    studentEmail: student.studentEmail || "",
    parentEmail: student.parentEmail || "",
    yearClass: student.yearClass || "",
    track: student.track || "",
    goal: student.goal || "",
    difficultyFocus: student.difficultyFocus || "",
    nextAssessmentSubject: student.nextAssessmentSubject || "",
    nextAssessmentDate: student.nextAssessmentDate || "",
  });
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const onChange = (key: keyof typeof form, value: string) => {
    setSuccessMessage(null);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSuccessMessage(null);
    const updates: Record<string, any> = {
      name: form.name,
      studentPhone: form.studentPhone,
      parentPhone: form.parentPhone,
      studentEmail: form.studentEmail,
      parentEmail: form.parentEmail,
      yearClass: form.yearClass,
      track: form.track,
      goal: form.goal,
      difficultyFocus: form.difficultyFocus,
      nextAssessmentSubject: form.nextAssessmentSubject,
      nextAssessmentDate: form.nextAssessmentDate,
    };
    const err = await onSave(phoneTail, updates);
    if (err) {
      setSaveError(err);
    } else {
      setSuccessMessage("Salvato");
    }
    setSaving(false);
  };

  const handleChecked = async () => {
    setChecking(true);
    setSaveError(null);
    setSuccessMessage(null);
    const err = await onMarkContact(phoneTail);
    if (err) {
      setSaveError(err);
    } else {
      setSuccessMessage("Ultimo contatto aggiornato");
    }
    setChecking(false);
  };

  const infoRows = [
    { label: "Stato", value: student.status },
    { label: "Readiness", value: student.readiness != null ? `${student.readiness}` : null },
    { label: "Rischio", value: student.risk },
    { label: "Ultimo contatto", value: student.lastContactedAt },
    { label: "ID studente", value: student.id },
    { label: "Stripe price", value: student.stripePrice },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">Scheda Black</p>
            <h3 className="text-xl font-semibold text-slate-50">{student.name || "Studente"}</h3>
            <div className="flex gap-2 flex-wrap">
              {student.status && (
                <span className="text-xs px-2 py-1 rounded-full border border-slate-700 bg-slate-800 text-slate-200">
                  {student.status}
                </span>
              )}
              {student.track && (
                <span className="text-xs px-2 py-1 rounded-full border border-indigo-500/60 text-indigo-100 bg-indigo-500/10">
                  {student.track}
                </span>
              )}
              {student.yearClass && (
                <span className="text-xs px-2 py-1 rounded-full border border-emerald-400/60 text-emerald-100 bg-emerald-500/10">
                  {student.yearClass}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white rounded-lg px-4 py-2 border border-slate-700 bg-slate-800/70"
          >
            Chiudi
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 max-h-[75vh] overflow-y-auto bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="space-y-4">
            <h4 className="text-sm text-slate-300 font-semibold">Contatti & Meta</h4>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <LabeledField label="Nome" value={form.name} onChange={(v) => onChange("name", v)} />
              <LabeledField
                label="Telefono studente"
                value={form.studentPhone}
                onChange={(v) => onChange("studentPhone", v)}
              />
              <LabeledField
                label="Telefono genitore"
                value={form.parentPhone}
                onChange={(v) => onChange("parentPhone", v)}
              />
              <LabeledField
                label="Email studente"
                value={form.studentEmail}
                onChange={(v) => onChange("studentEmail", v)}
              />
              <LabeledField
                label="Email genitore"
                value={form.parentEmail}
                onChange={(v) => onChange("parentEmail", v)}
              />
              <LabeledField
                label="Classe"
                value={form.yearClass}
                onChange={(v) => onChange("yearClass", v)}
              />
              <LabeledField label="Track" value={form.track} onChange={(v) => onChange("track", v)} />
              <StaticField label="Inizio" value={student.startDate} />
              <StaticField label="Ultimo contatto" value={student.lastContactedAt} />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm text-slate-300 font-semibold">Piano & Note</h4>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <StaticField label="Piano" value={student.planLabel} />
              <LabeledField
                label="Goal"
                value={form.goal}
                onChange={(v) => onChange("goal", v)}
                textarea
              />
              <LabeledField
                label="Focus/Difficoltà"
                value={form.difficultyFocus}
                onChange={(v) => onChange("difficultyFocus", v)}
                textarea
              />
              <LabeledField
                label="Prossima verifica"
                value={form.nextAssessmentSubject}
                onChange={(v) => onChange("nextAssessmentSubject", v)}
              />
              <LabeledField
                label="Data prossima verifica"
                value={form.nextAssessmentDate}
                onChange={(v) => onChange("nextAssessmentDate", v)}
                type="date"
              />
              <StaticField
                label="AI note"
                value={student.aiDescription ? student.aiDescription.slice(0, 500) : null}
              />
              <div className="grid grid-cols-2 gap-2 pt-2">
                {infoRows
                  .filter((r) => r.value)
                  .map((row) => (
                    <div
                      key={row.label}
                      className="rounded-lg bg-slate-800/70 border border-slate-700 px-3 py-2"
                    >
                      <p className="text-[11px] uppercase text-slate-500">{row.label}</p>
                      <p className="text-sm text-slate-100 break-all">{row.value}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/80">
          <div className="text-sm text-slate-400">
            {saveError && <span className="text-amber-300">{saveError}</span>}
            {!saveError && successMessage && (
              <span className="text-emerald-300">{successMessage}</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleChecked}
              disabled={checking}
              className="px-4 py-2 rounded-lg border border-emerald-500/60 text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-60"
            >
              {checking ? "Segno..." : "Checked"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-200 bg-slate-800/70 hover:border-slate-500"
            >
              Chiudi
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-900 font-semibold shadow-lg shadow-emerald-500/30 disabled:bg-slate-700 disabled:text-slate-400"
            >
              {saving ? "Salvo..." : "Salva"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LabeledField({
  label,
  value,
  onChange,
  textarea,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg bg-slate-800/70 border border-slate-700 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg bg-slate-800/70 border border-slate-700 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
        />
      )}
    </label>
  );
}

function StaticField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="text-sm">
      <p className="text-[11px] uppercase text-slate-500">{label}</p>
      <p className="text-slate-100">{value}</p>
    </div>
  );
}
