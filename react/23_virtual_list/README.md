# React 23 — Virtualized List

**Estimated time:** 40–55 minutes
**Goal:** Render only what's visible — the core windowing technique for large lists.

You edit `solution.tsx`.

## Contract
```ts
interface VirtualListProps {
  items: string[];
  itemHeight: number;
  height: number;     // viewport height
  overscan?: number;  // extra rows above/below
}
```
A `data-testid="viewport"` scroll container whose first child is a full-height
spacer (`items.length * itemHeight`); visible rows as `data-testid="row"`,
absolutely positioned at `index * itemHeight`.

## Levels
1. **Render the window** — render only the rows that fit the viewport, not all items.
2. **Scroll** — recompute the visible window from `scrollTop`.
3. **Overscan** — render `overscan` buffer rows above and below for smooth scrolling.
