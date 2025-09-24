"use client";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";
import React from "react";
export default function AccountButton() {
  const { user } = useAuth();
  // Evita mismatch SSR/CSR: rendi un fallback neutro fino a idratazione
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => setHydrated(true), []);

  const href = hydrated ? (user ? "/account" : "/register") : "/account";
  const label = hydrated ? (user ? "Il mio account" : "Unisciti") : "Account";

  return (
    <Link
      href={href}
      className="rounded-xl border-2 border-blue-500 px-6 py-2 font-bold text-blue-500 hover:bg-blue-500 hover:text-white transition-colors duration-250 ease-in-out delay-50"
    >
      {label}
    </Link>
  );
}
