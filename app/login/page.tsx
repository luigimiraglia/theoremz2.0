// app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login, loginWithGoogle } from "@/lib/auth";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Se l’utente è già loggato, reindirizza subito
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/");
    });
    return () => unsub();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      // il listener onAuthStateChanged esegue il redirect
    } catch (err: any) {
      setError(err.message || "Errore durante il login");
    }
  };

  const handleGoogle = async () => {
    try {
      await loginWithGoogle();
      // il listener onAuthStateChanged esegue il redirect
    } catch (err: any) {
      setError(err.message || "Errore con Google Sign‑In");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-sm">
        <h1 className="text-2xl mb-6 text-center">Accedi</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-2 rounded"
          >
            Accedi
          </button>
        </form>
        <div className="mt-6 text-center">
          <button
            onClick={handleGoogle}
            className="w-full border p-2 rounded flex items-center justify-center"
          >
            Accedi con Google
          </button>
        </div>
      </div>
    </div>
  );
}
