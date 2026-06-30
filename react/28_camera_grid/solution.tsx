import { useEffect, useRef, useState } from "react";
import "./styles.css";

/**
 * Command — Live Camera Grid. Build a multi-camera dashboard from the mockup.
 * See README.md.
 *
 * This mirrors the Verkada frontend screen: fetch cameras from a REST backend,
 * lay them out with Flexbox, overlay status with CSS positioning, keep them
 * live with a JavaScript timer, and split the UI into a stateful <CameraGrid>
 * parent and a presentational <CameraCard> child.
 *
 * The styled, presentational <CameraCard> is provided so you can focus on the
 * DATA FLOW and the CSS. Your job:
 *   1. Fetch the camera list and render the grid (with loading + error states).
 *   2. Write styles.css so the grid is Flexbox and the overlays are positioned.
 *   3. Poll the backend on an interval to keep statuses live.
 *   4. Lift selection into the parent and add an "Online only" filter.
 *
 * The backend lives at `apiBase` (default "/api/ex/28"):
 *   GET /cameras            → { id, name, location, status }[]
 *   GET /cameras/:id/status → { id, status }
 * `status` is "online" | "offline" | "recording".
 *
 * Contract the tests rely on:
 *   - data-testid="loading" while the first fetch is in flight
 *   - data-testid="error"   if the request fails (non-2xx or thrown)
 *   - data-testid="camera-grid" (className "camera-grid") wrapping the cards
 *   - data-testid="online-only" — a checkbox that hides offline cameras (L4)
 *   - data-testid="detail" — shows the selected camera's name (L4)
 *   Per camera id (rendered by <CameraCard>):
 *   - data-testid="camera-{id}" — the card; data-selected="true|false"
 *   - data-testid="status-{id}" — its status text
 *   - data-testid="live-{id}"   — present ONLY while that camera is "online"
 */
export interface Camera {
  id: string;
  name: string;
  location: string;
  status: "online" | "offline" | "recording";
}

export function CameraGrid({
  apiBase = "/api/ex/28",
  pollMs = 5000,
}: {
  apiBase?: string;
  pollMs?: number;
}) {
  const [cameras, setCameras] = useState<Camera[] | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [onlineOnly, setOnlineOnly] = useState(false);

  // TODO Level 1: on mount, fetch `${apiBase}/cameras`. While the request is in
  //   flight, render <div data-testid="loading">. If it fails (response not ok,
  //   or fetch throws), render <div data-testid="error">. On success, store the
  //   list in `cameras`. (useEffect + useState + the Fetch API.)
  //
  // TODO Level 3: every `pollMs`, re-fetch the list and update statuses. Keep the
  //   interval id in a useRef and clear it on unmount (useEffect cleanup). CAM-02
  //   boots "offline" and comes "online" after a couple of polls — your grid
  //   should reflect that without a manual refresh.
  //
  // TODO Level 4: lift selection here. Clicking a card selects exactly one camera
  //   (pass `selected` + `onSelect` to each <CameraCard>). Render
  //   <div data-testid="detail"> showing the selected camera's name. Wire the
  //   "Online only" checkbox so it hides cameras whose status is "offline".

  // Starter: nothing is fetched yet, so the tests fail until you implement the
  // TODOs above. Replace this with your loading / error / grid rendering.
  void apiBase;
  void pollMs;
  void cameras;
  void error;
  void setCameras;
  void setError;
  void selected;
  void setSelected;
  void onlineOnly;

  return (
    <div className="camera-dashboard">
      <div className="camera-toolbar">
        <strong>Live Camera Grid</strong>
        <label className="online-only">
          <input
            type="checkbox"
            data-testid="online-only"
            checked={onlineOnly}
            onChange={(e) => setOnlineOnly(e.target.checked)}
          />
          Online only
        </label>
      </div>

      {/* Render <div data-testid="loading"> / <div data-testid="error"> / the
          grid below depending on state. */}
      <div data-testid="camera-grid" className="camera-grid">
        {/* TODO: map cameras → <CameraCard key={c.id} camera={c} ... /> */}
      </div>
    </div>
  );
}

/**
 * One camera feed — PRESENTATIONAL. Renders entirely from props and raises
 * selection back up via onSelect; it holds no fetching/state of its own. The
 * status badge and the LIVE dot are positioned overlays on the thumbnail.
 */
export function CameraCard({
  camera,
  selected = false,
  onSelect,
}: {
  camera: Camera;
  selected?: boolean;
  onSelect?: (id: string) => void;
}) {
  const { id, name, location, status } = camera;
  return (
    <div
      data-testid={`camera-${id}`}
      data-selected={selected ? "true" : "false"}
      className={`camera-card ${selected ? "is-selected" : ""}`}
      onClick={() => onSelect?.(id)}
    >
      <div className="camera-thumb">
        {/* Status badge overlay — CSS positioning (top-left). */}
        <span data-testid={`status-${id}`} className={`status-badge status-${status}`}>
          {status}
        </span>
        {/* LIVE dot overlay — only while the feed is online (bottom-right). */}
        {status === "online" && (
          <span data-testid={`live-${id}`} className="live-dot">
            ● LIVE
          </span>
        )}
      </div>
      <div className="camera-meta">
        <span className="camera-name">{name}</span>
        <span className="camera-location">{location}</span>
      </div>
    </div>
  );
}
