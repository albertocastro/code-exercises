import { evaluate as _evaluate } from "./solution";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const evaluate = _evaluate as any;

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

// ── Level 1: Arithmetic and Precedence ────────────────────────────────────────

level(1, "Arithmetic and precedence", () => {
  test("adds two numbers", () => {
    expect(evaluate("2 + 3")).toBe(5);
  });

  test("subtracts two numbers", () => {
    expect(evaluate("10 - 4")).toBe(6);
  });

  test("multiplies two numbers", () => {
    expect(evaluate("3 * 4")).toBe(12);
  });

  test("divides two numbers", () => {
    expect(evaluate("12 / 4")).toBe(3);
  });

  test("multiplication has higher precedence than addition", () => {
    expect(evaluate("2 + 3 * 4")).toBe(14);
  });

  test("division has higher precedence than subtraction", () => {
    expect(evaluate("20 - 4 / 2")).toBe(18);
  });

  test("evaluates a chain of mixed operators", () => {
    expect(evaluate("2 * 3 + 4 * 5")).toBe(26);
  });

  test("subtraction is left-to-right associative", () => {
    expect(evaluate("10 - 2 - 3")).toBe(5);
  });

  test("division is left-to-right associative", () => {
    expect(evaluate("100 / 10 / 2")).toBe(5);
  });

  test("ignores whitespace", () => {
    expect(evaluate("  6  /   3 ")).toBe(2);
  });

  test("evaluates a single number", () => {
    expect(evaluate("42")).toBe(42);
  });

  test("throws on division by zero", () => {
    expect(() => evaluate("5 / 0")).toThrow();
  });

  test("throws on malformed expression", () => {
    expect(() => evaluate("2 +")).toThrow();
  });
});

// ── Level 2: Parentheses, Unary Operators, Decimals ───────────────────────────

level(2, "Parentheses, unary operators, decimals", () => {
  test("parentheses override precedence", () => {
    expect(evaluate("(2 + 3) * 4")).toBe(20);
  });

  test("nested parentheses", () => {
    expect(evaluate("((1 + 2) * (3 + 4))")).toBe(21);
  });

  test("unary minus on a parenthesized group", () => {
    expect(evaluate("-(3 + 4)")).toBe(-7);
  });

  test("unary minus before a term", () => {
    expect(evaluate("-5 + 2")).toBe(-3);
  });

  test("unary plus is a no-op", () => {
    expect(evaluate("+3 + 2")).toBe(5);
  });

  test("unary minus interacts with multiplication", () => {
    expect(evaluate("2 * -(1 + 1)")).toBe(-4);
  });

  test("decimal literals", () => {
    expect(evaluate("1.5 + 2.25")).toBe(3.75);
  });

  test("decimal literal less than 1", () => {
    expect(evaluate("0.5 * 4")).toBe(2);
  });

  test("double negation", () => {
    expect(evaluate("--5")).toBe(5);
  });

  test("unary minus distributes via multiplication", () => {
    expect(evaluate("-(2 - 5) * 2")).toBe(6);
  });

  test("throws on unmatched parenthesis", () => {
    expect(() => evaluate("(2 + 3")).toThrow();
  });
});

// ── Level 3: Variables ────────────────────────────────────────────────────────

level(3, "Variables", () => {
  test("looks up a single variable", () => {
    expect(evaluate("x + 1", { x: 4 })).toBe(5);
  });

  test("looks up multiple variables", () => {
    expect(evaluate("a * b - c", { a: 2, b: 3, c: 1 })).toBe(5);
  });

  test("applies unary minus to a variable", () => {
    expect(evaluate("-x", { x: 10 })).toBe(-10);
  });

  test("variable inside parentheses", () => {
    expect(evaluate("(x + 1) * 2", { x: 4 })).toBe(10);
  });

  test("throws on undefined variable", () => {
    expect(() => evaluate("x + y", { x: 1 })).toThrow();
  });

  test("throws on undefined variable with no context", () => {
    expect(() => evaluate("x + 1")).toThrow();
  });

  test("level 1 expressions still work without context", () => {
    expect(evaluate("2 + 3 * 4")).toBe(14);
  });

  test("level 2 expressions still work without context", () => {
    expect(evaluate("-(3 + 4)")).toBe(-7);
  });

  test("supports underscores and digits in identifiers", () => {
    expect(evaluate("total_2 + 1", { total_2: 9 })).toBe(10);
  });

  test("identifiers are case-sensitive", () => {
    expect(() => evaluate("X + 1", { x: 1 })).toThrow();
  });
});

// ── Level 4: Functions and Multi-Statement Programs ───────────────────────────

level(4, "Functions and multi-statement programs", () => {
  test("max returns the larger argument", () => {
    expect(evaluate("max(3, 7)")).toBe(7);
  });

  test("min returns the smaller argument", () => {
    expect(evaluate("min(3, 7)")).toBe(3);
  });

  test("sqrt computes a square root", () => {
    expect(evaluate("sqrt(16) + 1")).toBe(5);
  });

  test("pow computes exponentiation", () => {
    expect(evaluate("pow(2, 3)")).toBe(8);
  });

  test("abs computes absolute value", () => {
    expect(evaluate("abs(-5)")).toBe(5);
  });

  test("functions can be nested and combined with operators", () => {
    expect(evaluate("max(1, 2) + min(3, 4)")).toBe(5);
  });

  test("functions can take expressions as arguments", () => {
    expect(evaluate("max(1 + 1, 2 * 2)")).toBe(4);
  });

  test("assignments define variables for later statements", () => {
    expect(evaluate("x = 5; y = x * 2; x + y", {})).toBe(15);
  });

  test("assignments can reference and update an existing variable", () => {
    expect(evaluate("x = 10; x = x + 1; x", {})).toBe(11);
  });

  test("returns the assigned value when last statement is an assignment", () => {
    const ctx: Record<string, number> = {};
    expect(evaluate("x = 3", ctx)).toBe(3);
    expect(ctx.x).toBe(3);
  });

  test("trailing semicolon is allowed", () => {
    expect(evaluate("x = 1;", {})).toBe(1);
  });

  test("mutates the passed-in context object", () => {
    const ctx = { x: 1 };
    evaluate("x = x + 41", ctx);
    expect(ctx.x).toBe(42);
  });

  test("throws on unknown function", () => {
    expect(() => evaluate("foo(1)")).toThrow();
  });

  test("throws on wrong number of arguments", () => {
    expect(() => evaluate("max(1)")).toThrow();
  });
});
