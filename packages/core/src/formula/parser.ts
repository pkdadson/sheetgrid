import type { AstNode, BinaryOp } from "./ast.js";
import { formulaError } from "./errors.js";
import { type Token, tokenize } from "./lexer.js";
import { defaultFormulaLimits, mergeFormulaLimits } from "./limits.js";
import { parseA1, parseA1Range } from "./refs.js";
import type { FormulaError, FormulaLimits } from "./types.js";

export type ParseResult =
  | { ok: true; ast: AstNode }
  | { ok: false; error: FormulaError };

class Parser {
  private pos = 0;
  private depth = 0;

  constructor(
    private tokens: Token[],
    private limits: FormulaLimits,
  ) {}

  parse(): ParseResult {
    try {
      const ast = this.parseComparison();
      if (this.peek().kind !== "eof") {
        return {
          ok: false,
          error: formulaError("PARSE", "Unexpected tokens after expression"),
        };
      }
      return { ok: true, ast };
    } catch (e) {
      if (e && typeof e === "object" && "type" in e) {
        return { ok: false, error: e as FormulaError };
      }
      return {
        ok: false,
        error: formulaError(
          "PARSE",
          e instanceof Error ? e.message : "Parse error",
        ),
      };
    }
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? { kind: "eof" };
  }

  private advance(): Token {
    const t = this.peek();
    if (t.kind !== "eof") this.pos++;
    return t;
  }

  private enter(): void {
    this.depth++;
    if (this.depth > this.limits.maxAstDepth) {
      throw formulaError("LIMIT", "AST depth exceeded");
    }
  }

  private leave(): void {
    this.depth--;
  }

  private parseComparison(): AstNode {
    this.enter();
    let left = this.parseConcat();
    while (true) {
      const k = this.peek().kind;
      let op: BinaryOp | null = null;
      if (k === "eq") op = "=";
      else if (k === "ne") op = "<>";
      else if (k === "gt") op = ">";
      else if (k === "ge") op = ">=";
      else if (k === "lt") op = "<";
      else if (k === "le") op = "<=";
      if (!op) break;
      this.advance();
      const right = this.parseConcat();
      left = { type: "binary", op, left, right };
    }
    this.leave();
    return left;
  }

  private parseConcat(): AstNode {
    this.enter();
    let left = this.parseAdd();
    while (this.peek().kind === "amp") {
      this.advance();
      const right = this.parseAdd();
      left = { type: "binary", op: "&", left, right };
    }
    this.leave();
    return left;
  }

  private parseAdd(): AstNode {
    this.enter();
    let left = this.parseMul();
    while (this.peek().kind === "plus" || this.peek().kind === "minus") {
      const op = this.advance().kind === "plus" ? "+" : "-";
      const right = this.parseMul();
      left = { type: "binary", op, left, right };
    }
    this.leave();
    return left;
  }

  private parseMul(): AstNode {
    this.enter();
    let left = this.parsePow();
    while (this.peek().kind === "star" || this.peek().kind === "slash") {
      const op = this.advance().kind === "star" ? "*" : "/";
      const right = this.parsePow();
      left = { type: "binary", op, left, right };
    }
    this.leave();
    return left;
  }

  private parsePow(): AstNode {
    this.enter();
    let left = this.parseUnary();
    if (this.peek().kind === "caret") {
      this.advance();
      const right = this.parsePow(); // right-assoc
      left = { type: "binary", op: "^", left, right };
    }
    this.leave();
    return left;
  }

  private parseUnary(): AstNode {
    this.enter();
    if (this.peek().kind === "plus" || this.peek().kind === "minus") {
      const op = this.advance().kind === "plus" ? "+" : "-";
      const arg = this.parseUnary();
      this.leave();
      return { type: "unary", op, arg };
    }
    const node = this.parsePostfix();
    this.leave();
    return node;
  }

  private parsePostfix(): AstNode {
    this.enter();
    let node = this.parsePrimary();
    while (this.peek().kind === "percent") {
      this.advance();
      node = { type: "percent", arg: node };
    }
    this.leave();
    return node;
  }

  private parsePrimary(): AstNode {
    this.enter();
    const t = this.peek();

    if (t.kind === "number") {
      this.advance();
      this.leave();
      return { type: "number", value: t.value };
    }
    if (t.kind === "string") {
      this.advance();
      this.leave();
      return { type: "string", value: t.value };
    }
    if (t.kind === "ref") {
      this.advance();
      const range = parseA1Range(t.value);
      if (!range) {
        throw formulaError("PARSE", `Invalid reference: ${t.value}`);
      }
      if (range.r1 === range.r2 && range.c1 === range.c2) {
        const cell = parseA1(
          t.value.includes(":") ? t.value.split(":")[0]! : t.value,
        );
        this.leave();
        if (!cell) throw formulaError("PARSE", `Invalid cell: ${t.value}`);
        // single cell from range path when A1:A1
        if (t.value.includes(":")) {
          return {
            type: "range",
            r1: range.r1,
            c1: range.c1,
            r2: range.r2,
            c2: range.c2,
          };
        }
        return {
          type: "cell",
          row: cell.row,
          col: cell.col,
          rowAbs: cell.rowAbs,
          colAbs: cell.colAbs,
        };
      }
      this.leave();
      return {
        type: "range",
        r1: range.r1,
        c1: range.c1,
        r2: range.r2,
        c2: range.c2,
      };
    }
    if (t.kind === "ident") {
      this.advance();
      const name = t.value.toUpperCase();
      if (name === "TRUE" && this.peek().kind !== "lparen") {
        this.leave();
        return { type: "bool", value: true };
      }
      if (name === "FALSE" && this.peek().kind !== "lparen") {
        this.leave();
        return { type: "bool", value: false };
      }
      if (this.peek().kind === "lparen") {
        this.advance();
        const args: AstNode[] = [];
        if (this.peek().kind !== "rparen") {
          args.push(this.parseComparison());
          while (this.peek().kind === "comma") {
            this.advance();
            args.push(this.parseComparison());
          }
        }
        if (this.peek().kind !== "rparen") {
          throw formulaError("PARSE", "Expected closing parenthesis");
        }
        this.advance();
        this.leave();
        return { type: "call", name, args };
      }
      // bare ident that's not TRUE/FALSE — treat as NAME later; parse as call with 0 args? Excel treats as named range. We error at eval via unknown — use call 0-arg for named constants only.
      this.leave();
      return { type: "call", name, args: [] };
    }
    if (t.kind === "lparen") {
      this.advance();
      const inner = this.parseComparison();
      if (this.peek().kind !== "rparen") {
        throw formulaError("PARSE", "Expected closing parenthesis");
      }
      this.advance();
      this.leave();
      return inner;
    }

    this.leave();
    throw formulaError("PARSE", "Expected expression");
  }
}

export function parseFormula(
  source: string,
  limitsPartial?: Partial<FormulaLimits>,
): ParseResult {
  const limits = mergeFormulaLimits(limitsPartial);
  const trimmed = source.trim();
  if (!trimmed || trimmed === "=") {
    return { ok: false, error: formulaError("PARSE", "Empty formula") };
  }
  if (!trimmed.startsWith("=")) {
    return {
      ok: false,
      error: formulaError("PARSE", "Formula must start with ="),
    };
  }
  if (trimmed.includes("!")) {
    return {
      ok: false,
      error: formulaError("PARSE", "Sheet references are not supported"),
    };
  }
  const lexed = tokenize(trimmed, limits);
  if (!lexed.ok) return lexed;
  // only EOF
  if (lexed.tokens.length === 1) {
    return { ok: false, error: formulaError("PARSE", "Empty formula") };
  }
  return new Parser(lexed.tokens, limits).parse();
}

export { defaultFormulaLimits };
