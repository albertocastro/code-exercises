import { useState } from "react";

/**
 * Build a stopwatch. See README.md.
 *
 * The tests rely on a data-testid="time" (whole seconds), Start/Pause, Reset,
 * and Lap buttons, and a data-testid="laps" list.
 */
export function Stopwatch() {
  const [ms] = useState(0);
  const [running, setRunning] = useState(false);

  // TODO Level 1: while running, advance the time with setInterval (and clear it
  //   on pause / unmount). Start/Pause toggles `running`.
  // TODO Level 2: Reset returns the time to 0 and stops.
  // TODO Level 3: Lap records the current time into the laps list.
  const seconds = Math.floor(ms / 1000);

  return (
    <div className="exercise-card">
      <div data-testid="time">{seconds}</div>
      <div className="exercise-row">
        <button className="exercise-button" onClick={() => setRunning((r) => !r)}>
          {running ? "Pause" : "Start"}
        </button>
        <button className="exercise-button">Reset</button>
        <button className="exercise-button">Lap</button>
      </div>
      <ul data-testid="laps" className="exercise-list" />
    </div>
  );
}
