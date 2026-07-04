# React 30 — Tip Calculator (open-ended)

**Estimated time:** 30–45 minutes
**Type:** Open-ended — single suite, all-or-nothing (no levels)
**Goal:** Build a small tip calculator. Unlike the leveled exercises, **there is
no prescribed layout, component structure, or starter scaffold.** You decide how
it looks and how it's built. The platform only checks a handful of `data-testid`s
and the text they display.

You edit `solution.tsx`, which **default-exports an `App` component** (no props —
the harness renders `<App />` directly). Run from the CLI (`npm start` → React →
Tip Calculator) or:

```bash
npx vitest run react/30_tip_calculator   # one shot, all tests
npx vitest react/30_tip_calculator       # watch mode
```

The shipped starter fails every test on purpose — that's your signal to start
building.

---

## You own everything except the contract

- **Layout, elements, and styling are entirely up to you.** Inputs can be any
  controllable field; outputs can be any node whose text you control. Use one
  component or ten.
- You may **add your own files** in this folder — e.g. `styles.css`, a
  `format.ts` helper, extra `.tsx` components — and import them with **flat,
  same-folder paths**: `import "./styles.css"`, `import { fmt } from "./format"`.
- The tests never look at tag names, DOM structure, CSS classes, or ARIA roles.
  They query **only by `data-testid`** and read the **visible text**. Hitting the
  contract below is the entire job.

---

## The contract — required `data-testid`s

### Inputs (controllable fields you expose)

| `data-testid`      | Meaning                                             |
| ------------------ | --------------------------------------------------- |
| `bill-input`       | The bill amount.                                    |
| `tip-input`        | The tip **percentage** (e.g. `15` means 15%).       |
| `party-size-input` | Number of people to split the total across.         |

Tests drive these with `fireEvent.change(el, { target: { value: "..." } })`, so
whatever element you use must update from its `value`.

### Outputs (readable text you render)

| `data-testid`        | Shows                                             |
| -------------------- | ------------------------------------------------ |
| `tip-amount`         | The tip in currency, **2 decimals**.             |
| `total-amount`       | Bill + tip, **2 decimals**.                       |
| `per-person-amount`  | Total ÷ party size, **2 decimals**.               |

Each output node's **text content** must be exactly the formatted number, e.g.
`"15.00"` — no currency symbol, no extra characters.

---

## The rules (these are what the tests pin down)

1. **Currency is always 2 decimals.** `15` → `"15.00"`, `9.621` → `"9.62"`,
   `33.333…` → `"33.33"`. (`Number.prototype.toFixed(2)` does this.)
2. **tip amount = bill × (tip% / 100).** A tip of `15` on a `100` bill is
   `"15.00"`.
3. **total = bill + tip.**
4. **per-person = total / party size.**
5. **Empty or non-numeric bill or tip% counts as `0`.** A blank form reads
   `0.00` everywhere; a non-numeric bill like `"abc"` is `0`.
6. **Party size is at least 1 (divide-by-zero guard).** If the party-size field
   is **empty, `0`, negative, or non-numeric, treat it as `1`** — so per-person
   equals the total in those cases. A valid size like `2` splits the total in
   half.

---

## Constraints

- Recompute the outputs whenever any input changes (they're derived, not stored).
- Do not print a currency symbol or thousands separators — the tests compare the
  raw `toFixed(2)` string.
- The only public surface is the default-exported `App`. Don't rely on props;
  the harness passes none.
