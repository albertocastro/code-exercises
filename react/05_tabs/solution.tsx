import { KeyboardEvent, ReactNode, useState } from "react";

export interface TabItem {
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultIndex?: number;
}

/**
 * Build a Tabs component. See README.md for the per-level spec.
 *
 * The tests rely on:
 *   - each trigger renders its `label` and switches the visible panel
 *   - (L2) triggers are role="tab" with aria-selected; the active panel is
 *     role="tabpanel"; only the active panel is in the DOM; wrapper is role="tablist"
 *   - (L3) keyboard nav handled on the tablist
 */
export function Tabs({ tabs, defaultIndex = 0 }: TabsProps) {
  const [active, setActive] = useState(defaultIndex);

  // TODO Level 1: render a trigger per tab — <button className="exercise-tab">{label}</button> —
  //   inside the tablist; clicking one makes it active (track with `active`/`setActive`).
  //   Show ONLY the active tab's content in the panel. `defaultIndex` sets the initial tab.
  // TODO Level 2: add role="tablist"/"tab"/"tabpanel" + aria-selected on the active tab.
  // TODO Level 3: ArrowLeft/ArrowRight (wrapping) and Home/End on the tablist.
  // (className hints are only for the styled preview; the tests check text + roles, not classes.)
  const onKeyDown = (_e: KeyboardEvent) => {
    // TODO Level 3
  };

  return (
    <div className="exercise-tabs">
      <div className="exercise-tablist" onKeyDown={onKeyDown}>
        {/* TODO Level 1: render a <button className="exercise-tab"> per tab here */}
      </div>
      <div className="exercise-panel">{/* TODO Level 1: render the active tab's content */}</div>
    </div>
  );
}
