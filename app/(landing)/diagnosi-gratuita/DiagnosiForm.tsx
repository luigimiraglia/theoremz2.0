"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function DiagnosiForm() {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setSending(true);
    setErr(false);
    try {
      const res = await fetch("/api/diagnosi-gratuita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setDone(res.ok);
      if (!res.ok) setErr(true);
    } catch {
      setErr(true);
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="mt-2 rounded-[22px] border border-emerald-200 bg-emerald-50 px-5 py-5 text-emerald-950">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-600/10 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-black tracking-[-0.03em]">
              Richiesta ricevuta
            </p>
            <p className="mt-1 text-sm leading-6 text-emerald-800">
              Ti contattiamo entro 24 ore per fissare la diagnosi gratuita.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      aria-busy={sending}
      className="mx-auto w-full max-w-xl space-y-4"
    >
      <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_12px_40px_-28px_rgba(15,23,42,0.24)] sm:p-5">
        <div className="grid gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="nome"
              className="text-sm font-semibold text-slate-700"
            >
              Nome e cognome
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              required
              autoComplete="name"
              placeholder="Mario Rossi"
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/10"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm font-semibold text-slate-700"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="mario@esempio.com"
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/10"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="telefono"
                className="text-sm font-semibold text-slate-700"
              >
                Numero di telefono
              </label>
              <input
                id="telefono"
                name="telefono"
                type="tel"
                required
                autoComplete="tel"
                placeholder="+39 347 123 4567"
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/10"
              />
            </div>
          </div>
        </div>
      </div>

      {err ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-sm leading-6">
            Qualcosa è andato storto. Riprova tra un momento.
          </p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={sending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-6 text-sm font-black text-white shadow-[0_10px_24px_-18px_rgba(37,99,235,0.7)] transition hover:from-sky-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {sending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Invio in corso
          </>
        ) : (
          "Prenota la diagnosi gratuita"
        )}
      </button>

      <p className="flex items-center justify-center gap-2 text-center text-xs leading-5 text-slate-500">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Nessuno spam. Ti contattiamo solo per la chiamata.
      </p>
    </form>
  );
}
