"use client";

import { useMemo, useState } from "react";

type FactorMap = Map<number, number>;

function parseIntegerToken(value: string): number | null {
  const token = value.trim();
  if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(token)) return null;
  const n = Number(token.replace(/\./g, ""));
  return Number.isSafeInteger(n) && n !== 0 ? Math.abs(n) : null;
}

function parseNumbers(value: string): number[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map(parseIntegerToken)
    .filter((n): n is number => n !== null);
}

function gcdTwo(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const r = x % y;
    x = y;
    y = r;
  }
  return x;
}

function lcmTwo(a: number, b: number): number | null {
  const value = Math.abs(a / gcdTwo(a, b) * b);
  return Number.isSafeInteger(value) ? value : null;
}

function lcmMany(numbers: number[]): number | null {
  let current = numbers[0];
  for (const next of numbers.slice(1)) {
    const value = lcmTwo(current, next);
    if (value === null) return null;
    current = value;
  }
  return current;
}

function factorize(n: number): FactorMap {
  const factors: FactorMap = new Map();
  let current = n;
  let divisor = 2;

  while (divisor * divisor <= current) {
    while (current % divisor === 0) {
      factors.set(divisor, (factors.get(divisor) ?? 0) + 1);
      current = current / divisor;
    }
    divisor = divisor === 2 ? 3 : divisor + 2;
  }

  if (current > 1) {
    factors.set(current, (factors.get(current) ?? 0) + 1);
  }

  return factors;
}

function FactorMapExpression({ factors }: { factors: FactorMap }) {
  const entries = Array.from(factors.entries()).sort(([a], [b]) => a - b);
  if (!entries.length) return <span>1</span>;

  return (
    <>
      {entries.map(([prime, exponent], index) => (
        <span key={`${prime}-${exponent}`} className="inline-flex items-baseline">
          {index > 0 && <span className="mx-2 text-slate-400">×</span>}
          <span>{prime}</span>
          {exponent > 1 && (
            <sup className="ml-0.5 text-[0.6em] leading-none">{exponent}</sup>
          )}
        </span>
      ))}
    </>
  );
}

function getLcmFactors(numbers: number[]) {
  const factorMaps = numbers.map(factorize);
  const lcmFactors: FactorMap = new Map();

  for (const factors of factorMaps) {
    for (const [prime, exponent] of factors.entries()) {
      lcmFactors.set(prime, Math.max(lcmFactors.get(prime) ?? 0, exponent));
    }
  }

  return { factorMaps, lcmFactors };
}

function productFromFactors(factors: FactorMap): number {
  return Array.from(factors.entries()).reduce(
    (acc, [prime, exponent]) => acc * prime ** exponent,
    1
  );
}

function getReductionSteps(numbers: number[]) {
  const steps: string[] = [];
  let current = numbers[0];

  for (const next of numbers.slice(1)) {
    const previous = current;
    const gcd = gcdTwo(previous, next);
    const value = lcmTwo(previous, next);
    if (value === null) {
      steps.push(`mcm(${previous}, ${next}) è troppo grande per essere mostrato con precisione.`);
      break;
    }
    current = value;
    steps.push(`mcm(${previous}, ${next}) = (${previous} × ${next}) / MCD(${previous}, ${next}) = ${current}, con MCD = ${gcd}`);
  }

  return steps;
}

export default function McmOnlineClient() {
  const [input, setInput] = useState("12, 18, 30");

  const result = useMemo(() => {
    const numbers = parseNumbers(input);

    if (numbers.length < 2) {
      return {
        numbers,
        error: "Inserisci almeno due numeri interi diversi da zero.",
      };
    }

    if (numbers.some((n) => n > 100_000)) {
      return {
        numbers,
        error: "Per ora usa numeri fino a 100.000, così il risultato e i passaggi restano leggibili.",
      };
    }

    const mcm = lcmMany(numbers);
    if (mcm === null) {
      return {
        numbers,
        error: "Il risultato è troppo grande per essere mostrato con precisione.",
      };
    }

    const { factorMaps, lcmFactors } = getLcmFactors(numbers);

    return {
      numbers,
      mcm,
      factorMaps,
      lcmFactors,
      lcmProduct: productFromFactors(lcmFactors),
      reduction: getReductionSteps(numbers),
    };
  }, [input]);

  return (
    <section className="rounded-[24px] border-2 border-slate-900/70 bg-white p-4 shadow-[0_4px_0_#0f172a] [.dark_&]:bg-slate-900 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Numeri</span>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-h-32 w-full resize-none rounded-[16px] border-2 border-slate-900/40 bg-white px-4 py-3 text-lg font-bold outline-none [.dark_&]:border-slate-500 [.dark_&]:bg-slate-900"
              placeholder="Es. 12, 18, 30"
            />
          </label>
          <p className="mt-2 text-sm font-medium leading-6 opacity-75">
            Scrivi almeno due numeri separati dalla virgola.
          </p>
        </div>

        <div className="rounded-[20px] bg-slate-100 p-4 [.dark_&]:bg-slate-800">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-600 [.dark_&]:text-blue-300">
            Risultato
          </p>

          {"error" in result ? (
            <p className="mt-3 text-lg font-bold">{result.error}</p>
          ) : (
            <>
              <div className="mt-2 text-4xl font-black">{result.mcm}</div>
              <p className="mt-2 text-sm font-semibold opacity-80">
                mcm({result.numbers.join(", ")}) = {result.mcm}
              </p>

              <div className="mt-5 rounded-[16px] bg-white p-3 [.dark_&]:bg-slate-900">
                <h2 className="font-bold">Metodo rapido: formula con il MCD</h2>
                <p className="mt-1 text-sm font-medium leading-6 opacity-80">
                  Per due numeri vale mcm(a, b) = a × b / MCD(a, b). Con più
                  numeri applichiamo la formula in sequenza.
                </p>
                <ol className="mt-3 space-y-1 text-sm font-semibold leading-6">
                  {result.reduction.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="mt-4 rounded-[16px] bg-white p-3 [.dark_&]:bg-slate-900">
                <h2 className="font-bold">Metodo con fattori primi</h2>
                <div className="mt-3 space-y-2 text-sm font-medium leading-6">
                  {result.numbers.map((number, index) => (
                    <p key={`${number}-${index}`} className="flex flex-wrap items-baseline gap-x-2">
                      <span>{number}</span>
                      <span className="text-slate-400">=</span>
                      <span>
                        <FactorMapExpression factors={result.factorMaps[index]} />
                      </span>
                    </p>
                  ))}
                </div>
                <p className="mt-3 text-sm font-bold text-blue-600 [.dark_&]:text-blue-300">
                  Fattori comuni e non comuni con esponente maggiore:{" "}
                  <span className="inline-flex items-baseline">
                    <FactorMapExpression factors={result.lcmFactors} />
                  </span>{" "}
                  = {result.lcmProduct}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
