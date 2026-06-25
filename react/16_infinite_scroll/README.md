# React 16 — Infinite Scroll

**Estimated time:** 35–50 minutes
**Goal:** Paginated data loading driven by an `IntersectionObserver` sentinel.

You edit `solution.tsx`. *(Tests use a mock `fetchPage` + a mock IntersectionObserver.)*

## Contract
```ts
interface InfiniteListProps {
  fetchPage: (page: number) => Promise<string[]>;
  pageSize?: number; // default 10
}
```
Items as `role="listitem"`; a `data-testid="sentinel"` to observe; a
`data-testid="end"` when exhausted.

## Levels
1. **Initial load** — fetch page 0 on mount and render it.
2. **Load more** — observe the sentinel; when it intersects, fetch and append
   the next page (guard against overlapping loads).
3. **End of list** — when a page is shorter than `pageSize`, stop and show `end`.
