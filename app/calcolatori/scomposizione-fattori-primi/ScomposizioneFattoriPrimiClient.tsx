"use client";

import { useMemo, useState } from "react";

type Factor = {
  prime: number;
  exponent: number;
};

type DivisionStep = {
  dividend: number;
  divisor: number;
  quotient: number;
};

function parseInteger(value: string): number | null {
  const token = value.trim().replace(/\s/g, "");
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(token)) return null;
  const n = Number(token.replace(/\./g, ""));
  return Number.isSafeInteger(n) ? n : null;
}

function factorize(n: number) {
  const factors: Factor[] = [];
  const divisions: DivisionStep[] = [];
  let current = n;
  let divisor = 2;

  while (divisor * divisor <= current) {
    let exponent = 0;
    while (current % divisor === 0) {
      const quotient = current / divisor;
      divisions.push({ dividend: current, divisor, quotient });
      current = quotient;
      exponent += 1;
    }
    if (exponent > 0) {
      factors.push({ prime: divisor, exponent });
    }
    divisor = divisor === 2 ? 3 : divisor + 2;
  }

  if (current > 1) {
    factors.push({ prime: current, exponent: 1 });
    if (current !== n) {
      divisions.push({ dividend: current, divisor: current, quotient: 1 });
    }
  }

  return { factors, divisions };
}

function isPrimeFromFactors(n: number, factors: Factor[]) {
  return n > 1 && factors.length === 1 && factors[0].prime === n && factors[0].exponent === 1;
}

function Factorization({ factors }: { factors: Factor[] }) {
  if (!factors.length) return <span>1</span>;

  return (
    <>
      <span className="inline-flex max-w-full flex-wrap items-baseline gap-y-1">
        {factors.map((factor, index) => (
          <span key={`${factor.prime}-${factor.exponent}`} className="inline-flex items-baseline">
            {index > 0 && <span className="mx-2 text-slate-400">×</span>}
            <span>{factor.prime}</span>
            {factor.exponent > 1 && (
              <sup className="ml-0.5 text-[0.6em] leading-none">
                {factor.exponent}
              </sup>
            )}
          </span>
        ))}
      </span>
    </>
  );
}

export default function ScomposizioneFattoriPrimiClient() {
  const [input, setInput] = useState("1260");

  const result = useMemo(() => {
    const n = parseInteger(input);

    if (n === null) {
      return { error: "Inserisci un numero intero positivo." };
    }

    if (n < 2) {
      return { number: n, error: "La scomposizione in fattori primi si fa per numeri interi maggiori di 1." };
    }

    if (n > 100_000_000) {
      return {
        number: n,
        error: "Per ora usa numeri fino a 100.000.000, così i passaggi restano leggibili.",
      };
    }

    const { factors, divisions } = factorize(n);
    return {
      number: n,
      factors,
      divisions,
      isPrime: isPrimeFromFactors(n, factors),
    };
  }, [input]);

  return (
    <section className="rounded-[24px] border-2 border-slate-900/70 bg-white p-4 shadow-[0_4px_0_#0f172a] [.dark_&]:bg-slate-900 sm:p-5">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="min-w-0">
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Numero</span>
            <input
              inputMode="numeric"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="w-full rounded-[16px] border-2 border-slate-900/40 bg-white px-4 py-3 text-lg font-bold outline-none [.dark_&]:border-slate-500 [.dark_&]:bg-slate-900"
              placeholder="Es. 1260"
            />
          </label>
          <p className="mt-2 text-sm font-medium leading-6 opacity-75">
            Puoi usare anche il punto per le migliaia, ad esempio 12.600.
          </p>
        </div>

        <div className="min-w-0 rounded-[20px] bg-slate-100 p-4 [.dark_&]:bg-slate-800">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-600 [.dark_&]:text-blue-300">
            Risultato
          </p>

          {"error" in result ? (
            <p className="mt-3 text-lg font-bold">{result.error}</p>
          ) : (
            <>
              <div className="mt-3 min-w-0 rounded-[16px] bg-white p-4 [.dark_&]:bg-slate-900">
                <p className="text-sm font-bold uppercase tracking-wide opacity-60">
                  Scomposizione finale
                </p>
                <div className="mt-3 flex items-center gap-3 text-xl font-black">
                  <span>{result.number}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500 [.dark_&]:bg-slate-800 [.dark_&]:text-slate-300">
                    =
                  </span>
                </div>
                <div className="mt-3 min-w-0 rounded-[14px] bg-slate-100 px-4 py-3 text-2xl font-black text-blue-600 [.dark_&]:bg-slate-800 [.dark_&]:text-blue-300">
                  <Factorization factors={result.factors} />
                </div>
              </div>

              {result.isPrime ? (
                <p className="mt-3 rounded-[16px] bg-white p-3 text-sm font-bold text-blue-600 [.dark_&]:bg-slate-900 [.dark_&]:text-blue-300">
                  {result.number} è un numero primo: la sua scomposizione è
                  semplicemente {result.number}.
                </p>
              ) : (
                <>
                  <div className="mt-5 min-w-0 rounded-[16px] bg-white p-3 [.dark_&]:bg-slate-900">
                    <h2 className="font-bold">Divisioni successive</h2>
                    <div className="mt-3 w-full max-w-full overflow-x-auto overscroll-x-contain rounded-[14px] border border-slate-200 [-webkit-overflow-scrolling:touch] [.dark_&]:border-slate-700">
                      <div className="min-w-[20rem]">
                        <div className="grid grid-cols-[minmax(6.5rem,1fr)_minmax(5rem,0.8fr)_minmax(6.5rem,1fr)] bg-slate-100 px-3 py-2 text-sm font-bold [.dark_&]:bg-slate-800">
                          <span>Numero</span>
                          <span>Divisore</span>
                          <span>Quoziente</span>
                        </div>
                        <div className="divide-y divide-slate-200 [.dark_&]:divide-slate-700">
                          {result.divisions.map((step, index) => (
                            <div
                              key={`${step.dividend}-${step.divisor}-${index}`}
                              className="grid grid-cols-[minmax(6.5rem,1fr)_minmax(5rem,0.8fr)_minmax(6.5rem,1fr)] px-3 py-2 text-sm font-semibold tabular-nums"
                            >
                              <span>{step.dividend}</span>
                              <span>{step.divisor}</span>
                              <span>{step.quotient}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[16px] bg-white p-3 [.dark_&]:bg-slate-900">
                    <h2 className="font-bold">Forma con potenze</h2>
                    <p className="mt-2 text-sm font-semibold leading-6">
                      Raggruppiamo i fattori uguali e scriviamo gli esponenti:
                    </p>
                    <p className="mt-2 text-xl font-black text-blue-600 [.dark_&]:text-blue-300">
                      <Factorization factors={result.factors} />
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
