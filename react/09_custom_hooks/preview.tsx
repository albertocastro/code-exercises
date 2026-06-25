import { useState } from "react";
import { useToggle, useDebounce, usePrevious, useLocalStorage } from "./solution";

export default function Demo() {
  const [on, toggle] = useToggle(false);
  const [text, setText] = useState("");
  const debounced = useDebounce(text, 400);
  const prev = usePrevious(text);
  const [note, setNote] = useLocalStorage("demo-note", "");

  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Custom Hooks</h2>
        <p>Build the four hooks; this demo wires them up live.</p>
      </div>
      <div className="exercise-card">
        <button className="exercise-button" onClick={toggle}>
          useToggle: {String(on)}
        </button>
        <label className="exercise-field">
          type (debounced 400ms)
          <input className="exercise-input" value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <p className="exercise-muted">
          debounced: {debounced || "—"} · previous: {prev ?? "—"}
        </p>
        <label className="exercise-field">
          persisted note (reload-safe)
          <input className="exercise-input" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
    </div>
  );
}
