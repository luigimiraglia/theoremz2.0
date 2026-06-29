"use client";

import { useMemo, useState } from "react";
import { KaBlock, KaInline } from "@/components/KaTeX";

type Node =
  | { type: "num"; value: number }
  | { type: "var" }
  | { type: "const"; name: "e" | "pi" }
  | { type: "unary"; op: "-"; value: Node }
  | { type: "binary"; op: "+" | "-" | "*" | "/" | "^"; left: Node; right: Node }
  | { type: "func"; name: "sin" | "cos" | "tan" | "ln" | "log" | "exp" | "sqrt"; arg: Node };

type Token =
  | { type: "number"; value: string }
  | { type: "ident"; value: string }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "^" }
  | { type: "paren"; value: "(" | ")" };

type DerivativeResult =
  | {
      kind: "success";
      source: Node;
      derivative: Node;
      simplified: Node;
      steps: string[];
    }
  | { kind: "error"; message: string };

type BinaryOp = Extract<Node, { type: "binary" }>["op"];

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

function func(name: Extract<Node, { type: "func" }>["name"], arg: Node): Node {
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

    if (token.type === "number") {
      return number(Number(token.value));
    }

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

  if (node.type === "func") {
    return { ...node, arg: simplify(node.arg) };
  }

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

function derivative(node: Node, steps: Set<string>): Node {
  if (node.type === "num" || node.type === "const") {
    steps.add("La derivata di una costante è 0.");
    return ZERO;
  }

  if (node.type === "var") {
    steps.add("La derivata di x è 1.");
    return ONE;
  }

  if (node.type === "unary") {
    return simplify({ type: "unary", op: "-", value: derivative(node.value, steps) });
  }

  if (node.type === "func") {
    const inner = node.arg;
    const innerDerivative = derivative(inner, steps);
    steps.add("Quando c'è una funzione composta, applico la regola della catena.");

    if (node.name === "sin") {
      steps.add("La derivata di sin(u) è cos(u) · u'.");
      return simplify(binary("*", func("cos", inner), innerDerivative));
    }
    if (node.name === "cos") {
      steps.add("La derivata di cos(u) è -sin(u) · u'.");
      return simplify(binary("*", { type: "unary", op: "-", value: func("sin", inner) }, innerDerivative));
    }
    if (node.name === "tan") {
      steps.add("La derivata di tan(u) è u' / cos²(u).");
      return simplify(binary("/", innerDerivative, binary("^", func("cos", inner), number(2))));
    }
    if (node.name === "ln" || node.name === "log") {
      steps.add("La derivata di ln(u) è u' / u.");
      return simplify(binary("/", innerDerivative, inner));
    }
    if (node.name === "exp") {
      steps.add("La derivata di exp(u) è exp(u) · u'.");
      return simplify(binary("*", func("exp", inner), innerDerivative));
    }
    steps.add("La derivata di sqrt(u) è u' / (2sqrt(u)).");
    return simplify(binary("/", innerDerivative, binary("*", number(2), func("sqrt", inner))));
  }

  if (node.op === "+") {
    steps.add("Derivo una somma termine per termine.");
    return simplify(binary("+", derivative(node.left, steps), derivative(node.right, steps)));
  }

  if (node.op === "-") {
    steps.add("Derivo una differenza termine per termine.");
    return simplify(binary("-", derivative(node.left, steps), derivative(node.right, steps)));
  }

  if (node.op === "*") {
    steps.add("Per un prodotto uso la regola (fg)' = f'g + fg'.");
    return simplify(
      binary(
        "+",
        binary("*", derivative(node.left, steps), node.right),
        binary("*", node.left, derivative(node.right, steps))
      )
    );
  }

  if (node.op === "/") {
    steps.add("Per un quoziente uso la regola (f/g)' = (f'g - fg') / g².");
    return simplify(
      binary(
        "/",
        binary(
          "-",
          binary("*", derivative(node.left, steps), node.right),
          binary("*", node.left, derivative(node.right, steps))
        ),
        binary("^", node.right, number(2))
      )
    );
  }

  if (node.op === "^") {
    if (isConstant(node.right) && node.right.type === "num") {
      steps.add("Per una potenza uso (uⁿ)' = n · uⁿ⁻¹ · u'.");
      return simplify(
        binary(
          "*",
          binary("*", number(node.right.value), binary("^", node.left, number(node.right.value - 1))),
          derivative(node.left, steps)
        )
      );
    }

    if (isConstant(node.left)) {
      steps.add("Per una esponenziale aᵘ uso (aᵘ)' = aᵘ · ln(a) · u'.");
      return simplify(
        binary(
          "*",
          binary("*", node, func("ln", node.left)),
          derivative(node.right, steps)
        )
      );
    }

    steps.add("Per una potenza generale uso la derivazione logaritmica.");
    return simplify(
      binary(
        "*",
        node,
        binary(
          "+",
          binary("*", derivative(node.right, steps), func("ln", node.left)),
          binary("*", node.right, binary("/", derivative(node.left, steps), node.left))
        )
      )
    );
  }

  return ZERO;
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
    const names: Record<Extract<Node, { type: "func" }>["name"], string> = {
      sin: "\\sin",
      cos: "\\cos",
      tan: "\\tan",
      ln: "\\ln",
      log: "\\log",
      exp: "\\exp",
      sqrt: "\\sqrt",
    };
    if (node.name === "sqrt") return `\\sqrt{${toLatex(node.arg)}}`;
    return `${names[node.name]}\\left(${toLatex(node.arg)}\\right)`;
  }

  if (node.op === "/") {
    return `\\frac{${toLatex(node.left)}}{${toLatex(node.right)}}`;
  }

  const current = precedence(node);
  if (node.op === "^") {
    const value = `${toLatex(node.left, current)}^{${toLatex(node.right)}}`;
    return current < parentPrecedence ? `\\left(${value}\\right)` : value;
  }

  const operator = node.op === "*" ? "\\cdot" : node.op;
  const value = `${toLatex(node.left, current)} ${operator} ${toLatex(node.right, current + (node.op === "-" ? 1 : 0))}`;
  return current < parentPrecedence ? `\\left(${value}\\right)` : value;
}

function solve(input: string): DerivativeResult {
  try {
    const parsed = new Parser(tokenize(input)).parse();
    const steps = new Set<string>();
    const rawDerivative = derivative(parsed, steps);
    const simplified = simplify(rawDerivative);
    return {
      kind: "success",
      source: parsed,
      derivative: rawDerivative,
      simplified,
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

const examples = ["x^3 + 2x^2 - 5x + 1", "sin(x^2)", "ln(x)/x", "sqrt(x) + exp(x)"];

export default function DerivateOnlineClient() {
  const [input, setInput] = useState("x^3 + 2x^2 - 5x + 1");
  const result = useMemo(() => solve(input), [input]);

  return (
    <section className="rounded-[24px] border-2 border-slate-900/70 bg-white p-4 shadow-[0_4px_0_#0f172a] [.dark_&]:bg-slate-900 sm:p-5">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="min-w-0">
          <label className="block">
            <span className="mb-2 block text-sm font-bold">
              Funzione f(x)
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
              <KaBlock>{`f(x) = ${toLatex(result.source)}`}</KaBlock>
            ) : (
              <span>Scrivi una funzione in x</span>
            )}
          </div>

          <p className="mt-3 text-xs font-bold leading-6 opacity-65">
            Supporta polinomi, prodotti, quozienti, potenze numeriche,
            parentesi e funzioni come{" "}
            <KaInline>{"\\sin(x), \\cos(x), \\tan(x), \\ln(x), \\sqrt{x}, \\exp(x)"}</KaInline>.
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
                  Derivata
                </p>
                <div className="mt-3 overflow-x-auto rounded-[14px] bg-slate-100 px-4 py-3 text-blue-600 [.dark_&]:bg-slate-800 [.dark_&]:text-blue-300">
                  <KaBlock>{`f'(x) = ${toLatex(result.simplified)}`}</KaBlock>
                </div>
              </div>

              <div className="mt-4 rounded-[16px] bg-white p-3 [.dark_&]:bg-slate-900">
                <h2 className="font-bold">Passaggi</h2>
                <ol className="mt-3 space-y-2 text-sm font-semibold leading-6">
                  <li>Riscrivo la funzione in forma leggibile.</li>
                  {result.steps.map((step, index) => (
                    <li key={`${step}-${index}`}>{step}</li>
                  ))}
                  <li>Semplifico i termini nulli e i fattori uguali a 1.</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
