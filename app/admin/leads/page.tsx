"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Instagram,
  ListFilter,
  Loader2,
  MessageCircle,
  NotebookPen,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { buildLeadWhatsAppMessage } from "@/lib/whatsappLink";
import Link from "next/link";

type Lead = {
  id: string;
  name: string | null;
  instagramHandle: string | null;
  whatsappPhone: string | null;
  note: string | null;
  role: "genitore" | "studente" | null;
  source?: string | null;
  channel: "instagram" | "whatsapp" | "unknown" | "black";
  status: "active" | "completed" | "dropped";
  currentStep: number;
  nextFollowUpAt: string | null;
  lastContactedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  firstSeenAt?: string | null;
  lastSeenAt?: string | null;
  leadAgeDays?: number | null;
  heatScore?: number | null;
  heatLabel?: "cold" | "warm" | "hot" | string | null;
  funnel?: string | null;
};

const allowedEmail = "luigi.miraglia006@gmail.com";
const followupLabels = ["+1 giorno (domani)", "+2 giorni", "+1 settimana", "+1 mese"];
const whatsappPrefixes = ["+39", "+41", "+44", "+34", "+33", "+49", "+43"];

async function buildHeaders() {
  const headers: Record<string, string> = {};
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth.currentUser?.getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch (err) {
    console.warn("[admin/leads] missing firebase token", err);
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

function formatLeadAge(days?: number | null) {
  if (typeof days !== "number") return null;
  if (days <= 0) return "oggi";
  if (days === 1) return "1 giorno";
  return `${days} giorni`;
}

function buildWhatsAppLink(phone?: string | null, preferWeb?: boolean, text?: string) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return null;
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  if (preferWeb) return `https://web.whatsapp.com/send?phone=${digits}${text ? `&text=${encodeURIComponent(text)}` : ""}`;
  return `https://wa.me/${digits}${query}`;
}

function LeadBadge({ channel }: { channel: Lead["channel"] }) {
  if (channel === "instagram") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-2.5 py-1 text-xs font-semibold text-pink-700">
        <Instagram size={14} />
        Instagram
      </span>
    );
  }
  if (channel === "whatsapp") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <Phone size={14} />
        WhatsApp
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
      <AlertTriangle size={14} />
      Contatto
    </span>
  );
}

function RoleBadge({ role }: { role: Lead["role"] }) {
  if (role === "genitore") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
        <Users size={14} />
        Genitore
      </span>
    );
  }
  if (role === "studente") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
        <GraduationCap size={14} />
        Studente
      </span>
    );
  }
  return null;
}

function HeatBadge({ lead }: { lead: Lead }) {
  if (typeof lead.heatScore !== "number") return null;
  const tone =
    lead.heatLabel === "hot"
      ? "bg-rose-100 text-rose-700"
      : lead.heatLabel === "warm"
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-700";
  const label = lead.heatLabel === "hot" ? "Caldo" : lead.heatLabel === "warm" ? "Tiepido" : "Freddo";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {label} {lead.heatScore}
      {formatLeadAge(lead.leadAgeDays) ? ` · ${formatLeadAge(lead.leadAgeDays)}` : ""}
    </span>
  );
}

export default function LeadsAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [restartingId, setRestartingId] = useState<string | null>(null);
  const [droppingId, setDroppingId] = useState<string | null>(null);
  const [pausingId, setPausingId] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
  const [phoneDrafts, setPhoneDrafts] = useState<Record<string, string>>({});
  const [savingPhoneId, setSavingPhoneId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    instagram: "",
    whatsappPrefix: whatsappPrefixes[0],
    whatsappNumber: "",
    note: "",
  });
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [preferWebWhatsApp, setPreferWebWhatsApp] = useState(false);

  const hasAccess = useMemo(
    () => Boolean(user?.email && user.email.toLowerCase() === allowedEmail),
    [user?.email]
  );

  const fetchAllLeads = useCallback(async () => {
    if (!hasAccess) return;
    setLoadingAll(true);
    setError(null);
    try {
      const headers = await buildHeaders();
      const res = await fetch("/api/admin/leads?all=1", {
        headers,
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setAllLeads(
        Array.isArray(json.all) ? json.all.filter((l: Lead) => l.channel !== "black") : []
      );
    } catch (err: any) {
      setError(err?.message || "Errore caricamento lead");
    } finally {
      setLoadingAll(false);
    }
  }, [hasAccess]);

  const applyLeadUpdate = useCallback((lead: Lead) => {
    setAllLeads((prev) => {
      if (lead.channel === "black") return prev.filter((l) => l.id !== lead.id);
      const idx = prev.findIndex((l) => l.id === lead.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = lead;
        return next;
      }
      return [lead, ...prev];
    });
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /android|iphone|ipad|ipod/.test(ua);
    setPreferWebWhatsApp(!isMobile);
  }, []);

  useEffect(() => {
    if (hasAccess) fetchAllLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess]);

  const handleCreate = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!form.instagram.trim() && !form.whatsappNumber.trim()) {
        setError("Inserisci almeno Instagram o WhatsApp");
        return;
      }
      setCreating(true);
      setError(null);
      try {
        const cleanedNumber = form.whatsappNumber.replace(/[^\d]/g, "");
        const fullWhatsApp =
          cleanedNumber && form.whatsappPrefix
            ? `${form.whatsappPrefix}${cleanedNumber}`
            : cleanedNumber
              ? cleanedNumber
              : null;
        const headers = await buildHeaders();
        headers["Content-Type"] = "application/json";
        const res = await fetch("/api/admin/leads", {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: form.name.trim() || null,
            instagram: form.instagram.trim() || null,
            whatsapp: fullWhatsApp,
            note: form.note.trim() || null,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        setForm({
          name: "",
          instagram: "",
          whatsappPrefix: form.whatsappPrefix || whatsappPrefixes[0],
          whatsappNumber: "",
          note: "",
        });
        setAddOpen(false);
        await fetchAllLeads();
      } catch (err: any) {
        setError(err?.message || "Errore creazione lead");
      } finally {
        setCreating(false);
      }
    },
    [form, fetchAllLeads]
  );

  const handleAdvance = useCallback(
    async (id: string) => {
      setAdvancingId(id);
      setError(null);
      try {
        const headers = await buildHeaders();
        headers["Content-Type"] = "application/json";
        const res = await fetch("/api/admin/leads", {
          method: "PATCH",
          headers,
          body: JSON.stringify({ id, action: "advance" }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        if (json?.lead) {
          applyLeadUpdate(json.lead);
        } else {
          await fetchAllLeads();
        }
      } catch (err: any) {
        setError(err?.message || "Errore aggiornamento follow-up");
      } finally {
        setAdvancingId(null);
      }
    },
    [fetchAllLeads, applyLeadUpdate]
  );

  const handleRestart = useCallback(
    async (id: string) => {
      setRestartingId(id);
      setError(null);
      try {
        const headers = await buildHeaders();
        headers["Content-Type"] = "application/json";
        const res = await fetch("/api/admin/leads", {
          method: "PATCH",
          headers,
          body: JSON.stringify({ id, action: "restart" }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        if (json?.lead) {
          applyLeadUpdate(json.lead);
        } else {
          await fetchAllLeads();
        }
      } catch (err: any) {
        setError(err?.message || "Errore riavvio ciclo lead");
      } finally {
        setRestartingId(null);
      }
    },
    [fetchAllLeads, applyLeadUpdate]
  );

  const handleDrop = useCallback(
    async (id: string) => {
      setDroppingId(id);
      setError(null);
      try {
        const headers = await buildHeaders();
        headers["Content-Type"] = "application/json";
        const res = await fetch("/api/admin/leads", {
          method: "PATCH",
          headers,
          body: JSON.stringify({ id, action: "snooze_monthly" }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        if (json?.lead) {
          applyLeadUpdate(json.lead);
        } else {
          await fetchAllLeads();
        }
      } catch (err: any) {
        setError(err?.message || "Errore scarto lead");
      } finally {
        setDroppingId(null);
      }
    },
    [fetchAllLeads, applyLeadUpdate]
  );

  const handlePause = useCallback(
    async (id: string) => {
      setPausingId(id);
      setError(null);
      try {
        const headers = await buildHeaders();
        headers["Content-Type"] = "application/json";
        const res = await fetch("/api/admin/leads", {
          method: "PATCH",
          headers,
          body: JSON.stringify({ id, status: "dropped" }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        if (json?.lead) {
          applyLeadUpdate(json.lead);
        } else {
          await fetchAllLeads();
        }
      } catch (err: any) {
        setError(err?.message || "Errore aggiornamento stato");
      } finally {
        setPausingId(null);
      }
    },
    [applyLeadUpdate, fetchAllLeads]
  );

  const handleResume = useCallback(
    async (id: string) => {
      setResumingId(id);
      setError(null);
      try {
        const headers = await buildHeaders();
        headers["Content-Type"] = "application/json";
        const res = await fetch("/api/admin/leads", {
          method: "PATCH",
          headers,
          body: JSON.stringify({ id, status: "active" }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        if (json?.lead) {
          applyLeadUpdate(json.lead);
        } else {
          await fetchAllLeads();
        }
      } catch (err: any) {
        setError(err?.message || "Errore aggiornamento stato");
      } finally {
        setResumingId(null);
      }
    },
    [applyLeadUpdate, fetchAllLeads]
  );

  const startPhoneEdit = useCallback((lead: Lead) => {
    setEditingPhoneId(lead.id);
    setPhoneDrafts((prev) => ({
      ...prev,
      [lead.id]: lead.whatsappPhone || "",
    }));
  }, []);

  const cancelPhoneEdit = useCallback((id: string) => {
    setEditingPhoneId((prev) => (prev === id ? null : prev));
    setPhoneDrafts((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handlePhoneSave = useCallback(
    async (lead: Lead) => {
      const draft = (phoneDrafts[lead.id] ?? "").trim();
      setSavingPhoneId(lead.id);
      setError(null);
      try {
        const headers = await buildHeaders();
        headers["Content-Type"] = "application/json";
        const res = await fetch("/api/admin/leads", {
          method: "PATCH",
          headers,
          body: JSON.stringify({ id: lead.id, whatsapp: draft || null }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        if (json?.lead) {
          applyLeadUpdate(json.lead);
        } else {
          await fetchAllLeads();
        }
        cancelPhoneEdit(lead.id);
      } catch (err: any) {
        setError(err?.message || "Errore aggiornamento telefono");
      } finally {
        setSavingPhoneId(null);
      }
    },
    [applyLeadUpdate, cancelPhoneEdit, fetchAllLeads, phoneDrafts]
  );

  const visibleLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const filtered = allLeads
      .filter((lead) => lead.channel !== "black")
      .filter((lead) => showCompleted || lead.status !== "completed")
      .filter((lead) => {
        if (!q) return true;
        const text = [
          lead.name,
          lead.instagramHandle,
          lead.whatsappPhone,
          lead.note,
          lead.status,
          lead.source,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const numbers = (lead.whatsappPhone || "").replace(/\D/g, "");
        return text.includes(q) || (digits && numbers.includes(digits));
      });

    return [...filtered].sort((a, b) => {
      const heatA = typeof a.heatScore === "number" ? a.heatScore : -1;
      const heatB = typeof b.heatScore === "number" ? b.heatScore : -1;
      if (heatB !== heatA) return heatB - heatA;
      const ageA = typeof a.leadAgeDays === "number" ? a.leadAgeDays : 0;
      const ageB = typeof b.leadAgeDays === "number" ? b.leadAgeDays : 0;
      return ageB - ageA;
    });
  }, [allLeads, searchQuery, showCompleted]);

  const stats = useMemo(() => {
    const total = visibleLeads.length;
    const hot = visibleLeads.filter((l) => l.heatLabel === "hot").length;
    const warm = visibleLeads.filter((l) => l.heatLabel === "warm").length;
    return { total, hot, warm, cold: total - hot - warm };
  }, [visibleLeads]);

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Admin
            </p>
            <h1 className="text-3xl font-black text-slate-900 leading-tight">
              Tutti i lead
            </h1>
            <p className="text-sm text-slate-600">
              Ogni contatto, da tutti i canali, ordinato dal più caldo al più freddo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/leads-os"
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 shadow-sm hover:border-emerald-300"
            >
              <ListFilter size={16} />
              Lead OS
            </Link>
            <Link
              href="/admin/whatsapp"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-slate-300"
            >
              <MessageCircle size={16} />
              WhatsApp Admin
            </Link>
            <Link
              href="/admin/black-followups"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-slate-300"
            >
              <ListFilter size={16} />
              Black follow-up
            </Link>
            <button
              onClick={fetchAllLeads}
              disabled={loadingAll}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-slate-300 disabled:opacity-50"
            >
              <RefreshCcw size={16} className={loadingAll ? "animate-spin" : ""} />
              Aggiorna
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              <Plus size={16} />
              Aggiungi lead
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

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Totale</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-600">Caldi</p>
          <p className="mt-1 text-2xl font-black text-rose-700">{stats.hot}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-600">Tiepidi</p>
          <p className="mt-1 text-2xl font-black text-amber-700">{stats.warm}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Freddi</p>
          <p className="mt-1 text-2xl font-black text-slate-700">{stats.cold}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per nome, numero, handle o nota"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          Mostra anche i completati
        </label>
      </div>

      {loadingAll && allLeads.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-10">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : visibleLeads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Nessun lead trovato.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleLeads.map((lead) => {
            const stepLabel = followupLabels[lead.currentStep] || "Ultimo follow-up";
            const instagramLink = lead.instagramHandle
              ? `https://instagram.com/${lead.instagramHandle.replace(/^@/, "")}`
              : null;
            const whatsappMessage = buildLeadWhatsAppMessage({
              fullName: lead.name,
              source: lead.source,
            });
            const whatsappLink = buildWhatsAppLink(lead.whatsappPhone, preferWebWhatsApp, whatsappMessage);
            const isEditingPhone = editingPhoneId === lead.id;
            const phoneDraft = phoneDrafts[lead.id] ?? lead.whatsappPhone ?? "";
            const isSavingPhone = savingPhoneId === lead.id;
            const isPaused = lead.status === "dropped";
            const isPausing = pausingId === lead.id;
            const isResuming = resumingId === lead.id;
            const statusLabel =
              lead.status === "completed" ? "Completato" : isPaused ? "In pausa" : "Attivo";

            return (
              <div key={lead.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <LeadBadge channel={lead.channel} />
                      <RoleBadge role={lead.role} />
                      <HeatBadge lead={lead} />
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {statusLabel}
                      </span>
                      {lead.source ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                          {lead.source}
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {lead.name || "Lead senza nome"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        {lead.instagramHandle ? (
                          instagramLink ? (
                            <a
                              href={instagramLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-slate-900 underline decoration-slate-300 underline-offset-4"
                            >
                              @{lead.instagramHandle}
                            </a>
                          ) : (
                            <span>@{lead.instagramHandle}</span>
                          )
                        ) : null}
                        {isEditingPhone ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              inputMode="tel"
                              value={phoneDraft}
                              onChange={(e) =>
                                setPhoneDrafts((prev) => ({
                                  ...prev,
                                  [lead.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handlePhoneSave(lead);
                                }
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  cancelPhoneEdit(lead.id);
                                }
                              }}
                              placeholder="+39..."
                              className="min-w-[160px] rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 outline-none transition focus:border-slate-400"
                            />
                            <button
                              type="button"
                              onClick={() => handlePhoneSave(lead)}
                              disabled={isSavingPhone}
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
                            >
                              {isSavingPhone ? <Loader2 size={12} className="animate-spin" /> : "Salva"}
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelPhoneEdit(lead.id)}
                              disabled={isSavingPhone}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-slate-300 disabled:opacity-60"
                            >
                              Annulla
                            </button>
                          </div>
                        ) : (
                          <>
                            {lead.whatsappPhone ? (
                              <span>{lead.whatsappPhone}</span>
                            ) : (
                              <span className="text-slate-400">Telefono n/d</span>
                            )}
                            <button
                              type="button"
                              onClick={() => startPhoneEdit(lead)}
                              className="text-[11px] font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
                            >
                              Modifica telefono
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {lead.note ? (
                      <p className="text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">Nota:</span> {lead.note}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                        Step {lead.currentStep + 1} di 4 · {stepLabel}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                        Prossimo: {formatDate(lead.nextFollowUpAt)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                        Inserito {formatDate(lead.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-stretch gap-2">
                    {whatsappLink ? (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:border-emerald-300"
                      >
                        <Phone size={16} />
                        Apri WhatsApp
                      </a>
                    ) : instagramLink ? (
                      <a
                        href={instagramLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 hover:border-slate-300"
                      >
                        <Instagram size={16} />
                        Apri Instagram
                      </a>
                    ) : null}
                    {!isPaused ? (
                      <button
                        onClick={() => handleRestart(lead.id)}
                        disabled={restartingId === lead.id}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:border-indigo-300 disabled:opacity-60"
                      >
                        {restartingId === lead.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <RefreshCcw size={16} />
                        )}
                        Ha risposto
                      </button>
                    ) : null}
                    {!isPaused ? (
                      <button
                        onClick={() => handleAdvance(lead.id)}
                        disabled={advancingId === lead.id}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {advancingId === lead.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={16} />
                        )}
                        Contattato
                      </button>
                    ) : null}
                    {isPaused ? (
                      <button
                        onClick={() => handleResume(lead.id)}
                        disabled={isResuming}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:border-emerald-300 disabled:opacity-60"
                      >
                        {isResuming ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                        Riattiva
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePause(lead.id)}
                        disabled={isPausing}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:border-amber-300 disabled:opacity-60"
                      >
                        {isPausing ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />}
                        In pausa
                      </button>
                    )}
                    {!isPaused ? (
                      <button
                        onClick={() => handleDrop(lead.id)}
                        disabled={droppingId === lead.id}
                        className="inline-flex items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:border-amber-300 disabled:opacity-60"
                        title="Rimanda di 30 giorni"
                      >
                        {droppingId === lead.id ? <Loader2 size={12} className="animate-spin" /> : "Rimanda 30d"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {addOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-end bg-slate-900/30 p-4">
          <div className="flex h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white">
                  <Plus size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 leading-tight">Aggiungi un lead</h2>
                  <p className="text-xs text-slate-500">
                    Minimo Instagram o WhatsApp. Il follow-up parte da domani.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAddOpen(false)}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                aria-label="Chiudi"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex-1 overflow-auto p-5">
              <div className="space-y-4">
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
                  <label className="text-xs font-semibold text-slate-600">Instagram</label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-2.5 h-4 w-4 text-pink-500" />
                    <input
                      type="text"
                      value={form.instagram}
                      onChange={(e) => setForm((prev) => ({ ...prev, instagram: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-9 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                      placeholder="@handle"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">WhatsApp</label>
                  <div className="flex gap-2">
                    <div className="relative w-32">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-emerald-500" />
                      <select
                        value={form.whatsappPrefix}
                        onChange={(e) => setForm((prev) => ({ ...prev, whatsappPrefix: e.target.value }))}
                        className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-8 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                      >
                        {whatsappPrefixes.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.whatsappNumber}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, whatsappNumber: e.target.value }))
                      }
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                      placeholder="Numero senza spazi"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Note</label>
                  <div className="relative">
                    <NotebookPen className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.note}
                      onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-9 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                      placeholder="Contesto, priorità..."
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock3 size={14} />
                  domani → +2gg → +1sett → +1mese
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Salva lead
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
