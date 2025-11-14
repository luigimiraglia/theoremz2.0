"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
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
    const map = new Map<
      string,
      { date: string; ts: number; math?: number; phys?: number }
    >();
    const ensureEntry = (key: string) => {
      if (!map.has(key)) {
        const iso = `${key}T00:00:00Z`;
        const ts = Number.isFinite(Date.parse(iso)) ? Date.parse(iso) : map.size;
        map.set(key, { date: key, ts });
      }
      return map.get(key)!;
    };
    for (const it of math) {
      const entry = ensureEntry(it.date);
      entry.math = it.grade;
    }
    for (const it of phys) {
      const entry = ensureEntry(it.date);
      entry.phys = it.grade;
    }
    return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
  }, [math, phys]);

  const formatDate = (value: number | string) => {
    const ts =
      typeof value === "number"
        ? value
        : Number.isFinite(Date.parse(`${value}T00:00:00Z`))
        ? Date.parse(`${value}T00:00:00Z`)
        : undefined;
    if (!ts) return "";
    return new Date(ts).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <div className="mt-2 rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-4 shadow-sm [.dark_&]:border-white/10 [.dark_&]:from-slate-900 [.dark_&]:via-slate-900 [.dark_&]:to-slate-900/60">
      <div className="flex items-center gap-4 px-1 pt-1 text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-500 [.dark_&]:text-slate-300">
        <span className="inline-flex items-center gap-2 text-slate-700 normal-case tracking-[0.08em] [.dark_&]:text-slate-200">
          <span className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[#2b7fff]" /> Matematica
        </span>
        <span className="inline-flex items-center gap-2 text-slate-700 normal-case tracking-[0.08em] [.dark_&]:text-slate-200">
          <span className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[#06b6d4]" /> Fisica
        </span>
      </div>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 12, right: 16, left: 4, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="2 6" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="ts"
              type="number"
              domain={["dataMin", "dataMax"]}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
              tickFormatter={(value) => formatDate(value)}
              padding={{ left: 0, right: 0 }}
            />
            <YAxis
              domain={[0, 10]}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              width={24}
            />
            <Tooltip
              cursor={{ stroke: "#e2e8f0", strokeDasharray: "4 4" }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                boxShadow: "0 6px 18px rgba(0,0,0,.06)",
              }}
              labelStyle={{ color: "#0f172a", fontWeight: 700, fontSize: 12 }}
              labelFormatter={(value) => formatDate(value as number)}
              formatter={(value: any, _name: string, props: any) => {
                const key = props?.dataKey;
                return [value, key === "math" ? "Matematica" : "Fisica"];
              }}
            />
            <Line
              type="monotone"
              dataKey="math"
              name="Matematica"
              stroke="#2b7fff"
              strokeWidth={2.5}
              strokeLinecap="round"
              dot={{ r: 4, fill: "#fff", strokeWidth: 2, stroke: "#2b7fff" }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="phys"
              name="Fisica"
              stroke="#06b6d4"
              strokeWidth={2.5}
              strokeLinecap="round"
              dot={{ r: 4, fill: "#fff", strokeWidth: 2, stroke: "#06b6d4" }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
