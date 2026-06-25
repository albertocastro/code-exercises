# React 1 — Counter

**Estimated time:** 15–25 minutes
**Goal:** Warm up on React state, props, and event handlers with React Testing Library.

You edit `solution.tsx`. Tests watch the file and auto-advance levels as they pass.
Run from the CLI (`npm start` → React → Counter), or directly:

```bash
LEVEL=1 npx vitest run react/01_counter   # through level 1
npx vitest react/01_counter                # watch, all levels
```

A live browser preview of your component is available while the exercise runs
(the CLI prints the URL), or via `VITE_EXERCISE=01_counter npm run preview:web`.

---

## Component contract

```ts
interface CounterProps {
  initial?: number;          // starting value, default 0
  step?: number;             // amount each button changes, default 1
  min?: number;              // lower bound (inclusive)
  max?: number;              // upper bound (inclusive)
  onChange?: (value: number) => void;
}
```

The tests find things by accessible name, so:

- The current value lives in an element with `data-testid="count"`.
- Buttons have accessible names **increment**, **decrement**, **reset**
  (button text or `aria-label`).

---

## Level 1 — Increment / decrement

Render the current value (default `0`, or `initial`). The **increment** button
adds 1, **decrement** subtracts 1.

## Level 2 — Custom step

Each button changes the value by `step` (default `1`).

## Level 3 — Min / max bounds

Clamp the value to `[min, max]`. Disable **decrement** at `min` and
**increment** at `max`. A step must not overshoot a bound.

## Level 4 — Reset + onChange

Add a **reset** button that returns to `initial`. Call `onChange(newValue)` on
every actual change — but not when a click is blocked by a bound.
