"use client";

import { useMemo, useState } from "react";

type Rational = {
  numerator: number;
  denominator: number;
};

type Result =
  | {
      kind: "success";
      base: Rational;
      exponent: number;
      exact: Rational;
      decimal: number;
      steps: string[];
      property: string;
    }
  | { kind: "error"; message: string };

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

function simplify(rational: Rational): Rational {
  if (rational.denominator === 0) {
    throw new Error("Il denominatore non può essere zero.");
  }

  const sign = rational.denominator < 0 ? -1 : 1;
  const numerator = rational.numerator * sign;
  const denominator = Math.abs(rational.denominator);
  const common = gcd(numerator, denominator);

  return {
    numerator: numerator / common,
    denominator: denominator / common,
  };
}

function parseInteger(value: string, label: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!normalized || !Number.isInteger(parsed)) {
    throw new Error(`${label} deve essere un numero intero.`);
  }
  return parsed;
}

function parseBase(value: string): Rational {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) throw new Error("Inserisci una base.");

  if (normalized.includes("/")) {
    const parts = normalized.split("/");
    if (parts.length !== 2) {
      throw new Error("Scrivi la frazione nella forma a/b.");
    }

    const numerator = Number(parts[0]);
    const denominator = Number(parts[1]);
    if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) {
      throw new Error("Nella frazione usa numeratore e denominatore interi.");
    }

    return simplify({ numerator, denominator });
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error("La base deve essere un numero o una frazione.");
  }

  if (Number.isInteger(parsed)) {
    return { numerator: parsed, denominator: 1 };
  }

  const decimals = normalized.split(".")[1]?.length || 0;
  const denominator = 10 ** decimals;
  const numerator = Math.round(parsed * denominator);

  return simplify({ numerator, denominator });
}

function powNumber(value: number, exponent: number) {
  return value ** exponent;
}

function powRational(base: Rational, exponent: number): Rational {
  if (base.numerator === 0 && exponent === 0) {
    throw new Error("0 elevato a 0 non è definito in questo calcolatore.");
  }
  if (exponent === 0) return { numerator: 1, denominator: 1 };
  if (base.numerator === 0 && exponent < 0) {
    throw new Error("Zero non può avere esponente negativo.");
  }

  const absoluteExponent = Math.abs(exponent);
  const powered = {
    numerator: powNumber(base.numerator, absoluteExponent),
    denominator: powNumber(base.denominator, absoluteExponent),
  };

  if (!Number.isSafeInteger(powered.numerator) || !Number.isSafeInteger(powered.denominator)) {
    throw new Error("Il risultato esatto è troppo grande. Prova con numeri più piccoli.");
  }

  if (exponent < 0) {
    return simplify({
      numerator: powered.denominator,
      denominator: powered.numerator,
    });
  }

  return simplify(powered);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 10,
  }).format(value);
}

function formatRational(value: Rational) {
  if (value.denominator === 1) return String(value.numerator);
  return `${value.numerator}/${value.denominator}`;
}

function rationalToDecimal(value: Rational) {
  return value.numerator / value.denominator;
}

function propertyFor(base: Rational, exponent: number) {
  if (exponent === 0) {
    return "Ogni numero diverso da zero elevato a 0 vale 1.";
  }
  if (exponent < 0) {
    return "Con esponente negativo si usa il reciproco della base.";
  }
  if (base.denominator !== 1) {
    return "La potenza di una frazione si calcola elevando numeratore e denominatore.";
  }
  return "La potenza moltiplica la base per se stessa tante volte quante indica l'esponente.";
}

function solvePower(baseInput: string, exponentInput: string): Result {
  try {
    const base = parseBase(baseInput);
    const exponent = parseInteger(exponentInput, "L'esponente");
    const exact = powRational(base, exponent);
    const decimal = rationalToDecimal(exact);
    const baseText = formatRational(base);
    const exactText = formatRational(exact);

    const steps = [
      `Base semplificata: ${baseText}.`,
      `Esponente: ${exponent}.`,
    ];

    if (exponent === 0) {
      steps.push("Applico la proprietà dell'esponente zero.");
      steps.push(`${baseText}⁰ = 1.`);
    } else if (exponent < 0) {
      const reciprocal = simplify({
        numerator: base.denominator,
        denominator: base.numerator,
      });
      steps.push(`Esponente negativo: trasformo la base nel reciproco ${formatRational(reciprocal)}.`);
      steps.push(`Poi elevo al valore assoluto dell'esponente: ${Math.abs(exponent)}.`);
      steps.push(`Risultato: ${exactText}.`);
    } else if (base.denominator !== 1) {
      steps.push(
        `Elevo numeratore e denominatore: ${base.numerator}^${exponent} / ${base.denominator}^${exponent}.`
      );
      steps.push(`Risultato semplificato: ${exactText}.`);
    } else {
      steps.push(`Moltiplico ${baseText} per se stesso ${exponent} volte.`);
      steps.push(`Risultato: ${exactText}.`);
    }

    return {
      kind: "success",
      base,
      exponent,
      exact,
      decimal,
      steps,
      property: propertyFor(base, exponent),
    };
  } catch (error) {
    return {
      kind: "error",
      message:
        error instanceof Error
          ? error.message
          : "Controlla base ed esponente inseriti.",
    };
  }
}

function PowerPreview({
  base,
  exponent,
}: {
  base: string;
  exponent: string;
}) {
  return (
    <span>
      {base || "a"}
      <sup className="ml-0.5 text-[0.65em] leading-none">{exponent || "n"}</sup>
    </span>
  );
}

export default function PotenzeOnlineClient() {
  const [base, setBase] = useState("3/4");
  const [exponent, setExponent] = useState("-2");

  const result = useMemo(() => solvePower(base, exponent), [base, exponent]);

  return (
    <section className="rounded-[24px] border-2 border-slate-900/70 bg-white p-4 shadow-[0_4px_0_#0f172a] [.dark_&]:bg-slate-900 sm:p-5">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="min-w-0">
          <p className="mb-3 text-sm font-bold">
            Inserisci base ed esponente. Puoi usare anche frazioni come 3/4.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-bold opacity-75">
                Base
              </span>
              <input
                value={base}
                onChange={(event) => setBase(event.target.value)}
                inputMode="decimal"
                className="w-full rounded-[14px] border-2 border-slate-900/60 bg-white px-3 py-2 text-lg font-bold outline-none transition focus:border-blue-500 [.dark_&]:border-slate-400 [.dark_&]:bg-slate-900"
              />
            </label>

            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-bold opacity-75">
                Esponente
              </span>
              <input
                value={exponent}
                onChange={(event) => setExponent(event.target.value)}
                inputMode="numeric"
                className="w-full rounded-[14px] border-2 border-slate-900/60 bg-white px-3 py-2 text-lg font-bold outline-none transition focus:border-blue-500 [.dark_&]:border-slate-400 [.dark_&]:bg-slate-900"
              />
            </label>
          </div>

          <div className="mt-4 rounded-[16px] bg-slate-100 p-4 text-center text-3xl font-black text-blue-600 [.dark_&]:bg-slate-800 [.dark_&]:text-blue-300">
            <PowerPreview base={base} exponent={exponent} />
          </div>
        </div>

        <div className="min-w-0 rounded-[20px] bg-slate-100 p-4 [.dark_&]:bg-slate-800">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-600 [.dark_&]:text-blue-300">
            Risultato
          </p>

          {result.kind === "error" ? (
            <p className="mt-3 text-lg font-bold">{result.message}</p>
          ) : (
            <>
              <div className="mt-3 rounded-[16px] bg-white p-4 [.dark_&]:bg-slate-900">
                <p className="text-sm font-bold uppercase tracking-wide opacity-60">
                  Valore della potenza
                </p>
                <div className="mt-3 break-words rounded-[14px] bg-slate-100 px-4 py-3 text-3xl font-black text-blue-600 [.dark_&]:bg-slate-800 [.dark_&]:text-blue-300">
                  {formatRational(result.exact)}
                  {result.exact.denominator !== 1 && (
                    <p className="mt-1 text-xs font-bold text-slate-500 [.dark_&]:text-slate-300">
                      ≈ {formatNumber(result.decimal)}
                    </p>
                  )}
                </div>
                <p className="mt-3 text-sm font-bold leading-6 opacity-75">
                  {result.property}
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
