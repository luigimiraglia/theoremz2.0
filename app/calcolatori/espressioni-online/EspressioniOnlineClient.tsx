"use client";

import { useMemo, useState } from "react";

type Token =
  | { type: "number"; value: string }
  | { type: "operator"; value: OperatorValue }
  | { type: "paren"; value: "(" | ")" };

type OperatorValue = "+" | "-" | "*" | "/" | "^";

type EvalResult = {
  value: Rational;
  steps: string[];
};

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TEN = BigInt(10);

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

class Rational {
  numerator: bigint;
  denominator: bigint;

  constructor(numerator: bigint, denominator = ONE) {
    if (denominator === ZERO) throw new Error("Divisione per zero.");
    const sign = denominator < ZERO ? -ONE : ONE;
    const gcd = gcdBigInt(numerator, denominator);
    this.numerator = (numerator / gcd) * sign;
    this.denominator = absBigInt(denominator / gcd);
  }

  static fromString(value: string) {
    const normalized = value.replace(",", ".");
    if (!normalized.includes(".")) return new Rational(BigInt(normalized));
    const [integerPart, decimalPart = ""] = normalized.split(".");
    const scale = TEN ** BigInt(decimalPart.length);
    const sign = integerPart.startsWith("-") ? -ONE : ONE;
    const cleanInteger = integerPart.replace("-", "") || "0";
    const numerator =
      (BigInt(cleanInteger) * scale + BigInt(decimalPart || "0")) * sign;
    return new Rational(numerator, scale);
  }

  add(other: Rational) {
    return new Rational(
      this.numerator * other.denominator + other.numerator * this.denominator,
      this.denominator * other.denominator
    );
  }

  sub(other: Rational) {
    return new Rational(
      this.numerator * other.denominator - other.numerator * this.denominator,
      this.denominator * other.denominator
    );
  }

  mul(other: Rational) {
    return new Rational(
      this.numerator * other.numerator,
      this.denominator * other.denominator
    );
  }

  div(other: Rational) {
    if (other.numerator === ZERO) throw new Error("Divisione per zero.");
    return new Rational(
      this.numerator * other.denominator,
      this.denominator * other.numerator
    );
  }

  neg() {
    return new Rational(-this.numerator, this.denominator);
  }

  pow(exponent: Rational) {
    if (exponent.denominator !== ONE) {
      throw new Error("Per ora le potenze supportano solo esponenti interi.");
    }
    const exp = Number(exponent.numerator);
    if (!Number.isSafeInteger(exp) || Math.abs(exp) > 20) {
      throw new Error("Esponente troppo grande per mostrare passaggi leggibili.");
    }
    if (exp === 0) return new Rational(ONE);
    const positive = Math.abs(exp);
    const numerator = this.numerator ** BigInt(positive);
    const denominator = this.denominator ** BigInt(positive);
    const powered = new Rational(numerator, denominator);
    return exp > 0 ? powered : new Rational(powered.denominator, powered.numerator);
  }

  toNumber() {
    return Number(this.numerator) / Number(this.denominator);
  }

  toPlain() {
    if (this.denominator === ONE) return this.numerator.toString();
    return `${this.numerator.toString()}/${this.denominator.toString()}`;
  }
}

function formatDecimal(value: Rational) {
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 10,
  }).format(value.toNumber());
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[0-9]/.test(char)) {
      let value = char;
      index += 1;
      while (index < input.length && /[0-9.,]/.test(input[index])) {
        value += input[index];
        index += 1;
      }
      if ((value.match(/[.,]/g) ?? []).length > 1) {
        throw new Error(`Numero non valido: ${value}`);
      }
      tokens.push({ type: "number", value });
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      index += 1;
      continue;
    }

    if (["+", "-", "^"].includes(char)) {
      tokens.push({ type: "operator", value: char as OperatorValue });
      index += 1;
      continue;
    }

    if (["*", "×", "·"].includes(char)) {
      tokens.push({ type: "operator", value: "*" });
      index += 1;
      continue;
    }

    if (["/", ":"].includes(char)) {
      tokens.push({ type: "operator", value: "/" });
      index += 1;
      continue;
    }

    throw new Error(`Carattere non riconosciuto: ${char}`);
  }

  return tokens;
}

class Parser {
  tokens: Token[];
  index = 0;
  steps: string[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): EvalResult {
    if (!this.tokens.length) throw new Error("Scrivi un'espressione da calcolare.");
    const value = this.parseExpression();
    if (this.peek()) throw new Error("Controlla parentesi e operatori: c'è qualcosa in più alla fine.");
    return { value, steps: this.steps };
  }

  parseExpression(): Rational {
    let left = this.parseTerm();
    while (this.matchOperator("+") || this.matchOperator("-")) {
      const operator = this.previous().value;
      const right = this.parseTerm();
      const result = operator === "+" ? left.add(right) : left.sub(right);
      this.steps.push(`${left.toPlain()} ${operator} ${right.toPlain()} = ${result.toPlain()}`);
      left = result;
    }
    return left;
  }

  parseTerm(): Rational {
    let left = this.parsePower();
    while (this.matchOperator("*") || this.matchOperator("/")) {
      const operator = this.previous().value;
      const right = this.parsePower();
      const result = operator === "*" ? left.mul(right) : left.div(right);
      const symbol = operator === "*" ? "×" : ":";
      this.steps.push(`${left.toPlain()} ${symbol} ${right.toPlain()} = ${result.toPlain()}`);
      left = result;
    }
    return left;
  }

  parsePower(): Rational {
    let left = this.parseUnary();
    if (this.matchOperator("^")) {
      const right = this.parsePower();
      const result = left.pow(right);
      this.steps.push(`${left.toPlain()}^${right.toPlain()} = ${result.toPlain()}`);
      left = result;
    }
    return left;
  }

  parseUnary(): Rational {
    if (this.matchOperator("+")) return this.parseUnary();
    if (this.matchOperator("-")) {
      const value = this.parseUnary().neg();
      this.steps.push(`Cambio di segno: ${value.toPlain()}`);
      return value;
    }
    return this.parsePrimary();
  }

  parsePrimary(): Rational {
    const token = this.advance();
    if (!token) throw new Error("Espressione incompleta.");

    if (token.type === "number") {
      return Rational.fromString(token.value);
    }

    if (token.type === "paren" && token.value === "(") {
      const value = this.parseExpression();
      if (!this.matchParen(")")) throw new Error("Manca una parentesi chiusa.");
      this.steps.push(`Parentesi risolta: ${value.toPlain()}`);
      return value;
    }

    throw new Error("Controlla la posizione di numeri, operatori e parentesi.");
  }

  matchOperator(value: OperatorValue) {
    const token = this.peek();
    if (token?.type !== "operator" || token.value !== value) return false;
    this.index += 1;
    return true;
  }

  matchParen(value: "(" | ")") {
    const token = this.peek();
    if (token?.type !== "paren" || token.value !== value) return false;
    this.index += 1;
    return true;
  }

  advance() {
    const token = this.peek();
    if (token) this.index += 1;
    return token;
  }

  previous() {
    return this.tokens[this.index - 1];
  }

  peek() {
    return this.tokens[this.index];
  }
}

function calculateExpression(input: string) {
  const tokens = tokenize(input);
  return new Parser(tokens).parse();
}

function FractionView({ value }: { value: Rational }) {
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

export default function EspressioniOnlineClient() {
  const [input, setInput] = useState("2 + 3 × (4 - 1)^2");

  const result = useMemo(() => {
    try {
      return calculateExpression(input);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Espressione non valida.",
      };
    }
  }, [input]);

  return (
    <section className="rounded-[24px] border-2 border-slate-900/70 bg-white p-4 shadow-[0_4px_0_#0f172a] [.dark_&]:bg-slate-900 sm:p-5">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="min-w-0">
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Espressione</span>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-h-32 w-full resize-none rounded-[16px] border-2 border-slate-900/40 bg-white px-4 py-3 text-lg font-bold outline-none [.dark_&]:border-slate-500 [.dark_&]:bg-slate-900"
              placeholder="Es. 2 + 3 × (4 - 1)^2"
            />
          </label>
          <p className="mt-2 text-sm font-medium leading-6 opacity-75">
            Puoi usare +, -, ×, *, :, /, parentesi e potenze con ^. Le frazioni
            si scrivono con /, ad esempio 1/2 + 3/4.
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
              <div className="mt-3 rounded-[16px] bg-white p-4 [.dark_&]:bg-slate-900">
                <p className="text-sm font-bold uppercase tracking-wide opacity-60">
                  Valore finale
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
                {result.steps.length ? (
                  <ol className="mt-3 space-y-2 text-sm font-semibold leading-6">
                    {result.steps.map((step, index) => (
                      <li key={`${step}-${index}`}>{step}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-2 text-sm font-semibold leading-6">
                    L&apos;espressione contiene già un solo numero.
                  </p>
                )}
              </div>

              <div className="mt-4 rounded-[16px] bg-white p-3 [.dark_&]:bg-slate-900">
                <h2 className="font-bold">Ordine seguito</h2>
                <p className="mt-2 text-sm font-semibold leading-6">
                  Prima parentesi e potenze, poi moltiplicazioni e divisioni,
                  infine addizioni e sottrazioni.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
