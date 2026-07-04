import { useMemo, useState } from "react";

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

type Filter = CallStatus | "all";
type SortDir = "asc" | "desc";

const STATUS_LABEL: Record<CallStatus, string> = {
  completed: "Completed",
  failed: "Failed",
  in_progress: "In progress",
};

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
  { key: "in_progress", label: "In progress" },
];

/** Format whole seconds as `M:SS` — minutes unpadded, seconds zero-padded. */
function formatDuration(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function CallLog({ calls }: CallLogProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortDir | null>(null);

  const filtered = useMemo(
    () => (filter === "all" ? calls : calls.filter((c) => c.status === filter)),
    [calls, filter]
  );

  const visible = useMemo(() => {
    if (!sort) return filtered;
    return [...filtered].sort((a, b) =>
      sort === "asc" ? a.durationSec - b.durationSec : b.durationSec - a.durationSec
    );
  }, [filtered, sort]);

  const count = filtered.length;
  const totalSec = filtered.reduce((sum, c) => sum + c.durationSec, 0);
  const averageSec = count === 0 ? 0 : Math.round(totalSec / count);

  return (
    <div className="exercise-call-log">
      <div className="exercise-call-filters" role="group" aria-label="Filter calls by status">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            className="exercise-call-filter"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="exercise-call-stats" data-testid="call-stats">
        <span data-testid="stat-count">{count}</span>
        <span data-testid="stat-total">{formatDuration(totalSec)}</span>
        <span data-testid="stat-average">{formatDuration(averageSec)}</span>
      </div>

      <button
        className="exercise-call-sort"
        onClick={() => setSort((s) => (s === "desc" ? "asc" : "desc"))}
      >
        Sort by duration{sort === "desc" ? " ↓" : sort === "asc" ? " ↑" : ""}
      </button>

      {visible.length === 0 ? (
        <p className="exercise-call-empty">No calls yet</p>
      ) : (
        <ul className="exercise-call-rows">
          {visible.map((c) => (
            <li key={c.id} className="exercise-call-row" data-testid="call-row">
              <span className="exercise-call-agent">{c.agent}</span>
              <span className="exercise-call-status">{STATUS_LABEL[c.status]}</span>
              <span className="exercise-call-duration">{formatDuration(c.durationSec)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
