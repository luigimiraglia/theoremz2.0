"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithPopup,
  type UserCredential,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface GoogleButtonProps {
  /** Se il form esterno è in loading, puoi disabilitare il bottone */
  disabled?: boolean;
  /** Facoltativo: callback eseguita al termine del login  */
  onSuccess?: (credential: UserCredential) => void | Promise<void>;
  onStart?: () => void;
  onError?: (error: unknown) => void;
  /** Redirect personalizzato dopo il login (default: /) */
  redirectTo?: string;
}

export function GoogleButton({
  disabled,
  onSuccess,
  onStart,
  onError,
  redirectTo = "/",
}: GoogleButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleGoogle() {
    setError(null);
    try {
      setLoading(true);
      onStart?.();
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);

      if (onSuccess) {
        await onSuccess(credential);
        return;
      }

      // Redirect personalizzato
      if (redirectTo !== "/") {
        router.push(redirectTo);
      }
    } catch (err: any) {
      onError?.(err);
      setError(err.message ?? "Errore di autenticazione Google");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleGoogle}
        disabled={disabled || loading}
        className="flex w-full items-center justify-center gap-3 rounded-[14px] border border-slate-300 bg-white py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
      >
        <Image
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt=""
          width={20}
          height={20}
        />
        {loading ? "Attendere…" : "Continua con Google"}
      </button>

      {error && (
        <p className="mt-2 rounded bg-red-100 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </>
  );
}
