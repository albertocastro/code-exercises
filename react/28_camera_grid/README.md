# React 28 — Command: Live Camera Grid

**Estimated time:** 50–75 minutes
**Goal:** Build a live, multi-camera dashboard from a mockup — fetching from a
real REST backend, laying it out with CSS, and keeping it fresh with a timer.

> This mirrors the **Verkada** frontend technical screen: build a complete
> functional component from requirements + a mockup. It pulls together the exact
> areas that screen looks for:
>
> - **React fundamentals** — `useState`, `useEffect`, `useRef`.
> - **The Fetch API** — load cameras from a REST backend (hosted for you).
> - **JavaScript timers** — a polling `setInterval` with effect cleanup.
> - **CSS layout** — a wrapping **Flexbox** grid of camera tiles.
> - **CSS positioning** — status + LIVE overlays on each feed.
> - **Component architecture** — a stateful **`CameraGrid`** parent and a
>   presentational **`CameraCard`** child; selection lifted into the parent.

You edit **`solution.tsx`** and **`styles.css`** (create your CSS there and it's
already `import "./styles.css"`-ed for you). The styled-but-unstyled presentational
`CameraCard` is provided — your job is the **data flow** and the **CSS**.

## The hosted backend

This exercise ships a **real Node backend** at `/api/ex/28` — call it with the
normal Fetch API. (It runs under the dev server; tests hit the same handlers.)

| Method | Path                     | Returns                                         |
| ------ | ------------------------ | ----------------------------------------------- |
| GET    | `/cameras`               | `{ id, name, location, status }[]`              |
| GET    | `/cameras/:id/status`    | `{ id, status }`                                |

`status` is `"online" | "offline" | "recording"`. `CAM-02` boots **offline** and
comes **online** after the dashboard polls a couple of times — that's what your
Level 3 timer makes visible.

## The mockup

```
┌──────────────────────────────────────────────────────────────┐
│ Live Camera Grid                            ☐ Online only      │  ← toolbar
│                                                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ online          │  │ offline         │  │ online          │ │  ← status badge:
│  │           ● LIVE│  │                 │  │           ● LIVE│ │     top-left overlay
│  │ Front Entrance  │  │ Loading Dock    │  │ Parking Garage  │ │  ← LIVE dot:
│  │ Lobby           │  │ Warehouse       │  │ Level P2        │ │     bottom-right,
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │     online only
│  ┌─────────────────┐                                           │
│  │ online   ● LIVE │   Tiles wrap (Flexbox). A selected card    │
│  │ Server Room     │   is outlined; clicking one selects        │
│  │ IDF-3           │   exactly one and fills the detail panel.  │
│  └─────────────────┘                                           │
└──────────────────────────────────────────────────────────────┘
```

## Contract

- `data-testid="loading"` — while the first fetch is in flight.
- `data-testid="error"` — if the request fails (non-2xx or thrown).
- `data-testid="camera-grid"` (class `camera-grid`) — wraps the cards.
- `data-testid="online-only"` — a checkbox that hides offline cameras (L4).
- `data-testid="detail"` — shows the selected camera's name (L4).

**Per camera id** (rendered by `CameraCard`):
- `data-testid="camera-{id}"` — the card; carries `data-selected="true"|"false"`.
- `data-testid="status-{id}"` — its status text.
- `data-testid="live-{id}"` — present **only** while that camera is `online`.

**Props:** `apiBase` (default `/api/ex/28`), `pollMs` (default `5000`).

## Levels

1. **Fetch + render the grid** — on mount, `fetch("${apiBase}/cameras")`. Show
   `loading` while pending and `error` on failure; on success render one
   `CameraCard` per camera into `.camera-grid`. Then style the grid in
   `styles.css`: `.camera-grid { display: flex; flex-wrap: wrap }`.
2. **Positioned overlays** — in `styles.css`, make `.camera-thumb`
   `position: relative` and the `.status-badge` / `.live-dot`
   `position: absolute`, so the status and LIVE indicators sit over the feed.
3. **Live polling** — every `pollMs`, re-fetch the list and update statuses via a
   single `setInterval`. Keep its id in a `useRef` and **clear it on unmount**
   (`useEffect` cleanup). `CAM-02` should flip to `online` on its own.
4. **Selection + filter** — lift `selected` into `CameraGrid`; clicking a card
   selects **exactly one** (`data-selected`), and `data-testid="detail"` shows
   that camera's name. Wire the **Online only** checkbox to hide `offline`
   cameras. `CameraCard` stays presentational and raises `onSelect` up.
