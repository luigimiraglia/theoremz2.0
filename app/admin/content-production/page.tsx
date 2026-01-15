"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Film,
  ListFilter,
  Loader2,
  Plus,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  Video,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { formatRomeYmd, romeDateToUtc } from "@/lib/rome-time";

type ShortVideoStatus = "draft" | "completed";

type ShortVideo = {
  id: string;
  script: string | null;
  views: number | null;
  publishedAt: string | null;
  hook: string | null;
  format: string | null;
  durationSec: number | null;
  status: ShortVideoStatus;
  createdAt: string | null;
  updatedAt: string | null;
};

type VideoFormState = {
  script: string;
  hook: string;
  format: string;
  durationSec: string;
  status: ShortVideoStatus;
  publishedAt: string;
  views: string;
};

type FormatStats = {
  format: string;
  count: number;
  totalViews: number;
  avgViews: number;
  videos: ShortVideo[];
};

type FormatRanking = {
  format: string;
  count: number;
  avgViews: number;
  best: ShortVideo;
  worst: ShortVideo;
};

const allowedEmail = "luigi.miraglia006@gmail.com";
const FALLBACK_LABEL = "n/d";
const FORMAT_FALLBACK = "Formato n/d";

async function buildHeaders() {
  const headers: Record<string, string> = {};
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth.currentUser?.getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch (err) {
    console.warn("[admin/content-production] missing firebase token", err);
  }
  return headers;
}

function getTimestamp(value?: string | null) {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
}

function formatDateTime(iso?: string | null) {
  if (!iso) return FALLBACK_LABEL;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return FALLBACK_LABEL;
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  });
}

function formatDate(iso?: string | null) {
  if (!iso) return FALLBACK_LABEL;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return FALLBACK_LABEL;
  return d.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "Europe/Rome",
  });
}

function formatViews(views?: number | null) {
  if (views === null || views === undefined) return FALLBACK_LABEL;
  return views.toLocaleString("it-IT");
}

function formatDuration(durationSec?: number | null) {
  if (!durationSec) return FALLBACK_LABEL;
  return `${durationSec}s`;
}

function normalizeValue(value?: string | null) {
  return (value || "").trim();
}

function getScriptPreview(script?: string | null, max = 140) {
  const cleaned = normalizeValue(script);
  if (!cleaned) return "Script non disponibile.";
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max)}...`;
}

function parseNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toRomeIso(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const date = romeDateToUtc(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function getFormatLabel(value?: string | null) {
  const trimmed = normalizeValue(value);
  return trimmed || FORMAT_FALLBACK;
}

export default function ContentProductionDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [videos, setVideos] = useState<ShortVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [form, setForm] = useState<VideoFormState>({
    script: "",
    hook: "",
    format: "",
    durationSec: "",
    status: "draft",
    publishedAt: formatRomeYmd(),
    views: "",
  });

  const hasAccess = useMemo(
    () => Boolean(user?.email && user.email.toLowerCase() === allowedEmail),
    [user?.email]
  );

  const fetchVideos = useCallback(async () => {
    if (!hasAccess) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await buildHeaders();
      const res = await fetch("/api/admin/content-production", {
        headers,
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const details = [json?.error, json?.details].filter(Boolean).join(" · ");
        throw new Error(details || `HTTP ${res.status}`);
      }
      setVideos(Array.isArray(json?.videos) ? json.videos : []);
    } catch (err: any) {
      setError(err?.message || "Errore caricamento contenuti");
    } finally {
      setLoading(false);
    }
  }, [hasAccess]);

  useEffect(() => {
    if (hasAccess) fetchVideos();
  }, [hasAccess, fetchVideos]);

  const drafts = useMemo(
    () => videos.filter((video) => video.status === "draft"),
    [videos]
  );
  const completed = useMemo(
    () => videos.filter((video) => video.status === "completed"),
    [videos]
  );

  const sortedDrafts = useMemo(() => {
    return [...drafts].sort(
      (a, b) => getTimestamp(b.updatedAt || b.createdAt) - getTimestamp(a.updatedAt || a.createdAt)
    );
  }, [drafts]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredDrafts = useMemo(() => {
    if (!normalizedQuery) return sortedDrafts;
    return sortedDrafts.filter((video) => {
      const haystack = [
        video.script,
        video.hook,
        video.format,
        video.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, sortedDrafts]);

  const recentCompleted = useMemo(() => {
    return [...completed]
      .sort((a, b) => getTimestamp(b.publishedAt || b.updatedAt) - getTimestamp(a.publishedAt || a.updatedAt))
      .slice(0, 6);
  }, [completed]);

  const topVideos = useMemo(() => {
    return [...completed]
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
      .slice(0, 5);
  }, [completed]);

  const bottomVideos = useMemo(() => {
    return [...completed]
      .sort((a, b) => (a.views ?? 0) - (b.views ?? 0))
      .slice(0, 5);
  }, [completed]);

  const formatStats = useMemo<FormatStats[]>(() => {
    const map = new Map<string, FormatStats>();
    for (const video of completed) {
      const key = getFormatLabel(video.format);
      const views = video.views ?? 0;
      const current = map.get(key) || {
        format: key,
        count: 0,
        totalViews: 0,
        avgViews: 0,
        videos: [],
      };
      current.count += 1;
      current.totalViews += views;
      current.videos.push(video);
      current.avgViews = current.count ? Math.round(current.totalViews / current.count) : 0;
      map.set(key, current);
    }
    return Array.from(map.values()).sort((a, b) => b.avgViews - a.avgViews);
  }, [completed]);

  const bestFormats = useMemo(() => formatStats.slice(0, 3), [formatStats]);
  const worstFormats = useMemo(() => {
    return [...formatStats].sort((a, b) => a.avgViews - b.avgViews).slice(0, 3);
  }, [formatStats]);

  const formatRankings = useMemo<FormatRanking[]>(() => {
    return formatStats.map((stat) => {
      const sorted = [...stat.videos].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      return {
        format: stat.format,
        count: stat.count,
        avgViews: stat.avgViews,
        best,
        worst,
      };
    });
  }, [formatStats]);

  const totalViews = useMemo(
    () => completed.reduce((acc, video) => acc + (video.views ?? 0), 0),
    [completed]
  );
  const avgViews = completed.length ? Math.round(totalViews / completed.length) : 0;
  const activeFormats = useMemo(() => {
    const formats = new Set<string>();
    for (const video of videos) {
      const value = normalizeValue(video.format);
      if (value) formats.add(value);
    }
    return formats.size;
  }, [videos]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const script = normalizeValue(form.script);
    if (!script) {
      setError("Inserisci almeno lo script.");
      return;
    }
    setCreating(true);
    try {
      const headers = await buildHeaders();
      headers["Content-Type"] = "application/json";
      const payload = {
        script,
        hook: normalizeValue(form.hook) || null,
        format: normalizeValue(form.format) || null,
        durationSec: parseNumber(form.durationSec),
        status: form.status,
        publishedAt: form.status === "completed" ? toRomeIso(form.publishedAt) : null,
        views: parseNumber(form.views),
      };
      const res = await fetch("/api/admin/content-production", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const details = [json?.error, json?.details].filter(Boolean).join(" · ");
        throw new Error(details || `HTTP ${res.status}`);
      }
      if (json?.video) {
        setVideos((prev) => [json.video, ...prev]);
      } else {
        await fetchVideos();
      }
      setForm({
        script: "",
        hook: "",
        format: "",
        durationSec: "",
        status: "draft",
        publishedAt: formatRomeYmd(),
        views: "",
      });
    } catch (err: any) {
      setError(err?.message || "Errore salvataggio bozza");
    } finally {
      setCreating(false);
    }
  };

  const handleMarkCompleted = async (id: string) => {
    setMarkingId(id);
    setError(null);
    try {
      const headers = await buildHeaders();
      headers["Content-Type"] = "application/json";
      const res = await fetch("/api/admin/content-production", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ id, status: "completed" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const details = [json?.error, json?.details].filter(Boolean).join(" · ");
        throw new Error(details || `HTTP ${res.status}`);
      }
      if (json?.video) {
        setVideos((prev) => prev.map((video) => (video.id === id ? json.video : video)));
      } else {
        await fetchVideos();
      }
    } catch (err: any) {
      setError(err?.message || "Errore aggiornamento video");
    } finally {
      setMarkingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center">
        <Video className="h-6 w-6 animate-pulse text-slate-500" />
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Admin
            </p>
            <h1 className="text-3xl font-black text-slate-900 leading-tight">
              Produzione contenuti Shorts
            </h1>
            <p className="text-sm text-slate-600">
              Dashboard per script, performance e ranking dei format video.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/leads"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-slate-300"
            >
              <ListFilter size={16} />
              Leads
            </Link>
            <Link
              href="/admin/black-followups"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-slate-300"
            >
              <CheckCircle2 size={16} />
              Black follow-up
            </Link>
            <button
              onClick={fetchVideos}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
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

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Bozze attive
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{drafts.length}</p>
          <p className="text-xs text-slate-500">In preparazione</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Video completati
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{completed.length}</p>
          <p className="text-xs text-slate-500">Pubblicati</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Views medie
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">
            {formatViews(avgViews)}
          </p>
          <p className="text-xs text-slate-500">Solo completati</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Format attivi
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{activeFormats}</p>
          <p className="text-xs text-slate-500">Tra bozze e completati</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Pipeline
                </p>
                <h2 className="text-lg font-semibold text-slate-900">
                  Video in preparazione
                </h2>
                <p className="text-sm text-slate-600">
                  Script, hook, format e durata per i prossimi short.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ListFilter size={16} className="text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cerca script, hook, format"
                  className="w-full min-w-[220px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>
            </div>

            {loading ? (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <Loader2 size={16} className="animate-spin" />
                Carico le bozze...
              </div>
            ) : filteredDrafts.length ? (
              <div className="mt-4 space-y-3">
                {filteredDrafts.map((video) => (
                  <div
                    key={video.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-slate-700">
                            <Video size={12} />
                            Bozza
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-slate-600">
                            <Film size={12} />
                            {getFormatLabel(video.format)}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-slate-600">
                            <Clock3 size={12} />
                            {formatDuration(video.durationSec)}
                          </span>
                          {video.hook ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-slate-600">
                              Hook: {video.hook}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-slate-700">
                          {getScriptPreview(video.script, 180)}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span>Creato {formatDate(video.createdAt)}</span>
                          <span>Aggiornato {formatDate(video.updatedAt)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-2">
                        <button
                          type="button"
                          onClick={() => handleMarkCompleted(video.id)}
                          disabled={markingId === video.id}
                          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
                        >
                          {markingId === video.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          {markingId === video.id ? "Salvataggio..." : "Segna completato"}
                        </button>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Eye size={14} />
                          Views: {formatViews(video.views)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Nessuna bozza in preparazione. Inserisci un nuovo script.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Performance
                </p>
                <h2 className="text-lg font-semibold text-slate-900">
                  Migliori e peggiori video
                </h2>
                <p className="text-sm text-slate-600">
                  Ordine basato sulle views degli ultimi completati.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                <BarChart3 size={14} />
                {completed.length} completati
              </span>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <TrendingUp size={16} />
                  Migliori video
                </div>
                <div className="mt-3 space-y-2">
                  {topVideos.length ? (
                    topVideos.map((video) => (
                      <div
                        key={video.id}
                        className="rounded-lg border border-emerald-100 bg-white px-3 py-2"
                      >
                        <p className="text-xs font-semibold text-slate-900">
                          {getScriptPreview(video.script, 80)}
                        </p>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                          <span>{getFormatLabel(video.format)}</span>
                          <span>{formatViews(video.views)} views</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-emerald-700">
                      Nessun video completato.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-rose-700">
                  <TrendingDown size={16} />
                  Peggiori video
                </div>
                <div className="mt-3 space-y-2">
                  {bottomVideos.length ? (
                    bottomVideos.map((video) => (
                      <div
                        key={video.id}
                        className="rounded-lg border border-rose-100 bg-white px-3 py-2"
                      >
                        <p className="text-xs font-semibold text-slate-900">
                          {getScriptPreview(video.script, 80)}
                        </p>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                          <span>{getFormatLabel(video.format)}</span>
                          <span>{formatViews(video.views)} views</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-rose-700">Nessun video completato.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Ranking format
                </p>
                <h2 className="text-lg font-semibold text-slate-900">
                  Migliore e peggiore per format
                </h2>
                <p className="text-sm text-slate-600">
                  Confronto per format con media views e top/bottom video.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                <Film size={14} />
                {formatStats.length} format
              </span>
            </div>

            {formatRankings.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {formatRankings.map((row) => (
                  <div
                    key={row.format}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                  >
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                      <span>{row.format}</span>
                      <span className="text-xs text-slate-500">
                        media {formatViews(row.avgViews)} · {row.count} video
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-100 bg-white px-3 py-2">
                        <div>
                          <p className="font-semibold text-emerald-700">Top</p>
                          <p className="text-slate-700">
                            {getScriptPreview(row.best.script, 70)}
                          </p>
                        </div>
                        <span className="font-semibold text-emerald-700">
                          {formatViews(row.best.views)}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3 rounded-lg border border-rose-100 bg-white px-3 py-2">
                        <div>
                          <p className="font-semibold text-rose-700">Bottom</p>
                          <p className="text-slate-700">
                            {getScriptPreview(row.worst.script, 70)}
                          </p>
                        </div>
                        <span className="font-semibold text-rose-700">
                          {formatViews(row.worst.views)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Nessun format completato per ora.
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Nuova bozza
                </p>
                <h3 className="text-lg font-semibold text-slate-900">
                  Aggiungi uno script
                </h3>
                <p className="text-sm text-slate-600">
                  Tutti i campi sono facoltativi tranne lo script.
                </p>
              </div>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <Plus size={16} />
              </span>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Script</label>
                <textarea
                  rows={4}
                  value={form.script}
                  onChange={(event) => setForm((prev) => ({ ...prev, script: event.target.value }))}
                  placeholder="Scrivi lo script o la scaletta..."
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Hook</label>
                  <input
                    type="text"
                    value={form.hook}
                    onChange={(event) => setForm((prev) => ({ ...prev, hook: event.target.value }))}
                    placeholder="Errore comune, promessa..."
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Format</label>
                  <input
                    type="text"
                    value={form.format}
                    onChange={(event) => setForm((prev) => ({ ...prev, format: event.target.value }))}
                    placeholder="Checklist, Q&A..."
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Durata (sec)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.durationSec}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, durationSec: event.target.value }))
                    }
                    placeholder="40"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Stato</label>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        status: event.target.value as ShortVideoStatus,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                  >
                    <option value="draft">Bozza</option>
                    <option value="completed">Completato</option>
                  </select>
                </div>
              </div>

              {form.status === "completed" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Data pubblicazione
                    </label>
                    <input
                      type="date"
                      value={form.publishedAt}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, publishedAt: event.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Views</label>
                    <input
                      type="number"
                      min="0"
                      value={form.views}
                      onChange={(event) => setForm((prev) => ({ ...prev, views: event.target.value }))}
                      placeholder="12000"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={creating}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
              >
                <Plus size={16} />
                {creating ? "Salvataggio..." : "Salva bozza"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Recenti
                </p>
                <h3 className="text-lg font-semibold text-slate-900">
                  Completati di recente
                </h3>
                <p className="text-sm text-slate-600">
                  Ultimi video pubblicati con views e format.
                </p>
              </div>
              <CalendarDays size={18} className="text-slate-400" />
            </div>

            <div className="mt-4 space-y-2">
              {loading ? (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <Loader2 size={16} className="animate-spin" />
                  Carico i completati...
                </div>
              ) : recentCompleted.length ? (
                recentCompleted.map((video) => (
                  <div
                    key={video.id}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2"
                  >
                    <p className="text-xs font-semibold text-slate-900">
                      {getScriptPreview(video.script, 70)}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span>{getFormatLabel(video.format)}</span>
                      <span>{formatDate(video.publishedAt)}</span>
                      <span>{formatViews(video.views)} views</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Nessun video completato.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Format
                </p>
                <h3 className="text-lg font-semibold text-slate-900">
                  Migliori e peggiori format
                </h3>
                <p className="text-sm text-slate-600">
                  Basato sulla media views per format.
                </p>
              </div>
              <Film size={18} className="text-slate-400" />
            </div>

            <div className="mt-4 grid gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <TrendingUp size={14} />
                  Format migliori
                </div>
                <div className="mt-2 space-y-2">
                  {bestFormats.length ? (
                    bestFormats.map((format) => (
                      <div
                        key={`best-${format.format}`}
                        className="flex items-center justify-between rounded-lg border border-emerald-100 bg-white px-3 py-2 text-[11px] text-slate-600"
                      >
                        <span className="font-semibold text-slate-900">
                          {format.format}
                        </span>
                        <span>{formatViews(format.avgViews)} views</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-emerald-700">Nessun format completo.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-700">
                  <TrendingDown size={14} />
                  Format peggiori
                </div>
                <div className="mt-2 space-y-2">
                  {worstFormats.length ? (
                    worstFormats.map((format) => (
                      <div
                        key={`worst-${format.format}`}
                        className="flex items-center justify-between rounded-lg border border-rose-100 bg-white px-3 py-2 text-[11px] text-slate-600"
                      >
                        <span className="font-semibold text-slate-900">
                          {format.format}
                        </span>
                        <span>{formatViews(format.avgViews)} views</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-rose-700">Nessun format completo.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Timeline
                </p>
                <h3 className="text-lg font-semibold text-slate-900">Ultime pubblicazioni</h3>
                <p className="text-sm text-slate-600">
                  Date e orari sincronizzati a Roma.
                </p>
              </div>
              <CalendarDays size={18} className="text-slate-400" />
            </div>
            <div className="mt-4 space-y-2">
              {recentCompleted.length ? (
                recentCompleted.slice(0, 4).map((video) => (
                  <div
                    key={`timeline-${video.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-[11px] text-slate-600"
                  >
                    <span className="font-semibold text-slate-900">
                      {getScriptPreview(video.script, 45)}
                    </span>
                    <span>{formatDateTime(video.publishedAt)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Nessuna timeline disponibile.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
