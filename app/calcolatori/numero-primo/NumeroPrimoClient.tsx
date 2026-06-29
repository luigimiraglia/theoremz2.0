"use client";

import { useMemo, useState } from "react";

function parseInteger(value: string): number | null {
  const token = value.trim().replace(/\s/g, "");
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(token)) return null;
  const n = Number(token.replace(/\./g, ""));
  return Number.isSafeInteger(n) ? n : null;
}

function getCheckedDivisors(n: number) {
  const limit = Math.floor(Math.sqrt(n));
  const divisors: number[] = [];
  if (limit >= 2) divisors.push(2);
  for (let d = 3; d <= limit; d += 2) {
    divisors.push(d);
  }
  return divisors;
}

function isPrime(n: number) {
  if (n < 2) {
    return {
      prime: false,
      reason: "I numeri primi sono interi maggiori di 1.",
      checkedDivisors: [] as number[],
      firstDivisor: null as number | null,
    };
  }

  if (n === 2) {
    return {
      prime: true,
      reason: "2 è l'unico numero primo pari.",
      checkedDivisors: [],
      firstDivisor: null as number | null,
    };
  }

  if (n % 2 === 0) {
    return {
      prime: false,
      reason: `${n} è divisibile per 2, quindi non è primo.`,
      checkedDivisors: [2],
      firstDivisor: 2,
    };
  }

  const checkedDivisors = getCheckedDivisors(n);
  for (const divisor of checkedDivisors) {
    if (divisor !== 2 && n % divisor === 0) {
      return {
        prime: false,
        reason: `${n} è divisibile per ${divisor}, quindi non è primo.`,
        checkedDivisors,
        firstDivisor: divisor,
      };
    }
  }

  const limit = Math.floor(Math.sqrt(n));

  return {
    prime: true,
    reason:
      limit < 2
        ? `${n} è maggiore di 1 e non ha divisori da controllare prima di sé, quindi è primo.`
        : `Non ci sono divisori tra 2 e ${limit}, quindi ${n} è primo.`,
    checkedDivisors,
    firstDivisor: null as number | null,
  };
}

function nextPrimeFrom(start: number) {
  let n = Math.max(2, start);
  while (!isPrime(n).prime) n += 1;
  return n;
}

function previousPrimeFrom(start: number) {
  let n = start;
  while (n >= 2) {
    if (isPrime(n).prime) return n;
    n -= 1;
  }
  return null;
}

function formatCheckedDivisors(divisors: number[]) {
  if (!divisors.length) return "Nessun divisore da controllare.";
  if (divisors.length <= 18) return divisors.join(", ");
  return `${divisors.slice(0, 18).join(", ")} ... (${divisors.length} divisori controllati)`;
}

export default function NumeroPrimoClient() {
  const [input, setInput] = useState("997");

  const result = useMemo(() => {
    const n = parseInteger(input);

    if (n === null) {
      return { error: "Inserisci un numero intero positivo." };
    }

    if (n > 100_000_000) {
      return {
        number: n,
        error: "Per ora usa numeri fino a 100.000.000, così i controlli restano leggibili.",
      };
    }

    const analysis = isPrime(n);
    return {
      number: n,
      ...analysis,
      sqrtLimit: Math.floor(Math.sqrt(Math.max(n, 0))),
      previousPrime: previousPrimeFrom(n - 1),
      nextPrime: nextPrimeFrom(n + 1),
    };
  }, [input]);

  return (
    <section className="rounded-[24px] border-2 border-slate-900/70 bg-white p-4 shadow-[0_4px_0_#0f172a] [.dark_&]:bg-slate-900 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Numero</span>
            <input
              inputMode="numeric"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="w-full rounded-[16px] border-2 border-slate-900/40 bg-white px-4 py-3 text-lg font-bold outline-none [.dark_&]:border-slate-500 [.dark_&]:bg-slate-900"
              placeholder="Es. 997"
            />
          </label>
          <p className="mt-2 text-sm font-medium leading-6 opacity-75">
            Puoi usare anche il punto per le migliaia, ad esempio 10.007.
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
              <div className="mt-2 text-3xl font-black">
                {result.number} {result.prime ? "è primo" : "non è primo"}
              </div>
              <p className="mt-3 rounded-[16px] bg-white p-3 text-sm font-bold text-blue-600 [.dark_&]:bg-slate-900 [.dark_&]:text-blue-300">
                {result.reason}
              </p>

              <div className="mt-4 rounded-[16px] bg-white p-3 [.dark_&]:bg-slate-900">
                <h2 className="font-bold">Controllo dei divisori</h2>
                <p className="mt-2 text-sm font-medium leading-6 opacity-80">
                  Basta controllare i divisori fino a √{result.number}, cioè
                  fino a {result.sqrtLimit}. Se nessuno divide il numero, allora
                  il numero è primo.
                </p>
                <p className="mt-3 text-sm font-semibold leading-6">
                  Divisori controllati: {formatCheckedDivisors(result.checkedDivisors)}
                </p>
                {result.firstDivisor && (
                  <p className="mt-3 text-sm font-bold">
                    Primo divisore trovato: {result.firstDivisor}. Infatti{" "}
                    {result.number} / {result.firstDivisor} ={" "}
                    {result.number / result.firstDivisor}.
                  </p>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[16px] bg-white p-3 [.dark_&]:bg-slate-900">
                  <h2 className="font-bold">Primo precedente</h2>
                  <p className="mt-2 text-2xl font-black">
                    {result.previousPrime ?? "Nessuno"}
                  </p>
                </div>
                <div className="rounded-[16px] bg-white p-3 [.dark_&]:bg-slate-900">
                  <h2 className="font-bold">Primo successivo</h2>
                  <p className="mt-2 text-2xl font-black">{result.nextPrime}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
