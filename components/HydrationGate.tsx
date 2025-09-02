"use client";

import { useEffect, useState } from "react";

export default function HydrationGate({
  children,
  minDelayMs = 260,
  skeleton,
  className,
}: {
  children: React.ReactNode;
  minDelayMs?: number;
  skeleton?: React.ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const t = setTimeout(() => setReady(true), minDelayMs);
    return () => clearTimeout(t);
  }, [mounted, minDelayMs]);

  return (
    <div className={`relative ${className ?? ""}`}>
      {/* Content container fades in smoothly */}
      <div
        style={{
          opacity: ready ? 1 : 0,
          visibility: ready ? "visible" : "hidden",
          transition: "opacity 220ms ease-out",
        }}
      >
        {children}
      </div>

      {/* Overlay skeleton during hydration + small delay */}
      {!ready && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          {skeleton ?? null}
        </div>
      )}
    </div>
  );
}

// No default skeleton here: pass one explicitly for consistency
