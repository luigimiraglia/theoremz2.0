"use client";

import { useState } from "react";

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    if ((data.get("website") as string)?.trim()) {
      setStatus("ok");
      return;
    }

    const payload = {
      name: (data.get("name") as string)?.trim(),
      email: (data.get("email") as string)?.trim(),
      topic: (data.get("topic") as string) || "Domanda generica",
      message: (data.get("message") as string)?.trim(),
    };

    if (!payload.name || !payload.email || !payload.message) {
      setStatus("err");
      setErrorMsg("Compila nome, email e messaggio.");
      return;
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Errore invio. Riprova.");
      }
      setStatus("ok");
      form.reset();
    } catch (err: any) {
      setStatus("err");
      setErrorMsg(err?.message || "Errore invio. Riprova.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-300">
            Nome
          </label>
          <input
            name="name"
            type="text"
            required
            autoComplete="name"
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[14.5px] outline-none focus:ring-2 focus:ring-sky-400"
            placeholder="Es. Giulia Rossi"
          />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-300">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[14.5px] outline-none focus:ring-2 focus:ring-sky-400"
            placeholder="tu@esempio.it"
          />
        </div>
      </div>

      <div>
        <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-300">
          Motivo
        </label>
        <select
          name="topic"
          className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[14.5px] outline-none focus:ring-2 focus:ring-sky-400"
          defaultValue="Domanda generica"
        >
          <option>Domanda generica</option>
          <option>Supporto Theoremz Black</option>
          <option>Collaborazioni / Partnership</option>
          <option>Bug o suggerimento</option>
        </select>
      </div>

      <div>
        <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-300">
          Messaggio
        </label>
        <textarea
          name="message"
          required
          rows={5}
          className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[14.5px] outline-none focus:ring-2 focus:ring-sky-400"
          placeholder="Scrivici tutto quello che ti serve…"
        />
      </div>

      {/* Honeypot */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          disabled={status === "sending"}
          className={`rounded-lg px-5 py-2.5 text-[14.5px] font-bold transition ${
            status === "sending"
              ? "bg-slate-400 text-white cursor-not-allowed"
              : "bg-sky-600 text-white hover:bg-sky-500"
          }`}
        >
          {status === "sending" ? "Invio in corso…" : "Invia messaggio"}
        </button>

        {status === "ok" && (
          <span className="text-[13.5px] font-semibold text-emerald-600 dark:text-emerald-400">
            Messaggio inviato! Ti rispondiamo al più presto.
          </span>
        )}
        {status === "err" && (
          <span className="text-[13.5px] font-semibold text-rose-600">
            {errorMsg ?? "Errore invio. Riprova."}
          </span>
        )}
      </div>

      <p className="text-[12px] text-slate-500 dark:text-slate-400">
        Trattiamo i dati con cura e solo per risponderti.
      </p>
    </form>
  );
}
