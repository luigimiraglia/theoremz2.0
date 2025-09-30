"use client";
import { track } from "@/lib/analytics";
import { AnchorHTMLAttributes, PropsWithChildren } from "react";

type Props = PropsWithChildren<
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    event: string;
    params?: Record<string, any>;
  }
>;

export default function TrackedA({ event, params, href, children, ...rest }: Props) {
  function handleClick() {
    try {
      const h = typeof href === "string" ? href : undefined;
      track(event, { ...params, href: h, source: "link-in-bio" });
    } catch {}
  }
  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}

