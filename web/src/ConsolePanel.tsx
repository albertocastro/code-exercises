import type { ConsoleEntry } from "./runner/consoleCapture";

export function ConsolePanel({
  entries,
  onClear,
}: {
  entries: ConsoleEntry[];
  onClear: () => void;
}) {
  return (
    <div className="console-panel">
      <div className="console-bar">
        <button className="run-btn" title="Clear console" onClick={onClear}>
          Clear
        </button>
        <span className="muted">{entries.length} messages</span>
      </div>
      <div className="console-body">
        {entries.length === 0 ? (
          <div className="console-empty">No console output.</div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className={`console-row ${entry.level}`}>
              <span className="console-source">{entry.source}</span>
              <span className="console-level">{entry.level}</span>
              <pre>{entry.args.join(" ")}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
