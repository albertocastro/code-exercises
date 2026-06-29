import { useState } from "react";

export interface HistoryEditorProps {
  initial?: string;
}

/**
 * Build an editor with undo/redo. See README.md.
 *
 * The tests rely on an input named "text" and buttons named "undo"/"redo".
 */
export function HistoryEditor({ initial = "" }: HistoryEditorProps) {
  const [value, setValue] = useState(initial);

  // TODO Level 1: make the input controlled — display `value` and update it on
  //   every change (use `value`/`setValue`).
  // TODO Level 2: Undo reverts to the previous value; disabled when there's
  //   nothing to undo. (Hint: keep past/present/future, e.g. with useReducer.)
  // TODO Level 3: Redo re-applies an undone edit; a new edit clears the redo stack.

  return (
    <div className="exercise-card">
      {/* TODO Level 1: wire value + onChange so the input is controlled */}
      <input className="exercise-input" aria-label="text" />
      <div className="exercise-row">
        <button className="exercise-button" aria-label="undo" disabled>
          Undo
        </button>
        <button className="exercise-button" aria-label="redo" disabled>
          Redo
        </button>
      </div>
    </div>
  );
}
