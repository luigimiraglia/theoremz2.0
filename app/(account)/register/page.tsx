"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { Check } from "lucide-react";
import { auth } from "@/lib/firebase";
import { GoogleButton } from "@/components/GoogleButton";
import { useAuth } from "@/lib/AuthContext";

export default function Register() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const redirectTo = searchParams?.get("redirect") || "/account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace(redirectTo);
  }, [user, router, redirectTo]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!isLogin && !acceptTerms) {
      setError("Devi accettare i Termini e Condizioni per creare l’account.");
      return;
    }

    try {
      setLoading(true);
      let createdUser = null;
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        createdUser = credential.user;
        if (createdUser) {
          try {
            const token = await createdUser.getIdToken();
            await fetch("/api/me/init-lite-profile", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                fullName: createdUser.displayName || null,
              }),
            });
          } catch (initError) {
            console.warn("Lite profile init failed:", initError);
          }
        }
        if (subscribeNewsletter && createdUser) {
          try {
            await fetch("/api/newsletter", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: createdUser.uid,
                email,
                subscribed: true,
                source: "signup_form",
                frequenza: "weekly",
                tipo_contenuti: ["lezioni", "esercizi"],
              }),
            });
          } catch (newsletterError) {
            console.error("Newsletter opt-in error:", newsletterError);
          }
        }
      }
      router.replace(redirectTo);
    } catch (err: any) {
      setError(err.message ?? "Qualcosa è andato storto.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setError(null);
    setInfo(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Inserisci l'email per reimpostare la password.");
      return;
    }
    try {
      setLoading(true);
      const apiResult = await requestPasswordResetViaApi(normalizedEmail);
      if (!apiResult.ok) {
        if (shouldFallbackToFirebase(apiResult.error)) {
          const resetUrl = getPasswordResetUrl();
          await sendPasswordResetEmail(auth, normalizedEmail, {
            url: resetUrl,
            handleCodeInApp: true,
          });
        } else {
          setError(
            humanizeFirebaseError(apiResult.error) ||
              "Non riesco a inviare l'email di reset."
          );
          return;
        }
      }
      setInfo("Email inviata: controlla la posta per reimpostare la password.");
    } catch (err: any) {
      const code = err?.code as string | undefined;
      setError(
        humanizeFirebaseError(code) ||
          err?.message ||
          "Non riesco a inviare l'email di reset."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[70vh] items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-2xl">
        <h1 className="mb-4 text-center text-3xl font-bold text-slate-800">
          {isLogin ? "Accedi" : "Crea il tuo account"}
        </h1>

        <GoogleButton disabled={loading} redirectTo="/account" />

        <div className="my-4 flex items-center gap-2">
          <hr className="flex-grow border-slate-300" />
          <span className="text-sm text-slate-500">oppure</span>
          <hr className="flex-grow border-slate-300" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="reg-email" className="sr-only">
            Email
          </label>
          <input
            id="reg-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Email"
            className="w-full rounded-[14px] border border-slate-300 bg-white p-3 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="reg-password" className="sr-only">
            Password
          </label>
          <input
            id="reg-password"
            name="password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder="Password"
            className="w-full rounded-[14px] border border-slate-300 bg-white p-3 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {!isLogin && (
            <div className="space-y-3 text-sm text-slate-800">
              <label className="flex cursor-pointer items-start gap-3">
                <span className="relative mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center">
                  <input
                    id="accept-terms"
                    name="acceptTerms"
                    type="checkbox"
                    className="peer absolute inset-0 h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 checked:border-blue-600 checked:bg-blue-600"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                  />
                  <Check className="pointer-events-none absolute h-3 w-3 text-white opacity-0 transition peer-checked:opacity-100" />
                </span>
                <span className="leading-tight flex-1">
                  Accetto i{" "}
                  <a
                    href="/termini-di-servizio"
                    target="_blank"
                    className="text-blue-600 underline"
                  >
                    Termini e Condizioni
                  </a>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3">
                <span className="relative mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center">
                  <input
                    id="newsletter-optin"
                    name="newsletterOptIn"
                    type="checkbox"
                    className="peer absolute inset-0 h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 checked:border-blue-600 checked:bg-blue-600"
                    checked={subscribeNewsletter}
                    onChange={(e) => setSubscribeNewsletter(e.target.checked)}
                  />
                  <Check className="pointer-events-none absolute h-3 w-3 text-white opacity-0 transition peer-checked:opacity-100" />
                </span>
                <span className="leading-tight flex-1">
                  Ricevi consigli e materiale ogni settimana (opzionale).
                </span>
              </label>
            </div>
          )}

          {error && (
            <p className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded bg-emerald-100 px-3 py-2 text-sm text-emerald-700">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[14px] bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Attendere…" : isLogin ? "Accedi" : "Crea account"}
          </button>
          {isLogin && (
            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-sm font-semibold text-blue-600 hover:underline disabled:opacity-60"
              >
                Password dimenticata?
              </button>
            </div>
          )}
        </form>

        <p className="text-center text-sm text-slate-800">
          {isLogin ? "Non hai un account?" : "Hai già un account?"}{" "}
          <button
            type="button"
            onClick={() => setIsLogin((v) => !v)}
            className="font-semibold text-blue-600 hover:underline"
          >
            {isLogin ? "Registrati" : "Accedi"}
          </button>
        </p>
      </div>
    </div>
  );
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
    default:
      return "";
  }
}
