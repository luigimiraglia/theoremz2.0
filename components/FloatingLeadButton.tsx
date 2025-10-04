"use client";
import Link from "next/link";
import { Phone } from "lucide-react";

export default function FloatingLeadButton({
  href,
  label = "Parla con un tutor",
}: {
  href: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-2xl px-6 sm:px-7 py-2.5 text-white shadow-[0_8px_20px_rgba(2,132,199,0.5)] bg-gradient-to-r from-sky-600 to-indigo-500 hover:from-sky-500 hover:to-indigo-400 active:translate-y-[1px] relative justify-center"
      style={{
        position: "fixed",
        zIndex: 2147483647,
        left: 0,
        right: 0,
        margin: "0 auto",
        bottom: "max(1rem, env(safe-area-inset-bottom))",
        width: "calc(100% - 2rem)",
        maxWidth: "520px",
      }}
      aria-label={`${label} — Theoremz`}
      title={`${label} — Theoremz`}
    >
      {/* Green corner beacon */}
      <span className="pointer-events-none absolute -top-1 -right-1 inline-flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white/70" />
      </span>
      <Phone className="h-5 w-5" aria-hidden="true" />
      <span className="font-extrabold tracking-tight text-[14.5px] sm:text-[15.5px]">
        {label}
      </span>
    </Link>
  );
}
