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

type Booking = {
  id: string;
  startsAt: string;
  durationMin: number | null;
  callType: string | null;
  callTypeName: string | null;
  fullName: string;
  note: string | null;
  status?: string | null;
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
  hasActiveFollowup?: boolean | null;
};

type ResponseData = {
  date: string;
  due: Contact[];
  upcoming: Contact[];
  completed: Contact[];
};

type ScheduleDraft = {
  date: string;
  time: string;
  callType: "onboarding" | "check-percorso";
  note: string;
};

const allowedEmail = "luigi.miraglia006@gmail.com";
const whatsappPrefixes = ["+39", "+41", "+44", "+34", "+33", "+49", "+43"];
const callTypeOptions: Array<{ value: ScheduleDraft["callType"]; label: string }> = [
  { value: "onboarding", label: "Onboarding" },
  { value: "check-percorso", label: "Check-in" },
];
const BLACK_CALL_TYPES = new Set(["onboarding", "check-percorso"]);

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

function formatCallTypeLabel(booking: Booking) {
  if (booking.callTypeName) return booking.callTypeName;
  if (booking.callType === "check-percorso") return "Check-in";
  if (booking.callType === "onboarding") return "Onboarding";
  return "Chiamata";
}

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function localPartsToIso(date: string, time: string) {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
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
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [savingNameId, setSavingNameId] = useState<string | null>(null);
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
  const [phoneDrafts, setPhoneDrafts] = useState<Record<string, string>>({});
  const [savingPhoneId, setSavingPhoneId] = useState<string | null>(null);
  const [scheduleOpenId, setScheduleOpenId] = useState<string | null>(null);
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, ScheduleDraft>>({});
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [pausingId, setPausingId] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [importingNext, setImportingNext] = useState(false);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState<BlackStudent[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<BlackStudent | null>(null);
  const [quickQuery, setQuickQuery] = useState("");
  const [blackBookings, setBlackBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

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

  const fetchBlackBookings = useCallback(async () => {
    if (!hasAccess) return;
    setLoadingBookings(true);
    setBookingError(null);
    try {
      const headers = await buildHeaders();
      const res = await fetch("/api/admin/bookings", {
        headers,
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      const rows = Array.isArray(json.bookings) ? json.bookings : [];
      const normalized: Booking[] = rows
        .filter((row: any) => row && row.id)
        .map((row: any) => ({
          id: row.id,
          startsAt: row.startsAt,
          durationMin: row.durationMin ?? null,
          callType: row.callType ?? null,
          callTypeName: row.callTypeName ?? null,
          fullName: row.fullName || "",
          note: row.note ?? null,
          status: row.status ?? null,
        }))
        .filter((row) => {
          const callType = typeof row.callType === "string" ? row.callType : "";
          return BLACK_CALL_TYPES.has(callType);
        });
      setBlackBookings(normalized);
    } catch (err: any) {
      setBookingError(err?.message || "Errore appuntamenti");
    } finally {
      setLoadingBookings(false);
    }
  }, [hasAccess]);

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

  useEffect(() => {
    if (hasAccess) fetchBlackBookings();
  }, [hasAccess, fetchBlackBookings]);

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
      } else if (contact.status === "dropped") {
        // Restano solo in archivio
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

  const buildDefaultScheduleDraft = useCallback(
    (overrides?: Partial<ScheduleDraft>): ScheduleDraft => ({
      date: selectedDate || toDateInputValue(new Date()),
      time: "10:00",
      callType: "onboarding",
      note: "",
      ...overrides,
    }),
    [selectedDate]
  );

  const toggleSchedule = useCallback(
    (contactId: string, callType?: ScheduleDraft["callType"]) => {
      setScheduleOpenId((prev) => {
        const isOpening = prev !== contactId;
        if (isOpening) {
          setScheduleDrafts((drafts) => {
            const existing = drafts[contactId];
            if (existing) {
              if (callType && existing.callType !== callType) {
                return {
                  ...drafts,
                  [contactId]: { ...existing, callType },
                };
              }
              return drafts;
            }
            return {
              ...drafts,
              [contactId]: buildDefaultScheduleDraft(
                callType ? { callType } : undefined
              ),
            };
          });
        }
        return isOpening ? contactId : null;
      });
    },
    [buildDefaultScheduleDraft]
  );

  const updateScheduleDraft = useCallback(
    (contactId: string, patch: Partial<ScheduleDraft>) => {
      setScheduleDrafts((prev) => {
        const base = prev[contactId] || buildDefaultScheduleDraft();
        return { ...prev, [contactId]: { ...base, ...patch } };
      });
    },
    [buildDefaultScheduleDraft]
  );

  const handleScheduleSave = useCallback(
    async (contact: Contact) => {
      const draft = scheduleDrafts[contact.id] || buildDefaultScheduleDraft();
      if (!draft.date || !draft.time) {
        setError("Seleziona data e orario");
        return;
      }
      const startsAtIso = localPartsToIso(draft.date, draft.time);
      if (!startsAtIso) {
        setError("Data/ora non valida");
        return;
      }
      setSchedulingId(contact.id);
      setError(null);
      try {
        const headers = await buildHeaders();
        headers["Content-Type"] = "application/json";
        const fullName =
          contact.name ||
          contact.student?.preferred_name ||
          contact.student?.student_name ||
          "Senza nome";
        const email =
          contact.student?.student_email ||
          contact.student?.parent_email ||
          "noreply@theoremz.com";
        const note = draft.note.trim() || null;
        const res = await fetch("/api/admin/bookings", {
          method: "POST",
          headers,
          body: JSON.stringify({
            startsAt: startsAtIso,
            callTypeSlug: draft.callType,
            fullName,
            email,
            note,
            studentId: contact.studentId || contact.student?.id || null,
            allowUnpaid: true,
          }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const details = [json?.error, json?.details, json?.code].filter(Boolean).join(" · ");
          throw new Error(details || `HTTP ${res.status}`);
        }
        setScheduleOpenId((prev) => (prev === contact.id ? null : prev));
        setScheduleDrafts((prev) => {
          const next = { ...prev };
          delete next[contact.id];
          return next;
        });
        void fetchBlackBookings();
      } catch (err: any) {
        setError(err?.message || "Errore creazione booking");
      } finally {
        setSchedulingId(null);
      }
    },
    [buildDefaultScheduleDraft, fetchBlackBookings, scheduleDrafts]
  );

  const startNameEdit = useCallback((contact: Contact) => {
    setEditingNameId(contact.id);
    setNameDrafts((prev) => ({
      ...prev,
      [contact.id]: contact.name || "",
    }));
  }, []);

  const cancelNameEdit = useCallback((id: string) => {
    setEditingNameId((prev) => (prev === id ? null : prev));
    setNameDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleNameSave = useCallback(
    async (contact: Contact) => {
      const draft = nameDrafts[contact.id] ?? "";
      const trimmed = draft.trim();
      if (!trimmed) {
        setError("Inserisci un nome valido");
        return;
      }
      const nextName = trimmed;
      if ((contact.name || null) === nextName) {
        cancelNameEdit(contact.id);
        return;
      }
      setSavingNameId(contact.id);
      setError(null);
      try {
        const headers = await buildHeaders();
        headers["Content-Type"] = "application/json";
        const res = await fetch("/api/admin/black-followups", {
          method: "PATCH",
          headers,
          body: JSON.stringify({ id: contact.id, name: nextName }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const details = [json?.error, json?.details, json?.code].filter(Boolean).join(" · ");
          throw new Error(details || `HTTP ${res.status}`);
        }
        if (json?.contact) {
          applyContactUpdate(json.contact);
        } else {
          await fetchContacts();
          await fetchAllContacts();
        }
        cancelNameEdit(contact.id);
      } catch (err: any) {
        setError(err?.message || "Errore aggiornamento nome");
      } finally {
        setSavingNameId(null);
      }
    },
    [applyContactUpdate, cancelNameEdit, fetchAllContacts, fetchContacts, nameDrafts]
  );

  const startPhoneEdit = useCallback((contact: Contact) => {
    setEditingPhoneId(contact.id);
    setPhoneDrafts((prev) => ({
      ...prev,
      [contact.id]: contact.whatsappPhone || "",
    }));
  }, []);

  const cancelPhoneEdit = useCallback((id: string) => {
    setEditingPhoneId((prev) => (prev === id ? null : prev));
    setPhoneDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handlePhoneSave = useCallback(
    async (contact: Contact) => {
      const draft = phoneDrafts[contact.id] ?? "";
      const trimmed = draft.trim();
      if (!trimmed) {
        setError("Inserisci un numero WhatsApp valido");
        return;
      }
      if ((contact.whatsappPhone || null) === trimmed) {
        cancelPhoneEdit(contact.id);
        return;
      }
      setSavingPhoneId(contact.id);
      setError(null);
      try {
        const headers = await buildHeaders();
        headers["Content-Type"] = "application/json";
        const res = await fetch("/api/admin/black-followups", {
          method: "PATCH",
          headers,
          body: JSON.stringify({ id: contact.id, whatsappPhone: trimmed }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const details = [json?.error, json?.details, json?.code].filter(Boolean).join(" · ");
          throw new Error(details || `HTTP ${res.status}`);
        }
        if (json?.contact) {
          applyContactUpdate(json.contact);
        } else {
          await fetchContacts();
          await fetchAllContacts();
        }
        cancelPhoneEdit(contact.id);
      } catch (err: any) {
        setError(err?.message || "Errore aggiornamento numero");
      } finally {
        setSavingPhoneId(null);
      }
    },
    [applyContactUpdate, cancelPhoneEdit, fetchAllContacts, fetchContacts, phoneDrafts]
  );

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

  const handlePause = useCallback(
    async (id: string) => {
      setPausingId(id);
      setError(null);
      try {
        const headers = await buildHeaders();
        headers["Content-Type"] = "application/json";
        const res = await fetch("/api/admin/black-followups", {
          method: "PATCH",
          headers,
          body: JSON.stringify({ id, status: "dropped" }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const details = [json?.error, json?.details, json?.code].filter(Boolean).join(" · ");
          throw new Error(details || `HTTP ${res.status}`);
        }
        if (json?.contact) {
          applyContactUpdate(json.contact);
        } else {
          await fetchContacts();
          await fetchAllContacts();
        }
      } catch (err: any) {
        setError(err?.message || "Errore aggiornamento stato");
      } finally {
        setPausingId(null);
      }
    },
    [applyContactUpdate, fetchAllContacts, fetchContacts]
  );

  const handleResume = useCallback(
    async (id: string) => {
      setResumingId(id);
      setError(null);
      try {
        const headers = await buildHeaders();
        headers["Content-Type"] = "application/json";
        const res = await fetch("/api/admin/black-followups", {
          method: "PATCH",
          headers,
          body: JSON.stringify({ id, status: "active" }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const details = [json?.error, json?.details, json?.code].filter(Boolean).join(" · ");
          throw new Error(details || `HTTP ${res.status}`);
        }
        if (json?.contact) {
          applyContactUpdate(json.contact);
        } else {
          await fetchContacts();
          await fetchAllContacts();
        }
      } catch (err: any) {
        setError(err?.message || "Errore aggiornamento stato");
      } finally {
        setResumingId(null);
      }
    },
    [applyContactUpdate, fetchAllContacts, fetchContacts]
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

  const upcomingBlackBookings = useMemo(() => {
    const now = Date.now();
    return blackBookings
      .filter((booking) => {
        const callType = typeof booking.callType === "string" ? booking.callType : "";
        if (!BLACK_CALL_TYPES.has(callType)) return false;
        if (booking.status === "cancelled") return false;
        if (!booking.startsAt) return false;
        const startMs = new Date(booking.startsAt).getTime();
        if (!Number.isFinite(startMs)) return false;
        if (startMs >= now) return true;
        const duration = Number(booking.durationMin);
        if (Number.isFinite(duration) && duration > 0) {
          return startMs + duration * 60000 >= now;
        }
        return false;
      })
      .sort((a, b) => {
        const aMs = new Date(a.startsAt).getTime();
        const bMs = new Date(b.startsAt).getTime();
        return aMs - bMs;
      })
      .slice(0, 5);
  }, [blackBookings]);

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
    if (student.hasActiveFollowup) {
      setError("Studente già collegato a un follow-up attivo");
      return;
    }
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
              onClick={() => {
                fetchContacts();
                fetchBlackBookings();
              }}
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
                  {studentResults.map((s) => {
                    const isLinked = Boolean(s.hasActiveFollowup);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => applyStudentSelection(s)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                          isLinked
                            ? "border-rose-200 bg-rose-50/60 hover:border-rose-300"
                            : "border-slate-200 bg-white hover:border-emerald-300"
                        }`}
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
                          <div className="text-right">
                            <p className="text-[11px] text-slate-500">
                              {s.year_class || "classe?"} · {s.track || "track?"}
                            </p>
                            {isLinked ? (
                              <span className="mt-1 inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                Già collegato
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
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

          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              <span>Prossimi appuntamenti Black</span>
              {loadingBookings ? <Loader2 size={12} className="animate-spin" /> : null}
            </div>
            {bookingError ? (
              <p className="mt-2 text-xs text-rose-600">{bookingError}</p>
            ) : upcomingBlackBookings.length ? (
              <div className="mt-2 space-y-2">
                {upcomingBlackBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">
                        {booking.fullName || "Studente"}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {formatDate(booking.startsAt)}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-slate-600">
                      {formatCallTypeLabel(booking)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Nessun appuntamento programmato.
              </p>
            )}
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
                const isEditingName = editingNameId === contact.id;
                const nameDraft = nameDrafts[contact.id] ?? contact.name ?? "";
                const isSavingName = savingNameId === contact.id;
                const isEditingPhone = editingPhoneId === contact.id;
                const phoneDraft = phoneDrafts[contact.id] ?? contact.whatsappPhone ?? "";
                const isSavingPhone = savingPhoneId === contact.id;
                const isScheduleOpen = scheduleOpenId === contact.id;
                const scheduleDraft = scheduleDrafts[contact.id] || buildDefaultScheduleDraft();
                const isScheduling = schedulingId === contact.id;
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
                          {isEditingName ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="text"
                                value={nameDraft}
                                onChange={(e) =>
                                  setNameDrafts((prev) => ({
                                    ...prev,
                                    [contact.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleNameSave(contact);
                                  }
                                  if (e.key === "Escape") {
                                    e.preventDefault();
                                    cancelNameEdit(contact.id);
                                  }
                                }}
                                placeholder="Nome e cognome"
                                className="min-w-[200px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleNameSave(contact)}
                                disabled={isSavingName}
                                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
                              >
                                {isSavingName ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  "Salva"
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => cancelNameEdit(contact.id)}
                                disabled={isSavingName}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300 disabled:opacity-60"
                              >
                                Annulla
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold text-slate-900">
                                {contact.name || "Contatto senza nome"}
                              </p>
                              <button
                                type="button"
                                onClick={() => startNameEdit(contact)}
                                className="text-xs font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
                              >
                                Modifica nome
                              </button>
                            </div>
                          )}
                          {contact.student ? (
                            <p className="text-xs text-slate-600">
                              {contact.student.preferred_name || contact.student.student_name || "Studente"} ·{" "}
                              {contact.student.student_email || contact.student.parent_email || "email n/d"} ·{" "}
                              {contact.student.year_class || "classe?"} · {contact.student.track || "track?"}
                            </p>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                            {isEditingPhone ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="text"
                                  inputMode="tel"
                                  value={phoneDraft}
                                  onChange={(e) =>
                                    setPhoneDrafts((prev) => ({
                                      ...prev,
                                      [contact.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handlePhoneSave(contact);
                                    }
                                    if (e.key === "Escape") {
                                      e.preventDefault();
                                      cancelPhoneEdit(contact.id);
                                    }
                                  }}
                                  placeholder="+39..."
                                  className="min-w-[180px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => handlePhoneSave(contact)}
                                  disabled={isSavingPhone}
                                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
                                >
                                  {isSavingPhone ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    "Salva"
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => cancelPhoneEdit(contact.id)}
                                  disabled={isSavingPhone}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300 disabled:opacity-60"
                                >
                                  Annulla
                                </button>
                              </div>
                            ) : (
                              <>
                                {contact.whatsappPhone ? <span>{contact.whatsappPhone}</span> : null}
                                <button
                                  type="button"
                                  onClick={() => startPhoneEdit(contact)}
                                  className="text-xs font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
                                >
                                  Modifica telefono
                                </button>
                              </>
                            )}
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
                        <button
                          onClick={() => handlePause(contact.id)}
                          disabled={pausingId === contact.id}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 shadow hover:border-amber-300 disabled:opacity-60"
                        >
                          {pausingId === contact.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <AlertTriangle size={16} />
                          )}
                          Metti in pausa
                        </button>
                        <button
                          onClick={() => toggleSchedule(contact.id)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300"
                        >
                          {isScheduleOpen ? "Chiudi pianificazione" : "Programma check-in / onboarding"}
                        </button>
                        {isScheduleOpen ? (
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                            <div className="flex flex-wrap gap-2">
                              <select
                                value={scheduleDraft.callType}
                                onChange={(e) =>
                                  updateScheduleDraft(contact.id, {
                                    callType: e.target.value as ScheduleDraft["callType"],
                                  })
                                }
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none"
                              >
                                {callTypeOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="date"
                                value={scheduleDraft.date}
                                onChange={(e) =>
                                  updateScheduleDraft(contact.id, { date: e.target.value })
                                }
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none"
                              />
                              <input
                                type="time"
                                value={scheduleDraft.time}
                                onChange={(e) =>
                                  updateScheduleDraft(contact.id, { time: e.target.value })
                                }
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none"
                              />
                            </div>
                            <input
                              type="text"
                              value={scheduleDraft.note}
                              onChange={(e) =>
                                updateScheduleDraft(contact.id, { note: e.target.value })
                              }
                              placeholder="Nota (opzionale)"
                              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none"
                            />
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                onClick={() => handleScheduleSave(contact)}
                                disabled={isScheduling}
                                className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
                              >
                                {isScheduling ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  "Salva"
                                )}
                              </button>
                              <button
                                onClick={() => setScheduleOpenId(null)}
                                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300"
                              >
                                Annulla
                              </button>
                            </div>
                          </div>
                        ) : null}
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
                Cerca per numero/email e clicca subito: Contattato, Apri WhatsApp, Ha risposto, In pausa.
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
                  const isPaused = contact.status === "dropped";
                  const isPausing = pausingId === contact.id;
                  const isResuming = resumingId === contact.id;
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
                                ? "In pausa"
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
                        {!isPaused ? (
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
                        ) : null}
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
                        {!isPaused ? (
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
                        ) : null}
                        {isPaused ? (
                          <button
                            onClick={() => handleResume(contact.id)}
                            disabled={isResuming}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-300 disabled:opacity-60"
                          >
                            {isResuming ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <RefreshCcw size={14} />
                            )}
                            Riattiva
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePause(contact.id)}
                            disabled={isPausing}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:border-amber-300 disabled:opacity-60"
                          >
                            {isPausing ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <AlertTriangle size={14} />
                            )}
                            In pausa
                          </button>
                        )}
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
              const isEditingName = editingNameId === contact.id;
              const nameDraft = nameDrafts[contact.id] ?? contact.name ?? "";
              const isSavingName = savingNameId === contact.id;
              const isEditingPhone = editingPhoneId === contact.id;
              const phoneDraft = phoneDrafts[contact.id] ?? contact.whatsappPhone ?? "";
              const isSavingPhone = savingPhoneId === contact.id;
              const isPaused = contact.status === "dropped";
              const isPausing = pausingId === contact.id;
              const isResuming = resumingId === contact.id;
              const isScheduleOpen = scheduleOpenId === contact.id;
              const scheduleDraft =
                scheduleDrafts[contact.id] ||
                buildDefaultScheduleDraft({ callType: "check-percorso" });
              const isScheduling = schedulingId === contact.id;
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
                          ? "In pausa"
                          : "Attivo"}
                      </span>
                      {isEditingName ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={nameDraft}
                            onChange={(e) =>
                              setNameDrafts((prev) => ({
                                ...prev,
                                [contact.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleNameSave(contact);
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                cancelNameEdit(contact.id);
                              }
                            }}
                            placeholder="Nome e cognome"
                            className="min-w-[180px] rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 outline-none transition focus:border-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => handleNameSave(contact)}
                            disabled={isSavingName}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
                          >
                            {isSavingName ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              "Salva"
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelNameEdit(contact.id)}
                            disabled={isSavingName}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-slate-300 disabled:opacity-60"
                          >
                            Annulla
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-slate-900">
                            {contact.name || contact.whatsappPhone || "Contatto"}
                          </p>
                          <button
                            type="button"
                            onClick={() => startNameEdit(contact)}
                            className="text-[11px] font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
                          >
                            Modifica nome
                          </button>
                        </>
                      )}
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
                    {isEditingPhone ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          inputMode="tel"
                          value={phoneDraft}
                          onChange={(e) =>
                            setPhoneDrafts((prev) => ({
                              ...prev,
                              [contact.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handlePhoneSave(contact);
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              cancelPhoneEdit(contact.id);
                            }
                          }}
                          placeholder="+39..."
                          className="min-w-[180px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none transition focus:border-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => handlePhoneSave(contact)}
                          disabled={isSavingPhone}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
                        >
                          {isSavingPhone ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            "Salva"
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelPhoneEdit(contact.id)}
                          disabled={isSavingPhone}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-slate-300 disabled:opacity-60"
                        >
                          Annulla
                        </button>
                      </div>
                    ) : (
                      <>
                        {contact.whatsappPhone ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-semibold text-slate-800">
                            <Phone size={14} />
                            {contact.whatsappPhone}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => startPhoneEdit(contact)}
                          className="text-[11px] font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
                        >
                          Modifica telefono
                        </button>
                      </>
                    )}
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
                    <button
                      type="button"
                      onClick={() => toggleSchedule(contact.id, "check-percorso")}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:border-slate-300"
                    >
                      {isScheduleOpen ? "Chiudi check-in" : "Programma check-in"}
                    </button>
                    {isPaused ? (
                      <button
                        type="button"
                        onClick={() => handleResume(contact.id)}
                        disabled={isResuming}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 hover:border-emerald-300 disabled:opacity-60"
                      >
                        {isResuming ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <RefreshCcw size={12} />
                        )}
                        Riattiva
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePause(contact.id)}
                        disabled={isPausing}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-700 hover:border-amber-300 disabled:opacity-60"
                      >
                        {isPausing ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <AlertTriangle size={12} />
                        )}
                        In pausa
                      </button>
                    )}
                  </div>
                  {isScheduleOpen ? (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={scheduleDraft.callType}
                          onChange={(e) =>
                            updateScheduleDraft(contact.id, {
                              callType: e.target.value as ScheduleDraft["callType"],
                            })
                          }
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none"
                        >
                          {callTypeOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={scheduleDraft.date}
                          onChange={(e) =>
                            updateScheduleDraft(contact.id, { date: e.target.value })
                          }
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none"
                        />
                        <input
                          type="time"
                          value={scheduleDraft.time}
                          onChange={(e) =>
                            updateScheduleDraft(contact.id, { time: e.target.value })
                          }
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none"
                        />
                      </div>
                      <input
                        type="text"
                        value={scheduleDraft.note}
                        onChange={(e) =>
                          updateScheduleDraft(contact.id, { note: e.target.value })
                        }
                        placeholder="Nota (opzionale)"
                        className="mt-2 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => handleScheduleSave(contact)}
                          disabled={isScheduling}
                          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
                        >
                          {isScheduling ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            "Salva"
                          )}
                        </button>
                        <button
                          onClick={() => setScheduleOpenId(null)}
                          className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300"
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  ) : null}
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
