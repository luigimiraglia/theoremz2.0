"use client";

import { useMemo, useState } from "react";

const ZERO = BigInt(0);
const ONE = BigInt(1);

function absBigInt(n: bigint) {
  return n < ZERO ? -n : n;
}

function gcdBigInt(a: bigint, b: bigint): bigint {
  let x = absBigInt(a);
  let y = absBigInt(b);
  while (y !== ZERO) {
    const r = x % y;
    x = y;
    y = r;
  }
  return x || ONE;
}

class Fraction {
  numerator: bigint;
  denominator: bigint;

  constructor(numerator: bigint, denominator = ONE) {
    if (denominator === ZERO) throw new Error("Divisione per zero.");
    const sign = denominator < ZERO ? -ONE : ONE;
    const gcd = gcdBigInt(numerator, denominator);
    this.numerator = (numerator / gcd) * sign;
    this.denominator = absBigInt(denominator / gcd);
  }

  toNumber() {
    return Number(this.numerator) / Number(this.denominator);
  }

  toPlain() {
    if (this.denominator === ONE) return this.numerator.toString();
    return `${this.numerator.toString()}/${this.denominator.toString()}`;
  }
}

function parseInteger(value: string, label: string) {
  const compact = value.trim().replace(/\s/g, "");
  if (!/^-?\d+$/.test(compact)) {
    throw new Error(`${label} deve essere un numero intero.`);
  }
  return BigInt(compact);
}

function formatDecimal(value: Fraction) {
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 8,
  }).format(value.toNumber());
}

function formatCoefficient(value: string, variable: "x" | "y") {
  const trimmed = value.trim();
  if (trimmed === "1") return variable;
  if (trimmed === "-1") return `-${variable}`;
  return `${trimmed}${variable}`;
}

function formatEquation(a: string, b: string, c: string) {
  const second = b.trim().startsWith("-")
    ? ` - ${formatCoefficient(b.trim().slice(1), "y")}`
    : ` + ${formatCoefficient(b, "y")}`;
  return `${formatCoefficient(a, "x")}${second} = ${c}`;
}

function solveSystem(values: {
  a: string;
  b: string;
  c: string;
  d: string;
  e: string;
  f: string;
}) {
  const a = parseInteger(values.a, "a");
  const b = parseInteger(values.b, "b");
  const c = parseInteger(values.c, "c");
  const d = parseInteger(values.d, "d");
  const e = parseInteger(values.e, "e");
  const f = parseInteger(values.f, "f");

  const determinant = a * e - b * d;
  const determinantX = c * e - b * f;
  const determinantY = a * f - c * d;

  const steps = [
    `D = a·e - b·d = ${a.toString()}·${e.toString()} - ${b.toString()}·${d.toString()} = ${determinant.toString()}.`,
    `Dx = c·e - b·f = ${c.toString()}·${e.toString()} - ${b.toString()}·${f.toString()} = ${determinantX.toString()}.`,
    `Dy = a·f - c·d = ${a.toString()}·${f.toString()} - ${c.toString()}·${d.toString()} = ${determinantY.toString()}.`,
  ];

  if (determinant !== ZERO) {
    const x = new Fraction(determinantX, determinant);
    const y = new Fraction(determinantY, determinant);
    steps.push(`x = Dx / D = ${determinantX.toString()} / ${determinant.toString()} = ${x.toPlain()}.`);
    steps.push(`y = Dy / D = ${determinantY.toString()} / ${determinant.toString()} = ${y.toPlain()}.`);
    return {
      type: "determined" as const,
      determinant,
      determinantX,
      determinantY,
      x,
      y,
      steps,
    };
  }

  if (determinantX === ZERO && determinantY === ZERO) {
    steps.push("D = 0, Dx = 0 e Dy = 0: il sistema ha infinite soluzioni.");
    return {
      type: "infinite" as const,
      determinant,
      determinantX,
      determinantY,
      steps,
    };
  }

  steps.push("D = 0 ma almeno uno tra Dx e Dy è diverso da 0: il sistema non ha soluzioni.");
  return {
    type: "impossible" as const,
    determinant,
    determinantX,
    determinantY,
    steps,
  };
}

function FractionView({ value }: { value: Fraction }) {
  if (value.denominator === ONE) return <span>{value.numerator.toString()}</span>;

  return (
    <span className="inline-grid translate-y-1 grid-rows-[auto_auto] text-center leading-none">
      <span className="border-b-2 border-current px-1 pb-1">
        {value.numerator.toString()}
      </span>
      <span className="px-1 pt-1">{value.denominator.toString()}</span>
    </span>
  );
}

function CoefficientInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold opacity-75">{label}</span>
      <input
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[14px] border-2 border-slate-900/40 bg-white px-3 py-2 text-lg font-bold outline-none [.dark_&]:border-slate-500 [.dark_&]:bg-slate-900"
      />
    </label>
  );
}

export default function SistemiEquazioniClient() {
  const [a, setA] = useState("2");
  const [b, setB] = useState("3");
  const [c, setC] = useState("7");
  const [d, setD] = useState("1");
  const [e, setE] = useState("-1");
  const [f, setF] = useState("1");

  const result = useMemo(() => {
    try {
      return solveSystem({ a, b, c, d, e, f });
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Controlla i coefficienti inseriti.",
      };
    }
  }, [a, b, c, d, e, f]);

  return (
    <section className="rounded-[24px] border-2 border-slate-900/70 bg-white p-4 shadow-[0_4px_0_#0f172a] [.dark_&]:bg-slate-900 sm:p-5">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-[18px] border-2 border-slate-900/30 bg-slate-50 p-3 [.dark_&]:bg-slate-800">
            <p className="mb-3 text-sm font-bold">Prima equazione: ax + by = c</p>
            <div className="grid grid-cols-3 gap-3">
              <CoefficientInput label="a" value={a} onChange={setA} />
              <CoefficientInput label="b" value={b} onChange={setB} />
              <CoefficientInput label="c" value={c} onChange={setC} />
            </div>
          </div>

          <div className="rounded-[18px] border-2 border-slate-900/30 bg-slate-50 p-3 [.dark_&]:bg-slate-800">
            <p className="mb-3 text-sm font-bold">Seconda equazione: dx + ey = f</p>
            <div className="grid grid-cols-3 gap-3">
              <CoefficientInput label="d" value={d} onChange={setD} />
              <CoefficientInput label="e" value={e} onChange={setE} />
              <CoefficientInput label="f" value={f} onChange={setF} />
            </div>
          </div>

          <div className="rounded-[16px] bg-slate-100 p-3 text-sm font-bold leading-6 [.dark_&]:bg-slate-800">
            <p>{formatEquation(a, b, c)}</p>
            <p>{formatEquation(d, e, f)}</p>
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
                  Soluzione del sistema
                </p>
                {result.type === "determined" && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-[14px] bg-slate-100 px-4 py-3 text-2xl font-black text-blue-600 [.dark_&]:bg-slate-800 [.dark_&]:text-blue-300">
                      x = <FractionView value={result.x} />
                    </div>
                    <div className="rounded-[14px] bg-slate-100 px-4 py-3 text-2xl font-black text-blue-600 [.dark_&]:bg-slate-800 [.dark_&]:text-blue-300">
                      y = <FractionView value={result.y} />
                    </div>
                  </div>
                )}
                {result.type === "infinite" && (
                  <div className="mt-3 rounded-[14px] bg-slate-100 px-4 py-3 text-2xl font-black text-blue-600 [.dark_&]:bg-slate-800 [.dark_&]:text-blue-300">
                    infinite soluzioni
                  </div>
                )}
                {result.type === "impossible" && (
                  <div className="mt-3 rounded-[14px] bg-slate-100 px-4 py-3 text-2xl font-black text-blue-600 [.dark_&]:bg-slate-800 [.dark_&]:text-blue-300">
                    nessuna soluzione
                  </div>
                )}
              </div>

              {result.type === "determined" && (
                <div className="mt-4 rounded-[16px] bg-white p-3 [.dark_&]:bg-slate-900">
                  <h2 className="font-bold">Valori decimali</h2>
                  <p className="mt-2 text-sm font-semibold leading-6">
                    x = {formatDecimal(result.x)}, y = {formatDecimal(result.y)}
                  </p>
                </div>
              )}

              <div className="mt-4 rounded-[16px] bg-white p-3 [.dark_&]:bg-slate-900">
                <h2 className="font-bold">Passaggi con Cramer</h2>
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
