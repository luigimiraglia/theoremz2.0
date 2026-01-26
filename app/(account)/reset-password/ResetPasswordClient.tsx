"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import {
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "firebase/auth";

export default function ResetPasswordClient() {
  const search = useSearchParams();
  const router = useRouter();
  const rawOobCode = search?.get("oobCode") ?? null;
  const rawMode = search?.get("mode") ?? null; // "resetPassword" nei link Firebase
  const continueUrl = search?.get("continueUrl") ?? null;
  const { oobCode, mode } = useMemo(() => {
    let nextOob = rawOobCode;
    let nextMode = rawMode;
    if ((!nextOob || !nextMode) && continueUrl) {
      try {
        const parsed = new URL(continueUrl);
        if (!nextOob) nextOob = parsed.searchParams.get("oobCode");
        if (!nextMode) nextMode = parsed.searchParams.get("mode");
      } catch {
        // ignore invalid continueUrl
      }
    }
    const normalized = nextOob ? nextOob.replace(/ /g, "+") : null;
    return { oobCode: normalized, mode: nextMode };
  }, [rawOobCode, rawMode, continueUrl]);

  const showConfirm = useMemo(
    () => !!oobCode && (!mode || mode === "resetPassword"),
    [oobCode, mode]
  );

  return (
    <main className="mx-auto max-w-md p-6">
      {!showConfirm ? (
        <RequestForm />
      ) : (
        <ConfirmForm oobCode={oobCode!} onDone={() => router.push("/")} />
      )}
    </main>
  );
}

/* ------- 1) Richiesta invio email -------- */

function RequestForm() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [state, setState] = useState<"idle" | "ok" | "err">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setState("idle");
    setErrorMsg("");

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        setState("err");
        setErrorMsg("Inserisci l'email per reimpostare la password.");
        return;
      }
      const apiResult = await requestPasswordResetViaApi(normalizedEmail);
      if (!apiResult.ok) {
        if (shouldFallbackToFirebase(apiResult.error)) {
          const resetUrl = getPasswordResetUrl();
          await sendPasswordResetEmail(auth, normalizedEmail, {
            url: resetUrl,
            handleCodeInApp: true,
          });
        } else {
          setState("err");
          setErrorMsg(
            humanizeFirebaseError(apiResult.error) || "Errore, riprova."
          );
          return;
        }
      }
      setState("ok");
    } catch (err: unknown) {
      setState("err");
      const code = (err as { code?: string })?.code;
      setErrorMsg(humanizeFirebaseError(code) || "Errore, riprova.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-2xl border-2 border-slate-500 bg-white [.dark_&]:bg-slate-800 p-5">
      <h1 className="text-xl font-semibold">Reimposta password</h1>
      <p className="text-sm text-slate-600 [.dark_&]:text-slate-400 mt-1">
        Inserisci la tua email: ti invieremo un link per creare una nuova
        password.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <label htmlFor="reset-email" className="sr-only">Email</label>
        <input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nome@email.com"
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
        />
        <button
          disabled={sending || !email}
          className="w-full rounded-lg bg-blue-600  [.dark_&]: py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {sending ? "Invio in corso…" : "Invia link di reset"}
        </button>
      </form>

      {state === "ok" && (
        <p className="text-emerald-600 text-sm mt-3">
          Email inviata! Controlla la posta (e la spam).
        </p>
      )}
      {state === "err" && (
        <p className="text-red-600 text-sm mt-3">{errorMsg}</p>
      )}
    </section>
  );
}

/* ------- 2) Conferma nuova password dal link -------- */

function ConfirmForm({
  oobCode,
  onDone,
}: {
  oobCode: string;
  onDone: () => void;
}) {
  const [verifying, setVerifying] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<"idle" | "ok" | "err">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Verifico il codice (mostra l'email a cui si applica)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const mail = await verifyPasswordResetCode(auth, oobCode);
        if (active) setEmail(mail);
      } catch {
        if (active) {
          setState("err");
          setErrorMsg("Link non valido o scaduto. Richiedi un nuovo reset.");
        }
      } finally {
        if (active) setVerifying(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [oobCode]);

  const canSubmit = pw1.length >= 8 && pw1 === pw2;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setState("idle");
    setErrorMsg("");

    try {
      await confirmPasswordReset(auth, oobCode, pw1);
      setState("ok");
      setTimeout(onDone, 1500);
    } catch (err: unknown) {
      setState("err");
      const code = (err as { code?: string })?.code;
      setErrorMsg(humanizeFirebaseError(code) || "Errore, riprova.");
    } finally {
      setSaving(false);
    }
  };

  if (verifying) {
    return (
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="h-6 w-2/3 bg-slate-100 animate-pulse rounded mb-2" />
        <div className="h-28 w-full bg-slate-100 animate-pulse rounded" />
      </section>
    );
  }

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h1 className="text-xl font-semibold">Imposta nuova password</h1>
      <p className="text-sm text-slate-600 mt-1">
        Account: <span className="font-medium">{email}</span>
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <label htmlFor="new-password-1" className="sr-only">Nuova password</label>
        <input
          id="new-password-1"
          name="new-password"
          type="password"
          autoComplete="new-password"
          value={pw1}
          onChange={(e) => setPw1(e.target.value)}
          placeholder="Nuova password (min 8 caratteri)"
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
        />
        <label htmlFor="new-password-2" className="sr-only">Ripeti nuova password</label>
        <input
          id="new-password-2"
          name="new-password-confirm"
          type="password"
          autoComplete="new-password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          placeholder="Ripeti nuova password"
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
        />
        <button
          disabled={saving || !canSubmit}
          className="w-full rounded-lg bg-blue-600 text-white py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Salvataggio…" : "Conferma password"}
        </button>
      </form>

      {state === "ok" && (
        <p className="text-emerald-600 text-sm mt-3">
          Password aggiornata! Reindirizzamento…
        </p>
      )}
      {state === "err" && (
        <p className="text-red-600 text-sm mt-3">{errorMsg}</p>
      )}
    </section>
  );
}

/* ------- helper messaggi -------- */
function humanizeFirebaseError(code?: string) {
  switch (code) {
    case "auth/user-not-found":
      return "Nessun account con questa email.";
    case "auth/invalid-email":
      return "Email non valida.";
    case "auth/too-many-requests":
      return "Troppi tentativi. Riprova tra qualche minuto.";
    case "auth/unauthorized-continue-uri":
    case "auth/invalid-continue-uri":
    case "auth/missing-continue-uri":
      return "Link di reset non valido. Contatta l'assistenza.";
    case "auth/operation-not-allowed":
      return "Reset password non abilitato. Contatta l'assistenza.";
    case "missing_email_config":
      return "Servizio email non configurato. Contatta l'assistenza.";
    case "send_failed":
    case "admin_error":
    case "server_error":
      return "Non riesco a inviare l'email di reset.";
    case "request_failed":
      return "Connessione assente o instabile. Riprova.";
    case "auth/weak-password":
      return "La password è troppo debole (min 6-8 caratteri).";
    case "auth/expired-action-code":
      return "Il link è scaduto. Richiedi un nuovo reset.";
    case "auth/invalid-action-code":
      return "Link non valido. Richiedi un nuovo reset.";
    default:
      return "";
  }
}

function getPasswordResetUrl() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
  return `${baseUrl.replace(/\/$/, "")}/reset-password`;
}

type ResetApiResult = { ok: true } | { ok: false; error: string };

async function requestPasswordResetViaApi(
  email: string
): Promise<ResetApiResult> {
  try {
    const res = await fetch("/api/auth/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) return { ok: true };
    let data: { error?: string } | null = null;
    try {
      data = (await res.json()) as { error?: string };
    } catch {
      data = null;
    }
    return { ok: false, error: data?.error || "request_failed" };
  } catch {
    return { ok: false, error: "request_failed" };
  }
}

function shouldFallbackToFirebase(error?: string) {
  return (
    error === "missing_email_config" ||
    error === "send_failed" ||
    error === "admin_error" ||
    error === "server_error" ||
    error === "request_failed"
  );
}
