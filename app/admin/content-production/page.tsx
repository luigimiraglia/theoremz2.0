"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Circle,
  Eye,
  Film,
  Folder,
  ListFilter,
  Loader2,
  Plus,
  RefreshCcw,
  Settings,
  TrendingDown,
  TrendingUp,
  Video,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { formatRomeYmd, romeDateToUtc } from "@/lib/rome-time";

type ShortVideoStatus = "bozza" | "girato" | "editato" | "pubblicato";

type ShortVideo = {
  id: string;
  title: string | null;
  script: string | null;
  views: number | null;
  publishedAt: string | null;
  hook: string | null;
  altHooks: string[] | null;
  format: string | null;
  editedFileName: string | null;
  durationSec: number | null;
  status: ShortVideoStatus;
  createdAt: string | null;
  updatedAt: string | null;
};

type VideoFormState = {
  title: string;
  script: string;
  hook: string;
  altHooks: string[];
  format: string;
  editedFileName: string;
  durationSec: string;
  status: ShortVideoStatus;
  publishedAt: string;
  views: string;
};

type WorkspaceItem = {
  key: string;
  id: string | null;
  title: string;
  script: string;
  hook: string;
  altHooks: string[];
  format: string;
  editedFileName: string;
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

type FormatFolder = {
  format: string;
  count: number;
  latestAt: string | null;
  videos: ShortVideo[];
};

type StatusFolder = {
  status: ShortVideoStatus;
  count: number;
  latestAt: string | null;
  formats: FormatFolder[];
};

type EditorialPlanItem = {
  format: string;
  videoCount: string;
};

const allowedEmail = "luigi.miraglia006@gmail.com";
const FALLBACK_LABEL = "n/d";
const TITLE_FALLBACK = "Senza titolo";
const FORMAT_FALLBACK = "Formato n/d";
const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const STATUS_LABELS: Record<ShortVideoStatus, string> = {
  bozza: "Bozza",
  girato: "Girato",
  editato: "Editato",
  pubblicato: "Pubblicato",
};
const STATUS_BADGES: Record<ShortVideoStatus, string> = {
  bozza: "bg-slate-100 text-slate-700",
  girato: "bg-amber-100 text-amber-700",
  editato: "bg-sky-100 text-sky-700",
  pubblicato: "bg-emerald-100 text-emerald-700",
};
const STATUS_OPTIONS: Array<{ value: ShortVideoStatus; label: string }> = [
  { value: "bozza", label: "Bozza" },
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

function normalizeHookList(values: string[]) {
  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(trimmed);
  }
  return cleaned;
}

function sortFormatList(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b, "it-IT"));
}

function buildCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const days: Array<{
    key: string;
    ymd: string;
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
  }> = [];
  const today = new Date();
  for (let i = 0; i < 42; i += 1) {
    const dayNumber = i - startOffset + 1;
    const date = new Date(year, month, dayNumber);
    const isCurrentMonth = date.getMonth() === month;
    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();
    const ymd = formatRomeYmd(date);
    days.push({
      key: ymd,
      ymd,
      date,
      isCurrentMonth,
      isToday,
    });
  }
  return days;
}

function formatTitle(value?: string | null) {
  const trimmed = normalizeValue(value);
  return trimmed || TITLE_FALLBACK;
}

function stripHookFromScript(hook?: string | null, script?: string | null) {
  const hookLine = normalizeValue(hook);
  const rawScript = script || "";
  if (!hookLine || !rawScript) return rawScript;
  const normalized = rawScript.replace(/\r\n/g, "\n");
  const [firstLine, ...rest] = normalized.split("\n");
  if (normalizeValue(firstLine) === hookLine) {
    return rest.join("\n").replace(/^\n+/, "");
  }
  return rawScript;
}

function buildScriptText(hook?: string | null, script?: string | null) {
  const hookLine = normalizeValue(hook);
  const body = normalizeValue(stripHookFromScript(hookLine, script));
  if (hookLine && body) return `${hookLine}\n${body}`;
  return hookLine || body || "";
}

function getScriptPreview(script?: string | null, max = 140) {
  const cleaned = normalizeValue(script);
  if (!cleaned) return "Script non disponibile.";
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max)}...`;
}

function getScriptPreviewWithHook(hook?: string | null, script?: string | null, max = 140) {
  const hookLine = normalizeValue(hook);
  const body = normalizeValue(stripHookFromScript(hookLine, script));
  if (!hookLine) return getScriptPreview(body, max);
  if (!body) return hookLine;
  return `${hookLine}\n${getScriptPreview(body, max)}`;
}

function mergeHookAndScript(hook: string, script: string) {
  const hookLine = hook.replace(/\r\n/g, "\n");
  const body = script.replace(/\r\n/g, "\n");
  if (!hookLine) return body;
  if (!body) return hookLine;
  if (body.startsWith("\n")) return `${hookLine}${body}`;
  return `${hookLine}\n${body}`;
}

function splitHookAndScript(value: string) {
  const normalized = value.replace(/\r\n/g, "\n");
  const [firstLine, ...rest] = normalized.split("\n");
  const hookLine = firstLine ?? "";
  let body = rest.join("\n");
  if (!body && normalized.endsWith("\n")) {
    body = "\n";
  }
  return { hook: hookLine, script: body };
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
    title: "",
    script: "",
    hook: "",
    altHooks: [],
    format: "",
    editedFileName: "",
    durationSec: "",
    status: "bozza",
    publishedAt: formatRomeYmd(),
    views: "",
  };
}

function getFormatLabel(value?: string | null) {
  const trimmed = normalizeValue(value);
  return trimmed || FORMAT_FALLBACK;
}

function buildWorkspaceItemFromVideo(video: ShortVideo): WorkspaceItem {
  const cleanedScript = stripHookFromScript(video.hook, video.script);
  return {
    key: video.id,
    id: video.id,
    title: video.title ?? "",
    script: cleanedScript ?? "",
    hook: video.hook ?? "",
    altHooks: Array.isArray(video.altHooks) ? video.altHooks : [],
    format: normalizeValue(video.format ?? ""),
    editedFileName: video.editedFileName ?? "",
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
    title: form.title,
    script: form.script,
    hook: form.hook,
    altHooks: form.altHooks,
    format: form.format,
    editedFileName: form.editedFileName,
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
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const [activeStatus, setActiveStatus] = useState<ShortVideoStatus | null>(null);
  const [activeFormat, setActiveFormat] = useState<string | null>(null);
  const [formats, setFormats] = useState<string[]>([]);
  const [formatsLoading, setFormatsLoading] = useState(false);
  const [formatsError, setFormatsError] = useState<string | null>(null);
  const [formatPanelOpen, setFormatPanelOpen] = useState(false);
  const [newFormat, setNewFormat] = useState("");
  const [formatSaving, setFormatSaving] = useState(false);
  const [formatDeleting, setFormatDeleting] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [calendarSelected, setCalendarSelected] = useState<string | null>(
    () => formatRomeYmd()
  );
  const [calendarStatuses, setCalendarStatuses] = useState<Record<string, string>>({});
  const [calendarStatusLoading, setCalendarStatusLoading] = useState(false);
  const [planItems, setPlanItems] = useState<EditorialPlanItem[]>([]);
  const [planLoading, setPlanLoading] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planSavedAt, setPlanSavedAt] = useState<string | null>(null);
  const [planDirty, setPlanDirty] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);

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

  const fetchFormats = useCallback(async () => {
    if (!hasAccess) return;
    setFormatsLoading(true);
    setFormatsError(null);
    try {
      const headers = await buildHeaders();
      const res = await fetch("/api/admin/content-production-formats", {
        headers,
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const details = [json?.error, json?.details].filter(Boolean).join(" · ");
        throw new Error(details || `HTTP ${res.status}`);
      }
      const list = Array.isArray(json?.formats) ? json.formats : [];
      setFormats(sortFormatList(list));
    } catch (err: any) {
      setFormatsError(err?.message || "Errore caricamento format");
    } finally {
      setFormatsLoading(false);
    }
  }, [hasAccess]);

  useEffect(() => {
    if (hasAccess) {
      fetchVideos();
      fetchFormats();
    }
  }, [hasAccess, fetchVideos, fetchFormats]);

  const drafts = useMemo(
    () => videos.filter((video) => video.status !== "pubblicato"),
    [videos]
  );
  const published = useMemo(
    () => videos.filter((video) => video.status === "pubblicato"),
    [videos]
  );
  const toShoot = useMemo(
    () => videos.filter((video) => video.status === "bozza").length,
    [videos]
  );
  const toEdit = useMemo(
    () => videos.filter((video) => video.status === "girato").length,
    [videos]
  );
  const toPublish = useMemo(
    () => videos.filter((video) => video.status === "editato").length,
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
        video.title,
        video.script,
        video.hook,
        ...(video.altHooks ?? []),
        video.format,
        video.editedFileName,
        video.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, sortedDrafts]);

  const statusFolders = useMemo<StatusFolder[]>(() => {
    const statusMap = new Map<ShortVideoStatus, StatusFolder>();
    const formatMaps = new Map<ShortVideoStatus, Map<string, FormatFolder>>();
    for (const video of filteredDrafts) {
      const status = video.status;
      if (status === "pubblicato") continue;
      const statusFolder = statusMap.get(status) || {
        status,
        count: 0,
        latestAt: null,
        formats: [],
      };
      statusFolder.count += 1;
      const candidate = video.updatedAt || video.createdAt || null;
      if (candidate) {
        if (
          !statusFolder.latestAt ||
          getTimestamp(candidate) > getTimestamp(statusFolder.latestAt)
        ) {
          statusFolder.latestAt = candidate;
        }
      }
      statusMap.set(status, statusFolder);

      const formatLabel = getFormatLabel(video.format);
      const formatMap =
        formatMaps.get(status) || new Map<string, FormatFolder>();
      const formatFolder = formatMap.get(formatLabel) || {
        format: formatLabel,
        count: 0,
        latestAt: null,
        videos: [],
      };
      formatFolder.count += 1;
      formatFolder.videos.push(video);
      if (candidate) {
        if (
          !formatFolder.latestAt ||
          getTimestamp(candidate) > getTimestamp(formatFolder.latestAt)
        ) {
          formatFolder.latestAt = candidate;
        }
      }
      formatMap.set(formatLabel, formatFolder);
      formatMaps.set(status, formatMap);
    }
    const folders = Array.from(statusMap.values());
    for (const folder of folders) {
      const formatMap = formatMaps.get(folder.status);
      const formats = formatMap ? Array.from(formatMap.values()) : [];
      for (const formatFolder of formats) {
        formatFolder.videos.sort(
          (a, b) =>
            getTimestamp(b.updatedAt || b.createdAt) - getTimestamp(a.updatedAt || a.createdAt)
        );
      }
      folder.formats = formats.sort((a, b) => {
        const byRecent = getTimestamp(b.latestAt) - getTimestamp(a.latestAt);
        if (byRecent !== 0) return byRecent;
        return a.format.localeCompare(b.format);
      });
    }
    return folders.sort((a, b) => {
      const byRecent = getTimestamp(b.latestAt) - getTimestamp(a.latestAt);
      if (byRecent !== 0) return byRecent;
      return STATUS_LABELS[a.status].localeCompare(STATUS_LABELS[b.status]);
    });
  }, [filteredDrafts]);

  const activeStatusFolder = useMemo(() => {
    if (!activeStatus) return null;
    return statusFolders.find((folder) => folder.status === activeStatus) || null;
  }, [activeStatus, statusFolders]);

  const activeStatusFormats = activeStatusFolder?.formats ?? [];

  const activeFormatVideos = useMemo(() => {
    if (!activeStatus || !activeFormat) return [];
    return filteredDrafts.filter(
      (video) =>
        video.status === activeStatus && getFormatLabel(video.format) === activeFormat
    );
  }, [activeStatus, activeFormat, filteredDrafts]);

  const formatOptions = useMemo(() => {
    const set = new Set<string>();
    for (const value of formats) {
      const trimmed = normalizeValue(value);
      if (trimmed) set.add(trimmed);
    }
    for (const video of videos) {
      const value = normalizeValue(video.format);
      if (value) set.add(value);
    }
    for (const item of workspaceItems) {
      const value = normalizeValue(item.format);
      if (value) set.add(value);
    }
    for (const item of planItems) {
      const value = normalizeValue(item.format);
      if (value) set.add(value);
    }
    return sortFormatList(Array.from(set));
  }, [formats, videos, workspaceItems, planItems]);

  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth),
    [calendarMonth]
  );

  const calendarLabel = useMemo(
    () =>
      calendarMonth.toLocaleString("it-IT", {
        month: "long",
        year: "numeric",
      }),
    [calendarMonth]
  );

  const calendarRange = useMemo(() => {
    if (!calendarDays.length) {
      const today = formatRomeYmd();
      return { start: today, end: today };
    }
    return {
      start: calendarDays[0].ymd,
      end: calendarDays[calendarDays.length - 1].ymd,
    };
  }, [calendarDays]);

  const planTotal = useMemo(() => {
    return planItems.reduce((sum, item) => {
      const parsed = Number(item.videoCount);
      return Number.isFinite(parsed) ? sum + parsed : sum;
    }, 0);
  }, [planItems]);

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

  const updateWorkspaceScript = useCallback((key: string, value: string) => {
    const { hook, script } = splitHookAndScript(value);
    setWorkspaceItems((prev) =>
      prev.map((item) =>
        item.key === key
          ? { ...item, hook, script, hasChanges: true }
          : item
      )
    );
    setWorkspaceErrors((prev) => {
      if (!(key in prev)) return prev;
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const updateWorkspaceAltHook = useCallback(
    (key: string, index: number, value: string) => {
      setWorkspaceItems((prev) =>
        prev.map((item) => {
          if (item.key !== key) return item;
          const next = [...item.altHooks];
          next[index] = value;
          return { ...item, altHooks: next, hasChanges: true };
        })
      );
      setWorkspaceErrors((prev) => {
        if (!(key in prev)) return prev;
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    },
    []
  );

  const addWorkspaceAltHook = useCallback((key: string) => {
    setWorkspaceItems((prev) =>
      prev.map((item) =>
        item.key === key
          ? { ...item, altHooks: [...item.altHooks, ""], hasChanges: true }
          : item
      )
    );
    setWorkspaceErrors((prev) => {
      if (!(key in prev)) return prev;
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const removeWorkspaceAltHook = useCallback((key: string, index: number) => {
    setWorkspaceItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const next = item.altHooks.filter((_, i) => i !== index);
        return { ...item, altHooks: next, hasChanges: true };
      })
    );
    setWorkspaceErrors((prev) => {
      if (!(key in prev)) return prev;
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const validateWorkspaceItem = useCallback((item: WorkspaceItem) => {
    const title = normalizeValue(item.title);
    const script = normalizeValue(item.script);
    const hook = normalizeValue(item.hook);
    const format = normalizeValue(item.format);
    if (!title || !script || !hook || !format) {
      return { ok: false, message: "Inserisci titolo, script, hook e format." };
    }
    if (title.toLowerCase() === hook.toLowerCase()) {
      return { ok: false, message: "Il titolo non può essere uguale all'hook." };
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

      const title = normalizeValue(item.title);
      const script = normalizeValue(item.script);
      const hook = normalizeValue(item.hook);
      const altHooks = normalizeHookList(item.altHooks);
      const format = normalizeValue(item.format);
      const editedFileName = normalizeValue(item.editedFileName);
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
          title,
          script,
          hook,
          altHooks,
          format,
          editedFileName: editedFileName || null,
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

  const fetchPlan = useCallback(
    async () => {
      if (!hasAccess) return;
      setPlanLoading(true);
      setPlanError(null);
      try {
        const headers = await buildHeaders();
        const res = await fetch("/api/admin/content-editorial-plan", {
          headers,
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const details = [json?.error, json?.details].filter(Boolean).join(" · ");
          throw new Error(details || `HTTP ${res.status}`);
        }
        const items = Array.isArray(json?.items) ? json.items : [];
        setPlanItems(
          items.map((item: any) => ({
            format: String(item.format || ""),
            videoCount: item.videoCount !== null && item.videoCount !== undefined ? String(item.videoCount) : "",
          }))
        );
        setPlanSavedAt(null);
        setPlanDirty(false);
      } catch (err: any) {
        setPlanError(err?.message || "Errore caricamento programma");
      } finally {
        setPlanLoading(false);
      }
    },
    [hasAccess]
  );

  useEffect(() => {
    if (!hasAccess) return;
    fetchPlan();
  }, [fetchPlan, hasAccess]);

  const updatePlanItem = useCallback((index: number, field: keyof EditorialPlanItem, value: string) => {
    setPlanItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
    setPlanDirty(true);
  }, []);

  const addPlanItem = useCallback(() => {
    setPlanItems((prev) => [...prev, { format: "", videoCount: "" }]);
    setPlanDirty(true);
  }, []);

  const removePlanItem = useCallback((index: number) => {
    setPlanItems((prev) => prev.filter((_, i) => i !== index));
    setPlanDirty(true);
  }, []);

  const handleSavePlan = useCallback(async () => {
    if (planSaving) return;
    const cleaned: Array<{ format: string; videoCount: number }> = [];
    const seen = new Set<string>();
    for (const item of planItems) {
      const format = normalizeValue(item.format);
      const countRaw = item.videoCount.trim();
      if (!format && !countRaw) continue;
      const count = Number(countRaw);
      if (!format || !Number.isFinite(count) || count < 0) {
        setPlanError("Completa format e quantità con un numero valido.");
        return;
      }
      const key = format.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      cleaned.push({ format, videoCount: Math.round(count) });
    }
    setPlanSaving(true);
    setPlanError(null);
    try {
      const headers = await buildHeaders();
      headers["Content-Type"] = "application/json";
      const res = await fetch("/api/admin/content-editorial-plan", {
        method: "POST",
        headers,
        body: JSON.stringify({ items: cleaned }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const details = [json?.error, json?.details].filter(Boolean).join(" · ");
        throw new Error(details || `HTTP ${res.status}`);
      }
      setPlanItems(
        cleaned.map((item) => ({
          format: item.format,
          videoCount: String(item.videoCount),
        }))
      );
      setPlanSavedAt(new Date().toISOString());
      setPlanDirty(false);
      fetchCalendarStatuses();
    } catch (err: any) {
      setPlanError(err?.message || "Errore salvataggio programma");
    } finally {
      setPlanSaving(false);
    }
  }, [planItems, planSaving]);

  const fetchCalendarStatuses = useCallback(async () => {
    if (!hasAccess) return;
    setCalendarStatusLoading(true);
    try {
      const headers = await buildHeaders();
      const res = await fetch(
        `/api/admin/content-editorial-calendar?start=${encodeURIComponent(
          calendarRange.start
        )}&end=${encodeURIComponent(calendarRange.end)}`,
        { headers, cache: "no-store" }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const details = [json?.error, json?.details].filter(Boolean).join(" · ");
        throw new Error(details || `HTTP ${res.status}`);
      }
      const statuses: Record<string, string> = {};
      const list = Array.isArray(json?.statuses) ? json.statuses : [];
      for (const item of list) {
        if (item?.date) statuses[String(item.date)] = String(item.status || "");
      }
      setCalendarStatuses(statuses);
    } catch (err) {
      console.warn("[content-production] calendar status fetch failed", err);
    } finally {
      setCalendarStatusLoading(false);
    }
  }, [calendarRange.end, calendarRange.start, hasAccess]);

  const handleAddFormat = useCallback(async () => {
    const name = newFormat.trim();
    if (!name || formatSaving) return;
    setFormatSaving(true);
    setFormatsError(null);
    try {
      const headers = await buildHeaders();
      headers["Content-Type"] = "application/json";
      const res = await fetch("/api/admin/content-production-formats", {
        method: "POST",
        headers,
        body: JSON.stringify({ name }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const details = [json?.error, json?.details].filter(Boolean).join(" · ");
        throw new Error(details || `HTTP ${res.status}`);
      }
      const created = typeof json?.format === "string" ? json.format : name;
      setFormats((prev) => sortFormatList([...prev, created]));
      setNewFormat("");
    } catch (err: any) {
      setFormatsError(err?.message || "Errore aggiunta format");
    } finally {
      setFormatSaving(false);
    }
  }, [newFormat, formatSaving]);

  useEffect(() => {
    if (!hasAccess) return;
    fetchCalendarStatuses();
  }, [calendarRange.end, calendarRange.start, fetchCalendarStatuses, hasAccess]);

  const handleRemoveFormat = useCallback(async (name: string) => {
    if (!name || formatDeleting) return;
    setFormatDeleting(name);
    setFormatsError(null);
    try {
      const headers = await buildHeaders();
      headers["Content-Type"] = "application/json";
      const res = await fetch("/api/admin/content-production-formats", {
        method: "DELETE",
        headers,
        body: JSON.stringify({ name }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const details = [json?.error, json?.details].filter(Boolean).join(" · ");
        throw new Error(details || `HTTP ${res.status}`);
      }
      setFormats((prev) => prev.filter((item) => item !== name));
    } catch (err: any) {
      setFormatsError(err?.message || "Errore rimozione format");
    } finally {
      setFormatDeleting(null);
    }
  }, [formatDeleting]);

  useEffect(() => {
    if (!autosaveEnabled) return;
    const interval = setInterval(() => {
      const items = workspaceRef.current;
      for (const item of items) {
        if (item.hasChanges && !item.isSaving) {
          saveWorkspaceItemRef.current(item, { auto: true });
        }
      }
    }, 120_000);
    return () => clearInterval(interval);
  }, [autosaveEnabled]);

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
            <div className="relative">
              <button
                type="button"
                onClick={() => setFormatPanelOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:border-slate-300"
              >
                <Settings size={16} />
                Gestisci format
              </button>
              {formatPanelOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Format disponibili
                    </p>
                    <button
                      type="button"
                      onClick={() => setFormatPanelOpen(false)}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                    >
                      Chiudi
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="text"
                      value={newFormat}
                      onChange={(event) => setNewFormat(event.target.value)}
                      placeholder="Nuovo format"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddFormat}
                      disabled={formatSaving}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
                    >
                      Aggiungi
                    </button>
                  </div>
                  {formatsError ? (
                    <p className="mt-2 text-xs text-rose-600">{formatsError}</p>
                  ) : null}
                  {formatsLoading ? (
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <Loader2 size={14} className="animate-spin" />
                      Carico format...
                    </div>
                  ) : formats.length ? (
                    <div className="mt-3 space-y-2">
                      {formats.map((format) => (
                        <div
                          key={format}
                          className="flex items-center justify-between gap-2 text-xs text-slate-700"
                        >
                          <span className="truncate">{format}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFormat(format)}
                            disabled={formatDeleting === format}
                            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 disabled:opacity-60"
                          >
                            {formatDeleting === format ? "..." : "Rimuovi"}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">
                      Nessun format salvato.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
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
            {activeStatus ? (
              activeFormat ? (
                <>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                    <button
                      type="button"
                      onClick={() => setActiveFormat(null)}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm hover:border-slate-300"
                    >
                      <ChevronLeft size={14} />
                      Formati
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveStatus(null);
                        setActiveFormat(null);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm hover:border-slate-300"
                    >
                      <ChevronLeft size={14} />
                      Stati
                    </button>
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Format: {activeFormat}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {activeFormatVideos.length} video · Stato{" "}
                    {STATUS_LABELS[activeStatus]}
                  </p>
                </>
              ) : (
                <>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                    <button
                      type="button"
                      onClick={() => setActiveStatus(null)}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm hover:border-slate-300"
                    >
                      <ChevronLeft size={14} />
                      Tutti gli stati
                    </button>
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Stato: {STATUS_LABELS[activeStatus]}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {activeStatusFolder?.count ?? 0} video ·{" "}
                    {activeStatusFormats.length} format
                  </p>
                </>
              )
            ) : (
              <>
                <h2 className="text-xl font-semibold text-slate-900">
                  Pipeline creativa
                </h2>
                <p className="text-sm text-slate-600">
                  Bozze pronte per essere finalizzate.
                </p>
              </>
            )}
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
                placeholder="Cerca titolo, hook, format"
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
        ) : activeStatus ? (
          activeFormat ? (
            activeFormatVideos.length ? (
              <div className="mt-6 mx-auto grid max-w-5xl gap-4 md:grid-cols-2 xl:grid-cols-3">
                {activeFormatVideos.map((video) => {
                  const isOpen = workspaceOpenIds.has(video.id);
                  return (
                  <div
                    key={video.id}
                    className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm"
                  >
                    <h3 className="text-base font-semibold text-slate-900">
                      {formatTitle(video.title)}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
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
                    </div>
                    <p className="mt-3 text-sm text-slate-700">
                      {getScriptPreviewWithHook(video.hook, video.script, 180)}
                    </p>
                    {video.editedFileName ? (
                      <p className="mt-2 text-xs font-semibold text-slate-600">
                        File:{" "}
                        <span className="font-medium text-slate-700">
                          {video.editedFileName}
                        </span>
                      </p>
                    ) : null}
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
                Nessun video in questa cartella con i filtri attuali.
              </p>
            )
          ) : activeStatusFormats.length ? (
            <div className="mt-6 mx-auto grid max-w-4xl gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activeStatusFormats.map((folder) => (
                <button
                  key={folder.format}
                  type="button"
                  onClick={() => setActiveFormat(folder.format)}
                  className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-left shadow-sm transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                      <Folder size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {folder.format}
                      </p>
                      <p className="text-xs text-slate-500">
                        {folder.count} video
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>Ultimo aggiornamento {formatDate(folder.latestAt)}</span>
                    <span className="text-[11px] font-semibold text-slate-400 transition group-hover:text-slate-600">
                      Apri format
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-center text-sm text-slate-500">
              Nessun format disponibile con i filtri attuali.
            </p>
          )
        ) : statusFolders.length ? (
          <div className="mt-6 mx-auto grid max-w-4xl gap-4 md:grid-cols-2 xl:grid-cols-3">
            {statusFolders.map((folder) => (
              <button
                key={folder.status}
                type="button"
                onClick={() => {
                  setActiveStatus(folder.status);
                  setActiveFormat(null);
                }}
                className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-left shadow-sm transition hover:border-slate-300 hover:bg-white"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                    <Folder size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {STATUS_LABELS[folder.status]}
                    </p>
                    <p className="text-xs text-slate-500">
                      {folder.count} video · {folder.formats.length} format
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>Ultimo aggiornamento {formatDate(folder.latestAt)}</span>
                  <span className="text-[11px] font-semibold text-slate-400 transition group-hover:text-slate-600">
                    Apri stato
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-center text-sm text-slate-500">
            {drafts.length
              ? "Nessuna bozza con questi filtri."
              : "Nessuna bozza in preparazione. Inserisci un nuovo script."}
          </p>
        )}
      </section>

      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Bozze attive
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{drafts.length}</p>
          <p className="text-xs text-slate-500">In preparazione</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Da girare
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{toShoot}</p>
          <p className="text-xs text-slate-500">Stato bozza</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Da editare
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{toEdit}</p>
          <p className="text-xs text-slate-500">Stato girato</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Da pubblicare
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{toPublish}</p>
          <p className="text-xs text-slate-500">Stato editato</p>
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
              Apri piu script in parallelo. Autosave ogni 2 min quando modifichi.
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
            <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={autosaveEnabled}
                onChange={(event) => setAutosaveEnabled(event.target.checked)}
                className="h-3.5 w-3.5 accent-slate-900"
              />
              Autosave 2 min
            </label>
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

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Titolo</label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(event) =>
                        updateWorkspaceField(item.key, "title", event.target.value)
                      }
                      placeholder="Titolo breve e chiaro"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Format</label>
                    <select
                      value={item.format}
                      onChange={(event) =>
                        updateWorkspaceField(item.key, "format", event.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                    >
                      <option value="">Seleziona format</option>
                      {formatOptions.map((format) => (
                        <option key={format} value={format}>
                          {format}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="mt-4 text-xs font-semibold text-slate-600">
                  Testo completo (prima riga = hook)
                </label>
                <textarea
                  rows={8}
                  value={mergeHookAndScript(item.hook, item.script)}
                  onChange={(event) => updateWorkspaceScript(item.key, event.target.value)}
                  placeholder={"Hook (prima riga)\n\nScript o scaletta..."}
                  className="mt-1 w-full min-h-[240px] rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                />

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs font-semibold text-slate-600">
                      Hook alternativi
                    </label>
                    <button
                      type="button"
                      onClick={() => addWorkspaceAltHook(item.key)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      + Aggiungi hook
                    </button>
                  </div>
                  {item.altHooks.length ? (
                    <div className="mt-2 space-y-2">
                      {item.altHooks.map((hookValue, index) => (
                        <div key={`${item.key}-alt-${index}`} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={hookValue}
                            onChange={(event) =>
                              updateWorkspaceAltHook(item.key, index, event.target.value)
                            }
                            placeholder="Hook alternativo"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => removeWorkspaceAltHook(item.key, index)}
                            className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                          >
                            Rimuovi
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      Nessun hook alternativo.
                    </p>
                  )}
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

                {item.status === "editato" ? (
                  <div className="mt-4">
                    <label className="text-xs font-semibold text-slate-600">
                      Nome file montaggio
                    </label>
                    <input
                      type="text"
                      value={item.editedFileName}
                      onChange={(event) =>
                        updateWorkspaceField(item.key, "editedFileName", event.target.value)
                      }
                      placeholder="Es: edit_v2_theoremz.mp4"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                    />
                  </div>
                ) : null}

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
                  <span>
                    {autosaveEnabled ? "Autosave attivo" : "Autosave disattivato"}
                  </span>
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
                          {formatTitle(video.title)}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-600">
                          {getScriptPreviewWithHook(video.hook, video.script, 70)}
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
                          {formatTitle(video.title)}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-600">
                          {getScriptPreviewWithHook(video.hook, video.script, 70)}
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
                          <p className="text-slate-700">{formatTitle(row.best.title)}</p>
                          <p className="text-[11px] text-slate-500">
                            {getScriptPreviewWithHook(row.best.hook, row.best.script, 60)}
                          </p>
                        </div>
                        <span className="font-semibold text-emerald-700">
                          {formatViews(row.best.views)}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3 rounded-lg border border-rose-100 bg-white px-3 py-2">
                        <div>
                          <p className="font-semibold text-rose-700">Bottom</p>
                          <p className="text-slate-700">{formatTitle(row.worst.title)}</p>
                          <p className="text-[11px] text-slate-500">
                            {getScriptPreviewWithHook(row.worst.hook, row.worst.script, 60)}
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
                      {formatTitle(video.title)}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-600">
                      {getScriptPreviewWithHook(video.hook, video.script, 60)}
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
                      {formatTitle(video.title)}
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

      <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Programma editoriale
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              Quanti video pubblicare al giorno
            </h2>
            <p className="text-sm text-slate-600">
              Un unico programma valido per tutti i giorni della settimana.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
              Valido Lun-Dom
            </span>
            <button
              type="button"
              onClick={() => setPlanOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300"
            >
              {planOpen ? "Chiudi" : "Modifica"}
            </button>
          </div>
        </div>

        {planOpen ? (
          <>
            {planError ? (
              <p className="mt-3 text-sm text-rose-600">{planError}</p>
            ) : null}

            {planLoading ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                Carico programma...
              </div>
            ) : (
              <>
                <div className="mt-4 space-y-3">
                  {planItems.length ? (
                    planItems.map((item, index) => (
                      <div
                        key={`plan-${index}`}
                        className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-[1fr_120px_auto]"
                      >
                        <div>
                          <label className="text-xs font-semibold text-slate-500">Format</label>
                          <select
                            value={item.format}
                            onChange={(event) => updatePlanItem(index, "format", event.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                          >
                            <option value="">Seleziona format</option>
                            {formatOptions.map((format) => (
                              <option key={`plan-format-${format}`} value={format}>
                                {format}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-500">Video</label>
                          <input
                            type="number"
                            min="0"
                            value={item.videoCount}
                            onChange={(event) =>
                              updatePlanItem(index, "videoCount", event.target.value)
                            }
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removePlanItem(index)}
                            className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                          >
                            Rimuovi
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      Nessun format inserito per questo programma.
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={addPlanItem}
                    disabled={!formatOptions.length}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 disabled:opacity-60"
                  >
                    + Aggiungi format
                  </button>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    {!formatOptions.length ? (
                      <span className="text-xs text-slate-400">
                        Nessun format: aggiungilo da &ldquo;Gestisci format&rdquo;.
                      </span>
                    ) : null}
                    <span>Totale video: {planTotal}</span>
                    <span>
                      {planSaving
                        ? "Salvataggio in corso"
                        : planSavedAt
                          ? `Salvato ${formatDateTime(planSavedAt)}`
                          : planDirty
                            ? "Modifiche non salvate"
                            : "Allineato"}
                    </span>
                    <button
                      type="button"
                      onClick={handleSavePlan}
                      disabled={planSaving}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
                    >
                      {planSaving ? "Salvataggio..." : "Salva programma"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <span>Totale video: {planTotal}</span>
            <span>
              {planSavedAt
                ? `Salvato ${formatDateTime(planSavedAt)}`
                : planDirty
                  ? "Modifiche non salvate"
                  : "Allineato"}
            </span>
          </div>
        )}
      </section>

      <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Calendario
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              Vista mensile completa
            </h2>
            <p className="text-sm text-slate-600">
              Tutti i giorni del mese in un colpo d&apos;occhio.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300"
              aria-label="Mese precedente"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              {calendarLabel}
            </div>
            <button
              type="button"
              onClick={() =>
                setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300"
              aria-label="Mese successivo"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-200">
          <div className="grid grid-cols-7 gap-px">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="bg-slate-100 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"
              >
                {label}
              </div>
            ))}
            {calendarDays.map((day) => {
              const key = day.key;
              const isSelected = calendarSelected === day.ymd;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setCalendarSelected(day.ymd);
                  }}
                  className={`flex min-h-[88px] flex-col gap-1.5 bg-white px-2.5 py-2 text-left transition ${
                    day.isCurrentMonth ? "text-slate-800" : "text-slate-400"
                  } ${isSelected ? "ring-2 ring-slate-900/20" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-semibold ${
                        day.isToday
                          ? "rounded-full bg-slate-900 px-2 py-0.5 text-white"
                          : ""
                      }`}
                    >
                      {day.date.getDate()}
                    </span>
                    {calendarStatusLoading ? (
                      <Loader2 size={14} className="animate-spin text-slate-300" />
                    ) : (
                    (() => {
                      const status = calendarStatuses[day.ymd] || "";
                      if (!status || status === "inactive") {
                        return null;
                      }
                      let icon = <Circle size={14} className="text-sky-500" />;
                      let label = "Futuro";
                      if (status === "met") {
                        icon = <CheckCircle2 size={14} className="text-emerald-500" />;
                        label = "Schedule rispettata";
                      } else if (status === "partial") {
                        icon = <AlertTriangle size={14} className="text-amber-500" />;
                        label = "Pubblicazioni parziali";
                      } else if (status === "missed") {
                        icon = <XCircle size={14} className="text-rose-500" />;
                        label = "Nessuna pubblicazione";
                      } else if (status === "future") {
                        icon = <Circle size={14} className="text-sky-500" />;
                        label = "Futuro";
                      } else {
                        icon = <Circle size={14} className="text-sky-500" />;
                        label = "In corso";
                      }
                      return (
                        <span title={label} aria-label={label}>
                          {icon}
                        </span>
                      );
                    })()
                    )}
                  </div>
                  <div className="mt-auto text-[10px] font-semibold text-slate-400">
                    {day.date.toLocaleDateString("it-IT", { weekday: "long" })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
