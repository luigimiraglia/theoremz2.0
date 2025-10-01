"use client";
import { useEffect, useState } from "react";
import TrackedLink from "@/components/TrackedLink";
import { Phone } from "lucide-react";

export default function BottomStopCTA() {
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById("cta-page-end");
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setAtEnd(entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0,
      }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const baseCls =
    "z-50 w-[calc(100%-40px)] max-w-[480px] rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-500 px-7 py-3.5 text-center text-[15px] font-black text-white shadow-md ring-1 ring-sky-400/30 transition hover:from-sky-500 hover:to-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300";

  const posCls = atEnd
    ? "absolute left-1/2 -translate-x-1/2 bottom-8"
    : "fixed left-1/2 -translate-x-1/2 bottom-[calc(2rem+env(safe-area-inset-bottom))]";

  return (
    <TrackedLink
      href="/contatto-rapido?source=link-in-bio"
      className={`${baseCls} ${posCls}`}
      event="linkinbio_call_click"
      ariaLabel="Richiedi informazioni"
    >
      <span className="pointer-events-none absolute right-[0px] top-[0px] z-10 h-2.5 w-2.5 ">
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-300/80"></span>
        <span className="absolute inset-0 rounded-full bg-emerald-400 ring-2 ring-white/80"></span>
      </span>
      <span className="inline-flex items-center justify-center gap-2">
        <span>Richiedi informazioni</span>
        <Phone aria-hidden className="h-4 w-4 text-white" />
      </span>
    </TrackedLink>
  );
}
