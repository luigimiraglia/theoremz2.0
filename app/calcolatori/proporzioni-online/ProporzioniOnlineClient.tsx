"use client";

import { useMemo, useState } from "react";

type Slot = "a" | "b" | "c" | "d";

type SolveResult =
  | {
      kind: "solve";
      missing: Slot;
      value: number;
      exact?: string;
      steps: string[];
    }
  | {
      kind: "check";
      valid: boolean;
      leftProduct: number;
      rightProduct: number;
      steps: string[];
    }
  | { kind: "error"; message: string };

const labels: Record<Slot, string> = {
  a: "primo termine",
  b: "secondo termine",
  c: "terzo termine",
  d: "quarto termine",
};

function normalize(value: string) {
  return value.trim().replace(/\s/g, "").replace(",", ".");
}

function isUnknown(value: string) {
  return normalize(value).toLowerCase() === "x";
}

function parseNumber(value: string, label: string) {
  const normalized = normalize(value);
  if (!normalized || !Number.isFinite(Number(normalized))) {
    throw new Error(`${label} deve essere un numero oppure x.`);
  }
  return Number(normalized);
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const r = x % y;
    x = y;
    y = r;
  }
  return x || 1;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 8,
  }).format(value);
}

function simplifyFraction(numerator: number, denominator: number) {
  if (denominator === 0) return undefined;
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) {
    return undefined;
  }

  const sign = denominator < 0 ? -1 : 1;
  const n = numerator * sign;
  const d = Math.abs(denominator);
  const common = gcd(n, d);
  const simpleN = n / common;
  const simpleD = d / common;

  return simpleD === 1 ? String(simpleN) : `${simpleN}/${simpleD}`;
}

function solveProportion(values: Record<Slot, string>): SolveResult {
  try {
    const unknowns = (Object.keys(values) as Slot[]).filter((slot) =>
      isUnknown(values[slot])
    );

    if (unknowns.length > 1) {
      return {
        kind: "error",
        message: "Scrivi x in un solo campo della proporzione.",
      };
    }

    if (unknowns.length === 0) {
      const a = parseNumber(values.a, labels.a);
      const b = parseNumber(values.b, labels.b);
      const c = parseNumber(values.c, labels.c);
      const d = parseNumber(values.d, labels.d);
      if (b === 0 || d === 0) {
        return {
          kind: "error",
          message: "Il secondo e il quarto termine non possono essere zero.",
        };
      }

      const leftProduct = a * d;
      const rightProduct = b * c;
      const valid = Math.abs(leftProduct - rightProduct) < 1e-10;

      return {
        kind: "check",
        valid,
        leftProduct,
        rightProduct,
        steps: [
          "Quando non c'è x, controllo se la proporzione è vera.",
          `Prodotto degli estremi: ${formatNumber(a)} · ${formatNumber(d)} = ${formatNumber(leftProduct)}.`,
          `Prodotto dei medi: ${formatNumber(b)} · ${formatNumber(c)} = ${formatNumber(rightProduct)}.`,
          valid
            ? "I due prodotti sono uguali: la proporzione è corretta."
            : "I due prodotti sono diversi: la proporzione non è corretta.",
        ],
      };
    }

    const missing = unknowns[0];
    const known = {
      a: missing === "a" ? undefined : parseNumber(values.a, labels.a),
      b: missing === "b" ? undefined : parseNumber(values.b, labels.b),
      c: missing === "c" ? undefined : parseNumber(values.c, labels.c),
      d: missing === "d" ? undefined : parseNumber(values.d, labels.d),
    };

    let numerator = 0;
    let denominator = 0;
    let formula = "";

    if (missing === "a") {
      numerator = known.b! * known.c!;
      denominator = known.d!;
      formula = "x = b · c / d";
    }
    if (missing === "b") {
      numerator = known.a! * known.d!;
      denominator = known.c!;
      formula = "x = a · d / c";
    }
    if (missing === "c") {
      numerator = known.a! * known.d!;
      denominator = known.b!;
      formula = "x = a · d / b";
    }
    if (missing === "d") {
      numerator = known.b! * known.c!;
      denominator = known.a!;
      formula = "x = b · c / a";
    }

    if (denominator === 0) {
      return {
        kind: "error",
        message: "Non posso dividere per zero: controlla i termini inseriti.",
      };
    }

    const value = numerator / denominator;
    const exact = simplifyFraction(numerator, denominator);
    const completed = {
      a: missing === "a" ? value : known.a!,
      b: missing === "b" ? value : known.b!,
      c: missing === "c" ? value : known.c!,
      d: missing === "d" ? value : known.d!,
    };

    if (completed.b === 0 || completed.d === 0) {
      return {
        kind: "error",
        message:
          "Il secondo e il quarto termine della proporzione non possono essere zero.",
      };
    }

    const leftProduct = completed.a * completed.d;
    const rightProduct = completed.b * completed.c;

    return {
      kind: "solve",
      missing,
      value,
      exact,
      steps: [
        "Uso la proprietà fondamentale delle proporzioni: prodotto degli estremi uguale al prodotto dei medi.",
        "Porto il termine incognito da solo dividendo per il valore che lo moltiplica.",
        `${formula} = ${formatNumber(numerator)} / ${formatNumber(denominator)}.`,
        `Quindi x = ${exact || formatNumber(value)}.`,
        `Verifica: ${formatNumber(completed.a)} · ${formatNumber(completed.d)} = ${formatNumber(leftProduct)} e ${formatNumber(completed.b)} · ${formatNumber(completed.c)} = ${formatNumber(rightProduct)}.`,
      ],
    };
  } catch (error) {
    return {
      kind: "error",
      message:
        error instanceof Error
          ? error.message
          : "Controlla i valori inseriti nella proporzione.",
    };
  }
}

export default function ProporzioniOnlineClient() {
  const [values, setValues] = useState<Record<Slot, string>>({
    a: "12",
    b: "3",
    c: "x",
    d: "5",
  });

  const result = useMemo(() => solveProportion(values), [values]);

  const updateValue = (slot: Slot, value: string) => {
    setValues((current) => ({ ...current, [slot]: value }));
  };

  const field = (slot: Slot) => (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-bold opacity-75">{slot}</span>
      <input
        value={values[slot]}
        onChange={(event) => updateValue(slot, event.target.value)}
        inputMode="decimal"
        className="w-full rounded-[14px] border-2 border-slate-900/60 bg-white px-3 py-2 text-center text-lg font-bold outline-none transition focus:border-blue-500 [.dark_&]:border-slate-400 [.dark_&]:bg-slate-900"
      />
    </label>
  );

  return (
    <section className="rounded-[24px] border-2 border-slate-900/70 bg-white p-4 shadow-[0_4px_0_#0f172a] [.dark_&]:bg-slate-900 sm:p-5">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="min-w-0">
          <p className="mb-3 text-sm font-bold">
            Scrivi la proporzione e metti x nel termine da trovare.
          </p>

          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] sm:gap-3">
            {field("a")}
            <span className="pb-2 text-xl font-black">:</span>
            {field("b")}
            <span className="col-span-3 justify-self-center text-xl font-black sm:col-span-1 sm:pb-2">
              =
            </span>
            {field("c")}
            <span className="pb-2 text-xl font-black">:</span>
            {field("d")}
          </div>

          <div className="mt-4 rounded-[16px] bg-slate-100 p-3 text-center text-lg font-black [.dark_&]:bg-slate-800">
            {values.a || "a"} : {values.b || "b"} = {values.c || "c"} :{" "}
            {values.d || "d"}
          </div>
        </div>

        <div className="min-w-0 rounded-[20px] bg-slate-100 p-4 [.dark_&]:bg-slate-800">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-600 [.dark_&]:text-blue-300">
            Risultato
          </p>

          {result.kind === "error" && (
            <p className="mt-3 text-lg font-bold">{result.message}</p>
          )}

          {result.kind === "solve" && (
            <>
              <div className="mt-3 rounded-[16px] bg-white p-4 [.dark_&]:bg-slate-900">
                <p className="text-sm font-bold uppercase tracking-wide opacity-60">
                  Termine incognito
                </p>
                <div className="mt-3 rounded-[14px] bg-slate-100 px-4 py-3 text-3xl font-black text-blue-600 [.dark_&]:bg-slate-800 [.dark_&]:text-blue-300">
                  x = {result.exact || formatNumber(result.value)}
                  {result.exact && result.exact.includes("/") && (
                    <p className="mt-1 text-xs font-bold text-slate-500 [.dark_&]:text-slate-300">
                      ≈ {formatNumber(result.value)}
                    </p>
                  )}
                </div>
                <p className="mt-2 text-xs font-bold opacity-65">
                  x è il {labels[result.missing]}.
                </p>
              </div>

              <div className="mt-4 rounded-[16px] bg-white p-3 [.dark_&]:bg-slate-900">
                <h2 className="font-bold">Passaggi</h2>
                <ol className="mt-3 space-y-2 text-sm font-semibold leading-6">
                  {result.steps.map((step, index) => (
                    <li key={`${step}-${index}`}>{step}</li>
                  ))}
                </ol>
              </div>
            </>
          )}

          {result.kind === "check" && (
            <>
              <div className="mt-3 rounded-[16px] bg-white p-4 [.dark_&]:bg-slate-900">
                <p className="text-sm font-bold uppercase tracking-wide opacity-60">
                  Verifica
                </p>
                <div className="mt-3 rounded-[14px] bg-slate-100 px-4 py-3 text-2xl font-black text-blue-600 [.dark_&]:bg-slate-800 [.dark_&]:text-blue-300">
                  {result.valid
                    ? "proporzione corretta"
                    : "proporzione non corretta"}
                </div>
                <p className="mt-2 text-xs font-bold opacity-65">
                  Estremi: {formatNumber(result.leftProduct)}. Medi:{" "}
                  {formatNumber(result.rightProduct)}.
                </p>
              </div>

              <div className="mt-4 rounded-[16px] bg-white p-3 [.dark_&]:bg-slate-900">
                <h2 className="font-bold">Passaggi</h2>
                <ol className="mt-3 space-y-2 text-sm font-semibold leading-6">
                  {result.steps.map((step, index) => (
                    <li key={`${step}-${index}`}>{step}</li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
