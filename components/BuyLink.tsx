"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";
import { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  href: string;
  plan?: string;
  price?: string;
  className?: string;
  ariaLabel?: string;
}>;

export default function BuyLink({ href, plan, price, className, ariaLabel, children }: Props) {
  const onClick = () => {
    try {
      track("subscribe_click", { plan, price, href });
    } catch {}
  };
  // Keep using Next Link for consistent prefetching/behavior
  return (
    <Link href={href} aria-label={ariaLabel} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
