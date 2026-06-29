"use client";

import { useMemo, useState } from "react";

type Unit = {
  label: string;
  symbol: string;
  factor: number;
};

type Category = {
  label: string;
  baseUnit: string;
  units: Unit[];
};

const categories = {
  lunghezza: {
    label: "Lunghezza",
    baseUnit: "metro",
    units: [
      { label: "chilometro", symbol: "km", factor: 1000 },
      { label: "ettometro", symbol: "hm", factor: 100 },
      { label: "decametro", symbol: "dam", factor: 10 },
      { label: "metro", symbol: "m", factor: 1 },
      { label: "decimetro", symbol: "dm", factor: 0.1 },
      { label: "centimetro", symbol: "cm", factor: 0.01 },
      { label: "millimetro", symbol: "mm", factor: 0.001 },
    ],
  },
  massa: {
    label: "Massa",
    baseUnit: "grammo",
    units: [
      { label: "chilogrammo", symbol: "kg", factor: 1000 },
      { label: "ettogrammo", symbol: "hg", factor: 100 },
      { label: "decagrammo", symbol: "dag", factor: 10 },
      { label: "grammo", symbol: "g", factor: 1 },
      { label: "decigrammo", symbol: "dg", factor: 0.1 },
      { label: "centigrammo", symbol: "cg", factor: 0.01 },
      { label: "milligrammo", symbol: "mg", factor: 0.001 },
    ],
  },
  capacita: {
    label: "Capacità",
    baseUnit: "litro",
    units: [
      { label: "chilolitro", symbol: "kl", factor: 1000 },
      { label: "ettolitro", symbol: "hl", factor: 100 },
      { label: "decalitro", symbol: "dal", factor: 10 },
      { label: "litro", symbol: "l", factor: 1 },
      { label: "decilitro", symbol: "dl", factor: 0.1 },
      { label: "centilitro", symbol: "cl", factor: 0.01 },
      { label: "millilitro", symbol: "ml", factor: 0.001 },
    ],
  },
  area: {
    label: "Area",
    baseUnit: "metro quadrato",
    units: [
      { label: "chilometro quadrato", symbol: "km²", factor: 1_000_000 },
      { label: "ettometro quadrato", symbol: "hm²", factor: 10_000 },
      { label: "decametro quadrato", symbol: "dam²", factor: 100 },
      { label: "metro quadrato", symbol: "m²", factor: 1 },
      { label: "decimetro quadrato", symbol: "dm²", factor: 0.01 },
      { label: "centimetro quadrato", symbol: "cm²", factor: 0.0001 },
      { label: "millimetro quadrato", symbol: "mm²", factor: 0.000001 },
    ],
  },
  volume: {
    label: "Volume",
    baseUnit: "metro cubo",
    units: [
      { label: "metro cubo", symbol: "m³", factor: 1 },
      { label: "decimetro cubo", symbol: "dm³", factor: 0.001 },
      { label: "centimetro cubo", symbol: "cm³", factor: 0.000001 },
      { label: "millimetro cubo", symbol: "mm³", factor: 0.000000001 },
      { label: "litro", symbol: "l", factor: 0.001 },
      { label: "millilitro", symbol: "ml", factor: 0.000001 },
    ],
  },
  tempo: {
    label: "Tempo",
    baseUnit: "secondo",
    units: [
      { label: "giorno", symbol: "giorni", factor: 86400 },
      { label: "ora", symbol: "h", factor: 3600 },
      { label: "minuto", symbol: "min", factor: 60 },
      { label: "secondo", symbol: "s", factor: 1 },
      { label: "millisecondo", symbol: "ms", factor: 0.001 },
    ],
  },
} satisfies Record<string, Category>;

type CategoryKey = keyof typeof categories;

function parseItalianNumber(value: string): number | null {
  const compact = value.trim().replace(/\s/g, "");
  const normalized = compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : compact;
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 10,
  }).format(value);
}

function formatFactor(value: number) {
  if (value === 1) return "1";
  if (value >= 0.0001 && value < 1_000_000) return formatNumber(value);
  return value.toExponential(6).replace(".", ",");
}

export default function EquivalenzeClient() {
  const [value, setValue] = useState("12,5");
  const [categoryKey, setCategoryKey] = useState<CategoryKey>("lunghezza");
  const [fromSymbol, setFromSymbol] = useState("m");
  const [toSymbol, setToSymbol] = useState("cm");

  const category = categories[categoryKey];

  const result = useMemo(() => {
    const amount = parseItalianNumber(value);
    const from = category.units.find((unit) => unit.symbol === fromSymbol) ?? category.units[0];
    const to = category.units.find((unit) => unit.symbol === toSymbol) ?? category.units[1];

    if (amount === null) {
      return { from, to, error: "Inserisci un numero valido." };
    }

    const baseValue = amount * from.factor;
    const converted = baseValue / to.factor;
    const conversionFactor = from.factor / to.factor;

    return {
      amount,
      from,
      to,
      baseValue,
      converted,
      conversionFactor,
    };
  }, [category.units, fromSymbol, toSymbol, value]);

  function handleCategoryChange(nextCategory: CategoryKey) {
    const next = categories[nextCategory];
    const base = next.units.find((unit) => unit.factor === 1) ?? next.units[0];
    const smaller =
      next.units.find((unit) => unit.factor < base.factor) ??
      next.units[next.units.length - 1];
    setCategoryKey(nextCategory);
    setFromSymbol(base.symbol);
    setToSymbol(smaller.symbol);
  }

  return (
    <section className="rounded-[24px] border-2 border-slate-900/70 bg-white p-4 shadow-[0_4px_0_#0f172a] [.dark_&]:bg-slate-900 sm:p-5">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="min-w-0 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Valore</span>
            <input
              inputMode="decimal"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="w-full rounded-[16px] border-2 border-slate-900/40 bg-white px-4 py-3 text-lg font-bold outline-none [.dark_&]:border-slate-500 [.dark_&]:bg-slate-900"
              placeholder="Es. 12,5"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold">Tipo di equivalenza</span>
            <select
              value={categoryKey}
              onChange={(event) => handleCategoryChange(event.target.value as CategoryKey)}
              className="w-full rounded-[16px] border-2 border-slate-900/40 bg-white px-4 py-3 text-base font-bold outline-none [.dark_&]:border-slate-500 [.dark_&]:bg-slate-900"
            >
              {(Object.keys(categories) as CategoryKey[]).map((key) => (
                <option key={key} value={key}>
                  {categories[key].label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Da</span>
              <select
                value={fromSymbol}
                onChange={(event) => setFromSymbol(event.target.value)}
                className="w-full rounded-[16px] border-2 border-slate-900/40 bg-white px-4 py-3 text-base font-bold outline-none [.dark_&]:border-slate-500 [.dark_&]:bg-slate-900"
              >
                {category.units.map((unit) => (
                  <option key={unit.symbol} value={unit.symbol}>
                    {unit.label} ({unit.symbol})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold">A</span>
              <select
                value={toSymbol}
                onChange={(event) => setToSymbol(event.target.value)}
                className="w-full rounded-[16px] border-2 border-slate-900/40 bg-white px-4 py-3 text-base font-bold outline-none [.dark_&]:border-slate-500 [.dark_&]:bg-slate-900"
              >
                {category.units.map((unit) => (
                  <option key={unit.symbol} value={unit.symbol}>
                    {unit.label} ({unit.symbol})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="min-w-0 rounded-[20px] bg-slate-100 p-4 [.dark_&]:bg-slate-800">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-600 [.dark_&]:text-blue-300">
            Risultato
          </p>

          {"error" in result ? (
            <p className="mt-3 text-lg font-bold">{result.error}</p>
          ) : (
            <>
              <div className="mt-3 rounded-[16px] bg-white p-4 [.dark_&]:bg-slate-900">
                <p className="text-sm font-bold uppercase tracking-wide opacity-60">
                  Equivalenza finale
                </p>
                <div className="mt-3 text-xl font-black">
                  {formatNumber(result.amount)} {result.from.symbol}
                </div>
                <div className="mt-3 rounded-[14px] bg-slate-100 px-4 py-3 text-2xl font-black text-blue-600 [.dark_&]:bg-slate-800 [.dark_&]:text-blue-300">
                  = {formatNumber(result.converted)} {result.to.symbol}
                </div>
              </div>

              <div className="mt-4 rounded-[16px] bg-white p-3 [.dark_&]:bg-slate-900">
                <h2 className="font-bold">Passaggi</h2>
                <ol className="mt-3 space-y-2 text-sm font-semibold leading-6">
                  <li>
                    1 {result.from.symbol} = {formatFactor(result.from.factor)}{" "}
                    {category.units.find((unit) => unit.factor === 1)?.symbol ?? category.baseUnit}.
                  </li>
                  <li>
                    1 {result.to.symbol} = {formatFactor(result.to.factor)}{" "}
                    {category.units.find((unit) => unit.factor === 1)?.symbol ?? category.baseUnit}.
                  </li>
                  <li>
                    Quindi moltiplichiamo per il fattore di conversione:{" "}
                    {formatFactor(result.conversionFactor)}.
                  </li>
                </ol>
              </div>

              <div className="mt-4 rounded-[16px] bg-white p-3 [.dark_&]:bg-slate-900">
                <h2 className="font-bold">Formula usata</h2>
                <p className="mt-2 text-sm font-semibold leading-6">
                  valore convertito = valore iniziale × fattore unità iniziale ÷
                  fattore unità finale
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
