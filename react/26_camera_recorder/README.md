# React 26 — Security Camera Recorder

**Estimated time:** 35–55 minutes
**Goal:** Turn a static camera tile into a working DVR — start/stop recording, a
timer that ticks every second, a live REC indicator, an automatic cutoff, and
snapshot capture.

## What you're building

Picture a wall of camera feeds in a security operations center — the kind of
surveillance dashboard Verkada, Nest, or Ring put in front of an operator. This
is **one tile** from that wall: a single camera's live feed, plus the controls
to record it.

The operator hits **Record** to start rolling. An elapsed timer counts up second
by second and a red **REC** light shows the feed is live. Recording stops on the
same button — or automatically once the clip hits a maximum length, so a
forgotten recording doesn't run forever. While it's rolling, the operator can
grab **snapshots** — the current timestamp captured into a list — to flag a
moment without scrubbing back through footage later.

The static visual shell is already built for you: the 16:9 feed, its overlay
layers, and the control bar are laid out with CSS `position` and Flexbox. **Your
job is the behavior** — make the tile actually record.

You edit `solution.tsx`. *(Tests drive the clock with fake timers, so no real
second ever has to pass.)*

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
1. **Record / stop** — Record starts the clock; it counts up once per second and
   the button now reads **Stop**. Stop pauses it where it is. The clock must stop
   *cleanly*: nothing should keep ticking after you stop, or after the tile is
   removed from the screen.
2. **REC indicator** — the `rec-indicator` overlay is visible only while
   recording, and gone the moment you stop.
3. **Auto-stop** — recording ends on its own once the elapsed time reaches
   `maxSeconds`, and the displayed time stays pinned there (it must not tick past
   the limit).
4. **Snapshots** — while recording, **Snapshot** captures the current elapsed
   time into the list; the button is disabled whenever you're not recording.
</content>
</invoke>
