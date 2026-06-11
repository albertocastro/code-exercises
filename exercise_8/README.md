# Exercise 8 — Expression Evaluator

**Estimated time:** 35–45 minutes  
**Levels:** 4

## How to run

```bash
# from the repo root (code-exercises/)
LEVEL=1 npm test -- exercise_8
LEVEL=2 npm test -- exercise_8
LEVEL=1 npm run watch -- exercise_8
```

---

## Level 1 — Arithmetic and Precedence

Implement a single function:

```ts
function evaluate(expr: string, context?: Record<string, number>): number
```

At this level, support:

- Operators `+ - * /` on non-negative integers
- Standard precedence: `*` and `/` bind tighter than `+` and `-`
- Left-to-right associativity for operators of equal precedence
- Whitespace anywhere in the expression is ignored

**Examples:**

| `expr` | Result |
|---|---|
| `"2 + 3"` | `5` |
| `"2 + 3 * 4"` | `14` |
| `"20 - 4 / 2"` | `18` |
| `"2 * 3 + 4 * 5"` | `26` |
| `"10 - 2 - 3"` | `5` (left-to-right: `(10 - 2) - 3`) |
| `"  6  /   3 "` | `2` |

---

## Level 2 — Parentheses, Unary Operators, Decimals

```ts
function evaluate(expr: string, context?: Record<string, number>): number
```

Add support for:

- `()` grouping, which can be nested arbitrarily
- Unary `-` and unary `+` (e.g. `-(3 + 4)`, `-5 + 2`, `+3`)
- Decimal number literals (e.g. `3.14`, `0.5`)

**Examples:**

| `expr` | Result |
|---|---|
| `"(2 + 3) * 4"` | `20` |
| `"-(3 + 4)"` | `-7` |
| `"-5 + 2"` | `-3` |
| `"2 * -(1 + 1)"` | `-4` |
| `"1.5 + 2.25"` | `3.75` |
| `"-(2 - 5) * 2"` | `6` |

---

## Level 3 — Variables

```ts
function evaluate(expr: string, context?: Record<string, number>): number
```

- `expr` may contain bare identifiers (letters, digits, underscores; not starting with a digit), e.g. `x`, `total_2`
- Each identifier is looked up in `context` and replaced by its numeric value
- If an identifier used in `expr` is not present in `context`, throw an `Error`
- Calls with no identifiers (Levels 1–2) don't need to pass `context` at all — it defaults to `{}`

**Examples:**

| `expr` | `context` | Result |
|---|---|---|
| `"x + 1"` | `{ x: 4 }` | `5` |
| `"a * b - c"` | `{ a: 2, b: 3, c: 1 }` | `5` |
| `"-x"` | `{ x: 10 }` | `-10` |
| `"x + y"` | `{ x: 1 }` | throws `Error` (`y` undefined) |

---

## Level 4 — Functions and Multi-Statement Programs

```ts
function evaluate(expr: string, context?: Record<string, number>): number
```

Add support for:

- Built-in functions, callable with parentheses: `max(a, b)`, `min(a, b)`, `sqrt(x)`, `pow(a, b)`, `abs(x)`
- Multi-statement input: `expr` may contain multiple statements separated by `;`
- Each statement is either:
  - an **expression**, or
  - an **assignment** of the form `name = expr`, which defines or updates `name` in `context` so that later statements (in the same `evaluate` call) can use it
- `evaluate` returns the value of the **last** statement
  - If the last statement is an assignment, `evaluate` returns the assigned value
- A trailing `;` (e.g. `"x = 1;"`) is allowed and is simply ignored (no empty trailing statement)

**Examples:**

| `expr` | `context` | Result |
|---|---|---|
| `"max(3, 7)"` | — | `7` |
| `"sqrt(16) + 1"` | — | `5` |
| `"pow(2, 3)"` | — | `8` |
| `"abs(-5)"` | — | `5` |
| `"x = 5; y = x * 2; x + y"` | `{}` | `15` |
| `"x = 10; x = x + 1; x"` | `{}` | `11` |
| `"x = 3"` | `{}` | `3` (and `context.x === 3` afterward) |

---

## Constraints

- **Error handling (applies to ALL levels):** `evaluate` throws an `Error` for any malformed/unparseable expression, division by zero, an identifier not found in `context`, an unknown function name, or a function called with the wrong number of arguments. There is no other "invalid input" return value (no `NaN`, `null`, etc.) — invalid input always throws.
- Numbers are non-negative in their literal form; negativity only arises via the unary `-` operator (Level 2+).
- Identifiers match `/^[a-zA-Z_][a-zA-Z0-9_]*$/` and are case-sensitive.
- Built-in function names (`max`, `min`, `sqrt`, `pow`, `abs`) are reserved — they cannot be used as variable names, and an identifier that collides with a function name but is used without `(...)` should be looked up in `context` as usual (and throw if absent, per the error-handling rule).
- Assignments (Level 4) mutate the `context` object passed in by the caller; if no `context` is passed, an internal one is used for the duration of the call.
- Whitespace is insignificant everywhere.
- Time limit: 6 seconds | Memory limit: 4 GB
