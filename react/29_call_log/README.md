# React 29 — Call Log

**Estimated time:** 45–60 minutes
**Levels:** 4
**Goal:** Build a call-monitoring dashboard: render a list, then layer a status
filter, derived summary stats, and sorting — the classic "read model → filter →
aggregate → sort" pipeline behind analytics UIs.

You edit `solution.tsx`. Run from the CLI (`npm start` → React → Call Log) or:

```bash
LEVEL=1 npx vitest run react/29_call_log
LEVEL=2 npx vitest run react/29_call_log
LEVEL=3 npx vitest run react/29_call_log
LEVEL=4 npx vitest run react/29_call_log
npx vitest react/29_call_log     # watch, all levels
```

---

## Component contract

```ts
type CallStatus = "completed" | "failed" | "in_progress";

interface Call {
  id: string;
  agent: string;
  status: CallStatus;
  durationSec: number; // whole seconds
  startedAt: number;   // epoch ms
}

interface CallLogProps { calls: Call[]; }
```

The tests assert on **roles, accessible names, visible text, and `data-testid`** —
never on CSS classes. The `className` hints in the starter are only there to make
the live preview look right.

---

## Level 1 — Render the call list

Render one row per call (`data-testid="call-row"`). Each row shows the agent name,
a **human** status label (`completed` → "Completed", `failed` → "Failed",
`in_progress` → "In progress"), and the duration.

Duration is formatted `M:SS`: minutes are **not** padded, seconds are **always two
digits**. So `5` → `0:05`, `75` → `1:15`, `605` → `10:05`. Durations that exceed an
hour still count in minutes (e.g. `3661` → `61:01`).

When there are no rows to show, render the text **"No calls yet"** and no rows.

## Level 2 — Filter by status

Add four filter buttons: **All**, **Completed**, **Failed**, **In progress**. The
active filter starts at **All**. Each button exposes `aria-pressed`, and exactly the
active one is pressed. Only calls whose status matches are visible; **All** shows
everything. A filter that matches nothing falls back to the Level 1 empty state.

## Level 3 — Summary stats

Show a stats region that reflects the **currently filtered** calls (not the whole
input):

- `data-testid="stat-count"` — how many calls are in view.
- `data-testid="stat-total"` — their summed `durationSec`, formatted `M:SS`.
- `data-testid="stat-average"` — the mean `durationSec`, **rounded to the nearest
  second**, formatted `M:SS`.

## Level 4 — Sort by duration

Add a **"Sort by duration"** button. The first click sorts the visible rows by
`durationSec` **descending**; each further click toggles the direction. Sorting
respects the active filter and must **not** change the stats. Before any click, rows
stay in input order.

---

## Constraints

- **One pipeline, in order:** `calls → filter → sort → render`. Stats are computed
  from the **filtered** set and are independent of sort order.
- **Empty state is shared:** it appears whenever there are no *visible* rows —
  whether the input is empty (L1) or the active filter excludes everything (L2).
- **No divide-by-zero:** when the filtered set is empty, count is `0` and both total
  and average read `0:00`, never `NaN`.
- Seconds are always two digits; minutes are never padded and are not capped at 59.
