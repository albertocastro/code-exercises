import { useState, type ComponentType } from "react";

export interface MemoDashboardProps {
  numbers: number[];
  /** Expensive — should run only when its input changes. */
  compute: (nums: number[]) => number;
  /** A memoized child; should not re-render on unrelated parent updates. */
  Child: ComponentType<{ onAction: () => void; label: string }>;
  onAction: () => void;
}

/**
 * Optimize this dashboard. See README.md. The tests inject a spy `compute` and a
 * render-counting `Child` to verify your memoization actually works.
 *
 * Render contract (keep these): data-testid="result" (the computed value),
 * data-testid="count", an "increment" button, a "toggle" button, and <Child>
 * with onAction + label={selected ? "On" : "Off"}.
 */
export function MemoDashboard({ numbers, compute, Child, onAction }: MemoDashboardProps) {
  const [count, setCount] = useState(0);
  const [selected, setSelected] = useState(false);

  // TODO Level 1: memoize so `compute` runs only when `numbers` changes (useMemo).
  // TODO Level 2: pass a stable handler to <Child> so an unrelated update
  //   (the count) doesn't re-render it (useCallback).
  // TODO Level 3: keep dependencies correct — the child must still update when
  //   `label` or `onAction` actually change (don't over-memoize with []).
  const result = compute(numbers);
  const handle = () => onAction();

  return (
    <div className="exercise-card">
      <span data-testid="result">{result}</span>
      <span data-testid="count">{count}</span>
      <button className="exercise-button" onClick={() => setCount((c) => c + 1)}>
        increment
      </button>
      <button className="exercise-button" onClick={() => setSelected((s) => !s)}>
        toggle
      </button>
      <Child onAction={handle} label={selected ? "On" : "Off"} />
    </div>
  );
}
