import { useState } from "react";

/**
 * Security Camera Wall — build a multi-camera NVR dashboard from the mockup.
 * See README.md.
 *
 * This is the capstone for the Verkada frontend screen: it exercises every
 * area at once — React hooks (useState / useEffect / useRef), a JavaScript
 * timer, CSS Flexbox + positioning, and above all COMPONENT ARCHITECTURE. A
 * stateful <CameraWall> parent owns all the data; a presentational <CameraTile>
 * child renders ONE feed from props and raises events back up. Every shared
 * concern — which cameras record, which one is selected, the snapshots — lives
 * in the parent and flows down. That parent/child split is the whole point.
 *
 * The styled <CameraTile> shell is provided so you can match the mockup without
 * fighting CSS; your job is the data flow and the behavior.
 *
 * Contract the tests rely on:
 *   Per tile (one per camera id):
 *     - data-testid="tile-{id}"     — the tile container; data-selected="true|false"
 *     - data-testid="elapsed-{id}"  — that camera's time as MM:SS (e.g. "00:03")
 *     - data-testid="rec-{id}"      — present ONLY while that camera records
 *     - a Record / Stop button      — the same button toggles its label
 *   Wall control bar:
 *     - "Record All" / "Stop All" buttons
 *     - a "Snapshot" button — disabled unless a RECORDING camera is selected
 *     - data-testid="snapshots"     — a <ul> of "CAM · MM:SS" capture rows
 *
 * Props:
 *   - cameras    — the camera ids to show (defaults to four).
 *   - maxSeconds — each camera auto-stops once it reaches this many seconds.
 */
export function CameraWall({
  cameras = ["CAM-01", "CAM-02", "CAM-03", "CAM-04"],
  maxSeconds = 3600,
}: {
  cameras?: string[];
  maxSeconds?: number;
}) {
  // Parent-owned state, shared across every tile. Children never own these.
  const [elapsed, setElapsed] = useState<Record<string, number>>({});
  const [recording, setRecording] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<string[]>([]);

  const sec = (id: string) => elapsed[id] ?? 0;
  const isRecording = (id: string) => recording[id] ?? false;

  const toggle = (id: string) =>
    setRecording((r) => ({ ...r, [id]: !r[id] }));

  // TODO Level 2: while ANY camera is recording, run a SINGLE setInterval that
  //   advances every recording camera's elapsed by 1 each second. Keep the
  //   interval id in a useRef and clear it on stop / unmount (useEffect cleanup).
  //
  // TODO Level 3: "Record All" sets every camera recording; "Stop All" stops them.
  //   Wire onSelect so clicking a tile selects exactly one camera at a time
  //   (selection lives here, in the parent).
  //
  // TODO Level 4: enable "Snapshot" only when the selected camera is recording,
  //   and on click push `${selected} · MM:SS` (its current time) into snapshots.
  //   Also: when a camera reaches maxSeconds, stop just that camera and pin its
  //   time at maxSeconds (don't overshoot).

  return (
    <div className="exercise-card" style={{ width: 560 }}>
      {/* ── Control bar (Flexbox row) ── */}
      <div className="exercise-row" style={{ justifyContent: "space-between" }}>
        <strong>Camera Wall</strong>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="exercise-button">Record All</button>
          <button className="exercise-button">Stop All</button>
          <button className="exercise-button" disabled>
            Snapshot
          </button>
        </div>
      </div>

      {/* ── The wall: a wrapping Flexbox grid of tiles ──
          TODO Level 1: render one <CameraTile> per camera id into this row. Pass
          each tile its id, seconds={sec(id)}, recording={isRecording(id)},
          selected={selected === id}, and the onToggle / onSelect callbacks. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }} />

      <ul data-testid="snapshots" className="exercise-list" />
    </div>
  );
}

/**
 * One camera feed — PRESENTATIONAL. It renders entirely from props and calls
 * back up via onToggle / onSelect; it holds no recording state of its own. That
 * separation is exactly what "Component Architecture" is testing.
 */
function CameraTile({
  id,
  seconds,
  recording,
  selected,
  onToggle,
  onSelect,
}: {
  id: string;
  seconds: number;
  recording: boolean;
  selected: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const label = formatTime(seconds);
  return (
    <div
      data-testid={`tile-${id}`}
      data-selected={selected ? "true" : "false"}
      onClick={onSelect}
      style={{
        width: 256,
        borderRadius: 10,
        padding: 6,
        border: selected ? "2px solid #2f81f7" : "2px solid transparent",
        background: "#0d1117",
        cursor: "pointer",
      }}
    >
      {/* ── Camera feed: the positioning context for the overlay layers ── */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          borderRadius: 6,
          overflow: "hidden",
          background:
            "repeating-linear-gradient(115deg, #1b1f24 0 12px, #21262d 12px 24px)",
          color: "#e6edf3",
        }}
      >
        {/* TODO Level 2: render this REC overlay ONLY while `recording`.
            It must keep data-testid={`rec-${id}`}. (CSS positioning: top-left.) */}
        <div
          data-testid={`rec-${id}`}
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "2px 8px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.55)",
            fontSize: 11,
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

        {/* Bottom-right timestamp overlay (always shown) */}
        <div
          style={{
            position: "absolute",
            right: 6,
            bottom: 6,
            fontFamily: "ui-monospace, monospace",
            fontSize: 11,
            padding: "2px 6px",
            borderRadius: 4,
            background: "rgba(0,0,0,0.55)",
          }}
        >
          {id} · <span data-testid={`elapsed-${id}`}>{label}</span>
        </div>
      </div>

      {/* ── Tile control row (the click must not bubble up to select) ── */}
      <div
        className="exercise-row"
        style={{ justifyContent: "flex-end", marginTop: 6 }}
      >
        <button
          className="exercise-button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          {recording ? "Stop" : "Record"}
        </button>
      </div>
    </div>
  );
}

function formatTime(totalSeconds: number): string {
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
