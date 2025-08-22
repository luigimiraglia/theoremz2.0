"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";

export default function SmartCta({ className }: { className?: string }) {
  const { user, isSubscribed } = useAuth();

  const { href, label } = useMemo(() => {
    if (!user) return { href: "/register", label: "Unisciti" };
    if (isSubscribed === true)
      return { href: "/account", label: "Il mio account" };
    // isSubscribed === false o null (ancora in fetch): proponi upgrade
    return { href: "/black", label: "Passa a Black" };
  }, [user, isSubscribed]);

  return (
    <Link href={href} aria-label={label} className={className}>
      {label}
    </Link>
  );
}
