/**
 * Parser + evaluator for angle-expression formulas ("2*angle1 + angle2"),
 * building and reading an `AngleExpression`'s `ast` (engine/types.ts). Kept
 * in the view layer rather than the engine, same split as intersections.ts
 * and hyperbolicFormulas.ts: parsing needs to resolve identifiers against
 * *display* names (view/naming.ts's angle labels), and evaluating needs
 * each referenced angle's live geometry (view/angles.ts's `resolveAngle`,
 * via `angleDegrees`) — both are things the engine has no notion of.
 */

import type { Construction, EntityId, ExpressionNode } from "../engine";
import { angleDegrees } from "./angles";

/** Thrown by `parseAngleExpression` on any syntax error or unknown
 * identifier, with a message meant to be shown to the user as-is. */
export class ExpressionError extends Error {}

type Token =
  | { readonly kind: "num"; readonly value: number }
  | { readonly kind: "ident"; readonly name: string }
  | { readonly kind: "op"; readonly op: "+" | "-" | "*" | "/" | "(" | ")" };

type Op = "+" | "-" | "*" | "/" | "(" | ")";
const OPERATORS: ReadonlySet<string> = new Set(["+", "-", "*", "/", "(", ")"]);

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (OPERATORS.has(c)) {
      tokens.push({ kind: "op", op: c as Op });
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < text.length && /[0-9.]/.test(text[j])) j++;
      const raw = text.slice(i, j);
      const value = Number(raw);
      if (Number.isNaN(value)) {
        throw new ExpressionError(`"${raw}" isn't a number.`);
      }
      tokens.push({ kind: "num", value });
      i = j;
      continue;
    }
    if (/[A-Za-z]/.test(c)) {
      let j = i;
      while (j < text.length && /[A-Za-z0-9]/.test(text[j])) j++;
      tokens.push({ kind: "ident", name: text.slice(i, j) });
      i = j;
      continue;
    }
    throw new ExpressionError(`Unexpected character "${c}".`);
  }
  return tokens;
}

/**
 * Recursive-descent parser over the standard four-operator grammar:
 *
 *   expr   := term (('+' | '-') term)*
 *   term   := factor (('*' | '/') factor)*
 *   factor := '-' factor | '(' expr ')' | number | identifier
 */
class Parser {
  private pos = 0;
  private readonly tokens: readonly Token[];
  private readonly labelToId: ReadonlyMap<string, EntityId>;

  constructor(
    tokens: readonly Token[],
    labelToId: ReadonlyMap<string, EntityId>,
  ) {
    this.tokens = tokens;
    this.labelToId = labelToId;
  }

  parse(): ExpressionNode {
    if (this.tokens.length === 0) {
      throw new ExpressionError("Type a formula, e.g. angle1 + angle2.");
    }
    const node = this.expr();
    if (this.pos < this.tokens.length) {
      throw new ExpressionError("Unexpected extra input.");
    }
    return node;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private expr(): ExpressionNode {
    let node = this.term();
    for (
      let t = this.peek();
      t?.kind === "op" && (t.op === "+" || t.op === "-");
      t = this.peek()
    ) {
      this.pos++;
      const right = this.term();
      node = { kind: t.op === "+" ? "add" : "sub", left: node, right };
    }
    return node;
  }

  private term(): ExpressionNode {
    let node = this.factor();
    for (
      let t = this.peek();
      t?.kind === "op" && (t.op === "*" || t.op === "/");
      t = this.peek()
    ) {
      this.pos++;
      const right = this.factor();
      node = { kind: t.op === "*" ? "mul" : "div", left: node, right };
    }
    return node;
  }

  private factor(): ExpressionNode {
    const t = this.peek();
    if (!t) throw new ExpressionError("Unexpected end of formula.");
    if (t.kind === "op" && t.op === "-") {
      this.pos++;
      return { kind: "neg", arg: this.factor() };
    }
    if (t.kind === "op" && t.op === "(") {
      this.pos++;
      const node = this.expr();
      const close = this.peek();
      if (!close || close.kind !== "op" || close.op !== ")") {
        throw new ExpressionError("Missing closing parenthesis.");
      }
      this.pos++;
      return node;
    }
    if (t.kind === "num") {
      this.pos++;
      return { kind: "const", value: t.value };
    }
    if (t.kind === "ident") {
      this.pos++;
      const id = this.labelToId.get(t.name);
      if (!id) throw new ExpressionError(`Unknown angle "${t.name}".`);
      return { kind: "ref", id };
    }
    throw new ExpressionError("Unexpected token in formula.");
  }
}

/**
 * Parse a formula like "2*angle1 + angle2" into an `ExpressionNode`,
 * resolving each identifier against `labelToId` (view/naming.ts's
 * `angleLabels`, inverted — label to id instead of id to label). Throws
 * `ExpressionError`, with a message meant to be shown as-is, on any syntax
 * error or unknown identifier.
 */
export function parseAngleExpression(
  formula: string,
  labelToId: ReadonlyMap<string, EntityId>,
): ExpressionNode {
  return new Parser(tokenize(formula), labelToId).parse();
}

/**
 * Evaluate a parsed formula to a plain number of *degrees* — matching how
 * angle measurements are shown everywhere else in the app, so a literal
 * like "30" reads as 30 degrees and "angle1 + 30" does what it looks like.
 * Returns null — same "currently undefined" convention as
 * intersection/midpoint points — when a referenced angle doesn't currently
 * resolve, or a division by zero occurs.
 */
export function evaluateExpression(
  construction: Construction,
  node: ExpressionNode,
): number | null {
  if (node.kind === "const") return node.value;
  if (node.kind === "ref") {
    const entity = construction.entities[node.id];
    return entity && entity.kind === "angle"
      ? angleDegrees(construction, entity)
      : null;
  }
  if (node.kind === "neg") {
    const v = evaluateExpression(construction, node.arg);
    return v === null ? null : -v;
  }
  const l = evaluateExpression(construction, node.left);
  const r = evaluateExpression(construction, node.right);
  if (l === null || r === null) return null;
  switch (node.kind) {
    case "add":
      return l + r;
    case "sub":
      return l - r;
    case "mul":
      return l * r;
    case "div":
      return r === 0 ? null : l / r;
  }
}
