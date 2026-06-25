import { HistoryEditor } from "./solution";

export default function Demo() {
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Undo / Redo</h2>
        <p>Type, then undo and redo your edits.</p>
      </div>
      <HistoryEditor initial="hello" />
    </div>
  );
}
