import { useState } from "react";

export type CallStatus = "completed" | "failed" | "in_progress";

export interface Call {
  id: string;
  agent: string;
  status: CallStatus;
  /** Whole seconds of talk time. */
  durationSec: number;
  /** Epoch milliseconds when the call started. */
  startedAt: number;
}

export interface CallLogProps {
  calls: Call[];
}

/**
 * Build a Call Log dashboard. See README.md for the per-level spec.
 *
 * The tests rely on (semantic contract — required):
 *   - (L1) one row per visible call, each with data-testid="call-row", showing the
 *     agent name, a human status label ("Completed" / "Failed" / "In progress"),
 *     and the duration formatted "M:SS" (minutes unpadded, seconds zero-padded).
 *     When no calls are visible, render the text "No calls yet" and NO call rows.
 *   - (L2) status filter buttons named "All" / "Completed" / "Failed" / "In progress",
 *     each a <button> exposing aria-pressed; exactly the active one is pressed.
 *   - (L3) a stats region with data-testid="stat-count" (number of filtered calls),
 *     "stat-total" (summed duration, "M:SS") and "stat-average" (mean duration, "M:SS").
 *   - (L4) a <button> named "Sort by duration" that orders the visible rows.
 *
 * className hints in the TODOs are only for the styled preview; the tests check
 * roles / names / text / testids, never CSS classes.
 */
export function CallLog({ calls }: CallLogProps) {
  const [filter, setFilter] = useState<CallStatus | "all">("all");

  // TODO Level 1: render one row per call. Each row is
  //   <li className="exercise-call-row" data-testid="call-row"> containing the agent
  //   name, the human status label, and the duration formatted as "M:SS" (seconds
  //   ALWAYS two digits, e.g. 5 -> "0:05", 75 -> "1:15", 605 -> "10:05").
  //   Map the status key to a label: completed->"Completed", failed->"Failed",
  //   in_progress->"In progress". When there are no rows to show, render
  //   <p className="exercise-call-empty">No calls yet</p> instead of the list.
  //
  // TODO Level 2: render the four filter <button className="exercise-call-filter">s
  //   (All / Completed / Failed / In progress). Track the active filter (default "All")
  //   and set aria-pressed on each. Only calls matching the active status are visible;
  //   "All" shows everything. A filter that matches nothing shows the empty state.
  //
  // TODO Level 3: render a stats region reading from the CURRENTLY FILTERED calls:
  //   data-testid="stat-count" = how many, "stat-total" = summed durationSec ("M:SS"),
  //   "stat-average" = mean durationSec rounded to the nearest second ("M:SS").
  //   Guard the empty case so the average is 0:00, not NaN.
  //
  // TODO Level 4: add a <button className="exercise-call-sort">Sort by duration</button>.
  //   First click sorts the visible rows by durationSec DESCENDING, the next click
  //   flips to ASCENDING, and so on. Sorting must respect the active filter and must
  //   NOT change the stats. Until the button is clicked, keep the input order.

  void filter;
  void setFilter;
  return <div className="exercise-call-log">{/* TODO Level 1: build the dashboard */}</div>;
}
