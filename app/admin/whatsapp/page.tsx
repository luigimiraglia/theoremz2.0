"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import clsx from "clsx";
import { useAuth } from "@/lib/AuthContext";

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
    name?: string | null;
    status?: string | null;
    planLabel?: string | null;
    readiness?: number | null;
    risk?: string | null;
    yearClass?: string | null;
    track?: string | null;
    startDate?: string | null;
    studentEmail?: string | null;
    parentEmail?: string | null;
    studentPhone?: string | null;
    parentPhone?: string | null;
  } | null;
};

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
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
  const [error, setError] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);

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
    async (opts?: { keepSelection?: boolean }) => {
      setLoadingList(true);
      setError(null);
      try {
        const headers = await buildHeaders();
        const query = search ? `?q=${encodeURIComponent(search)}` : "";
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
        setList(data.conversations || []);
        if (!opts?.keepSelection && data.conversations?.length) {
          setSelected(data.conversations[0]?.phoneTail || null);
        }
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
    async (phoneTail: string | null) => {
      if (!phoneTail) {
        setDetail(null);
        return;
      }
      setLoadingDetail(true);
      setError(null);
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
        setError(err?.message || "Errore caricamento dettaglio");
      } finally {
        setLoadingDetail(false);
      }
    },
    [buildHeaders]
  );

  useEffect(() => {
    if (!hasAccess || authLoading) return;
    fetchList();
  }, [hasAccess, authLoading, fetchList]);

  useEffect(() => {
    if (selected) {
      fetchDetail(selected);
    } else {
      setDetail(null);
    }
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
                    .map((m) => (
                      <div
                        key={m.id || m.created_at}
                        className={clsx(
                          "flex",
                          m.role === "assistant" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={clsx(
                            "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-md",
                            m.role === "assistant"
                              ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-50"
                              : "bg-slate-800/80 border border-slate-700 text-slate-100"
                          )}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                          <p className="text-[10px] text-slate-400 mt-1 text-right">
                            {formatAbsolute(m.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
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

      {showProfile && detail?.conversation.student && (
        <ProfileModal
          student={detail.conversation.student}
          onClose={() => setShowProfile(false)}
        />
      )}
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
  onClose,
}: {
  student: NonNullable<ConversationItem["student"]>;
  onClose: () => void;
}) {
  const rows = [
    { label: "Nome", value: student.name },
    { label: "Stato", value: student.status },
    { label: "Piano", value: student.planLabel },
    { label: "Readiness", value: student.readiness != null ? `${student.readiness}` : null },
    { label: "Rischio", value: student.risk },
    { label: "Classe", value: student.yearClass },
    { label: "Track", value: student.track },
    { label: "Inizio", value: student.startDate },
    { label: "Email studente", value: student.studentEmail },
    { label: "Email genitore", value: student.parentEmail },
    { label: "Telefono studente", value: student.studentPhone },
    { label: "Telefono genitore", value: student.parentPhone },
    { label: "Stripe price", value: student.stripePrice },
    { label: "ID studente", value: student.id },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Scheda Black</p>
            <h3 className="text-lg font-semibold text-slate-50">
              {student.name || "Studente"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white rounded-lg px-3 py-1 border border-slate-700 bg-slate-800/70"
          >
            Chiudi
          </button>
        </div>
        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto bg-gradient-to-b from-slate-900 to-slate-950">
          {rows
            .filter((r) => r.value)
            .map((row) => (
              <div
                key={row.label}
                className="flex items-start justify-between gap-3 rounded-lg bg-slate-800/60 border border-slate-700 px-3 py-2"
              >
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  {row.label}
                </span>
                <span className="text-sm text-slate-100 text-right break-all">
                  {row.value}
                </span>
              </div>
            ))}
          {rows.filter((r) => r.value).length === 0 && (
            <p className="text-sm text-slate-500">Nessun dettaglio disponibile.</p>
          )}
        </div>
      </div>
    </div>
  );
}
