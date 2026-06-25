import { useState } from "react";

export interface TransferListProps {
  initialLeft: string[];
  initialRight?: string[];
}

/**
 * Build a dual-listbox transfer control. See README.md.
 *
 * The tests rely on two lists data-testid="left" / "right", items as buttons
 * (selected = aria-pressed), and control buttons named "move right",
 * "move left", "move all right", "move all left".
 */
export function TransferList({ initialLeft, initialRight = [] }: TransferListProps) {
  const [left] = useState(initialLeft);
  const [right] = useState(initialRight);

  // TODO Level 1: clicking an item toggles its selection (aria-pressed).
  // TODO Level 2: "move right"/"move left" transfer the selected items between
  //   the lists (and clear the selection).
  // TODO Level 3: "move all right"/"move all left".

  const list = (items: string[], testid: string) => (
    <ul className="exercise-list" data-testid={testid}>
      {items.map((i) => (
        <li key={i}>
          <button aria-pressed={false}>{i}</button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="transfer">
      {list(left, "left")}
      <div className="transfer-controls">
        <button className="exercise-button" aria-label="move all right">
          ≫
        </button>
        <button className="exercise-button" aria-label="move right">
          ›
        </button>
        <button className="exercise-button" aria-label="move left">
          ‹
        </button>
        <button className="exercise-button" aria-label="move all left">
          ≪
        </button>
      </div>
      {list(right, "right")}
    </div>
  );
}
