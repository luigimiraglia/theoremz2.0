"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { GoogleButton } from "@/components/GoogleButton"; // ← se lo hai già
import { useAuth } from "@/lib/AuthContext";

export default function Register() {
  const router = useRouter();
  const { user } = useAuth();

  /* form state */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLogin, setIsLogin] = useState(false); // toggle login / register
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* redirect se già loggato */
  useEffect(() => {
    if (user) router.replace("/account");
  }, [user, router]);

  /* submit */
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!acceptTerms && !isLogin) {
      setError("Devi accettare i Termini e Condizioni per creare l’account.");
      return;
    }

    try {
      setLoading(true);
      if (isLogin) {
        /* LOGIN */
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        /* REGISTER */
        await createUserWithEmailAndPassword(auth, email, password);
      }
      router.replace("/account"); // redirect account invece che home
    } catch (err: any) {
      setError(err.message ?? "Qualcosa è andato storto.");
    } finally {
      setLoading(false);
    }
  }

  /* UI */
  return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 drop-shadow-2xl">
        <h1 className="mb-4 text-center text-3xl font-bold text-slate-800">
          {isLogin ? "Accedi" : "Crea il tuo account"}
        </h1>

        {/* Google */}
        <GoogleButton disabled={loading} redirectTo="/account" />

        <div className="my-4 flex items-center gap-2">
          <hr className="flex-grow border-slate-300" />
          <span className="text-sm text-slate-500">oppure</span>
          <hr className="flex-grow border-slate-300" />
        </div>

        {/* form email / pw */}
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
            className="w-full rounded border p-2 text-slate-800"
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
            className="w-full rounded border p-2 text-slate-800"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {!isLogin && (
            <label
              htmlFor="accept-terms"
              className="flex cursor-pointer items-start gap-2 text-sm"
            >
              <input
                id="accept-terms"
                name="acceptTerms"
                type="checkbox"
                className="mt-1"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />
              <span className="text-slate-800 ">
                Accetto i{" "}
                <a
                  href="/termini-e-condizioni"
                  target="_blank"
                  className="text-blue-600 underline "
                >
                  Termini e Condizioni
                </a>
              </span>
            </label>
          )}

          {error && (
            <p className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Attendere…" : isLogin ? "Accedi" : "Crea account"}
          </button>
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
