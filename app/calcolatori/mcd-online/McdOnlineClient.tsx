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

function gcdMany(numbers: number[]): number {
  return numbers.reduce((acc, n) => gcdTwo(acc, n));
}

function euclidSteps(a: number, b: number): string[] {
  const steps: string[] = [];
  let x = Math.max(Math.abs(a), Math.abs(b));
  let y = Math.min(Math.abs(a), Math.abs(b));

  while (y !== 0) {
    const q = Math.floor(x / y);
    const r = x % y;
    steps.push(`${x} = ${y} × ${q} + ${r}`);
    x = y;
    y = r;
  }

  steps.push(`Il resto è 0, quindi il MCD è ${x}.`);
  return steps;
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

function getCommonFactors(numbers: number[]) {
  const factorMaps = numbers.map(factorize);
  const first = factorMaps[0];
  const common: FactorMap = new Map();

  for (const [prime, exponent] of first.entries()) {
    const minExponent = Math.min(
      exponent,
      ...factorMaps.slice(1).map((factors) => factors.get(prime) ?? 0)
    );
    if (minExponent > 0) {
      common.set(prime, minExponent);
    }
  }

  return { factorMaps, common };
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
    current = gcdTwo(current, next);
    steps.push(`MCD(${previous}, ${next}) = ${current}`);
  }

  return steps;
}

export default function McdOnlineClient() {
  const [input, setInput] = useState("24, 36, 60");

  const result = useMemo(() => {
    const numbers = parseNumbers(input);

    if (numbers.length < 2) {
      return {
        numbers,
        error: "Inserisci almeno due numeri interi diversi da zero.",
      };
    }

    if (numbers.some((n) => n > 1_000_000)) {
      return {
        numbers,
        error: "Per ora usa numeri fino a 1.000.000, così i passaggi restano leggibili.",
      };
    }

    const mcd = gcdMany(numbers);
    const { factorMaps, common } = getCommonFactors(numbers);

    return {
      numbers,
      mcd,
      factorMaps,
      common,
      commonProduct: productFromFactors(common),
      euclid: euclidSteps(numbers[0], numbers[1]),
      reduction: getReductionSteps(numbers),
    };
  }, [input]);

  return (
    <section className="rounded-[24px] border-2 border-slate-900/70 bg-white p-4 shadow-[0_4px_0_#0f172a] [.dark_&]:bg-slate-900 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <label className="block">
            <span className="mb-2 block text-sm font-bold">
              Numeri
            </span>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-h-32 w-full resize-none rounded-[16px] border-2 border-slate-900/40 bg-white px-4 py-3 text-lg font-bold outline-none [.dark_&]:border-slate-500 [.dark_&]:bg-slate-900"
              placeholder="Es. 24, 36, 60"
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
              <div className="mt-2 text-4xl font-black">{result.mcd}</div>
              <p className="mt-2 text-sm font-semibold opacity-80">
                MCD({result.numbers.join(", ")}) = {result.mcd}
              </p>

              <div className="mt-5 rounded-[16px] bg-white p-3 [.dark_&]:bg-slate-900">
                <h2 className="font-bold">Metodo rapido: algoritmo di Euclide</h2>
                <p className="mt-1 text-sm font-medium leading-6 opacity-80">
                  Applichiamo Euclide ai primi due numeri. Se ci sono più numeri,
                  il risultato viene poi confrontato con i successivi.
                </p>
                <ol className="mt-3 space-y-1 text-sm font-semibold leading-6">
                  {result.euclid.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                {result.reduction.length > 1 && (
                  <div className="mt-3 border-t border-slate-200 pt-3 [.dark_&]:border-slate-700">
                    <p className="text-sm font-bold">Riduzione su tutti i numeri</p>
                    <ol className="mt-2 space-y-1 text-sm font-semibold leading-6">
                      {result.reduction.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
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
                  Fattori comuni con esponente minore:{" "}
                  <span className="inline-flex items-baseline">
                    <FactorMapExpression factors={result.common} />
                  </span>{" "}
                  = {result.commonProduct}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
