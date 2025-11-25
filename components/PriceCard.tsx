// components/PriceCard.tsx
"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Check, ChevronDown, X } from "lucide-react";
import BuyLink from "@/components/BuyLink";

export type FeatureVariant = "ok" | "no" | "pink" | "violet";
export type PriceFeature = [FeatureVariant, ReactNode, string[]?];

export type ToggleOption = {
  id: string;
  label: string;
  price: string;
  unit: string;
  buyHref: string;
  infoHref: string;
  plan?: string;
};

type PriceCardProps = {
  price?: string;
  unit?: string;
  features: PriceFeature[];
  buyHref?: string;
  infoHref?: string;
  className?: string;
  plan?: string;
  defaultToggleId?: string;
  toggleOptions?: ToggleOption[];
  tag?: ReactNode;
};

function defaultPlanFrom(price?: string, unit?: string) {
  if (!price || !unit) return "";
  if (unit.includes("anno")) return "Annuale";
  if (unit.includes("mese")) {
    if (price.includes("14,90")) return "Black Standard Mensile";
    if (price.includes("5,90")) return "Essential Mensile";
    return "Mensile";
  }
  return "";
}

export default function PriceCard({
  price,
  unit,
  features,
  buyHref,
  infoHref,
  className,
  plan,
  defaultToggleId,
  toggleOptions,
  tag,
}: PriceCardProps) {
  const hasToggle = Array.isArray(toggleOptions) && toggleOptions.length > 1;
  const [selectedId, setSelectedId] = useState<string>(
    defaultToggleId || (hasToggle ? toggleOptions![0].id : "")
  );
  const [openDetail, setOpenDetail] = useState<number | null>(null);

  const activeOption = hasToggle
    ? toggleOptions?.find((opt) => opt.id === selectedId) || toggleOptions?.[0]
    : null;

  const resolvedPrice = activeOption ? activeOption.price : price || "";
  const resolvedUnit = activeOption ? activeOption.unit : unit || "";
  const resolvedBuyHref = activeOption ? activeOption.buyHref : buyHref || "#";
  const resolvedInfoHref = activeOption
    ? activeOption.infoHref
    : infoHref || "#";
  const resolvedPlan =
    activeOption?.plan || plan || defaultPlanFrom(resolvedPrice, resolvedUnit);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/15 bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_24px_55px_-30px_rgba(15,23,42,0.45)] ${className || ""}`}
    >
      <div className="relative px-6 pt-2 pb-2 lg:px-8 lg:pt-3 lg:pb-3">
        <div className="relative inline-block w-full">
          <div className="flex flex-col items-center">
            <div className="relative text-[41px] lg:text-[46px] font-black bg-gradient-to-r text-transparent from-blue-600 to-cyan-400 bg-clip-text drop-shadow-[0_8px_24px_rgba(56,189,248,0.38)] lg:whitespace-nowrap">
              {resolvedPrice}
              {resolvedUnit}
            </div>
          </div>
        </div>

        {hasToggle ? (
          <div className="mt-1 mb-0 flex justify-center">
            <div className="inline-flex items-center justify-center gap-1 rounded-full border border-slate-200 bg-slate-200 px-1 py-[2px]">
              {toggleOptions!.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedId(opt.id)}
                  className={`rounded-full px-1.5 py-[3px] text-[11px] font-semibold transition min-w-[0] ${
                    selectedId === opt.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-700 hover:text-slate-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <ul className="mt-4 grid gap-2 text-[16px] font-semibold lg:text-[15.5px]">
          {features.map(([variant, text, details], i) => {
            const strike = variant === "no";
            const pink = variant === "pink";
            const violet = variant === "violet";
            const colorClass =
              variant === "no"
                ? "text-rose-500"
                : variant === "pink"
                  ? "text-pink-500"
                  : variant === "violet"
                    ? "text-purple-500"
                    : "text-slate-900";

            return (
              <li key={i} className="flex items-start gap-2">
                {variant === "no" ? (
                  <X
                    className={`${colorClass} mt-[5px] h-[22px] w-[22px]`}
                    strokeWidth={3.2}
                    aria-hidden
                  />
                ) : (
                  <Check
                    className={`${colorClass} mt-[3px] h-[22px] w-[22px]`}
                    strokeWidth={3.2}
                    aria-hidden
                  />
                )}

                {violet && Array.isArray(details) && details.length ? (
                  <details
                    open={openDetail === i}
                    className="group w-full text-left"
                  >
                    <summary
                      className="flex cursor-pointer list-none items-center gap-2 text-[15px] font-bold"
                      onClick={(e) => {
                        e.preventDefault();
                        setOpenDetail(openDetail === i ? null : i);
                      }}
                    >
                      <span className="bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 text-transparent">
                        {text}
                      </span>
                      <ChevronDown
                        className={`h-6 w-6 shrink-0 translate-y-[1px] text-purple-500 transition-transform duration-200 ${
                          openDetail === i ? "rotate-180" : ""
                        }`}
                      />
                    </summary>
                    <ul className="mt-2 space-y-1.5 text-[13px] font-semibold">
                      {details.map((d, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500" />
                          <span className="bg-clip-text bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 text-transparent">
                            {d}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <span
                    className={`${
                      pink
                        ? "bg-clip-text bg-gradient-to-r text-transparent from-purple-500 font-bold to-pink-500"
                        : violet
                          ? "bg-clip-text bg-gradient-to-r text-transparent from-purple-500 to-pink-500 font-bold"
                          : "text-black"
                    } ${strike ? "line-through text-slate-400" : ""} mt-1`}
                  >
                    {text}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <BuyLink
          href={resolvedBuyHref}
          plan={resolvedPlan}
          price={resolvedPrice}
          aria-label={`Acquista il piano ${
            resolvedUnit.includes("anno")
              ? "Annuale"
              : resolvedUnit.includes("mese")
                ? "Mensile"
                : ""
          }`}
          className={`relative overflow-hidden mt-8 w-full rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 px-8 py-5 text-center font-extrabold text-white transition-all duration-300 hover:from-sky-500 hover:via-cyan-400 hover:to-sky-500 text-xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center justify-center min-h-[60px] before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-100%] before:animate-[shimmer_2s_infinite] before:skew-x-12 ${
            className?.includes("cta-quiet")
              ? "bg-slate-900 text-white hover:from-slate-900 hover:via-slate-900 hover:to-slate-900 shadow-md hover:shadow-md transform-none hover:scale-100 active:scale-100 before:content-none"
              : ""
          }`}
        >
          <span className="relative z-10">
            {className?.includes("cta-quiet")
              ? "Vai al tuo account"
              : "Inizia ora 👉"}
          </span>
        </BuyLink>

        {/* Link discreto per richiedi informazioni */}
        {resolvedPlan !== "Free" ? (
          <div className="mt-1 text-center">
            <Link
              href={resolvedInfoHref}
              className="text-xs text-slate-500 hover:text-slate-700 transition-colors duration-200 underline decoration-dotted underline-offset-2"
            >
              Oppure richiedi più informazioni
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
