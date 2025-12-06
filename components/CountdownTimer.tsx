"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  deadline: string;
};

type Parts = {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
};

function formatParts(ms: number): Parts {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  return {
    days: pad(days),
    hours: pad(hours),
    minutes: pad(minutes),
    seconds: pad(seconds),
  };
}

export default function CountdownTimer({ deadline }: Props) {
  const target = useMemo(() => new Date(deadline).getTime() || Date.now(), [deadline]);
  const [parts, setParts] = useState<Parts>(() => formatParts(target - Date.now()));

  useEffect(() => {
    const id = window.setInterval(() => {
      setParts(formatParts(target - Date.now()));
    }, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  const items: [string, string][] = [
    ["GG", parts.days],
    ["ORE", parts.hours],
    ["MIN", parts.minutes],
    ["SEC", parts.seconds],
  ];

  return (
    <div className="grid grid-cols-4 gap-2 text-white" aria-live="polite" role="timer">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-xl border border-white/25 bg-white/5 px-2 py-2 text-center shadow-[0_8px_20px_-12px_rgba(0,0,0,0.35)]"
        >
          <div className="text-[20px] sm:text-[22px] font-black leading-none tracking-tight">
            {value}
          </div>
          <div className="mt-1 text-[11px] font-bold tracking-[0.3em] text-white/80">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
