"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  PhoneCall,
  RefreshCcw,
  Search,
  TrendingUp,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useAuth } from "@/lib/AuthContext";

type Lead = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  instagramHandle: string | null;
  channel: string;
  source: string | null;
  funnel: string | null;
  status: "active" | "completed" | "dropped" | string;
  responseStatus: "pending" | "responded" | "no_response" | "paused" | string;
  temperatureScore: number | null;
  temperatureLabel: "cold" | "warm" | "hot" | string | null;
  heatReasons: string[];
  currentStep: number;
  nextFollowUpAt: string | null;
  lastContactedAt: string | null;
  leadAgeDays: number | null;
  note: string | null;
  pageUrl: string | null;
  createdAt: string | null;
};

type DashboardData = {
  filters: {
    sources: string[];
    funnels: string[];
  };
  kpis: {
    today: number;
    yesterday: number;
    delta: number;
    deltaPct: number;
    last7: number;
    previous7: number;
    weekDelta: number;
    weekDeltaPct: number;
    active: number;
    hot: number;
  };
  chart: Array<{ date: string; total: number; hot: number; warm: number; cold: number }>;
  leads: Lead[];
  totalFiltered: number;
};

const allowedEmail = "luigi.miraglia006@gmail.com";
const controlClass =
  "h-10 min-w-0 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
const subtleButtonClass =
  "inline-flex min-h-9 max-w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60";

async function buildHeaders() {
  const headers: Record<string, string> = {};
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth.currentUser?.getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch (err) {
    console.warn("[admin/leads-os] missing firebase token", err);
  }
  return headers;
}

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayLabel(iso: string) {
  const date = new Date(`${iso}T12:00:00Z`);
  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
}

function formatAge(days?: number | null) {
  if (typeof days !== "number") return "-";
  if (days <= 0) return "oggi";
  if (days === 1) return "1 giorno";
  return `${days} giorni`;
}

function toDatetimeLocalValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function defaultScheduleValue() {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(15, 0, 0, 0);
  return toDatetimeLocalValue(next);
}

function toneForTemperature(label?: string | null) {
  if (label === "hot") return "bg-rose-50 text-rose-700 border-rose-200";
  if (label === "warm") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function temperatureLabel(label?: string | null) {
  if (label === "hot") return "Caldo";
  if (label === "warm") return "Tiepido";
  return "Freddo";
}

function statusLabel(status: string) {
  if (status === "completed") return "Completato";
  if (status === "dropped") return "Scartato";
  return "Attivo";
}

function responseLabel(status: string) {
  if (status === "responded") return "Ha risposto";
  if (status === "no_response") return "Non risponde";
  if (status === "paused") return "In pausa";
  return "Da contattare";
}

function funnelLabel(value?: string | null) {
  if (value === "black_churn") return "Black churn";
  if (value === "whatsapp_prospect") return "WhatsApp prospect";
  if (value === "quick_contact") return "Contatto rapido";
  if (value === "ilmetodo") return "Il Metodo";
  if (value === "quiz") return "Quiz";
  if (value === "manual") return "Manuale";
  return value || "Altro";
}

function buildContactHref(lead: Lead, preferWebWhatsApp: boolean) {
  const phone = lead.phone || "";
  if (phone.includes("@")) return `mailto:${phone}`;
  const digits = phone.replace(/[^\d]/g, "");
  if (digits) {
    return preferWebWhatsApp
      ? `https://web.whatsapp.com/send?phone=${digits}`
      : `https://wa.me/${digits}`;
  }
  if (lead.email) return `mailto:${lead.email}`;
  if (lead.instagramHandle) return `https://instagram.com/${lead.instagramHandle.replace(/^@/, "")}`;
  return null;
}

function KpiCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "good" | "bad" | "neutral";
}) {
  const detailTone =
    tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-rose-700" : "text-slate-500";
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-slate-950">{value}</p>
      <p className={`mt-1 text-xs font-medium ${detailTone}`}>{detail}</p>
    </div>
  );
}

export default function LeadsOperatingSystemPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [callOutcomeLeadId, setCallOutcomeLeadId] = useState<string | null>(null);
  const [salesCallAt, setSalesCallAt] = useState(defaultScheduleValue);
  const [error, setError] = useState<string | null>(null);
  const [preferWebWhatsApp, setPreferWebWhatsApp] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    source: "all",
    funnel: "all",
    status: "active",
    responseStatus: "all",
    temperature: "all",
    queue: "due",
    dateFrom: "",
    dateTo: "",
    days: "30",
  });

  const hasAccess = useMemo(
    () => Boolean(user?.email && user.email.toLowerCase() === allowedEmail),
    [user?.email],
  );

  const params = useMemo(() => {
    const next = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) next.set(key, value);
    });
    return next;
  }, [filters]);

  const fetchData = useCallback(async () => {
    if (!hasAccess) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await buildHeaders();
      const res = await fetch(`/api/admin/leads-os?${params.toString()}`, {
        headers,
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setData(json);
    } catch (err: any) {
      setError(err?.message || "Errore caricamento lead");
    } finally {
      setLoading(false);
    }
  }, [hasAccess, params]);

  useEffect(() => {
    if (hasAccess) fetchData();
  }, [fetchData, hasAccess]);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent.toLowerCase();
    setPreferWebWhatsApp(!/android|iphone|ipad|ipod/.test(ua));
  }, []);

  const updateFilter = useCallback((key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const runAction = useCallback(
    async (lead: Lead, action: string, extra?: Record<string, unknown>) => {
      setUpdatingId(lead.id);
      setError(null);
      try {
        const headers = await buildHeaders();
        headers["Content-Type"] = "application/json";
        const res = await fetch("/api/admin/leads-os", {
          method: "PATCH",
          headers,
          body: JSON.stringify({ id: lead.id, action, ...extra }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        setCallOutcomeLeadId(null);
        await fetchData();
      } catch (err: any) {
        setError(err?.message || "Errore aggiornamento lead");
      } finally {
        setUpdatingId(null);
      }
    },
    [fetchData],
  );

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-2 px-6 py-10">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <p className="text-lg font-semibold text-slate-800">Accesso riservato a {allowedEmail}</p>
      </div>
    );
  }

  const kpis = data?.kpis;
  const dayDeltaTone = (kpis?.delta || 0) >= 0 ? "good" : "bad";
  const weekDeltaTone = (kpis?.weekDelta || 0) >= 0 ? "good" : "bad";

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Admin
          </p>
          <h1 className="text-2xl font-black leading-tight text-slate-950 sm:text-3xl">Lead OS</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/leads"
            className={subtleButtonClass}
          >
            Lead follow-up
          </Link>
          <Link
            href="/admin/black-followups"
            className={subtleButtonClass}
          >
            Black follow-up
          </Link>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            Aggiorna
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <AlertTriangle size={16} />
          {error}
        </div>
      ) : null}

      <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.8fr)]">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-950">Nuovi lead raccolti</h2>
                <p className="text-xs font-medium text-slate-500">
                  {filters.days} giorni - nuovi contatti per data di ingresso
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                <TrendingUp size={15} />
                {kpis ? `${kpis.weekDeltaPct >= 0 ? "+" : ""}${kpis.weekDeltaPct}% settimanale` : "-"}
              </div>
            </div>
            <ChartContainer
              config={{
                total: { label: "Nuovi lead", color: "#0f172a" },
                hot: { label: "Hot", color: "#e11d48" },
              }}
              className="h-[260px] w-full"
            >
              <AreaChart data={data?.chart || []} margin={{ left: 2, right: 8, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="leadTotalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDayLabel}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--color-total)"
                  fill="url(#leadTotalGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="hot"
                  stroke="var(--color-hot)"
                  fill="transparent"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <KpiCard
              label="Nuovi oggi"
              value={kpis?.today ?? "-"}
              detail={`${(kpis?.delta || 0) >= 0 ? "+" : ""}${kpis?.delta ?? 0} vs ieri (${(kpis?.deltaPct || 0) >= 0 ? "+" : ""}${kpis?.deltaPct ?? 0}%)`}
              tone={dayDeltaTone}
            />
            <KpiCard
              label="Ultimi 7 giorni"
              value={kpis?.last7 ?? "-"}
              detail={`${(kpis?.weekDelta || 0) >= 0 ? "+" : ""}${kpis?.weekDelta ?? 0} vs prima (${(kpis?.weekDeltaPct || 0) >= 0 ? "+" : ""}${kpis?.weekDeltaPct ?? 0}%)`}
              tone={weekDeltaTone}
            />
            <KpiCard
              label="Lead attivi"
              value={kpis?.active ?? "-"}
              detail="in lavorazione"
              tone="neutral"
            />
            <KpiCard
              label="Hot"
              value={kpis?.hot ?? "-"}
              detail="alta priorita"
              tone="neutral"
            />
          </div>
        </div>
      </section>

      <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-950">Filtri</h2>
            <p className="text-xs font-medium text-slate-500">
              Coda, source, funnel, stato e periodo.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <label className="relative sm:col-span-2 lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.q}
              onChange={(e) => updateFilter("q", e.target.value)}
              placeholder="Cerca nome, numero, email, note"
              className={`${controlClass} bg-slate-50 pl-9`}
            />
          </label>
          <select
            value={filters.source}
            onChange={(e) => updateFilter("source", e.target.value)}
            className={controlClass}
          >
            <option value="all">Tutte le source</option>
            {(data?.filters.sources || []).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={filters.funnel}
            onChange={(e) => updateFilter("funnel", e.target.value)}
            className={controlClass}
          >
            <option value="all">Tutti i funnel</option>
            {(data?.filters.funnels || []).map((item) => (
              <option key={item} value={item}>
                {funnelLabel(item)}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => updateFilter("status", e.target.value)}
            className={controlClass}
          >
            <option value="active">Attivi</option>
            <option value="all">Tutti gli stati</option>
            <option value="completed">Completati</option>
            <option value="dropped">Scartati</option>
          </select>
          <select
            value={filters.queue}
            onChange={(e) => updateFilter("queue", e.target.value)}
            className={controlClass}
          >
            <option value="due">Da chiamare ora</option>
            <option value="scheduled">Programmato</option>
            <option value="all">Tutta la coda</option>
          </select>
          <select
            value={filters.responseStatus}
            onChange={(e) => updateFilter("responseStatus", e.target.value)}
            className={controlClass}
          >
            <option value="all">Tutte le risposte</option>
            <option value="pending">Da contattare</option>
            <option value="responded">Ha risposto</option>
            <option value="no_response">Non risponde</option>
            <option value="paused">In pausa</option>
          </select>
          <select
            value={filters.temperature}
            onChange={(e) => updateFilter("temperature", e.target.value)}
            className={controlClass}
          >
            <option value="all">Tutte le temperature</option>
            <option value="hot">Caldi</option>
            <option value="warm">Tiepidi</option>
            <option value="cold">Freddi</option>
          </select>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => updateFilter("dateFrom", e.target.value)}
            className={controlClass}
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => updateFilter("dateTo", e.target.value)}
            className={controlClass}
          />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-base font-bold text-slate-950">Coda per temperatura</h2>
            <p className="text-xs font-medium text-slate-500">
              {data?.totalFiltered ?? 0} lead filtrati - {filters.queue === "due" ? "pronti da chiamare" : filters.queue === "scheduled" ? "programmati" : "tutta la coda"}
            </p>
          </div>
          {loading ? (
            <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              Carico
            </span>
          ) : null}
        </div>

        <div className="divide-y divide-slate-100">
          {(data?.leads || []).length === 0 ? (
            <div className="px-4 py-8 text-sm font-semibold text-slate-500">Nessun lead.</div>
          ) : (
            (data?.leads || []).map((lead) => {
              const href = buildContactHref(lead, preferWebWhatsApp);
              const busy = updatingId === lead.id;
              return (
                <div key={lead.id} className="px-4 py-4">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(180px,0.85fr)_minmax(220px,1fr)] lg:items-center">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold ${toneForTemperature(
                            lead.temperatureLabel,
                          )}`}
                        >
                          <Flame size={13} />
                          {temperatureLabel(lead.temperatureLabel)} {lead.temperatureScore ?? 0}
                        </span>
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                          {formatAge(lead.leadAgeDays)}
                        </span>
                        <span className="max-w-full truncate rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                          {funnelLabel(lead.funnel)}
                        </span>
                      </div>
                      <p className="truncate text-base font-bold text-slate-950">
                        {lead.fullName || lead.email || lead.phone || lead.instagramHandle || "Lead"}
                      </p>
                      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
                        {lead.phone ? (
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <Phone size={13} />
                            <span className="truncate">{lead.phone}</span>
                          </span>
                        ) : null}
                        {lead.email ? (
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <Mail size={13} />
                            <span className="truncate break-all">{lead.email}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="min-w-0 space-y-1 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {statusLabel(lead.status)}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {responseLabel(lead.responseStatus)}
                        </span>
                      </div>
                      <p className="inline-flex max-w-full items-center gap-1 text-xs font-medium text-slate-500">
                        <Clock3 size={13} />
                        <span className="truncate">Prossimo: {formatDate(lead.nextFollowUpAt)}</span>
                      </p>
                      <p className="truncate text-xs font-medium text-slate-500">
                        Source: {lead.source || "-"} - Step {lead.currentStep + 1}
                      </p>
                    </div>

                    <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
                        >
                          <MessageCircle size={14} />
                          Apri contatto
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setSalesCallAt(defaultScheduleValue());
                          setCallOutcomeLeadId((current) => (current === lead.id ? null : lead.id));
                        }}
                        disabled={busy}
                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <PhoneCall size={14} />}
                        Chiamato
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const name =
                            lead.fullName || lead.email || lead.phone || lead.instagramHandle || "questo lead";
                          if (
                            window.confirm(
                              `Vuoi eliminare definitivamente ${name} dal database? Questa azione non si puo annullare.`,
                            )
                          ) {
                            runAction(lead, "delete");
                          }
                        }}
                        disabled={busy}
                        className="inline-flex min-h-9 max-w-full items-center justify-center gap-2 rounded-md border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:opacity-60"
                      >
                        <Trash2 size={14} />
                        Elimina
                      </button>
                    </div>
                  </div>
                  {lead.note ? (
                    <p className="mt-3 line-clamp-2 text-sm font-medium text-slate-600">
                      {lead.note}
                    </p>
                  ) : null}
                  {callOutcomeLeadId === lead.id ? (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-slate-950">Esito chiamata</p>
                          <p className="text-xs font-medium text-slate-500">
                            Scegli cosa deve succedere nella coda.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCallOutcomeLeadId(null)}
                          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Chiudi
                        </button>
                      </div>
                      <div className="grid gap-2 md:grid-cols-3">
                        <button
                          type="button"
                          onClick={() => runAction(lead, "no_answer")}
                          disabled={busy}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                        >
                          <XCircle size={14} />
                          Non ha risposto - domani
                        </button>
                        <button
                          type="button"
                          onClick={() => runAction(lead, "not_closed")}
                          disabled={busy}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-60"
                        >
                          <Clock3 size={14} />
                          Non chiuso - +7 giorni
                        </button>
                        <div className="flex min-w-0 flex-col gap-2 rounded-md border border-emerald-200 bg-white p-2">
                          <label className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                            <CalendarDays size={14} />
                            Data call vendita
                          </label>
                          <input
                            type="datetime-local"
                            value={salesCallAt}
                            onChange={(e) => setSalesCallAt(e.target.value)}
                            className="h-9 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              runAction(lead, "schedule_sales_call", {
                                nextFollowUpAt: new Date(salesCallAt).toISOString(),
                              })
                            }
                            disabled={busy || !salesCallAt}
                            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                          >
                            <CheckCircle2 size={14} />
                            Fissata call
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>
      </div>
    </div>
  );
}
