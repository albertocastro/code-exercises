# React 18 — Undo / Redo

**Estimated time:** 30–40 minutes
**Goal:** Model history (past / present / future) and time-travel through state.

You edit `solution.tsx`.

## Contract
```ts
interface HistoryEditorProps { initial?: string; }
```
An input named **text** and buttons named **undo** / **redo**.

## Levels
1. **Controlled input** — typing updates the value.
2. **Undo** — step back to the previous value; disabled when there's no history.
3. **Redo** — re-apply an undone edit; a new edit after undo clears the redo stack.
