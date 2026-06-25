# React 9 — Custom Hooks

**Estimated time:** 35–50 minutes
**Goal:** Extract reusable logic into custom hooks — state, effects, refs, timers,
and persistence — and test them with `renderHook`.

You edit `solution.tsx`. Each level adds one exported hook.

---

## Level 1 — `useToggle`

```ts
useToggle(initial = false): [value, toggle, set]
```
`toggle` flips the boolean; `set` assigns it directly.

## Level 2 — `useDebounce`

```ts
useDebounce<T>(value: T, delayMs: number): T
```
Returns `value`, but only after it has stopped changing for `delayMs`. Reset the
pending update on every change. *(Tested with fake timers + `advanceTimersByTime`.)*

## Level 3 — `usePrevious`

```ts
usePrevious<T>(value: T): T | undefined
```
Returns the value from the **previous** render (`undefined` on the first).
Hint: update a `ref` inside `useEffect`, after render.

## Level 4 — `useLocalStorage`

```ts
useLocalStorage<T>(key: string, initial: T): [value, set]
```
Initializes from `localStorage[key]` (JSON) if present, else `initial`; `set`
updates state **and** writes back to `localStorage`.
