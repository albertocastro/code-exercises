# React 6 — Smart Table

**Estimated time:** 40–60 minutes
**Goal:** Render tabular data and layer on sorting, pagination, and selection —
the bread-and-butter of data-heavy UIs.

You edit `solution.tsx`.

---

## Component contract

```ts
interface Column {
  key: string;
  label: string;
  sortable?: boolean;
}
interface DataTableProps {
  columns: Column[];
  rows: Record<string, unknown>[];
  pageSize?: number;       // when set, paginate
  selectable?: boolean;    // when true, show selection checkboxes
  onSelectionChange?: (selected: Record<string, unknown>[]) => void;
}
```

The tests rely on a real `<table>`: `columnheader` headers, `row`s, `cell`s,
`aria-sort` on the active header (`"ascending"`/`"descending"`/`"none"`),
buttons named **previous**/**next** with a `data-testid="page-info"` (e.g.
`"1 of 3"`), and checkboxes named **"select all"** / **"select &lt;name&gt;"**.

---

## Level 1 — Render

Render a header per column and a row per entry; each cell shows `row[column.key]`.

## Level 2 — Sorting

A `sortable` column's header is a button. Clicking it sorts rows by that key
ascending, clicking again descending. Mark the active header with `aria-sort`.

## Level 3 — Pagination

When `pageSize` is set, show one page at a time with **prev/next** buttons
(disabled at the ends) and a `page-info` element. Sorting applies across pages.

## Level 4 — Selection

When `selectable`, render a checkbox per row plus a **select all** checkbox.
Toggling reports the selected rows (in original order) via `onSelectionChange`.
