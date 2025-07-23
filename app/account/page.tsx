"use client"; // ci serve per useAuth e le chiamate client-side

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { logout } from "@/lib/auth";

export default function AccountPage() {
  const { user, isSubscribed } = useAuth();
  const router = useRouter();

  // Se non c’è utente, reindirizzo subito al login/registrazione
  useEffect(() => {
    if (!user) {
      router.replace("/register");
    }
  }, [user, router]);

  // Se ancora non ho user o sto reindirizzando, evita flicker
  if (!user) return null;

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Il mio Account</h1>

      <section className="bg-white rounded-lg shadow p-4 space-y-2">
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>Abbonato:</strong> {isSubscribed ? "si" : "no"}
        </p>
        {/* Aggiungi altri campi se li hai */}
      </section>

      <button
        onClick={() => logout()}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
      >
        Esci
      </button>
    </main>
  );
}
