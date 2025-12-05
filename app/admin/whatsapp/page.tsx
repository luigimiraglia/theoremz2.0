"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import clsx from "clsx";
import { useAuth } from "@/lib/AuthContext";
import { ArrowRight, ListFilter } from "lucide-react";
import Link from "next/link";

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

type DetailResponse = {
  conversation: ConversationItem;
  messages: Message[];
};

const statusStyles: Record<string, string> = {
  bot: "bg-emerald-100 text-emerald-800 border-emerald-200",
  tutor: "bg-blue-100 text-blue-800 border-blue-200",
  waiting_tutor: "bg-amber-100 text-amber-800 border-amber-200",
  default: "bg-slate-100 text-slate-800 border-slate-200",
};

const riskStyles: Record<string, string> = {
  red: "bg-red-100 text-red-800",
  yellow: "bg-amber-100 text-amber-800",
  green: "bg-emerald-100 text-emerald-800",
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasAccess = useMemo(
    () => Boolean(user?.email && user.email.toLowerCase() === allowedEmail),
    [user?.email]
  );

  const buildHeaders = useCallback(async () => {
    const headers: Record<string, string> = {};
    try {
      const { auth } = await import("@/lib/firebase");
      const token = await auth.currentUser?.getIdToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch (err) {
      console.warn("[admin/whatsapp] missing firebase token", err);
    }
    return headers;
  }, []);

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
    [buildHeaders, search]
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
    [buildHeaders]
  );

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
    [buildHeaders, fetchDetail, fetchList]
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
          <div className="flex gap-2">
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
              onClick={() => fetchList({ keepSelection: true })}
              className="px-3 py-2 rounded-lg bg-slate-800 text-slate-100 text-sm border border-slate-700 hover:border-emerald-400 transition"
              disabled={loadingList}
            >
              {loadingList ? "Aggiorno..." : "Refresh"}
            </button>
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

function ProfileModal({
  student,
  phoneTail,
  onSave,
  onClose,
}: {
  student: NonNullable<ConversationItem["student"]>;
  phoneTail: string;
  onSave: (phoneTail: string, updates: Record<string, any>) => Promise<string | null>;
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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const onChange = (key: keyof typeof form, value: string) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
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
      setSaved(true);
    }
    setSaving(false);
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
            {saved && !saveError && <span className="text-emerald-300">Salvato ✔︎</span>}
          </div>
          <div className="flex gap-2">
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
