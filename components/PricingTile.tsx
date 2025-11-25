// components/PricingTile.tsx
"use client";

import { useState } from "react";
import PriceCard, {
  type PriceFeature,
  type ToggleOption,
} from "@/components/PriceCard";

type Props = {
  outerClassName: string;
  headerLabel: string;
  headerGradient: string;
  title: string;
  features: PriceFeature[];
  toggleOptions: ToggleOption[];
  defaultToggleId: string;
  priceCardClassName?: string;
};

export default function PricingTile({
  outerClassName,
  headerLabel,
  headerGradient,
  title,
  features,
  toggleOptions,
  defaultToggleId,
  priceCardClassName,
}: Props) {
  const [selectedId, setSelectedId] = useState<string>(defaultToggleId);

  const active =
    toggleOptions.find((opt) => opt.id === selectedId) || toggleOptions[0];

  return (
    <div className={outerClassName}>
      <div
        className={`flex items-center justify-between rounded-[18px] px-4 py-2.5 text-white shadow-md ring-1 ring-white/30 ${headerGradient}`}
      >
        <div className="text-[12px] font-extrabold uppercase tracking-wide">
          {headerLabel}
        </div>
        <div className="flex items-center">
          <div className="inline-flex items-center justify-center gap-1 rounded-full border border-white/30 bg-white/15 px-1 py-1 shadow-[0_6px_18px_-10px_rgba(255,255,255,0.9)] backdrop-blur-sm">
            {toggleOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedId(opt.id)}
                className={`rounded-full px-2 py-1 text-[11px] font-semibold transition ${
                  selectedId === opt.id
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-white/30"
                    : "text-white/90 hover:bg-white/10 hover:text-white"
                }`}
              >
                {opt.label}
                {opt.desktopNote ? (
                  <span className="ml-1 hidden text-[10px] font-semibold text-white/90 md:inline">
                    {opt.desktopNote}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 overflow-hidden rounded-[22px] bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-white px-5 py-3 text-center text-lg font-black text-slate-900">
          {title}
        </div>

        <PriceCard
          price={active.price}
          unit={active.unit}
          buyHref={active.buyHref}
          infoHref={active.infoHref}
          plan={active.plan}
          className={`mt-0 rounded-none border-none shadow-none ring-0 hover:translate-y-0 group-hover:translate-y-0 ${priceCardClassName || ""}`}
          features={features}
        />
      </div>
    </div>
  );
}
