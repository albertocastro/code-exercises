import { useEffect, useMemo, useRef, useState } from "react";
import type { ConsoleEntry, ConsoleLevel } from "./runner/consoleCapture";

const LEVELS: ConsoleLevel[] = ["log", "info", "warn", "error"];
const SOURCES: ConsoleEntry["source"][] = ["tests", "preview", "run"];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>
      )}
    </>
  );
}

export function ConsolePanel({
  entries,
  onClear,
}: {
  entries: ConsoleEntry[];
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [wrap, setWrap] = useState(true);
  const [follow, setFollow] = useState(true);
  const [levelFilter, setLevelFilter] = useState<Record<ConsoleLevel, boolean>>({
    log: true,
    info: true,
    warn: true,
    error: true,
  });
  const [sourceFilter, setSourceFilter] = useState<Record<ConsoleEntry["source"], boolean>>({
    tests: true,
    preview: true,
    run: true,
  });
  const [copyState, setCopyState] = useState<"idle" | "done" | "error">("idle");
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (!levelFilter[entry.level] || !sourceFilter[entry.source]) return false;
      if (!needle) return true;
      const haystack = `${entry.source} ${entry.test ?? ""} ${entry.level} ${entry.args.join(" ")}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [entries, levelFilter, query, sourceFilter]);

  useEffect(() => {
    if (!follow) return;
    const body = bodyRef.current;
    if (!body) return;
    body.scrollTop = body.scrollHeight;
  }, [filtered, follow]);

  useEffect(() => {
    if (copyState === "idle") return;
    const timeout = window.setTimeout(() => setCopyState("idle"), 1200);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  const toggleLevel = (level: ConsoleLevel) => {
    setLevelFilter((prev) => ({ ...prev, [level]: !prev[level] }));
  };

  const toggleSource = (source: ConsoleEntry["source"]) => {
    setSourceFilter((prev) => ({ ...prev, [source]: !prev[source] }));
  };

  const copyVisible = async () => {
    try {
      await navigator.clipboard.writeText(
        filtered
          .map((entry) => {
            const source = entry.test ? `${entry.source} · ${entry.test}` : entry.source;
            return `[${source}] [${entry.level}] ${entry.args.join(" ")}`;
          })
          .join("\n")
      );
      setCopyState("done");
    } catch {
      setCopyState("error");
    }
  };

  return (
    <div className="console-panel">
      <div className="console-bar">
        <span className="muted console-count">
          {filtered.length}/{entries.length} messages
        </span>
        <div className="console-actions">
          <button className="run-btn" title="Copy visible console output" onClick={() => void copyVisible()}>
            {copyState === "done" ? "Copied" : copyState === "error" ? "Copy failed" : "Copy"}
          </button>
          <button className="run-btn" title="Clear console" onClick={onClear}>
            Clear
          </button>
        </div>
      </div>

      <div className="console-toolbar">
        <label className="console-text-filter">
          <span>Filter</span>
          <input
            className="console-search"
            type="search"
            placeholder="Text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter console output by text"
          />
        </label>
        <div className="console-filter-group">
          {LEVELS.map((level) => (
            <button
              key={level}
              className={`console-chip ${levelFilter[level] ? "active" : ""}`}
              onClick={() => toggleLevel(level)}
            >
              {level}
            </button>
          ))}
        </div>
        <div className="console-filter-group">
          {SOURCES.map((source) => (
            <button
              key={source}
              className={`console-chip ${sourceFilter[source] ? "active" : ""}`}
              onClick={() => toggleSource(source)}
            >
              {source}
            </button>
          ))}
        </div>
        <label className="console-toggle">
          <input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} />
          <span>Wrap</span>
        </label>
        <label className="console-toggle">
          <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
          <span>Follow</span>
        </label>
      </div>

      <div className="console-body" ref={bodyRef}>
        {filtered.length === 0 ? (
          <div className="console-empty">
            {entries.length === 0 ? "No console output." : "No messages match the current filters."}
          </div>
        ) : (
          filtered.map((entry) => (
            <div key={entry.id} className={`console-row ${entry.level}`}>
              <span className="console-source">
                <Highlight text={entry.source} query={query.trim()} />
                {entry.test ? (
                  <span className="console-test">
                    {" · "}
                    <Highlight text={entry.test} query={query.trim()} />
                  </span>
                ) : null}
              </span>
              <span className="console-level">
                <Highlight text={entry.level} query={query.trim()} />
              </span>
              <pre className={wrap ? "wrap" : "nowrap"}>
                <Highlight text={entry.args.join(" ")} query={query.trim()} />
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
