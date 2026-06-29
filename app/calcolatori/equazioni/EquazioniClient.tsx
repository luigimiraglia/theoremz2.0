"use client";

import { useMemo, useState } from "react";

type OperatorValue = "+" | "-" | "*" | "/" | "^";
type Token =
  | { type: "number"; value: string }
  | { type: "variable"; value: "x" }
  | { type: "operator"; value: OperatorValue }
  | { type: "paren"; value: "(" | ")" };

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);
const FOUR = BigInt(4);
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

  static zero() {
    return new Rational(ZERO);
  }

  static one() {
    return new Rational(ONE);
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

  isZero() {
    return this.numerator === ZERO;
  }

  toNumber() {
    return Number(this.numerator) / Number(this.denominator);
  }

  toPlain() {
    if (this.denominator === ONE) return this.numerator.toString();
    return `${this.numerator.toString()}/${this.denominator.toString()}`;
  }
}

class Poly {
  coeffs: Rational[];

  constructor(coeffs: Rational[]) {
    this.coeffs = [0, 1, 2].map((i) => coeffs[i] ?? Rational.zero());
  }

  static constant(value: Rational) {
    return new Poly([value]);
  }

  static variable() {
    return new Poly([Rational.zero(), Rational.one()]);
  }

  degree() {
    for (let i = 2; i >= 0; i -= 1) {
      if (!this.coeffs[i].isZero()) return i;
    }
    return 0;
  }

  add(other: Poly) {
    return new Poly(this.coeffs.map((value, i) => value.add(other.coeffs[i])));
  }

  sub(other: Poly) {
    return new Poly(this.coeffs.map((value, i) => value.sub(other.coeffs[i])));
  }

  neg() {
    return new Poly(this.coeffs.map((value) => value.neg()));
  }

  mul(other: Poly) {
    const out = [Rational.zero(), Rational.zero(), Rational.zero()];
    for (let i = 0; i <= 2; i += 1) {
      for (let j = 0; j <= 2; j += 1) {
        if (i + j > 2 && !this.coeffs[i].isZero() && !other.coeffs[j].isZero()) {
          throw new Error("Questo calcolatore risolve equazioni fino al secondo grado.");
        }
        if (i + j <= 2) out[i + j] = out[i + j].add(this.coeffs[i].mul(other.coeffs[j]));
      }
    }
    return new Poly(out);
  }

  div(other: Poly) {
    if (other.degree() > 0) {
      throw new Error("La divisione per espressioni con x non è supportata.");
    }
    return new Poly(this.coeffs.map((value) => value.div(other.coeffs[0])));
  }

  pow(exponent: Poly) {
    if (exponent.degree() > 0 || exponent.coeffs[0].denominator !== ONE) {
      throw new Error("Le potenze supportano solo esponenti interi.");
    }
    const exp = Number(exponent.coeffs[0].numerator);
    if (!Number.isSafeInteger(exp) || exp < 0 || exp > 2) {
      throw new Error("Per ora usa potenze con esponente 0, 1 o 2.");
    }
    if (exp === 0) return Poly.constant(Rational.one());
    if (exp === 1) return this;
    return this.mul(this);
  }

  toReadable() {
    const parts: string[] = [];
    const [c, b, a] = this.coeffs;

    const pushTerm = (coefficient: Rational, variable: string) => {
      if (coefficient.isZero()) return;
      const negative = coefficient.numerator < ZERO;
      const abs = new Rational(absBigInt(coefficient.numerator), coefficient.denominator);
      const coefText = abs.toPlain() === "1" && variable ? "" : abs.toPlain();
      const term = `${coefText}${variable}`;
      if (!parts.length) parts.push(negative ? `-${term}` : term);
      else parts.push(`${negative ? "-" : "+"} ${term}`);
    };

    pushTerm(a, "x²");
    pushTerm(b, "x");
    pushTerm(c, "");
    return parts.length ? parts.join(" ") : "0";
  }
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 8,
  }).format(value);
}

function sqrtBigIntIfPerfect(value: bigint) {
  if (value < ZERO) return null;
  if (value < TWO) return value;
  let left = ONE;
  let right = value;
  while (left <= right) {
    const mid = (left + right) / TWO;
    const square = mid * mid;
    if (square === value) return mid;
    if (square < value) left = mid + ONE;
    else right = mid - ONE;
  }
  return null;
}

function sqrtRationalIfPerfect(value: Rational) {
  const n = sqrtBigIntIfPerfect(value.numerator);
  const d = sqrtBigIntIfPerfect(value.denominator);
  if (n === null || d === null) return null;
  return new Rational(n, d);
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

    if (char.toLowerCase() === "x") {
      tokens.push({ type: "variable", value: "x" });
      index += 1;
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

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse() {
    if (!this.tokens.length) throw new Error("Scrivi un membro dell'equazione.");
    const value = this.parseExpression();
    if (this.peek()) throw new Error("Controlla parentesi e operatori.");
    return value;
  }

  parseExpression(): Poly {
    let left = this.parseTerm();
    while (this.matchOperator("+") || this.matchOperator("-")) {
      const operator = this.previous().value;
      const right = this.parseTerm();
      left = operator === "+" ? left.add(right) : left.sub(right);
    }
    return left;
  }

  parseTerm(): Poly {
    let left = this.parsePower();
    while (true) {
      if (this.matchOperator("*") || this.matchOperator("/")) {
        const operator = this.previous().value;
        const right = this.parsePower();
        left = operator === "*" ? left.mul(right) : left.div(right);
        continue;
      }

      if (this.startsPrimary(this.peek())) {
        left = left.mul(this.parsePower());
        continue;
      }

      break;
    }
    return left;
  }

  parsePower(): Poly {
    let left = this.parseUnary();
    if (this.matchOperator("^")) {
      left = left.pow(this.parsePower());
    }
    return left;
  }

  parseUnary(): Poly {
    if (this.matchOperator("+")) return this.parseUnary();
    if (this.matchOperator("-")) return this.parseUnary().neg();
    return this.parsePrimary();
  }

  parsePrimary(): Poly {
    const token = this.advance();
    if (!token) throw new Error("Espressione incompleta.");

    if (token.type === "number") {
      return Poly.constant(Rational.fromString(token.value));
    }

    if (token.type === "variable") {
      return Poly.variable();
    }

    if (token.type === "paren" && token.value === "(") {
      const value = this.parseExpression();
      if (!this.matchParen(")")) throw new Error("Manca una parentesi chiusa.");
      return value;
    }

    throw new Error("Controlla la posizione di numeri, x, operatori e parentesi.");
  }

  startsPrimary(token: Token | undefined) {
    return token?.type === "number" || token?.type === "variable" || (token?.type === "paren" && token.value === "(");
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

function parseMember(input: string) {
  return new Parser(tokenize(input)).parse();
}

function solveEquation(input: string) {
  const pieces = input.split("=");
  if (pieces.length !== 2) {
    throw new Error("Scrivi l'equazione con un solo uguale, per esempio 2x + 3 = 7.");
  }

  const left = parseMember(pieces[0]);
  const right = parseMember(pieces[1]);
  const normalized = left.sub(right);
  const [c, b, a] = normalized.coeffs;
  const degree = normalized.degree();
  const steps = [
    `Portiamo tutto a sinistra: ${normalized.toReadable()} = 0`,
  ];

  if (degree === 0) {
    return {
      normalized,
      steps,
      type: c.isZero() ? "identity" : "impossible",
      solutions: [] as Array<Rational | number>,
      discriminant: null as Rational | null,
    };
  }

  if (degree === 1) {
    const solution = c.neg().div(b);
    steps.push(`${b.toPlain()}x = ${c.neg().toPlain()}`);
    steps.push(`x = ${c.neg().toPlain()} / ${b.toPlain()} = ${solution.toPlain()}`);
    return {
      normalized,
      steps,
      type: "linear",
      solutions: [solution],
      discriminant: null as Rational | null,
    };
  }

  const discriminant = b.mul(b).sub(new Rational(FOUR).mul(a).mul(c));
  steps.push(`Calcoliamo il discriminante: Δ = b² - 4ac = ${discriminant.toPlain()}`);

  if (discriminant.numerator < ZERO) {
    steps.push("Il discriminante è negativo: non ci sono soluzioni reali.");
    return {
      normalized,
      steps,
      type: "quadratic-none",
      solutions: [] as Array<Rational | number>,
      discriminant,
    };
  }

  const sqrt = sqrtRationalIfPerfect(discriminant);
  const denominator = new Rational(TWO).mul(a);

  if (sqrt) {
    const x1 = b.neg().sub(sqrt).div(denominator);
    const x2 = b.neg().add(sqrt).div(denominator);
    steps.push(`√Δ = ${sqrt.toPlain()}`);
    steps.push(`x = (-b ± √Δ) / 2a`);
    return {
      normalized,
      steps,
      type: "quadratic",
      solutions: x1.toPlain() === x2.toPlain() ? [x1] : [x1, x2],
      discriminant,
    };
  }

  const decimalSqrt = Math.sqrt(discriminant.toNumber());
  const x1 = (b.neg().toNumber() - decimalSqrt) / denominator.toNumber();
  const x2 = (b.neg().toNumber() + decimalSqrt) / denominator.toNumber();
  steps.push(`√Δ non è intero: usiamo il valore decimale ${formatDecimal(decimalSqrt)}.`);
  steps.push(`x = (-b ± √Δ) / 2a`);
  return {
    normalized,
    steps,
    type: "quadratic-decimal",
    solutions: [x1, x2],
    discriminant,
  };
}

function SolutionView({ value }: { value: Rational | number }) {
  if (typeof value === "number") return <span>{formatDecimal(value)}</span>;
  return <span>{value.toPlain()}</span>;
}

export default function EquazioniClient() {
  const [input, setInput] = useState("x^2 - 5x + 6 = 0");

  const result = useMemo(() => {
    try {
      return solveEquation(input);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Equazione non valida.",
      };
    }
  }, [input]);

  return (
    <section className="rounded-[24px] border-2 border-slate-900/70 bg-white p-4 shadow-[0_4px_0_#0f172a] [.dark_&]:bg-slate-900 sm:p-5">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="min-w-0">
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Equazione</span>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-h-32 w-full resize-none rounded-[16px] border-2 border-slate-900/40 bg-white px-4 py-3 text-lg font-bold outline-none [.dark_&]:border-slate-500 [.dark_&]:bg-slate-900"
              placeholder="Es. x^2 - 5x + 6 = 0"
            />
          </label>
          <p className="mt-2 text-sm font-medium leading-6 opacity-75">
            Usa la lettera x. Puoi scrivere 2x, x^2, parentesi, frazioni
            numeriche e un solo segno uguale.
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
                  Soluzioni
                </p>
                {result.type === "identity" && (
                  <div className="mt-3 rounded-[14px] bg-slate-100 px-4 py-3 text-2xl font-black text-blue-600 [.dark_&]:bg-slate-800 [.dark_&]:text-blue-300">
                    infinite soluzioni
                  </div>
                )}
                {result.type === "impossible" && (
                  <div className="mt-3 rounded-[14px] bg-slate-100 px-4 py-3 text-2xl font-black text-blue-600 [.dark_&]:bg-slate-800 [.dark_&]:text-blue-300">
                    nessuna soluzione
                  </div>
                )}
                {result.solutions.length > 0 && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {result.solutions.map((solution, index) => (
                      <div
                        key={`${typeof solution === "number" ? solution : solution.toPlain()}-${index}`}
                        className="rounded-[14px] bg-slate-100 px-4 py-3 text-2xl font-black text-blue-600 [.dark_&]:bg-slate-800 [.dark_&]:text-blue-300"
                      >
                        x{result.solutions.length > 1 ? index + 1 : ""} ={" "}
                        <SolutionView value={solution} />
                      </div>
                    ))}
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

              <div className="mt-4 rounded-[16px] bg-white p-3 [.dark_&]:bg-slate-900">
                <h2 className="font-bold">Forma normale</h2>
                <p className="mt-2 text-sm font-semibold leading-6">
                  {result.normalized.toReadable()} = 0
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
