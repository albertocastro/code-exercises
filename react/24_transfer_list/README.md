# React 24 — Transfer List

**Estimated time:** 35–45 minutes
**Goal:** A dual-listbox — selection state plus moving items between two lists.

You edit `solution.tsx`.

## Contract
```ts
interface TransferListProps { initialLeft: string[]; initialRight?: string[]; }
```
Two lists `data-testid="left"` / `"right"`; items are buttons (selected =
`aria-pressed`); control buttons named **move right**, **move left**,
**move all right**, **move all left**.

## Levels
1. **Render + select** — render both lists; clicking an item toggles its selection.
2. **Move selected** — move right/left transfer the selected items.
3. **Move all** — move every item one way or the other.
