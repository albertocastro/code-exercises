# React 4 — Searchable List

**Estimated time:** 30–45 minutes
**Goal:** Controlled inputs, derived filtering, empty states, and keyboard interaction.

You edit `solution.tsx`. Run from the CLI (`npm start` → React → Searchable List) or:

```bash
LEVEL=1 npx vitest run react/04_search_filter
npx vitest react/04_search_filter
```

---

## Component contract

```ts
interface SearchListProps {
  items: string[];
  onSelect?: (item: string) => void;
  placeholder?: string;
}
```

The tests rely on:

- A text input with accessible name **"search"**.
- Each visible item has `role="option"`; the highlighted one has `aria-selected="true"`.
- A `data-testid="result-count"` element shows the number of matches.
- The text **"No results"** appears when nothing matches.

---

## Level 1 — Filter

Render all items. Typing filters them by **case-insensitive substring**.

## Level 2 — Empty state + count

Show **"No results"** when nothing matches, and a `result-count` element with the
number of matches.

## Level 3 — Keyboard navigation

**ArrowDown / ArrowUp** move the highlight through the visible items (wrapping at
the ends; ArrowUp from nothing goes to the last). **Enter** calls `onSelect` with
the highlighted item. Changing the query resets the highlight.
