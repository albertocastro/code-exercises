# React 26 — Security Camera Wall

**Estimated time:** 50–75 minutes
**Goal:** Build a complete, multi-camera NVR dashboard from a mockup — the
capstone that exercises **every** area of the Verkada frontend screen at once.

> This mirrors the Verkada frontend technical screen, where you build a complete
> functional component from a set of requirements and a Figma mockup. It pulls
> together the exact areas the screen looks for:
>
> - **React fundamentals** — `useState`, `useEffect`, and `useRef`.
> - **JavaScript timers** — a `setInterval` recording clock with effect cleanup.
> - **CSS layout** — a wrapping **Flexbox** wall of tiles and control bar.
> - **CSS positioning** — overlay layers (REC badge, timestamp) on each feed.
> - **Component architecture** — a stateful **`CameraWall`** parent and a
>   presentational **`CameraTile`** child, with all shared state lifted into the
>   parent and flowing down through props.

You edit `solution.tsx`. *(Tests use fake timers.)* The styled `CameraTile`
shell — the 16:9 feed, its overlay layers, and the tile controls — is provided
so you can match the mockup without fighting CSS. **Your job is the architecture
and the behavior:** decide what state lives in the parent, pass it down, and
raise events back up.

## The mockup

```
┌─────────────────────────────────────────────────────────────┐
│ Camera Wall            [ Record All ] [ Stop All ] [Snapshot] │  ← control bar (Flexbox)
│                                                               │
│  ┌───────────────────────┐   ┌───────────────────────┐       │
│  │ ● REC                 │   │                       │       │  ← REC overlay: top-left,
│  │            CAM-01·00:03│   │            CAM-02·00:00│       │     only while recording
│  │              [ Stop ] │   │            [ Record ] │       │  ← timestamp overlay:
│  └───────────────────────┘   └───────────────────────┘       │     bottom-right, always
│  ┌───────────────────────┐   ┌───────────────────────┐       │
│  │            CAM-03·00:00│   │            CAM-04·00:00│       │  ← tiles wrap (Flexbox grid)
│  │            [ Record ] │   │            [ Record ] │       │
│  └───────────────────────┘   └───────────────────────┘       │
│                                                               │
│  • CAM-01 · 00:02                                             │  ← snapshots list
│  • CAM-01 · 00:03                                             │
└─────────────────────────────────────────────────────────────┘
   A selected tile is outlined; clicking a tile selects exactly one.
```

## Architecture

`CameraWall` is the single source of truth. It owns **which cameras are
recording**, **each camera's elapsed time**, the **selected** camera, and the
**snapshots** — then renders one `CameraTile` per camera. `CameraTile` is
presentational: it draws a feed from its props and calls `onToggle` / `onSelect`
back up. No tile holds recording state of its own. Because state is lifted,
"Record All" and per-camera selection are trivial parent operations.

## Contract

**Per tile** (one per camera id):
- `data-testid="tile-{id}"` — the tile container; carries
  `data-selected="true"` / `"false"`.
- `data-testid="elapsed-{id}"` — that camera's time as **MM:SS** (e.g. `00:03`).
- `data-testid="rec-{id}"` — in the DOM **only while that camera records**.
- A **Record** / **Stop** button — the *same* button, toggling its label.

**Wall control bar:**
- **Record All** / **Stop All** buttons.
- A **Snapshot** button — **disabled** unless the selected camera is recording.
- `data-testid="snapshots"` — a `<ul>` of `CAM · MM:SS` capture rows.

**Props:**
- `cameras` — the camera ids to render (defaults to four).
- `maxSeconds` — each camera auto-stops once it reaches this many seconds.

## Levels
1. **Compose the wall** — render one `CameraTile` per `cameras` id into the
   Flexbox wall, passing each tile its `id`, `seconds`, `recording`, `selected`,
   and the `onToggle` / `onSelect` callbacks. Each tile shows `CAM · MM:SS`,
   starting at `00:00`.
2. **Per-camera record / stop** — a tile's button toggles **Record**/**Stop**.
   Recording advances **only that camera's** clock once per second via a single
   `setInterval`; keep the id in a `useRef` and clear it on stop / unmount
   (`useEffect` cleanup). Show the `rec-{id}` overlay only while that camera
   records.
3. **Record all, stop all, and selection** — **Record All** starts every camera
   and **Stop All** stops them (shared state, one parent update). Clicking a tile
   **selects exactly one** camera (`data-selected`); clicking a tile's *Record*
   button must not also select it.
4. **Snapshots & auto-stop** — **Snapshot** captures the selected camera's
   current time as `CAM · MM:SS` into the list, and is disabled unless the
   selected camera is recording. Each camera **auto-stops at `maxSeconds`**,
   pinned at that value (don't overshoot).
