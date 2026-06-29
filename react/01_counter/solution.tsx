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

  // TODO Level 1: render `value` in <span className="exercise-count" data-testid="count">,
  //   plus two <button className="exercise-button"> with accessible names "increment" /
  //   "decrement" (aria-label) that change `value` by 1. Group rows in <div className="exercise-row">.
  // TODO Level 2: change by `step` (default 1) instead of 1.
  // TODO Level 3: clamp to [min, max]; disable the button that would cross a bound.
  // TODO Level 4: add a "reset" button (back to `initial`) and call
  //   `onChange(newValue)` on every change.
  // (className hints are only for the styled preview; the tests check data-testid + names, not classes.)

  return (
    <div className="exercise-card">
      {/* TODO Level 1: render the count and the increment/decrement buttons here */}
    </div>
  );
}
