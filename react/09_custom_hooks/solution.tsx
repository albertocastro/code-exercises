import { useState } from "react";

// Build four reusable hooks. See README.md. Tested with RTL's `renderHook`.

// L1 ── useToggle: [value, toggle, set] ────────────────────────────────────
export function useToggle(initial = false): [boolean, () => void, (v: boolean) => void] {
  const [value] = useState(initial);
  // TODO: return a working toggle and setter.
  return [value, () => {}, () => {}];
}

// L2 ── useDebounce: returns `value`, but only after `delayMs` of no change ──
export function useDebounce<T>(value: T, _delayMs: number): T {
  // TODO: hold back updates with a setTimeout that resets on each change.
  return value;
}

// L3 ── usePrevious: the value from the previous render (undefined first) ────
export function usePrevious<T>(_value: T): T | undefined {
  // TODO: stash the value in a ref *after* render with useEffect.
  return undefined;
}

// L4 ── useLocalStorage: [value, set] persisted under `key` ─────────────────
export function useLocalStorage<T>(_key: string, initial: T): [T, (v: T) => void] {
  const [value] = useState(initial);
  // TODO: read the initial value from localStorage, and write on every set.
  return [value, () => {}];
}
