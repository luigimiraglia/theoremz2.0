"use client";

import { useMemo, useState } from "react";
import { AlertCircle, GraduationCap, Loader2, Mail, Users } from "lucide-react";

type Ruolo = "studente" | "genitore";

export default function GuidaMetodoForm() {
  const [ruolo, setRuolo] = useState<Ruolo>("studente");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [consenso, setConsenso] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const cleanPhone = telefono.replace(/[^\d+]/g, "");
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
    const nameParts = nomeCompleto.trim().split(/\s+/).filter(Boolean);
    return (
      nameParts.length >= 2 &&
      nameParts.every((part) => part.length >= 2) &&
      validEmail &&
      cleanPhone.length >= 8 &&
      consenso
    );
  }, [nomeCompleto, email, telefono, consenso]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || sending) return;
    setSending(true);
    setError(null);

    const nameParts = nomeCompleto.trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ");

    try {
      const res = await fetch("/api/guida-metodo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: ruolo,
          firstName,
          lastName,
          email: email.trim(),
          phone: telefono.trim(),
          consent: consenso,
          pageUrl: window.location.href,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Errore invio");
      }
      setDone(true);
    } catch {
      setError("Qualcosa è andato storto. Riprova tra un momento.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-5 py-6 text-emerald-950">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-600/10 text-emerald-700">
            <Mail className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-black tracking-[-0.02em]">
              Guida in arrivo
            </p>
            <p className="mt-1 text-sm leading-6 text-emerald-800">
              Controlla la tua casella email: il PDF è già in viaggio verso{" "}
              <span className="font-semibold">{email}</span>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={sending} className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-slate-700">Chi sei?</span>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Chi sei?">
          <button
            type="button"
            role="radio"
            aria-checked={ruolo === "studente"}
            onClick={() => setRuolo("studente")}
            className={`flex h-11 items-center justify-center gap-2 rounded-2xl border text-[14px] font-bold transition ${
              ruolo === "studente"
                ? "border-blue-500 bg-blue-50 text-blue-700 ring-4 ring-blue-500/10"
                : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Studente
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={ruolo === "genitore"}
            onClick={() => setRuolo("genitore")}
            className={`flex h-11 items-center justify-center gap-2 rounded-2xl border text-[14px] font-bold transition ${
              ruolo === "genitore"
                ? "border-blue-500 bg-blue-50 text-blue-700 ring-4 ring-blue-500/10"
                : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
            }`}
          >
            <Users className="h-4 w-4" />
            Genitore
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="nomeCompleto" className="text-sm font-semibold text-slate-700">
          Nome e cognome
        </label>
        <input
          id="nomeCompleto"
          name="nomeCompleto"
          type="text"
          required
          autoComplete="name"
          placeholder="Mario Rossi"
          value={nomeCompleto}
          onChange={(e) => setNomeCompleto(e.target.value)}
          className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-semibold text-slate-700">
          La tua email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="mario@esempio.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="telefono" className="text-sm font-semibold text-slate-700">
          Numero di telefono
        </label>
        <input
          id="telefono"
          name="telefono"
          type="tel"
          required
          autoComplete="tel"
          placeholder="+39 347 123 4567"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
        />
      </div>

      <label className="flex items-start gap-3 text-xs leading-5 text-slate-600">
        <input
          type="checkbox"
          required
          checked={consenso}
          onChange={(e) => setConsenso(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
        />
        <span>
          Acconsento a ricevere la guida e consigli di studio via email da
          Theoremz. Posso disiscrivermi in ogni momento con un click.{" "}
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-blue-600 underline underline-offset-2"
          >
            Privacy Policy
          </a>
          .
        </span>
      </label>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-sm leading-6">{error}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit || sending}
        className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563eb] via-[#2b7fff] to-[#55d4ff] px-6 py-3.5 text-[15px] font-black text-white shadow-[0_14px_30px_-14px_rgba(37,99,235,0.6)] transition hover:brightness-[1.05] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Invio in corso…
          </>
        ) : (
          "Inviami la guida gratis →"
        )}
      </button>

      <p className="text-center text-xs leading-5 text-slate-500">
        Arriva subito via email. Niente spam, promesso.
      </p>
    </form>
  );
}
