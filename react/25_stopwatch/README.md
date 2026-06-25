# React 25 — Stopwatch

**Estimated time:** 25–40 minutes
**Goal:** Timers with `setInterval`, effect cleanup, and laps.

You edit `solution.tsx`. *(Tests use fake timers.)*

## Contract
A `data-testid="time"` (whole seconds), **Start/Pause**, **Reset**, **Lap**
buttons, and a `data-testid="laps"` list.

## Levels
1. **Start / pause** — count up while running; pause stops the clock (clean up
   the interval).
2. **Reset** — return to 0 and stop.
3. **Lap** — record the current time into the laps list.
