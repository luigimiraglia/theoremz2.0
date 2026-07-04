"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  MailCheck,
} from "lucide-react";

export default function LeadMagnetForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
    const phoneDigits = phone.replace(/\D+/g, "");
    return (
      firstName.trim().length >= 2 &&
      lastName.trim().length >= 2 &&
      validEmail &&
      phoneDigits.length >= 8 &&
      consent
    );
  }, [consent, email, firstName, lastName, phone]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || sending) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/lead-magnet-theoremz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          consent,
          pageUrl: window.location.href,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Errore invio");
      }

      setSuccess(true);
    } catch {
      setError("Non siamo riusciti a inviare la guida. Riprova tra poco.");
    } finally {
      setSending(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
        <div className="flex gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white">
            <MailCheck className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-base font-black">Guida inviata</p>
            <p className="mt-1 text-sm leading-6 text-emerald-800">
              Controlla la mail: il PDF è appena partito verso{" "}
              <span className="font-bold">{email}</span>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={sending} className="space-y-4">
      <div>
        <p className="text-lg font-black leading-tight text-slate-950">
          Ottieni la guida gratuita
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Lascia i dati e ricevi subito il PDF via email.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="firstName"
          label="Il tuo nome"
          autoComplete="given-name"
          placeholder="Mario"
          value={firstName}
          onChange={setFirstName}
        />
        <Field
          id="lastName"
          label="Il tuo cognome"
          autoComplete="family-name"
          placeholder="Rossi"
          value={lastName}
          onChange={setLastName}
        />
      </div>

      <Field
        id="email"
        label="La tua email"
        type="email"
        autoComplete="email"
        placeholder="mario@esempio.com"
        value={email}
        onChange={setEmail}
      />

      <Field
        id="phone"
        label="Numero di telefono"
        type="tel"
        autoComplete="tel"
        placeholder="+39 347 123 4567"
        value={phone}
        onChange={setPhone}
      />

      <label className="flex items-start gap-3 text-xs leading-5 text-slate-600">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#336DFD] focus:ring-[#336DFD]/30"
        />
        <span>
          Acconsento a ricevere la guida e consigli di studio via email da
          Theoremz. Posso disiscrivermi in ogni momento con un click.{" "}
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[#336DFD] underline underline-offset-2"
          >
            Privacy Policy
          </a>
          .
        </span>
      </label>

      {error ? (
        <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{error}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit || sending}
        className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#336DFD] px-5 text-[15px] font-black text-white shadow-[0_18px_34px_-18px_rgba(51,109,253,0.75)] transition hover:bg-[#2559e6] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Invio in corso...
          </>
        ) : (
          <>
            Inviami la guida gratis
            <ArrowRight className="h-4 w-4" aria-hidden />
          </>
        )}
      </button>

      <p className="flex items-center justify-center gap-2 text-center text-xs leading-5 text-slate-500">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
        Arriva subito via email. Niente spam, promesso.
      </p>
    </form>
  );
}

type FieldProps = {
  id: string;
  label: string;
  type?: string;
  autoComplete: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

function Field({
  id,
  label,
  type = "text",
  autoComplete,
  placeholder,
  value,
  onChange,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-bold text-slate-800">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[15px] font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#336DFD] focus:bg-white focus:ring-4 focus:ring-[#336DFD]/10"
      />
    </div>
  );
}
