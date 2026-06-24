import { useState } from "react";

export interface CounterProps {
  initial?: number;
  step?: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
}

/**
 * Build a Counter component. See README.md for the per-level spec.
 *
 * Accessible names the tests rely on:
 *   - current value lives in an element with data-testid="count"
 *   - buttons have accessible names "increment", "decrement", "reset"
 */
export function Counter(props: CounterProps) {
  const [value, setValue] = useState(props.initial ?? 0);

  // TODO Level 1: render `value` in <span data-testid="count">, plus
  //   "increment" / "decrement" buttons that change it by 1.
  // TODO Level 2: change by `step` (default 1) instead of 1.
  // TODO Level 3: clamp to [min, max]; disable the button that would cross a bound.
  // TODO Level 4: add a "reset" button (back to `initial`) and call
  //   `onChange(newValue)` on every change.

  return (
    <div>
      <span data-testid="count">{value}</span>
    </div>
  );
}
