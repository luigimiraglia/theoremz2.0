"use client";

import { useMemo, useState } from "react";
import { KaBlock, KaInline } from "@/components/KaTeX";

type Node =
  | { type: "num"; value: number }
  | { type: "var" }
  | { type: "const"; name: "e" | "pi" }
  | { type: "unary"; op: "-"; value: Node }
  | { type: "binary"; op: "+" | "-" | "*" | "/" | "^"; left: Node; right: Node }
  | { type: "func"; name: "sin" | "cos" | "tan" | "ln" | "log" | "exp" | "sqrt" | "lnabs"; arg: Node };

type Token =
  | { type: "number"; value: string }
  | { type: "ident"; value: string }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "^" }
  | { type: "paren"; value: "(" | ")" };

type BinaryOp = Extract<Node, { type: "binary" }>["op"];
type FuncName = Extract<Node, { type: "func" }>["name"];

type IntegralResult =
  | { kind: "success"; source: Node; primitive: Node; steps: string[] }
  | { kind: "error"; message: string };

const ZERO: Node = { type: "num", value: 0 };
const ONE: Node = { type: "num", value: 1 };

function number(value: number): Node {
  return { type: "num", value };
}

function variable(): Node {
  return { type: "var" };
}

function binary(op: BinaryOp, left: Node, right: Node): Node {
  return { type: "binary", op, left, right };
}

function func(name: FuncName, arg: Node): Node {
  return { type: "func", name, arg };
}

function tokenize(input: string): Token[] {
  const normalized = input
    .replace(/π/g, "pi")
    .replace(/−/g, "-")
    .replace(/,/g, ".")
    .replace(/\s+/g, "");
  const tokens: Token[] = [];
  let index = 0;

  while (index < normalized.length) {
    const char = normalized[index];

    if (/[0-9.]/.test(char)) {
      let value = char;
      index += 1;
      while (index < normalized.length && /[0-9.]/.test(normalized[index])) {
        value += normalized[index];
        index += 1;
      }
      if (!Number.isFinite(Number(value))) {
        throw new Error(`Numero non valido: ${value}`);
      }
      tokens.push({ type: "number", value });
      continue;
    }

    if (/[a-zA-Z]/.test(char)) {
      let value = char;
      index += 1;
      while (index < normalized.length && /[a-zA-Z]/.test(normalized[index])) {
        value += normalized[index];
        index += 1;
      }
      tokens.push({ type: "ident", value: value.toLowerCase() });
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      index += 1;
      continue;
    }

    if (char === "+" || char === "-" || char === "*" || char === "/" || char === "^") {
      tokens.push({ type: "op", value: char });
      index += 1;
      continue;
    }

    throw new Error(`Carattere non riconosciuto: ${char}`);
  }

  return tokens;
}

class Parser {
  private position = 0;

  constructor(private tokens: Token[]) {}

  parse() {
    const expression = this.parseExpression();
    if (this.peek()) {
      throw new Error("Controlla la sintassi: c'è qualcosa dopo la fine dell'espressione.");
    }
    return expression;
  }

  private peek() {
    return this.tokens[this.position];
  }

  private consume() {
    const token = this.tokens[this.position];
    this.position += 1;
    return token;
  }

  private matchOp(value: BinaryOp) {
    const token = this.peek();
    if (token?.type === "op" && token.value === value) {
      this.consume();
      return true;
    }
    return false;
  }

  private matchParen(value: "(" | ")") {
    const token = this.peek();
    if (token?.type === "paren" && token.value === value) {
      this.consume();
      return true;
    }
    return false;
  }

  private startsPrimary() {
    const token = this.peek();
    return token?.type === "number" || token?.type === "ident" || token?.value === "(";
  }

  private parseExpression(): Node {
    let node = this.parseTerm();
    while (true) {
      if (this.matchOp("+")) {
        node = binary("+", node, this.parseTerm());
      } else if (this.matchOp("-")) {
        node = binary("-", node, this.parseTerm());
      } else {
        return node;
      }
    }
  }

  private parseTerm(): Node {
    let node = this.parsePower();
    while (true) {
      if (this.matchOp("*")) {
        node = binary("*", node, this.parsePower());
      } else if (this.matchOp("/")) {
        node = binary("/", node, this.parsePower());
      } else if (this.startsPrimary()) {
        node = binary("*", node, this.parsePower());
      } else {
        return node;
      }
    }
  }

  private parsePower(): Node {
    let node = this.parseUnary();
    if (this.matchOp("^")) {
      node = binary("^", node, this.parsePower());
    }
    return node;
  }

  private parseUnary(): Node {
    if (this.matchOp("+")) return this.parseUnary();
    if (this.matchOp("-")) return { type: "unary", op: "-", value: this.parseUnary() };
    return this.parsePrimary();
  }

  private parsePrimary(): Node {
    const token = this.consume();
    if (!token) throw new Error("Espressione incompleta.");

    if (token.type === "number") return number(Number(token.value));

    if (token.type === "ident") {
      if (token.value === "x") return variable();
      if (token.value === "e") return { type: "const", name: "e" };
      if (token.value === "pi") return { type: "const", name: "pi" };

      const names = ["sin", "cos", "tan", "ln", "log", "exp", "sqrt"] as const;
      if (!names.includes(token.value as (typeof names)[number])) {
        throw new Error(`Funzione non supportata: ${token.value}`);
      }
      if (!this.matchParen("(")) {
        throw new Error(`Scrivi ${token.value}(...) con le parentesi.`);
      }
      const arg = this.parseExpression();
      if (!this.matchParen(")")) {
        throw new Error(`Manca una parentesi chiusa dopo ${token.value}(...).`);
      }
      return func(token.value as (typeof names)[number], arg);
    }

    if (token.type === "paren" && token.value === "(") {
      const node = this.parseExpression();
      if (!this.matchParen(")")) throw new Error("Manca una parentesi chiusa.");
      return node;
    }

    throw new Error("Sintassi non valida.");
  }
}

function isNum(node: Node): node is Extract<Node, { type: "num" }> {
  return node.type === "num";
}

function isNumValue(node: Node, value: number) {
  return node.type === "num" && node.value === value;
}

function isConstant(node: Node): node is Extract<Node, { type: "num" | "const" }> {
  return node.type === "num" || node.type === "const";
}

function simplify(node: Node): Node {
  if (node.type === "unary") {
    const value = simplify(node.value);
    if (isNum(value)) return number(-value.value);
    if (value.type === "unary") return simplify(value.value);
    return { type: "unary", op: "-", value };
  }

  if (node.type === "func") return { ...node, arg: simplify(node.arg) };
  if (node.type !== "binary") return node;

  const left = simplify(node.left);
  const right = simplify(node.right);

  if (node.op === "+") {
    if (isNumValue(left, 0)) return right;
    if (isNumValue(right, 0)) return left;
    if (isNum(left) && isNum(right)) return number(left.value + right.value);
  }

  if (node.op === "-") {
    if (isNumValue(right, 0)) return left;
    if (isNumValue(left, 0)) return simplify({ type: "unary", op: "-", value: right });
    if (isNum(left) && isNum(right)) return number(left.value - right.value);
  }

  if (node.op === "*") {
    if (isNumValue(left, 0) || isNumValue(right, 0)) return ZERO;
    if (isNumValue(left, 1)) return right;
    if (isNumValue(right, 1)) return left;
    if (isNumValue(left, -1)) return simplify({ type: "unary", op: "-", value: right });
    if (isNumValue(right, -1)) return simplify({ type: "unary", op: "-", value: left });
    if (isNum(left) && isNum(right)) return number(left.value * right.value);
  }

  if (node.op === "/") {
    if (isNumValue(left, 0)) return ZERO;
    if (isNumValue(right, 1)) return left;
    if (isNum(left) && isNum(right) && right.value !== 0) return number(left.value / right.value);
  }

  if (node.op === "^") {
    if (isNumValue(right, 0)) return ONE;
    if (isNumValue(right, 1)) return left;
    if (isNumValue(left, 0)) return ZERO;
    if (isNumValue(left, 1)) return ONE;
    if (isNum(left) && isNum(right)) return number(left.value ** right.value);
  }

  return { type: "binary", op: node.op, left, right };
}

function linearCoefficient(node: Node): number | null {
  const clean = simplify(node);
  if (clean.type === "var") return 1;
  if (clean.type === "binary" && clean.op === "*" && isNum(clean.left) && clean.right.type === "var") {
    return clean.left.value;
  }
  if (clean.type === "binary" && clean.op === "*" && isNum(clean.right) && clean.left.type === "var") {
    return clean.right.value;
  }
  if (clean.type === "binary" && (clean.op === "+" || clean.op === "-")) {
    const left = linearCoefficient(clean.left);
    if (left !== null && isConstant(clean.right)) return left;
    const right = linearCoefficient(clean.right);
    if (right !== null && isConstant(clean.left)) return clean.op === "+" ? right : -right;
  }
  return null;
}

function primitivePower(base: Node, exponent: number, steps: Set<string>): Node {
  const coefficient = linearCoefficient(base);
  if (coefficient === null) {
    throw new Error("Per potenze composte supporto solo basi lineari, per esempio (2x+1)^3.");
  }

  if (exponent === -1) {
    steps.add("Per una potenza con esponente -1 uso il logaritmo naturale.");
    return simplify(binary("/", func("lnabs", base), number(coefficient)));
  }

  steps.add("Per una potenza uso la regola ∫uⁿ dx = uⁿ⁺¹ / ((n+1)u'), con n diverso da -1.");
  return simplify(
    binary(
      "/",
      binary("^", base, number(exponent + 1)),
      number((exponent + 1) * coefficient)
    )
  );
}

function integrate(node: Node, steps: Set<string>): Node {
  const clean = simplify(node);

  if (clean.type === "num") {
    steps.add("La primitiva di una costante k è kx.");
    return simplify(binary("*", clean, variable()));
  }

  if (clean.type === "const") {
    steps.add("Le costanti simboliche si trattano come costanti numeriche.");
    return simplify(binary("*", clean, variable()));
  }

  if (clean.type === "var") {
    steps.add("La primitiva di x è x²/2.");
    return binary("/", binary("^", variable(), number(2)), number(2));
  }

  if (clean.type === "unary") {
    return simplify({ type: "unary", op: "-", value: integrate(clean.value, steps) });
  }

  if (clean.type === "binary" && clean.op === "+") {
    steps.add("Integro una somma termine per termine.");
    return simplify(binary("+", integrate(clean.left, steps), integrate(clean.right, steps)));
  }

  if (clean.type === "binary" && clean.op === "-") {
    steps.add("Integro una differenza termine per termine.");
    return simplify(binary("-", integrate(clean.left, steps), integrate(clean.right, steps)));
  }

  if (clean.type === "binary" && clean.op === "*") {
    if (isConstant(clean.left)) {
      steps.add("Porto fuori dall'integrale il fattore costante.");
      return simplify(binary("*", clean.left, integrate(clean.right, steps)));
    }
    if (isConstant(clean.right)) {
      steps.add("Porto fuori dall'integrale il fattore costante.");
      return simplify(binary("*", clean.right, integrate(clean.left, steps)));
    }
    throw new Error("I prodotti non elementari non sono ancora supportati. Prova a sviluppare l'espressione.");
  }

  if (clean.type === "binary" && clean.op === "/") {
    if (isConstant(clean.right)) {
      steps.add("Trasformo il quoziente per una costante in un fattore costante.");
      return simplify(binary("/", integrate(clean.left, steps), clean.right));
    }
    if (isConstant(clean.left)) {
      const coefficient = linearCoefficient(clean.right);
      if (coefficient !== null) {
        steps.add("Per k/(ax+b) uso (k/a)ln|ax+b|.");
        return simplify(binary("*", binary("/", clean.left, number(coefficient)), func("lnabs", clean.right)));
      }
    }
    throw new Error("I quozienti supportati sono del tipo k/(ax+b) o f(x)/k.");
  }

  if (clean.type === "binary" && clean.op === "^") {
    if (clean.right.type !== "num") {
      throw new Error("Per le potenze supporto esponenti numerici.");
    }
    return primitivePower(clean.left, clean.right.value, steps);
  }

  if (clean.type === "func") {
    if (clean.name === "sqrt") {
      steps.add("Riscrivo la radice come potenza con esponente 1/2.");
      const coefficient = linearCoefficient(clean.arg);
      if (coefficient === null) {
        throw new Error("Per radici composte supporto solo argomenti lineari, per esempio sqrt(2x+1).");
      }
      steps.add("Uso ∫sqrt(u) dx = 2u^(3/2)/(3u') quando u è lineare.");
      return simplify(
        binary(
          "/",
          binary("*", number(2), binary("^", clean.arg, binary("/", number(3), number(2)))),
          number(3 * coefficient)
        )
      );
    }

    const coefficient = linearCoefficient(clean.arg);
    if (coefficient === null) {
      throw new Error("Per funzioni composte supporto argomenti lineari, per esempio sin(2x+1).");
    }

    if (clean.name === "sin") {
      steps.add("La primitiva di sin(u) è -cos(u)/u' quando u è lineare.");
      return simplify(binary("/", { type: "unary", op: "-", value: func("cos", clean.arg) }, number(coefficient)));
    }
    if (clean.name === "cos") {
      steps.add("La primitiva di cos(u) è sin(u)/u' quando u è lineare.");
      return simplify(binary("/", func("sin", clean.arg), number(coefficient)));
    }
    if (clean.name === "exp") {
      steps.add("La primitiva di exp(u) è exp(u)/u' quando u è lineare.");
      return simplify(binary("/", func("exp", clean.arg), number(coefficient)));
    }
    if ((clean.name === "ln" || clean.name === "log") && clean.arg.type === "var") {
      steps.add("Per ∫ln(x) dx uso la formula xln|x| - x.");
      return simplify(binary("-", binary("*", variable(), func("lnabs", variable())), variable()));
    }

    throw new Error("Questa funzione non ha ancora una primitiva supportata dal calcolatore.");
  }

  throw new Error("Non riesco a calcolare questa primitiva con le regole supportate.");
}

function precedence(node: Node) {
  if (node.type === "binary") {
    if (node.op === "+" || node.op === "-") return 1;
    if (node.op === "*" || node.op === "/") return 2;
    if (node.op === "^") return 3;
  }
  if (node.type === "unary") return 4;
  return 5;
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) return String(value);
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 8 }).format(value);
}

function toLatex(node: Node, parentPrecedence = 0): string {
  if (node.type === "num") return formatNumber(node.value).replace(",", "{,}");
  if (node.type === "var") return "x";
  if (node.type === "const") return node.name === "pi" ? "\\pi" : "e";
  if (node.type === "unary") {
    const value = `-${toLatex(node.value, precedence(node))}`;
    return precedence(node) < parentPrecedence ? `\\left(${value}\\right)` : value;
  }
  if (node.type === "func") {
    if (node.name === "sqrt") return `\\sqrt{${toLatex(node.arg)}}`;
    if (node.name === "lnabs") return `\\ln\\left|${toLatex(node.arg)}\\right|`;
    const names: Record<Exclude<FuncName, "sqrt" | "lnabs">, string> = {
      sin: "\\sin",
      cos: "\\cos",
      tan: "\\tan",
      ln: "\\ln",
      log: "\\log",
      exp: "\\exp",
    };
    return `${names[node.name]}\\left(${toLatex(node.arg)}\\right)`;
  }

  if (node.op === "/") return `\\frac{${toLatex(node.left)}}{${toLatex(node.right)}}`;

  const current = precedence(node);
  if (node.op === "^") {
    const value = `${toLatex(node.left, current)}^{${toLatex(node.right)}}`;
    return current < parentPrecedence ? `\\left(${value}\\right)` : value;
  }

  const operator = node.op === "*" ? "\\cdot" : node.op;
  const value = `${toLatex(node.left, current)} ${operator} ${toLatex(node.right, current + (node.op === "-" ? 1 : 0))}`;
  return current < parentPrecedence ? `\\left(${value}\\right)` : value;
}

function solve(input: string): IntegralResult {
  try {
    const source = new Parser(tokenize(input)).parse();
    const steps = new Set<string>();
    const primitive = simplify(integrate(source, steps));
    return {
      kind: "success",
      source,
      primitive,
      steps: Array.from(steps),
    };
  } catch (error) {
    return {
      kind: "error",
      message:
        error instanceof Error
          ? error.message
          : "Controlla la funzione inserita.",
    };
  }
}

const examples = ["3x^2 - 4x + 1", "sin(2x)", "1/x", "sqrt(x) + exp(x)"];

export default function IntegraliOnlineClient() {
  const [input, setInput] = useState("3x^2 - 4x + 1");
  const result = useMemo(() => solve(input), [input]);

  return (
    <section className="rounded-[24px] border-2 border-slate-900/70 bg-white p-4 shadow-[0_4px_0_#0f172a] [.dark_&]:bg-slate-900 sm:p-5">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="min-w-0">
          <label className="block">
            <span className="mb-2 block text-sm font-bold">
              Funzione da integrare
            </span>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="w-full rounded-[14px] border-2 border-slate-900/60 bg-white px-3 py-3 text-lg font-bold outline-none transition focus:border-blue-500 [.dark_&]:border-slate-400 [.dark_&]:bg-slate-900"
              spellCheck={false}
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setInput(example)}
                className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-200 [.dark_&]:bg-blue-950 [.dark_&]:text-blue-200"
              >
                {example}
              </button>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto rounded-[16px] bg-slate-100 py-4 pl-4 pr-8 text-center text-lg font-black [.dark_&]:bg-slate-800">
            {result.kind === "success" ? (
              <KaBlock>{`\\int ${toLatex(result.source)}\\,dx`}</KaBlock>
            ) : (
              <span>Scrivi una funzione in x</span>
            )}
          </div>

          <p className="mt-3 text-xs font-bold leading-6 opacity-65">
            Supporta primitive scolastiche: polinomi, somme, costanti,
            potenze di x,{" "}
            <KaInline>{"\\frac{1}{x}"}</KaInline>, radici, seno, coseno ed
            esponenziali con argomento lineare.
          </p>
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
                  Primitiva
                </p>
                <div className="mt-3 overflow-x-auto rounded-[14px] bg-slate-100 px-4 py-3 text-blue-600 [.dark_&]:bg-slate-800 [.dark_&]:text-blue-300">
                  <KaBlock>{`\\int ${toLatex(result.source)}\\,dx = ${toLatex(result.primitive)} + C`}</KaBlock>
                </div>
              </div>

              <div className="mt-4 rounded-[16px] bg-white p-3 [.dark_&]:bg-slate-900">
                <h2 className="font-bold">Passaggi</h2>
                <ol className="mt-3 space-y-2 text-sm font-semibold leading-6">
                  <li>Riconosco la funzione e scelgo la regola di integrazione.</li>
                  {result.steps.map((step, index) => (
                    <li key={`${step}-${index}`}>{step}</li>
                  ))}
                  <li>Aggiungo la costante di integrazione C.</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
