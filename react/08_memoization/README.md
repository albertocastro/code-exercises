# React 8 — Memoization

**Estimated time:** 30–45 minutes
**Goal:** Use `useMemo`, `useCallback`, and dependency arrays correctly so a
component does only the work it needs to — and learn how to *prove* it.

You edit `solution.tsx`.

---

## How it's tested

The tests inject a **spy `compute`** and a **render-counting `Child`** (wrapped
in `React.memo`). They assert that unrelated state changes (the `count`) do
**not** re-run `compute` or re-render `Child`, while relevant changes still do.

## Component contract

```ts
interface MemoDashboardProps {
  numbers: number[];
  compute: (nums: number[]) => number;   // expensive
  Child: React.ComponentType<{ onAction: () => void; label: string }>;
  onAction: () => void;
}
```

Keep the render shape: `data-testid="result"`, `data-testid="count"`, an
**increment** button, a **toggle** button, and `<Child onAction=… label=…/>`
where `label` is `"On"`/`"Off"` from the toggle.

---

## Level 1 — `useMemo`

Memoize `compute(numbers)` so it runs on mount and only again when `numbers`
changes — not when the unrelated `count` updates.

## Level 2 — `useCallback`

Give `<Child>` a **stable** `onAction` so clicking **increment** doesn't
re-render the memoized child.

## Level 3 — Correct dependencies

Don't over-memoize: toggling (which changes `label`) must still re-render the
child, and a new `onAction` prop must take effect. Get the dependency arrays
right.
