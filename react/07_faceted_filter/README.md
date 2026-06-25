# React 7 — Faceted Filter

**Estimated time:** 35–50 minutes
**Goal:** Combine multiple filters over a dataset — text search plus category
facets — with live counts, the way real catalog/search UIs work.

You edit `solution.tsx`.

---

## Component contract

```ts
interface Item { id: number; name: string; category: string; price: number; }
interface FilterListProps { items: Item[]; }
```

The tests rely on: a search input named **"search"**; one `<li>` per visible
item; **category checkboxes named after the category** (via `aria-label`); a
`data-testid="count"`; a **"Clear all"** button; and facet labels like
**"Electronics (2)"**.

---

## Level 1 — Text search

Filter items by **case-insensitive substring** of the name.

## Level 2 — Category facets

Render a checkbox per distinct category. Selecting categories filters to items
in **any** selected category (OR), combined with the search (AND).

## Level 3 — Count + clear

Show a `count` element ("N results") and a **"Clear all"** button that resets
both the search and the selected facets.

## Level 4 — Facet counts

Each facet label shows how many items fall in that category **for the current
search** — e.g. `Clothing (2)`, updating as you type.
