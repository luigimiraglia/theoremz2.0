"use client";
import Link, { LinkProps } from "next/link";
import { track } from "@/lib/analytics";
import { PropsWithChildren } from "react";

type Props = PropsWithChildren<
  LinkProps & {
    className?: string;
    event: string;
    params?: Record<string, any>;
    ariaLabel?: string;
  }
>;

export default function TrackedLink({
  href,
  children,
  className,
  event,
  params,
  ariaLabel,
  ...rest
}: Props) {
  function handleClick() {
    try {
      const h = typeof href === "string" ? href : href?.toString();
      track(event, { ...params, href: h, source: "link-in-bio" });
    } catch {}
  }
  return (
    <Link
      href={href}
      className={className}
      onClick={handleClick}
      aria-label={ariaLabel}
      {...rest}
    >
      {children}
    </Link>
  );
}

