"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type ShortVideoStatus = "girato" | "editato" | "pubblicato";

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

type WorkspaceItem = {
  key: string;
  id: string | null;
  script: string;
  hook: string;
  format: string;
  durationSec: string;
  status: ShortVideoStatus;
  publishedAt: string;
  views: string;
  isSaving: boolean;
  lastSavedAt: string | null;
  hasChanges: boolean;
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
const STATUS_LABELS: Record<ShortVideoStatus, string> = {
  girato: "Girato",
  editato: "Editato",
  pubblicato: "Pubblicato",
};
const STATUS_BADGES: Record<ShortVideoStatus, string> = {
  girato: "bg-amber-100 text-amber-700",
  editato: "bg-sky-100 text-sky-700",
  pubblicato: "bg-emerald-100 text-emerald-700",
};
const STATUS_OPTIONS: Array<{ value: ShortVideoStatus; label: string }> = [
  { value: "girato", label: "Girato" },
  { value: "editato", label: "Editato" },
  { value: "pubblicato", label: "Pubblicato" },
];

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

function formatRomeYmdFromIso(iso?: string | null) {
  if (!iso) return formatRomeYmd();
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return formatRomeYmd();
  return formatRomeYmd(date);
}

function toRomeIso(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const date = romeDateToUtc(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function getEmptyFormState(): VideoFormState {
  return {
    script: "",
    hook: "",
    format: "",
    durationSec: "",
    status: "girato",
    publishedAt: formatRomeYmd(),
    views: "",
  };
}

function getFormatLabel(value?: string | null) {
  const trimmed = normalizeValue(value);
  return trimmed || FORMAT_FALLBACK;
}

function buildWorkspaceItemFromVideo(video: ShortVideo): WorkspaceItem {
  return {
    key: video.id,
    id: video.id,
    script: video.script ?? "",
    hook: video.hook ?? "",
    format: video.format ?? "",
    durationSec:
      video.durationSec !== null && video.durationSec !== undefined ? String(video.durationSec) : "",
    status: video.status,
    publishedAt: formatRomeYmdFromIso(video.publishedAt),
    views: video.views !== null && video.views !== undefined ? String(video.views) : "",
    isSaving: false,
    lastSavedAt: null,
    hasChanges: false,
  };
}

function buildWorkspaceItemNew(): WorkspaceItem {
  const form = getEmptyFormState();
  return {
    key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    id: null,
    script: form.script,
    hook: form.hook,
    format: form.format,
    durationSec: form.durationSec,
    status: form.status,
    publishedAt: form.publishedAt,
    views: form.views,
    isSaving: false,
    lastSavedAt: null,
    hasChanges: false,
  };
}

export default function ContentProductionDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [videos, setVideos] = useState<ShortVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [workspaceItems, setWorkspaceItems] = useState<WorkspaceItem[]>([]);
  const [workspaceErrors, setWorkspaceErrors] = useState<Record<string, string>>({});
  const workbenchRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<WorkspaceItem[]>([]);

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
    () => videos.filter((video) => video.status !== "pubblicato"),
    [videos]
  );
  const published = useMemo(
    () => videos.filter((video) => video.status === "pubblicato"),
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

  const recentPublished = useMemo(() => {
    return [...published]
      .sort((a, b) => getTimestamp(b.publishedAt || b.updatedAt) - getTimestamp(a.publishedAt || a.updatedAt))
      .slice(0, 6);
  }, [published]);

  const topVideos = useMemo(() => {
    return [...published]
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
      .slice(0, 5);
  }, [published]);

  const bottomVideos = useMemo(() => {
    return [...published]
      .sort((a, b) => (a.views ?? 0) - (b.views ?? 0))
      .slice(0, 5);
  }, [published]);

  const formatStats = useMemo<FormatStats[]>(() => {
    const map = new Map<string, FormatStats>();
    for (const video of published) {
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
  }, [published]);

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
    () => published.reduce((acc, video) => acc + (video.views ?? 0), 0),
    [published]
  );
  const avgViews = published.length ? Math.round(totalViews / published.length) : 0;
  const activeFormats = useMemo(() => {
    const formats = new Set<string>();
    for (const video of videos) {
      const value = normalizeValue(video.format);
      if (value) formats.add(value);
    }
    return formats.size;
  }, [videos]);
  const workspaceOpenIds = useMemo(() => {
    return new Set(
      workspaceItems
        .map((item) => item.id)
        .filter((id): id is string => Boolean(id))
    );
  }, [workspaceItems]);

  useEffect(() => {
    workspaceRef.current = workspaceItems;
  }, [workspaceItems]);

  const addWorkspaceItem = useCallback((video?: ShortVideo) => {
    setWorkspaceItems((prev) => {
      if (video) {
        if (prev.some((item) => item.id === video.id)) return prev;
        return [...prev, buildWorkspaceItemFromVideo(video)];
      }
      return [...prev, buildWorkspaceItemNew()];
    });
    if (workbenchRef.current) {
      workbenchRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const removeWorkspaceItem = useCallback((key: string) => {
    setWorkspaceItems((prev) => prev.filter((item) => item.key !== key));
    setWorkspaceErrors((prev) => {
      if (!(key in prev)) return prev;
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const updateWorkspaceField = useCallback(
    (key: string, field: keyof VideoFormState, value: string) => {
      setWorkspaceItems((prev) =>
        prev.map((item) =>
          item.key === key ? { ...item, [field]: value, hasChanges: true } : item
        )
      );
      setWorkspaceErrors((prev) => {
        if (!(key in prev)) return prev;
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    },
    []
  );

  const validateWorkspaceItem = useCallback((item: WorkspaceItem) => {
    const script = normalizeValue(item.script);
    const hook = normalizeValue(item.hook);
    const format = normalizeValue(item.format);
    if (!script || !hook || !format) {
      return { ok: false, message: "Inserisci script, hook e format." };
    }
    if (item.status === "pubblicato") {
      const durationSec = parseNumber(item.durationSec);
      const views = parseNumber(item.views);
      const publishedAtIso = toRomeIso(item.publishedAt);
      if (durationSec === null) {
        return { ok: false, message: "Inserisci la durata per i video pubblicati." };
      }
      if (views === null) {
        return { ok: false, message: "Inserisci le views per i video pubblicati." };
      }
      if (!publishedAtIso) {
        return { ok: false, message: "Inserisci la data di pubblicazione." };
      }
    }
    return { ok: true, message: "" };
  }, []);

  const saveWorkspaceItem = useCallback(
    async (item: WorkspaceItem, options?: { auto?: boolean }) => {
      if (item.isSaving) return;
      const validation = validateWorkspaceItem(item);
      if (!validation.ok) {
        if (!options?.auto) {
          setWorkspaceErrors((prev) => ({ ...prev, [item.key]: validation.message }));
        }
        return;
      }

      const script = normalizeValue(item.script);
      const hook = normalizeValue(item.hook);
      const format = normalizeValue(item.format);
      const durationSec = parseNumber(item.durationSec);
      const views = parseNumber(item.views);
      const publishedAtIso = item.status === "pubblicato" ? toRomeIso(item.publishedAt) : null;

      setWorkspaceItems((prev) =>
        prev.map((row) => (row.key === item.key ? { ...row, isSaving: true } : row))
      );
      try {
        const headers = await buildHeaders();
        headers["Content-Type"] = "application/json";
        const payload = {
          script,
          hook,
          format,
          durationSec,
          status: item.status,
          publishedAt: publishedAtIso,
          views,
        };
        const res = await fetch("/api/admin/content-production", {
          method: item.id ? "PATCH" : "POST",
          headers,
          body: JSON.stringify(item.id ? { id: item.id, ...payload } : payload),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const details = [json?.error, json?.details].filter(Boolean).join(" · ");
          throw new Error(details || `HTTP ${res.status}`);
        }
        if (json?.video) {
          setVideos((prev) =>
            item.id
              ? prev.map((video) => (video.id === item.id ? json.video : video))
              : [json.video, ...prev]
          );
          const updated = {
            ...buildWorkspaceItemFromVideo(json.video),
            lastSavedAt: new Date().toISOString(),
            hasChanges: false,
          };
          setWorkspaceItems((prev) => {
            const index = prev.findIndex((row) => row.key === item.key);
            const filtered = prev.filter(
              (row) => row.key !== item.key && row.id !== updated.id
            );
            if (index >= 0) {
              filtered.splice(Math.min(index, filtered.length), 0, updated);
              return filtered;
            }
            return [...filtered, updated];
          });
          setWorkspaceErrors((prev) => {
            if (!(item.key in prev)) return prev;
            const { [item.key]: _, ...rest } = prev;
            return rest;
          });
        } else {
          await fetchVideos();
          setWorkspaceItems((prev) =>
            prev.map((row) =>
              row.key === item.key
                ? { ...row, isSaving: false, hasChanges: false, lastSavedAt: new Date().toISOString() }
                : row
            )
          );
        }
      } catch (err: any) {
        if (!options?.auto) {
          setWorkspaceErrors((prev) => ({
            ...prev,
            [item.key]: err?.message || "Errore salvataggio bozza",
          }));
        }
        setWorkspaceItems((prev) =>
          prev.map((row) => (row.key === item.key ? { ...row, isSaving: false } : row))
        );
        return;
      }
      setWorkspaceItems((prev) =>
        prev.map((row) => (row.key === item.key ? { ...row, isSaving: false } : row))
      );
    },
    [fetchVideos, validateWorkspaceItem]
  );

  const saveWorkspaceItemRef = useRef(saveWorkspaceItem);
  useEffect(() => {
    saveWorkspaceItemRef.current = saveWorkspaceItem;
  }, [saveWorkspaceItem]);

  useEffect(() => {
    const interval = setInterval(() => {
      const items = workspaceRef.current;
      for (const item of items) {
        if (item.hasChanges && !item.isSaving) {
          saveWorkspaceItemRef.current(item, { auto: true });
        }
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (video: ShortVideo, nextStatus: ShortVideoStatus) => {
    if (nextStatus === video.status) return;
    if (nextStatus === "pubblicato" && (video.durationSec === null || video.views === null)) {
      setError("Per pubblicare inserisci durata e views.");
      addWorkspaceItem(video);
      return;
    }

    setStatusUpdatingId(video.id);
    setError(null);
    try {
      const headers = await buildHeaders();
      headers["Content-Type"] = "application/json";
      const payload: Record<string, any> = {
        id: video.id,
        status: nextStatus,
      };
      if (nextStatus === "pubblicato") {
        payload.durationSec = video.durationSec;
        payload.views = video.views;
        payload.publishedAt =
          video.publishedAt || toRomeIso(formatRomeYmd()) || new Date().toISOString();
      } else {
        payload.publishedAt = null;
      }
      const res = await fetch("/api/admin/content-production", {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const details = [json?.error, json?.details].filter(Boolean).join(" · ");
        throw new Error(details || `HTTP ${res.status}`);
      }
      if (json?.video) {
        setVideos((prev) => prev.map((row) => (row.id === video.id ? json.video : row)));
      } else {
        await fetchVideos();
      }
    } catch (err: any) {
      setError(err?.message || "Errore aggiornamento stato");
    } finally {
      setStatusUpdatingId(null);
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

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-center lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Script in corso
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              Pipeline creativa
            </h2>
            <p className="text-sm text-slate-600">
              Bozze pronte per essere finalizzate.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-end">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              <Video size={14} />
              {drafts.length} bozze
            </span>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <ListFilter size={16} className="text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cerca script, hook, format"
                className="w-full min-w-[200px] bg-transparent text-sm text-slate-800 outline-none"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <Loader2 size={16} className="animate-spin" />
            Carico le bozze...
          </div>
        ) : filteredDrafts.length ? (
          <div className="mt-6 mx-auto grid max-w-5xl gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredDrafts.map((video) => {
              const isOpen = workspaceOpenIds.has(video.id);
              return (
              <div
                key={video.id}
                className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${STATUS_BADGES[video.status]}`}
                  >
                    <Video size={12} />
                    {STATUS_LABELS[video.status]}
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
                <p className="mt-3 text-sm text-slate-700">
                  {getScriptPreview(video.script, 180)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>Creato {formatDate(video.createdAt)}</span>
                  <span>Aggiornato {formatDate(video.updatedAt)}</span>
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">Stato</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={video.status}
                        onChange={(event) =>
                          handleStatusChange(video, event.target.value as ShortVideoStatus)
                        }
                        disabled={statusUpdatingId === video.id}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm outline-none transition focus:border-slate-400 disabled:opacity-60"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {statusUpdatingId === video.id ? (
                        <Loader2 size={14} className="animate-spin text-slate-400" />
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addWorkspaceItem(video)}
                      disabled={isOpen}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
                    >
                      {isOpen ? "Nel banco" : "Apri nel banco"}
                    </button>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Eye size={14} />
                      Views: {formatViews(video.views)}
                    </div>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        ) : (
          <p className="mt-5 text-center text-sm text-slate-500">
            Nessuna bozza in preparazione. Inserisci un nuovo script.
          </p>
        )}
      </section>

      <div className="mt-10 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Bozze attive
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{drafts.length}</p>
          <p className="text-xs text-slate-500">In preparazione</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Video pubblicati
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{published.length}</p>
          <p className="text-xs text-slate-500">Pubblicati</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Views medie
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">
            {formatViews(avgViews)}
          </p>
          <p className="text-xs text-slate-500">Solo pubblicati</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Format attivi
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{activeFormats}</p>
          <p className="text-xs text-slate-500">Tra bozze e pubblicati</p>
        </div>
      </div>

      <section
        ref={workbenchRef}
        className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Banco di lavoro
            </p>
            <h2 className="text-xl font-semibold text-slate-900">Editor largo</h2>
            <p className="text-sm text-slate-600">
              Apri piu script in parallelo. Autosave ogni 30s quando modifichi.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => addWorkspaceItem()}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              <Plus size={14} />
              Nuovo script
            </button>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Autosave 30s
            </span>
          </div>
        </div>

        {workspaceItems.length ? (
          <div className="mt-6 mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
            {workspaceItems.map((item) => (
              <div
                key={item.key}
                className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {item.id ? "Script in lavorazione" : "Nuovo script"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGES[item.status]}`}
                      >
                        {STATUS_LABELS[item.status]}
                      </span>
                      {item.lastSavedAt ? (
                        <span className="text-[11px] text-slate-500">
                          Salvato {formatDateTime(item.lastSavedAt)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Mai salvato</span>
                      )}
                      {item.isSaving ? (
                        <span className="text-[11px] text-slate-500">Salvataggio...</span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeWorkspaceItem(item.key)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Rimuovi
                  </button>
                </div>

                <textarea
                  rows={8}
                  value={item.script}
                  onChange={(event) =>
                    updateWorkspaceField(item.key, "script", event.target.value)
                  }
                  placeholder="Scrivi lo script o la scaletta..."
                  className="mt-4 w-full min-h-[240px] rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                />

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Hook</label>
                    <input
                      type="text"
                      value={item.hook}
                      onChange={(event) =>
                        updateWorkspaceField(item.key, "hook", event.target.value)
                      }
                      placeholder="Errore comune, promessa..."
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Format</label>
                    <input
                      type="text"
                      value={item.format}
                      onChange={(event) =>
                        updateWorkspaceField(item.key, "format", event.target.value)
                      }
                      placeholder="Checklist, Q&A..."
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Stato</label>
                    <select
                      value={item.status}
                      onChange={(event) =>
                        updateWorkspaceField(
                          item.key,
                          "status",
                          event.target.value as ShortVideoStatus
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Durata (sec)</label>
                    <input
                      type="number"
                      min="0"
                      value={item.durationSec}
                      onChange={(event) =>
                        updateWorkspaceField(item.key, "durationSec", event.target.value)
                      }
                      placeholder="40"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Views</label>
                    <input
                      type="number"
                      min="0"
                      value={item.views}
                      onChange={(event) =>
                        updateWorkspaceField(item.key, "views", event.target.value)
                      }
                      placeholder="12000"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Data pubblicazione
                    </label>
                    <input
                      type="date"
                      value={item.publishedAt}
                      onChange={(event) =>
                        updateWorkspaceField(item.key, "publishedAt", event.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => saveWorkspaceItem(item)}
                      disabled={item.isSaving}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
                    >
                      <Plus size={16} />
                      {item.isSaving ? "Salvataggio..." : "Salva ora"}
                    </button>
                  </div>
                </div>

                {workspaceErrors[item.key] ? (
                  <p className="mt-3 text-xs text-rose-600">{workspaceErrors[item.key]}</p>
                ) : null}

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {item.hasChanges
                      ? "Modifiche non salvate"
                      : item.id
                        ? "Allineato"
                        : "Nuovo non salvato"}
                  </span>
                  <span>Autosave attivo</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 mx-auto max-w-4xl rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-sm text-slate-500">
            Nessuno script nel banco di lavoro. Aggiungi dal pannello sopra o da una
            bozza.
          </div>
        )}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
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
                  Ordine basato sulle views degli ultimi pubblicati.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                <BarChart3 size={14} />
                {published.length} pubblicati
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
                      Nessun video pubblicato.
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
                    <p className="text-xs text-rose-700">Nessun video pubblicato.</p>
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
                Nessun format pubblicato per ora.
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Recenti
                </p>
                <h3 className="text-lg font-semibold text-slate-900">
                  Pubblicati di recente
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
                  Carico i pubblicati...
                </div>
              ) : recentPublished.length ? (
                recentPublished.map((video) => {
                  const isOpen = workspaceOpenIds.has(video.id);
                  return (
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
                      <button
                        type="button"
                        onClick={() => addWorkspaceItem(video)}
                        disabled={isOpen}
                        className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-60"
                      >
                        {isOpen ? "Nel banco" : "Apri"}
                      </button>
                    </div>
                  </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500">Nessun video pubblicato.</p>
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
                    <p className="text-xs text-emerald-700">Nessun format pubblicato.</p>
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
                    <p className="text-xs text-rose-700">Nessun format pubblicato.</p>
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
              {recentPublished.length ? (
                recentPublished.slice(0, 4).map((video) => (
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
