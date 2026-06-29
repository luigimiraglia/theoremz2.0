"use client";

import { useMemo, useState } from "react";

type Solution = {
  label: string;
  exact: string;
  decimal?: string;
};

function parseNumber(value: string, label: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized || !Number.isFinite(Number(normalized))) {
    throw new Error(`${label} deve essere un numero.`);
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

function formatSigned(value: number) {
  return value >= 0 ? `+ ${formatNumber(value)}` : `- ${formatNumber(Math.abs(value))}`;
}

function parsePreviewNumber(value: string) {
  const parsed = Number(value.trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatInputPreview(value: string) {
  return formatNumber(parsePreviewNumber(value));
}

function simplifyFraction(numerator: number, denominator: number) {
  if (denominator === 0) throw new Error("Divisione per zero.");
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) {
    return {
      exact: formatNumber(numerator / denominator),
      decimal: formatNumber(numerator / denominator),
    };
  }

  const sign = denominator < 0 ? -1 : 1;
  const n = numerator * sign;
  const d = Math.abs(denominator);
  const common = gcd(n, d);
  const simpleN = n / common;
  const simpleD = d / common;

  if (simpleD === 1) {
    return { exact: String(simpleN) };
  }

  return {
    exact: `${simpleN}/${simpleD}`,
    decimal: formatNumber(simpleN / simpleD),
  };
}

function solveQuadratic(a: number, b: number, c: number) {
  const steps: string[] = [];

  if (a === 0) {
    if (b === 0 && c === 0) {
      return {
        type: "identity" as const,
        delta: null,
        steps: ["Con a = 0 e b = 0 otteniamo 0 = 0: l'equazione ha infinite soluzioni."],
        solutions: [] as Solution[],
      };
    }
    if (b === 0) {
      return {
        type: "impossible" as const,
        delta: null,
        steps: ["Con a = 0 e b = 0 rimane una costante diversa da zero: nessuna soluzione."],
        solutions: [] as Solution[],
      };
    }
    const linear = simplifyFraction(-c, b);
    return {
      type: "linear" as const,
      delta: null,
      steps: [
        "Con a = 0 non è una vera equazione di secondo grado: diventa di primo grado.",
        `${formatNumber(b)}x ${formatSigned(c)} = 0`,
        `x = ${formatNumber(-c)} / ${formatNumber(b)} = ${linear.exact}`,
      ],
      solutions: [{ label: "x", exact: linear.exact, decimal: linear.decimal }],
    };
  }

  const delta = b * b - 4 * a * c;
  steps.push(`Calcoliamo il discriminante: Δ = b² - 4ac.`);
  steps.push(`Δ = (${formatNumber(b)})² - 4·${formatNumber(a)}·${formatNumber(c)} = ${formatNumber(delta)}.`);

  if (delta < 0) {
    steps.push("Il discriminante è negativo: non ci sono soluzioni reali.");
    return {
      type: "none" as const,
      delta,
      steps,
      solutions: [] as Solution[],
    };
  }

  const denominator = 2 * a;

  if (delta === 0) {
    const solution = simplifyFraction(-b, denominator);
    steps.push("Il discriminante è zero: le due soluzioni coincidono.");
    steps.push(`x = -b / 2a = ${formatNumber(-b)} / ${formatNumber(denominator)} = ${solution.exact}.`);
    return {
      type: "double" as const,
      delta,
      steps,
      solutions: [{ label: "x", exact: solution.exact, decimal: solution.decimal }],
    };
  }

  const sqrtDelta = Math.sqrt(delta);
  const perfectSquare = Number.isInteger(sqrtDelta);
  steps.push(`Usiamo la formula risolutiva: x = (-b ± √Δ) / 2a.`);

  if (perfectSquare) {
    steps.push(`√Δ = ${formatNumber(sqrtDelta)}.`);
    const x1 = simplifyFraction(-b - sqrtDelta, denominator);
    const x2 = simplifyFraction(-b + sqrtDelta, denominator);
    return {
      type: "two" as const,
      delta,
      steps,
      solutions: [
        { label: "x1", exact: x1.exact, decimal: x1.decimal },
        { label: "x2", exact: x2.exact, decimal: x2.decimal },
      ],
    };
  }

  steps.push(`√Δ non è un numero intero: √Δ ≈ ${formatNumber(sqrtDelta)}.`);

  const x1 = (-b - sqrtDelta) / denominator;
  const x2 = (-b + sqrtDelta) / denominator;

  if (Number.isInteger(a) && Number.isInteger(b) && Number.isInteger(c)) {
    return {
      type: "two-radical" as const,
      delta,
      steps,
      solutions: [
        {
          label: "x1",
          exact: `(${formatNumber(-b)} - √${formatNumber(delta)}) / ${formatNumber(denominator)}`,
          decimal: formatNumber(x1),
        },
        {
          label: "x2",
          exact: `(${formatNumber(-b)} + √${formatNumber(delta)}) / ${formatNumber(denominator)}`,
          decimal: formatNumber(x2),
        },
      ],
    };
  }

  return {
    type: "two-decimal" as const,
    delta,
    steps,
    solutions: [
      { label: "x1", exact: formatNumber(x1) },
      { label: "x2", exact: formatNumber(x2) },
    ],
  };
}

function SolutionCard({ solution }: { solution: Solution }) {
  return (
    <div className="break-words rounded-[14px] bg-slate-100 px-4 py-3 text-xl font-black text-blue-600 [.dark_&]:bg-slate-800 [.dark_&]:text-blue-300 sm:text-2xl">
      {solution.label} = {solution.exact}
      {solution.decimal && (
        <p className="mt-1 text-xs font-bold text-slate-500 [.dark_&]:text-slate-300">
          ≈ {solution.decimal}
        </p>
      )}
    </div>
  );
}

export default function EquazioniSecondoGradoClient() {
  const [a, setA] = useState("1");
  const [b, setB] = useState("-5");
  const [c, setC] = useState("6");

  const result = useMemo(() => {
    try {
      return solveQuadratic(
        parseNumber(a, "a"),
        parseNumber(b, "b"),
        parseNumber(c, "c")
      );
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Controlla i coefficienti inseriti.",
      };
    }
  }, [a, b, c]);

  return (
    <section className="rounded-[24px] border-2 border-slate-900/70 bg-white p-4 shadow-[0_4px_0_#0f172a] [.dark_&]:bg-slate-900 sm:p-5">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="min-w-0">
          <p className="mb-3 text-sm font-bold">Forma: ax² + bx + c = 0</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["a", a, setA],
              ["b", b, setB],
              ["c", c, setC],
            ].map(([label, value, setter]) => (
              <label key={label as string} className="block">
                <span className="mb-1 block text-xs font-bold opacity-75">
                  {label as string}
                </span>
                <input
                  inputMode="decimal"
                  value={value as string}
                  onChange={(event) =>
                    (setter as (next: string) => void)(event.target.value)
                  }
                  className="w-full rounded-[14px] border-2 border-slate-900/60 bg-white px-3 py-2 text-lg font-bold outline-none transition focus:border-blue-500 [.dark_&]:border-slate-400 [.dark_&]:bg-slate-900"
                />
              </label>
            ))}
          </div>

          <div className="mt-4 rounded-[16px] bg-slate-100 p-3 text-sm font-bold leading-6 [.dark_&]:bg-slate-800">
            {formatInputPreview(a)}x² {formatSigned(parsePreviewNumber(b))}x{" "}
            {formatSigned(parsePreviewNumber(c))} = 0
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
                  Soluzioni
                </p>
                {result.delta !== null && (
                  <p className="mt-2 text-sm font-bold opacity-75">
                    Δ = {formatNumber(result.delta)}
                  </p>
                )}
                {result.solutions.length > 0 ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {result.solutions.map((solution) => (
                      <SolutionCard key={solution.label} solution={solution} />
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-[14px] bg-slate-100 px-4 py-3 text-2xl font-black text-blue-600 [.dark_&]:bg-slate-800 [.dark_&]:text-blue-300">
                    {result.type === "identity"
                      ? "infinite soluzioni"
                      : "nessuna soluzione reale"}
                  </div>
                )}
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
