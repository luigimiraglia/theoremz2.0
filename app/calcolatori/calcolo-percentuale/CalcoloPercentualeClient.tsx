"use client";

import { useMemo, useState } from "react";

type Mode = "percentOf" | "whatPercent" | "change" | "finalPrice";

type StepResult = {
  result: string;
  formula: string;
  steps: string[];
  note?: string;
};

const modeLabels: Record<Mode, string> = {
  percentOf: "Calcola una percentuale",
  whatPercent: "Trova la percentuale",
  change: "Variazione percentuale",
  finalPrice: "Aumento o sconto",
};

function parseItalianNumber(value: string): number | null {
  const compact = value.trim().replace(/\s/g, "");
  const normalized = compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : compact;
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function formatNumber(value: number, suffix = "") {
  return `${new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 6,
  }).format(value)}${suffix}`;
}

function getPercentOf(percentage: number, base: number): StepResult {
  const result = (percentage / 100) * base;
  return {
    result: formatNumber(result),
    formula: `${formatNumber(percentage)}% di ${formatNumber(base)} = (${formatNumber(percentage)} / 100) × ${formatNumber(base)}`,
    steps: [
      `Trasformiamo la percentuale in numero decimale: ${formatNumber(percentage)} / 100 = ${formatNumber(percentage / 100)}.`,
      `Moltiplichiamo per il valore di partenza: ${formatNumber(percentage / 100)} × ${formatNumber(base)} = ${formatNumber(result)}.`,
    ],
  };
}

function getWhatPercent(value: number, base: number): StepResult {
  const result = (value / base) * 100;
  return {
    result: formatNumber(result, "%"),
    formula: `${formatNumber(value)} / ${formatNumber(base)} × 100`,
    steps: [
      `Dividiamo la parte per il totale: ${formatNumber(value)} / ${formatNumber(base)} = ${formatNumber(value / base)}.`,
      `Moltiplichiamo per 100: ${formatNumber(value / base)} × 100 = ${formatNumber(result)}%.`,
    ],
  };
}

function getChange(initial: number, final: number): StepResult {
  const difference = final - initial;
  const result = (difference / initial) * 100;
  const direction = difference >= 0 ? "aumento" : "diminuzione";
  return {
    result: formatNumber(result, "%"),
    formula: `(${formatNumber(final)} - ${formatNumber(initial)}) / ${formatNumber(initial)} × 100`,
    steps: [
      `Calcoliamo la differenza: ${formatNumber(final)} - ${formatNumber(initial)} = ${formatNumber(difference)}.`,
      `Dividiamo per il valore iniziale: ${formatNumber(difference)} / ${formatNumber(initial)} = ${formatNumber(difference / initial)}.`,
      `Moltiplichiamo per 100: ${formatNumber(difference / initial)} × 100 = ${formatNumber(result)}%.`,
    ],
    note: `Il risultato indica una ${direction} percentuale.`,
  };
}

function getFinalPrice(value: number, percentage: number, operation: "increase" | "discount"): StepResult {
  const variation = (percentage / 100) * value;
  const result = operation === "increase" ? value + variation : value - variation;
  const word = operation === "increase" ? "aumento" : "sconto";
  const sign = operation === "increase" ? "+" : "-";
  return {
    result: formatNumber(result),
    formula: `${formatNumber(value)} ${sign} (${formatNumber(percentage)}% di ${formatNumber(value)})`,
    steps: [
      `Calcoliamo il ${word}: ${formatNumber(percentage)} / 100 × ${formatNumber(value)} = ${formatNumber(variation)}.`,
      `Applichiamo il ${word}: ${formatNumber(value)} ${sign} ${formatNumber(variation)} = ${formatNumber(result)}.`,
    ],
  };
}

export default function CalcoloPercentualeClient() {
  const [mode, setMode] = useState<Mode>("percentOf");
  const [percentage, setPercentage] = useState("20");
  const [base, setBase] = useState("150");
  const [value, setValue] = useState("30");
  const [initial, setInitial] = useState("80");
  const [finalValue, setFinalValue] = useState("100");
  const [operation, setOperation] = useState<"increase" | "discount">("discount");

  const result = useMemo(() => {
    const p = parseItalianNumber(percentage);
    const b = parseItalianNumber(base);
    const v = parseItalianNumber(value);
    const i = parseItalianNumber(initial);
    const f = parseItalianNumber(finalValue);

    if (mode === "percentOf") {
      if (p === null || b === null) return null;
      return getPercentOf(p, b);
    }
    if (mode === "whatPercent") {
      if (v === null || b === null || b === 0) return null;
      return getWhatPercent(v, b);
    }
    if (mode === "change") {
      if (i === null || f === null || i === 0) return null;
      return getChange(i, f);
    }
    if (p === null || b === null) return null;
    return getFinalPrice(b, p, operation);
  }, [base, finalValue, initial, mode, operation, percentage, value]);

  return (
    <section className="rounded-[24px] border-2 border-slate-900/70 bg-white p-4 shadow-[0_4px_0_#0f172a] [.dark_&]:bg-slate-900 sm:p-5">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(modeLabels) as Mode[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMode(item)}
            aria-pressed={mode === item}
            className={`rounded-[16px] border-2 px-3 py-3 text-left text-sm font-bold transition ${
              mode === item
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-slate-900/30 bg-slate-50 hover:border-blue-500 [.dark_&]:bg-slate-800"
            }`}
          >
            {modeLabels[item]}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          {(mode === "percentOf" || mode === "finalPrice") && (
            <>
              <NumberField
                label="Percentuale"
                value={percentage}
                onChange={setPercentage}
                suffix="%"
              />
              <NumberField
                label={mode === "finalPrice" ? "Valore iniziale" : "Totale"}
                value={base}
                onChange={setBase}
              />
            </>
          )}

          {mode === "whatPercent" && (
            <>
              <NumberField label="Parte" value={value} onChange={setValue} />
              <NumberField label="Totale" value={base} onChange={setBase} />
            </>
          )}

          {mode === "change" && (
            <>
              <NumberField
                label="Valore iniziale"
                value={initial}
                onChange={setInitial}
              />
              <NumberField
                label="Valore finale"
                value={finalValue}
                onChange={setFinalValue}
              />
            </>
          )}

          {mode === "finalPrice" && (
            <div>
              <p className="mb-2 text-sm font-bold">Operazione</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOperation("discount")}
                  aria-pressed={operation === "discount"}
                  className={`rounded-[14px] border-2 px-4 py-3 text-sm font-bold ${
                    operation === "discount"
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-slate-900/30 bg-slate-50 [.dark_&]:bg-slate-800"
                  }`}
                >
                  Sconto
                </button>
                <button
                  type="button"
                  onClick={() => setOperation("increase")}
                  aria-pressed={operation === "increase"}
                  className={`rounded-[14px] border-2 px-4 py-3 text-sm font-bold ${
                    operation === "increase"
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-slate-900/30 bg-slate-50 [.dark_&]:bg-slate-800"
                  }`}
                >
                  Aumento
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[20px] bg-slate-100 p-4 [.dark_&]:bg-slate-800">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-600 [.dark_&]:text-blue-300">
            Risultato
          </p>
          <div className="mt-2 min-h-[44px] text-3xl font-black">
            {result ? result.result : "Controlla i dati"}
          </div>
          {result && (
            <>
              <p className="mt-4 rounded-[14px] bg-white px-3 py-2 text-sm font-semibold [.dark_&]:bg-slate-900">
                {result.formula}
              </p>
              <ol className="mt-4 space-y-2">
                {result.steps.map((step) => (
                  <li key={step} className="text-sm font-medium leading-6">
                    {step}
                  </li>
                ))}
              </ol>
              {result.note && (
                <p className="mt-3 text-sm font-bold text-blue-600 [.dark_&]:text-blue-300">
                  {result.note}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">{label}</span>
      <div className="flex items-center rounded-[16px] border-2 border-slate-900/40 bg-white px-3 py-2 [.dark_&]:border-slate-500 [.dark_&]:bg-slate-900">
        <input
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent py-2 text-lg font-bold outline-none"
          placeholder="0"
        />
        {suffix && <span className="pl-2 text-lg font-black">{suffix}</span>}
      </div>
    </label>
  );
}
