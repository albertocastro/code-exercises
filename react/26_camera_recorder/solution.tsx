import { useState } from "react";

/**
 * Build a security-camera recorder tile. See README.md.
 *
 * The visual shell is provided so you can match the mockup: a 16:9 "feed"
 * with overlay layers (CSS `position`), and a control bar (Flexbox) below.
 * Your job is the behavior — wire up the timer, the REC overlay, auto-stop,
 * and snapshots.
 *
 * Contract the tests rely on:
 *   - data-testid="elapsed" — the recording time as MM:SS (e.g. "00:03")
 *   - a "Record" / "Stop" button (the same button toggles its label)
 *   - data-testid="rec-indicator" — present in the DOM ONLY while recording
 *   - a "Snapshot" button — disabled while not recording
 *   - data-testid="snapshots" — a <ul> of captured snapshot times
 *
 * Props:
 *   - maxSeconds — recording auto-stops once it reaches this many seconds.
 */
export function CameraRecorder({ maxSeconds = 3600 }: { maxSeconds?: number }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [snapshots, setSnapshots] = useState<number[]>([]);

  // TODO Level 1: while `recording`, `seconds` should climb by one every second;
  //   the Record button toggles `recording` and reads "Stop" while recording.
  //   When recording stops — or this tile unmounts — the clock must stop cleanly,
  //   with no stray ticks left running.
  //
  // TODO Level 3: when `seconds` reaches `maxSeconds`, stop recording on its own
  //   and leave the time pinned at maxSeconds (don't overshoot).
  //
  // TODO Level 4: "Snapshot" captures the current `seconds` into `snapshots`.
  //   It must be disabled while not recording.

  const label = formatTime(seconds);

  return (
    <div className="exercise-card" style={{ width: 340 }}>
      {/* ── Camera feed: a positioning context for the overlay layers ── */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          borderRadius: 8,
          overflow: "hidden",
          background:
            "repeating-linear-gradient(115deg, #1b1f24 0 12px, #21262d 12px 24px)",
          color: "#e6edf3",
        }}
      >
        {/* TODO Level 2: render this REC indicator ONLY while recording.
            It must carry data-testid="rec-indicator". */}
        <div
          data-testid="rec-indicator"
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "2px 8px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.55)",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#ff3b30",
              boxShadow: "0 0 6px #ff3b30",
            }}
          />
          REC
        </div>

        {/* Bottom-right timestamp overlay */}
        <div
          style={{
            position: "absolute",
            right: 8,
            bottom: 8,
            fontFamily: "ui-monospace, monospace",
            fontSize: 12,
            padding: "2px 6px",
            borderRadius: 4,
            background: "rgba(0,0,0,0.55)",
          }}
        >
          CAM-01 · {label}
        </div>
      </div>

      {/* ── Control bar (Flexbox row) ── */}
      <div
        className="exercise-row"
        style={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <span
          data-testid="elapsed"
          style={{ fontFamily: "ui-monospace, monospace", fontSize: 18 }}
        >
          {label}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="exercise-button"
            onClick={() => setRecording((r) => !r)}
          >
            {recording ? "Stop" : "Record"}
          </button>
          <button className="exercise-button" disabled>
            Snapshot
          </button>
        </div>
      </div>

      <ul data-testid="snapshots" className="exercise-list" />
    </div>
  );
}

function formatTime(totalSeconds: number): string {
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
