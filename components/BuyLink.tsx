"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";
import { useAuth } from "@/lib/AuthContext";
import { PropsWithChildren, useMemo } from "react";

type Props = PropsWithChildren<{
  href: string;
  plan?: string;
  price?: string;
  className?: string;
  ariaLabel?: string;
}>;

export default function BuyLink({
  href,
  plan,
  price,
  className,
  ariaLabel,
  children,
}: Props) {
  const { user } = useAuth();

  // Costruisci URL con parametri per precompilare email e tracking
  const enhancedHref = useMemo(() => {
    if (!href.includes("buy.stripe.com")) return href;

    try {
      const url = new URL(href);

      // Precompila email se l'utente è loggato
      if (user?.email) {
        url.searchParams.set("prefilled_email", user.email);
      }

      // Aggiungi parametri di tracking
      if (plan) {
        url.searchParams.set("client_reference_id", `plan_${plan}`);
      }

      return url.toString();
    } catch {
      return href;
    }
  }, [href, user?.email, plan]);

  const onClick = () => {
    try {
      track("subscribe_click", {
        plan,
        price,
        href: enhancedHref,
        user_email: user?.email || "anonymous",
      });

      // Salva un timestamp di quando l'utente ha cliccato per comprare
      // Utile per tracking e debugging
      sessionStorage.setItem("last_purchase_attempt", Date.now().toString());
      if (plan) {
        sessionStorage.setItem("last_purchase_plan", plan);
      }
    } catch {}
  };

  // Keep using Next Link for consistent prefetching/behavior
  return (
    <Link
      href={enhancedHref}
      aria-label={ariaLabel}
      className={className}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
