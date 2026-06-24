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

  // TODO Level 1: clicking a trigger activates it; show only the active panel.
  // TODO Level 2: add role="tablist"/"tab"/"tabpanel" + aria-selected.
  // TODO Level 3: ArrowLeft/ArrowRight (wrapping) and Home/End on the tablist.
  const onKeyDown = (_e: KeyboardEvent) => {
    // TODO Level 3
  };

  return (
    <div>
      <div onKeyDown={onKeyDown}>
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setActive(i)}>
            {t.label}
          </button>
        ))}
      </div>
      <div>{tabs[active].content}</div>
    </div>
  );
}
