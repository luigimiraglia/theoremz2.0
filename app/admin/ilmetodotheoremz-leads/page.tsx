"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCcw,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

type LeadStatus = "pending" | "responded" | "no_response" | "paused";

type StreakDay = {
  ymd: string;
  label: string;
  count: number;
  isToday: boolean;
  isTomorrow: boolean;
};

type Lead = {
  id: string;
  fullName: string | null;
  email: string | null;
  phonePrefix: string | null;
  phone: string | null;
  pageUrl: string | null;
  note?: string | null;
  source: string | null;
  responseStatus: LeadStatus;
  respondedAt: string | null;
  noResponseAt: string | null;
  pausedAt?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const allowedEmail = "luigi.miraglia006@gmail.com";

async function buildHeaders() {
  const headers: Record<string, string> = {};
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth.currentUser?.getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch (err) {
    console.warn("[admin/ilmetodotheoremz-leads] missing firebase token", err);
  }
  return headers;
}

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildDefaultMessage(name?: string | null) {
  const safeName = (name || "").trim();
  const firstName = safeName.split(/\s+/).filter(Boolean)[0] || "";
  const greeting = firstName ? `Ciao ${firstName},` : "Ciao,";
  return `${greeting} sono Luigi di Theoremz\nTi avevo contattato perche avevi richiesto informazioni su uno dei nostri percorsi di miglioramento scolastico\n\nFammi sapere quando ti e comodo sentirci!`;
}

function buildWhatsAppLink(
  phonePrefix?: string | null,
  phone?: string | null,
  preferWeb?: boolean,
  name?: string | null,
) {
  const full = `${phonePrefix || ""}${phone || ""}`.trim();
  const digits = full.replace(/[^\d]/g, "");
  if (!digits) return null;
  const message = encodeURIComponent(buildDefaultMessage(name));
  if (preferWeb) return `https://web.whatsapp.com/send?phone=${digits}&text=${message}`;
  return `https://wa.me/${digits}?text=${message}`;
}

function formatPhone(phonePrefix?: string | null, phone?: string | null) {
  const full = `${phonePrefix || ""}${phone || ""}`.trim();
  return full || "-";
}

function statusLabel(status: LeadStatus) {
  if (status === "responded") return "Ha risposto";
  if (status === "no_response") return "Non ha risposto";
  if (status === "paused") return "In pausa";
  return "Da contattare";
}

function statusTone(status: LeadStatus) {
  if (status === "responded") return "bg-emerald-100 text-emerald-700";
  if (status === "no_response") return "bg-rose-100 text-rose-700";
  if (status === "paused") return "bg-slate-200 text-slate-700";
  return "bg-slate-100 text-slate-700";
}

function splitLeads(list: Lead[]) {
  return {
    pending: list.filter((lead) => lead.responseStatus === "pending"),
    responded: list.filter((lead) => lead.responseStatus === "responded"),
    noResponse: list.filter((lead) => lead.responseStatus === "no_response"),
    paused: list.filter((lead) => lead.responseStatus === "paused"),
  };
}

type LeadCardProps = {
  lead: Lead;
  updatingId: string | null;
  preferWebWhatsApp: boolean;
  onStatusChange: (id: string, status: LeadStatus) => void;
};

function LeadCard({ lead, updatingId, preferWebWhatsApp, onStatusChange }: LeadCardProps) {
  const whatsappHref = buildWhatsAppLink(
    lead.phonePrefix,
    lead.phone,
    preferWebWhatsApp,
    lead.fullName,
  );
  const busy = updatingId === lead.id;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-slate-900">{lead.fullName || "Senza nome"}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            <Clock3 className="mr-1 inline h-3 w-3" aria-hidden />
            {formatDate(lead.createdAt)}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone(
            lead.responseStatus,
          )}`}
        >
          {statusLabel(lead.responseStatus)}
        </span>
      </div>

      <div className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
        <p className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-slate-400" aria-hidden />
          {formatPhone(lead.phonePrefix, lead.phone)}
        </p>
        <p className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-slate-400" aria-hidden />
          {lead.email || "-"}
        </p>
        {lead.note ? (
          <p className="text-xs font-semibold text-slate-500">
            Nota: {lead.note}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            Apri WhatsApp
          </a>
        ) : (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
            WhatsApp non disponibile
          </span>
        )}

        <button
          type="button"
          onClick={() => onStatusChange(lead.id, "responded")}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Ha risposto
        </button>

        <button
          type="button"
          onClick={() => onStatusChange(lead.id, "no_response")}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          Non ha risposto
        </button>

        {lead.responseStatus === "paused" ? (
          <button
            type="button"
            onClick={() => onStatusChange(lead.id, "pending")}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Riattiva
          </button>
        ) : lead.responseStatus !== "pending" ? (
          <button
            type="button"
            onClick={() => onStatusChange(lead.id, "pending")}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Riporta in attesa
          </button>
        ) : null}

        {lead.responseStatus !== "paused" ? (
          <button
            type="button"
            onClick={() => onStatusChange(lead.id, "paused")}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Metti in pausa
          </button>
        ) : null}
      </div>
    </div>
  );
}

type PausedLeadRowProps = {
  lead: Lead;
  updatingId: string | null;
  onReactivate: (id: string) => void;
};

function PausedLeadRow({ lead, updatingId, onReactivate }: PausedLeadRowProps) {
  const busy = updatingId === lead.id;
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div>
        <p className="text-sm font-semibold text-slate-900">{lead.fullName || "Senza nome"}</p>
        <p className="text-xs font-semibold text-slate-500">
          {formatPhone(lead.phonePrefix, lead.phone)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onReactivate(lead.id)}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        Riattiva
      </button>
    </div>
  );
}

type LeadModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
};

function LeadModal({ open, title, subtitle, onClose, children }: LeadModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            {subtitle ? (
              <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Chiudi"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <div className="space-y-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function IlMetodoCallLeadsPage() {
  const { user, loading: authLoading } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dailyLeads, setDailyLeads] = useState<Lead[]>([]);
  const [dailyDate, setDailyDate] = useState<string | null>(null);
  const [streakDays, setStreakDays] = useState<StreakDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preferWebWhatsApp, setPreferWebWhatsApp] = useState(false);
  const [showResponded, setShowResponded] = useState(false);
  const [showNoResponse, setShowNoResponse] = useState(false);
  const [showPaused, setShowPaused] = useState(false);
  const [showDailyPaused, setShowDailyPaused] = useState(false);

  const hasAccess = useMemo(
    () => Boolean(user?.email && user.email.toLowerCase() === allowedEmail),
    [user?.email],
  );

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /android|iphone|ipad|ipod/.test(ua);
    setPreferWebWhatsApp(!isMobile);
  }, []);

  const fetchLeads = useCallback(async () => {
    if (!hasAccess) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await buildHeaders();
      const res = await fetch("/api/admin/ilmetodotheoremz-leads", {
        headers,
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      const items = Array.isArray(json?.leads) ? json.leads : [];
      const daily = json?.daily || null;
      const dailyItems = Array.isArray(daily?.leads) ? daily.leads : [];
      const streak = Array.isArray(json?.streak?.days) ? json.streak.days : [];
      setLeads(items);
      setDailyLeads(dailyItems);
      setDailyDate(typeof daily?.date === "string" ? daily.date : null);
      setStreakDays(streak);
    } catch (err: any) {
      setError(err?.message || "Errore caricamento lead");
    } finally {
      setLoading(false);
    }
  }, [hasAccess]);

  useEffect(() => {
    if (hasAccess) fetchLeads();
  }, [fetchLeads, hasAccess]);

  const sendStatusUpdate = useCallback(
    async (
      id: string,
      status: LeadStatus,
      source: "ilmetodo" | "manual",
      onUpdate: (lead: Lead) => void,
    ) => {
      if (!hasAccess) return;
      setUpdatingId(id);
      setError(null);
      try {
        const headers = await buildHeaders();
        const res = await fetch("/api/admin/ilmetodotheoremz-leads", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify({ id, status, source }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        const updated = json?.lead;
        if (updated?.id) {
          onUpdate(updated);
        }
      } catch (err: any) {
        setError(err?.message || "Errore aggiornamento");
      } finally {
        setUpdatingId(null);
      }
    },
    [hasAccess],
  );

  const updateStatus = useCallback(
    async (id: string, status: LeadStatus) => {
      await sendStatusUpdate(id, status, "ilmetodo", (updated) => {
        setLeads((prev) => prev.map((lead) => (lead.id === updated.id ? updated : lead)));
      });
    },
    [sendStatusUpdate],
  );

  const updateDailyStatus = useCallback(
    async (lead: Lead, status: LeadStatus) => {
      const sourceParam = lead.source === "black" ? "black" : "manual";
      await sendStatusUpdate(lead.id, status, sourceParam, (updated) => {
        setDailyLeads((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      });
    },
    [sendStatusUpdate],
  );

  const { pending, responded, noResponse, paused } = useMemo(() => {
    const list = Array.isArray(leads) ? leads : [];
    return splitLeads(list);
  }, [leads]);

  const dailyBuckets = useMemo(() => {
    const list = Array.isArray(dailyLeads) ? dailyLeads : [];
    return splitLeads(list);
  }, [dailyLeads]);

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-semibold text-slate-600">
          Caricamento...
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-semibold text-slate-600">
          Accesso riservato.
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-5 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        {streakDays.length ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Streak contatti
                </p>
                <h2 className="text-lg font-bold text-slate-900">
                  Ultimi 7 giorni + oggi/domani
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-500">Contattati</span>
            </div>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {streakDays.map((day) => {
                const isToday = day.isToday;
                const isTomorrow = day.isTomorrow;
                return (
                  <div
                    key={day.ymd}
                    className={`min-w-[82px] rounded-xl border px-3 py-2 text-center ${
                      isToday
                        ? "border-slate-900 bg-slate-900 text-white"
                        : isTomorrow
                          ? "border-slate-200 bg-slate-50 text-slate-600"
                          : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <p
                      className={`text-[11px] font-semibold uppercase tracking-wide ${
                        isToday ? "text-slate-200" : "text-slate-500"
                      }`}
                    >
                      {day.label}
                    </p>
                    <p className="mt-1 text-2xl font-black">{day.count}</p>
                    <p className="min-h-[12px] text-[10px] font-semibold">
                      {isToday ? "Oggi" : isTomorrow ? "Domani" : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Leads chiamate
            </p>
            <h1 className="text-3xl font-black text-slate-900">Il Metodo Theoremz</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Lista lead dalla landing con stato risposta e pausa.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchLeads}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Aggiorna
          </button>
        </header>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-12">
          <section className="space-y-3 lg:col-span-6">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Da contattare</h2>
                <p className="text-xs font-semibold text-slate-500">Priorita di oggi</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase text-slate-400">Rimangono</p>
                <p className="text-2xl font-black text-slate-900">{pending.length}</p>
              </div>
            </div>
            {pending.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-semibold text-slate-500">
                Nessun lead in attesa.
              </div>
            ) : (
              pending.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  updatingId={updatingId}
                  preferWebWhatsApp={preferWebWhatsApp}
                  onStatusChange={updateStatus}
                />
              ))
            )}
          </section>

          <section className="space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Ha risposto</h2>
                <p className="text-[11px] font-semibold text-slate-500">Totale</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-slate-900">{responded.length}</span>
                <button
                  type="button"
                  onClick={() => setShowResponded(true)}
                  disabled={responded.length === 0}
                  className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Apri grande
                </button>
              </div>
            </div>
            {responded.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-semibold text-slate-500">
                Nessun lead in questa lista.
              </div>
            ) : (
              responded.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  updatingId={updatingId}
                  preferWebWhatsApp={preferWebWhatsApp}
                  onStatusChange={updateStatus}
                />
              ))
            )}
          </section>

          <section className="space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Non ha risposto</h2>
                <p className="text-[11px] font-semibold text-slate-500">Totale</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-slate-900">{noResponse.length}</span>
                <button
                  type="button"
                  onClick={() => setShowNoResponse(true)}
                  disabled={noResponse.length === 0}
                  className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Apri grande
                </button>
              </div>
            </div>
            {noResponse.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-semibold text-slate-500">
                Nessun lead in questa lista.
              </div>
            ) : (
              noResponse.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  updatingId={updatingId}
                  preferWebWhatsApp={preferWebWhatsApp}
                  onStatusChange={updateStatus}
                />
              ))
            )}
          </section>

          <section className="space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Disattivati</h2>
                <p className="text-[11px] font-semibold text-slate-500">In pausa</p>
              </div>
              <span className="text-xl font-black text-slate-900">{paused.length}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowPaused(true)}
              disabled={paused.length === 0}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>Disattivati</span>
              <span className="text-sm font-bold text-slate-900">{paused.length}</span>
            </button>
          </section>
        </div>

        <div className="space-y-4 border-t border-slate-200 pt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Lead casuali del giorno
              </p>
              <h2 className="text-2xl font-black text-slate-900">Disdette + lead WhatsApp</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                30 lead casuali da disdette Black e lead WhatsApp.
              </p>
            </div>
            {dailyDate ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Aggiornato: {dailyDate}
              </span>
            ) : null}
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <section className="space-y-3 lg:col-span-6">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Da contattare</h3>
                  <p className="text-xs font-semibold text-slate-500">Lead casuali di oggi</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase text-slate-400">Rimangono</p>
                  <p className="text-2xl font-black text-slate-900">
                    {dailyBuckets.pending.length}
                  </p>
                </div>
              </div>
              {dailyBuckets.pending.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-semibold text-slate-500">
                  Nessun lead in attesa.
                </div>
              ) : (
                dailyBuckets.pending.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    updatingId={updatingId}
                    preferWebWhatsApp={preferWebWhatsApp}
                    onStatusChange={(id, status) => updateDailyStatus(lead, status)}
                  />
                ))
              )}
            </section>

            <section className="space-y-3 lg:col-span-2">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Ha risposto</h3>
                  <p className="text-[11px] font-semibold text-slate-500">Totale</p>
                </div>
                <span className="text-xl font-black text-slate-900">
                  {dailyBuckets.responded.length}
                </span>
              </div>
              {dailyBuckets.responded.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-semibold text-slate-500">
                  Nessun lead in questa lista.
                </div>
              ) : (
                dailyBuckets.responded.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    updatingId={updatingId}
                    preferWebWhatsApp={preferWebWhatsApp}
                    onStatusChange={(id, status) => updateDailyStatus(lead, status)}
                  />
                ))
              )}
            </section>

            <section className="space-y-3 lg:col-span-2">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Non ha risposto</h3>
                  <p className="text-[11px] font-semibold text-slate-500">Totale</p>
                </div>
                <span className="text-xl font-black text-slate-900">
                  {dailyBuckets.noResponse.length}
                </span>
              </div>
              {dailyBuckets.noResponse.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-semibold text-slate-500">
                  Nessun lead in questa lista.
                </div>
              ) : (
                dailyBuckets.noResponse.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    updatingId={updatingId}
                    preferWebWhatsApp={preferWebWhatsApp}
                    onStatusChange={(id, status) => updateDailyStatus(lead, status)}
                  />
                ))
              )}
            </section>

            <section className="space-y-3 lg:col-span-2">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Disattivati</h3>
                  <p className="text-[11px] font-semibold text-slate-500">In pausa</p>
                </div>
                <span className="text-xl font-black text-slate-900">
                  {dailyBuckets.paused.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDailyPaused(true)}
                disabled={dailyBuckets.paused.length === 0}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>Disattivati</span>
                <span className="text-sm font-bold text-slate-900">
                  {dailyBuckets.paused.length}
                </span>
              </button>
            </section>
          </div>
        </div>
      </div>
      <LeadModal
        open={showResponded}
        title="Ha risposto"
        subtitle="Lead con risposta confermata."
        onClose={() => setShowResponded(false)}
      >
        {responded.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-500">
            Nessun lead in questa lista.
          </div>
        ) : (
          responded.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              updatingId={updatingId}
              preferWebWhatsApp={preferWebWhatsApp}
              onStatusChange={updateStatus}
            />
          ))
        )}
      </LeadModal>

      <LeadModal
        open={showNoResponse}
        title="Non ha risposto"
        subtitle="Lead senza risposta."
        onClose={() => setShowNoResponse(false)}
      >
        {noResponse.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-500">
            Nessun lead in questa lista.
          </div>
        ) : (
          noResponse.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              updatingId={updatingId}
              preferWebWhatsApp={preferWebWhatsApp}
              onStatusChange={updateStatus}
            />
          ))
        )}
      </LeadModal>

      <LeadModal
        open={showPaused}
        title="Disattivati"
        subtitle="Lead messi in pausa."
        onClose={() => setShowPaused(false)}
      >
        {paused.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-500">
            Nessun lead disattivato.
          </div>
        ) : (
          paused.map((lead) => (
            <PausedLeadRow
              key={lead.id}
              lead={lead}
              updatingId={updatingId}
              onReactivate={(id) => updateStatus(id, "pending")}
            />
          ))
        )}
      </LeadModal>

      <LeadModal
        open={showDailyPaused}
        title="Disattivati (giornalieri)"
        subtitle="Lead casuali messi in pausa."
        onClose={() => setShowDailyPaused(false)}
      >
        {dailyBuckets.paused.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-500">
            Nessun lead disattivato.
          </div>
        ) : (
          dailyBuckets.paused.map((lead) => (
            <PausedLeadRow
              key={lead.id}
              lead={lead}
              updatingId={updatingId}
              onReactivate={() => updateDailyStatus(lead, "pending")}
            />
          ))
        )}
      </LeadModal>
    </main>
  );
}
