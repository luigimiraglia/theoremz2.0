"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Instagram,
  ListFilter,
  Loader2,
  NotebookPen,
  Phone,
  Plus,
  RefreshCcw,
  MessageCircle,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

type Lead = {
  id: string;
  name: string | null;
  instagramHandle: string | null;
  whatsappPhone: string | null;
  note: string | null;
  channel: "instagram" | "whatsapp" | "unknown";
  status: "active" | "completed" | "dropped";
  currentStep: number;
  nextFollowUpAt: string | null;
  lastContactedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type LeadsResponse = {
  date: string;
  due: Lead[];
  upcoming: Lead[];
  completed: Lead[];
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

function formatDay(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
}

function buildWhatsAppLink(phone?: string | null, preferWeb?: boolean) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (preferWeb) return `https://web.whatsapp.com/send?phone=${digits}`;
  return `https://wa.me/${digits}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00`);
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

export default function LeadsAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [data, setData] = useState<LeadsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    instagram: "",
    whatsappPrefix: whatsappPrefixes[0],
    whatsappNumber: "",
    note: "",
  });
  const [showCompleted, setShowCompleted] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [preferWebWhatsApp, setPreferWebWhatsApp] = useState(false);
  const dayStart = useMemo(() => startOfDay(selectedDate), [selectedDate]);
  const dayEnd = useMemo(() => addDays(dayStart, 1), [dayStart]);

  const hasAccess = useMemo(
    () => Boolean(user?.email && user.email.toLowerCase() === allowedEmail),
    [user?.email]
  );

  const fetchLeads = useCallback(async () => {
    if (!hasAccess) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await buildHeaders();
      const params = new URLSearchParams({
        date: selectedDate,
        includeCompleted: showCompleted ? "1" : "0",
      });
      const res = await fetch(`/api/admin/leads?${params.toString()}`, {
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
      setError(err?.message || "Errore caricamento lead");
    } finally {
      setLoading(false);
    }
  }, [hasAccess, selectedDate, showCompleted]);

  useEffect(() => {
    if (hasAccess) fetchLeads();
  }, [hasAccess, fetchLeads]);

  const applyLeadUpdate = useCallback(
    (lead: Lead) => {
      setData((prev) => {
        if (!prev) return prev;
        const removeFrom = (arr: Lead[]) => arr.filter((l) => l.id !== lead.id);
        let due = removeFrom(prev.due);
        let upcoming = removeFrom(prev.upcoming);
        let completed = removeFrom(prev.completed);

        const nextAt = lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt) : null;
        const isDue =
          lead.status === "active" && nextAt && nextAt.getTime() <= dayEnd.getTime();

        if (lead.status === "completed") {
          completed = [lead, ...completed];
        } else if (isDue) {
          due = [lead, ...due];
        } else {
          upcoming = [lead, ...upcoming];
        }

        return { ...prev, due, upcoming, completed };
      });

      setAllLeads((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        const idx = list.findIndex((l) => l.id === lead.id);
        if (idx >= 0) {
          const next = [...list];
          next[idx] = lead;
          return next;
        }
        return [lead, ...list];
      });
    },
    [dayEnd],
  );

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /android|iphone|ipad|ipod/.test(ua);
    setPreferWebWhatsApp(!isMobile);
  }, []);

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
      setAllLeads(Array.isArray(json.all) ? json.all : []);
      setAllOpen(true);
    } catch (err: any) {
      setError(err?.message || "Errore caricamento elenco completo");
    } finally {
      setLoadingAll(false);
    }
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
        await fetchLeads();
      } catch (err: any) {
        setError(err?.message || "Errore creazione lead");
      } finally {
        setCreating(false);
      }
    },
    [form, fetchLeads]
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
          await fetchLeads();
        }
      } catch (err: any) {
        setError(err?.message || "Errore aggiornamento follow-up");
      } finally {
        setAdvancingId(null);
      }
    },
    [fetchLeads, applyLeadUpdate]
  );

  const dayDue = useMemo(() => {
    const list = data?.due || [];
    return list.map((lead) => {
      const dueAt = lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt) : null;
      const isOverdue = dueAt ? dueAt.getTime() < dayStart.getTime() : false;
      return { ...lead, dueAt, isOverdue };
    });
  }, [data?.due, dayStart]);

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
              Leads manuali e follow-up
            </h1>
            <p className="text-sm text-slate-600">
              Coda giornaliera dei contatti da raggiungere e stato dei prossimi follow-up.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin/whatsapp"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-slate-300"
            >
              <MessageCircle size={16} />
              WhatsApp Admin
            </a>
            <button
              onClick={fetchAllLeads}
              disabled={loadingAll}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-slate-300 disabled:opacity-50"
            >
              <ListFilter size={16} className={loadingAll ? "animate-spin" : ""} />
              Tutti i lead
            </button>
            <button
              onClick={fetchLeads}
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
                Aggiungi un lead
              </h2>
              <p className="text-sm text-slate-500">
                Minimo Instagram o WhatsApp. Il sistema programma automaticamente i follow-up.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
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
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, whatsappPrefix: e.target.value }))
                    }
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

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock3 size={14} />
              Sequenza: domani → +2 giorni → +1 settimana → +1 mese
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
                <span className="text-xs font-semibold text-white/60"> lead</span>
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
              Nessun lead per questa data.
            </div>
          ) : (
            <div className="space-y-3">
              {dayDue.map((lead) => {
                const stepLabel = followupLabels[lead.currentStep] || "Ultimo follow-up";
                const instagramLink = lead.instagramHandle
                  ? `https://instagram.com/${lead.instagramHandle.replace(/^@/, "")}`
                  : null;
                const whatsappLink = buildWhatsAppLink(lead.whatsappPhone, preferWebWhatsApp);
                return (
                  <div
                    key={lead.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <LeadBadge channel={lead.channel} />
                          {lead.isOverdue ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                              In ritardo
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
                            {lead.whatsappPhone ? <span>{lead.whatsappPhone}</span> : null}
                          </div>
                        </div>
                        {lead.note ? (
                          <p className="text-sm text-slate-700">
                            <span className="font-semibold text-slate-900">Nota:</span> {lead.note}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                            <Clock3 size={14} />
                            {lead.isOverdue
                              ? `doveva essere il ${formatDate(lead.nextFollowUpAt)}`
                              : `oggi / ${formatDate(lead.nextFollowUpAt)}`}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                            Step {lead.currentStep + 1} di 4 · {stepLabel}
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
                        <p className="text-[11px] leading-tight text-slate-500">
                          Avanza al prossimo follow-up automatico.
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
                {data.upcoming.slice(0, 8).map((lead) => {
                  const nextAt = lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt) : null;
                  const label = followupLabels[lead.currentStep] || "Ultimo giro";
                  return (
                    <div
                      key={lead.id}
                      className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <LeadBadge channel={lead.channel} />
                          <span className="font-semibold text-slate-900">
                            {lead.name || lead.instagramHandle || lead.whatsappPhone || "Lead"}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                          {nextAt ? nextAt.toLocaleDateString("it-IT") : "—"}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <Clock3 size={14} />
                        Step {lead.currentStep + 1} · {label}
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
                  {data.completed.slice(0, 10).map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <LeadBadge channel={lead.channel} />
                        <span className="font-semibold text-slate-900">
                          {lead.name || lead.instagramHandle || lead.whatsappPhone || "Lead"}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        chiuso {formatDate(lead.completedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Nessun lead completato.</p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {allOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 px-3 py-6">
          <div className="relative max-h-[82vh] w-[min(1080px,94vw)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Tutti i lead
                </p>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  {allLeads.length} contatti totali
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {loadingAll ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
                    <Loader2 size={14} className="animate-spin" />
                    Carico...
                  </span>
                ) : null}
                <button
                  onClick={() => setAllOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Chiudi
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-auto p-5">
              {allLeads.length === 0 ? (
                <p className="text-sm text-slate-500">Nessun lead presente.</p>
              ) : (
                <div className="space-y-3">
                  {allLeads.map((lead) => {
                    const igLink = lead.instagramHandle
                      ? `https://instagram.com/${lead.instagramHandle.replace(/^@/, "")}`
                      : null;
                    const waLink = buildWhatsAppLink(lead.whatsappPhone, preferWebWhatsApp);
                    const statusLabel =
                      lead.status === "completed"
                        ? "Completato"
                        : lead.status === "dropped"
                          ? "Perso"
                          : "Attivo";
                    return (
                      <div
                        key={lead.id}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <LeadBadge channel={lead.channel} />
                              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {statusLabel}
                              </span>
                            </div>
                            <p className="text-base font-semibold text-slate-900">
                              {lead.name || "Lead senza nome"}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                              {lead.instagramHandle ? (
                                igLink ? (
                                  <a
                                    href={igLink}
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
                              {lead.whatsappPhone ? <span>{lead.whatsappPhone}</span> : null}
                            </div>
                            {lead.note ? (
                              <p className="text-sm text-slate-700">
                                <span className="font-semibold text-slate-900">Nota:</span>{" "}
                                {lead.note}
                              </p>
                            ) : null}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                                Step {lead.currentStep + 1} di 4
                              </span>
                              <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                                Prossimo: {formatDate(lead.nextFollowUpAt)}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                                Ultimo contatto: {formatDate(lead.lastContactedAt)}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                              <span>Creato {formatDate(lead.createdAt)}</span>
                              {lead.completedAt ? (
                                <span>Chiuso {formatDate(lead.completedAt)}</span>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex flex-col items-stretch gap-2">
                            {waLink ? (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:border-emerald-300"
                              >
                                <Phone size={16} />
                                WhatsApp
                              </a>
                            ) : null}
                            {igLink ? (
                              <a
                                href={igLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 hover:border-slate-300"
                              >
                                <Instagram size={16} />
                                Instagram
                              </a>
                            ) : null}
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
                            <p className="text-[11px] leading-tight text-slate-500">
                              Segna il contatto e riparte il timer del follow-up.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
