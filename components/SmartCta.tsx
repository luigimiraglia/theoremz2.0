"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";

export default function SmartCta({ className }: { className?: string }) {
  const { user, isSubscribed } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { href, label } = useMemo(() => {
    if (!user) return { href: "/register", label: "Unisciti" };
    if (isSubscribed === true)
      return { href: "/account", label: "Il mio account" };
    // isSubscribed === false o null (ancora in fetch): proponi upgrade
    return { href: "/black", label: "Passa a Black" };
  }, [user, isSubscribed]);

  if (!mounted) {
    // SSR/client first paint fallback per evitare hydration mismatch
    return (
      <Link href="/register" aria-label="Unisciti" className={className}>
        Unisciti
      </Link>
    );
  }

  return (
    <Link href={href} aria-label={label} className={className}>
      {label}
    </Link>
  );
}
