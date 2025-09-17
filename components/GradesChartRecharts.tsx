"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

type Item = { date: string; grade: number };

export default function GradesChartRecharts({
  math,
  phys,
}: {
  math: Item[];
  phys: Item[];
}) {
  const data = useMemo(() => {
    const map = new Map<string, { date: string; math?: number; phys?: number }>();
    for (const it of math) {
      const key = it.date;
      if (!map.has(key)) map.set(key, { date: key });
      map.get(key)!.math = it.grade;
    }
    for (const it of phys) {
      const key = it.date;
      if (!map.has(key)) map.set(key, { date: key });
      map.get(key)!.phys = it.grade;
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [math, phys]);

  return (
    <div className="mt-2 rounded-2xl border border-slate-200 bg-white [.dark_&]:bg-slate-900/60 p-2">
      <div className="flex items-center gap-3 px-2 pt-1 text-[12px] font-semibold">
        <span className="inline-flex items-center gap-1 text-slate-700 [.dark_&]:text-slate-200">
          <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb] inline-block" /> Matematica
        </span>
        <span className="inline-flex items-center gap-1 text-slate-700 [.dark_&]:text-slate-200">
          <span className="h-2.5 w-2.5 rounded-full bg-[#10b981] inline-block" /> Fisica
        </span>
      </div>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 12, left: 12, bottom: 6 }}>
            <defs>
              <linearGradient id="gMath" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gPhys" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickFormatter={(d) => (typeof d === "string" ? d.slice(5) : d)}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={{ stroke: "#e2e8f0" }} />
            <Tooltip
              contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }}
              labelFormatter={(l) => `Data: ${l}`}
              formatter={(v: any, n: string) => [v, n === "math" ? "Matematica" : "Fisica"]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="math" name="Matematica" stroke="#2563eb" fill="url(#gMath)" strokeWidth={2.5} dot={{ r: 2 }} />
            <Area type="monotone" dataKey="phys" name="Fisica" stroke="#10b981" fill="url(#gPhys)" strokeWidth={2.5} dot={{ r: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

