# React 26 — Security Camera Recorder

**Estimated time:** 35–55 minutes
**Goal:** Build a complete component from a mockup — `setInterval` timers with
`useRef` + `useEffect` cleanup, conditional **overlay** layers with CSS
positioning, a Flexbox control bar, and state shared across the UI.

> This mirrors the Verkada frontend technical screen: translate a mockup into a
> functional UI, lean on `useState` / `useEffect` / `useRef`, drive it with a
> JavaScript timer, and compose the result from small, well-architected pieces.

You edit `solution.tsx`. *(Tests use fake timers.)* The static visual shell —
the 16:9 feed, its overlay layers, and the control bar — is already laid out for
you with CSS `position` and Flexbox; your job is the **behavior**.

## The mockup

```
┌────────────────────────────────┐
│ ● REC                          │   ← overlay, top-left (only while recording)
│                                │
│                  CAM-01 · 00:03│   ← overlay, bottom-right (always)
└────────────────────────────────┘
  00:03            [ Stop ] [ Snapshot ]   ← control bar (Flexbox row)
  • 00:02
  • 00:03                                   ← snapshots list
```

## Contract
- `data-testid="elapsed"` — recording time as **MM:SS** (e.g. `00:03`).
- A **Record** / **Stop** button — the *same* button, toggling its label.
- `data-testid="rec-indicator"` — in the DOM **only while recording**.
- A **Snapshot** button — **disabled** while not recording.
- `data-testid="snapshots"` — a `<ul>` of captured times.
- Prop `maxSeconds` — recording auto-stops at this many seconds.

## Levels
1. **Record / stop** — clicking Record counts the time up once per second
   (`setInterval`); the button reads **Stop** while recording and pauses the
   clock. Keep the interval id in a `useRef` and clear it on stop / unmount.
2. **REC overlay** — show the `rec-indicator` overlay only while recording;
   remove it when stopped.
3. **Auto-stop** — when the time reaches `maxSeconds`, stop recording on its own
   and pin the time at `maxSeconds` (don't overshoot).
4. **Snapshots** — while recording, **Snapshot** captures the current time into
   the list; the button is disabled when not recording.
