"use client";

import { useMemo, useState } from "react";

type Operation = "add" | "sub" | "mul" | "div";

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

  constructor(numerator: bigint, denominator: bigint) {
    if (denominator === ZERO) throw new Error("Il denominatore non può essere 0.");
    const sign = denominator < ZERO ? -ONE : ONE;
    const gcd = gcdBigInt(numerator, denominator);
    this.numerator = (numerator / gcd) * sign;
    this.denominator = absBigInt(denominator / gcd);
  }

  add(other: Fraction) {
    return new Fraction(
      this.numerator * other.denominator + other.numerator * this.denominator,
      this.denominator * other.denominator
    );
  }

  sub(other: Fraction) {
    return new Fraction(
      this.numerator * other.denominator - other.numerator * this.denominator,
      this.denominator * other.denominator
    );
  }

  mul(other: Fraction) {
    return new Fraction(
      this.numerator * other.numerator,
      this.denominator * other.denominator
    );
  }

  div(other: Fraction) {
    if (other.numerator === ZERO) throw new Error("Non puoi dividere per una frazione uguale a 0.");
    return new Fraction(
      this.numerator * other.denominator,
      this.denominator * other.numerator
    );
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
    maximumFractionDigits: 10,
  }).format(value.toNumber());
}

function operationSymbol(operation: Operation) {
  if (operation === "add") return "+";
  if (operation === "sub") return "-";
  if (operation === "mul") return "×";
  return ":";
}

function calculate(a: Fraction, b: Fraction, operation: Operation) {
  if (operation === "add") return a.add(b);
  if (operation === "sub") return a.sub(b);
  if (operation === "mul") return a.mul(b);
  return a.div(b);
}

function buildSteps(a: Fraction, b: Fraction, operation: Operation, result: Fraction) {
  if (operation === "add" || operation === "sub") {
    const commonDenominator = a.denominator * b.denominator;
    const leftNumerator = a.numerator * b.denominator;
    const rightNumerator = b.numerator * a.denominator;
    const rawNumerator =
      operation === "add"
        ? leftNumerator + rightNumerator
        : leftNumerator - rightNumerator;

    return [
      `Portiamo le frazioni allo stesso denominatore: ${commonDenominator.toString()}.`,
      `${a.toPlain()} diventa ${leftNumerator.toString()}/${commonDenominator.toString()}.`,
      `${b.toPlain()} diventa ${rightNumerator.toString()}/${commonDenominator.toString()}.`,
      `Calcoliamo i numeratori: ${leftNumerator.toString()} ${operationSymbol(operation)} ${rightNumerator.toString()} = ${rawNumerator.toString()}.`,
      `Semplifichiamo: ${rawNumerator.toString()}/${commonDenominator.toString()} = ${result.toPlain()}.`,
    ];
  }

  if (operation === "mul") {
    const rawNumerator = a.numerator * b.numerator;
    const rawDenominator = a.denominator * b.denominator;
    return [
      "Moltiplichiamo numeratore per numeratore e denominatore per denominatore.",
      `${a.numerator.toString()} × ${b.numerator.toString()} = ${rawNumerator.toString()}.`,
      `${a.denominator.toString()} × ${b.denominator.toString()} = ${rawDenominator.toString()}.`,
      `Semplifichiamo: ${rawNumerator.toString()}/${rawDenominator.toString()} = ${result.toPlain()}.`,
    ];
  }

  const rawNumerator = a.numerator * b.denominator;
  const rawDenominator = a.denominator * b.numerator;
  return [
    "Per dividere due frazioni, moltiplichiamo la prima per il reciproco della seconda.",
    `Il reciproco di ${b.toPlain()} è ${b.denominator.toString()}/${b.numerator.toString()}.`,
    `${a.numerator.toString()} × ${b.denominator.toString()} = ${rawNumerator.toString()}.`,
    `${a.denominator.toString()} × ${b.numerator.toString()} = ${rawDenominator.toString()}.`,
    `Semplifichiamo: ${rawNumerator.toString()}/${rawDenominator.toString()} = ${result.toPlain()}.`,
  ];
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

function FractionInput({
  title,
  numerator,
  denominator,
  onNumeratorChange,
  onDenominatorChange,
}: {
  title: string;
  numerator: string;
  denominator: string;
  onNumeratorChange: (value: string) => void;
  onDenominatorChange: (value: string) => void;
}) {
  return (
    <fieldset className="rounded-[18px] border-2 border-slate-900/30 bg-slate-50 p-3 [.dark_&]:bg-slate-800">
      <legend className="px-1 text-sm font-bold">{title}</legend>
      <label className="block">
        <span className="mb-1 block text-xs font-bold opacity-75">Numeratore</span>
        <input
          inputMode="numeric"
          value={numerator}
          onChange={(event) => onNumeratorChange(event.target.value)}
          className="w-full rounded-[14px] border-2 border-slate-900/40 bg-white px-3 py-2 text-lg font-bold outline-none [.dark_&]:border-slate-500 [.dark_&]:bg-slate-900"
        />
      </label>
      <div className="mx-auto my-2 h-0.5 w-16 rounded-full bg-slate-900/40 [.dark_&]:bg-slate-400" />
      <label className="block">
        <span className="mb-1 block text-xs font-bold opacity-75">Denominatore</span>
        <input
          inputMode="numeric"
          value={denominator}
          onChange={(event) => onDenominatorChange(event.target.value)}
          className="w-full rounded-[14px] border-2 border-slate-900/40 bg-white px-3 py-2 text-lg font-bold outline-none [.dark_&]:border-slate-500 [.dark_&]:bg-slate-900"
        />
      </label>
    </fieldset>
  );
}

export default function CalcolatriceFrazioniClient() {
  const [aNum, setANum] = useState("3");
  const [aDen, setADen] = useState("4");
  const [bNum, setBNum] = useState("2");
  const [bDen, setBDen] = useState("5");
  const [operation, setOperation] = useState<Operation>("add");

  const result = useMemo(() => {
    try {
      const a = new Fraction(
        parseInteger(aNum, "Il numeratore della prima frazione"),
        parseInteger(aDen, "Il denominatore della prima frazione")
      );
      const b = new Fraction(
        parseInteger(bNum, "Il numeratore della seconda frazione"),
        parseInteger(bDen, "Il denominatore della seconda frazione")
      );
      const value = calculate(a, b, operation);
      return {
        a,
        b,
        value,
        steps: buildSteps(a, b, operation, value),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Controlla le frazioni inserite.",
      };
    }
  }, [aDen, aNum, bDen, bNum, operation]);

  return (
    <section className="rounded-[24px] border-2 border-slate-900/70 bg-white p-4 shadow-[0_4px_0_#0f172a] [.dark_&]:bg-slate-900 sm:p-5">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <FractionInput
              title="Prima frazione"
              numerator={aNum}
              denominator={aDen}
              onNumeratorChange={setANum}
              onDenominatorChange={setADen}
            />
            <FractionInput
              title="Seconda frazione"
              numerator={bNum}
              denominator={bDen}
              onNumeratorChange={setBNum}
              onDenominatorChange={setBDen}
            />
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold">Operazione</span>
            <select
              value={operation}
              onChange={(event) => setOperation(event.target.value as Operation)}
              className="w-full rounded-[16px] border-2 border-slate-900/40 bg-white px-4 py-3 text-base font-bold outline-none [.dark_&]:border-slate-500 [.dark_&]:bg-slate-900"
            >
              <option value="add">Somma (+)</option>
              <option value="sub">Sottrazione (-)</option>
              <option value="mul">Moltiplicazione (×)</option>
              <option value="div">Divisione (:)</option>
            </select>
          </label>
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
                  Frazione finale semplificata
                </p>
                <div className="mt-3 rounded-[14px] bg-slate-100 px-4 py-4 text-3xl font-black text-blue-600 [.dark_&]:bg-slate-800 [.dark_&]:text-blue-300">
                  <FractionView value={result.value} />
                </div>
                {result.value.denominator !== ONE && (
                  <p className="mt-3 text-sm font-bold opacity-75">
                    Valore decimale: {formatDecimal(result.value)}
                  </p>
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
