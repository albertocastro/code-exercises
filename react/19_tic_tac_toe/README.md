# React 19 — Tic-Tac-Toe

**Estimated time:** 30–45 minutes
**Goal:** The classic interview game — board state, derived game status, turns.

You edit `solution.tsx`.

## Contract
A `data-testid="status"` (`"Turn: X"` / `"Winner: O"` / `"Draw"`), nine cells
`data-testid="cell-0"`..`"cell-8"`, and a **Reset** button.

## Levels
1. **Placing marks** — click to place X then O, alternating; show whose turn;
   a taken cell can't be overwritten.
2. **Win detection** — declare a winner on three in a row; no moves afterward.
3. **Draw + reset** — declare a draw on a full board with no winner; Reset clears it.
