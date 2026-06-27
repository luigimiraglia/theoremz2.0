"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    color?: string;
  }
>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cx(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-slate-500 [&_.recharts-grid_line]:stroke-slate-200 [&_.recharts-tooltip-cursor]:stroke-slate-300",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, item]) => item.color);
  if (!colorConfig.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: colorConfig
          .map(([key, item]) => `[data-chart=${id}] { --color-${key}: ${item.color}; }`)
          .join("\n"),
      }}
    />
  );
}

export const ChartTooltip = RechartsPrimitive.Tooltip;

export function ChartTooltipContent({
  active,
  payload,
  label,
  className,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> & {
  className?: string;
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  return (
    <div
      className={cx(
        "min-w-[150px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg",
        className,
      )}
    >
      {label ? <div className="mb-1 font-semibold text-slate-900">{String(label)}</div> : null}
      <div className="space-y-1">
        {payload.map((item) => {
          const key = String(item.dataKey || item.name || "");
          const itemConfig = config[key];
          const color = item.color || itemConfig?.color || "#0f172a";
          return (
            <div key={key} className="flex items-center justify-between gap-5 text-slate-600">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                <span>{itemConfig?.label || item.name || key}</span>
              </div>
              <span className="font-semibold tabular-nums text-slate-900">
                {String(item.value ?? 0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
