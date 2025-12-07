// app/newsletter/unsubscribe/page.tsx
"use client";

import { useState } from "react";

export default function NewsletterUnsubscribePage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">(
    "idle"
  );
  const [message, setMessage] = useState<string>("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Errore");
      setStatus("ok");
      setMessage(json?.message || "Disiscrizione completata");
    } catch (err: any) {
      setStatus("err");
      setMessage(err?.message || "Errore durante la disiscrizione");
    }
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-10 sm:py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Disiscriviti dalla newsletter
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Inserisci la tua email per rimuovere l&apos;iscrizione. Se l&apos;email
          risulta già disiscritta, non riceverai altri messaggi.
        </p>
        <form className="mt-6 space-y-3" onSubmit={submit}>
          <label className="block text-sm font-semibold text-slate-800">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            placeholder="nome@esempio.com"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
          >
            {status === "loading" ? "Attendi..." : "Conferma disiscrizione"}
          </button>
        </form>
        {message ? (
          <div
            className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
              status === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {message}
          </div>
        ) : null}
      </div>
    </main>
  );
}
