"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Item = { date: string; grade: number };

export default function GradesChart({
  math,
  phys,
}: {
  math: Item[];
  phys: Item[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(560);

  // Responsive width (ResizeObserver, minimal)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width || el.clientWidth;
      if (w) setWidth(Math.max(320, Math.floor(w)));
    });
    ro.observe(el);
    setWidth(Math.max(320, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const points = useMemo(() => {
    const xs = Array.from(new Set([...math, ...phys].map((d) => d.date))).sort();
    const mapX = new Map(xs.map((d, i) => [d, i] as const));
    const toPts = (arr: Item[]) =>
      arr
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((d) => ({ x: mapX.get(d.date)!, y: d.grade }));
    return { xs, math: toPts(math), phys: toPts(phys) };
  }, [math, phys]);

  const H = 220;
  const P = 36; // left pad
  const R = 14; // right/bottom pad
  const innerW = width - P - R;
  const innerH = H - P - R;
  const maxX = Math.max(1, points.xs.length - 1);
  const sx = (x: number) => P + (x / maxX) * innerW;
  const sy = (y: number) => R + (1 - Math.max(0, Math.min(10, y)) / 10) * innerH;

  function toSmoothPath(arr: { x: number; y: number }[]) {
    if (!arr.length) return "";
    const pts = arr.map((p) => ({ x: sx(p.x), y: sy(p.y) }));
    if (pts.length < 2) return `M${pts[0].x},${pts[0].y}`;
    const d: string[] = [];
    d.push(`M${pts[0].x},${pts[0].y}`);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const k = 0.22;
      const c1x = p1.x + (p2.x - p0.x) * k;
      const c1y = p1.y + (p2.y - p0.y) * k;
      const c2x = p2.x - (p3.x - p1.x) * k;
      const c2y = p2.y - (p3.y - p1.y) * k;
      d.push(`C${c1x},${c1y},${c2x},${c2y},${p2.x},${p2.y}`);
    }
    return d.join("");
  }

  function toAreaPath(arr: { x: number; y: number }[]) {
    if (!arr.length) return "";
    const start = { x: sx(arr[0].x), y: sy(arr[0].y) };
    const end = { x: sx(arr[arr.length - 1].x), y: sy(arr[arr.length - 1].y) };
    const baseline = sy(0);
    const line = toSmoothPath(arr);
    return `${line} L ${end.x},${baseline} L ${start.x},${baseline} Z`;
  }

  const pathMath = toSmoothPath(points.math);
  const pathPhys = toSmoothPath(points.phys);
  const areaMath = toAreaPath(points.math);
  const areaPhys = toAreaPath(points.phys);

  const Y_TICKS = [0, 3, 5, 7, 10];

  // Hover state
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const rel = Math.max(0, Math.min(1, (x - P) / Math.max(1, innerW)));
    const idx = Math.round(rel * maxX);
    setHoverIdx(Math.max(0, Math.min(points.xs.length - 1, idx)));
  };
  const onLeave = () => setHoverIdx(null);

  const hx = hoverIdx != null ? sx(hoverIdx) : null;
  const hyMath = hoverIdx != null ? sy(points.math.find(p => p.x === hoverIdx)?.y ?? NaN) : null;
  const hyPhys = hoverIdx != null ? sy(points.phys.find(p => p.x === hoverIdx)?.y ?? NaN) : null;

  const dateLabel = hoverIdx != null ? points.xs[hoverIdx] : null;
  const valMath = hoverIdx != null ? math.find(d => d.date === dateLabel)?.grade : undefined;
  const valPhys = hoverIdx != null ? phys.find(d => d.date === dateLabel)?.grade : undefined;

  return (
    <div ref={containerRef} className="mt-2 rounded-2xl border border-slate-200 bg-white [.dark_&]:bg-slate-900/60 overflow-hidden">
      <div className="flex items-center gap-3 px-3 pt-3 text-[12px] font-semibold">
        <span className="inline-flex items-center gap-1 text-slate-700 [.dark_&]:text-slate-200">
          <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb] inline-block" /> Matematica
        </span>
        <span className="inline-flex items-center gap-1 text-slate-700 [.dark_&]:text-slate-200">
          <span className="h-2.5 w-2.5 rounded-full bg-[#10b981] inline-block" /> Fisica
        </span>
      </div>
      <svg
        width={width}
        height={H}
        viewBox={`0 0 ${width} ${H}`}
        role="img"
        aria-label="Andamento voti"
        className="block"
        onPointerMove={onPointerMove}
        onPointerLeave={onLeave}
      >
        <defs>
          <linearGradient id="gMathArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gPhysArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y grid */}
        {Y_TICKS.map((v) => (
          <g key={v}>
            <line x1={P} y1={sy(v)} x2={width - R} y2={sy(v)} stroke="#eef2f7" strokeWidth={1} />
            <text x={6} y={sy(v) + 4} fontSize={10} fill="#64748b">{v}</text>
          </g>
        ))}

        {/* X labels (sparse) */}
        {points.xs.map((d, i) => (
          (points.xs.length <= 6 || i === 0 || i === Math.floor(points.xs.length / 2) || i === points.xs.length - 1) && (
            <text key={d} x={sx(i)} y={H - 4} fontSize={10} fill="#94a3b8" textAnchor="middle">
              {d.slice(5)}
            </text>
          )
        ))}

        {/* Areas + lines */}
        {areaMath && <path d={areaMath} fill="url(#gMathArea)" />}
        {areaPhys && <path d={areaPhys} fill="url(#gPhysArea)" />}
        {pathMath && <path d={pathMath} fill="none" stroke="#2563eb" strokeWidth={3} strokeLinecap="round" />}
        {pathPhys && <path d={pathPhys} fill="none" stroke="#10b981" strokeWidth={3} strokeLinecap="round" />}

        {/* Points */}
        {points.math.map((p, i) => (
          <circle key={`m${i}`} cx={sx(p.x)} cy={sy(p.y)} r={2.5} fill="#2563eb" stroke="#fff" strokeWidth={1} />
        ))}
        {points.phys.map((p, i) => (
          <circle key={`p${i}`} cx={sx(p.x)} cy={sy(p.y)} r={2.5} fill="#10b981" stroke="#fff" strokeWidth={1} />
        ))}

        {/* Hover crosshair */}
        {hx != null && (
          <line x1={hx} y1={R} x2={hx} y2={H - R} stroke="#e2e8f0" strokeDasharray="4 4" />
        )}
        {hx != null && Number.isFinite(hyMath || NaN) && (
          <circle cx={hx} cy={hyMath!} r={3.5} fill="#2563eb" />
        )}
        {hx != null && Number.isFinite(hyPhys || NaN) && (
          <circle cx={hx} cy={hyPhys!} r={3.5} fill="#10b981" />
        )}
      </svg>

      {/* Tooltip */}
      {hoverIdx != null && (
        <div className="-mt-1 mb-3 ml-3 inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold shadow-sm [.dark_&]:bg-slate-800 [.dark_&]:text-slate-100">
          <span className="text-slate-500">{points.xs[hoverIdx]}</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#2563eb]" /> {valMath ?? "—"}</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#10b981]" /> {valPhys ?? "—"}</span>
        </div>
      )}
    </div>
  );
}

