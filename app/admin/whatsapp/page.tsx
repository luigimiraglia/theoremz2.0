"use client";

import { useEffect, useMemo, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

type Student = {
  id?: string;
  student_name?: string | null;
  student_email?: string | null;
  parent_email?: string | null;
  student_phone?: string | null;
  parent_phone?: string | null;
  year_class?: string | null;
  track?: string | null;
  goal?: string | null;
  difficulty_focus?: string | null;
  readiness?: number | null;
  ai_description?: string | null;
  metrics?: any;
};

type ThreadResponse = {
  student: Student | null;
  phone_tail: string | null;
  messages: Message[];
};

export default function WhatsappAdminPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [thread, setThread] = useState<ThreadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");

  const contactPhone = useMemo(() => {
    if (thread?.student?.student_phone) return thread.student.student_phone;
    if (thread?.student?.parent_phone) return thread.student.parent_phone;
    return "";
  }, [thread]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (thread && query) {
      timer = setInterval(() => {
        fetchThread(query, false);
      }, 5000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [thread, query]);

  const fetchThread = async (q: string, showLoading = true) => {
    if (!q.trim()) return;
    showLoading && setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/whatsapp/admin/thread?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Errore fetch");
      setThread(data);
    } catch (err: any) {
      setError(err.message || "Errore");
    } finally {
      showLoading && setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!body.trim()) return;
    const toSend = contactPhone || "";
    if (!toSend) {
      setError("Numero non disponibile per l'invio");
      return;
    }
    try {
      setError(null);
      await fetch("/api/whatsapp/admin/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: toSend,
          body: body.trim(),
          studentId: thread?.student?.id || null,
          phoneTail: thread?.phone_tail || null,
        }),
      });
      setBody("");
      // refresh thread
      if (query) fetchThread(query, false);
    } catch (err: any) {
      setError(err.message || "Errore invio");
    }
  };

  const contactName = thread?.student?.student_name || "Contatto";
  const msgs = thread?.messages || [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">
      <h1 className="text-2xl font-semibold">WhatsApp Admin</h1>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca per telefono/email..."
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={() => fetchThread(query)}
          className="px-4 py-2 rounded bg-emerald-600 text-white"
          disabled={loading}
        >
          {loading ? "Carico..." : "Cerca"}
        </button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {thread && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 border rounded p-3 flex flex-col h-[70vh]">
            <div className="border-b pb-2 mb-2">
              <div className="font-semibold">{contactName}</div>
              <div className="text-sm text-slate-600">
                {contactPhone || "Numero non disponibile"} · tail: {thread.phone_tail || "—"}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 bg-slate-50 rounded p-2">
              {msgs.length === 0 && <div className="text-sm text-slate-500">Nessun messaggio.</div>}
              {msgs.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] px-3 py-2 rounded ${
                    m.role === "assistant" ? "bg-emerald-100 ml-auto" : "bg-white border"
                  }`}
                >
                  <div className="text-xs text-slate-500">
                    {m.role === "assistant" ? "Bot" : "Studente"}{" "}
                    {m.created_at ? new Date(m.created_at).toLocaleString("it-IT") : ""}
                  </div>
                  <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Scrivi una risposta..."
                className="flex-1 border rounded px-3 py-2"
                rows={2}
              />
              <button
                onClick={handleSend}
                className="px-4 py-2 rounded bg-emerald-600 text-white self-end"
              >
                Invia
              </button>
            </div>
          </div>
          <div className="border rounded p-3 space-y-2">
            <h2 className="font-semibold">Scheda studente</h2>
            <Detail label="Nome" value={contactName} />
            <Detail label="Email studente" value={thread.student?.student_email} />
            <Detail label="Email genitore" value={thread.student?.parent_email} />
            <Detail label="Telefono studente" value={thread.student?.student_phone} />
            <Detail label="Telefono genitore" value={thread.student?.parent_phone} />
            <Detail
              label="Classe/Track"
              value={
                [
                  thread.student?.year_class || "—",
                  thread.student?.track ? `Track: ${thread.student?.track}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"
              }
            />
            <Detail label="Goal" value={thread.student?.goal} />
            <Detail label="Focus" value={thread.student?.difficulty_focus} />
            <Detail
              label="Readiness"
              value={
                typeof thread.student?.readiness === "number"
                  ? `${thread.student.readiness}/100`
                  : "—"
              }
            />
            <Detail label="Nota tutor AI" value={thread.student?.ai_description} multiline />
            {thread.student?.metrics ? (
              <>
                <h3 className="font-semibold pt-2">Metriche</h3>
                <Detail
                  label="Media Matematica"
                  value={
                    typeof thread.student.metrics?.avg_math === "number"
                      ? `${thread.student.metrics.avg_math.toFixed(1)}/10`
                      : "—"
                  }
                />
                <Detail
                  label="Media Fisica"
                  value={
                    typeof thread.student.metrics?.avg_physics === "number"
                      ? `${thread.student.metrics.avg_physics.toFixed(1)}/10`
                      : "—"
                  }
                />
                <div>
                  <div className="text-sm font-medium">Voti recenti</div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">
                    {Array.isArray(thread.student.metrics?.recent_grades) &&
                    thread.student.metrics.recent_grades.length
                      ? thread.student.metrics.recent_grades
                          .map((g: any) => {
                            const subj = g.subject || "materia";
                            const score =
                              typeof g.score === "number" && typeof g.max_score === "number"
                                ? `${g.score}/${g.max_score}`
                                : g.score != null
                                ? `${g.score}`
                                : "";
                            const date = g.when_at || "";
                            return [subj, score, date].filter(Boolean).join(" ");
                          })
                          .join("\n")
                      : "—"}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  multiline,
}: {
  label: string;
  value?: string | null;
  multiline?: boolean;
}) {
  return (
    <div className="text-sm">
      <div className="text-slate-500">{label}</div>
      <div className={multiline ? "whitespace-pre-wrap" : ""}>{value || "—"}</div>
    </div>
  );
}
