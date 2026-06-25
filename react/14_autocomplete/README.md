# React 14 — Autocomplete

**Estimated time:** 45–60 minutes
**Goal:** Debounced async search with keyboard nav and race-condition handling —
a classic frontend interview question.

You edit `solution.tsx`. *(Tests use fake timers + a mock `fetchSuggestions`.)*

## Contract
```ts
interface AutocompleteProps {
  fetchSuggestions: (query: string) => Promise<string[]>;
  onSelect?: (value: string) => void;
  delayMs?: number; // debounce, default 300
}
```
Input named **search**; results as `role="option"` (active = `aria-selected`);
`data-testid="loading"` / `data-testid="empty"`.

## Levels
1. **Debounced fetch** — wait `delayMs` after typing, then fetch and render.
2. **Keyboard select** — Arrow keys highlight, Enter/click select.
3. **Loading + empty** — show a loading state while fetching, empty when no matches.
4. **Ignore stale responses** — if an older request resolves after a newer one,
   discard it (track the latest request id).
